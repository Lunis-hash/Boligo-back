/**
 * Psychométrie BOLIGO (questionnaire V6) — déterministe, sans IA.
 *
 * Calcule, à partir des réponses du Grand Entretien, des scores 0–100 sur des
 * dimensions issues de la recherche en psychologie du couple :
 *  - attachement : anxiété et évitement (modèle de l'ECR-R, Fraley et al.) ;
 *  - régulation émotionnelle : réévaluation et suppression (ERQ, Gross & John) ;
 *  - comportements de dispute : les « quatre cavaliers » de Gottman ;
 *  - personnalité : cinq grands traits (structure du BFI-10, Rammstedt & John) ;
 *  - contrôle de sincérité (désirabilité sociale) et questions miroir.
 *
 * Ce sont des repères de compatibilité, pas un diagnostic : aucune catégorie
 * clinique, aucune donnée de santé. Les membres dont l'entretien est antérieur
 * aux échelles (V5) gardent une estimation de l'attachement tirée des
 * questions-scénarios du Module 2.
 */
import { answerKeys, QUESTIONS } from '../interview/questions.data';
import type {
  Divergence,
  RawAnswers,
  Severity,
  Theme,
} from '../matching/divergence.engine';
import { agree, Gender } from '../portrait/portrait.text';

/** Une affirmation d'échelle ; `reverse` : la note est inversée (6 − note). */
interface Item {
  id: string;
  reverse?: boolean;
}

export const ATTACHMENT_ANXIETY: Item[] = [
  { id: 'M2_Q11' },
  { id: 'M2_Q12' },
  { id: 'M2_Q13', reverse: true },
];
export const ATTACHMENT_AVOIDANCE: Item[] = [
  { id: 'M2_Q14' },
  { id: 'M2_Q15' },
  { id: 'M2_Q16', reverse: true },
];
export const REAPPRAISAL: Item[] = [{ id: 'M2_Q17' }];
export const SUPPRESSION: Item[] = [{ id: 'M2_Q18' }];
export const CRITICISM: Item[] = [{ id: 'M6_Q12' }];
export const CONTEMPT: Item[] = [{ id: 'M6_Q13' }];
export const DEFENSIVENESS: Item[] = [{ id: 'M6_Q14' }];
export const STONEWALLING: Item[] = [{ id: 'M6_Q15' }];
export const BIG_FIVE: Record<BigFiveTrait, Item[]> = {
  extraversion: [{ id: 'M7_Q09' }, { id: 'M7_Q10', reverse: true }],
  agreeableness: [{ id: 'M7_Q11' }, { id: 'M7_Q12', reverse: true }],
  conscientiousness: [{ id: 'M7_Q13' }, { id: 'M7_Q14', reverse: true }],
  emotionalStability: [{ id: 'M7_Q16' }, { id: 'M7_Q15', reverse: true }],
  openness: [{ id: 'M7_Q17' }, { id: 'M7_Q18', reverse: true }],
};
export const SOCIAL_DESIRABILITY = ['M9_Q08', 'M9_Q09'];

/**
 * V6.1 — Timidité au début d'une relation (inhibition face à l'inconnu, Cheek
 * & Buss) et lenteur à se confier ; « les gens se confient à moi » (échelle
 * « Opener », Miller, Berg & Archer) compte à l'inverse.
 */
export const SHYNESS: Item[] = [
  { id: 'M2_Q19' },
  { id: 'M2_Q20' },
  { id: 'M2_Q21', reverse: true },
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

/**
 * Signaux d'alerte (M8_Q10) croisés avec l'habitude correspondante déclarée
 * par l'autre. Les signaux sans habitude déclarable (impolitesse, argent,
 * limite non respectée) restent des sujets de Sondeur.
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
  J: {
    item: 'M9_Q15',
    label: 'Le téléphone pendant les moments à deux',
    theme: 'intimite',
    habit: 'je consulte mon téléphone pendant les moments à deux',
  },
};
/** Habitudes déclarées (V6.1), lues uniquement face aux signaux d'alerte de l'autre. */
export const HABIT_ITEM_IDS = [
  'M9_Q10',
  'M9_Q11',
  'M9_Q12',
  'M9_Q13',
  'M9_Q14',
  'M9_Q15',
];

/** Toutes les affirmations notées sur 5 points (jamais comparées une à une entre membres). */
export const SCALE_ITEM_IDS: string[] = [
  ...ATTACHMENT_ANXIETY,
  ...ATTACHMENT_AVOIDANCE,
  ...REAPPRAISAL,
  ...SUPPRESSION,
  ...CRITICISM,
  ...CONTEMPT,
  ...DEFENSIVENESS,
  ...STONEWALLING,
  ...Object.values(BIG_FIVE).flat(),
  ...SHYNESS,
  ...DEMANDINGNESS,
]
  .map((i) => i.id)
  .concat(SOCIAL_DESIRABILITY, HABIT_ITEM_IDS);

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
    style: AttachmentStyle | null;
    /** 'echelles' : affirmations V6 ; 'scenarios' : questions-scénarios seules. */
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
  /** D'accord avec les deux affirmations de sincérité : portrait idéalisé. */
  idealized: boolean;
  /** Écarts entre ce que la personne déclare et ce qu'on lui a reproché. */
  mirrorGaps: Array<'anxiete' | 'evitement' | 'mepris' | 'repli'>;
}

const POINTS: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };

function itemValue(answers: RawAnswers, item: Item): number | null {
  const keys = answerKeys(answers[item.id]);
  const v = keys.length === 1 ? POINTS[keys[0]] : undefined;
  if (v === undefined) return null;
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

/**
 * Estimation de l'attachement depuis les questions-scénarios du Module 2
 * (Q01 absence de réponse, Q02 demande de proximité, Q03 besoin fondamental).
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

/** Les échelles priment ; les scénarios les complètent (30 %) quand les deux existent. */
function blend(scale: number | null, scenario: number | null): number | null {
  if (scale !== null && scenario !== null)
    return Math.round(scale * 0.7 + scenario * 0.3);
  return scale ?? scenario;
}

const STYLE_THRESHOLD = 50;

export function attachmentStyle(
  anxiety: number | null,
  avoidance: number | null,
): AttachmentStyle | null {
  if (anxiety === null || avoidance === null) return null;
  const anxious = anxiety >= STYLE_THRESHOLD;
  const avoidant = avoidance >= STYLE_THRESHOLD;
  if (anxious && avoidant) return 'fearful';
  if (anxious) return 'anxious';
  if (avoidant) return 'avoidant';
  return 'secure';
}

function mean(values: Array<number | null>, min: number): number | null {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < min) return null;
  return Math.round(v.reduce((s, x) => s + x, 0) / v.length);
}

export function buildPsychProfile(answers: RawAnswers): PsychProfile {
  const anxScale = scaleScore(answers, ATTACHMENT_ANXIETY);
  const avoScale = scaleScore(answers, ATTACHMENT_AVOIDANCE);
  const anxiety = blend(anxScale, scenarioScore(answers, SCENARIO_ANXIETY));
  const avoidance = blend(avoScale, scenarioScore(answers, SCENARIO_AVOIDANCE));
  const source =
    anxScale !== null && avoScale !== null
      ? 'echelles'
      : anxiety !== null && avoidance !== null
        ? 'scenarios'
        : null;

  const criticism = scaleScore(answers, CRITICISM);
  const contempt = scaleScore(answers, CONTEMPT);
  const defensiveness = scaleScore(answers, DEFENSIVENESS);
  const stonewalling = scaleScore(answers, STONEWALLING);

  const bigFive = Object.fromEntries(
    (Object.keys(BIG_FIVE) as BigFiveTrait[]).map((t) => [
      t,
      scaleScore(answers, BIG_FIVE[t]),
    ]),
  ) as Record<BigFiveTrait, number | null>;

  const agreesWith = (id: string) => ['D', 'E'].includes(answers[id]);
  const idealized = SOCIAL_DESIRABILITY.every(agreesWith);

  // Questions miroir : ce qu'on a reproché à la personne face à ce qu'elle déclare.
  const mirrorGaps: PsychProfile['mirrorGaps'] = [];
  if (answers.M2_Q05 === 'A' && anxScale !== null && anxScale < 35)
    mirrorGaps.push('anxiete');
  if (answers.M2_Q05 === 'B' && avoScale !== null && avoScale < 35)
    mirrorGaps.push('evitement');
  if (answers.M6_Q02 === 'C' && contempt === 0) mirrorGaps.push('mepris');
  if (answers.M6_Q02 === 'B' && stonewalling === 0) mirrorGaps.push('repli');

  return {
    attachment: {
      anxiety,
      avoidance,
      style: attachmentStyle(anxiety, avoidance),
      source,
    },
    regulation: {
      reappraisal: scaleScore(answers, REAPPRAISAL),
      suppression: scaleScore(answers, SUPPRESSION),
    },
    conflict: {
      criticism,
      contempt,
      defensiveness,
      stonewalling,
      index: mean([criticism, contempt, defensiveness, stonewalling], 2),
    },
    bigFive,
    shyness: scaleScore(answers, SHYNESS),
    demandingness: scaleScore(answers, DEMANDINGNESS),
    idealized,
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
const ATTACHMENT_TRAP = 60;

/** Tendance citée dans une fiche ; la clé porte le score (0–100). */
function trait(label: string, score: number) {
  return { key: String(score), text: `${label} : ${level(score)}` };
}

/**
 * Divergences tirées des échelles, au même format que le moteur de
 * divergences. Sans double comptage : rien n'est ajouté quand une règle
 * question par question signale déjà le même risque.
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

  // 1. Piège anxieux–évitant : l'un a besoin d'être rassuré quand l'autre a
  // besoin d'espace (échelles V6 des deux côtés, sinon M2_Q03 le couvre déjà).
  if (
    pa.attachment.source === 'echelles' &&
    pb.attachment.source === 'echelles' &&
    !flagged('M2_Q03', ['critique', 'majeure'])
  ) {
    for (const [x, y, xIsA] of [
      [pa, pb, true],
      [pb, pa, false],
    ] as const) {
      const seeker =
        (x.attachment.style === 'anxious' ||
          x.attachment.style === 'fearful') &&
        (x.attachment.anxiety ?? 0) >= ATTACHMENT_TRAP;
      const distancer =
        y.attachment.style === 'avoidant' &&
        (y.attachment.avoidance ?? 0) >= ATTACHMENT_TRAP;
      if (!seeker || !distancer) continue;
      const need = trait('Besoin d’être rassuré(e)', x.attachment.anxiety ?? 0);
      const space = trait('Besoin d’espace', y.attachment.avoidance ?? 0);
      out.push({
        questionId: 'M2_Q11',
        theme: 'communication',
        severity: x.attachment.style === 'anxious' ? 'majeure' : 'moderee',
        label: 'Proximité et besoin d’espace',
        question:
          'Attachement : besoin d’être rassuré(e) d’un côté, besoin d’espace de l’autre',
        a: xIsA ? need : space,
        b: xIsA ? space : need,
      });
      break;
    }
  }

  // 2. Reproches d'un côté, repli de l'autre (schéma « poursuite–retrait »).
  for (const [x, y, xIsA] of [
    [pa, pb, true],
    [pb, pa, false],
  ] as const) {
    if (
      (x.conflict.criticism ?? 0) >= HIGH &&
      (y.conflict.stonewalling ?? 0) >= HIGH
    ) {
      const blame = trait(
        'Reproches personnels en dispute',
        x.conflict.criticism ?? 0,
      );
      const wall = trait('Se fermer en dispute', y.conflict.stonewalling ?? 0);
      out.push({
        questionId: 'M6_Q15',
        theme: 'communication',
        severity: 'majeure',
        label: 'Reproches et repli en dispute',
        question: 'Pendant une dispute : reproches d’un côté, repli de l’autre',
        a: xIsA ? blame : wall,
        b: xIsA ? wall : blame,
      });
      break;
    }
  }

  // 3. Repli des deux côtés : personne ne relance le dialogue.
  const sharedWall = Math.min(
    pa.conflict.stonewalling ?? 0,
    pb.conflict.stonewalling ?? 0,
  );
  if (
    (pa.conflict.stonewalling ?? 0) >= HIGH &&
    (pb.conflict.stonewalling ?? 0) >= HIGH &&
    !out.some((d) => d.questionId === 'M6_Q15') &&
    !flagged('M6_Q01', ['critique', 'majeure', 'moderee'])
  ) {
    out.push({
      questionId: 'M6_Q15',
      theme: 'communication',
      severity: 'moderee',
      label: 'Silence des deux côtés en dispute',
      question: 'Pendant une dispute, vous vous fermez tous les deux',
      shared: true,
      // Même tendance citée des deux côtés (la plus faible des deux, pour rester juste).
      a: trait('Se fermer en dispute', sharedWall),
      b: trait('Se fermer en dispute', sharedWall),
    });
  }

  // 4. Ironie ou mépris fréquents (le comportement le plus usant pour un couple).
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

// Textes des questions (sans importer le moteur de divergences, qui importe ce module).
const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
const questionText = (id: string) => QUESTION_BY_ID.get(id)?.text ?? id;
const optionText = (id: string, key: string) =>
  QUESTION_BY_ID.get(id)?.options.find((o) => o.key === key)?.text ?? key;

const OFTEN: Record<string, { word: string; severity: Severity }> = {
  D: { word: 'souvent', severity: 'moderee' },
  E: { word: 'très souvent', severity: 'majeure' },
};

/**
 * Signal d'alerte de l'un (M8_Q10) face à la même habitude déclarée par
 * l'autre, souvent (modérée) ou très souvent (majeure). Une habitude avouée
 * n'est jamais pénalisée seule : seulement face au signal d'alerte de l'autre.
 */
export function redFlagDivergences(a: RawAnswers, b: RawAnswers): Divergence[] {
  const out: Divergence[] = [];
  for (const [x, y, xIsA] of [
    [a, b, true],
    [b, a, false],
  ] as const) {
    for (const flag of answerKeys(x.M8_Q10)) {
      const map = RED_FLAG_HABITS[flag];
      const level = map ? OFTEN[y[map.item]] : undefined;
      if (!map || !level) continue;
      const alert = {
        key: flag,
        text: `Ce qui me ferait fuir : ${map.label.toLowerCase()}`,
      };
      const habit = {
        key: y[map.item],
        text: `Il m’arrive ${level.word} que ${map.habit}`,
      };
      out.push({
        questionId: 'M8_Q10',
        theme: map.theme,
        severity: level.severity,
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

/**
 * Points de comparaison issus des échelles, ajoutés aux affinités par module :
 * sécurité d'attachement et régulation (Module 2), dispute (Module 6),
 * personnalité (Module 7). La recherche relie la satisfaction du couple à la
 * sécurité, à la stabilité émotionnelle et à la bienveillance des deux
 * partenaires plus qu'à leur ressemblance.
 */
export function psychometricSimilarities(
  a: RawAnswers,
  b: RawAnswers,
): Array<{ module: number; value: number; weight: number }> {
  const pa = buildPsychProfile(a);
  const pb = buildPsychProfile(b);
  // Poids : une échelle de plusieurs affirmations vaut plus qu'une question
  // isolée (fiabilité) — attachement 3, dispute et bienveillance 2, le reste 1.
  const out: Array<{ module: number; value: number; weight: number }> = [];

  const att = [
    pa.attachment.anxiety,
    pa.attachment.avoidance,
    pb.attachment.anxiety,
    pb.attachment.avoidance,
  ];
  if (
    pa.attachment.source === 'echelles' &&
    pb.attachment.source === 'echelles' &&
    att.every((v) => v !== null)
  ) {
    const insecurity = att.reduce((s, v) => s + v, 0) / 400;
    out.push({ module: 2, value: toSimilarity(1 - insecurity), weight: 3 });
  }

  const reg = [
    pa.regulation.reappraisal,
    pb.regulation.reappraisal,
    pa.regulation.suppression,
    pb.regulation.suppression,
  ];
  if (reg.every((v) => v !== null)) {
    const [ra, rb, sa, sb] = reg;
    out.push({
      module: 2,
      value: toSimilarity((ra + rb + (100 - sa) + (100 - sb)) / 400),
      weight: 1,
    });
  }

  if (pa.conflict.index !== null && pb.conflict.index !== null) {
    out.push({
      module: 6,
      value: toSimilarity(1 - (pa.conflict.index + pb.conflict.index) / 200),
      weight: 2,
    });
  }

  const fa = pa.bigFive;
  const fb = pb.bigFive;
  const warmth = [
    fa.emotionalStability,
    fb.emotionalStability,
    fa.agreeableness,
    fb.agreeableness,
    fa.conscientiousness,
    fb.conscientiousness,
  ];
  if (warmth.every((v) => v !== null)) {
    const avg = warmth.reduce((s, v) => s + v, 0) / 600;
    out.push({ module: 7, value: toSimilarity(avg), weight: 2 });
  }
  if (
    fa.extraversion !== null &&
    fb.extraversion !== null &&
    fa.openness !== null &&
    fb.openness !== null
  ) {
    const gap =
      (Math.abs(fa.extraversion - fb.extraversion) +
        Math.abs(fa.openness - fb.openness)) /
      200;
    out.push({
      module: 7,
      value: Math.round((0.4 + 0.6 * (1 - gap)) * 100) / 100,
      weight: 1,
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
  /** Points à observer (questions miroir, sincérité) : visibles du seul membre. */
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

export const RELATIONAL_DISCLAIMER =
  'Repères indicatifs, inspirés de questionnaires utilisés en recherche. Ce n’est pas un diagnostic, et ces éléments ne sont jamais montrés tels quels aux autres membres.';

/** « Votre profil relationnel » : lecture bienveillante des échelles, pour le membre seul. */
export function buildRelationalProfile(
  answers: RawAnswers,
  gender: Gender,
): RelationalProfile | null {
  const p = buildPsychProfile(answers);

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
              text: 'Vous vous livrez facilement et les autres se confient à vous. Avec une personne plus réservée, laissez-lui le temps de venir vers vous.',
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
  if (p.idealized) {
    observations.push(
      agree(
        'Vous vous décrivez sans aucune jalousie ni le moindre petit mensonge : personne n’y échappe tout à fait. Rester nuancé{e} aide BOLIGO à vous présenter les bonnes personnes.',
        gender,
      ),
    );
  }

  if (
    !attachment &&
    !regulation &&
    !conflict &&
    !openness &&
    personality.length === 0
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
