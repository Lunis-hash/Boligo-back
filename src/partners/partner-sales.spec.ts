import { revenueByCode } from './partner-sales';

describe('Ventes par code promo', () => {
  it('un achat remboursé ne compte pas dans le chiffre d’affaires du partenaire', async () => {
    const prisma = {
      creditTransaction: {
        groupBy: jest.fn(() =>
          Promise.resolve([
            {
              promoCodeId: 'c1',
              type: 'achat',
              _count: { _all: 2 },
              _sum: { euroAmount: 27 },
            },
            {
              promoCodeId: 'c1',
              type: 'remboursement_paiement',
              _count: { _all: 1 },
              _sum: { euroAmount: -13.5 },
            },
          ]),
        ),
      },
    };
    const map = await revenueByCode(prisma as never, ['c1']);
    expect(map.get('c1')).toEqual({ purchases: 2, revenue: 13.5 });
  });
});
