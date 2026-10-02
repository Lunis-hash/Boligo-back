import { HarmonieProfile, Importance } from '@/types';

/**
 * Type générique pour les réponses agrégées de l'entretien.
 * On reste volontairement large pour pouvoir brancher les modules existants.
 */
export interface InterviewAnswers {
  module0?: Record<string, string>;
  module1?: Record<string, string>;
  module2?: Record<string, string>;
  module3?: Record<string, string>;
  module4?: Record<string, string>;
  module5?: Record<string, string>;
  module6?: Record<string, string>;
  module7?: Record<string, string>;
  module8?: Record<string, string>;
  module9?: Record<string, string>;
  module10?: Record<string, string>;
}

const toImportance = (value: Importance | undefined, fallback: Importance = 1): Importance =>
  value ?? fallback;

/**
 * Construit un HarmonieProfile à partir des réponses clés
 * issues des 11 modules de l'entretien.
 */
export function buildHarmonieProfile(answers: InterviewAnswers): HarmonieProfile {
  const m0 = answers.module0 ?? {};
  const m1 = answers.module1 ?? {};
  const m2 = answers.module2 ?? {};
  const m3 = answers.module3 ?? {};
  const m4 = answers.module4 ?? {};
  const m5 = answers.module5 ?? {};
  const m6 = answers.module6 ?? {};
  const m7 = answers.module7 ?? {};
  const m8 = answers.module8 ?? {};
  const m9 = answers.module9 ?? {};
  const m10 = answers.module10 ?? {};

  // --- Module 0 : Filtres non-négociables ---
  const genderPreference = m0.gender ?? m0.genderPreference ?? 'Les deux';

  let agePreference: HarmonieProfile['agePreference'] = 'no_filter';
  switch (m0.agePreference || m0.M0_Q01) {
    case 'A':
      agePreference = 'meme_gen';
      break;
    case 'B':
      agePreference = 'plus_jeune';
      break;
    case 'C':
      agePreference = 'plus_age';
      break;
    default:
      agePreference = 'no_filter';
  }

  let mobility: HarmonieProfile['mobility'] = 'peut_bouger';
  switch (m0.mobility || m0.M0_Q03) {
    case 'A':
      mobility = 'ok_total';
      break;
    case 'B':
    case 'C':
      mobility = 'peut_bouger';
      break;
    case 'D':
      mobility = 'pas_pret';
      break;
    default:
      mobility = 'peut_bouger';
  }

  // --- Module 1 : Identité & Culture ---
  const cultureContinent = m1.continent || m1.origins || m1.M1_Q01;
  const religion = m1.religion || m1.M1_Q05;

  let religionImportance: Importance = 1;
  if (m1.religionImportance === 'A' || m1.M1_Q06 === 'D') religionImportance = 0;
  if (m1.religionImportance === 'B' || m1.M1_Q06 === 'C') religionImportance = 1;
  if (m1.religionImportance === 'C' || m1.M1_Q06 === 'A') religionImportance = 2;

  let openToCulturalDiff: Importance = 1;
  if (m1.openToCulturalDiff === 'A' || m1.M1_Q02 === 'C') openToCulturalDiff = 2;
  if (m1.openToCulturalDiff === 'B' || m1.M1_Q02 === 'B') openToCulturalDiff = 1;
  if (m1.openToCulturalDiff === 'C' || m1.M1_Q02 === 'A') openToCulturalDiff = 0;

  // --- Module 2 : Attachement & Régulation émotionnelle ---
  const attachmentStyle = m2.M2_Q01 || m2.attachmentStyle;
  const emotionalSecurityNeed: Importance = m2.M2_Q03 === 'A' ? 2 : 1;

  // --- Module 3 : Vécu & Contexte ---
  const mainLesson = m3.mainLesson || m3.M3_Q01;

  let hasChildren = false;
  if (m3.hasChildren === 'Oui' || m3.children === 'Oui' || m0.M0_Q05 === 'B' || m0.M0_Q05 === 'C') {
    hasChildren = true;
  }

  let recomposedFamilyOK: Importance = 1;
  if (m3.blendedFamily === 'A' || m3.M3_Q04 === 'A') recomposedFamilyOK = 2;
  if (m3.blendedFamily === 'B' || m3.M3_Q04 === 'B') recomposedFamilyOK = 1;
  if (m3.blendedFamily === 'C' || m3.M3_Q04 === 'C') recomposedFamilyOK = 0;

  const violenceHistoryFlag =
    m3.violenceHistory === 'A' || m3.M3_Q08 === 'A';

  // --- Module 4 : Vision économique ---
  let moneyModel: HarmonieProfile['moneyModel'] = 'autre';
  if (m4.moneyManagement === 'A' || m4.M4_Q01 === 'A') moneyModel = 'commun';
  if (m4.moneyManagement === 'B' || m4.M4_Q01 === 'B') moneyModel = 'proportionnel';
  if (m4.moneyManagement === 'D' || m4.M4_Q01 === 'C') moneyModel = 'separe';

  let whoPaysBills: HarmonieProfile['whoPaysBills'] = 'autre';
  if (m4.whoPays === 'A' || m4.M4_Q03 === 'A') whoPaysBills = 'homme';
  if (m4.whoPays === 'B' || m4.M4_Q03 === 'C') whoPaysBills = 'egal';

  let savingStyle: HarmonieProfile['savingStyle'] = 'aucune';
  if (m4.saving === 'A' || m4.M4_Q08 === 'A') savingStyle = 'ensemble';
  if (m4.saving === 'B' || m4.M4_Q08 === 'B') savingStyle = 'separe';
  if (m4.saving === 'C' || m4.M4_Q08 === 'C') savingStyle = 'mixte';

  // --- Module 5 : Dynamique sociale & familiale ---
  let familyCentrality: Importance = 1;
  if (m5.family === 'A' || m5.M5_Q01 === 'A') familyCentrality = 2;
  if (m5.family === 'B' || m5.M5_Q01 === 'B') familyCentrality = 1;
  if (m5.family === 'C' || m5.M5_Q01 === 'D') familyCentrality = 0;

  let inLawsCohabitationOK: Importance = 1;
  if (m5.inLaws === 'B' || m5.M5_Q03 === 'B') inLawsCohabitationOK = 0;
  if (m5.inLaws === 'A' || m5.M5_Q03 === 'A' || m5.M5_Q03 === 'C') inLawsCohabitationOK = 2;

  let familyApprovalImportance: Importance = 1;
  if (m5.familyApproval === 'C' || m5.M5_Q01 === 'A') familyApprovalImportance = 2;

  // --- Module 6 : Quotidien, Communication réelle & Limites ---
  let alcoholTolerance: Importance = 1;
  if (m6.alcohol === 'A') alcoholTolerance = 2;
  let smokingTolerance: Importance = 1;
  let violenceTolerance: Importance = 0;

  // --- Module 7 : Trajectoire de vie & Personnalité ---
  let ambitionLevel: HarmonieProfile['ambitionLevel'] = 'modere';
  if (m7.M7_Q02 === 'A') ambitionLevel = 'eleve';
  if (m7.M7_Q02 === 'B') ambitionLevel = 'modere';
  if (m7.M7_Q02 === 'C') ambitionLevel = 'faible';
  if (m7.M7_Q02 === 'D') ambitionLevel = 'accompli';

  let socialEnergy: HarmonieProfile['socialEnergy'] = 'ambiverti';
  if (m7.M7_Q03 === 'A') socialEnergy = 'introverti';
  if (m7.M7_Q03 === 'B') socialEnergy = 'ambiverti';
  if (m7.M7_Q03 === 'C') socialEnergy = 'extraverti';

  // --- Module 8 : Projet de couple ---
  let commitmentGoal: HarmonieProfile['commitmentGoal'] = 'relation_serieuse';
  if (m8.goal === 'A' || m8.M8_Q01 === 'A') commitmentGoal = 'mariage';
  if (m8.goal === 'B' || m8.M8_Q01 === 'B') commitmentGoal = 'relation_serieuse';
  if (m8.goal === 'C' || m8.M8_Q01 === 'C' || m8.M8_Q01 === 'D') commitmentGoal = 'exploration';

  const loveLanguages = m8.loveLanguages
    ? m8.loveLanguages.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const breakingPoints: string[] = [];
  if (m8.breakingPointA === 'true' || m8.M8_Q05 === 'A') breakingPoints.push('infidelite');
  if (m8.breakingPointB === 'true' || m8.M8_Q05 === 'B') breakingPoints.push('violence');
  if (m8.breakingPointC === 'true' || m8.M8_Q05 === 'C') breakingPoints.push('enfants_religion');
  if (m8.breakingPointD === 'true' || m8.M8_Q05 === 'D') breakingPoints.push('valeurs');

  // --- Module 9 : Pouvoir, Effort & Capacité à aimer ---
  const decisionStyle = m9.M9_Q01;
  const effortPhilosophy = m9.M9_Q02;

  // --- Module 10 : Alchimie, Vibe & Désir ---
  const vibeEnergy = m10.M10_Q03;
  const uniqueContribution = m10.M10_Q09;

  return {
    genderPreference,
    agePreference,
    mobility,
    cultureContinent,
    religion,
    religionImportance: toImportance(religionImportance, 1),
    openToCulturalDiff: toImportance(openToCulturalDiff, 1),
    attachmentStyle,
    emotionalSecurityNeed: toImportance(emotionalSecurityNeed, 1),
    mainLesson,
    hasChildren,
    recomposedFamilyOK: toImportance(recomposedFamilyOK, 1),
    violenceHistoryFlag,
    moneyModel,
    whoPaysBills,
    savingStyle,
    familyCentrality: toImportance(familyCentrality, 1),
    inLawsCohabitationOK: toImportance(inLawsCohabitationOK, 1),
    familyApprovalImportance: toImportance(familyApprovalImportance, 1),
    alcoholTolerance: toImportance(alcoholTolerance, 1),
    smokingTolerance: toImportance(smokingTolerance, 1),
    violenceTolerance: toImportance(violenceTolerance, 0),
    ambitionLevel,
    socialEnergy,
    commitmentGoal,
    loveLanguages,
    breakingPoints,
    decisionStyle,
    effortPhilosophy,
    vibeEnergy,
    uniqueContribution,
  };
}

