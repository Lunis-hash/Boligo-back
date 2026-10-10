/**
 * Lien partenaire suivi et offres des marques : règles sans base de données.
 *
 * Principes (site de rencontre, données sensibles) :
 * - aucun cookie publicitaire, aucun traceur tiers ;
 * - on compte des visites, des inscriptions, des affichages et des clics par
 *   jour, jamais qui a vu ou cliqué ;
 * - le code du partenaire voyage dans l'adresse (?p=CODE) puis reste attaché
 *   au compte créé, pour que le membre profite de la réduction annoncée.
 */

/** Durée pendant laquelle un inscrit via un lien garde le code du partenaire. */
export const REFERRAL_WINDOW_DAYS = 90;

/** Code saisi ou lu dans une adresse : majuscules, lettres, chiffres, - et _. */
export function normalizePartnerCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9_-]{3,40}$/.test(code) ? code : null;
}

/** Jour UTC (minuit) servant de clé aux compteurs journaliers. */
export function dayKey(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Mois « 2026-10 » d'un jour de compteur. */
export function monthKey(day: Date): string {
  return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Le membre inscrit via un lien garde-t-il encore le code du partenaire ? */
export function referralStillValid(
  referredAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!referredAt) return false;
  const age = now.getTime() - referredAt.getTime();
  return age >= 0 && age <= REFERRAL_WINDOW_DAYS * 24 * 3600 * 1000;
}

/** Adresse d'une offre : https uniquement, sans identifiants ni espaces. */
export function isSafeOfferUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length > 500 || /\s/.test(raw)) {
    return false;
  }
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Adresse de redirection vers la marque, avec des paramètres de campagne
 * pour qu'elle retrouve dans ses propres statistiques les visites venues de
 * BOLIGO (sans aucune donnée sur le membre).
 */
export function offerRedirectUrl(raw: string, offerId: string): string {
  const url = new URL(raw);
  if (!url.searchParams.has('utm_source')) {
    url.searchParams.set('utm_source', 'boligo');
  }
  if (!url.searchParams.has('utm_medium')) {
    url.searchParams.set('utm_medium', 'offre_partenaire');
  }
  if (!url.searchParams.has('utm_campaign')) {
    url.searchParams.set('utm_campaign', offerId.slice(0, 8));
  }
  return url.toString();
}

/** Une offre est montrée si elle est active et dans sa période. */
export function offerIsLive(
  offer: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date = new Date(),
): boolean {
  if (!offer.isActive) return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt < now) return false;
  return true;
}

/** Taux en %, arrondi à une décimale ; 0 quand la base est nulle. */
export function rate(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/** Réduction affichée au visiteur, ex. « -10 % » ou « -5,00 € ». */
export function discountLabel(
  type: 'percent' | 'fixed' | 'free',
  value: number,
): string {
  if (type === 'free') return 'Parcours offert';
  if (type === 'fixed')
    return `-${(value / 100).toFixed(2).replace('.', ',')} €`;
  return `-${value} %`;
}

/** Lien à partager par le partenaire. */
export function partnerShareLink(webUrl: string, code: string): string {
  return `${webUrl.replace(/\/+$/, '')}/?p=${encodeURIComponent(code)}`;
}

export interface FunnelMonth {
  month: string;
  visits: number;
  signups: number;
}

/** Visites et inscriptions par mois, des 12 derniers mois au plus. */
export function funnelByMonth(
  rows: { day: Date; visits: number; signups: number }[],
  limit = 12,
): FunnelMonth[] {
  const map = new Map<string, FunnelMonth>();
  for (const r of rows) {
    const key = monthKey(r.day);
    const m = map.get(key) ?? { month: key, visits: 0, signups: 0 };
    m.visits += r.visits;
    m.signups += r.signups;
    map.set(key, m);
  }
  return [...map.values()]
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, limit);
}
