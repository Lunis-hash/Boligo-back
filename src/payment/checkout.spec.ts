import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';

type AsyncMock = jest.Mock<Promise<unknown>, unknown[]>;
const resolves = (value?: unknown): AsyncMock =>
  jest.fn<Promise<unknown>, unknown[]>(() => Promise.resolve(value));

/** Paiement sur le web par Stripe Checkout : Stripe simulé, aucun appel réseau. */
function setup() {
  const env: Record<string, string | undefined> = {
    STRIPE_SECRET_KEY: 'sk_test_x',
    WEB_APP_URL: 'https://boligo-web.example',
  };
  const prisma = {
    user: {
      findUnique: resolves({
        id: 'u1',
        email: 'awa@example.com',
        firstName: 'Awa',
        lastName: 'Diallo',
        termsVersion: '2026-10-07',
      }),
    },
  };
  const credits = {
    addCredits: resolves({ success: true, alreadyCredited: false }),
    getBalance: resolves({ credits: 1 }),
  };
  const invoices = {
    recordPending: resolves(),
    afterSuccess: resolves(null),
  };
  const email = { sendPaymentConfirmationEmail: resolves() };
  const service = new PaymentService(
    { get: (k: string) => env[k] } as unknown as ConfigService,
    prisma as never,
    credits as never,
    email as never,
    invoices as never,
  );
  const stripe = {
    customers: {
      list: resolves({ data: [{ id: 'cus_1' }] }),
      create: resolves({ id: 'cus_new' }),
    },
    checkout: {
      sessions: {
        create: resolves({
          id: 'cs_test_1',
          url: 'https://checkout.stripe.com/c/pay/cs_test_1',
          payment_intent: null,
        }),
        retrieve: resolves({
          id: 'cs_test_1',
          payment_status: 'paid',
          payment_intent: 'pi_1',
          metadata: { userId: 'u1' },
        }),
      },
    },
    paymentIntents: {
      retrieve: resolves({
        id: 'pi_1',
        status: 'succeeded',
        amount: 1500,
        currency: 'eur',
        customer: 'cus_1',
        metadata: { userId: 'u1', credits: '1', planName: 'Parcours Harmonie' },
      }),
    },
  };
  (service as unknown as { stripe: unknown }).stripe = stripe;
  return { service, stripe, credits };
}

describe('Paiement sur le web (Stripe Checkout)', () => {
  it('crée la page de paiement avec le montant, les métadonnées et le retour vers l’app web', async () => {
    const { service, stripe } = setup();
    const res = await service.createCheckoutSession(
      'u1',
      'parcours_harmonie',
      undefined,
      {
        earlyStartConsent: true,
        consentVersion: '2026-10-07',
      },
    );
    expect(res.url).toContain('checkout.stripe.com');
    const [params] = stripe.checkout.sessions.create.mock.calls[0] as [
      {
        mode: string;
        line_items: { price_data: { unit_amount: number } }[];
        payment_intent_data: { metadata: Record<string, string> };
        metadata: Record<string, string>;
        success_url: string;
        cancel_url: string;
      },
    ];
    expect(params.mode).toBe('payment');
    expect(params.line_items[0].price_data.unit_amount).toBe(1500);
    expect(params.payment_intent_data.metadata).toMatchObject({
      userId: 'u1',
      credits: '1',
    });
    expect(params.payment_intent_data.metadata.earlyStartConsentAt).not.toBe(
      '',
    );
    expect(params.metadata).toEqual({ userId: 'u1' });
    expect(params.success_url).toBe(
      'https://boligo-web.example/onboarding/payment?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    );
    expect(params.cancel_url).toContain('checkout=cancel');
  });

  it('au retour, une session payée crédite le membre une seule fois', async () => {
    const { service, credits } = setup();
    const res = await service.confirmCheckout('u1', 'cs_test_1');
    expect(res).toMatchObject({ credited: true, credits: 1 });
    expect(credits.addCredits).toHaveBeenCalledTimes(1);
  });

  it('la session d’un autre membre est refusée', async () => {
    const { service, credits } = setup();
    await expect(service.confirmCheckout('u2', 'cs_test_1')).rejects.toThrow(
      /ne vous appartient pas/,
    );
    expect(credits.addCredits).not.toHaveBeenCalled();
  });

  it('une session pas encore payée ne crédite rien', async () => {
    const { service, stripe, credits } = setup();
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      id: 'cs_test_1',
      payment_status: 'unpaid',
      payment_intent: null,
      metadata: { userId: 'u1' },
    });
    await expect(service.confirmCheckout('u1', 'cs_test_1')).resolves.toEqual({
      credited: false,
      status: 'unpaid',
    });
    expect(credits.addCredits).not.toHaveBeenCalled();
  });

  it('une référence mal formée est refusée', async () => {
    const { service } = setup();
    await expect(service.confirmCheckout('u1', 'pi_1')).rejects.toThrow(
      /invalide/,
    );
  });
});
