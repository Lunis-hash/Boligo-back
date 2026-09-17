import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credit/credit.service';
import { EmailService } from '../common/email.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private creditService: CreditService,
    private emailService: EmailService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeSecretKey || 'sk_test_dummy', {
      apiVersion: '2024-06-20' as any,
    });
  }

  // ─── Détails du plan unique ────────────────────────────────────────────────
  private getPlanDetails(optionId: string) {
    switch (optionId) {
      case 'parcours_harmonie':
      default:
        return {
          amount: 1500,         // 15,00€ en centimes
          currency: 'eur',
          credits: 1,
          description: "Parcours Harmonie — 1 rencontre guid\u00e9e par l'IA",
          planName: 'Parcours Harmonie',
        };
    }
  }

  // ─── Présentation du plan (endpoint GET /payment/plans) ───────────────────
  async getPlans() {
    const plan = this.getPlanDetails('parcours_harmonie');
    return {
      plans: [
        {
          id: 'parcours_harmonie',
          name: 'Parcours Harmonie',
          price: plan.amount / 100,
          currency: 'EUR',
          priceDisplay: '15,00 €',
          credits: plan.credits,
          description: "Une rencontre guid\u00e9e par l'IA BOLIGO \u2014 de A \u00e0 Z",
          features: [
            { icon: '\uD83D\uDCAC', label: 'Phase Harmonie', detail: "3 jours de questions profondes guid\u00e9es par l'IA" },
            { icon: '💌', label: 'Chat libre', detail: 'Échange authentique en temps réel' },
            { icon: '🎥', label: 'Appel vidéo', detail: 'Première rencontre visuelle sécurisée (2 min)' },
            { icon: '📱', label: 'Échange de contacts', detail: 'Partagez vos coordonnées si vous le souhaitez' },
          ],
          guarantee: "Remboursement cr\u00e9dit si l'autre personne ne r\u00e9pond pas (R\u00e8gle de Justice)",
          badge: 'Recommandé',
          promoCodes: {
            hint: 'Avez-vous un code promotionnel ?',
            exampleCodes: [],  // Pas de codes publics — code saisi par l'utilisateur
          },
        },
      ],
    };
  }

  // ─── Validation d'un code promo (BDD + fallback hardcodé) ─────────────────
  private async resolvePromoCode(
    code: string,
    userId: string,
    planAmount: number,
  ): Promise<{
    isValid: boolean;
    finalAmount: number;
    isFree: boolean;
    promoCodeId?: string;
    message?: string;
    discountEur?: number;
  }> {
    const normalizedCode = code.trim().toUpperCase();

    // 1. Chercher en BDD
    const dbPromo = await this.prisma.promoCode.findUnique({
      where: { code: normalizedCode },
      include: { usages: { where: { userId } } },
    });

    if (dbPromo) {
      // Vérifications
      if (!dbPromo.isActive) {
        return { isValid: false, finalAmount: planAmount, isFree: false, message: 'Code promotionnel inactif.' };
      }
      if (dbPromo.expiresAt && new Date() > dbPromo.expiresAt) {
        return { isValid: false, finalAmount: planAmount, isFree: false, message: 'Code promotionnel expiré.' };
      }
      if (dbPromo.maxUses != null && dbPromo.usedCount >= dbPromo.maxUses) {
        return { isValid: false, finalAmount: planAmount, isFree: false, message: 'Code promotionnel épuisé.' };
      }
      if (dbPromo.usages.length > 0) {
        return { isValid: false, finalAmount: planAmount, isFree: false, message: 'Vous avez déjà utilisé ce code.' };
      }

      // Calcul remise
      let finalAmount = planAmount;
      if (dbPromo.discountType === 'free') {
        finalAmount = 0;
      } else if (dbPromo.discountType === 'percent') {
        finalAmount = Math.floor(planAmount * (1 - dbPromo.discountValue / 100));
      } else if (dbPromo.discountType === 'fixed') {
        finalAmount = Math.max(0, planAmount - dbPromo.discountValue);
      }

      const discountEur = (planAmount - finalAmount) / 100;
      const isFree = finalAmount <= 0;
      const messageDiscount =
        isFree
          ? 'Code appliqué ✅ — Offre gratuite activée !'
          : `Code appliqué ✅ — Réduction de ${discountEur.toFixed(2).replace('.', ',')}€`;

      return { isValid: true, finalAmount, isFree, promoCodeId: dbPromo.id, message: messageDiscount, discountEur };
    }

    // 2. Fallback codes hardcodés (pour rétro-compatibilité)
    const LEGACY_CODES: Record<string, { type: 'free' | 'percent' | 'fixed'; value: number }> = {
      BOLIGO100: { type: 'free', value: 0 },
      HARMONIE:  { type: 'free', value: 0 },
      WELCOME:   { type: 'free', value: 0 },
      BOLIGO50:  { type: 'percent', value: 50 },
      BIENVENUE5: { type: 'fixed', value: 500 },
    };

    const legacy = LEGACY_CODES[normalizedCode];
    if (!legacy) {
      return { isValid: false, finalAmount: planAmount, isFree: false, message: 'Code promotionnel invalide ou expiré.' };
    }

    let finalAmount = planAmount;
    if (legacy.type === 'free') finalAmount = 0;
    else if (legacy.type === 'percent') finalAmount = Math.floor(planAmount * (1 - legacy.value / 100));
    else if (legacy.type === 'fixed') finalAmount = Math.max(0, planAmount - legacy.value);

    const isFree = finalAmount <= 0;
    const discountEur = (planAmount - finalAmount) / 100;
    return {
      isValid: true,
      finalAmount,
      isFree,
      message: isFree ? 'Code appliqué ✅ — Offre gratuite activée !' : `Code appliqué ✅ — Réduction de ${discountEur.toFixed(2).replace('.', ',')}€`,
      discountEur,
    };
  }

  // ─── Créer la feuille de paiement Stripe ──────────────────────────────────
  async createPaymentSheet(userId: string, optionId: string, promoCode?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur non trouvé');

    const plan = this.getPlanDetails(optionId);
    let finalAmount = plan.amount;
    let promoResult: Awaited<ReturnType<typeof this.resolvePromoCode>> | null = null;

    if (promoCode && promoCode.trim()) {
      promoResult = await this.resolvePromoCode(promoCode, userId, plan.amount);
      if (!promoResult.isValid) {
        throw new BadRequestException(promoResult.message || 'Code promo invalide.');
      }
      finalAmount = promoResult.finalAmount;
    }

    if (finalAmount <= 0) {
      throw new BadRequestException('Le montant est gratuit — utilisez /payment/apply-promo pour activer l\'accès gratuit.');
    }

    try {
      // 1. Trouver ou créer le Customer Stripe
      let customerId: string;
      const customers = await this.stripe.customers.list({ email: user.email, limit: 1 });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: { userId },
        });
        customerId = customer.id;
      }

      // 2. Créer Ephemeral Key
      const ephemeralKey = await this.stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: '2024-06-20' }
      );

      // 3. Créer PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: finalAmount,
        currency: plan.currency,
        customer: customerId,
        description: plan.description,
        receipt_email: user.email,
        metadata: {
          userId,
          optionId,
          credits: plan.credits.toString(),
          planName: plan.planName,
          description: plan.description,
          promoCode: promoCode || '',
        },
      });

      return {
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        publishableKey: this.configService.get<string>('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
        finalAmount,
        originalAmount: plan.amount,
        discount: promoResult ? plan.amount - finalAmount : 0,
      };
    } catch (error: any) {
      this.logger.error('Erreur Stripe createPaymentSheet:', error);
      if (process.env.NODE_ENV !== 'production' || !this.configService.get('STRIPE_SECRET_KEY')) {
        this.logger.warn('⚠️ Fallback vers paiement simulé (Mock).');
        return {
          paymentIntent: `pi_mock_${Date.now()}_secret_test`,
          ephemeralKey: `ek_test_${Date.now()}`,
          customer: `cus_mock_${Date.now()}`,
          publishableKey: this.configService.get<string>('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY') || 'pk_test_dummy',
          finalAmount,
          originalAmount: plan.amount,
          discount: promoResult ? plan.amount - finalAmount : 0,
          isMock: true,
        };
      }
      throw new BadRequestException(`Erreur Stripe : ${error.message}`);
    }
  }

  // ─── Webhook Stripe ────────────────────────────────────────────────────────
  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET non configuré.');
    }

    let event: Stripe.Event;

    try {
      if (webhookSecret && signature) {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } else {
        event = JSON.parse(rawBody.toString());
      }
    } catch (err) {
      this.logger.error(`Validation webhook Stripe échouée: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Événement Stripe reçu : ${event.type}`);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await this.handlePaymentSuccess(paymentIntent);
    }

    return { received: true };
  }

  // ─── Traitement du paiement réussi ────────────────────────────────────────
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const metadata = paymentIntent.metadata;
    if (!metadata?.userId || !metadata?.credits) {
      this.logger.warn(`Métadonnées manquantes dans PaymentIntent ${paymentIntent.id}`);
      return;
    }

    const userId = metadata.userId;
    const credits = parseInt(metadata.credits, 10);
    const planName = metadata.planName || 'Parcours Harmonie';
    const euroAmount = paymentIntent.amount / 100;
    const paymentRef = paymentIntent.id;

    this.logger.log(`Paiement réussi — user ${userId}, ${credits} crédit(s), ${euroAmount}€, ref: ${paymentRef}`);

    // 1. Ajouter les crédits
    await this.creditService.addCredits(
      userId,
      credits,
      `${planName} (Stripe: ${paymentRef})`,
      euroAmount,
      paymentRef,
    );

    // 2. Récupérer l'utilisateur pour l'email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      this.logger.warn(`Utilisateur ${userId} introuvable pour email de confirmation.`);
      return;
    }

    // 3. Tenter de créer une facture Stripe et l'envoyer
    let invoiceUrl: string | undefined;
    try {
      // Trouver le customer Stripe
      const customers = await this.stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;

        // Créer un InvoiceItem puis une Invoice finalisée
        await this.stripe.invoiceItems.create({
          customer: customerId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          description: planName,
        });

        const invoice = await this.stripe.invoices.create({
          customer: customerId,
          auto_advance: false,
          collection_method: 'send_invoice',
          days_until_due: 0,
          metadata: { userId, paymentRef },
        });

        const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);
        invoiceUrl = finalizedInvoice.invoice_pdf ?? undefined;
        this.logger.log(`Facture Stripe créée : ${invoice.id}, PDF: ${invoiceUrl}`);
      }
    } catch (invoiceErr: any) {
      this.logger.warn(`Impossible de créer la facture Stripe : ${invoiceErr.message}`);
      // Non bloquant — l'email part quand même
    }

    // 4. Envoyer l'email de confirmation avec reçu HTML
    try {
      await this.emailService.sendPaymentConfirmationEmail(
        user.email,
        user.firstName,
        euroAmount,
        planName,
        paymentRef,
        invoiceUrl,
      );
      this.logger.log(`Email de confirmation envoyé à ${user.email}`);
    } catch (emailErr: any) {
      this.logger.error(`Erreur envoi email de confirmation : ${emailErr.message}`);
    }
  }

  // ─── Appliquer un code promo (endpoint dédié) ──────────────────────────────
  async applyPromoCode(userId: string, code: string, optionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (!user) throw new BadRequestException('Utilisateur non trouvé');

    const plan = this.getPlanDetails(optionId);
    const promoResult = await this.resolvePromoCode(code, userId, plan.amount);

    if (!promoResult.isValid) {
      throw new BadRequestException(promoResult.message || 'Code promotionnel invalide ou expiré.');
    }

    if (promoResult.isFree || promoResult.finalAmount <= 0) {
      // Accès gratuit : enregistrer l'usage + ajouter les crédits
      const normalizedCode = code.trim().toUpperCase();

      // Enregistrer l'usage si code en BDD
      if (promoResult.promoCodeId) {
        await this.prisma.$transaction([
          this.prisma.promoUsage.create({
            data: { promoCodeId: promoResult.promoCodeId, userId },
          }),
          this.prisma.promoCode.update({
            where: { id: promoResult.promoCodeId },
            data: { usedCount: { increment: 1 } },
          }),
        ]);
      }

      await this.creditService.addCredits(
        userId,
        plan.credits,
        `Code Promo : ${normalizedCode} (gratuit)`,
        0,
        `PROMO_${normalizedCode}_${Date.now()}`,
      );

      return {
        success: true,
        isFree: true,
        newAmount: 0,
        newAmountDisplay: '0,00 €',
        message: promoResult.message || 'Offre gratuite activée !',
        discountEur: promoResult.discountEur,
      };
    }

    // Remise partielle — retourner le nouveau montant sans débiter
    return {
      success: true,
      isFree: false,
      newAmount: promoResult.finalAmount,
      newAmountDisplay: `${(promoResult.finalAmount / 100).toFixed(2).replace('.', ',')} €`,
      message: promoResult.message,
      discountEur: promoResult.discountEur,
      promoCodeId: promoResult.promoCodeId,
    };
  }

  // ─── Valider promo avant PaymentIntent (endpoint check) ──────────────────
  async checkPromoCode(userId: string, code: string, optionId: string) {
    const plan = this.getPlanDetails(optionId);
    const result = await this.resolvePromoCode(code, userId, plan.amount);
    return {
      isValid: result.isValid,
      isFree: result.isFree,
      originalAmount: plan.amount,
      finalAmount: result.finalAmount,
      discountEur: result.discountEur ?? 0,
      message: result.message,
    };
  }
}
