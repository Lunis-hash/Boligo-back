import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Achats payés avec chaque code : nombre et chiffre d'affaires en euros. */
export async function revenueByCode(
  prisma: PrismaService,
  codeIds: string[],
): Promise<Map<string, { purchases: number; revenue: number }>> {
  const map = new Map<string, { purchases: number; revenue: number }>();
  if (!codeIds.length) return map;
  const rows = await prisma.creditTransaction.groupBy({
    by: ['promoCodeId'],
    where: { promoCodeId: { in: codeIds }, type: TransactionType.achat },
    _count: { _all: true },
    _sum: { euroAmount: true },
  });
  for (const r of rows) {
    if (r.promoCodeId) {
      map.set(r.promoCodeId, {
        purchases: r._count._all,
        revenue: Math.round((r._sum.euroAmount ?? 0) * 100) / 100,
      });
    }
  }
  return map;
}
