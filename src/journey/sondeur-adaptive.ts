/**
 * Sondeur adaptatif : le nombre de questions suit les écarts réels du couple.
 *
 * Le générateur propose une grille complète (3 jours × 7 thèmes) ; on ne garde
 * que les questions qui apportent une information : limites de sécurité,
 * écarts réels (les plus graves d'abord), accords à rendre concrets. Un thème
 * sans écart ne reçoit pas de question artificielle, sauf pour garder un
 * minimum par jour. Deux couples très proches reçoivent donc beaucoup moins
 * de questions qu'un couple qui porte six écarts majeurs.
 */
import { DivergenceReport, Severity } from '../matching/divergence.engine';
import { SondeurQuestion } from './sondeur.generator';

/** Questions gardées par jour, au moins (le parcours reste un parcours). */
export const MIN_PER_DAY = 3;
/** Poids à partir duquel une question porte une information réelle. */
export const KEEP_WEIGHT = 30;

const SEVERITY: Record<Severity, number> = {
  critique: 30,
  majeure: 20,
  moderee: 10,
  mineure: -5,
};

export function questionWeight(
  q: SondeurQuestion,
  report: DivergenceReport,
): number {
  // Limites de sécurité et de contrôle : toujours posées.
  if (q.subject === 'securite' || q.subject === 'controle') return 100;
  const gaps = report.divergences.filter(
    (d) => d.theme === q.themeKey && !d.neutral,
  );
  const gap = q.subject
    ? report.divergences.find((d) => d.questionId === q.subject)
    : undefined;
  const severity = (d?: { severity: Severity; nonNegotiable?: boolean }) =>
    d ? SEVERITY[d.severity] + (d.nonNegotiable ? 20 : 0) : 0;
  if (q.source === 'divergence') return 30 + severity(gap ?? gaps[0]);
  if (q.source === 'ia')
    return q.claim === 'divergence' || q.claim === 'ecart'
      ? 30 + Math.max(0, ...gaps.map((d) => severity(d)))
      : gaps.length
        ? 25
        : 15;
  // Accord réel : rendu concret (combien, quand, qui fait quoi).
  if (q.source === 'convergence') return 22;
  // Question générique du thème : seulement si le thème porte un écart.
  return gaps.length ? 26 + Math.max(0, ...gaps.map((d) => severity(d))) : 5;
}

/**
 * Sélection adaptative, ordre d'origine conservé. Les questions en dessous
 * du seuil ne sont gardées que pour atteindre le minimum du jour, les plus
 * informatives d'abord.
 */
export function adaptiveSelection(
  questions: SondeurQuestion[],
  report: DivergenceReport,
  minPerDay = MIN_PER_DAY,
): SondeurQuestion[] {
  const weighted = questions.map((q, i) => ({
    q,
    i,
    w: questionWeight(q, report),
  }));
  const keep = new Set(
    weighted.filter((x) => x.w >= KEEP_WEIGHT).map((x) => x.i),
  );
  for (const day of [...new Set(questions.map((q) => q.day))]) {
    const ofDay = weighted.filter((x) => x.q.day === day);
    let kept = ofDay.filter((x) => keep.has(x.i)).length;
    for (const x of [...ofDay].sort((a, b) => b.w - a.w)) {
      if (kept >= minPerDay) break;
      if (!keep.has(x.i)) {
        keep.add(x.i);
        kept += 1;
      }
    }
  }
  return weighted.filter((x) => keep.has(x.i)).map((x) => x.q);
}
