/**
 * Filtres « non négociables » du Module 0 : tranche d'âge (M0_Q01),
 * périmètre géographique (M0_Q02) et langue commune (M0_Q10). Ils
 * s'appliquent dans LES DEUX SENS : un profil n'est proposé (ou invitable)
 * que si chacun entre dans les critères de l'autre.
 */
import { parseAgeRange } from '../interview/questions.v82';
import { answerKeys } from '../interview/questions.data';
import { RawAnswers, ReportContext } from './divergence.engine';

export interface FilterSubject {
  /** Âge exact (anniversaire compris), null si inconnu. */
  age: number | null;
  /** « Ville, Pays » (onboarding) ou « Ville, Région, Pays ». */
  city: string | null;
  /**
   * Région administrative retrouvée à partir de la ville, dans tous les pays
   * (RegionService). Absente : celle écrite dans « Ville, Région, Pays »,
   * sinon le pays.
   */
  region?: string | null;
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

/** Région du membre : celle retrouvée pour sa ville, sinon celle écrite dans son adresse. */
function knownRegion(subject: FilterSubject, parts: string[]): string | null {
  if (subject.region) return norm(subject.region);
  return parts.length >= 3 ? parts[parts.length - 2] : null;
}

/**
 * Même région ? Règle commune à tous les pays : régions comparées quand
 * elles sont connues ; sinon le pays, pour qu'une ville mal écrite ou
 * introuvable n'exclue jamais un membre de sa région.
 */
function sameRegion(
  a: FilterSubject,
  pa: string[],
  b: FilterSubject,
  pb: string[],
): boolean {
  if (pa[0].includes(pb[0]) || pb[0].includes(pa[0])) return true;
  const ra = knownRegion(a, pa);
  const rb = knownRegion(b, pb);
  if (ra && rb) return ra === rb;
  if (pa.length >= 2 && pb.length >= 2)
    return pa[pa.length - 1] === pb[pb.length - 1];
  return false;
}

/** Le candidat entre-t-il dans les critères du Module 0 du membre ? */
export function acceptsCandidate(
  viewer: FilterSubject,
  candidate: FilterSubject,
): boolean {
  const agePref = viewer.answers.M0_Q01;
  // V8.2 : seule la plage réellement acceptée (V82_M0_02) filtre, dans les
  // deux sens ; la tranche idéale (V82_M0_01) ne sert qu'au classement.
  const accepted = parseAgeRange(viewer.answers.V82_M0_02);
  if (accepted) {
    if (
      candidate.age &&
      (candidate.age < accepted[0] || candidate.age > accepted[1])
    )
      return false;
  } else if (viewer.age && candidate.age) {
    const gap = candidate.age - viewer.age;
    if (Math.abs(gap) > maxAgeGap(agePref)) return false;
    if (agePref === 'B' && gap >= 0) return false;
    if (agePref === 'C' && gap <= 0) return false;
  }

  const v = cityParts(viewer.city);
  const c = cityParts(candidate.city);
  if (v.length && c.length) {
    const scope = viewer.answers.M0_Q02;
    // « Près de chez moi » et « Même région » : même région, dans tous les
    // pays (Argenteuil et Bezons : Île-de-France).
    if (
      (scope === 'A' || scope === 'B') &&
      !sameRegion(viewer, v, candidate, c)
    )
      return false;
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
  // V7.1 : créoles des Antilles et d'Haïti.
  creole: 'J',
  kreyol: 'J',
  'creole haitien': 'J',
  'haitian creole': 'J',
  'kreyol ayisyen': 'J',
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
  /** V8.2 : plage d'âges acceptée (« 25-40 »), prioritaire sur M0_Q01. */
  acceptedRange?: string,
): { gte?: Date; lte?: Date } | undefined {
  const yearsAgo = (n: number) => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - n);
    return d;
  };
  const accepted = parseAgeRange(acceptedRange);
  // Un an de marge de chaque côté : le filtre exact (acceptsCandidate) tranche.
  if (accepted)
    return { gte: yearsAgo(accepted[1] + 2), lte: yearsAgo(accepted[0] - 1) };
  if (!viewerAge) return undefined;
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
 * ci-dessus (même pays, sans tenir compte de la casse),
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
  // Local et région : même pays (la région est vérifiée ensuite, ville par ville).
  if (scope !== 'A' && scope !== 'B' && scope !== 'C') return undefined;
  const token = parts[parts.length - 1];
  const contains = { contains: token, mode: 'insensitive' as const };
  return {
    OR: [{ city: contains }, { profile: { is: { displayedCity: contains } } }],
  };
}
