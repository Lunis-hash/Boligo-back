import { FREE_TEXT_SUFFIX, SENSITIVE_QUESTIONS } from './questions.data';

/**
 * Questions qui touchent des données sensibles (RGPD, article 9 : convictions
 * religieuses, vie sexuelle) ou des violences subies. Elles ne sont posées et
 * leurs réponses ne sont enregistrées qu'avec l'accord explicite du membre,
 * qu'il peut retirer à tout moment.
 */
export const SENSITIVE_QUESTION_IDS = new Set([
  // Table du questionnaire (V7, et questions V6 retirées dont les réponses
  // restent enregistrées) : sujet direct, ou option qui peut le révéler.
  ...Object.keys(SENSITIVE_QUESTIONS),
  'M3_Q08', // violences subies dans une relation passée (V6)
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
