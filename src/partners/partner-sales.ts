import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Achats payés avec chaque code : nombre et chiffre d'affaires en euros, net
 * des remboursements (un achat remboursé ne donne pas de commission).
 */
export async function revenueByCode(
  prisma: PrismaService,
  codeIds: string[],
): Promise<Map<string, { purchases: number; revenue: number }>> {
  const map = new Map<string, { purchases: number; revenue: number }>();
  if (!codeIds.length) return map;
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
    const entry = map.get(r.promoCodeId) ?? { purchases: 0, revenue: 0 };
    if (r.type === TransactionType.achat) entry.purchases += r._count._all;
    entry.revenue =
      Math.round((entry.revenue + (r._sum.euroAmount ?? 0)) * 100) / 100;
    map.set(r.promoCodeId, entry);
  }
  return map;
}
