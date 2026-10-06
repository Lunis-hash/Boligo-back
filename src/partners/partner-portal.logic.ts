import { createHash, randomBytes } from 'crypto';
import { commissionDue } from './partners.logic';

/** Lien privé de l'Espace partenaire : 256 bits aléatoires, en base64url. */
export function newPortalToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashPortalToken(token) };
}

/** Seule l'empreinte est enregistrée : une fuite de la base ne donne aucun lien. */
export function hashPortalToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isPortalToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

/**
 * Adresse de l'Espace partenaire. Le jeton est placé après « # » : le
 * navigateur ne l'envoie jamais au serveur du site ni dans ses journaux.
 */
export function portalLink(
  token: string,
  lang: string,
  base = process.env.PUBLIC_WEB_URL || 'https://boligo-web.onrender.com',
): string {
  const path = lang === 'en' ? '/partner-space' : '/espace-partenaire';
  return `${base.replace(/\/+$/, '')}${path}#${token}`;
}

export type MonthLine = {
  month: string;
  purchases: number;
  revenue: number;
  commission: number;
};

/** Achats payés avec le code, mois par mois (du plus récent au plus ancien). */
export function monthlyHistory(
  sales: { date: Date; euroAmount: number | null }[],
  commissionRate: number | null | undefined,
  now: Date = new Date(),
  months = 12,
): MonthLine[] {
  const key = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const lines = new Map<string, { purchases: number; revenue: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    lines.set(key(d), { purchases: 0, revenue: 0 });
  }
  for (const s of sales) {
    const line = lines.get(key(s.date));
    if (!line) continue;
    line.purchases += 1;
    line.revenue += s.euroAmount ?? 0;
  }
  return [...lines.entries()].map(([month, l]) => {
    const revenue = Math.round(l.revenue * 100) / 100;
    return {
      month,
      purchases: l.purchases,
      revenue,
      commission: commissionDue(revenue, commissionRate),
    };
  });
}
