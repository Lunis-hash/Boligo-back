import { PartnerCommissionKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Registre des commissions partenaires.
 *
 * - Une vente payée avec le code d'un partenaire ajoute une ligne VENTE au
 *   taux en vigueur CE JOUR-LÀ : changer le taux plus tard ne réécrit rien.
 * - Un remboursement ajoute une ligne REPRISE rattachée à la vente, au
 *   prorata du montant rendu (remboursement total : commission annulée).
 * - Rejouer le même événement (webhook rejoué, confirmation et webhook
 *   simultanés) ne fait rien : chaque ligne a sa clé d'idempotence.
 */

type Db = PrismaService | Prisma.TransactionClient;

/** Commission en centimes, arrondie au centime le plus proche. */
export function commissionCents(
  amountCents: number,
  ratePercent: number | null | undefined,
): number {
  if (!ratePercent || amountCents <= 0) return 0;
  return Math.round((amountCents * ratePercent) / 100);
}

/**
 * Reprise à enregistrer pour un remboursement cumulé de `refundedTotalCents`
 * sur une vente : différence entre la reprise due au prorata et ce qui a
 * déjà été repris. Rien (null) si le cumul n'a pas augmenté.
 */
export function reversalDelta(input: {
  saleCents: number;
  saleCommissionCents: number;
  refundedTotalCents: number;
  alreadyRefundedCents: number;
  alreadyReversedCents: number;
}): { amountCents: number; commissionCents: number } | null {
  const refunded = Math.min(
    Math.max(0, input.refundedTotalCents),
    input.saleCents,
  );
  const amount = refunded - input.alreadyRefundedCents;
  if (amount <= 0 || input.saleCents <= 0) return null;
  const target =
    refunded >= input.saleCents
      ? input.saleCommissionCents
      : Math.min(
          input.saleCommissionCents,
          Math.round((input.saleCommissionCents * refunded) / input.saleCents),
        );
  return {
    amountCents: amount,
    commissionCents: Math.max(0, target - input.alreadyReversedCents),
  };
}

/**
 * Enregistre la vente d'un Parcours payé avec un code partenaire. Le taux
 * du partenaire est copié sur la ligne. Sans partenaire derrière le code,
 * ou pour un montant nul (Parcours offert), rien n'est enregistré.
 */
export async function recordPartnerSale(
  db: Db,
  input: {
    paymentRef: string;
    promoCodeId?: string | null;
    amountCents: number;
    at?: Date;
  },
) {
  if (!input.promoCodeId || !input.paymentRef || input.amountCents <= 0)
    return null;
  const partner = await db.partnerApplication.findUnique({
    where: { promoCodeId: input.promoCodeId },
    select: { id: true, commissionRate: true },
  });
  if (!partner) return null;
  const rate = partner.commissionRate ?? 0;
  return db.partnerCommission.upsert({
    where: { idempotencyKey: `${input.paymentRef}:vente` },
    update: {},
    create: {
      partnerId: partner.id,
      promoCodeId: input.promoCodeId,
      kind: PartnerCommissionKind.VENTE,
      paymentRef: input.paymentRef,
      idempotencyKey: `${input.paymentRef}:vente`,
      amountCents: input.amountCents,
      ratePercent: rate,
      commissionCents: commissionCents(input.amountCents, rate),
      ...(input.at ? { createdAt: input.at } : {}),
    },
  });
}

/**
 * Remboursement (total ou partiel) d'un paiement : reprise proportionnelle
 * de la commission. `refundedTotalCents` est le CUMUL remboursé sur le
 * paiement (comme `charge.amount_refunded` chez Stripe).
 */
export async function recordPartnerRefund(
  prisma: PrismaService,
  input: {
    paymentRef: string;
    refundedTotalCents: number;
    reason?: string;
    at?: Date;
  },
) {
  // Paiement sans code partenaire : rien à reprendre, aucune transaction.
  const exists = await prisma.partnerCommission.findUnique({
    where: { idempotencyKey: `${input.paymentRef}:vente` },
    select: { id: true },
  });
  if (!exists) return null;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${'commission:' + input.paymentRef}))) AS lock`;
    const sale = await tx.partnerCommission.findUnique({
      where: { idempotencyKey: `${input.paymentRef}:vente` },
    });
    if (!sale) return null;
    const prior = await tx.partnerCommission.aggregate({
      where: { saleId: sale.id, kind: PartnerCommissionKind.REPRISE },
      _sum: { amountCents: true, commissionCents: true },
    });
    const delta = reversalDelta({
      saleCents: sale.amountCents,
      saleCommissionCents: sale.commissionCents,
      refundedTotalCents: input.refundedTotalCents,
      alreadyRefundedCents: prior._sum.amountCents ?? 0,
      alreadyReversedCents: -(prior._sum.commissionCents ?? 0),
    });
    if (!delta) return null;
    const full =
      Math.min(input.refundedTotalCents, sale.amountCents) >= sale.amountCents;
    return tx.partnerCommission.create({
      data: {
        partnerId: sale.partnerId,
        promoCodeId: sale.promoCodeId,
        kind: PartnerCommissionKind.REPRISE,
        paymentRef: sale.paymentRef,
        idempotencyKey: `${sale.paymentRef}:reprise:${Math.min(input.refundedTotalCents, sale.amountCents)}`,
        amountCents: delta.amountCents,
        ratePercent: sale.ratePercent,
        commissionCents: -delta.commissionCents,
        saleId: sale.id,
        reason:
          input.reason ??
          (full
            ? 'Remboursement total : commission annulée'
            : 'Remboursement partiel : reprise au prorata'),
        ...(input.at ? { createdAt: input.at } : {}),
      },
    });
  });
}

/** Chiffres d'un partenaire, les mêmes pour son Espace et l'administration. */
export type PartnerFigures = {
  /** Parcours payés (ventes vérifiées par le paiement). */
  sales: number;
  /** Ventes intégralement remboursées. */
  refundedSales: number;
  grossCents: number;
  refundedCents: number;
  /** Revenu réellement confirmé : payé et non remboursé. */
  confirmedCents: number;
  commissionGrossCents: number;
  commissionReversedCents: number;
  /** Commission due = brute − reprises. */
  commissionDueCents: number;
};

export const EMPTY_FIGURES: PartnerFigures = {
  sales: 0,
  refundedSales: 0,
  grossCents: 0,
  refundedCents: 0,
  confirmedCents: 0,
  commissionGrossCents: 0,
  commissionReversedCents: 0,
  commissionDueCents: 0,
};

type Line = {
  id: string;
  partnerId: string;
  kind: PartnerCommissionKind;
  amountCents: number;
  commissionCents: number;
  saleId: string | null;
};

/** Agrège les lignes du registre (fonction pure, testée). */
export function aggregateFigures(lines: Line[]): Map<string, PartnerFigures> {
  const map = new Map<string, PartnerFigures>();
  const refundedBySale = new Map<string, number>();
  const saleAmount = new Map<string, number>();
  for (const l of lines) {
    const f = map.get(l.partnerId) ?? { ...EMPTY_FIGURES };
    if (l.kind === PartnerCommissionKind.VENTE) {
      f.sales += 1;
      f.grossCents += l.amountCents;
      f.commissionGrossCents += l.commissionCents;
      saleAmount.set(l.id, l.amountCents);
    } else {
      f.refundedCents += l.amountCents;
      f.commissionReversedCents += -l.commissionCents;
      if (l.saleId)
        refundedBySale.set(
          l.saleId,
          (refundedBySale.get(l.saleId) ?? 0) + l.amountCents,
        );
    }
    map.set(l.partnerId, f);
  }
  for (const l of lines) {
    if (l.kind !== PartnerCommissionKind.VENTE) continue;
    if ((refundedBySale.get(l.id) ?? 0) >= l.amountCents)
      map.get(l.partnerId)!.refundedSales += 1;
  }
  for (const f of map.values()) {
    f.confirmedCents = f.grossCents - f.refundedCents;
    f.commissionDueCents = f.commissionGrossCents - f.commissionReversedCents;
  }
  return map;
}

export async function partnerFigures(
  prisma: PrismaService,
  partnerIds: string[],
): Promise<Map<string, PartnerFigures>> {
  if (!partnerIds.length) return new Map();
  const lines = await prisma.partnerCommission.findMany({
    where: { partnerId: { in: partnerIds } },
    select: {
      id: true,
      partnerId: true,
      kind: true,
      amountCents: true,
      commissionCents: true,
      saleId: true,
    },
  });
  return aggregateFigures(lines);
}

export type CommissionMonth = {
  month: string;
  purchases: number;
  revenue: number;
  refunded: number;
  commission: number;
};

/**
 * Historique mensuel (du plus récent au plus ancien) : une reprise compte
 * dans le mois du remboursement, la vente reste dans le mois de la vente.
 */
export function monthlyCommissions(
  lines: {
    kind: PartnerCommissionKind;
    amountCents: number;
    commissionCents: number;
    createdAt: Date;
  }[],
  now: Date = new Date(),
  months = 12,
): CommissionMonth[] {
  const key = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const acc = new Map<
    string,
    { purchases: number; gross: number; refunded: number; commission: number }
  >();
  for (let i = 0; i < months; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    acc.set(key(d), { purchases: 0, gross: 0, refunded: 0, commission: 0 });
  }
  for (const l of lines) {
    const m = acc.get(key(l.createdAt));
    if (!m) continue;
    if (l.kind === PartnerCommissionKind.VENTE) {
      m.purchases += 1;
      m.gross += l.amountCents;
    } else m.refunded += l.amountCents;
    m.commission += l.commissionCents;
  }
  return [...acc.entries()].map(([month, m]) => ({
    month,
    purchases: m.purchases,
    revenue: (m.gross - m.refunded) / 100,
    refunded: m.refunded / 100,
    commission: m.commission / 100,
  }));
}
