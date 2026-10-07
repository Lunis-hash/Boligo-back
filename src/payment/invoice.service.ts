import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email.service';
import {
  billingConfigIssues,
  billingFlags,
  countryCodeFromCity,
  euros,
  invoiceFooterLines,
  normalizeCountry,
  sellerIdentity,
  splitInclusive,
  vatRuleFor,
  VatRule,
} from './billing';

/** Code de taxe Stripe : service fourni par voie électronique. */
const DEFAULT_TAX_CODE = 'txcd_10000000';
const RETRY_EVERY_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export interface Buyer {
  name: string;
  address?: string;
  country: string | null;
  /** Adresse complète relevée sur la carte (Stripe Tax en a besoin). */
  stripeAddress?: Stripe.AddressParam;
}

export interface IssuedInvoice {
  number?: string;
  url?: string;
  exclTaxCents: number;
  taxCents: number;
  ratePercent: number;
  mention?: string;
}

/**
 * Factures et avoirs chez Stripe, après coup : le paiement a déjà eu lieu par
 * la feuille de paiement, la facture est donc marquée payée hors Stripe.
 * Prix TTC fixe (taxe incluse) : seule la part de TVA change selon le pays.
 * Avec BILLING_ENABLED, chaque pièce est aussi enregistrée en base (registre
 * de 10 ans) et relancée en cas d'échec.
 */
@Injectable()
export class InvoiceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly stripe: Stripe;
  private readonly taxRateIds = new Map<string, string>();
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {
    this.stripe = new Stripe(
      this.config.get<string>('STRIPE_SECRET_KEY') || 'sk_test_dummy',
      { apiVersion: '2024-06-20' as never },
    );
  }

  onModuleInit() {
    if (!billingFlags().enabled || process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      this.retryPending().catch((err: Error) =>
        this.logger.error(`Relance des factures en échec : ${err.message}`),
      );
    }, RETRY_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // ─── Paiement en attente (feuille de paiement créée) ─────────────────────
  async recordPending(input: {
    paymentIntentId: string;
    userId: string;
    planId: string;
    credits: number;
    currency: string;
    listAmountCents: number;
    totalAmountCents: number;
    promoCodeId?: string;
    termsVersion?: string | null;
    consentAt?: Date;
    consentText?: string;
  }) {
    if (!billingFlags().enabled) return;
    await this.prisma.payment
      .upsert({
        where: { stripePaymentIntentId: input.paymentIntentId },
        update: {},
        create: {
          stripePaymentIntentId: input.paymentIntentId,
          userId: input.userId,
          planId: input.planId,
          credits: input.credits,
          currency: input.currency,
          listAmountCents: input.listAmountCents,
          discountCents: input.listAmountCents - input.totalAmountCents,
          totalAmountCents: input.totalAmountCents,
          promoCodeId: input.promoCodeId,
          termsVersion: input.termsVersion ?? undefined,
          earlyStartConsentAt: input.consentAt,
          earlyStartConsentText: input.consentText,
        },
      })
      .catch((err: Error) =>
        this.logger.error(`Paiement non enregistré : ${err.message}`),
      );
  }

  // ─── Paiement réussi : acheteur, preuves de localisation, facture ─────────
  async afterSuccess(
    paymentIntent: Stripe.PaymentIntent,
    user: {
      id: string;
      firstName: string;
      lastName: string;
      city: string | null;
    },
  ): Promise<IssuedInvoice | null> {
    const flags = billingFlags();
    const charge = await this.chargeOf(paymentIntent);
    const details = charge?.billing_details;
    const address = details?.address;
    const declared = normalizeCountry(address?.country);
    const country = declared ?? countryCodeFromCity(user.city);
    const cardCountry = normalizeCountry(
      charge?.payment_method_details?.card?.country,
    );
    if (declared && cardCountry && declared !== cardCountry)
      this.logger.warn(
        `Paiement ${paymentIntent.id} : pays déclaré ${declared}, carte ${cardCountry} (preuves de localisation discordantes).`,
      );
    const buyer: Buyer = {
      name:
        details?.name?.trim() || `${user.firstName} ${user.lastName}`.trim(),
      address: address
        ? [
            address.line1,
            address.line2,
            [address.postal_code, address.city].filter(Boolean).join(' '),
            address.state,
            address.country,
          ]
            .filter(Boolean)
            .join(', ')
        : undefined,
      country,
      stripeAddress:
        address?.country && address.line1
          ? {
              line1: address.line1,
              line2: address.line2 ?? undefined,
              postal_code: address.postal_code ?? undefined,
              city: address.city ?? undefined,
              state: address.state ?? undefined,
              country: address.country,
            }
          : undefined,
    };
    const customerId =
      typeof paymentIntent.customer === 'string'
        ? paymentIntent.customer
        : paymentIntent.customer?.id;

    let paymentId: string | undefined;
    if (flags.enabled) {
      paymentId = await this.markSucceeded(
        paymentIntent,
        user.id,
        country,
        cardCountry,
      );
      await this.saveBillingProfile(user.id, customerId, buyer, address);
    }
    if (!customerId) return null;
    return this.issueInvoice(paymentIntent, customerId, buyer, paymentId);
  }

  private async chargeOf(
    pi: Stripe.PaymentIntent,
  ): Promise<Stripe.Charge | null> {
    const latest = pi.latest_charge;
    if (!latest) return null;
    if (typeof latest !== 'string') return latest;
    try {
      return await this.stripe.charges.retrieve(latest);
    } catch (err) {
      this.logger.warn(
        `Paiement ${pi.id} : détail de la carte illisible (${(err as Error).message}).`,
      );
      return null;
    }
  }

  private async markSucceeded(
    pi: Stripe.PaymentIntent,
    userId: string,
    country: string | null,
    cardCountry: string | null,
  ): Promise<string | undefined> {
    const meta = pi.metadata ?? {};
    const listAmount = parseInt(meta.listAmountCents ?? '', 10) || pi.amount;
    try {
      const payment = await this.prisma.payment.upsert({
        where: { stripePaymentIntentId: pi.id },
        update: {
          status: 'reussi',
          succeededAt: new Date(),
          customerCountry: country,
          cardCountry,
        },
        create: {
          stripePaymentIntentId: pi.id,
          userId,
          status: 'reussi',
          planId: meta.optionId || 'parcours_harmonie',
          credits: parseInt(meta.credits ?? '1', 10) || 1,
          currency: pi.currency,
          listAmountCents: listAmount,
          discountCents: Math.max(0, listAmount - pi.amount),
          totalAmountCents: pi.amount,
          promoCodeId: meta.promoCodeId || undefined,
          termsVersion: meta.termsVersion || undefined,
          earlyStartConsentAt: meta.earlyStartConsentAt
            ? new Date(meta.earlyStartConsentAt)
            : undefined,
          succeededAt: new Date(),
          customerCountry: country,
          cardCountry,
        },
        select: { id: true },
      });
      return payment.id;
    } catch (err) {
      this.logger.error(
        `Paiement ${pi.id} non enregistré : ${(err as Error).message}`,
      );
      return undefined;
    }
  }

  private async saveBillingProfile(
    userId: string,
    customerId: string | undefined,
    buyer: Buyer,
    address: Stripe.Address | null | undefined,
  ) {
    const data = {
      stripeCustomerId: customerId,
      name: buyer.name,
      line1: address?.line1 ?? undefined,
      line2: address?.line2 ?? undefined,
      postalCode: address?.postal_code ?? undefined,
      city: address?.city ?? undefined,
      state: address?.state ?? undefined,
      country: buyer.country ?? undefined,
    };
    await this.prisma.billingProfile
      .upsert({ where: { userId }, update: data, create: { userId, ...data } })
      .catch((err: Error) =>
        this.logger.warn(
          `Adresse de facturation non enregistrée : ${err.message}`,
        ),
      );
  }

  // ─── Facture ──────────────────────────────────────────────────────────────
  /** TVA de la facture : Stripe Tax si activé et l'adresse connue, sinon la règle locale. */
  ruleFor(buyer: Buyer): { rule: VatRule; stripeTax: boolean } {
    const flags = billingFlags();
    const stripeTax = flags.stripeTax && !!buyer.stripeAddress;
    return {
      stripeTax,
      rule: stripeTax
        ? { ratePercent: 0, regime: 'STRIPE_TAX' }
        : vatRuleFor(buyer.country, { franchise: flags.franchise }),
    };
  }

  async issueInvoice(
    pi: Stripe.PaymentIntent,
    customerId: string,
    buyer: Buyer,
    paymentId?: string,
  ): Promise<IssuedInvoice | null> {
    const { rule, stripeTax } = this.ruleFor(buyer);
    const local = splitInclusive(pi.amount, rule.ratePercent);
    const key = `facture:${pi.id}`;
    let rowId: string | undefined;
    let existingId: string | undefined;
    if (paymentId) {
      const row = await this.prisma.invoice
        .upsert({
          where: { idempotencyKey: key },
          update: { attempts: { increment: 1 } },
          create: {
            idempotencyKey: key,
            kind: 'facture',
            paymentId,
            userId: pi.metadata?.userId || undefined,
            currency: pi.currency,
            totalExclTaxCents: local.exclTaxCents,
            taxCents: local.taxCents,
            totalInclTaxCents: pi.amount,
            taxRatePercent: new Prisma.Decimal(rule.ratePercent),
            taxCountry: buyer.country,
            taxRegime: rule.regime,
            buyerName: buyer.name,
            buyerAddress: buyer.address,
            buyerCountry: buyer.country,
            attempts: 1,
          },
          select: { id: true, status: true, stripeObjectId: true },
        })
        .catch((err: Error) => {
          this.logger.error(
            `Registre des factures indisponible : ${err.message}`,
          );
          return null;
        });
      if (row?.status === 'emise') return null;
      rowId = row?.id;
      existingId = row?.stripeObjectId ?? undefined;
    }

    try {
      if (buyer.stripeAddress || buyer.name)
        await this.stripe.customers.update(customerId, {
          name: buyer.name,
          ...(buyer.stripeAddress ? { address: buyer.stripeAddress } : {}),
          preferred_locales: ['fr'],
        });
      // Reprise : une facture déjà créée chez Stripe pour ce paiement est
      // complétée, jamais recréée (les clés d'idempotence expirent en 24 h).
      let invoiceId = existingId;
      if (!invoiceId) {
        const footer = invoiceFooterLines(sellerIdentity(), rule).join('\n');
        const created = await this.stripe.invoices.create(
          {
            customer: customerId,
            currency: pi.currency,
            auto_advance: false,
            collection_method: 'send_invoice',
            days_until_due: 0,
            automatic_tax: { enabled: stripeTax },
            footer,
            custom_fields: [{ name: 'Paiement', value: pi.id }],
            metadata: { userId: pi.metadata?.userId ?? '', paymentRef: pi.id },
          },
          { idempotencyKey: `boligo-invoice-${pi.id}` },
        );
        invoiceId = created.id!;
        if (rowId)
          await this.prisma.invoice.update({
            where: { id: rowId },
            data: { stripeObjectId: invoiceId },
          });
      }
      let current = await this.stripe.invoices.retrieve(invoiceId);
      if (current.status === 'draft' && !current.lines?.data?.length) {
        const taxRate =
          !stripeTax && rule.ratePercent > 0
            ? await this.taxRateId(rule, buyer.country)
            : undefined;
        await this.stripe.invoiceItems.create(
          {
            customer: customerId,
            invoice: invoiceId,
            amount: pi.amount,
            currency: pi.currency,
            description:
              pi.metadata?.planName || pi.description || 'Parcours Harmonie',
            ...(stripeTax
              ? {
                  tax_behavior: 'inclusive' as const,
                  tax_code:
                    this.config.get<string>('BILLING_TAX_CODE') ||
                    DEFAULT_TAX_CODE,
                }
              : taxRate
                ? { tax_rates: [taxRate] }
                : {}),
          },
          { idempotencyKey: `boligo-invoice-item-${pi.id}` },
        );
      }
      if (current.status === 'draft')
        current = await this.stripe.invoices.finalizeInvoice(invoiceId);
      if (current.status === 'open')
        current = await this.stripe.invoices.pay(invoiceId, {
          paid_out_of_band: true,
        });
      const exclTax =
        typeof current.total_excluding_tax === 'number'
          ? current.total_excluding_tax
          : local.exclTaxCents;
      const issued: IssuedInvoice = {
        number: current.number ?? undefined,
        url: current.invoice_pdf ?? undefined,
        exclTaxCents: exclTax,
        taxCents: current.total - exclTax,
        ratePercent: stripeTax
          ? Math.round(((current.total - exclTax) / exclTax) * 10000) / 100
          : rule.ratePercent,
        mention: rule.mention,
      };
      if (rowId)
        await this.prisma.invoice.update({
          where: { id: rowId },
          data: {
            status: 'emise',
            number: issued.number,
            stripeObjectId: invoiceId,
            issuedAt: new Date(),
            totalExclTaxCents: issued.exclTaxCents,
            taxCents: issued.taxCents,
            taxRatePercent: new Prisma.Decimal(issued.ratePercent),
            lastError: null,
          },
        });
      if (paymentId)
        await this.prisma.payment
          .update({
            where: { id: paymentId },
            data: {
              taxAmountCents: issued.taxCents,
              taxCountry: buyer.country,
            },
          })
          .catch(() => undefined);
      this.logger.log(
        `Facture ${issued.number ?? invoiceId} émise pour le paiement ${pi.id}.`,
      );
      return issued;
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn(`Facture du paiement ${pi.id} non émise : ${message}`);
      if (rowId)
        await this.prisma.invoice
          .update({
            where: { id: rowId },
            data: { status: 'erreur', lastError: message.slice(0, 500) },
          })
          .catch(() => undefined);
      return null;
    }
  }

  /** Taux de TVA Stripe (taxe incluse) pour la règle locale, créé une fois. */
  private async taxRateId(rule: VatRule, country: string | null) {
    const jurisdiction = rule.regime === 'DOM' ? 'France (DOM)' : 'France';
    const key = `boligo-${rule.ratePercent}-${rule.regime === 'DOM' ? 'dom' : 'fr'}`;
    const cached = this.taxRateIds.get(key);
    if (cached) return cached;
    const existing = await this.stripe.taxRates.list({
      active: true,
      limit: 100,
    });
    const found = existing.data.find((r) => r.metadata?.boligo_key === key);
    const id =
      found?.id ??
      (
        await this.stripe.taxRates.create(
          {
            display_name: 'TVA',
            percentage: rule.ratePercent,
            inclusive: true,
            country:
              country === 'GP' || country === 'MQ' || country === 'RE'
                ? country
                : 'FR',
            jurisdiction,
            description: `TVA ${rule.ratePercent} % (${jurisdiction})`,
            metadata: { boligo_key: key },
          },
          { idempotencyKey: `boligo-tax-rate-${key}` },
        )
      ).id;
    this.taxRateIds.set(key, id);
    return id;
  }

  // ─── Remboursement : avoir, crédit retiré s'il n'a pas servi ─────────────
  /**
   * Un remboursement (total ou partiel, depuis Stripe ou le tableau de bord)
   * donne un avoir rattaché à la facture, et la trace de l'argent rendu dans
   * le journal des crédits. Le crédit n'est retiré que s'il n'a pas servi et
   * que le remboursement est total. Rejouer le même état ne fait rien.
   */
  async handleRefund(charge: Stripe.Charge): Promise<void> {
    if (!billingFlags().enabled) return;
    const piId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!piId) return;
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: piId },
      include: {
        invoices: { where: { kind: 'facture' }, take: 1 },
      },
    });
    if (!payment) {
      this.logger.warn(
        `Remboursement de ${piId} : paiement inconnu du registre.`,
      );
      return;
    }
    const delta = charge.amount_refunded - payment.refundedCents;
    if (delta <= 0) return;
    const full = charge.amount_refunded >= payment.totalAmountCents;
    const userId = payment.userId;

    let removed = 0;
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${'refund:' + piId}))) AS lock`;
      const fresh = await tx.payment.findUnique({
        where: { id: payment.id },
        select: { refundedCents: true },
      });
      if (!fresh || fresh.refundedCents >= charge.amount_refunded) return;
      const owed = charge.amount_refunded - fresh.refundedCents;
      if (full && userId) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { creditBalance: true },
        });
        removed = Math.min(user?.creditBalance ?? 0, payment.credits);
        if (removed > 0)
          await tx.user.update({
            where: { id: userId },
            data: { creditBalance: { decrement: removed } },
          });
      }
      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'remboursement_paiement',
          creditAmount: -removed,
          euroAmount: -owed / 100,
          promoCodeId: payment.promoCodeId,
          paymentRef: `${piId}:remboursement:${charge.amount_refunded}`,
          description: `Remboursement ${full ? 'total' : 'partiel'} (${euros(owed)})${removed ? ', crédit retiré' : ''}`,
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedCents: charge.amount_refunded,
          status: full ? 'rembourse' : 'rembourse_partiel',
        },
      });
    });
    if (full && userId && removed < payment.credits)
      this.logger.warn(
        `Paiement ${piId} remboursé alors que le crédit a déjà servi : rien à retirer.`,
      );
    const original = payment.invoices[0];
    if (original)
      await this.issueCreditNote(
        original.id,
        `avoir:${charge.id}:${charge.amount_refunded}`,
        delta,
      );
  }

  async issueCreditNote(
    originalInvoiceId: string,
    key: string,
    amountCents: number,
  ): Promise<void> {
    const original = await this.prisma.invoice.findUnique({
      where: { id: originalInvoiceId },
    });
    if (!original) return;
    const rate = Number(original.taxRatePercent ?? 0);
    const split = splitInclusive(amountCents, rate);
    const row = await this.prisma.invoice.upsert({
      where: { idempotencyKey: key },
      update: { attempts: { increment: 1 } },
      create: {
        idempotencyKey: key,
        kind: 'avoir',
        paymentId: original.paymentId,
        originalInvoiceId: original.id,
        userId: original.userId,
        currency: original.currency,
        totalExclTaxCents: split.exclTaxCents,
        taxCents: split.taxCents,
        totalInclTaxCents: amountCents,
        taxRatePercent: original.taxRatePercent,
        taxCountry: original.taxCountry,
        taxRegime: original.taxRegime,
        buyerName: original.buyerName,
        buyerAddress: original.buyerAddress,
        buyerCountry: original.buyerCountry,
        attempts: 1,
      },
    });
    if (row.status === 'emise') return;
    if (!original.stripeObjectId) {
      await this.prisma.invoice.update({
        where: { id: row.id },
        data: {
          status: 'erreur',
          lastError: 'Facture d’origine pas encore émise chez Stripe.',
        },
      });
      return;
    }
    try {
      // Reprise : un avoir déjà créé pour cette clé n'est pas recréé.
      if (row.attempts > 1) {
        const existing = await this.stripe.creditNotes.list({
          invoice: original.stripeObjectId,
          limit: 100,
        });
        const done = existing.data.find((n) => n.metadata?.boligo_key === key);
        if (done) {
          await this.prisma.invoice.update({
            where: { id: row.id },
            data: {
              status: 'emise',
              number: done.number,
              stripeObjectId: done.id,
              issuedAt: new Date(),
              lastError: null,
            },
          });
          return;
        }
      }
      const invoice = await this.stripe.invoices.retrieve(
        original.stripeObjectId,
      );
      const line = invoice.lines?.data?.[0];
      const note = await this.stripe.creditNotes.create(
        {
          invoice: original.stripeObjectId,
          ...(line
            ? {
                lines: [
                  {
                    type: 'invoice_line_item',
                    invoice_line_item: line.id,
                    amount: amountCents,
                  },
                ],
              }
            : { amount: amountCents }),
          out_of_band_amount: amountCents,
          memo: 'Remboursement',
          metadata: { boligo_key: key },
        },
        { idempotencyKey: `boligo-${key}` },
      );
      await this.prisma.invoice.update({
        where: { id: row.id },
        data: {
          status: 'emise',
          number: note.number,
          stripeObjectId: note.id,
          issuedAt: new Date(),
          lastError: null,
        },
      });
      this.logger.log(
        `Avoir ${note.number} émis (facture ${original.number}).`,
      );
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn(`Avoir non émis : ${message}`);
      await this.prisma.invoice.update({
        where: { id: row.id },
        data: { status: 'erreur', lastError: message.slice(0, 500) },
      });
    }
  }

  // ─── Litiges ──────────────────────────────────────────────────────────────
  async handleDispute(dispute: Stripe.Dispute, opened: boolean) {
    const piId =
      typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : dispute.payment_intent?.id;
    const ref =
      piId ??
      (typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id);
    this.logger.error(
      `Litige Stripe ${opened ? 'ouvert' : `clos (${dispute.status})`} sur ${ref} : ${euros(dispute.amount)}, motif ${dispute.reason}.`,
    );
    if (billingFlags().enabled && piId && opened)
      await this.prisma.payment
        .update({
          where: { stripePaymentIntentId: piId },
          data: { status: 'conteste' },
        })
        .catch(() => undefined);
    await this.alertTeam(
      `BOLIGO : litige de paiement ${opened ? 'ouvert' : 'clos'}`,
      [
        `Un litige Stripe ${opened ? 'vient d’être ouvert' : `est clos (${dispute.status})`} sur un paiement de ${euros(dispute.amount)}.`,
        `Motif indiqué par la banque : ${dispute.reason}. Référence : ${ref}.`,
        'Répondez depuis le tableau de bord Stripe avant la date limite, avec la facture et la demande de commencement du parcours.',
      ],
    );
  }

  /** E-mail à l'équipe (BILLING_ALERT_EMAILS), sans donnée de carte. */
  async alertTeam(subject: string, paragraphs: string[]) {
    const to = (this.config.get<string>('BILLING_ALERT_EMAILS') ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    if (to.length === 0) {
      this.logger.warn(`${subject} : aucune adresse BILLING_ALERT_EMAILS.`);
      return;
    }
    for (const address of to)
      await this.email
        .sendSimpleEmail(address, subject, subject, paragraphs, 'fr')
        .catch((err: Error) =>
          this.logger.error(`Alerte facturation non envoyée : ${err.message}`),
        );
  }

  // ─── Comptabilité ─────────────────────────────────────────────────────────
  /**
   * Journal des ventes (factures et avoirs émis) pour l'expert-comptable :
   * une ligne par pièce, montants en euros, avoirs en négatif.
   */
  async salesJournalCsv(from?: Date, to?: Date): Promise<string> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        status: 'emise',
        issuedAt: { gte: from, lt: to },
      },
      orderBy: { issuedAt: 'asc' },
      include: {
        payment: {
          select: {
            stripePaymentIntentId: true,
            promoCode: { select: { code: true } },
            cardCountry: true,
          },
        },
        originalInvoice: { select: { number: true } },
      },
    });
    const cell = (v: string | number | null | undefined) => {
      const text = v === null || v === undefined ? '' : String(v);
      // Une cellule qui commence par = + - @ serait lue comme une formule
      // (les montants, même négatifs, restent des nombres).
      const safe =
        /^[=+\-@]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)
          ? `'${text}`
          : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const amount = (cents: number, sign: number) =>
      ((sign * cents) / 100).toFixed(2);
    const header = [
      'Date',
      'Numero',
      'Type',
      'Facture_origine',
      'Pays_client',
      'Pays_carte',
      'Regime_TVA',
      'Taux_TVA',
      'Devise',
      'HT',
      'TVA',
      'TTC',
      'Reference_paiement',
      'Code_promo',
    ];
    const lines = rows.map((r) => {
      const sign = r.kind === 'avoir' ? -1 : 1;
      return [
        r.issuedAt?.toISOString().slice(0, 10),
        r.number,
        r.kind,
        r.originalInvoice?.number,
        r.buyerCountry,
        r.payment.cardCountry,
        r.taxRegime,
        r.taxRatePercent?.toString(),
        r.currency.toUpperCase(),
        amount(r.totalExclTaxCents, sign),
        amount(r.taxCents, sign),
        amount(r.totalInclTaxCents, sign),
        r.payment.stripePaymentIntentId,
        r.payment.promoCode?.code,
      ]
        .map(cell)
        .join(';');
    });
    return [header.join(';'), ...lines].join('\n');
  }

  /** État de la facturation pour le tableau de bord (jamais de secret). */
  async status() {
    const flags = billingFlags();
    const counts = flags.enabled
      ? await this.prisma.invoice
          .groupBy({ by: ['status'], _count: { _all: true } })
          .then((rows) =>
            Object.fromEntries(rows.map((r) => [r.status, r._count._all])),
          )
          .catch(() => null)
      : null;
    return {
      flags,
      mode: (this.config.get<string>('STRIPE_SECRET_KEY') ?? '').startsWith(
        'sk_live_',
      )
        ? 'réel'
        : 'test',
      issues: billingConfigIssues(),
      invoices: counts,
    };
  }

  // ─── Relance ─────────────────────────────────────────────────────────────
  /** Factures et avoirs en échec (ou restés en attente) : nouvel essai. */
  async retryPending(now = new Date()): Promise<number> {
    const stale = new Date(now.getTime() - 10 * 60 * 1000);
    const rows = await this.prisma.invoice.findMany({
      where: {
        attempts: { lt: MAX_ATTEMPTS },
        OR: [
          { status: 'erreur' },
          { status: 'a_emettre', updatedAt: { lt: stale } },
        ],
      },
      include: { payment: true },
      take: 20,
    });
    for (const row of rows) {
      if (row.kind === 'avoir' && row.originalInvoiceId) {
        await this.issueCreditNote(
          row.originalInvoiceId,
          row.idempotencyKey,
          row.totalInclTaxCents,
        );
        continue;
      }
      try {
        const pi = await this.stripe.paymentIntents.retrieve(
          row.payment.stripePaymentIntentId,
        );
        const customerId =
          typeof pi.customer === 'string' ? pi.customer : pi.customer?.id;
        if (!customerId) continue;
        const profile = row.userId
          ? await this.prisma.billingProfile.findUnique({
              where: { userId: row.userId },
            })
          : null;
        await this.issueInvoice(
          pi,
          customerId,
          {
            name: row.buyerName,
            address: row.buyerAddress ?? undefined,
            country: row.buyerCountry,
            stripeAddress:
              profile?.country && profile.line1
                ? {
                    line1: profile.line1,
                    line2: profile.line2 ?? undefined,
                    postal_code: profile.postalCode ?? undefined,
                    city: profile.city ?? undefined,
                    state: profile.state ?? undefined,
                    country: profile.country,
                  }
                : undefined,
          },
          row.paymentId,
        );
      } catch (err) {
        this.logger.warn(
          `Relance de la facture ${row.id} : ${(err as Error).message}`,
        );
      }
    }
    if (rows.some((r) => r.attempts + 1 >= MAX_ATTEMPTS))
      await this.alertTeam('BOLIGO : facture impossible à émettre', [
        'Une facture ou un avoir a échoué plusieurs fois chez Stripe.',
        'Voir le tableau de bord, page Facturation, et les journaux du serveur.',
      ]);
    return rows.length;
  }
}
