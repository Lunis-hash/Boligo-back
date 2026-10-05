/**
 * Langues proposées à M0_Q10 selon le pays de résidence choisi (ou détecté
 * par géolocalisation) à l'inscription. Quatre propositions : la langue du
 * pays, l'anglais, l'espagnol et « une autre langue » à écrire. Ce n'est
 * qu'une pré-sélection : le membre coche ou décoche librement.
 *
 * Clés de M0_Q10 : A français, B anglais, C arabe, D lingala, E kiswahili,
 * F wolof, G portugais, H espagnol, I autre langue (à préciser).
 */
import type { InterviewLanguage } from './questions.en';

interface CountryLanguages {
  keys: string[];
  /** Langue principale absente de la liste, proposée en « autre langue ». */
  other?: { fr: string; en: string };
}

const other = (fr: string, en: string) => ({ fr, en });

/** Pays de la liste de l'application (noms français), sans accents ni casse. */
const BY_COUNTRY: Record<string, CountryLanguages> = {
  france: { keys: ['A'] },
  belgique: { keys: ['A'] },
  suisse: { keys: ['A'] },
  luxembourg: { keys: ['A'] },
  monaco: { keys: ['A'] },
  'royaume-uni': { keys: ['B'] },
  irlande: { keys: ['B'] },
  'etats-unis': { keys: ['B'] },
  canada: { keys: ['A', 'B'] },
  espagne: { keys: ['H'] },
  portugal: { keys: ['G'] },
  allemagne: { keys: [], other: other('Allemand', 'German') },
  autriche: { keys: [], other: other('Allemand', 'German') },
  italie: { keys: [], other: other('Italien', 'Italian') },
  'pays-bas': { keys: [], other: other('Néerlandais', 'Dutch') },
  suede: { keys: [], other: other('Suédois', 'Swedish') },
  norvege: { keys: [], other: other('Norvégien', 'Norwegian') },
  danemark: { keys: [], other: other('Danois', 'Danish') },
  pologne: { keys: [], other: other('Polonais', 'Polish') },
  roumanie: { keys: [], other: other('Roumain', 'Romanian') },
  grece: { keys: [], other: other('Grec', 'Greek') },
  "cote d'ivoire": { keys: ['A'] },
  senegal: { keys: ['A', 'F'] },
  cameroun: { keys: ['A', 'B'] },
  maroc: { keys: ['A', 'C'] },
  algerie: { keys: ['A', 'C'] },
  tunisie: { keys: ['A', 'C'] },
  mali: { keys: ['A'], other: other('Bambara', 'Bambara') },
  guinee: { keys: ['A'] },
  togo: { keys: ['A'] },
  benin: { keys: ['A'] },
  'burkina faso': { keys: ['A'] },
  niger: { keys: ['A'] },
  'congo rdc': { keys: ['A', 'D'] },
  congo: { keys: ['A', 'D'] },
  gabon: { keys: ['A'] },
  madagascar: { keys: ['A'], other: other('Malgache', 'Malagasy') },
  rwanda: { keys: ['A', 'B', 'E'], other: other('Kinyarwanda', 'Kinyarwanda') },
  maurice: { keys: ['A', 'B'] },
  haiti: { keys: ['A'], other: other('Créole haïtien', 'Haitian Creole') },
  martinique: { keys: ['A'] },
  guadeloupe: { keys: ['A'] },
  'la reunion': { keys: ['A'] },
  guyane: { keys: ['A'] },
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’]/g, "'")
    .toLowerCase()
    .trim();

export interface LanguageSuggestion {
  keys: string[];
  /** Précision proposée pour « une autre langue » (I), dans la langue d'affichage. */
  other?: string;
}

/** Langues proposées pour un lieu « Ville, Pays » ; null si le pays est inconnu. */
export function suggestLanguages(
  city: string | null | undefined,
  lang: InterviewLanguage = 'fr',
): LanguageSuggestion | null {
  const parts = (city ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const found = BY_COUNTRY[norm(parts[parts.length - 1])];
  if (!found) return null;
  return found.other
    ? { keys: [...found.keys, 'I'], other: found.other[lang] }
    : { keys: [...found.keys] };
}

/** Toujours proposées : anglais, espagnol et « une autre langue » (à écrire). */
const ALWAYS_SHOWN = ['B', 'H', 'I'];

/** Noms des options non affichées, reportés dans « une autre langue ». */
const LANGUAGE_NAME: Record<InterviewLanguage, Record<string, string>> = {
  fr: {
    A: 'Français',
    C: 'Arabe',
    D: 'Lingala',
    E: 'Kiswahili',
    F: 'Wolof',
    G: 'Portugais',
  },
  en: {
    A: 'French',
    C: 'Arabic',
    D: 'Lingala',
    E: 'Kiswahili',
    F: 'Wolof',
    G: 'Portuguese',
  },
};

export interface LanguageChoices {
  /** Les quatre options proposées, dans l'ordre : langue du pays, anglais, espagnol, autre. */
  optionKeys: string[];
  /** Options cochées d'office. */
  suggested: string[];
  /** Langue(s) pré-écrite(s) dans « une autre langue » (« Wolof »). */
  other?: string;
}

/**
 * Les quatre propositions de M0_Q10 pour un lieu « Ville, Pays » : la langue
 * principale du pays (le français par défaut), l'anglais, l'espagnol et
 * « une autre langue ». Les autres langues du pays (wolof, lingala…) sont
 * pré-écrites dans « une autre langue ».
 */
export function languageChoices(
  city: string | null | undefined,
  lang: InterviewLanguage = 'fr',
): LanguageChoices {
  const s = suggestLanguages(city, lang);
  const primary = s?.keys.find((k) => !ALWAYS_SHOWN.includes(k)) ?? 'A';
  const optionKeys = [primary, ...ALWAYS_SHOWN];
  if (!s) return { optionKeys, suggested: [] };
  const others = [
    ...s.keys
      .filter((k) => !optionKeys.includes(k))
      .map((k) => LANGUAGE_NAME[lang][k]),
    ...(s.other ? [s.other] : []),
  ].filter(Boolean);
  const suggested = s.keys.filter((k) => optionKeys.includes(k) && k !== 'I');
  if (others.length) suggested.push('I');
  return {
    optionKeys,
    suggested,
    ...(others.length ? { other: others.join(', ') } : {}),
  };
}
