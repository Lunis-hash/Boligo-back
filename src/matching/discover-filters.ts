/**
 * Filtres « non négociables » du Module 0 : tranche d'âge (M0_Q01) et
 * périmètre géographique (M0_Q02). Ils s'appliquent dans LES DEUX SENS : un
 * profil n'est proposé (ou invitable) que si chacun entre dans les critères
 * de l'autre.
 */
import { RawAnswers } from './divergence.engine';

export interface FilterSubject {
  /** Âge exact (anniversaire compris), null si inconnu. */
  age: number | null;
  /** « Ville, Pays » (onboarding) ou « Ville, Région, Pays ». */
  city: string | null;
  answers: RawAnswers;
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function cityParts(city: string | null | undefined): string[] {
  return (city ?? '').split(',').map(norm).filter(Boolean);
}

/** Le candidat entre-t-il dans les critères du Module 0 du membre ? */
export function acceptsCandidate(
  viewer: FilterSubject,
  candidate: FilterSubject,
): boolean {
  const agePref = viewer.answers.M0_Q01;
  if (viewer.age && candidate.age) {
    if (agePref === 'A' && Math.abs(candidate.age - viewer.age) > 5)
      return false;
    if (agePref === 'B' && candidate.age >= viewer.age) return false;
    if (agePref === 'C' && candidate.age <= viewer.age) return false;
  }

  const v = cityParts(viewer.city);
  const c = cityParts(candidate.city);
  if (v.length && c.length) {
    const scope = viewer.answers.M0_Q02;
    if (scope === 'A' && !(c[0].includes(v[0]) || v[0].includes(c[0])))
      return false;
    if (scope === 'B' && (v[1] ?? v[0]) !== (c[1] ?? c[0])) return false;
    // Pays comparé à l'identique : « Congo » n'est pas « Congo RDC ».
    if (scope === 'C' && v[v.length - 1] !== c[c.length - 1]) return false;
  }
  return true;
}

/** Chacun entre dans les critères de l'autre. */
export function mutuallyAccepted(a: FilterSubject, b: FilterSubject): boolean {
  return acceptsCandidate(a, b) && acceptsCandidate(b, a);
}

/**
 * Bornes de date de naissance à passer à la requête (avec un an de marge) pour
 * que la limite de candidats chargés s'applique APRÈS le filtre d'âge.
 */
export function birthDateBounds(
  viewerAge: number | null,
  agePref: string | undefined,
  now = new Date(),
): { gte?: Date; lte?: Date } | undefined {
  if (!viewerAge) return undefined;
  const yearsAgo = (n: number) => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - n);
    return d;
  };
  if (agePref === 'A')
    return { gte: yearsAgo(viewerAge + 7), lte: yearsAgo(viewerAge - 6) };
  if (agePref === 'B') return { gte: yearsAgo(viewerAge + 1) };
  if (agePref === 'C') return { lte: yearsAgo(viewerAge - 1) };
  return undefined;
}

/**
 * Pré-filtre de périmètre pour la requête : sur-ensemble du filtre exact
 * ci-dessus (même jeton de ville ou de pays, sans tenir compte de la casse),
 * pour que la limite de candidats chargés ne retienne pas des profils hors
 * périmètre à la place des bons.
 */
export function scopeWhere(
  viewerCity: string | null,
  scope: string | undefined,
): { OR: Array<Record<string, unknown>> } | undefined {
  const parts = (viewerCity ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return undefined;
  const token =
    scope === 'A' ? parts[0] : scope === 'C' ? parts[parts.length - 1] : null;
  if (!token) return undefined;
  const contains = { contains: token, mode: 'insensitive' as const };
  return {
    OR: [{ city: contains }, { profile: { is: { displayedCity: contains } } }],
  };
}
