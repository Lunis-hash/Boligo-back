/**
 * Affinités par module du Grand Entretien et score global de compatibilité.
 *
 * Chaque module (0 à 10) reçoit un pourcentage calculé question par question
 * sur les réponses des deux membres :
 *  - question couverte par le moteur de divergences : gravité → similarité
 *    (critique 0, majeure 0,25, modérée 0,5, mineure 0,72 ; réponses
 *    différentes mais compatibles 0,85 ; identiques 1) ;
 *  - autre question comparable : identique 1, différente 0,65 ;
 *  - module 10 : ce que l'un recherche est comparé à ce que l'autre apporte.
 * Un module qui contient une divergence majeure ne peut pas dépasser 64 %,
 * une incompatibilité déclarée (critique) 35 %. Le score global est la moyenne
 * pondérée des modules, plafonnée à 60 % en cas d'incompatibilité déclarée :
 * le cercle reste cohérent avec les barres affichées dessous.
 */
import { QUESTIONS } from '../interview/questions.data';
import {
  DIVERGENCE_RULES,
  Divergence,
  DivergenceReport,
  RawAnswers,
  Severity,
} from '../matching/divergence.engine';
import { MODULES, ModuleInfo } from './portrait.phrases';
import { cleanText } from './portrait.text';

const SEVERITY_SIMILARITY: Record<Severity, number> = {
  critique: 0,
  majeure: 0.25,
  moderee: 0.5,
  mineure: 0.72,
};
const COMPATIBLE_DIFFERENT = 0.85;
const NEUTRAL_DIFFERENT = 0.65;
/** Plafond d'un module selon sa divergence la plus grave. */
const MODULE_CAP: Partial<Record<Severity, number>> = {
  critique: 35,
  majeure: 64,
};
/** Plafond du score global en cas d'incompatibilité déclarée. */
const HARD_STOP_CAP = 0.6;
/** En dessous, le score global retombe sur l'estimation de la carte mentale. */
export const MIN_COMPARED_FOR_SCORE = 8;

/** Faits personnels ou filtres déjà appliqués : jamais comparés. */
const NOT_COMPARED = new Set([
  'M0_Q01',
  'M0_Q02',
  'M0_Q07',
  'M1_Q01',
  'M1_Q04',
  'M2_Q04',
  'M2_Q10',
  'M3_Q02',
  'M3_Q03',
  'M3_Q08',
  'M10_Q01',
  'M10_Q03',
  'M10_Q09',
]);

/** Ce que l'un recherche (M10_Q03) face à ce que l'autre apporte (M10_Q09). */
const SEEK_MATCHES_BRING: Record<string, string[]> = {
  A: ['A'],
  B: ['B'],
  C: ['C'],
  D: ['C', 'B'],
};

const RULED = new Set(DIVERGENCE_RULES.map((r) => r.questionId));
const MODULE_OF = new Map(QUESTIONS.map((q) => [q.id, q.moduleNumber]));

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

export function affinityColor(value: number): string {
  if (value >= 75) return '#10B981';
  if (value >= 55) return '#F59E0B';
  return '#EF4444';
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

/** Similarités question par question, regroupées par module. */
function similaritiesByModule(
  a: RawAnswers,
  b: RawAnswers,
  report: DivergenceReport,
): Map<number, number[]> {
  const worstByQuestion = new Map<string, number>();
  for (const d of report.divergences) {
    const sim = SEVERITY_SIMILARITY[d.severity];
    const prev = worstByQuestion.get(d.questionId);
    worstByQuestion.set(
      d.questionId,
      prev === undefined ? sim : Math.min(prev, sim),
    );
  }

  const byModule = new Map<number, number[]>();
  const push = (module: number, value: number) => {
    const list = byModule.get(module) ?? [];
    list.push(value);
    byModule.set(module, list);
  };

  for (const q of QUESTIONS) {
    if (NOT_COMPARED.has(q.id)) continue;
    const ka = a[q.id];
    const kb = b[q.id];
    if (!ka || !kb) continue;
    const flagged = worstByQuestion.get(q.id);
    if (flagged !== undefined) push(q.moduleNumber, flagged);
    else if (ka === kb) push(q.moduleNumber, 1);
    else
      push(
        q.moduleNumber,
        RULED.has(q.id) ? COMPATIBLE_DIFFERENT : NEUTRAL_DIFFERENT,
      );
  }

  // Culture : la règle croisée porte sur M1_Q02 même si M1_Q02 n'est pas répondue des deux côtés.
  const culture = worstByQuestion.get('M1_Q02');
  if (culture !== undefined && !(a.M1_Q02 && b.M1_Q02)) push(1, culture);

  // Alchimie : ce que chacun recherche face à ce que l'autre apporte.
  for (const [seek, bring] of [
    [a.M10_Q03, b.M10_Q09],
    [b.M10_Q03, a.M10_Q09],
  ]) {
    if (seek && bring) {
      push(10, (SEEK_MATCHES_BRING[seek] ?? []).includes(bring) ? 1 : 0.5);
    }
  }

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
    const mean = Math.round(
      (sims.reduce((s, x) => s + x, 0) / sims.length) * 100,
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
  if (report.hardStop) raw = Math.min(raw, HARD_STOP_CAP);
  const score = Math.max(0.2, Math.min(0.98, Math.round(raw * 100) / 100));
  return { score, compared, modules };
}
