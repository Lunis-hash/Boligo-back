import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credit/credit.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private creditService: CreditService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeSecretKey || '', {
      apiVersion: '2023-10-16' as any,
    });
  }

  // Get plan details securely on the backend
  private getPlanDetails(optionId: string) {
    switch (optionId) {
      case 'sub_premium':
        return { amount: 5000, currency: 'eur', credits: 5, description: 'Abonnement BOLIGO - 5 crédits' };
      case 'pack_3':
        return { amount: 1200, currency: 'eur', credits: 3, description: 'Pack Parcours - 3 crédits' };
      case 'single_1':
        return { amount: 500, currency: 'eur', credits: 1, description: 'Une Rencontre - 1 crédit' };
      default:
        throw new BadRequestException('Formule de paiement invalide');
    }
  }

  // Create payment sheet parameters for Stripe mobile integration
  async createPaymentSheet(userId: string, optionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    const plan = this.getPlanDetails(optionId);

    try {
      // 1. Find or create Stripe Customer
      let customerId: string;
      const customers = await this.stripe.customers.list({
        email: user.email,
        limit: 1,
      });

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

      // 2. Create Ephemeral Key for the customer to save cards
      const ephemeralKey = await this.stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: '2023-10-16' }
      );

      // 3. Create PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: plan.amount,
        currency: plan.currency,
        customer: customerId,
        description: plan.description,
        metadata: {
          userId,
          optionId,
          credits: plan.credits.toString(),
          description: plan.description,
        },
      });

      return {
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        publishableKey: this.configService.get<string>('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
      };
    } catch (error) {
      this.logger.error('Erreur lors de la création de la feuille de paiement Stripe:', error);
      throw new BadRequestException(`Erreur Stripe : ${error.message}`);
    }
  }

  // Process Stripe webhook event
  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET non configuré. Validation des webhooks désactivée pour le dev local.');
    }

    let event: Stripe.Event;

    try {
      if (webhookSecret && signature) {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } else {
        // En développement local sans webhookSecret config, on parse l'event directement (à des fins de dev uniquement)
        event = JSON.parse(rawBody.toString());
      }
    } catch (err) {
      this.logger.error(`Validation de signature de webhook Stripe échouée: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Événement Stripe reçu : ${event.type}`);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata;

      if (metadata && metadata.userId && metadata.credits) {
        const userId = metadata.userId;
        const credits = parseInt(metadata.credits, 10);
        const description = metadata.description || 'Recharge crédits Stripe';
        const euroAmount = paymentIntent.amount / 100; // Les montants Stripe sont en centimes
        const paymentRef = paymentIntent.id;

        this.logger.log(`Paiement réussi pour l'utilisateur ${userId}. Ajout de ${credits} crédits. Montant: ${euroAmount}€.`);

        // Mettre à jour les crédits en BDD avec montant en euros et référence Stripe
        await this.creditService.addCredits(
          userId, 
          credits, 
          `${description} (Stripe ID: ${paymentRef})`,
          euroAmount,
          paymentRef
        );
      } else {
        this.logger.warn(`Métadonnées manquantes ou invalides dans le PaymentIntent ${paymentIntent.id}`);
      }
    }

    return { received: true };
  }
}
