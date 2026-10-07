/**
 * Affinités par module du Grand Entretien et score global de compatibilité.
 *
 * Chaque module (0 à 10) reçoit un pourcentage calculé sur les points de
 * comparaison du moteur de divergences (une question, ou une règle croisée) :
 *  - gravité → similarité (critique 0, majeure 0,25, modérée 0,5, mineure
 *    0,72 ; réponses différentes mais compatibles 0,85 ; identiques 1) ;
 *  - une question sans règle n'est jamais comparée (V7) : deux réponses
 *    différentes sans fondement clinique ne font plus baisser l'affinité ;
 *  - module 10 : ce que l'un recherche est comparé à ce que l'autre apporte ;
 *  - échelles (attachement, émotions, dispute, personnalité) : seules les
 *    combinaisons à risque entre les deux membres comptent.
 * Un module qui contient une divergence majeure ne peut pas dépasser 64 %,
 * une incompatibilité déclarée (critique) 35 %. Le score global est la moyenne
 * pondérée des modules, plafonnée selon le nombre de divergences majeures
 * (une divergence majeure ne peut pas laisser « Très forte compatibilité »).
 * Une incompatibilité déclarée ramène le score sous 55 % (« Incompatibilité
 * déclarée ») tout en gardant l'ordre entre deux profils incompatibles.
 */
import { QUESTION_INDEX } from '../interview/questions.data';
import {
  Divergence,
  DivergenceReport,
  RawAnswers,
  SEVERITY_SIMILARITY,
  Severity,
} from '../matching/divergence.engine';
import { psychometricSimilarities } from '../psychometrics/psychometrics';
import { MODULES, ModuleInfo } from './portrait.phrases';
import { cleanText } from './portrait.text';

/** Plafond d'un module selon sa divergence la plus grave. */
const MODULE_CAP: Partial<Record<Severity, number>> = {
  critique: 35,
  majeure: 64,
};
/** Plafond du score global en cas d'incompatibilité déclarée (sous le seuil de 55 %). */
const HARD_STOP_CAP = 0.5;
/** Part de l'affinité conservée en cas d'incompatibilité déclarée (garde l'ordre). */
const HARD_STOP_FACTOR = 0.6;
/** Chaque incompatibilité déclarée supplémentaire retire encore 5 points. */
const HARD_STOP_EXTRA = 0.05;
/**
 * Plafond du score global selon le nombre de divergences majeures (0, 1, 2, 3,
 * 4 et plus) : une majeure exclut « Très forte », deux excluent « Belle »,
 * quatre font passer en « Divergences importantes ».
 */
const MAJOR_CAPS = [0.98, 0.79, 0.69, 0.59, 0.54];
/** En dessous, le score global retombe sur l'estimation de la carte mentale. */
export const MIN_COMPARED_FOR_SCORE = 8;

/**
 * Divergences croisées tirées des échelles (signaux d'alerte, caractère
 * exigeant, timidité) : elles ne sont pas des points de comparaison du moteur,
 * leur gravité compte donc directement dans le module.
 */
const CROSS_COUNTED = new Set([
  'M8_Q10',
  'M9_Q19',
  'M9_Q16',
  'M2_Q19',
  // V7.1 : respect des limites et de la liberté de l'autre (contrôle).
  'M9_Q24',
]);

/**
 * Ce que l'un recherche (M10_Q03) face à ce que l'autre apporte (M10_Q09).
 * V7 : C « chaleureux, attentionné, rassurant », D « calme, stable, fiable ».
 */
const SEEK_MATCHES_BRING: Record<string, string[]> = {
  A: ['A'],
  B: ['B'],
  C: ['B', 'C'],
  D: ['C'],
};

/** Module de chaque question, V7 et V6 (une divergence V6 reste rangée dans son module). */
const MODULE_OF = new Map(
  [...QUESTION_INDEX.values()].map((q) => [q.id, q.moduleNumber]),
);

export interface ModuleAffinity {
  id: string;
  module: number;
  label: string;
  emoji: string;
  /** 0–100, calculé sur les réponses des deux membres ; null si rien à comparer. */
  value: number | null;
  color: string;
  /** Lecture humaine : « Alignement fort sur la vision de l'engagement ». */
  verdict: string;
  /** Nombre de points de comparaison utilisés. */
  compared: number;
}

export interface AnswerCompatibility {
  /** 0,2–0,98, ou null si trop peu de réponses communes. */
  score: number | null;
  compared: number;
  modules: ModuleAffinity[];
}

/** Couleurs de la marque : framboise (fort), lavande (moyen), prune clair (faible). */
export function affinityColor(value: number): string {
  if (value >= 75) return '#C62A6E';
  if (value >= 55) return '#7C5CDB';
  return '#8A7B98';
}

function worstDivergenceFor(
  report: DivergenceReport,
  moduleNumber: number,
): Divergence | undefined {
  return report.divergences.find(
    (d) => MODULE_OF.get(d.questionId) === moduleNumber,
  );
}

export function moduleVerdict(
  info: ModuleInfo,
  value: number,
  worst: Divergence | undefined,
): string {
  return cleanText(rawVerdict(info, value, worst));
}

function rawVerdict(
  info: ModuleInfo,
  value: number,
  worst: Divergence | undefined,
): string {
  const point = worst ? worst.label.toLowerCase() : null;
  if (worst?.severity === 'critique')
    return `Incompatibilité déclarée : ${point}`;
  if (value >= 80) return `Alignement fort sur ${info.focus}`;
  if (value >= 65) {
    return point
      ? `Bonne base, avec une nuance : ${point}`
      : `Bonne entente sur ${info.focus}`;
  }
  if (value >= 45) {
    return point
      ? `À explorer ensemble : ${point}`
      : `Des approches différentes sur ${info.focus}`;
  }
  return point ? `Vigilance : ${point}` : `Vigilance sur ${info.focus}`;
}

/** Un point de comparaison et son poids (une échelle pèse plus qu'une question). */
interface Point {
  value: number;
  weight: number;
}

/** Similarités point par point, regroupées par module. */
function similaritiesByModule(
  a: RawAnswers,
  b: RawAnswers,
  report: DivergenceReport,
): Map<number, Point[]> {
  const byModule = new Map<number, Point[]>();
  const push = (module: number | undefined, value: number, weight = 1) => {
    if (module === undefined || weight <= 0) return;
    const list = byModule.get(module) ?? [];
    list.push({ value, weight });
    byModule.set(module, list);
  };

  // Questions et règles croisées comparées par le moteur.
  for (const c of report.comparisons ?? [])
    push(MODULE_OF.get(c.questionId), c.value);

  // Alchimie : ce que chacun recherche face à ce que l'autre apporte.
  for (const [seek, bring] of [
    [a.M10_Q03, b.M10_Q09],
    [b.M10_Q03, a.M10_Q09],
  ]) {
    if (seek && bring) {
      push(10, (SEEK_MATCHES_BRING[seek] ?? []).includes(bring) ? 1 : 0.5);
    }
  }

  // Alchimie (miroir) : l'énergie recherchée face à la façon dont les amis
  // de l'autre le ou la décrivent (M10_Q02 et M10_Q03 ont les mêmes clés).
  for (const [seek, seen] of [
    [a.M10_Q03, b.M10_Q02],
    [b.M10_Q03, a.M10_Q02],
  ]) {
    if (seek && seen) push(10, seek === seen ? 1 : 0.6);
  }

  // Attirance (V6.1) : l'allure qui a déjà fait chavirer l'un face à celle de
  // l'autre, et ce qui provoque son déclic face à ce qu'on remarque chez l'autre.
  for (const [crush, look, spark, noticed] of [
    [a.M10_Q11, b.M10_Q12, a.M10_Q13, b.M10_Q14],
    [b.M10_Q11, a.M10_Q12, b.M10_Q13, a.M10_Q14],
  ]) {
    if (crush && look && crush !== 'F' && look !== 'F')
      push(10, crush === look ? 1 : 0.6);
    if (spark && noticed) push(10, spark === noticed ? 1 : 0.6);
  }

  for (const d of report.divergences) {
    if (CROSS_COUNTED.has(d.questionId))
      push(MODULE_OF.get(d.questionId), SEVERITY_SIMILARITY[d.severity]);
  }

  // Échelles : combinaisons à risque entre les deux membres, pondérées par la
  // confiance accordée aux réponses (sincérité, acquiescement).
  for (const { module, value, weight } of psychometricSimilarities(a, b))
    push(module, value, weight);

  return byModule;
}

/** Affinités des 11 modules (valeur null quand rien n'est comparable). */
export function buildModuleAffinities(
  a: RawAnswers,
  b: RawAnswers,
  report: DivergenceReport,
): ModuleAffinity[] {
  const byModule = similaritiesByModule(a, b, report);
  const out: ModuleAffinity[] = [];
  for (const info of MODULES) {
    const sims = byModule.get(info.number);
    if (!sims || sims.length === 0) {
      // Rien de comparable (questions non posées à l'un des deux) : le module
      // reste affiché, sans pourcentage inventé.
      out.push({
        id: info.id,
        module: info.number,
        label: info.label,
        emoji: info.emoji,
        value: null,
        color: '#9CA3AF',
        verdict: 'Pas encore de réponses communes sur ce module',
        compared: 0,
      });
      continue;
    }
    const worst = worstDivergenceFor(report, info.number);
    const total = sims.reduce((s, x) => s + x.weight, 0);
    const mean = Math.round(
      (sims.reduce((s, x) => s + x.value * x.weight, 0) / total) * 100,
    );
    const cap = worst ? MODULE_CAP[worst.severity] : undefined;
    const value = cap !== undefined ? Math.min(mean, cap) : mean;
    out.push({
      id: info.id,
      module: info.number,
      label: info.label,
      emoji: info.emoji,
      value,
      color: affinityColor(value),
      verdict: moduleVerdict(info, value, worst),
      compared: sims.length,
    });
  }
  return out;
}

/**
 * Plafonne un score brut (0–1) selon les divergences : une incompatibilité
 * déclarée le ramène sous 55 % (en gardant l'ordre entre deux profils
 * incompatibles), des divergences majeures l'empêchent d'afficher une
 * compatibilité forte.
 */
export function capForDivergences(
  raw: number,
  report: DivergenceReport,
): number {
  const critical = report.divergences.filter(
    (d) => d.severity === 'critique',
  ).length;
  if (report.hardStop || critical > 0) {
    return (
      Math.min(HARD_STOP_CAP, raw * HARD_STOP_FACTOR) -
      HARD_STOP_EXTRA * Math.max(0, critical - 1)
    );
  }
  const major = report.divergences.filter(
    (d) => d.severity === 'majeure',
  ).length;
  return Math.min(raw, MAJOR_CAPS[Math.min(major, MAJOR_CAPS.length - 1)]);
}

/** Score global issu des réponses : moyenne pondérée des modules − incompatibilités. */
export function computeAnswerCompatibility(
  a: RawAnswers,
  b: RawAnswers,
  report: DivergenceReport,
): AnswerCompatibility {
  const modules = buildModuleAffinities(a, b, report);
  const compared = modules.reduce((s, m) => s + m.compared, 0);
  if (compared < MIN_COMPARED_FOR_SCORE) {
    return { score: null, compared, modules };
  }

  let weighted = 0;
  let weights = 0;
  for (const m of modules) {
    if (m.value === null) continue;
    const info = MODULES[m.module];
    // Un module jugé sur une seule réponse pèse moitié moins.
    const w = info.weight * (m.compared >= 2 ? 1 : 0.5);
    weighted += (m.value / 100) * w;
    weights += w;
  }
  let raw = weights > 0 ? weighted / weights : 0.5;
  raw = capForDivergences(raw, report);
  const score = Math.max(0.2, Math.min(0.98, Math.round(raw * 100) / 100));
  return { score, compared, modules };
}
