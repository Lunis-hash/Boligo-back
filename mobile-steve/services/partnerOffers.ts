import client, { API_URL } from './api';

/**
 * Offres des marques partenaires montrées dans l'app.
 * On compte les affichages (une fois par session) et les clics, jamais qui a
 * vu ou cliqué : la marque reçoit des totaux et des paramètres de campagne.
 */
export type OfferPlacement = 'OFFRES' | 'PARTENAIRE_DU_MOIS';

export interface PartnerOffer {
  id: string;
  placement: OfferPlacement;
  brand: string;
  title: string;
  perk: string;
  description: string;
  perkCode: string | null;
}

export async function fetchOffers(placement?: OfferPlacement): Promise<PartnerOffer[]> {
  try {
    const { data } = await client.get('/partners/offers', { params: placement ? { placement } : undefined });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const SEEN_KEY = 'boligoOffersSeen';

function sessionStore(): Storage | null {
  try {
    return (globalThis as any).sessionStorage ?? null;
  } catch {
    return null;
  }
}

const seenInMemory = new Set<string>();

/** Offres pas encore comptées pendant cette session. */
export function unseenOfferIds(ids: string[], seen: Iterable<string>): string[] {
  const already = new Set(seen);
  return [...new Set(ids)].filter((id) => !already.has(id));
}

/** Compte l'affichage des offres montrées, une seule fois par session. */
export function recordOfferImpressions(ids: string[]): void {
  const session = sessionStore();
  let stored: string[] = [];
  try {
    stored = JSON.parse(session?.getItem(SEEN_KEY) || '[]');
  } catch {
    stored = [];
  }
  const fresh = unseenOfferIds(ids, [...stored, ...seenInMemory]).slice(0, 30);
  if (fresh.length === 0) return;
  fresh.forEach((id) => seenInMemory.add(id));
  try {
    session?.setItem(SEEN_KEY, JSON.stringify([...stored, ...fresh].slice(-200)));
  } catch {
    /* stockage indisponible : le compteur mémoire suffit */
  }
  client.post('/partners/offers/impressions', { ids: fresh }).catch(() => undefined);
}

/** Adresse de redirection : le serveur compte le clic puis renvoie vers la marque. */
export function offerClickUrl(id: string): string {
  return `${API_URL}/partners/offers/${encodeURIComponent(id)}/go`;
}
