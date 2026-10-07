import { QUESTIONS } from '../interview/questions.data';

let digest: string | null = null;

/**
 * Questions du Grand Entretien, une par ligne : le Sondeur ne les repose pas,
 * même reformulées. Donnée au rédacteur et au relecteur de l'IA.
 */
export function interviewDigest(): string {
  if (digest === null) {
    const lines = QUESTIONS.map(
      (q) => `- ${q.text.replace(/\s+/g, ' ').trim().slice(0, 110)}`,
    );
    digest = [...new Set(lines)].join('\n');
  }
  return digest;
}
