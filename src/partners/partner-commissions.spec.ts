import { PartnerCommissionKind } from '@prisma/client';
import {
  aggregateFigures,
  commissionCents,
  monthlyCommissions,
  reversalDelta,
} from './partner-commissions';

const { VENTE, REPRISE } = PartnerCommissionKind;

describe('commissionCents', () => {
  it('arrondit au centime, rien sans taux ni montant', () => {
    expect(commissionCents(1350, 15)).toBe(203);
    expect(commissionCents(1350, 20)).toBe(270);
    expect(commissionCents(1275, 25)).toBe(319);
    expect(commissionCents(1350, null)).toBe(0);
    expect(commissionCents(1350, 0)).toBe(0);
    expect(commissionCents(0, 20)).toBe(0);
  });
});

describe('reversalDelta : reprise au prorata du remboursement', () => {
  const sale = { saleCents: 1350, saleCommissionCents: 270 };

  it('remboursement total : toute la commission est reprise', () => {
    expect(
      reversalDelta({
        ...sale,
        refundedTotalCents: 1350,
        alreadyRefundedCents: 0,
        alreadyReversedCents: 0,
      }),
    ).toEqual({ amountCents: 1350, commissionCents: 270 });
  });

  it('remboursement partiel : reprise proportionnelle', () => {
    expect(
      reversalDelta({
        ...sale,
        refundedTotalCents: 675,
        alreadyRefundedCents: 0,
        alreadyReversedCents: 0,
      }),
    ).toEqual({ amountCents: 675, commissionCents: 135 });
  });

  it('deux remboursements partiels puis le solde : jamais plus que la commission', () => {
    const first = reversalDelta({
      ...sale,
      refundedTotalCents: 500,
      alreadyRefundedCents: 0,
      alreadyReversedCents: 0,
    })!;
    expect(first).toEqual({ amountCents: 500, commissionCents: 100 });
    const second = reversalDelta({
      ...sale,
      refundedTotalCents: 1000,
      alreadyRefundedCents: 500,
      alreadyReversedCents: 100,
    })!;
    expect(second).toEqual({ amountCents: 500, commissionCents: 100 });
    const last = reversalDelta({
      ...sale,
      refundedTotalCents: 1350,
      alreadyRefundedCents: 1000,
      alreadyReversedCents: 200,
    })!;
    expect(last).toEqual({ amountCents: 350, commissionCents: 70 });
    expect(
      first.commissionCents + second.commissionCents + last.commissionCents,
    ).toBe(270);
  });

  it('événement rejoué ou cumul inchangé : rien', () => {
    expect(
      reversalDelta({
        ...sale,
        refundedTotalCents: 675,
        alreadyRefundedCents: 675,
        alreadyReversedCents: 135,
      }),
    ).toBeNull();
  });

  it('un cumul supérieur à la vente est plafonné', () => {
    expect(
      reversalDelta({
        ...sale,
        refundedTotalCents: 99999,
        alreadyRefundedCents: 0,
        alreadyReversedCents: 0,
      }),
    ).toEqual({ amountCents: 1350, commissionCents: 270 });
  });
});

describe('aggregateFigures : clics ≠ ventes ≠ revenus confirmés', () => {
  it('sépare brut, remboursé, confirmé et commission due', () => {
    const map = aggregateFigures([
      {
        id: 'v1',
        partnerId: 'p',
        kind: VENTE,
        amountCents: 1350,
        commissionCents: 270,
        saleId: null,
      },
      {
        id: 'v2',
        partnerId: 'p',
        kind: VENTE,
        amountCents: 1350,
        commissionCents: 270,
        saleId: null,
      },
      {
        id: 'v3',
        partnerId: 'p',
        kind: VENTE,
        amountCents: 1200,
        commissionCents: 300,
        saleId: null,
      },
      {
        id: 'r1',
        partnerId: 'p',
        kind: REPRISE,
        amountCents: 1350,
        commissionCents: -270,
        saleId: 'v1',
      },
      {
        id: 'r2',
        partnerId: 'p',
        kind: REPRISE,
        amountCents: 600,
        commissionCents: -150,
        saleId: 'v3',
      },
      {
        id: 'w1',
        partnerId: 'q',
        kind: VENTE,
        amountCents: 1350,
        commissionCents: 0,
        saleId: null,
      },
    ]);
    expect(map.get('p')).toEqual({
      sales: 3,
      refundedSales: 1,
      grossCents: 3900,
      refundedCents: 1950,
      confirmedCents: 1950,
      commissionGrossCents: 840,
      commissionReversedCents: 420,
      commissionDueCents: 420,
    });
    // Marque sans commission : chiffre d'affaires suivi, commission nulle.
    expect(map.get('q')).toMatchObject({
      confirmedCents: 1350,
      commissionDueCents: 0,
    });
  });
});

describe('monthlyCommissions', () => {
  it('la reprise compte dans le mois du remboursement', () => {
    const now = new Date('2026-10-13T12:00:00Z');
    const months = monthlyCommissions(
      [
        {
          kind: VENTE,
          amountCents: 1350,
          commissionCents: 270,
          createdAt: new Date('2026-09-20T00:00:00Z'),
        },
        {
          kind: REPRISE,
          amountCents: 1350,
          commissionCents: -270,
          createdAt: new Date('2026-10-02T00:00:00Z'),
        },
        {
          kind: VENTE,
          amountCents: 1200,
          commissionCents: 240,
          createdAt: new Date('2026-10-05T00:00:00Z'),
        },
      ],
      now,
    );
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({
      month: '2026-10',
      purchases: 1,
      revenue: -1.5,
      refunded: 13.5,
      commission: -0.3,
    });
    expect(months[1]).toEqual({
      month: '2026-09',
      purchases: 1,
      revenue: 13.5,
      refunded: 0,
      commission: 2.7,
    });
  });
});
