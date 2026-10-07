import { InvoiceService } from './invoice.service';

type AsyncMock = jest.Mock<Promise<unknown>, unknown[]>;
const resolves = (value?: unknown): AsyncMock =>
  jest.fn<Promise<unknown>, unknown[]>(() => Promise.resolve(value));
/** Arguments du n-ième appel d'une simulation. */
const callOf = (mock: AsyncMock, n = 0) => mock.mock.calls[n];
type Params = Record<string, unknown>;

/** Stripe simulé : aucun appel réseau, chaque appel est observable. */
function fakeStripe(opts: { country?: string; cardCountry?: string } = {}) {
  const invoice = {
    id: 'in_1',
    status: 'draft',
    number: null as string | null,
    total: 1500,
    total_excluding_tax: 1250,
    invoice_pdf: 'https://stripe.example/in_1.pdf',
    lines: { data: [] as { id: string }[] },
  };
  return {
    invoice,
    charges: {
      retrieve: resolves({
        id: 'ch_1',
        billing_details: {
          name: 'Awa Diallo',
          address: opts.country
            ? {
                line1: '1 rue A',
                line2: null,
                postal_code: '75001',
                city: 'Paris',
                state: null,
                country: opts.country,
              }
            : null,
        },
        payment_method_details: {
          card: { country: opts.cardCountry ?? opts.country ?? null },
        },
      }),
    },
    customers: { update: resolves({}) },
    invoices: {
      create: resolves({ id: 'in_1' }),
      retrieve: resolves({ ...invoice }),
      finalizeInvoice: resolves({
        ...invoice,
        status: 'open',
        number: 'BOL-0001',
      }),
      pay: resolves({ ...invoice, status: 'paid', number: 'BOL-0001' }),
    },
    invoiceItems: { create: resolves({}) },
    taxRates: {
      list: resolves({ data: [] }),
      create: resolves({ id: 'txr_fr20' }),
    },
    creditNotes: {
      list: resolves({ data: [] }),
      create: resolves({ id: 'cn_1', number: 'BOL-0001-CN-01' }),
    },
  };
}

const pi = (over: Params = {}) =>
  ({
    id: 'pi_1',
    amount: 1500,
    currency: 'eur',
    customer: 'cus_1',
    latest_charge: 'ch_1',
    description: 'Parcours Harmonie',
    metadata: { userId: 'u1', credits: '1', planName: 'Parcours Harmonie' },
    ...over,
  }) as never;

const user = {
  id: 'u1',
  firstName: 'Awa',
  lastName: 'Diallo',
  city: 'Dakar, Sénégal',
};

function setup(stripeOpts = {}) {
  const prisma = {
    payment: {
      upsert: resolves({ id: 'pay_1' }),
      update: resolves({}),
      findUnique: resolves(null),
    },
    billingProfile: { upsert: resolves({}) },
    invoice: {
      upsert: resolves({
        id: 'inv_row',
        status: 'a_emettre',
        stripeObjectId: null,
      }),
      update: resolves({}),
      findUnique: resolves(null),
      findMany: resolves([]),
    },
    user: {
      findUnique: resolves({ creditBalance: 1 }),
      update: resolves({}),
    },
    creditTransaction: { create: resolves({}) },
    $queryRaw: resolves([]),
    $transaction: jest.fn<
      Promise<unknown>,
      [(tx: unknown) => Promise<unknown>]
    >(),
  };
  prisma.$transaction.mockImplementation((fn) => fn(prisma));
  const config = { get: () => undefined };
  const email = { sendSimpleEmail: resolves() };
  const service = new InvoiceService(
    config as never,
    prisma as never,
    email as never,
  );
  const stripe = fakeStripe(stripeOpts);
  (service as unknown as { stripe: unknown }).stripe = stripe;
  return { service, prisma, stripe, email };
}

describe('Factures', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('France : facture avec TVA de 20 % incluse, payée hors Stripe, sans registre', async () => {
    const { service, stripe, prisma } = setup({ country: 'FR' });
    const issued = await service.afterSuccess(pi(), user);
    const [params, options] = callOf(stripe.invoices.create) as [
      Params,
      Params,
    ];
    expect(params.automatic_tax).toEqual({ enabled: false });
    expect(params.footer).toContain('Prix TTC');
    expect(options).toEqual({ idempotencyKey: 'boligo-invoice-pi_1' });
    const [rate] = callOf(stripe.taxRates.create) as [Params];
    expect(rate).toMatchObject({ percentage: 20, inclusive: true });
    const [item] = callOf(stripe.invoiceItems.create) as [Params];
    expect(item).toMatchObject({ amount: 1500, tax_rates: ['txr_fr20'] });
    expect(stripe.invoices.pay).toHaveBeenCalledWith('in_1', {
      paid_out_of_band: true,
    });
    expect(issued).toMatchObject({
      number: 'BOL-0001',
      exclTaxCents: 1250,
      taxCents: 250,
    });
    // BILLING_ENABLED absent : rien n'est écrit en base.
    expect(prisma.invoice.upsert).not.toHaveBeenCalled();
    expect(prisma.payment.upsert).not.toHaveBeenCalled();
  });

  it('Sénégal (pays du profil) : pas de TVA française, mention 259 B', async () => {
    const { service, stripe } = setup();
    await service.afterSuccess(pi(), user);
    const [params] = callOf(stripe.invoices.create) as [{ footer: string }];
    expect(params.footer).toMatch(/259 B/);
    expect(stripe.taxRates.create).not.toHaveBeenCalled();
    const [item] = callOf(stripe.invoiceItems.create) as [Params];
    expect(item.tax_rates).toBeUndefined();
  });

  it('Stripe Tax actif avec une adresse : taxe calculée par Stripe, prix TTC inchangé', async () => {
    process.env.BILLING_STRIPE_TAX = 'true';
    const { service, stripe } = setup({ country: 'BE' });
    await service.afterSuccess(pi(), user);
    const [params] = callOf(stripe.invoices.create) as [Params];
    expect(params.automatic_tax).toEqual({ enabled: true });
    const [item] = callOf(stripe.invoiceItems.create) as [Params];
    expect(item).toMatchObject({
      tax_behavior: 'inclusive',
      tax_code: 'txcd_10000000',
      amount: 1500,
    });
    const [customer, update] = callOf(stripe.customers.update) as [
      string,
      { address: Params },
    ];
    expect(customer).toBe('cus_1');
    expect(update.address.country).toBe('BE');
  });

  it('registre actif : paiement, adresse et facture enregistrés', async () => {
    process.env.BILLING_ENABLED = 'true';
    const { service, prisma } = setup({ country: 'FR', cardCountry: 'FR' });
    await service.afterSuccess(pi(), user);
    const [payment] = callOf(prisma.payment.upsert) as [{ update: Params }];
    expect(payment.update).toMatchObject({
      status: 'reussi',
      customerCountry: 'FR',
      cardCountry: 'FR',
    });
    expect(prisma.billingProfile.upsert).toHaveBeenCalled();
    const calls = prisma.invoice.update.mock.calls;
    const [last] = calls[calls.length - 1] as [{ data: Params }];
    expect(last.data).toMatchObject({ status: 'emise', number: 'BOL-0001' });
  });

  it('reprise : une facture déjà créée chez Stripe est complétée, jamais recréée', async () => {
    process.env.BILLING_ENABLED = 'true';
    const { service, prisma, stripe } = setup({ country: 'FR' });
    prisma.invoice.upsert.mockResolvedValueOnce({
      id: 'inv_row',
      status: 'erreur',
      stripeObjectId: 'in_1',
    });
    await service.afterSuccess(pi(), user);
    expect(stripe.invoices.create).not.toHaveBeenCalled();
    expect(stripe.invoices.finalizeInvoice).toHaveBeenCalledWith('in_1');
  });

  it('échec chez Stripe : la facture passe en erreur, le paiement n’est pas bloqué', async () => {
    process.env.BILLING_ENABLED = 'true';
    const { service, prisma, stripe } = setup({ country: 'FR' });
    stripe.invoices.create.mockRejectedValueOnce(new Error('Stripe en panne'));
    await expect(service.afterSuccess(pi(), user)).resolves.toBeNull();
    const [update] = callOf(prisma.invoice.update) as [{ data: Params }];
    expect(update.data.status).toBe('erreur');
  });
});

describe('Remboursements', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.BILLING_ENABLED = 'true';
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  const payment = (refundedCents = 0) => ({
    id: 'pay_1',
    userId: 'u1',
    credits: 1,
    totalAmountCents: 1500,
    refundedCents,
    promoCodeId: 'promo_1',
    invoices: [{ id: 'inv_row' }],
  });
  const original = {
    id: 'inv_row',
    paymentId: 'pay_1',
    userId: 'u1',
    currency: 'eur',
    taxRatePercent: 20,
    taxCountry: 'FR',
    taxRegime: 'FR',
    buyerName: 'Awa Diallo',
    buyerAddress: null,
    buyerCountry: 'FR',
    number: 'BOL-0001',
    stripeObjectId: 'in_1',
  };
  const charge = (amount_refunded: number) =>
    ({ id: 'ch_1', payment_intent: 'pi_1', amount_refunded }) as never;

  it('remboursement total d’un crédit inutilisé : crédit retiré, avoir émis, trace négative', async () => {
    const { service, prisma, stripe } = setup();
    prisma.payment.findUnique
      .mockResolvedValueOnce(payment())
      .mockResolvedValueOnce({ refundedCents: 0 });
    prisma.invoice.findUnique.mockResolvedValue(original);
    stripe.invoices.retrieve.mockResolvedValue({
      ...stripe.invoice,
      lines: { data: [{ id: 'il_1' }] },
    });
    await service.handleRefund(charge(1500));
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { creditBalance: { decrement: 1 } },
    });
    const [trace] = callOf(prisma.creditTransaction.create) as [
      { data: Params },
    ];
    expect(trace.data).toMatchObject({
      type: 'remboursement_paiement',
      creditAmount: -1,
      euroAmount: -15,
      promoCodeId: 'promo_1',
    });
    const [paid] = callOf(prisma.payment.update) as [{ data: Params }];
    expect(paid.data).toEqual({ refundedCents: 1500, status: 'rembourse' });
    const [note, options] = callOf(stripe.creditNotes.create) as [
      Params,
      Params,
    ];
    expect(note).toMatchObject({
      invoice: 'in_1',
      out_of_band_amount: 1500,
      lines: [
        { type: 'invoice_line_item', invoice_line_item: 'il_1', amount: 1500 },
      ],
    });
    expect(options).toEqual({ idempotencyKey: 'boligo-avoir:ch_1:1500' });
  });

  it('remboursement partiel (rétractation après le début) : aucun crédit retiré', async () => {
    const { service, prisma } = setup();
    prisma.payment.findUnique
      .mockResolvedValueOnce(payment())
      .mockResolvedValueOnce({ refundedCents: 0 });
    prisma.invoice.findUnique.mockResolvedValue(original);
    await service.handleRefund(charge(1000));
    expect(prisma.user.update).not.toHaveBeenCalled();
    const [paid] = callOf(prisma.payment.update) as [{ data: Params }];
    expect(paid.data).toEqual({
      refundedCents: 1000,
      status: 'rembourse_partiel',
    });
  });

  it('événement rejoué : rien n’est fait deux fois', async () => {
    const { service, prisma, stripe } = setup();
    prisma.payment.findUnique.mockResolvedValueOnce(payment(1500));
    await service.handleRefund(charge(1500));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(stripe.creditNotes.create).not.toHaveBeenCalled();
  });
});

describe('Journal des ventes', () => {
  it('avoirs en négatif, cellules protégées contre les formules', async () => {
    const { service, prisma } = setup();
    const row = {
      buyerCountry: 'FR',
      taxRegime: 'FR',
      taxRatePercent: { toString: () => '20' },
      currency: 'eur',
      totalExclTaxCents: 1250,
      taxCents: 250,
      totalInclTaxCents: 1500,
    };
    prisma.invoice.findMany.mockResolvedValue([
      {
        ...row,
        issuedAt: new Date('2026-10-07T10:00:00Z'),
        number: 'BOL-0001',
        kind: 'facture',
        payment: {
          stripePaymentIntentId: 'pi_1',
          promoCode: { code: '=CMD' },
          cardCountry: 'FR',
        },
        originalInvoice: null,
      },
      {
        ...row,
        issuedAt: new Date('2026-10-08T10:00:00Z'),
        number: 'BOL-0001-CN-01',
        kind: 'avoir',
        payment: {
          stripePaymentIntentId: 'pi_1',
          promoCode: null,
          cardCountry: 'FR',
        },
        originalInvoice: { number: 'BOL-0001' },
      },
    ]);
    const csv = await service.salesJournalCsv();
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"12.50";"2.50";"15.00"');
    expect(lines[1]).toContain(`"'=CMD"`);
    expect(lines[2]).toContain('"-12.50";"-2.50";"-15.00"');
    expect(lines[2]).toContain('"BOL-0001"');
  });
});
