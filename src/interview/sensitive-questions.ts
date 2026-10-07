import { FREE_TEXT_SUFFIX } from './questions.data';

/**
 * Questions qui touchent des données sensibles (RGPD, article 9 : convictions
 * religieuses, vie sexuelle) ou des violences subies. Elles ne sont posées et
 * leurs réponses ne sont enregistrées qu'avec l'accord explicite du membre,
 * qu'il peut retirer à tout moment.
 */
export const SENSITIVE_QUESTION_IDS = new Set([
  'M1_Q05', // religion ou spiritualité
  'M1_Q06', // place de la religion pour le partenaire
  'M3_Q08', // violences subies dans une relation passée
  'M6_Q06', // rapport à la sexualité
  'M6_Q07', // fréquence d'intimité souhaitée
  'M6_Q08', // refus d'intimité
]);

/** Question sensible, ou précision écrite d'une question sensible. */
export function isSensitiveQuestion(id: string): boolean {
  const base = id.endsWith(FREE_TEXT_SUFFIX)
    ? id.slice(0, -FREE_TEXT_SUFFIX.length)
    : id;
  return SENSITIVE_QUESTION_IDS.has(base);
}

/** Réponses sans les questions sensibles. */
export function withoutSensitive<T>(
  answers: Record<string, T>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(answers).filter(([id]) => !isSensitiveQuestion(id)),
  );
}
