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
import {
  COMPROMISE,
  isWellFormedQuestion,
  similarQuestions,
} from './clinical-lens';
import { HarmonyQuestionPayload } from './harmony-question.types';
import {
  DAY_ANGLES,
  describeReportForAi,
  safetyThemesOf,
} from './sondeur.generator';
import { isNonNegotiable } from './sondeur.pool';
import { shouldEscalate } from '../ai/sondeur-router';
import {
  EvidenceItem,
  buildEvidence,
  describeEvidenceForAi,
  parseClaim,
  validate,
  validateEn,
} from './sondeur-evidence';

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
    /** Jours réécrits par le modèle d'escalade (relecture trop sévère). */
    escalatedDays: number[];
    /** Thèmes réservés aux questions de limite (sécurité). */
    safetyThemes: Theme[];
    /** V8.2 — écartées par le contrat de preuves, avec les contrôles en échec. */
    evidenceRejected: Array<{
      question: HarmonyQuestionPayload;
      reasons: string[];
    }>;
    /** Écartées comme doublon (quasi) identique d'une question du parcours. */
    duplicates: HarmonyQuestionPayload[];
  };
  /** V8.2 — index des preuves du couple (traçabilité des questions servies). */
  evidenceIndex: EvidenceItem[];
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
  // V8.2 — le code établit les faits ; l'IA cite ses preuves (identifiants
  // opaques, jamais une réponse de membre).
  const evidenceIndex = buildEvidence(report);
  const evidenceBlock = describeEvidenceForAi(evidenceIndex);
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
    evidenceBlock,
  );
  // Clé de thème renvoyée « Famille » ou « famille » : la même.
  const all = (drafted?.questions ?? []).map((q) => ({
    ...q,
    themeKey: String(q.themeKey ?? '')
      .trim()
      .toLowerCase(),
  }));
  const formRejected: HarmonyQuestionPayload[] = [];
  const evidenceRejected: SondeurAiResult['trace']['evidenceRejected'] = [];
  // Thèmes qui portent un point non négociable : aucun compromis.
  const strict = new Set(
    report.divergences.filter((d) => isNonNegotiable(d)).map((d) => d.theme),
  );
  // Contrôle de forme par le code avant la relecture.
  const gate = (q: HarmonyQuestionPayload) => {
    const v = gateSondeurQuestion(q, { evidenceIndex, safetyThemes, strict });
    if (v.stage === 'form') formRejected.push(q);
    if (v.stage === 'evidence')
      evidenceRejected.push({ question: q, reasons: v.reasons });
    return v.ok;
  };
  const normalize = (qs: HarmonyQuestionPayload[] | undefined) =>
    (qs ?? []).map((q) => ({
      ...q,
      themeKey: String(q.themeKey ?? '')
        .trim()
        .toLowerCase(),
    }));
  const inGrid = all.filter(gate);

  // Relecture jour par jour, par un modèle d'une autre famille que le
  // rédacteur de ce jour : seules les questions explicitement acceptées sont
  // gardées ; dans chaque créneau, la meilleure d'abord.
  const days = [1, 2, 3]
    .map((d) => `jour ${d} = ${DAY_ANGLES[d].label} (${DAY_ANGLES[d].intent})`)
    .join(' ; ');
  const refused: SondeurAiResult['trace']['refused'] = [];
  const unreviewedDays: number[] = [];
  const escalatedDays: number[] = [];
  const reviewDay = async (day: number, ofDay: HarmonyQuestionPayload[]) => {
    if (ofDay.length === 0) return [];
    const review = await ai.reviewSondeurQuestions(
      scope.journeyId,
      ofDay,
      history,
      ofDay[0].writer ?? drafted?.model,
      { analysis, couple, days, evidence: evidenceBlock },
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
          Number(review.preferred.has(y.i)) - Number(review.preferred.has(x.i)),
      )
      .map(({ q }) => ({ ...q, reviewer: review.model }));
  };
  const reviewed = await Promise.all(
    [1, 2, 3].map(async (day) => {
      const ofDay = inGrid.filter((q) => q.day === day);
      const kept = await reviewDay(day, ofDay);
      // Escalade : la relecture a rejeté trop de questions de ce jour (ou
      // aucune n'a été proposée) ; le modèle haut de gamme réécrit ce jour,
      // une seule fois, puis passe les mêmes contrôles et la même relecture.
      if (
        !unreviewedDays.includes(day) &&
        shouldEscalate({
          proposed: Math.max(ofDay.length, 1),
          accepted: kept.length,
        })
      ) {
        const redraft = await ai
          .generateTargetedHarmonyQuestions(
            analysis,
            THEME_LIST.map((key) => ({ key, label: THEMES[key].label })),
            [
              {
                day,
                label: DAY_ANGLES[day].label,
                intent: DAY_ANGLES[day].intent,
              },
            ],
            history,
            { ...scope, role: 'escalation' },
            couple,
            evidenceBlock,
          )
          .catch(() => null);
        const better = normalize(redraft?.questions).filter(
          (q) => q.day === day && gate(q),
        );
        if (better.length) {
          escalatedDays.push(day);
          const second = await reviewDay(day, better);
          if (second.length > kept.length) return second;
        }
      }
      return kept;
    }),
  );
  // Dans un même parcours, jamais deux questions identiques ou quasi
  // identiques (même seuil que la règle anti-répétition) : la première
  // gardée, déjà la préférée de son créneau, reste.
  const duplicates: HarmonyQuestionPayload[] = [];
  const questions: HarmonyQuestionPayload[] = [];
  const key = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const q of reviewed.flat()) {
    if (
      questions.some(
        (k) =>
          key(k.text) === key(q.text) ||
          similarQuestions(k.text, q.text) ||
          sameGapSameAngle(k, q),
      )
    )
      duplicates.push(q);
    else questions.push(q);
  }
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
      escalatedDays: escalatedDays.sort(),
      safetyThemes,
      evidenceRejected,
      duplicates,
    },
    evidenceIndex,
  };
}

/** Tournure d'attaque d'une question : « combien », « si… », « jusqu'où »… */
function angleOf(text: string): string {
  const t = text
    .toLowerCase()
    .replace(/jusqu['’]à combien/g, 'combien')
    .replace(/^[^,?]{0,40},\s*/, (lead) => (/^si\s/.test(lead) ? lead : ''));
  const m =
    /^si\s/.exec(t) ??
    /(?<!\p{L})(combien|jusqu['’]où|qu['’]est-ce|quel(?:le)?s?|comment)(?!\p{L})/u.exec(
      t,
    );
  return m ? (m[1] ?? m[0]).trim() : '';
}

/**
 * Pour un même couple, seuil plus strict : deux questions sur le même écart
 * (mêmes preuves) avec la même tournure (« combien… » et « jusqu'à
 * combien… ») sont des quasi-doublons, même si leurs mots diffèrent.
 */
export function sameGapSameAngle(
  a: Pick<HarmonyQuestionPayload, 'text' | 'evidence'>,
  b: Pick<HarmonyQuestionPayload, 'text' | 'evidence'>,
): boolean {
  const ea = [...(a.evidence ?? [])].sort().join(',');
  const eb = [...(b.evidence ?? [])].sort().join(',');
  if (!ea || ea !== eb) return false;
  const x = angleOf(a.text);
  return !!x && x === angleOf(b.text);
}

/**
 * Contrôle déterministe d'une proposition du rédacteur, avant la relecture
 * (exporté pour la mesure du banc d'essai sur corpus étiqueté) : thème hors
 * sécurité, aucun compromis sur un non-négociable, forme, contrat de preuves
 * (écarts réels seulement) et version anglaise.
 */
export function gateSondeurQuestion(
  q: HarmonyQuestionPayload,
  ctx: {
    evidenceIndex: EvidenceItem[];
    safetyThemes: Theme[];
    strict: Set<Theme>;
  },
): {
  ok: boolean;
  stage: 'theme' | 'form' | 'evidence' | null;
  reasons: string[];
} {
  const theme = q.themeKey as Theme;
  if (!THEME_LIST.includes(theme) || ctx.safetyThemes.includes(theme))
    return {
      ok: false,
      stage: 'theme',
      reasons: ['thème hors grille ou de sécurité'],
    };
  if (ctx.strict.has(theme) && COMPROMISE.test(q.text))
    return {
      ok: false,
      stage: 'form',
      reasons: ['compromis sur un non-négociable'],
    };
  if (!isWellFormedQuestion(q.text))
    return { ok: false, stage: 'form', reasons: ['P8 forme'] };
  // Contrat de preuves : preuves connues, du thème, de la bonne nature ;
  // aucun écart ou accord non établi, aucune émotion, intention, habitude
  // ou passé présupposés, aucune reprise d'une réponse.
  const claim = parseClaim(q.claim);
  if (!claim)
    return {
      ok: false,
      stage: 'evidence',
      reasons: ['P4 nature absente ou inconnue'],
    };
  const contract = {
    day: q.day,
    themeKey: theme,
    text: q.text,
    evidence: q.evidence ?? [],
    claim,
  };
  // Rédacteur du Sondeur : écarts réels seulement, sans détour.
  const verdict = validate(contract, ctx.evidenceIndex, {
    safetyThemes: ctx.safetyThemes,
    gapOnly: true,
  });
  // Sondeur bilingue : la version anglaise passe les mêmes contrôles.
  if (verdict.ok) {
    const en = validateEn(q.textEn, contract, ctx.evidenceIndex);
    if (!en.ok) return { ok: false, stage: 'evidence', reasons: en.reasons };
  }
  return verdict.ok
    ? { ok: true, stage: null, reasons: [] }
    : { ok: false, stage: 'evidence', reasons: verdict.reasons };
}
