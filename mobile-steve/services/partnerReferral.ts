import { Platform } from 'react-native';
import client from './api';
import { storage } from './storage';

/**
 * Lien partenaire (?p=CODE) : un visiteur arrivé par le lien d'un créateur,
 * d'un ambassadeur ou d'une marque garde le code jusqu'à son inscription, pour
 * profiter de la réduction annoncée et que le partenaire soit crédité.
 *
 * Pas de cookie publicitaire ni de traceur tiers : seul le code public du
 * partenaire est conservé sur l'appareil, 30 jours au plus. Le serveur ne
 * compte que des totaux par jour (visites, inscriptions).
 */
export const REFERRAL_STORAGE_KEY = 'boligoPartnerRef';
export const REFERRAL_KEEP_DAYS = 30;

export interface PartnerReferral {
  code: string;
  partnerName: string;
  discount: string;
  savedAt: number;
}

/** Code lisible dans une adresse : lettres, chiffres, - et _, 3 à 40 caractères. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9_-]{3,40}$/.test(code) ? code : null;
}

/** Lit ?p=CODE dans une adresse (ou une chaîne de requête). */
export function referralCodeFromUrl(search: string): string | null {
  const query = search.includes('?') ? search.slice(search.indexOf('?') + 1) : search;
  for (const part of query.split('&')) {
    const [key, value = ''] = part.split('=');
    if (key === 'p') {
      try {
        return normalizeReferralCode(decodeURIComponent(value));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Valeur stockée encore valable ? (forme correcte et moins de 30 jours) */
export function parseStoredReferral(raw: string | null, now = Date.now()): PartnerReferral | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PartnerReferral;
    if (!normalizeReferralCode(value?.code) || typeof value.savedAt !== 'number') return null;
    if (now - value.savedAt > REFERRAL_KEEP_DAYS * 24 * 3600 * 1000) return null;
    return value;
  } catch {
    return null;
  }
}

export async function getStoredReferral(): Promise<PartnerReferral | null> {
  const value = parseStoredReferral(await storage.getItem(REFERRAL_STORAGE_KEY));
  if (!value) await storage.removeItem(REFERRAL_STORAGE_KEY);
  return value;
}

export async function clearStoredReferral(): Promise<void> {
  await storage.removeItem(REFERRAL_STORAGE_KEY);
}

const VISIT_SESSION_KEY = 'boligoPartnerVisit';

function sessionStore(): Storage | null {
  try {
    return (globalThis as any).sessionStorage ?? null;
  } catch {
    return null;
  }
}

let pending: Promise<PartnerReferral | null> | null = null;

/**
 * Au démarrage sur le web : si l'adresse contient ?p=CODE, vérifie le code,
 * le garde et compte une visite (une seule fois par session de navigation).
 */
export function captureReferralFromLocation(): Promise<PartnerReferral | null> {
  if (pending) return pending;
  pending = (async () => {
    if (Platform.OS !== 'web') return getStoredReferral();
    const search = (globalThis as any).location?.search ?? '';
    const code = referralCodeFromUrl(search);
    if (!code) return getStoredReferral();
    try {
      const { data } = await client.get(`/partners/link/${encodeURIComponent(code)}`);
      const referral: PartnerReferral = {
        code: data.code,
        partnerName: data.partnerName,
        discount: data.discount,
        savedAt: Date.now(),
      };
      await storage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(referral));
      const session = sessionStore();
      if (session?.getItem(VISIT_SESSION_KEY) !== referral.code) {
        session?.setItem(VISIT_SESSION_KEY, referral.code);
        client.post(`/partners/link/${encodeURIComponent(referral.code)}/visit`).catch(() => undefined);
      }
      return referral;
    } catch {
      // Lien inconnu ou terminé : on ne garde rien.
      return getStoredReferral();
    }
  })();
  return pending;
}

/** Code partenaire proposé au paiement pour le membre connecté (90 jours après l'inscription). */
export async function fetchAccountReferral(): Promise<{ code: string | null; partnerName?: string; discount?: string }> {
  try {
    const { data } = await client.get('/partners/referral');
    return data ?? { code: null };
  } catch {
    return { code: null };
  }
}
