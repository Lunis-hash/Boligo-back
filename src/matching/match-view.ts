/**
 * Fiche d'un profil vue par un autre membre (Découverte, match en cours,
 * likes reçus). Une seule fonction pour les trois écrans : le pourcentage du
 * cercle, les affinités par module et les textes viennent toujours du même
 * calcul, fondé sur les réponses du Grand Entretien.
 */
import { computeCompatibility, MentalMapLike } from './compatibility.scorer';
import {
  buildCompatibilitySheet,
  buildDiscussionTopics,
  buildDivergenceReport,
  RawAnswers,
} from './divergence.engine';
import {
  capForDivergences,
  computeAnswerCompatibility,
  ModuleAffinity,
} from '../portrait/module-affinity';
import { buildPortrait, valueChips } from '../portrait/portrait.writer';
import {
  sentence,
  shortCity,
  usableProfession,
} from '../portrait/portrait.text';
import { MODULES } from '../portrait/portrait.phrases';

export interface ViewerInput {
  answers: RawAnswers;
  mentalMap: MentalMapLike | null;
}

export interface CandidateInput {
  id: string;
  firstName: string;
  gender: string | null;
  birthDate: Date | string | null;
  city: string | null;
  profile: {
    profession?: string | null;
    displayedCity?: string | null;
    description?: string | null;
  } | null;
  mentalMap:
    | (MentalMapLike & { synthesis?: string | null; bio?: string | null })
    | null;
  answers: RawAnswers;
}

export function ageFrom(
  birthDate: Date | string | null | undefined,
): number | undefined {
  if (!birthDate) return undefined;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 18 && age < 120 ? age : undefined;
}

export function compatibilityLabel(percent: number, hardStop = false): string {
  if (hardStop) return 'Incompatibilité déclarée';
  if (percent >= 80) return 'Très forte compatibilité';
  if (percent >= 70) return 'Belle compatibilité';
  if (percent >= 55) return 'Compatibilité à explorer';
  return 'Divergences importantes';
}

/** Score global : réponses du Grand Entretien d'abord, carte mentale en repli. */
export function resolveScore(
  viewer: ViewerInput,
  candidate: { answers: RawAnswers; mentalMap: MentalMapLike | null },
) {
  const report = buildDivergenceReport(viewer.answers, candidate.answers);
  const answers = computeAnswerCompatibility(
    viewer.answers,
    candidate.answers,
    report,
  );
  const fallback = computeCompatibility(viewer.mentalMap, candidate.mentalMap);
  const score =
    answers.score ??
    Math.max(
      0.2,
      Math.min(
        0.98,
        capForDivergences(fallback.score - report.penalty, report),
      ),
    );
  return {
    score,
    percent: Math.round(score * 100),
    report,
    modules: answers.modules,
    compared: answers.compared,
    fromAnswers: answers.score !== null,
    fallbackSummary: fallback.summary,
  };
}

function toPillar(m: ModuleAffinity) {
  return {
    id: m.id,
    label: m.label,
    emoji: m.emoji,
    value: m.value,
    color: m.color,
    verdict: m.verdict,
  };
}

export function buildMatchView(viewer: ViewerInput, candidate: CandidateInput) {
  const resolved = resolveScore(viewer, candidate);
  const { report, percent } = resolved;
  const sheet = buildCompatibilitySheet(report, candidate.firstName);
  const discussionTopics = buildDiscussionTopics(report, candidate.firstName);

  const gender =
    candidate.gender === 'F' ? 'F' : candidate.gender === 'H' ? 'H' : null;
  const age = ageFrom(candidate.birthDate);
  const cityFull = candidate.profile?.displayedCity || candidate.city || null;
  const profession = usableProfession(candidate.profile?.profession) ?? '';
  const portrait = buildPortrait({
    firstName: candidate.firstName,
    gender,
    age,
    profession,
    city: cityFull,
    answers: candidate.answers,
    storedBio:
      candidate.profile?.description || candidate.mentalMap?.bio || null,
    storedSynthesis: candidate.mentalMap?.synthesis || null,
  });

  // Ce qui vous rassemble : convergences réelles, puis modules très alignés.
  const positivePoints: string[] = [
    resolved.fromAnswers
      ? `Votre compatibilité de **${percent} %** repose sur **${resolved.compared} réponses** du Grand Entretien comparées une à une.`
      : `Compatibilité estimée à **${percent} %** à partir de vos deux profils.`,
    ...sheet.rassemble.map((r) => `**${sentence(r).replace(/\.$/, '')}**.`),
  ];
  const scored = resolved.modules.filter(
    (m): m is ModuleAffinity & { value: number } => m.value !== null,
  );
  for (const m of [...scored].sort((x, y) => y.value - x.value)) {
    if (positivePoints.length >= 5 || m.value < 80) break;
    positivePoints.push(sentence(m.verdict));
  }

  // Point de vigilance : divergence la plus grave, sinon module le plus faible.
  const weakest = [...scored].sort((x, y) => x.value - y.value)[0];
  const warningPoint =
    sheet.vigilance ??
    (weakest && weakest.value < 65 ? sentence(weakest.verdict) : null);

  const viewerChips = new Set(valueChips(viewer.answers).map((c) => c.id));
  const interests = portrait.values.map((v) => ({
    label: v.label,
    common: viewerChips.has(v.id),
  }));

  // Ordre des modules du Grand Entretien (0 → 10).
  const mentalMap = resolved.modules
    .sort((x, y) => x.module - y.module)
    .map(toPillar);

  return {
    id: candidate.id,
    firstName: candidate.firstName,
    pronoun: portrait.pronoun,
    age,
    location: shortCity(cityFull) ?? '',
    profession,
    headline: portrait.headline,
    compatibility: percent,
    compatibilityLabel: compatibilityLabel(percent, report.hardStop),
    compatibilitySheet: {
      rassemble: sheet.rassemble,
      vigilance: sheet.vigilance,
      themes: sheet.themes,
      hardStop: sheet.hardStop,
    },
    discussionTopics,
    hardStop: report.hardStop,
    slogan: portrait.bio,
    aiAnalysis: portrait.analysis,
    positivePoints,
    warningPoint,
    details: portrait.details,
    interests,
    threeWords: portrait.threeWords,
    expectations: portrait.expectations,
    mentalMap,
    modulesTotal: MODULES.length,
    _score: resolved.score,
  };
}
