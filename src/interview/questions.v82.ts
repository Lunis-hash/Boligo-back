/**
 * Grand Entretien V8.2 — intégré derrière un indicateur de version.
 *
 * Source : le modèle validé (docs/questionnaire/V8_2_FINAL/preuves/model.py),
 * exporté dans `questions.v82.generated.ts` (113 questions), plus les
 * arbitrages de la stratégie B :
 * - quatre questions V7 reprises telles quelles (M5_Q07, M9_Q07, M4_Q14,
 *   M10_Q15 : identifiants, textes et codes inchangés, donc lus par le moteur
 *   et le Sondeur sans conversion) ;
 * - M8_Q13 reformulée autour de l'engagement, de la réparation et des
 *   limites personnelles : son sens change, d'où un nouvel identifiant
 *   (V82_M8_06). L'ancienne formulation (« je resterais : l'engagement est
 *   pour la vie », sans réserve) pouvait valider le maintien dans une
 *   relation dangereuse ; la nouvelle exclut explicitement la violence et le
 *   danger, et l'aide rappelle que se protéger passe avant l'engagement.
 *
 * Version servie : `INTERVIEW_VERSION` (« 7.1 » par défaut, la production ne
 * change donc pas). Un entretien commencé garde sa version : un membre qui a
 * déjà répondu à une question V8.2 reste en V8.2, un membre V7.1 reste en V7.1.
 */
import {
  QUESTION_INDEX,
  QUESTIONS,
  Question,
  answerKeys,
} from './questions.data';
import { QUESTIONS_EN } from './questions.en';
import { V82_BASE, V82_BASE_EN } from './questions.v82.generated';

export type InterviewVersion = '7.1' | '8.2';

export interface V82QuestionData extends Question {
  /** Saisie numérique « min-max » (curseurs d'âge), sans options. */
  input?: 'ageRange';
  /** Facultative : « Je préfère ne pas répondre » est proposé. */
  optional?: boolean;
  /** Dimension descriptive (attachement, conflit, Mini-IPIP) ; jamais un score de compatibilité. */
  dimension?: string;
  /** Item inversé de sa dimension. */
  reversed?: boolean;
  /** Séance de passation (1 à 3). */
  session?: number;
}

export interface V82Translation {
  text: string;
  options: Record<string, string>;
  assistance?: string;
}

/** Stratégie B : questions V7 reprises telles quelles. */
export const V82_REINTEGRATED = ['M5_Q07', 'M9_Q07', 'M4_Q14', 'M10_Q15'];

/** M8_Q13 reformulée (nouveau sens, nouvel identifiant). */
export const V82_M8_06: V82QuestionData = {
  id: 'V82_M8_06',
  moduleNumber: 8,
  text: 'Si, après plusieurs années, votre couple traversait une longue période difficile, sans violence ni danger pour personne, quelle serait votre attitude ?',
  options: [
    {
      key: 'A',
      text: 'Je chercherais d’abord à réparer, avec du temps et de l’aide si besoin : l’engagement compte beaucoup pour moi',
    },
    {
      key: 'B',
      text: 'Je ferais de vrais efforts pour réparer ; la séparation resterait un dernier recours',
    },
    {
      key: 'C',
      text: 'Je ferais des efforts, mais je partirais si rien ne s’améliorait malgré tout',
    },
    {
      key: 'D',
      text: 'Je partirais assez vite : rester par seule obligation n’a pas de sens pour moi',
    },
    { key: 'E', text: 'Je préfère ne pas répondre' },
  ],
  assistance:
    'Face à la violence, aux menaces ou à la peur, votre sécurité passe avant tout engagement : s’éloigner et demander de l’aide est toujours légitime.',
  optional: true,
  session: 1,
};

const V82_M8_06_EN: V82Translation = {
  text: 'If, after several years, your relationship went through a long difficult period, with no violence or danger for anyone, what would your attitude be?',
  options: {
    A: 'I would first try to repair things, with time and help if needed: commitment matters a great deal to me',
    B: 'I would make real efforts to repair things; separation would remain a last resort',
    C: 'I would make efforts, but I would leave if nothing improved despite everything',
    D: 'I would leave fairly quickly: staying out of obligation alone makes no sense to me',
    E: 'I prefer not to answer',
  },
  assistance:
    'In the face of violence, threats or fear, your safety comes before any commitment: stepping away and asking for help is always legitimate.',
};

/** Question V8.2 : celle du modèle, avec les attributs d'application de la V7.1 (aide, saisie libre). */
function withV71Attributes(q: V82QuestionData): V82QuestionData {
  const v71 = QUESTION_INDEX.get(q.id);
  if (!v71) return q;
  return {
    ...q,
    ...(v71.assistance && !q.assistance ? { assistance: v71.assistance } : {}),
    options: q.options.map((o) => {
      const base = v71.options.find((b) => b.key === o.key);
      return {
        ...o,
        ...(base?.freeText ? { freeText: true } : {}),
        ...(base?.exclusive ? { exclusive: true } : {}),
      };
    }),
  };
}

function assemble(): V82QuestionData[] {
  const out = V82_BASE.map(withV71Attributes);
  const extra: V82QuestionData[] = [
    ...V82_REINTEGRATED.map((id) => {
      const q = QUESTION_INDEX.get(id);
      if (!q) throw new Error(`Question V7 absente : ${id}`);
      return { ...q, session: undefined };
    }),
    V82_M8_06,
  ];
  // Chaque ajout se place en fin de son module : l'ordre des autres ne change pas.
  for (const q of extra) {
    let at = -1;
    out.forEach((x, i) => {
      if (x.moduleNumber === q.moduleNumber) at = i;
    });
    out.splice(at + 1, 0, q);
  }
  return out;
}

export const V82_QUESTIONS: V82QuestionData[] = assemble();

export const V82_INDEX: Map<string, V82QuestionData> = new Map(
  V82_QUESTIONS.map((q) => [q.id, q]),
);

/** Traductions anglaises (mêmes clés que les questions françaises). */
export const V82_EN: Record<string, V82Translation> = {
  ...Object.fromEntries(
    Object.entries(V82_BASE_EN).map(([id, t]) => {
      // Aide reprise de la V7.1 : sa traduction aussi.
      const assistance = V82_INDEX.get(id)?.assistance
        ? QUESTIONS_EN[id]?.assistance
        : undefined;
      return [id, assistance ? { ...t, assistance } : t];
    }),
  ),
  ...Object.fromEntries(
    V82_REINTEGRATED.map((id) => {
      const q = QUESTION_INDEX.get(id)!;
      const t = QUESTIONS_EN[id];
      return [
        id,
        {
          text: t.text,
          options: Object.fromEntries(
            q.options.map((o, i) => [o.key, t.options?.[i] ?? o.text]),
          ),
        },
      ];
    }),
  ),
  V82_M8_06: V82_M8_06_EN,
};

/** Identifiants propres à la V8.2 (absents de la V7.1). */
export const V82_ONLY_IDS: ReadonlySet<string> = new Set(
  V82_QUESTIONS.filter((q) => !QUESTION_INDEX.has(q.id)).map((q) => q.id),
);

/**
 * Version attribuée à un NOUVEL entretien (jamais à un entretien existant) :
 * - `INTERVIEW_VERSION=8.2` : tous les nouveaux entretiens en V8.2 ;
 * - sinon `INTERVIEW_V82_PERCENT=N` (0 à 100) : activation progressive,
 *   stable pour un même membre (hachage de son identifiant) ;
 * - sinon V7.1. Revenir en arrière : retirer ces variables ; les entretiens
 *   déjà commencés en V8.2 gardent leur version.
 */
export function configuredInterviewVersion(
  userId?: string,
  env: NodeJS.ProcessEnv = process.env,
): InterviewVersion {
  if (env.INTERVIEW_VERSION?.trim() === '8.2') return '8.2';
  const percent = Number(env.INTERVIEW_V82_PERCENT ?? 0);
  if (!userId || !Number.isFinite(percent) || percent <= 0) return '7.1';
  if (percent >= 100) return '8.2';
  return rolloutBucket(userId) < percent ? '8.2' : '7.1';
}

/** Rang 0–99 stable d'un membre (FNV-1a de son identifiant). */
export function rolloutBucket(userId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 100;
}

/**
 * Version d'un entretien EXISTANT : celle enregistrée à sa création. Un
 * entretien antérieur au versionnement (aucune version) est lu en V7.1 ; la
 * configuration n'est jamais consultée, pour qu'un entretien commencé ne
 * change jamais de questionnaire.
 */
export function interviewVersionOf(
  answers: Record<string, unknown>,
  stored?: string | null,
): InterviewVersion {
  if (stored === '8.2' || stored === '7.1') return stored;
  // Filet : aucun entretien V8.2 n'existe sans version enregistrée ; si des
  // réponses propres à la V8.2 sont présentes, on ne les sert pas en V7.1.
  return Object.keys(answers).some((id) => V82_ONLY_IDS.has(id))
    ? '8.2'
    : '7.1';
}

export function isV82Answers(answers: Record<string, unknown>): boolean {
  return Object.keys(answers).some((id) => V82_ONLY_IDS.has(id));
}

export function questionnaire(version: InterviewVersion): Question[] {
  return version === '8.2' ? V82_QUESTIONS : QUESTIONS;
}

export function questionOf(
  version: InterviewVersion,
  id: string,
): V82QuestionData | undefined {
  return version === '8.2' ? V82_INDEX.get(id) : QUESTION_INDEX.get(id);
}

/** Âges acceptés par les curseurs : de 18 à 99 ans. */
export const AGE_MIN = 18;
export const AGE_MAX = 99;

/** « 25-35 » → [25, 35], ou null si la saisie n'est pas une plage valide. */
export function parseAgeRange(value: unknown): [number, number] | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  if (lo < AGE_MIN || hi > AGE_MAX || lo > hi) return null;
  return [lo, hi];
}

/** Réponse valide pour une question V8.2 à saisie numérique. */
export function isValidRangeAnswer(q: V82QuestionData, value: unknown) {
  return q.input === 'ageRange' && parseAgeRange(value) !== null;
}

/**
 * Cohérence des deux curseurs : la plage acceptée (V82_M0_02) englobe la
 * tranche idéale (V82_M0_01).
 */
export function ageRangesConsistent(answers: Record<string, string>): boolean {
  const ideal = parseAgeRange(answers.V82_M0_01);
  const accepted = parseAgeRange(answers.V82_M0_02);
  if (!ideal || !accepted) return true;
  return accepted[0] <= ideal[0] && accepted[1] >= ideal[1];
}

/** Traduction d'une question V8.2 (les clés de réponse ne changent pas). */
export function localizeV82Question<Q extends Question>(
  q: Q,
  lang: 'fr' | 'en',
): Q {
  if (lang === 'fr') return q;
  const t = V82_EN[q.id];
  if (!t) return q;
  return {
    ...q,
    text: t.text,
    ...(q.assistance ? { assistance: t.assistance ?? q.assistance } : {}),
    options: q.options.map((o) => ({ ...o, text: t.options[o.key] ?? o.text })),
  };
}

/** Clés d'une réponse V8.2, sans « Non applicable » ni « je préfère ne pas répondre ». */
export function positionKeys(id: string, value: string | undefined): string[] {
  const q = V82_INDEX.get(id);
  return answerKeys(value).filter(
    (k) =>
      k !== 'NA' &&
      q?.options.find((o) => o.key === k)?.text !==
        'Je préfère ne pas répondre',
  );
}
