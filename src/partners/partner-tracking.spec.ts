import { PartnerStatus } from '@prisma/client';
import {
  discountLabel,
  funnelByMonth,
  isSafeOfferUrl,
  normalizePartnerCode,
  offerIsLive,
  offerRedirectUrl,
  partnerShareLink,
  rate,
  referralStillValid,
} from './partner-tracking.logic';
import { PartnerTrackingService } from './partner-tracking.service';

describe('Lien partenaire et offres : règles', () => {
  it('normalise le code et refuse le reste', () => {
    expect(normalizePartnerCode(' awa10 ')).toBe('AWA10');
    expect(normalizePartnerCode('a b')).toBeNull();
    expect(normalizePartnerCode('<script>')).toBeNull();
    expect(normalizePartnerCode(42)).toBeNull();
  });

  it('garde le code 90 jours après l’inscription', () => {
    const now = new Date('2026-10-10T12:00:00Z');
    expect(referralStillValid(new Date('2026-08-01T12:00:00Z'), now)).toBe(
      true,
    );
    expect(referralStillValid(new Date('2026-06-01T12:00:00Z'), now)).toBe(
      false,
    );
    expect(referralStillValid(null, now)).toBe(false);
  });

  it('n’accepte que des liens https propres pour les offres', () => {
    expect(isSafeOfferUrl('https://marque.fr/offre')).toBe(true);
    expect(isSafeOfferUrl('http://marque.fr')).toBe(false);
    expect(isSafeOfferUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeOfferUrl('https://user:pass@marque.fr')).toBe(false);
  });

  it('ajoute les paramètres de campagne sans écraser ceux de la marque', () => {
    const url = offerRedirectUrl(
      'https://marque.fr/o?utm_source=x',
      'abcdef123456',
    );
    expect(url).toContain('utm_source=x');
    expect(url).toContain('utm_medium=offre_partenaire');
    expect(url).toContain('utm_campaign=abcdef12');
  });

  it('montre une offre seulement dans sa période', () => {
    const now = new Date('2026-10-10');
    expect(
      offerIsLive({ isActive: true, startsAt: null, endsAt: null }, now),
    ).toBe(true);
    expect(
      offerIsLive({ isActive: false, startsAt: null, endsAt: null }, now),
    ).toBe(false);
    expect(
      offerIsLive(
        { isActive: true, startsAt: new Date('2026-11-01'), endsAt: null },
        now,
      ),
    ).toBe(false);
    expect(
      offerIsLive(
        { isActive: true, startsAt: null, endsAt: new Date('2026-10-01') },
        now,
      ),
    ).toBe(false);
  });

  it('libellés, taux, lien et cumul mensuel', () => {
    expect(discountLabel('percent', 10)).toBe('-10 %');
    expect(discountLabel('fixed', 500)).toBe('-5,00 €');
    expect(rate(3, 40)).toBe(7.5);
    expect(rate(1, 0)).toBe(0);
    expect(partnerShareLink('https://boligo.fr/', 'AWA10')).toBe(
      'https://boligo.fr/?p=AWA10',
    );
    const months = funnelByMonth([
      { day: new Date('2026-10-02'), visits: 5, signups: 1 },
      { day: new Date('2026-10-09'), visits: 3, signups: 0 },
      { day: new Date('2026-09-20'), visits: 2, signups: 1 },
    ]);
    expect(months).toEqual([
      { month: '2026-10', visits: 8, signups: 1 },
      { month: '2026-09', visits: 2, signups: 1 },
    ]);
  });
});

describe('Lien partenaire et offres : service', () => {
  const promo = (over: Record<string, unknown> = {}) => ({
    id: 'c1',
    code: 'AWA10',
    discountType: 'percent',
    discountValue: 10,
    isActive: true,
    expiresAt: null,
    maxUses: null,
    usedCount: 0,
    partner: {
      status: PartnerStatus.ACCEPTE,
      name: 'Awa Diop',
      company: 'Awa Média',
      type: 'CREATEUR',
    },
    ...over,
  });

  function setup(code: unknown = promo()) {
    const prisma = {
      promoCode: { findUnique: jest.fn(() => Promise.resolve(code)) },
      partnerDailyStat: { upsert: jest.fn(() => Promise.resolve({})) },
      user: {
        update: jest.fn(() => Promise.resolve({})),
        findUnique: jest.fn(() =>
          Promise.resolve({
            referredAt: new Date(),
            referralCode: { id: 'c1', code: 'AWA10' },
          }),
        ),
      },
      promoUsage: { findUnique: jest.fn(() => Promise.resolve(null)) },
      partnerOffer: {
        findMany: jest.fn(() => Promise.resolve([])),
        findUnique: jest.fn(() => Promise.resolve(null)),
      },
      partnerOfferStat: { upsert: jest.fn(() => Promise.resolve({})) },
    };
    return { prisma, service: new PartnerTrackingService(prisma as never) };
  }

  it('présente le partenaire et sa réduction au visiteur', async () => {
    const { service } = setup();
    await expect(service.linkInfo('awa10')).resolves.toEqual({
      code: 'AWA10',
      partnerName: 'Awa Média',
      partnerType: 'CREATEUR',
      discount: '-10 %',
    });
  });

  it('ne compte rien pour un code inactif ou un partenaire non accepté', async () => {
    for (const code of [
      promo({ isActive: false }),
      promo({
        partner: {
          status: PartnerStatus.EN_COURS,
          name: 'X',
          company: null,
          type: 'CREATEUR',
        },
      }),
      promo({ partner: null }),
      null,
    ]) {
      const { service, prisma } = setup(code);
      await expect(service.recordVisit('AWA10')).resolves.toEqual({
        counted: false,
      });
      expect(prisma.partnerDailyStat.upsert).not.toHaveBeenCalled();
    }
  });

  it('rattache l’inscription au partenaire et la compte', async () => {
    const { service, prisma } = setup();
    await expect(service.attachReferral('u1', 'AWA10')).resolves.toBe(true);
    const [update] = prisma.user.update.mock.calls[0] as unknown as [
      { where: { id: string }; data: { referralCodeId: string } },
    ];
    expect(update.where).toEqual({ id: 'u1' });
    expect(update.data.referralCodeId).toBe('c1');
    const [args] = prisma.partnerDailyStat.upsert.mock.calls[0] as unknown as [
      { create: Record<string, unknown> },
    ];
    expect(args.create).toMatchObject({ promoCodeId: 'c1', signups: 1 });
  });

  it('une panne ne bloque jamais l’inscription', async () => {
    const { service, prisma } = setup();
    prisma.user.update.mockRejectedValueOnce(new Error('panne'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(service.attachReferral('u1', 'AWA10')).resolves.toBe(false);
  });

  it('préremplit le code au paiement, sauf s’il a déjà servi', async () => {
    const { service, prisma } = setup();
    await expect(service.referralFor('u1')).resolves.toMatchObject({
      code: 'AWA10',
      discount: '-10 %',
    });
    prisma.promoUsage.findUnique.mockResolvedValueOnce({ id: 'used' } as never);
    await expect(service.referralFor('u1')).resolves.toEqual({ code: null });
  });

  it('refuse une offre avec un lien non sécurisé', async () => {
    const { service, prisma } = setup();
    (prisma as unknown as { partnerApplication: unknown }).partnerApplication =
      {
        findUnique: jest.fn(() =>
          Promise.resolve({ id: 'p1', status: PartnerStatus.ACCEPTE }),
        ),
      };
    await expect(
      service.createOffer('p1', {
        title: 'T',
        perk: 'P',
        description: 'D',
        url: 'http://marque.fr',
      }),
    ).rejects.toThrow(/https/);
  });

  it('un clic sur une offre terminée ne redirige pas', async () => {
    const { service } = setup();
    await expect(service.clickOffer('o1')).rejects.toThrow(/terminée/);
  });
});
