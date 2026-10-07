import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentService, stripeConfigIssues } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credit/credit.service';
import { EmailService } from '../common/email.service';

const WEBHOOK_SECRET = 'whsec_test_boligo';

function succeededEvent(paymentIntentId = 'pi_test_1') {
  return JSON.stringify({
    id: 'evt_test_1',
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 1500,
        currency: 'eur',
        metadata: {
          userId: 'user-1',
          credits: '1',
          planName: 'Parcours Harmonie',
        },
      },
    },
  });
}

/** Facturation simulée : aucun appel à Stripe pendant les tests. */
const fakeInvoices = () => ({
  recordPending: jest.fn().mockResolvedValue(undefined),
  afterSuccess: jest.fn().mockResolvedValue(null),
  handleRefund: jest.fn().mockResolvedValue(undefined),
  handleDispute: jest.fn().mockResolvedValue(undefined),
});

describe('PaymentService — webhook Stripe', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let env: Record<string, string | undefined>;
  let prisma: {
    creditTransaction: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let creditService: { addCredits: jest.Mock; getBalance: jest.Mock };
  let service: PaymentService;

  const signed = (payload: string, secret = WEBHOOK_SECRET) =>
    new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({
      payload,
      secret,
    });

  beforeEach(() => {
    env = {
      STRIPE_SECRET_KEY: 'sk_test_dummy',
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    };
    prisma = {
      creditTransaction: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    creditService = {
      addCredits: jest
        .fn()
        .mockResolvedValue({ success: true, alreadyCredited: false }),
      getBalance: jest.fn().mockResolvedValue({ credits: 1 }),
    };
    const config = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;
    service = new PaymentService(
      config,
      prisma as unknown as PrismaService,
      creditService as unknown as CreditService,
      {} as EmailService,
      fakeInvoices() as never,
    );
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('crédite un paiement dont la signature Stripe est valide', async () => {
    const payload = succeededEvent();
    await expect(
      service.handleWebhook(Buffer.from(payload), signed(payload)),
    ).resolves.toEqual({ received: true });
    expect(creditService.addCredits).toHaveBeenCalledWith(
      'user-1',
      1,
      expect.any(String),
      15,
      'pi_test_1',
      undefined,
    );
  });

  it('refuse un événement sans en-tête de signature', async () => {
    await expect(
      service.handleWebhook(Buffer.from(succeededEvent()), undefined as any),
    ).rejects.toThrow(BadRequestException);
    expect(creditService.addCredits).not.toHaveBeenCalled();
  });

  it('refuse une signature fabriquée avec un autre secret', async () => {
    const payload = succeededEvent();
    await expect(
      service.handleWebhook(
        Buffer.from(payload),
        signed(payload, 'whsec_attaquant'),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(creditService.addCredits).not.toHaveBeenCalled();
  });

  it('refuse tout événement en production quand le secret du webhook manque', async () => {
    env.STRIPE_WEBHOOK_SECRET = undefined;
    await expect(
      service.handleWebhook(Buffer.from(succeededEvent()), undefined as any),
    ).rejects.toThrow(BadRequestException);
    expect(creditService.addCredits).not.toHaveBeenCalled();
  });

  it('accepte un événement non signé hors production quand aucun secret n’est défini', async () => {
    process.env.NODE_ENV = 'test';
    env.STRIPE_WEBHOOK_SECRET = undefined;
    await expect(
      service.handleWebhook(Buffer.from(succeededEvent()), undefined as any),
    ).resolves.toEqual({
      received: true,
    });
    expect(creditService.addCredits).toHaveBeenCalledTimes(1);
  });

  it('ne relance ni e-mail ni facture pour un paiement déjà crédité', async () => {
    creditService.addCredits.mockResolvedValue({
      success: true,
      alreadyCredited: true,
    });
    const payload = succeededEvent();
    await expect(
      service.handleWebhook(Buffer.from(payload), signed(payload)),
    ).resolves.toEqual({ received: true });
    // La référence de paiement est transmise : addCredits ne crédite qu'une fois.
    expect(creditService.addCredits).toHaveBeenCalledWith(
      'user-1',
      1,
      expect.any(String),
      15,
      'pi_test_1',
      undefined,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('PaymentService — confirmation par l’app', () => {
  let creditService: { addCredits: jest.Mock; getBalance: jest.Mock };
  let retrieve: jest.Mock;
  let service: PaymentService;
  const env: Record<string, string | undefined> = {
    STRIPE_SECRET_KEY: 'sk_test_dummy',
  };

  const paymentIntent = (over: Record<string, unknown> = {}) => ({
    id: 'pi_test_42',
    object: 'payment_intent',
    status: 'succeeded',
    amount: 1500,
    currency: 'eur',
    metadata: { userId: 'user-1', credits: '1', planName: 'Parcours Harmonie' },
    ...over,
  });

  beforeEach(() => {
    creditService = {
      addCredits: jest
        .fn()
        .mockResolvedValue({ success: true, alreadyCredited: false }),
      getBalance: jest.fn().mockResolvedValue({ credits: 1 }),
    };
    service = new PaymentService(
      { get: jest.fn((k: string) => env[k]) } as unknown as ConfigService,
      {
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      } as unknown as PrismaService,
      creditService as unknown as CreditService,
      {} as EmailService,
      fakeInvoices() as never,
    );
    retrieve = jest.fn().mockResolvedValue(paymentIntent());
    (service as unknown as { stripe: unknown }).stripe = {
      paymentIntents: { retrieve },
    };
  });

  it('crédite un paiement réussi après l’avoir relu chez Stripe', async () => {
    await expect(
      service.confirmPayment('user-1', 'pi_test_42'),
    ).resolves.toEqual({
      credited: true,
      alreadyCredited: false,
      status: 'succeeded',
      credits: 1,
    });
    expect(retrieve).toHaveBeenCalledWith('pi_test_42');
    expect(creditService.addCredits).toHaveBeenCalledWith(
      'user-1',
      1,
      expect.any(String),
      15,
      'pi_test_42',
      undefined,
    );
  });

  it('ne crédite pas un paiement non abouti', async () => {
    retrieve.mockResolvedValue(
      paymentIntent({ status: 'requires_payment_method' }),
    );
    await expect(
      service.confirmPayment('user-1', 'pi_test_42'),
    ).resolves.toEqual({
      credited: false,
      status: 'requires_payment_method',
    });
    expect(creditService.addCredits).not.toHaveBeenCalled();
  });

  it('refuse le paiement d’un autre membre', async () => {
    await expect(
      service.confirmPayment('user-2', 'pi_test_42'),
    ).rejects.toThrow(ForbiddenException);
    expect(creditService.addCredits).not.toHaveBeenCalled();
  });

  it('refuse une référence de paiement mal formée', async () => {
    await expect(
      service.confirmPayment('user-1', '../charges'),
    ).rejects.toThrow(BadRequestException);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('signale un paiement déjà crédité (webhook arrivé avant)', async () => {
    creditService.addCredits.mockResolvedValue({
      success: true,
      alreadyCredited: true,
    });
    await expect(
      service.confirmPayment('user-1', 'pi_test_42'),
    ).resolves.toMatchObject({
      credited: false,
      alreadyCredited: true,
    });
  });
});

describe('stripeConfigIssues', () => {
  it('ne signale rien pour une configuration de test complète', () => {
    expect(stripeConfigIssues('sk_test_a', 'pk_test_b', 'whsec_c')).toEqual([]);
  });

  it('signale des clés de modes différents', () => {
    const issues = stripeConfigIssues('sk_live_a', 'pk_test_b', 'whsec_c');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('incohérentes');
    expect(issues[0]).not.toContain('sk_live_a');
  });

  it('signale un webhook absent ou mal formé', () => {
    expect(stripeConfigIssues('sk_test_a', 'pk_test_b', undefined)[0]).toContain('STRIPE_WEBHOOK_SECRET absent');
    expect(stripeConfigIssues('sk_test_a', 'pk_test_b', 'abc')[0]).toContain('whsec_');
  });
});
