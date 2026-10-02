import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentService } from './payment.service';
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

describe('PaymentService — webhook Stripe', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let env: Record<string, string | undefined>;
  let prisma: {
    creditTransaction: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let creditService: { addCredits: jest.Mock };
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
      addCredits: jest.fn().mockResolvedValue({ success: true }),
    };
    const config = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;
    service = new PaymentService(
      config,
      prisma as unknown as PrismaService,
      creditService as unknown as CreditService,
      {} as EmailService,
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

  it('ne crédite pas deux fois le même paiement renvoyé par Stripe', async () => {
    prisma.creditTransaction.findFirst.mockResolvedValue({ id: 'tx-1' });
    const payload = succeededEvent();
    await expect(
      service.handleWebhook(Buffer.from(payload), signed(payload)),
    ).resolves.toEqual({ received: true });
    expect(prisma.creditTransaction.findFirst).toHaveBeenCalledWith({
      where: { paymentRef: 'pi_test_1', type: 'achat' },
      select: { id: true },
    });
    expect(creditService.addCredits).not.toHaveBeenCalled();
  });
});
