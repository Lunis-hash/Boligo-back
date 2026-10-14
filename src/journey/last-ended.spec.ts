import { JourneyService } from './journey.service';

/**
 * Onglet Matchs après un abandon : le membre apprend que son parcours est
 * terminé, avec qui, et si son crédit lui a été rendu.
 */
function serviceWith(journey: unknown, refund: unknown) {
  const prisma = {
    journey: { findFirst: jest.fn(() => Promise.resolve(journey)) },
    creditTransaction: { findFirst: jest.fn(() => Promise.resolve(refund)) },
  };
  const service = new JourneyService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, prisma };
}

const ended = new Date('2026-10-14T10:00:00Z');
const JOURNEY = {
  id: 'j1',
  userAId: 'dan',
  result: 'abandonne',
  endDate: ended,
  userA: { firstName: 'Dan' },
  userB: { firstName: 'Eva' },
};

describe('Dernier parcours terminé (onglet Matchs)', () => {
  it('membre quitté : nom du partenaire et crédit rendu', async () => {
    const { service, prisma } = serviceWith(JOURNEY, { creditAmount: 1 });
    await expect(service.lastEndedJourney('eva')).resolves.toEqual({
      ended: {
        journeyId: 'j1',
        partnerName: 'Dan',
        result: 'abandonne',
        endedAt: ended.toISOString(),
        creditReturned: 1,
      },
    });
    const where = (
      prisma.journey.findFirst.mock.calls[0] as unknown as [
        { where: { result: { in: string[] }; endDate: { gte: Date } } },
      ]
    )[0].where;
    expect(where.result.in).toEqual(['abandonne', 'echoue']);
    // Fenêtre de 14 jours.
    const days = (Date.now() - where.endDate.gte.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(14);
  });

  it('membre qui a quitté : partenaire nommé, aucun crédit rendu', async () => {
    const { service } = serviceWith(JOURNEY, null);
    const r = await service.lastEndedJourney('dan');
    expect(r.ended?.partnerName).toBe('Eva');
    expect(r.ended?.creditReturned).toBe(0);
  });

  it('aucun parcours récent clos : null', async () => {
    const { service } = serviceWith(null, null);
    await expect(service.lastEndedJourney('eva')).resolves.toEqual({
      ended: null,
    });
  });
});
