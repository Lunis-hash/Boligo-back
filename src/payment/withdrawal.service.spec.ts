import { WithdrawalService } from './withdrawal.service';

type AsyncMock = jest.Mock<Promise<unknown>, unknown[]>;
const resolves = (value?: unknown): AsyncMock =>
  jest.fn<Promise<unknown>, unknown[]>(() => Promise.resolve(value));

const paidAt = new Date('2026-10-01T10:00:00Z');

function setup(enabled = true) {
  if (enabled) process.env.BILLING_ENABLED = 'true';
  else delete process.env.BILLING_ENABLED;
  const prisma = {
    creditTransaction: {
      findFirst: resolves({ date: paidAt, euroAmount: 15, creditAmount: 1 }),
      findMany: resolves([
        {
          date: paidAt,
          euroAmount: 15,
          paymentRef: 'pi_1',
          description: 'Parcours Harmonie (Stripe: pi_1)',
        },
      ]),
      count: resolves(0),
    },
    user: {
      findUnique: resolves({ email: 'awa@example.com', firstName: 'Awa' }),
    },
    payment: {
      upsert: resolves({ id: 'pay_1', withdrawals: [] }),
      findMany: resolves([]),
    },
    withdrawalRequest: {
      create: resolves({ id: 'w1' }),
      update: resolves({}),
      findUnique: resolves(null),
    },
  };
  const email = { sendSimpleEmail: resolves() };
  const invoices = { alertTeam: resolves(), handleRefund: resolves() };
  const service = new WithdrawalService(
    { get: () => undefined } as never,
    prisma as never,
    email as never,
    invoices as never,
  );
  const stripe = {
    refunds: { create: resolves({ id: 're_1', charge: 'ch_1' }) },
    charges: {
      retrieve: resolves({
        id: 'ch_1',
        payment_intent: 'pi_1',
        amount_refunded: 1500,
      }),
    },
  };
  (service as unknown as { stripe: unknown }).stripe = stripe;
  return { service, prisma, email, invoices, stripe };
}

const request = (refundedCents = 0) => ({
  id: 'w1',
  status: 'recue',
  payment: {
    stripePaymentIntentId: 'pi_1',
    totalAmountCents: 1500,
    refundedCents,
  },
  user: { email: 'awa@example.com', firstName: 'Awa' },
});

describe('Rétractation', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('demande dans les 14 jours : enregistrée, accusé de réception, équipe prévenue', async () => {
    const { service, prisma, email, invoices } = setup();
    const res = await service.request(
      'u1',
      'pi_1',
      new Date('2026-10-05T10:00:00Z'),
    );
    expect(res.status).toBe('recue');
    expect(prisma.withdrawalRequest.create).toHaveBeenCalled();
    const [to, subject, , paragraphs] = email.sendSimpleEmail.mock.calls[0] as [
      string,
      string,
      string,
      string[],
    ];
    expect(to).toBe('awa@example.com');
    expect(subject).toMatch(/rétractation est bien reçue/);
    expect(paragraphs.join(' ')).toMatch(/accusé de réception/);
    expect(invoices.alertTeam).toHaveBeenCalled();
  });

  it('après 14 jours : refusée avec la date du paiement', async () => {
    const { service } = setup();
    await expect(
      service.request('u1', 'pi_1', new Date('2026-10-20T10:00:00Z')),
    ).rejects.toThrow(/délai de rétractation de 14 jours est dépassé/);
  });

  it('achat d’un autre membre : introuvable', async () => {
    const { service, prisma } = setup();
    prisma.creditTransaction.findFirst.mockResolvedValueOnce(null);
    await expect(service.request('u2', 'pi_1')).rejects.toThrow(/introuvable/);
  });

  it('registre désactivé : accusé de réception quand même, sans écriture', async () => {
    const { service, prisma, email } = setup(false);
    await service.request('u1', 'pi_1', new Date('2026-10-05T10:00:00Z'));
    expect(prisma.withdrawalRequest.create).not.toHaveBeenCalled();
    expect(email.sendSimpleEmail).toHaveBeenCalled();
  });

  it('mes achats : la rétractation est proposée pendant 14 jours', async () => {
    const { service } = setup(false);
    const [inTime] = await service.purchases(
      'u1',
      new Date('2026-10-05T10:00:00Z'),
    );
    expect(inTime.canWithdraw).toBe(true);
    expect(inTime.description).toBe('Parcours Harmonie');
    const [late] = await service.purchases(
      'u1',
      new Date('2026-10-20T10:00:00Z'),
    );
    expect(late.canWithdraw).toBe(false);
  });

  it('remboursement décidé par l’équipe : une seule fois chez Stripe, avoir aussitôt', async () => {
    const { service, prisma, stripe, invoices } = setup();
    prisma.withdrawalRequest.findUnique.mockResolvedValue(request());
    const res = await service.decide('w1', 'admin1', { action: 'refund' });
    expect(res).toEqual({ status: 'remboursee', refundCents: 1500 });
    const [refund, options] = stripe.refunds.create.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(refund).toMatchObject({ payment_intent: 'pi_1', amount: 1500 });
    expect(options).toEqual({ idempotencyKey: 'boligo-withdrawal-w1' });
    expect(invoices.handleRefund).toHaveBeenCalled();
  });

  it('montant supérieur au reste à rembourser : refusé', async () => {
    const { service, prisma, stripe } = setup();
    prisma.withdrawalRequest.findUnique.mockResolvedValue(request(1000));
    await expect(
      service.decide('w1', 'admin1', { action: 'refund', amountCents: 1000 }),
    ).rejects.toThrow(/Montant à rembourser invalide/);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it('refus sans motif : impossible', async () => {
    const { service, prisma } = setup();
    prisma.withdrawalRequest.findUnique.mockResolvedValue(request());
    await expect(
      service.decide('w1', 'admin1', { action: 'refuse' }),
    ).rejects.toThrow(/motif/);
  });
});
