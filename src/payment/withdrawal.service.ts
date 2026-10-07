import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email.service';
import { InvoiceService } from './invoice.service';
import {
  billingFlags,
  euros,
  withdrawalDeadline,
  withdrawalOpen,
} from './billing';

export interface Purchase {
  paymentRef: string;
  paidAt: string;
  amountCents: number;
  description: string;
  invoiceNumber?: string;
  refundedCents: number;
  withdrawal?: { status: string; requestedAt: string; refundCents?: number };
  withdrawalDeadline: string;
  canWithdraw: boolean;
}

const dateFr = (d: Date) =>
  d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
const timeFr = (d: Date) =>
  d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });

/**
 * Achats du membre et fonction de rétractation en ligne (« Se rétracter du
 * contrat ici », obligatoire depuis le 19 juin 2026) : la demande est
 * horodatée, un accusé de réception part tout de suite par e-mail, l'équipe
 * décide du remboursement (total si le crédit n'a pas servi, proportionnel
 * sinon) et le rembourse depuis le tableau de bord.
 */
@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly invoices: InvoiceService,
  ) {
    this.stripe = new Stripe(
      this.config.get<string>('STRIPE_SECRET_KEY') || 'sk_test_dummy',
      { apiVersion: '2024-06-20' as never },
    );
  }

  /** Achats payés par carte (les codes gratuits ne sont pas des ventes). */
  async purchases(userId: string, now = new Date()): Promise<Purchase[]> {
    const rows = await this.prisma.creditTransaction.findMany({
      where: {
        userId,
        type: 'achat',
        euroAmount: { gt: 0 },
        paymentRef: { startsWith: 'pi_' },
      },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        euroAmount: true,
        paymentRef: true,
        description: true,
      },
    });
    const refs = rows.map((r) => r.paymentRef!);
    const payments = billingFlags().enabled
      ? await this.prisma.payment.findMany({
          where: { stripePaymentIntentId: { in: refs } },
          include: {
            invoices: { where: { kind: 'facture' }, take: 1 },
            withdrawals: { orderBy: { requestedAt: 'desc' }, take: 1 },
          },
        })
      : [];
    const byRef = new Map(payments.map((p) => [p.stripePaymentIntentId, p]));
    return rows.map((r) => {
      const p = byRef.get(r.paymentRef!);
      const amountCents = Math.round((r.euroAmount ?? 0) * 100);
      const w = p?.withdrawals[0];
      const refundedCents = p?.refundedCents ?? 0;
      return {
        paymentRef: r.paymentRef!,
        paidAt: r.date.toISOString(),
        amountCents,
        description: (r.description ?? 'Parcours Harmonie').replace(
          / \(Stripe: [^)]*\)$/,
          '',
        ),
        invoiceNumber: p?.invoices[0]?.number ?? undefined,
        refundedCents,
        withdrawal: w
          ? {
              status: w.status,
              requestedAt: w.requestedAt.toISOString(),
              refundCents: w.refundCents ?? undefined,
            }
          : undefined,
        withdrawalDeadline: withdrawalDeadline(r.date).toISOString(),
        canWithdraw:
          withdrawalOpen(r.date, now) &&
          refundedCents < amountCents &&
          (!w || w.status === 'refusee'),
      };
    });
  }

  /** Lien du PDF de la facture, relu chez Stripe (il n'est jamais figé). */
  async invoicePdf(userId: string, paymentRef: string): Promise<string> {
    if (!/^pi_[A-Za-z0-9_]+$/.test(paymentRef))
      throw new BadRequestException('Référence de paiement invalide.');
    const pi = await this.stripe.paymentIntents.retrieve(paymentRef);
    if (pi.metadata?.userId !== userId)
      throw new NotFoundException('Facture introuvable.');
    const customer =
      typeof pi.customer === 'string' ? pi.customer : pi.customer?.id;
    if (!customer) throw new NotFoundException('Facture introuvable.');
    const list = await this.stripe.invoices.list({ customer, limit: 100 });
    const invoice = list.data.find(
      (i) => i.metadata?.paymentRef === paymentRef && i.status !== 'void',
    );
    if (!invoice?.invoice_pdf)
      throw new NotFoundException(
        'Facture pas encore disponible : réessayez dans quelques minutes.',
      );
    return invoice.invoice_pdf;
  }

  // ─── Demande du membre ────────────────────────────────────────────────────
  async request(userId: string, paymentRef: string, now = new Date()) {
    const tx = await this.prisma.creditTransaction.findFirst({
      where: { userId, type: 'achat', paymentRef, euroAmount: { gt: 0 } },
      select: { date: true, euroAmount: true, creditAmount: true },
    });
    if (!tx) throw new NotFoundException('Achat introuvable.');
    if (!withdrawalOpen(tx.date, now))
      throw new BadRequestException(
        `Le délai de rétractation de 14 jours est dépassé (paiement du ${dateFr(tx.date)}).`,
      );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (!user) throw new NotFoundException('Compte introuvable.');
    const amountCents = Math.round((tx.euroAmount ?? 0) * 100);

    let requestId: string | undefined;
    if (billingFlags().enabled) {
      const payment = await this.prisma.payment.upsert({
        where: { stripePaymentIntentId: paymentRef },
        update: {},
        create: {
          stripePaymentIntentId: paymentRef,
          userId,
          status: 'reussi',
          planId: 'parcours_harmonie',
          credits: tx.creditAmount,
          currency: 'eur',
          listAmountCents: amountCents,
          totalAmountCents: amountCents,
          succeededAt: tx.date,
        },
        include: {
          withdrawals: { where: { status: 'recue' }, take: 1 },
        },
      });
      const open = payment.withdrawals[0];
      if (open)
        return {
          status: open.status,
          requestedAt: open.requestedAt.toISOString(),
          alreadyRequested: true,
        };
      const created = await this.prisma.withdrawalRequest.create({
        data: {
          paymentId: payment.id,
          userId,
          requestedAt: now,
          channel: 'app',
        },
      });
      requestId = created.id;
    }

    await this.email
      .sendSimpleEmail(
        user.email,
        'BOLIGO : votre demande de rétractation est bien reçue',
        'Demande de rétractation reçue',
        [
          `Bonjour ${user.firstName},`,
          `Nous avons bien reçu, le ${dateFr(now)} à ${timeFr(now)}, votre demande de rétractation pour votre paiement du ${dateFr(tx.date)} (${euros(amountCents)}).`,
          'Si votre crédit n’a pas encore servi, vous serez remboursé(e) intégralement. Si votre parcours a déjà commencé, vous serez remboursé(e) du montant qui correspond à la partie non fournie. Le remboursement est fait sur votre carte, au plus tard 14 jours après votre demande.',
          'Cet e-mail vaut accusé de réception. Conservez-le.',
        ],
        'fr',
      )
      .then(async () => {
        if (requestId)
          await this.prisma.withdrawalRequest.update({
            where: { id: requestId },
            data: { ackSentAt: new Date() },
          });
      })
      .catch((err: Error) =>
        this.logger.error(`Accusé de réception non envoyé : ${err.message}`),
      );
    await this.invoices.alertTeam('BOLIGO : demande de rétractation', [
      `Un membre demande à se rétracter d’un paiement de ${euros(amountCents)} du ${dateFr(tx.date)}.`,
      'Remboursement à faire sous 14 jours : tableau de bord, page Facturation.',
    ]);
    this.logger.log(`Demande de rétractation reçue pour ${paymentRef}.`);
    return { status: 'recue', requestedAt: now.toISOString() };
  }

  // ─── Équipe ───────────────────────────────────────────────────────────────
  async listForAdmin() {
    this.assertEnabled();
    const rows = await this.prisma.withdrawalRequest.findMany({
      orderBy: { requestedAt: 'desc' },
      take: 200,
      include: {
        payment: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    return Promise.all(
      rows.map(async (w) => {
        const paidAt = w.payment.succeededAt ?? w.payment.createdAt;
        const used = w.userId
          ? (await this.prisma.creditTransaction.count({
              where: {
                userId: w.userId,
                type: 'consommation',
                date: { gte: paidAt },
              },
            })) > 0
          : true;
        const remaining = w.payment.totalAmountCents - w.payment.refundedCents;
        return {
          id: w.id,
          status: w.status,
          requestedAt: w.requestedAt,
          decidedAt: w.decidedAt,
          refundCents: w.refundCents,
          note: w.note,
          member: w.user
            ? {
                id: w.user.id,
                name: `${w.user.firstName} ${w.user.lastName}`,
                email: w.user.email,
              }
            : null,
          payment: {
            ref: w.payment.stripePaymentIntentId,
            paidAt,
            amountCents: w.payment.totalAmountCents,
            refundedCents: w.payment.refundedCents,
          },
          creditUsed: used,
          // Crédit inutilisé : tout est rendu ; sinon, l'équipe calcule la part
          // non fournie du parcours.
          suggestedRefundCents: used ? null : remaining,
        };
      }),
    );
  }

  async decide(
    id: string,
    adminId: string,
    body: { action: 'refund' | 'refuse'; amountCents?: number; note?: string },
  ) {
    this.assertEnabled();
    const w = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        payment: true,
        user: { select: { email: true, firstName: true } },
      },
    });
    if (!w) throw new NotFoundException('Demande introuvable.');
    if (w.status !== 'recue')
      throw new BadRequestException('Cette demande a déjà été traitée.');
    const note = body.note?.trim().slice(0, 500) || undefined;

    if (body.action === 'refuse') {
      if (!note) throw new BadRequestException('Indiquez le motif du refus.');
      await this.prisma.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'refusee',
          decidedAt: new Date(),
          decidedBy: adminId,
          note,
        },
      });
      if (w.user)
        await this.email
          .sendSimpleEmail(
            w.user.email,
            'BOLIGO : votre demande de rétractation',
            'Votre demande de rétractation',
            [
              `Bonjour ${w.user.firstName},`,
              `Nous ne pouvons pas donner suite à votre demande : ${note}`,
              'Vous pouvez nous répondre depuis votre profil, ou saisir le médiateur de la consommation indiqué dans les conditions générales.',
            ],
            'fr',
          )
          .catch(() => undefined);
      return { status: 'refusee' };
    }

    const remaining = w.payment.totalAmountCents - w.payment.refundedCents;
    const amount = body.amountCents ?? remaining;
    if (!Number.isInteger(amount) || amount <= 0 || amount > remaining)
      throw new BadRequestException(
        `Montant à rembourser invalide (entre 0,01 € et ${euros(remaining)}).`,
      );
    const refund = await this.stripe.refunds.create(
      {
        payment_intent: w.payment.stripePaymentIntentId,
        amount,
        reason: 'requested_by_customer',
        metadata: { withdrawalId: id },
      },
      { idempotencyKey: `boligo-withdrawal-${id}` },
    );
    await this.prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: 'remboursee',
        decidedAt: new Date(),
        decidedBy: adminId,
        refundCents: amount,
        stripeRefundId: refund.id,
        note,
      },
    });
    // Avoir et crédit tout de suite, sans attendre le webhook (qui ne
    // refera rien : le montant remboursé est déjà enregistré).
    const charge =
      typeof refund.charge === 'string'
        ? await this.stripe.charges.retrieve(refund.charge)
        : refund.charge;
    if (charge) await this.invoices.handleRefund(charge);
    if (w.user)
      await this.email
        .sendSimpleEmail(
          w.user.email,
          'BOLIGO : votre remboursement',
          'Remboursement effectué',
          [
            `Bonjour ${w.user.firstName},`,
            `Suite à votre demande de rétractation, nous vous avons remboursé ${euros(amount)} sur la carte utilisée pour le paiement. Selon votre banque, le montant apparaît sous 5 à 10 jours.`,
            'Un avoir est joint à votre facture dans votre espace « Mes achats ».',
          ],
          'fr',
        )
        .catch(() => undefined);
    return { status: 'remboursee', refundCents: amount };
  }

  private assertEnabled() {
    if (!billingFlags().enabled)
      throw new BadRequestException(
        'Registre de facturation désactivé (BILLING_ENABLED).',
      );
  }
}
