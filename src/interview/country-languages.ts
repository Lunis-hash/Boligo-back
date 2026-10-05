/**
 * Langues proposées d'office à M0_Q10 selon le pays de résidence choisi (ou
 * détecté par géolocalisation) à l'inscription. Ce n'est qu'une
 * pré-sélection : le membre coche ou décoche librement.
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
