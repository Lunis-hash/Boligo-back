/**
 * Psychométrie BOLIGO (questionnaire V7) — déterministe, sans IA.
 *
 * Calcule, à partir des réponses du Grand Entretien, des scores 0–100 sur des
 * dimensions issues de la recherche en psychologie du couple :
 *  - façon d'aimer : inquiétude pour le lien et inconfort avec la proximité
 *    (modèle bidimensionnel de l'attachement), six situations chacune ;
 *  - gestion des émotions : prendre du recul et retenir ses émotions (modèle
 *    de la réévaluation et de la suppression), trois situations chacune ;
 *  - comportements de dispute : les « quatre cavaliers » de Gottman, chacun
 *    avec son « antidote » inversé ;
 *  - personnalité : cinq grands traits, en situations concrètes ;
 *  - contrôle de sincérité (désirabilité sociale) et questions miroir.
 *
 * Toutes les affirmations V7 sont des formulations propres à BOLIGO, en
 * situations concrètes : aucune n'est reprise d'un questionnaire publié. Les
 * affirmations V6 (plus proches des questionnaires de recherche) ne sont plus
 * posées, mais restent lues pour les entretiens V6 (`*_V6`).
 *
 * Ce sont des repères de compatibilité, pas un diagnostic : aucune catégorie
 * clinique, aucune donnée de santé. Une réponse franche sur soi ne baisse
 * jamais le score : seules comptent les combinaisons à risque entre deux
 * membres. La sincérité module la confiance accordée aux échelles, jamais la
 * note.
 */
import { answerKeys, QUESTION_INDEX } from '../interview/questions.data';
import type {
  Divergence,
  RawAnswers,
  Severity,
  Theme,
} from '../matching/divergence.engine';
import { agree, Gender } from '../portrait/portrait.text';

/** Une affirmation d'échelle ; `reverse` : la note est inversée (6 − note). */
export interface Item {
  id: string;
  reverse?: boolean;
}

// ─── Échelles V7 (et leurs versions V6, lues pour les entretiens V6) ─────────

/** Inquiétude pour le lien (anxiété d'attachement) : 6 situations, 2 inversées. */
export const ATTACHMENT_ANXIETY: Item[] = [
  { id: 'M2_Q23' },
  { id: 'M2_Q25' },
  { id: 'M2_Q27', reverse: true },
  { id: 'M2_Q29' },
  { id: 'M2_Q31', reverse: true },
  { id: 'M2_Q33' },
];
/** Inconfort avec la proximité (évitement) : 6 situations, 2 inversées. */
export const ATTACHMENT_AVOIDANCE: Item[] = [
  { id: 'M2_Q24' },
  { id: 'M2_Q26', reverse: true },
  { id: 'M2_Q28' },
  { id: 'M2_Q30' },
  { id: 'M2_Q32', reverse: true },
  { id: 'M2_Q34' },
];
/** Prendre du recul (réévaluation) : 3 situations, dont ruminer (inversé). */
export const REAPPRAISAL: Item[] = [
  { id: 'M2_Q35' },
  { id: 'M2_Q37' },
  { id: 'M2_Q39', reverse: true },
];
/** Retenir ses émotions (suppression) : 3 situations, 1 inversée. */
export const SUPPRESSION: Item[] = [
  { id: 'M2_Q36' },
  { id: 'M2_Q38' },
  { id: 'M2_Q40', reverse: true },
];
/** Les quatre cavaliers : le comportement et son antidote (inversé). */
export const CRITICISM: Item[] = [
  { id: 'M6_Q12' },
  { id: 'M6_Q20', reverse: true },
];
export const CONTEMPT: Item[] = [
  { id: 'M6_Q13' },
  { id: 'M6_Q21', reverse: true },
];
export const DEFENSIVENESS: Item[] = [
  { id: 'M6_Q14' },
  { id: 'M6_Q22', reverse: true },
];
export const STONEWALLING: Item[] = [
  { id: 'M6_Q15' },
  { id: 'M6_Q23', reverse: true },
];
export const BIG_FIVE: Record<BigFiveTrait, Item[]> = {
  extraversion: [
    { id: 'M7_Q20' },
    { id: 'M7_Q34' },
    { id: 'M7_Q25', reverse: true },
  ],
  agreeableness: [
    { id: 'M7_Q21' },
    { id: 'M7_Q26' },
    { id: 'M7_Q30', reverse: true },
  ],
  conscientiousness: [
    { id: 'M7_Q22' },
    { id: 'M7_Q27' },
    { id: 'M7_Q31', reverse: true },
  ],
  emotionalStability: [
    { id: 'M7_Q23', reverse: true },
    { id: 'M7_Q28', reverse: true },
    { id: 'M7_Q32' },
    { id: 'M7_Q33' },
  ],
  openness: [
    { id: 'M7_Q24' },
    { id: 'M7_Q35' },
    { id: 'M7_Q29', reverse: true },
  ],
};

/** Échelles V6 : plus posées, lues seulement quand la version V7 manque. */
export const ATTACHMENT_ANXIETY_V6: Item[] = [
  { id: 'M2_Q11' },
  { id: 'M2_Q12' },
  { id: 'M2_Q13', reverse: true },
];
export const ATTACHMENT_AVOIDANCE_V6: Item[] = [
  { id: 'M2_Q14' },
  { id: 'M2_Q15' },
  { id: 'M2_Q16', reverse: true },
];
export const REAPPRAISAL_V6: Item[] = [{ id: 'M2_Q17' }];
export const SUPPRESSION_V6: Item[] = [{ id: 'M2_Q18' }];
export const BIG_FIVE_V6: Record<BigFiveTrait, Item[]> = {
  extraversion: [{ id: 'M7_Q09' }, { id: 'M7_Q10', reverse: true }],
  agreeableness: [{ id: 'M7_Q11' }, { id: 'M7_Q12', reverse: true }],
  conscientiousness: [{ id: 'M7_Q13' }, { id: 'M7_Q14', reverse: true }],
  emotionalStability: [{ id: 'M7_Q16' }, { id: 'M7_Q15', reverse: true }],
  openness: [{ id: 'M7_Q17' }, { id: 'M7_Q18', reverse: true }],
};

/**
 * Contrôle de sincérité : cinq affirmations, dont trois inversées (ne pas
 * admettre un petit travers universel signale un portrait idéalisé). Le
 * score mesure l'idéalisation (0–100).
 */
export const SINCERITY: Item[] = [
  { id: 'M9_Q08' },
  { id: 'M9_Q21' },
  { id: 'M9_Q20', reverse: true },
  { id: 'M9_Q22', reverse: true },
  { id: 'M9_Q23', reverse: true },
];
/** Affirmations de sincérité, V7 et V6 (M9_Q09, retirée). */
export const SOCIAL_DESIRABILITY = [...SINCERITY.map((i) => i.id), 'M9_Q09'];

/**
 * V6.1 — Timidité au début d'une relation (inhibition face à l'inconnu, Cheek
 * & Buss) et lenteur à se confier. V7 : l'affirmation inversée est une vraie
 * mesure de l'aisance (M2_Q41) ; M2_Q21 (« les gens se confient à moi »)
 * mesurait autre chose et n'est plus lue.
 */
export const SHYNESS: Item[] = [
  { id: 'M2_Q19' },
  { id: 'M2_Q20' },
  { id: 'M2_Q41', reverse: true },
];
/**
 * V6.1 — Caractère exigeant (« capricieux ») : faire sentir sa frustration,
 * attendre que l'autre devine ses envies (croyance « mindreading »,
 * Eidelson & Epstein), impatience face à une envie.
 */
export const DEMANDINGNESS: Item[] = [
  { id: 'M9_Q16' },
  { id: 'M9_Q17' },
  { id: 'M9_Q18' },
];

export type ScaleName =
  | 'anxiety'
  | 'avoidance'
  | 'reappraisal'
  | 'suppression'
  | 'criticism'
  | 'contempt'
  | 'defensiveness'
  | 'stonewalling'
  | BigFiveTrait
  | 'shyness'
  | 'demandingness'
  | 'sincerity';

export interface ScaleDef {
  label: string;
  /** Affirmations V7. */
  items: Item[];
  /** Affirmations V6, lues quand la version V7 n'a pas assez de réponses. */
  legacy?: Item[];
}

/** Registre des échelles (documents, tests, contrôle des réponses). */
export const SCALES: Record<ScaleName, ScaleDef> = {
  anxiety: {
    label: 'Inquiétude pour le lien',
    items: ATTACHMENT_ANXIETY,
    legacy: ATTACHMENT_ANXIETY_V6,
  },
  avoidance: {
    label: 'Inconfort avec la proximité',
    items: ATTACHMENT_AVOIDANCE,
    legacy: ATTACHMENT_AVOIDANCE_V6,
  },
  reappraisal: {
    label: 'Prendre du recul',
    items: REAPPRAISAL,
    legacy: REAPPRAISAL_V6,
  },
  suppression: {
    label: 'Retenir ses émotions',
    items: SUPPRESSION,
    legacy: SUPPRESSION_V6,
  },
  criticism: { label: 'Critique (Gottman)', items: CRITICISM },
  contempt: { label: 'Mépris (Gottman)', items: CONTEMPT },
  defensiveness: {
    label: 'Attitude défensive (Gottman)',
    items: DEFENSIVENESS,
  },
  stonewalling: { label: 'Repli (Gottman)', items: STONEWALLING },
  extraversion: {
    label: 'Énergie sociale',
    items: BIG_FIVE.extraversion,
    legacy: BIG_FIVE_V6.extraversion,
  },
  agreeableness: {
    label: 'Bienveillance',
    items: BIG_FIVE.agreeableness,
    legacy: BIG_FIVE_V6.agreeableness,
  },
  conscientiousness: {
    label: 'Sens de l’organisation',
    items: BIG_FIVE.conscientiousness,
    legacy: BIG_FIVE_V6.conscientiousness,
  },
  emotionalStability: {
    label: 'Sérénité',
    items: BIG_FIVE.emotionalStability,
    legacy: BIG_FIVE_V6.emotionalStability,
  },
  openness: {
    label: 'Ouverture d’esprit',
    items: BIG_FIVE.openness,
    legacy: BIG_FIVE_V6.openness,
  },
  shyness: { label: 'Timidité au début d’une relation', items: SHYNESS },
  demandingness: {
    label: 'Caractère exigeant (bouderie, attentes non dites, impatience)',
    items: DEMANDINGNESS,
  },
  sincerity: { label: 'Contrôle de sincérité', items: SINCERITY },
};

/**
 * Signaux d'alerte (M8_Q10) croisés avec l'habitude correspondante déclarée
 * par l'autre. Les signaux sans habitude déclarable (impolitesse, argent)
 * restent des sujets de Sondeur.
 */
export const RED_FLAG_HABITS: Record<
  string,
  { item: string; label: string; theme: Theme; habit: string }
> = {
  A: {
    item: 'M9_Q10',
    label: 'Déclarations d’amour très rapides',
    theme: 'intimite',
    habit: 'je dis très vite à l’autre qu’il ou elle est la personne de ma vie',
  },
  B: {
    item: 'M9_Q11',
    label: 'Jalousie et contrôle',
    theme: 'communication',
    habit:
      'quand je doute, je regarde le téléphone de l’autre ou je lui demande où il ou elle se trouve',
  },
  C: {
    item: 'M9_Q12',
    label: 'Disparaître sans explication',
    theme: 'communication',
    habit: 'je préfère disparaître plutôt que m’expliquer',
  },
  D: {
    item: 'M9_Q13',
    label: 'Intentions floues',
    theme: 'projet',
    habit: 'je préfère ne pas définir la relation trop tôt',
  },
  E: {
    item: 'M9_Q14',
    label: 'Parler de ses ex',
    theme: 'communication',
    habit: 'je parle surtout de ce que mes ex ont mal fait',
  },
  H: {
    item: 'M6_Q14',
    label: 'Reconnaître ses torts',
    theme: 'communication',
    habit: 'face à un reproche, je me justifie plutôt que d’écouter',
  },
  I: {
    item: 'M9_Q24',
    label: 'Respect d’un refus',
    theme: 'communication',
    habit: 'quand l’autre me dit non, j’insiste pour le faire changer d’avis',
  },
  J: {
    item: 'M9_Q15',
    label: 'Le téléphone pendant les moments à deux',
    theme: 'intimite',
    habit: 'je consulte mon téléphone pendant les moments à deux',
  },
};
/** Habitudes déclarées, lues uniquement face aux signaux d'alerte de l'autre. */
export const HABIT_ITEM_IDS = [
  'M9_Q10',
  'M9_Q11',
  'M9_Q12',
  'M9_Q13',
  'M9_Q14',
  'M9_Q15',
  'M9_Q24',
];

/** Toutes les affirmations notées sur 5 points (jamais comparées une à une entre membres). */
export const SCALE_ITEM_IDS: string[] = [
  ...new Set(
    Object.values(SCALES)
      .flatMap((s) => [...s.items, ...(s.legacy ?? [])])
      .map((i) => i.id)
      .concat(SOCIAL_DESIRABILITY, HABIT_ITEM_IDS, ['M2_Q21']),
  ),
];

export type BigFiveTrait =
  | 'extraversion'
  | 'agreeableness'
  | 'conscientiousness'
  | 'emotionalStability'
  | 'openness';

export type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'fearful';

export interface PsychProfile {
  attachment: {
    anxiety: number | null;
    avoidance: number | null;
    /** null dans la zone intermédiaire (40–60) : aucun style affiché. */
    style: AttachmentStyle | null;
    /** 'echelles' : affirmations (V7 ou V6) ; 'scenarios' : questions-scénarios V6 seules. */
    source: 'echelles' | 'scenarios' | null;
  };
  regulation: { reappraisal: number | null; suppression: number | null };
  conflict: {
    criticism: number | null;
    contempt: number | null;
    defensiveness: number | null;
    stonewalling: number | null;
    /** Moyenne des quatre comportements (au moins deux renseignés). */
    index: number | null;
  };
  bigFive: Record<BigFiveTrait, number | null>;
  /** Timidité au début d'une relation (V6.1). */
  shyness: number | null;
  /** Caractère exigeant : bouderie, attentes non dites, impatience (V6.1). */
  demandingness: number | null;
  /** Idéalisation mesurée par les affirmations de sincérité (0–100). */
  sincerity: number | null;
  /** Portrait idéalisé : refuse d'admettre les petits travers universels. */
  idealized: boolean;
  /** D'accord à la fois avec des affirmations opposées, ou toujours la même réponse. */
  acquiescent: boolean;
  /**
   * Confiance accordée aux échelles (1, ou 0,5 si le portrait est idéalisé ou
   * si les réponses se contredisent). Elle pondère leur poids dans les
   * affinités ; elle ne change jamais un score.
   */
  confidence: number;
  /** Nombre d'affirmations renseignées par échelle (fiabilité). */
  items: Partial<Record<ScaleName, number>>;
  /** Écarts entre ce que la personne déclare et ce qu'on lui a reproché. */
  mirrorGaps: Array<'anxiete' | 'evitement' | 'mepris' | 'repli'>;
}

const POINTS: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };

/** Note brute (1–5) d'une affirmation, avant inversion. */
function rawValue(answers: RawAnswers, id: string): number | null {
  const keys = answerKeys(answers[id]);
  const v = keys.length === 1 ? POINTS[keys[0]] : undefined;
  return v === undefined ? null : v;
}

function itemValue(answers: RawAnswers, item: Item): number | null {
  const v = rawValue(answers, item.id);
  if (v === null) return null;
  return item.reverse ? 6 - v : v;
}

/** Score 0–100 d'une échelle ; null si moins de la moitié des affirmations sont renseignées. */
export function scaleScore(answers: RawAnswers, items: Item[]): number | null {
  const values = items
    .map((i) => itemValue(answers, i))
    .filter((v): v is number => v !== null);
  if (values.length === 0 || values.length < Math.ceil(items.length / 2))
    return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.round(((mean - 1) / 4) * 100);
}

/** Score d'une échelle (V7, sinon V6) et nombre d'affirmations utilisées. */
export function scaleResult(
  answers: RawAnswers,
  def: ScaleDef,
): { score: number | null; n: number } {
  for (const items of [def.items, def.legacy]) {
    if (!items) continue;
    const score = scaleScore(answers, items);
    if (score !== null)
      return {
        score,
        n: items.filter((i) => itemValue(answers, i) !== null).length,
      };
  }
  return { score: null, n: 0 };
}

/**
 * Estimation de l'attachement depuis les questions-scénarios du Module 2 V6
 * (Q01 absence de réponse, Q02 demande de proximité, Q03 besoin fondamental),
 * pour les entretiens antérieurs aux échelles.
 */
const SCENARIO_ANXIETY: Record<string, Record<string, number>> = {
  M2_Q01: { A: 10, B: 40, C: 65, D: 90 },
  M2_Q02: { A: 65, B: 25, C: 30, D: 50 },
  M2_Q03: { A: 70, B: 25, C: 20, D: 55 },
};
const SCENARIO_AVOIDANCE: Record<string, Record<string, number>> = {
  M2_Q02: { A: 25, B: 20, C: 75, D: 85 },
  M2_Q03: { A: 20, B: 75, C: 20, D: 55 },
};

function scenarioScore(
  answers: RawAnswers,
  table: Record<string, Record<string, number>>,
): number | null {
  const values = Object.entries(table)
    .map(([qid, map]) => map[answers[qid]])
    .filter((v): v is number => typeof v === 'number');
  if (values.length < 2) return null;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

/** Les échelles priment ; les scénarios V6 les complètent (30 %) quand les deux existent. */
function blend(scale: number | null, scenario: number | null): number | null {
  if (scale !== null && scenario !== null)
    return Math.round(scale * 0.7 + scenario * 0.3);
  return scale ?? scenario;
}

/**
 * Zone intermédiaire : entre 40 et 60, une dimension n'a pas de pôle, et
 * aucun style n'est affiché (50 correspond à « ni d'accord ni pas d'accord »).
 */
export const STYLE_LOW = 40;
export const STYLE_HIGH = 60;

export function attachmentStyle(
  anxiety: number | null,
  avoidance: number | null,
): AttachmentStyle | null {
  if (anxiety === null || avoidance === null) return null;
  const pole = (v: number) =>
    v >= STYLE_HIGH ? 'haut' : v <= STYLE_LOW ? 'bas' : null;
  const anx = pole(anxiety);
  const avo = pole(avoidance);
  if (!anx || !avo) return null;
  if (anx === 'haut' && avo === 'haut') return 'fearful';
  if (anx === 'haut') return 'anxious';
  if (avo === 'haut') return 'avoidant';
  return 'secure';
}

function mean(values: Array<number | null>, min: number): number | null {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < min) return null;
  return Math.round(v.reduce((s, x) => s + x, 0) / v.length);
}

/**
 * Échelles V7 qui mêlent affirmations directes et inversées. V7.1 : les
 * quatre cavaliers n'y figurent plus : sur une échelle de fréquence, faire
 * « souvent » un reproche et « souvent » son antidote n'est pas une
 * contradiction (on fait les deux, selon les jours).
 */
const MIXED_SCALES: Item[][] = [
  ATTACHMENT_ANXIETY,
  ATTACHMENT_AVOIDANCE,
  REAPPRAISAL,
  SUPPRESSION,
  ...Object.values(BIG_FIVE),
  SHYNESS,
];

/**
 * Réponses par acquiescement : d'accord à la fois avec une affirmation et
 * avec son contraire sur trois échelles au moins, ou toujours la même
 * réponse sur toutes les affirmations (vingt au moins).
 */
function acquiescence(answers: RawAnswers): boolean {
  let contradictions = 0;
  for (const items of MIXED_SCALES) {
    const direct = items
      .filter((i) => !i.reverse)
      .map((i) => rawValue(answers, i.id));
    const reversed = items
      .filter((i) => i.reverse)
      .map((i) => rawValue(answers, i.id));
    const d = mean(direct, 1);
    const r = mean(reversed, 1);
    if (d !== null && r !== null && d >= 4 && r >= 4) contradictions++;
  }
  const all = MIXED_SCALES.flat()
    .map((i) => answers[i.id])
    .filter((v): v is string => !!v);
  const straightLine = all.length >= 20 && new Set(all).size === 1;
  return contradictions >= 3 || straightLine;
}

/** Reproche reçu (question miroir à choix multiple) ; « jamais » seul ne compte pas avec d'autres. */
function reproached(answers: RawAnswers, id: string, key: string): boolean {
  return answerKeys(answers[id]).includes(key);
}

export function buildPsychProfile(answers: RawAnswers): PsychProfile {
  const items: PsychProfile['items'] = {};
  const scale = (name: ScaleName) => {
    const r = scaleResult(answers, SCALES[name]);
    if (r.n) items[name] = r.n;
    return r.score;
  };
  const anxScale = scale('anxiety');
  const avoScale = scale('avoidance');
  const anxiety = blend(anxScale, scenarioScore(answers, SCENARIO_ANXIETY));
  const avoidance = blend(avoScale, scenarioScore(answers, SCENARIO_AVOIDANCE));
  const source =
    anxScale !== null && avoScale !== null
      ? 'echelles'
      : anxiety !== null && avoidance !== null
        ? 'scenarios'
        : null;

  const criticism = scale('criticism');
  const contempt = scale('contempt');
  const defensiveness = scale('defensiveness');
  const stonewalling = scale('stonewalling');

  const bigFive = Object.fromEntries(
    (Object.keys(BIG_FIVE) as BigFiveTrait[]).map((t) => [t, scale(t)]),
  ) as Record<BigFiveTrait, number | null>;

  // Sincérité : cinq affirmations V7 (trois au moins renseignées), sinon la
  // règle V6 (d'accord avec les deux affirmations M9_Q08 et M9_Q09).
  const sincerityItems = SINCERITY.filter(
    (i) => itemValue(answers, i) !== null,
  ).length;
  const sincerity = sincerityItems >= 3 ? scaleScore(answers, SINCERITY) : null;
  const agreesWith = (id: string) => ['D', 'E'].includes(answers[id]);
  const idealized =
    sincerity !== null
      ? sincerity >= 75
      : ['M9_Q08', 'M9_Q09'].every(agreesWith);
  const acquiescent = acquiescence(answers);

  // Questions miroir : ce qu'on a reproché à la personne face à ce qu'elle déclare.
  const mirrorGaps: PsychProfile['mirrorGaps'] = [];
  if (reproached(answers, 'M2_Q05', 'A') && anxScale !== null && anxScale < 35)
    mirrorGaps.push('anxiete');
  if (reproached(answers, 'M2_Q05', 'B') && avoScale !== null && avoScale < 35)
    mirrorGaps.push('evitement');
  if (reproached(answers, 'M6_Q02', 'C') && answers.M6_Q13 === 'A')
    mirrorGaps.push('mepris');
  if (reproached(answers, 'M6_Q02', 'B') && answers.M6_Q15 === 'A')
    mirrorGaps.push('repli');

  return {
    attachment: {
      anxiety,
      avoidance,
      style: attachmentStyle(anxiety, avoidance),
      source,
    },
    regulation: {
      reappraisal: scale('reappraisal'),
      suppression: scale('suppression'),
    },
    conflict: {
      criticism,
      contempt,
      defensiveness,
      stonewalling,
      index: mean([criticism, contempt, defensiveness, stonewalling], 2),
    },
    bigFive,
    shyness: scale('shyness'),
    demandingness: scale('demandingness'),
    sincerity,
    idealized,
    acquiescent,
    confidence: idealized || acquiescent ? 0.5 : 1,
    items,
    mirrorGaps,
  };
}

// ─── Lecture croisée de deux membres ──────────────────────────────────────────

/** Niveau lisible d'un score 0–100, pour citer une tendance dans une fiche. */
function level(score: number): string {
  if (score >= 75) return 'très marqué';
  if (score >= 60) return 'marqué';
  if (score >= 40) return 'modéré';
  return 'faible';
}

const HIGH = 75;
const MID = 50;

/** Tendance citée dans une fiche ; la clé porte le score (0–100). */
function trait(label: string, score: number) {
  return { key: String(score), text: `${label} : ${level(score)}` };
}

// Textes des questions (sans importer le moteur de divergences, qui importe ce module).
const questionText = (id: string) => QUESTION_INDEX.get(id)?.text ?? id;
const optionText = (id: string, key: string) =>
  QUESTION_INDEX.get(id)?.options.find((o) => o.key === key)?.text ?? key;

/**
 * Pôle « relance » du cycle de dispute : insister ou relancer quand l'autre
 * demande une pause (M6_Q17), corroboré par les reproches, le ton qui monte
 * ou l'inquiétude pour le lien. Sans scénario (entretien V6) : reproches
 * fréquents seulement. V7.1 : le point neutre (50) ne corrobore rien.
 */
function pursuit(p: PsychProfile, x: RawAnswers) {
  const scenario = x.M6_Q17 === 'C' || x.M6_Q17 === 'D';
  const crit = p.conflict.criticism ?? 0;
  const strong =
    (scenario &&
      (crit >= STYLE_HIGH ||
        x.M6_Q16 === 'C' ||
        (p.attachment.anxiety ?? 0) >= STYLE_HIGH)) ||
    (crit >= HIGH && (p.items.criticism ?? 0) >= 2);
  const weak = scenario || crit >= HIGH;
  const view = scenario
    ? { key: x.M6_Q17, text: optionText('M6_Q17', x.M6_Q17) }
    : trait('Reproches personnels en dispute', crit);
  return { strong, weak, view };
}

/**
 * Pôle « repli » : partir ou se taire sans rien expliquer quand on n'arrive
 * plus à écouter (M6_Q16 ; V6 : M6_Q01), corroboré par l'échelle de repli,
 * une réparation lente ou l'inconfort avec la proximité. V7.1 : le point
 * neutre (50) ne corrobore rien.
 */
function withdrawal(p: PsychProfile, x: RawAnswers) {
  const scenarioV7 = x.M6_Q16 === 'D';
  const scenarioV6 = x.M6_Q01 === 'C' || x.M6_Q01 === 'D';
  const wall = p.conflict.stonewalling ?? 0;
  const corroborated =
    wall >= STYLE_HIGH ||
    x.M2_Q07 === 'C' ||
    x.M2_Q07 === 'D' ||
    (p.attachment.avoidance ?? 0) >= STYLE_HIGH;
  const strong =
    ((scenarioV7 || scenarioV6) && corroborated) ||
    (wall >= HIGH && (p.items.stonewalling ?? 0) >= 2);
  const weak = scenarioV7 || wall >= HIGH;
  const view = scenarioV7
    ? { key: x.M6_Q16, text: optionText('M6_Q16', x.M6_Q16) }
    : scenarioV6 && wall < HIGH
      ? { key: x.M6_Q01, text: optionText('M6_Q01', x.M6_Q01) }
      : trait('Se fermer en dispute', wall);
  return { strong, weak, view };
}

/**
 * Divergences tirées des échelles et des lectures croisées, au même format
 * que le moteur de divergences. Une divergence majeure n'y repose jamais sur
 * une seule affirmation : il faut deux sources concordantes.
 */
export function psychometricDivergences(
  a: RawAnswers,
  b: RawAnswers,
  existing: Divergence[],
): Divergence[] {
  const pa = buildPsychProfile(a);
  const pb = buildPsychProfile(b);
  const out: Divergence[] = [];
  const flagged = (qid: string, min: Severity[]) =>
    existing.some((d) => d.questionId === qid && min.includes(d.severity));

  // 1. Piège « l'un a besoin d'être rassuré, l'autre a besoin d'espace »
  // (échelles des deux côtés ; sinon M2_Q03, en V6, le couvre déjà).
  if (
    pa.attachment.source === 'echelles' &&
    pb.attachment.source === 'echelles' &&
    !flagged('M2_Q03', ['critique', 'majeure', 'moderee'])
  ) {
    for (const [x, y, xIsA] of [
      [pa, pb, true],
      [pb, pa, false],
    ] as const) {
      const anx = x.attachment.anxiety ?? 0;
      const seeker = anx >= STYLE_HIGH;
      const distancer =
        (y.attachment.avoidance ?? 0) >= STYLE_HIGH &&
        (y.attachment.anxiety ?? 100) < STYLE_HIGH;
      if (!seeker || !distancer) continue;
      const need = trait('Besoin d’être rassuré(e)', anx);
      const space = trait('Besoin d’espace', y.attachment.avoidance ?? 0);
      out.push({
        questionId: 'M2_Q11',
        theme: 'communication',
        // Inquiet sans être lui-même distant : le piège est franc.
        severity:
          (x.attachment.avoidance ?? 100) <= STYLE_LOW ? 'majeure' : 'moderee',
        label: 'Proximité et besoin d’espace',
        question:
          'Attachement : besoin d’être rassuré(e) d’un côté, besoin d’espace de l’autre',
        a: xIsA ? need : space,
        b: xIsA ? space : need,
      });
      break;
    }
  }

  // 2. Le cycle « l'un relance, l'autre se ferme » (mesuré directement en V7,
  // déduit des reproches et du repli pour un entretien V6).
  for (const [x, y, px, py, xIsA] of [
    [a, b, pa, pb, true],
    [b, a, pb, pa, false],
  ] as const) {
    const chase = pursuit(px, x);
    const wall = withdrawal(py, y);
    if (!chase.weak || !wall.weak) continue;
    out.push({
      questionId: 'M6_Q15',
      theme: 'communication',
      severity: chase.strong && wall.strong ? 'majeure' : 'moderee',
      label: 'Relance et repli en dispute',
      question: 'Pendant une dispute : l’un relance, l’autre se ferme',
      a: xIsA ? chase.view : wall.view,
      b: xIsA ? wall.view : chase.view,
    });
    break;
  }

  // 3. Repli des deux côtés : personne ne relance le dialogue.
  const wa = withdrawal(pa, a);
  const wb = withdrawal(pb, b);
  if (
    wa.weak &&
    wb.weak &&
    !out.some((d) => d.questionId === 'M6_Q15') &&
    !flagged('M6_Q01', ['critique', 'majeure', 'moderee'])
  ) {
    const sharedWall = Math.min(
      pa.conflict.stonewalling ?? 0,
      pb.conflict.stonewalling ?? 0,
    );
    const both = a.M6_Q16 === 'D' && b.M6_Q16 === 'D';
    const view = both
      ? { key: 'D', text: optionText('M6_Q16', 'D') }
      : trait('Se fermer en dispute', sharedWall);
    out.push({
      questionId: 'M6_Q15',
      theme: 'communication',
      severity: wa.strong && wb.strong ? 'majeure' : 'moderee',
      label: 'Silence des deux côtés en dispute',
      question: 'Pendant une dispute, vous vous fermez tous les deux',
      shared: true,
      // Même tendance citée des deux côtés (la plus faible des deux, pour rester juste).
      a: view,
      b: view,
    });
  }

  // 4. Ironie ou mépris fréquents : sujet à explorer (jamais une baisse du score).
  const contemptA = pa.conflict.contempt;
  const contemptB = pb.conflict.contempt;
  if (
    contemptA !== null &&
    contemptB !== null &&
    (contemptA >= HIGH || contemptB >= HIGH)
  ) {
    out.push({
      questionId: 'M6_Q13',
      theme: 'communication',
      severity: 'moderee',
      label: 'Ironie ou moquerie en dispute',
      question: 'Pendant une dispute : ironie, moquerie, yeux au ciel',
      a: trait('Ironie ou moquerie en dispute', contemptA),
      b: trait('Ironie ou moquerie en dispute', contemptB),
    });
  }

  out.push(...redFlagDivergences(a, b));
  out.push(...demandingnessDivergences(pa, pb, a, b));
  out.push(...shynessDivergences(pa, pb, a, b));
  return out;
}

const OFTEN: Record<string, { word: string }> = {
  D: { word: 'souvent' },
  E: { word: 'très souvent' },
};

/**
 * Un aveu isolé ne suffit pas à une divergence majeure : l'habitude doit être
 * confirmée par une autre réponse du même membre.
 */
const HABIT_CORROBORATION: Record<
  string,
  (p: PsychProfile, x: RawAnswers) => boolean
> = {
  A: (p, x) => (p.attachment.anxiety ?? 0) >= STYLE_HIGH || x.M10_Q15 === 'A',
  B: (p, x) => (p.attachment.anxiety ?? 0) >= STYLE_HIGH || x.M5_Q08 === 'A',
  C: (p, x) => (p.attachment.avoidance ?? 0) >= STYLE_HIGH || x.M6_Q16 === 'D',
  D: (_p, x) => x.M8_Q01 === 'D',
  E: (p) => (p.conflict.defensiveness ?? 0) >= STYLE_HIGH,
  H: (p) =>
    (p.conflict.defensiveness ?? 0) >= HIGH &&
    (p.items.defensiveness ?? 0) >= 2,
  I: (p, x) =>
    (p.demandingness ?? 0) >= STYLE_HIGH ||
    x.M6_Q03 === 'C' ||
    x.M6_Q03 === 'D',
  J: () => false,
};

/**
 * Signal d'alerte de l'un (M8_Q10) face à la même habitude déclarée par
 * l'autre : « souvent » ou « très souvent » → à explorer ; « très souvent »
 * et confirmé par une autre réponse → majeure. Une habitude avouée n'est
 * jamais pénalisée seule : seulement face au signal d'alerte de l'autre.
 */
export function redFlagDivergences(a: RawAnswers, b: RawAnswers): Divergence[] {
  const out: Divergence[] = [];
  for (const [x, y, xIsA] of [
    [a, b, true],
    [b, a, false],
  ] as const) {
    const flags = answerKeys(x.M8_Q10);
    if (!flags.length) continue;
    const py = buildPsychProfile(y);
    for (const flag of flags) {
      const map = RED_FLAG_HABITS[flag];
      const freq = map ? y[map.item] : undefined;
      const often = freq ? OFTEN[freq] : undefined;
      if (!map || !often) continue;
      const severity: Severity =
        freq === 'E' && HABIT_CORROBORATION[flag]?.(py, y)
          ? 'majeure'
          : 'moderee';
      const alert = {
        key: flag,
        text: `Ce qui me ferait fuir : ${map.label.toLowerCase()}`,
      };
      // V7.1 : une affirmation d'accord (M9_Q13) se cite en accord, jamais
      // en fréquence.
      const agreement = QUESTION_INDEX.get(map.item)?.scale === 'accord';
      const habit = {
        key: freq!,
        text: agreement
          ? `${freq === 'E' ? 'Tout à fait' : 'Plutôt'} d’accord : ${map.habit}`
          : `Il m’arrive ${often.word} que ${map.habit}`,
      };
      out.push({
        questionId: 'M8_Q10',
        theme: map.theme,
        severity,
        label: `Signal d’alerte : ${map.label.toLowerCase()}`,
        question:
          'Un signal d’alerte de l’un correspond à une habitude de l’autre',
        a: xIsA ? alert : habit,
        b: xIsA ? habit : alert,
      });
    }
  }
  return out;
}

const DEMANDING = 70;

/** Caractère exigeant de l'un face à la patience de l'autre (M9_Q19). */
function demandingnessDivergences(
  pa: PsychProfile,
  pb: PsychProfile,
  a: RawAnswers,
  b: RawAnswers,
): Divergence[] {
  const out: Divergence[] = [];
  const da = pa.demandingness;
  const db = pb.demandingness;
  if (da !== null && db !== null && da >= DEMANDING && db >= DEMANDING) {
    const both = Math.min(da, db);
    out.push({
      questionId: 'M9_Q16',
      theme: 'communication',
      severity: 'moderee',
      label: 'Deux caractères exigeants',
      question:
        'Quand une envie n’est pas satisfaite, vous le faites sentir tous les deux',
      shared: true,
      a: trait('Caractère exigeant', both),
      b: trait('Caractère exigeant', both),
    });
    return out;
  }
  const TOLERANCE: Record<string, Severity> = {
    D: 'majeure',
    C: 'moderee',
    A: 'mineure',
  };
  for (const [x, yScore, xIsA] of [
    [a, db, true],
    [b, da, false],
  ] as const) {
    const severity = TOLERANCE[x.M9_Q19];
    if (yScore === null || yScore < DEMANDING || !severity) continue;
    const patience = { key: x.M9_Q19, text: optionText('M9_Q19', x.M9_Q19) };
    const demanding = trait(
      'Caractère exigeant (bouderie, attentes non dites, impatience)',
      yScore,
    );
    out.push({
      questionId: 'M9_Q19',
      theme: 'communication',
      severity,
      label: 'Caprices et patience',
      question: questionText('M9_Q19'),
      a: xIsA ? patience : demanding,
      b: xIsA ? demanding : patience,
    });
  }
  return out;
}

const SHY = 70;

/** Deux timidités (qui fera le premier pas ?), ou une timidité face à un grand besoin de parler. */
function shynessDivergences(
  pa: PsychProfile,
  pb: PsychProfile,
  a: RawAnswers,
  b: RawAnswers,
): Divergence[] {
  const sa = pa.shyness;
  const sb = pb.shyness;
  if (sa !== null && sb !== null && sa >= SHY && sb >= SHY) {
    const both = Math.min(sa, sb);
    return [
      {
        questionId: 'M2_Q19',
        theme: 'communication',
        severity: 'mineure',
        label: 'Deux timidités',
        question: 'Vous avez tous les deux besoin de temps pour vous livrer',
        shared: true,
        a: trait('Timidité au début', both),
        b: trait('Timidité au début', both),
      },
    ];
  }
  for (const [shy, other, xIsA] of [
    [sa, b, true],
    [sb, a, false],
  ] as const) {
    if (shy === null || shy < SHY || other.M8_Q06 !== 'A') continue;
    const slow = trait('Timidité au début', shy);
    const talk = { key: 'A', text: optionText('M8_Q06', 'A') };
    return [
      {
        questionId: 'M2_Q19',
        theme: 'communication',
        severity: 'mineure',
        label: 'Rythme de confidence',
        question:
          'Besoin de temps pour se livrer face à l’envie de tout se dire',
        a: xIsA ? slow : talk,
        b: xIsA ? talk : slow,
      },
    ];
  }
  return [];
}

/** Ramène un indice 0–1 sur l'échelle de similarité des modules (0,3–1). */
const toSimilarity = (x: number) =>
  Math.round((0.3 + 0.7 * Math.max(0, Math.min(1, x))) * 100) / 100;

/** Part d'un score au-delà du point neutre : 0 jusqu'à 50, 1 à partir de 90. */
const above = (v: number | null) =>
  v === null ? 0 : Math.max(0, Math.min(1, (v - MID) / 40));

/** Intensité de la relance (0–100) : reproches ou scénario (M6_Q17). */
function pursuitScore(p: PsychProfile, x: RawAnswers): number {
  const scenario = x.M6_Q17 === 'D' ? 100 : x.M6_Q17 === 'C' ? 80 : 0;
  return Math.max(p.conflict.criticism ?? 0, scenario);
}

/** Intensité du repli (0–100) : échelle ou scénario (M6_Q16 ; V6 : M6_Q01). */
function withdrawalScore(p: PsychProfile, x: RawAnswers): number {
  const scenario =
    x.M6_Q16 === 'D' || x.M6_Q01 === 'D' ? 100 : x.M6_Q01 === 'C' ? 80 : 0;
  return Math.max(p.conflict.stonewalling ?? 0, scenario);
}

/**
 * Points de comparaison issus des échelles, ajoutés aux affinités par module :
 * attachement et émotions (Module 2), dispute (Module 6), personnalité
 * (Module 7).
 *
 * Seules comptent les combinaisons à risque entre les deux membres (l'un
 * inquiet pour le lien face à l'autre qui prend ses distances, deux replis,
 * deux ironies…) : une réponse franche sur soi ne baisse jamais l'affinité
 * avec quelqu'un dont le profil ne s'y heurte pas. Le poids de chaque point
 * est pondéré par la confiance accordée aux échelles des deux membres
 * (portrait idéalisé ou réponses contradictoires : moitié moins).
 */
export function psychometricSimilarities(
  a: RawAnswers,
  b: RawAnswers,
): Array<{ module: number; value: number; weight: number }> {
  const pa = buildPsychProfile(a);
  const pb = buildPsychProfile(b);
  const confidence = Math.min(pa.confidence, pb.confidence);
  // Poids : une échelle de plusieurs affirmations vaut plus qu'une question
  // isolée (fiabilité) — attachement 3, dispute 2, le reste 1.
  const out: Array<{ module: number; value: number; weight: number }> = [];
  const push = (module: number, risk: number, weight: number) =>
    out.push({
      module,
      value: toSimilarity(1 - risk),
      weight: weight * confidence,
    });

  if (
    pa.attachment.source === 'echelles' &&
    pb.attachment.source === 'echelles'
  ) {
    const { anxiety: xa, avoidance: va } = pa.attachment;
    const { anxiety: xb, avoidance: vb } = pb.attachment;
    const trap = Math.max(
      Math.min(above(xa), above(vb)),
      Math.min(above(xb), above(va)),
    );
    const bothDistant = Math.min(above(va), above(vb)) * 0.7;
    const bothWorried = Math.min(above(xa), above(xb)) * 0.5;
    push(2, Math.max(trap, bothDistant, bothWorried), 3);
  }

  const { suppression: sa } = pa.regulation;
  const { suppression: sb } = pb.regulation;
  if (sa !== null && sb !== null) {
    // Deux personnes qui retiennent tout : personne n'exprime ce qui ne va pas.
    push(2, Math.min(above(sa), above(sb)), 1);
  }

  if (pa.conflict.index !== null && pb.conflict.index !== null) {
    const cycle = Math.max(
      Math.min(above(pursuitScore(pa, a)), above(withdrawalScore(pb, b))),
      Math.min(above(pursuitScore(pb, b)), above(withdrawalScore(pa, a))),
    );
    const bothWalls =
      Math.min(above(withdrawalScore(pa, a)), above(withdrawalScore(pb, b))) *
      0.8;
    const bothSharp =
      Math.min(above(pa.conflict.contempt), above(pb.conflict.contempt)) * 0.8;
    push(6, Math.max(cycle, bothWalls, bothSharp), 2);
  }

  // Personnalité : écarts d'énergie sociale, d'ouverture et d'organisation
  // (rythme de vie au quotidien). Bienveillance et sérénité, propres à
  // chacun, ne sont pas comparées.
  const gaps = (['extraversion', 'openness', 'conscientiousness'] as const)
    .map((t) =>
      pa.bigFive[t] !== null && pb.bigFive[t] !== null
        ? Math.abs(pa.bigFive[t] - pb.bigFive[t])
        : null,
    )
    .filter((g): g is number => g !== null);
  if (gaps.length >= 2) {
    const gap = gaps.reduce((s, g) => s + g, 0) / gaps.length / 100;
    out.push({
      module: 7,
      value: Math.round((0.4 + 0.6 * (1 - gap)) * 100) / 100,
      weight: confidence,
    });
  }

  return out;
}

// ─── Bilan personnel : « Votre profil relationnel » ───────────────────────────

export interface RelationalProfile {
  attachment: { style: AttachmentStyle; title: string; text: string } | null;
  regulation: { title: string; text: string } | null;
  conflict: { title: string; text: string } | null;
  /** Timidité ou ouverture au début d'une relation (V6.1). */
  openness: { title: string; text: string } | null;
  personality: Array<{ trait: BigFiveTrait; label: string; value: number }>;
  /** Points à observer (questions miroir, sincérité, peurs) : visibles du seul membre. */
  observations: string[];
  /** Mention affichée sous la carte. */
  disclaimer: string;
}

const ATTACHMENT_TEXT: Record<AttachmentStyle, [string, string]> = {
  secure: [
    'À l’aise dans le lien',
    'Vous êtes à l’aise avec la proximité comme avec l’autonomie : vous faites confiance sans vous perdre dans la relation.',
  ],
  anxious: [
    'En quête de réassurance',
    'Le lien compte énormément pour vous et vous avez besoin de signes réguliers. Un partenaire présent et prévisible vous apaise.',
  ],
  avoidant: [
    'Attaché{e} à votre indépendance',
    'Vous tenez à votre espace et vous vous livrez à votre rythme. Un partenaire patient, qui ne force pas la proximité, vous met en confiance.',
  ],
  fearful: [
    'Entre envie de proximité et prudence',
    'Vous souhaitez la proximité tout en vous en méfiant. Le temps et la constance de l’autre sont vos meilleurs alliés.',
  ],
};

const HORSEMEN: Array<[keyof PsychProfile['conflict'], string]> = [
  ['criticism', 'les reproches personnels'],
  ['contempt', 'l’ironie ou la moquerie'],
  ['defensiveness', 'la justification'],
  ['stonewalling', 'le repli'],
];

const TRAIT_LABEL: Record<BigFiveTrait, string> = {
  openness: 'Ouverture d’esprit',
  conscientiousness: 'Sens de l’organisation',
  extraversion: 'Énergie sociale',
  agreeableness: 'Bienveillance',
  emotionalStability: 'Sérénité',
};

const MIRROR_TEXT: Record<PsychProfile['mirrorGaps'][number], string> = {
  anxiete:
    'On vous a déjà reproché de trop vous inquiéter, alors que vous vous décrivez comme serein{e} : un point à observer pendant le Sondeur.',
  evitement:
    'On vous a déjà reproché de mettre de la distance, alors que vous vous dites à l’aise avec la proximité : un point à observer pendant le Sondeur.',
  mepris:
    'On vous a déjà reproché d’être sarcastique en dispute, alors que vous dites ne jamais l’être : un point à observer pendant le Sondeur.',
  repli:
    'On vous a déjà reproché de couper la communication, alors que vous dites ne jamais vous fermer : un point à observer pendant le Sondeur.',
};

/** Peurs déclarées (M2_Q04) : ce qui aide, dit avec bienveillance. */
const FEAR_TEXT: Record<string, string> = {
  A: 'Vous craignez d’être abandonné{e} : dire votre besoin d’être rassuré{e}, plutôt que de le mettre à l’épreuve, aide l’autre à y répondre.',
  B: 'Vous tenez à votre liberté : dire tôt de quel espace vous avez besoin évite que l’autre le prenne pour du désintérêt.',
  C: 'Vous craignez de ne pas être à la hauteur : le Sondeur vous laisse le temps de montrer qui vous êtes, sans examen.',
  E: 'Vous craignez de manquer d’attention : dire ce qui vous fait du bien, concrètement, vaut mieux que d’espérer que l’autre le devine.',
  F: 'Vous craignez de devoir vous effacer pour être aimé{e} : vos besoins comptent autant que ceux de l’autre, et les dire tôt protège le couple.',
};

export const RELATIONAL_DISCLAIMER =
  'Repères indicatifs, inspirés de questionnaires utilisés en recherche. Ce n’est pas un diagnostic, et ces éléments ne sont jamais montrés tels quels aux autres membres.';

/** « Votre profil relationnel » : lecture bienveillante des échelles, pour le membre seul. */
export function buildRelationalProfile(
  answers: RawAnswers,
  gender: Gender,
): RelationalProfile | null {
  const p = buildPsychProfile(answers);

  // Zone intermédiaire : aucun style affiché.
  const style = p.attachment.style;
  const attachment = style
    ? {
        style,
        title: agree(ATTACHMENT_TEXT[style][0], gender),
        text: agree(ATTACHMENT_TEXT[style][1], gender),
      }
    : null;

  const { reappraisal, suppression } = p.regulation;
  let regulation: RelationalProfile['regulation'] = null;
  if (reappraisal !== null && suppression !== null) {
    regulation =
      suppression >= 60
        ? {
            title: 'Vous gardez beaucoup pour vous',
            text: 'Vous retenez volontiers vos émotions. Les partager, même un peu, aide l’autre à vous comprendre.',
          }
        : reappraisal >= 60
          ? {
              title: 'Vous savez prendre du recul',
              text: 'Quand quelque chose vous contrarie, vous arrivez à regarder la situation autrement pour vous apaiser.',
            }
          : {
              title: 'Une gestion des émotions souple',
              text: 'Vous gérez vos émotions au cas par cas, selon les situations.',
            };
  }

  let conflict: RelationalProfile['conflict'] = null;
  if (p.conflict.index !== null) {
    const top = HORSEMEN.map(([k, label]) => [p.conflict[k], label] as const)
      .filter((x): x is readonly [number, string] => x[0] !== null)
      .sort((x, y) => y[0] - x[0])[0];
    conflict =
      p.conflict.index < 30
        ? {
            title: 'Des disputes constructives',
            text: 'En dispute, vous restez plutôt sur les faits et dans l’échange : c’est ce qui protège le plus un couple.',
          }
        : p.conflict.index < 55
          ? {
              title: 'Quelques réflexes à surveiller',
              text: `En dispute, ${top[1]} vous arrive parfois. Le repérer, c’est déjà pouvoir le désamorcer.`,
            }
          : {
              title: 'Des réflexes de dispute marqués',
              text: `En dispute, ${top[1]} revient souvent. C’est l’un des comportements que les couples ont le plus intérêt à désamorcer ; le Sondeur vous aidera à en parler.`,
            };
  }

  const personality = (Object.keys(TRAIT_LABEL) as BigFiveTrait[])
    .map((t) => ({ trait: t, label: TRAIT_LABEL[t], value: p.bigFive[t] }))
    .filter(
      (x): x is { trait: BigFiveTrait; label: string; value: number } =>
        x.value !== null,
    );

  // Timidité : le parcours BOLIGO (Sondeur écrit avant la vidéo) est déjà le
  // bon cadre ; on le dit au membre plutôt que d'en faire un défaut.
  let openness: RelationalProfile['openness'] = null;
  if (p.shyness !== null) {
    openness =
      p.shyness >= 60
        ? {
            title: 'Une timidité de départ',
            text: 'Vous avez besoin de temps pour vous montrer {tel|telle} que vous êtes. Le Sondeur, à l’écrit et à votre rythme, laisse vos réponses parler pour vous avant l’appel vidéo.',
          }
        : p.shyness <= 35
          ? {
              title: 'Ouvert{e} d’emblée',
              text: 'Vous vous livrez facilement et vous vous sentez vite à l’aise. Avec une personne plus réservée, laissez-lui le temps de venir vers vous.',
            }
          : {
              title: 'Une ouverture progressive',
              text: 'Vous vous livrez à mesure que la confiance s’installe : un rythme qui rassure la plupart des partenaires.',
            };
    openness = {
      title: agree(openness.title, gender),
      text: agree(openness.text, gender),
    };
  }

  const observations = p.mirrorGaps.map((g) => agree(MIRROR_TEXT[g], gender));
  for (const fear of answerKeys(answers.M2_Q04)) {
    if (FEAR_TEXT[fear]) observations.push(agree(FEAR_TEXT[fear], gender));
  }
  if ((p.demandingness ?? 0) >= 70) {
    observations.push(
      'Quand une envie n’est pas satisfaite, vous le faites sentir. La dire avec des mots, plutôt que d’attendre que l’autre devine, l’aide à y répondre.',
    );
  }
  if (['D', 'E'].includes(answers.M9_Q12)) {
    observations.push(
      'Vous préférez parfois disparaître plutôt que vous expliquer. Sur BOLIGO, la sortie polie vous permet de clore un parcours en une phrase, sans blesser.',
    );
  }
  if (['D', 'E'].includes(answers.M9_Q11)) {
    observations.push(
      'Quand vous doutez, vous vérifiez. Dire votre inquiétude à voix haute rassure souvent mieux, et préserve la confiance de l’autre.',
    );
  }
  if (answers.M10_Q18 === 'B' || answers.M10_Q18 === 'C') {
    observations.push(
      'Quand l’envie n’est pas la même des deux côtés, en parler tôt, sans vous forcer ni attendre, protège la complicité du couple.',
    );
  }
  if (
    (answers.M3_Q11 === 'A' || answers.M3_Q11 === 'B') &&
    answers.M3_Q03 === 'A'
  ) {
    observations.push(
      agree(
        'Votre dernière rupture est récente et encore douloureuse : prenez le temps qu’il vous faut, une belle rencontre se construit mieux quand on se sent prêt{|e}.',
        gender,
      ),
    );
  }
  if (p.idealized) {
    observations.push(
      agree(
        'Vous vous décrivez sans aucun des petits travers que tout le monde a (jalousie, mauvaise humeur, petits arrangements avec la vérité) : personne n’y échappe tout à fait. Rester nuancé{e} aide BOLIGO à vous présenter les bonnes personnes.',
        gender,
      ),
    );
  } else if (p.acquiescent) {
    observations.push(
      'Vous avez souvent approuvé des affirmations opposées : les repères ci-dessus sont donc à lire avec prudence.',
    );
  }

  if (
    !attachment &&
    !regulation &&
    !conflict &&
    !openness &&
    personality.length === 0 &&
    observations.length === 0
  )
    return null;
  return {
    attachment,
    regulation,
    conflict,
    openness,
    personality,
    observations,
    disclaimer: RELATIONAL_DISCLAIMER,
  };
}
