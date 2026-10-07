/**
 * Couche IA du Sondeur, commune au parcours payé et au laboratoire IA :
 * deux propositions par créneau rédigées jour par jour, contrôle de forme par
 * le code, puis relecture jour par jour par un modèle d'une autre famille.
 */
import { AiJourneyScope, AiService } from '../ai/ai.service';
import {
  DivergenceReport,
  THEMES,
  THEME_LIST,
  Theme,
} from '../matching/divergence.engine';
import { isWellFormedQuestion } from './clinical-lens';
import { HarmonyQuestionPayload } from './harmony-question.types';
import {
  DAY_ANGLES,
  describeReportForAi,
  safetyThemesOf,
} from './sondeur.generator';

export interface SondeurAiResult {
  /** Questions acceptées par le relecteur, la meilleure de chaque créneau d'abord. */
  questions: HarmonyQuestionPayload[];
  /** L'IA couvre au moins les deux tiers des créneaux qui lui sont ouverts. */
  preferAi: boolean;
  trace: {
    drafted: number;
    /** Écartées par le contrôle de forme du code (avant relecture). */
    formRejected: HarmonyQuestionPayload[];
    /** Refusées par le relecteur, avec la règle invoquée. */
    refused: Array<{
      question: HarmonyQuestionPayload;
      rule: number | null;
      reason?: string;
    }>;
    /** Jours dont la relecture a échoué (aucune question de l'IA servie). */
    unreviewedDays: number[];
    /** Thèmes réservés aux questions de limite (sécurité). */
    safetyThemes: Theme[];
  };
}

export async function draftReviewedSondeur(
  ai: AiService,
  input: {
    report: DivergenceReport;
    firstNames: [string, string];
    history: string[];
    /** Âge, genre et ville des deux membres. */
    couple: string;
    scope: AiJourneyScope;
  },
): Promise<SondeurAiResult> {
  const { report, firstNames, history, couple, scope } = input;
  const analysis = describeReportForAi(report, firstNames);
  // Thème qui porte un écart de sécurité : toujours une question de limite
  // écrite et vérifiée à l'avance, jamais une question de l'IA.
  const safetyThemes = safetyThemesOf(report);
  const drafted = await ai.generateTargetedHarmonyQuestions(
    analysis,
    THEME_LIST.map((key) => ({ key, label: THEMES[key].label })),
    [1, 2, 3].map((day) => ({
      day,
      label: DAY_ANGLES[day].label,
      intent: DAY_ANGLES[day].intent,
    })),
    history,
    scope,
    couple,
  );
  const all = drafted?.questions ?? [];
  const formRejected: HarmonyQuestionPayload[] = [];
  // Contrôle de forme par le code avant la relecture.
  const inGrid = all.filter((q) => {
    if (
      !THEME_LIST.includes(q.themeKey as Theme) ||
      safetyThemes.includes(q.themeKey as Theme)
    )
      return false;
    if (isWellFormedQuestion(q.text)) return true;
    formRejected.push(q);
    return false;
  });

  // Relecture jour par jour, par un modèle d'une autre famille que le
  // rédacteur de ce jour : seules les questions explicitement acceptées sont
  // gardées ; dans chaque créneau, la meilleure d'abord.
  const days = [1, 2, 3]
    .map((d) => `jour ${d} = ${DAY_ANGLES[d].label} (${DAY_ANGLES[d].intent})`)
    .join(' ; ');
  const refused: SondeurAiResult['trace']['refused'] = [];
  const unreviewedDays: number[] = [];
  const reviewed = await Promise.all(
    [1, 2, 3].map(async (day) => {
      const ofDay = inGrid.filter((q) => q.day === day);
      if (ofDay.length === 0) return [];
      const review = await ai.reviewSondeurQuestions(
        scope.journeyId,
        ofDay,
        history,
        ofDay[0].writer ?? drafted?.model,
        { analysis, couple, days },
        scope.lab,
      );
      // Jamais de question de l'IA servie sans relecture complète.
      if (!review) {
        unreviewedDays.push(day);
        return [];
      }
      for (const r of review.refusals)
        refused.push({ question: ofDay[r.n], rule: r.rule, reason: r.reason });
      return ofDay
        .map((q, i) => ({ q, i }))
        .filter(({ i }) => !review.rejected.has(i))
        .sort(
          (x, y) =>
            Number(review.preferred.has(y.i)) -
            Number(review.preferred.has(x.i)),
        )
        .map(({ q }) => ({ ...q, reviewer: review.model }));
    }),
  );
  const questions = reviewed.flat();
  const covered = new Set(questions.map((q) => `${q.day}|${q.themeKey}`)).size;
  const open = 3 * (THEME_LIST.length - safetyThemes.length);
  return {
    questions,
    preferAi: open > 0 && covered >= Math.ceil((2 * open) / 3),
    trace: {
      drafted: all.length,
      formRejected,
      refused,
      unreviewedDays: unreviewedDays.sort(),
      safetyThemes,
    },
  };
}
