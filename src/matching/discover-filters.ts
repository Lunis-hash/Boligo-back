/**
 * Filtres « non négociables » du Module 0 : tranche d'âge (M0_Q01),
 * périmètre géographique (M0_Q02) et langue commune (M0_Q10). Ils
 * s'appliquent dans LES DEUX SENS : un profil n'est proposé (ou invitable)
 * que si chacun entre dans les critères de l'autre.
 */
import { answerKeys } from '../interview/questions.data';
import { RawAnswers, ReportContext } from './divergence.engine';

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

/**
 * Lieu servant aux filtres : la ville de résidence, choisie dans une liste à
 * l'inscription (« Ville, Pays »), avant la ville affichée, texte libre de
 * présentation.
 */
export function filterCity(user: {
  city?: string | null;
  profile?: { displayedCity?: string | null } | null;
}): string | null {
  return user.city || user.profile?.displayedCity || null;
}

type Located = {
  city?: string | null;
  profile?: { displayedCity?: string | null } | null;
};

/**
 * V7.1 — où vit chacun, pour lire « je reste où je suis » (M0_Q03, M7_Q07,
 * M7_Q36) : la ville (premier élément) et le pays (dernier élément de
 * « Ville, Pays » ; inconnu si le lieu n'a qu'un élément).
 */
export function homeContext(
  a: Located | null | undefined,
  b: Located | null | undefined,
): ReportContext {
  const pa = cityParts(a ? filterCity(a) : null);
  const pb = cityParts(b ? filterCity(b) : null);
  return {
    cityA: pa[0] ?? null,
    cityB: pb[0] ?? null,
    countryA: pa.length >= 2 ? pa[pa.length - 1] : null,
    countryB: pb.length >= 2 ? pb[pb.length - 1] : null,
  };
}

/** Région : avant-dernier élément de « Ville, Région, Pays », sinon le premier. */
function regionOf(parts: string[]): string {
  return parts.length >= 3 ? parts[parts.length - 2] : parts[0];
}

/**
 * Règle BOLIGO : jamais plus de 5 ans d'écart entre deux membres (même
 * génération, plus jeune, plus âgé), et 10 ans au plus pour qui a répondu
 * « peu importe » (M0_Q01 = D). Chacun doit entrer dans la limite de l'autre.
 */
export const MAX_AGE_GAP = 5;
export const MAX_AGE_GAP_ANY = 10;

/** Écart d'âge maximal accepté par un membre selon sa réponse à M0_Q01. */
export function maxAgeGap(agePref: string | undefined): number {
  return agePref === 'D' ? MAX_AGE_GAP_ANY : MAX_AGE_GAP;
}

/** Le candidat entre-t-il dans les critères du Module 0 du membre ? */
export function acceptsCandidate(
  viewer: FilterSubject,
  candidate: FilterSubject,
): boolean {
  const agePref = viewer.answers.M0_Q01;
  if (viewer.age && candidate.age) {
    const gap = candidate.age - viewer.age;
    if (Math.abs(gap) > maxAgeGap(agePref)) return false;
    if (agePref === 'B' && gap >= 0) return false;
    if (agePref === 'C' && gap <= 0) return false;
  }

  const v = cityParts(viewer.city);
  const c = cityParts(candidate.city);
  if (v.length && c.length) {
    const scope = viewer.answers.M0_Q02;
    if (scope === 'A' && !(c[0].includes(v[0]) || v[0].includes(c[0])))
      return false;
    if (scope === 'B' && regionOf(v) !== regionOf(c)) return false;
    // Pays comparé à l'identique : « Congo » n'est pas « Congo RDC ».
    if (scope === 'C' && v[v.length - 1] !== c[c.length - 1]) return false;
  }
  return true;
}

/** Clé de « Une autre langue » (M0_Q10) : trop vague pour rapprocher deux membres. */
const OTHER_LANGUAGE = 'I';

/**
 * Langue écrite en toutes lettres qui correspond à une option de M0_Q10 :
 * « Wolof » écrit dans « autre langue » vaut l'option Wolof (F).
 */
const LANGUAGE_KEY_BY_NAME: Record<string, string> = {
  francais: 'A',
  french: 'A',
  anglais: 'B',
  english: 'B',
  arabe: 'C',
  arabic: 'C',
  lingala: 'D',
  swahili: 'E',
  kiswahili: 'E',
  wolof: 'F',
  portugais: 'G',
  portuguese: 'G',
  portugues: 'G',
  espagnol: 'H',
  spanish: 'H',
  espanol: 'H',
};

/** Langues écrites par le membre (« une autre langue »), sans accents ni casse. */
function writtenLanguages(answers: RawAnswers): string[] {
  if (!answerKeys(answers.M0_Q10).includes(OTHER_LANGUAGE)) return [];
  return (answers.M0_Q10_AUTRE ?? '')
    .split(/[,;/]| et | and /)
    .map(norm)
    .filter((l) => l.length >= 2);
}

/**
 * Langues dans lesquelles le membre peut vivre une relation (M0_Q10), y
 * compris celles écrites en toutes lettres qui correspondent à une option.
 * Entretien antérieur à la question : le français, langue dans laquelle il a
 * été passé. Seulement une langue écrite inconnue : aucun filtre.
 */
export function memberLanguages(answers: RawAnswers): string[] | null {
  if (!answers.M0_Q10) return ['A'];
  const keys = new Set(
    answerKeys(answers.M0_Q10).filter((k) => k !== OTHER_LANGUAGE),
  );
  for (const name of writtenLanguages(answers)) {
    const key = LANGUAGE_KEY_BY_NAME[name];
    if (key) keys.add(key);
  }
  return keys.size ? [...keys] : null;
}

/**
 * Langues écrites en toutes lettres (« une autre langue : bambara »), sans
 * accents ni casse. Une faute de frappe ne doit jamais exclure : elles ne
 * servent qu'à rapprocher deux membres, jamais à les séparer.
 */
export function otherLanguages(answers: RawAnswers): string[] {
  return writtenLanguages(answers).filter((l) => !LANGUAGE_KEY_BY_NAME[l]);
}

/** Les deux membres partagent-ils au moins une langue du quotidien ? */
export function shareLanguage(a: RawAnswers, b: RawAnswers): boolean {
  const oa = otherLanguages(a);
  if (oa.length && otherLanguages(b).some((l) => oa.includes(l))) return true;
  const la = memberLanguages(a);
  const lb = memberLanguages(b);
  if (!la || !lb) return true;
  return la.some((k) => lb.includes(k));
}

/** Chacun entre dans les critères de l'autre, et ils ont une langue en commun. */
export function mutuallyAccepted(a: FilterSubject, b: FilterSubject): boolean {
  return (
    acceptsCandidate(a, b) &&
    acceptsCandidate(b, a) &&
    shareLanguage(a.answers, b.answers)
  );
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
  // Toujours dans la limite d'écart du membre (un an de marge de chaque côté).
  const gap = maxAgeGap(agePref);
  const oldest = yearsAgo(viewerAge + gap + 2);
  const youngest = yearsAgo(viewerAge - gap - 1);
  if (agePref === 'B') return { gte: yearsAgo(viewerAge + 1), lte: youngest };
  if (agePref === 'C') return { gte: oldest, lte: yearsAgo(viewerAge - 1) };
  return { gte: oldest, lte: youngest };
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
