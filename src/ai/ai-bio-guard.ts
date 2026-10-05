/**
 * Garde-fou de la bio rédigée par l'IA : elle est publiée comme citation sur
 * la fiche Découverte, elle ne doit donc contredire aucune réponse clé du
 * Grand Entretien (désir d'enfants, religion).
 */
import { RawAnswers } from '../matching/divergence.engine';

/** Mots entiers, lettres accentuées comprises (`\b` ignore « é », « è »…). */
const words = (src: string) =>
  new RegExp(`(?<!\\p{L})(?:${src})(?!\\p{L})`, 'iu');

const WANTS_KIDS = words(
  'fonder une famille|avoir des enfants|(?:devenir|être) (?:maman|papa|mère|père)|agrandir (?:la|ma|notre) famille',
);
const NO_KIDS = words(
  "pas d['’]enfants?|ne (?:veux|souhaite) (?:pas|plus) d['’]enfants?",
);
const FAITH_WORDS = words(
  'ma foi|dieu|allah|prières?|pratiquante?|église|mosquée|synagogue',
);
const RELIGION_WORDS: Record<string, RegExp> = {
  A: words('chrétien(?:ne)?|église|jésus'),
  B: words('musulman(?:e)?|mosquée|islam|allah'),
  C: words('juif|juive|synagogue|judaïsme'),
  D: words('bouddhiste|hindou(?:e|iste)?'),
};

/** Raison de la contradiction, ou null si la bio est cohérente avec les réponses. */
export function aiBioContradicts(
  bio: string,
  answers: RawAnswers,
): string | null {
  const wish = answers.M0_Q06;
  if (wish === 'D' && WANTS_KIDS.test(bio)) return "désir d'enfants inventé";
  if ((wish === 'A' || wish === 'B') && NO_KIDS.test(bio))
    return "refus d'enfants inventé";
  const religion = answers.M1_Q05;
  if (religion === 'E' && FAITH_WORDS.test(bio)) return 'foi inventée';
  for (const [key, re] of Object.entries(RELIGION_WORDS)) {
    if (religion && key !== religion && re.test(bio)) return 'religion erronée';
  }
  return null;
}
