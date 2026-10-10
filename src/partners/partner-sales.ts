import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CodeSales = {
  /** Achats payés (un parcours offert à 100 % n'est pas une vente). */
  purchases: number;
  /** Parcours offerts par un code gratuit : 0 €, sans commission. */
  freeActivations: number;
  revenue: number;
};

/**
 * Achats payés avec chaque code : nombre et chiffre d'affaires en euros, net
 * des remboursements (un achat remboursé ne donne pas de commission).
 */
export async function revenueByCode(
  prisma: PrismaService,
  codeIds: string[],
): Promise<Map<string, CodeSales>> {
  const map = new Map<string, CodeSales>();
  if (!codeIds.length) return map;
  const free = await prisma.creditTransaction.groupBy({
    by: ['promoCodeId'],
    where: {
      promoCodeId: { in: codeIds },
      type: TransactionType.achat,
      euroAmount: 0,
    },
    _count: { _all: true },
  });
  const freeById = new Map(
    free.map((f) => [f.promoCodeId as string, f._count._all]),
  );
  const rows = await prisma.creditTransaction.groupBy({
    by: ['promoCodeId', 'type'],
    where: {
      promoCodeId: { in: codeIds },
      type: {
        in: [TransactionType.achat, TransactionType.remboursement_paiement],
      },
    },
    _count: { _all: true },
    _sum: { euroAmount: true },
  });
  for (const r of rows) {
    if (!r.promoCodeId) continue;
    const entry = map.get(r.promoCodeId) ?? {
      purchases: 0,
      freeActivations: 0,
      revenue: 0,
    };
    if (r.type === TransactionType.achat) entry.purchases += r._count._all;
    entry.revenue =
      Math.round((entry.revenue + (r._sum.euroAmount ?? 0)) * 100) / 100;
    map.set(r.promoCodeId, entry);
  }
  for (const [id, entry] of map) {
    const freeCount = freeById.get(id) ?? 0;
    entry.freeActivations = freeCount;
    entry.purchases = Math.max(0, entry.purchases - freeCount);
  }
  return map;
}
