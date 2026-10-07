/**
 * Moteur de divergences BOLIGO — déterministe, sans IA, coût nul.
 *
 * Compare les réponses brutes de deux membres aux questions du Grand Entretien
 * (clé d'option par identifiant de question) et en déduit :
 *  - les divergences, classées par gravité (critique > majeure > modérée > mineure),
 *    rattachées aux 7 thèmes fondamentaux de BOLIGO ;
 *  - les convergences (« ce qui vous rassemble ») ;
 *  - une pénalité de score bornée et un drapeau « incompatibilité déclarée » ;
 *  - les points de comparaison par question (affinités par module) ;
 *  - une fiche de compatibilité et des sujets de discussion prêts à afficher.
 *
 * Questionnaire V7 :
 *  - une vraie divergence se distingue d'une nuance grâce à ce que chaque
 *    membre déclare non négociable (M8_Q12) : un désaccord sur un sujet
 *    non négociable pour l'un monte d'un cran ; entre deux membres qui ont
 *    tous deux déclaré ce sujet négociable, une divergence majeure redevient
 *    un sujet à explorer ;
 *  - une seule réponse honnête ou nuancée ne produit plus d'incompatibilité
 *    déclarée : la critique vient d'une déclaration explicite (« même
 *    occasionnel », « sans discussion », « non négociable ») ou d'une limite de
 *    sécurité (la violence physique) ;
 *  - les réponses V6 restent lues : une réponse V6 de même sens est lue dans
 *    les termes de la V7 (`answer-bridge.ts`), les autres gardent leur règle
 *    V6, appliquée seulement quand la question V7 manque d'un côté.
 *
 * Inspiration : lignes rouges et besoins fondamentaux (Gottman), styles
 * d'attachement (Bowlby), valeurs (Schwartz) et projet de vie partagés.
 */
import {
  QUESTION_INDEX,
  answerKeys,
  answerText,
} from '../interview/questions.data';
import {
  buildPsychProfile,
  psychometricDivergences,
} from '../psychometrics/psychometrics';
import {
  FaithRequirement,
  faithOf,
  faithRequirement,
  foodRuleOf,
  keysWithout,
  nonNegotiableThemeOf,
  nonNegotiablesOf,
  stillAttached,
  upgradeAnswers,
} from './answer-bridge';

export type Theme =
  | 'famille'
  | 'argent'
  | 'spiritualite'
  | 'intimite'
  | 'communication'
  | 'projet'
  | 'lieu';

export const THEMES: Record<
  Theme,
  { label: string; emoji: string; order: number }
> = {
  famille: { label: 'Famille', emoji: '👨‍👩‍👧', order: 1 },
  argent: { label: 'Argent & dettes', emoji: '💶', order: 2 },
  spiritualite: { label: 'Religion & spiritualité', emoji: '🕊️', order: 3 },
  intimite: { label: 'Intimité & sexualité', emoji: '❤️‍🔥', order: 4 },
  communication: { label: 'Communication & émotions', emoji: '💬', order: 5 },
  projet: { label: 'Projet de vie', emoji: '🌱', order: 6 },
  lieu: { label: 'Lieu de vie & mobilité', emoji: '🧭', order: 7 },
};

export const THEME_LIST: Theme[] = (Object.keys(THEMES) as Theme[]).sort(
  (a, b) => THEMES[a].order - THEMES[b].order,
);

export type Severity = 'critique' | 'majeure' | 'moderee' | 'mineure';

const SEVERITY_RANK: Record<Severity, number> = {
  critique: 3,
  majeure: 2,
  moderee: 1,
  mineure: 0,
};
const SEVERITY_PENALTY: Record<Severity, number> = {
  critique: 0.12,
  majeure: 0.05,
  moderee: 0.02,
  mineure: 0,
};
export const MAX_PENALTY = 0.3;

/** Similarité d'un point de comparaison selon la gravité de sa divergence. */
export const SEVERITY_SIMILARITY: Record<Severity, number> = {
  critique: 0,
  majeure: 0.25,
  moderee: 0.5,
  mineure: 0.72,
};
/** Réponses différentes mais compatibles. */
export const COMPATIBLE_DIFFERENT = 0.85;

/** Réponses brutes d'un entretien : identifiant de question → clé d'option (A, B, C…). */
export type RawAnswers = Record<string, string>;

export interface AnswerView {
  key: string;
  text: string;
}

export interface Divergence {
  questionId: string;
  theme: Theme;
  severity: Severity;
  label: string;
  question: string;
  a: AnswerView;
  b: AnswerView;
  /**
   * Risque partagé : les deux membres ont donné la même réponse et c'est
   * justement elle qui pose problème (deux silences, deux réparations lentes).
   */
  shared?: boolean;
  /** Sujet déclaré non négociable par l'un des deux (M8_Q12) : gravité relevée. */
  nonNegotiable?: boolean;
}

export interface Convergence {
  questionId: string;
  theme: Theme;
  label: string;
  answer: string;
  /** Sujet de la règle (« La limite face à la violence physique »), sans phrase d'accord. */
  topic?: string;
}

/** Point de comparaison d'une question (0–1), pour les affinités par module. */
export interface Comparison {
  questionId: string;
  value: number;
}

export interface ThemeSummary {
  theme: Theme;
  label: string;
  emoji: string;
  divergences: number;
  convergences: number;
  worst: Severity | null;
  status: 'aligne' | 'a_discuter' | 'divergence' | 'inconnu';
}

export interface DivergenceReport {
  divergences: Divergence[];
  convergences: Convergence[];
  themes: ThemeSummary[];
  penalty: number;
  hardStop: boolean;
  comparedQuestions: number;
  /** Un point par question comparée (règles et règles croisées). */
  comparisons?: Comparison[];
}

/** Gravité d'une paire de réponses ; `null` = compatible / convergent. */
type SeverityFn = (a: string, b: string) => Severity | null;

interface Rule {
  questionId: string;
  theme: Theme;
  /** Sujet d'une divergence, groupe nominal court (« Désir d'enfants »). */
  label: string;
  /**
   * Sujet neutre d'un accord (« La présence d'enfants ») : jamais une phrase
   * qui supposerait un fait. Sert au libellé de repli des convergences.
   */
  topic: string;
  severity: SeverityFn;
  /** Libellé quand les deux réponses sont identiques (sinon libellé de repli). */
  convergence?: Partial<Record<string, string>>;
  /**
   * Même réponse des deux côtés mais risque réel (questionnaire V5 : « signal
   * rouge si deux D → impasse de réparation »).
   */
  sameRisk?: Partial<Record<string, Severity>>;
  /**
   * Risque partagé « majeur » confirmé par une autre réponse de l'un des
   * deux ; sinon il reste « à explorer » (jamais une majeure sur une seule
   * réponse par membre).
   */
  confirmShared?: (x: RawAnswers) => boolean;
  /** Aucune convergence affichée (sujet intime, ou même réponse ambiguë). */
  discreet?: boolean | string[];
  /** Seuls les risques partagés comptent (ni comparaison ni convergence sinon). */
  risksOnly?: boolean;
  /** Aveu sur soi : jamais de divergence affichée, seulement l'affinité. */
  silent?: boolean;
  /** Similarité de deux réponses compatibles (choix multiples), 0–1. */
  similarity?: (a: string, b: string) => number;
  /** Convergence calculée (choix multiples : réponses communes). */
  convergenceFor?: (a: string, b: string) => string | null;
  /** Règle V6 : ignorée quand la question V7 qui la remplace est répondue des deux côtés. */
  supersededBy?: string[];
  /** Règle V6 : ignorée quand une règle croisée a déjà signalé le même sujet. */
  skipIfFlagged?: string[];
}

/** Construit une fonction de gravité à partir d'une table de paires non ordonnées « AB » → gravité. */
function pairs(
  table: Record<string, Severity>,
  fallback: Severity | null = 'mineure',
): SeverityFn {
  return (a, b) => {
    if (a === b) return null;
    const key = [a, b].sort().join('');
    if (key in table) return table[key];
    return fallback;
  };
}

/** Gravité quand l'une des deux réponses appartient à `keys` et l'autre à `others`. */
function cross(
  keys: string[],
  others: string[],
  severity: Severity,
  fallback: Severity | null = 'mineure',
): SeverityFn {
  return (a, b) => {
    if (a === b) return null;
    const hit =
      (keys.includes(a) && others.includes(b)) ||
      (keys.includes(b) && others.includes(a));
    return hit ? severity : fallback;
  };
}

/** Réponses ignorées : `skip` neutralise toute paire qui la contient. */
function unless(skip: string, fn: SeverityFn): SeverityFn {
  return (a, b) => (a === skip || b === skip ? null : fn(a, b));
}

/** Part de réponses communes de deux choix multiples (0–1). */
function overlap(a: string[], b: string[]): number {
  const union = new Set([...a, ...b]);
  if (!union.size) return 1;
  return a.filter((k) => b.includes(k)).length / union.size;
}

/** Retrait en dispute confirmé par une autre réponse (échelle, scénario, réparation). */
function withdrawalConfirmed(x: RawAnswers, exclude: string): boolean {
  const p = buildPsychProfile(x);
  return (
    (p.conflict.stonewalling ?? 0) >= 50 ||
    (p.attachment.avoidance ?? 0) >= 60 ||
    x.M6_Q16 === 'D' ||
    (exclude !== 'M6_Q01' && ['C', 'D'].includes(x.M6_Q01)) ||
    (exclude !== 'M2_Q07' && ['C', 'D'].includes(x.M2_Q07))
  );
}

// ─── Choix multiples V7 ──────────────────────────────────────────────────────

/** P7 : comportements de l'autre que l'on appelle déjà « tromper » (G : aucun). */
function infidelitySeverity(a: string, b: string): Severity | null {
  const ka = keysWithout(a, 'G').filter((k) => k !== 'G');
  const kb = keysWithout(b, 'G').filter((k) => k !== 'G');
  const onlyPhysicalA = ka.length === 0;
  const onlyPhysicalB = kb.length === 0;
  if ((onlyPhysicalA && kb.length >= 4) || (onlyPhysicalB && ka.length >= 4))
    return 'majeure';
  const diff =
    ka.filter((k) => !kb.includes(k)).length +
    kb.filter((k) => !ka.includes(k)).length;
  if (diff >= 3) return 'moderee';
  if (diff >= 1) return 'mineure';
  return null;
}

/** Valeurs de vie (M7_Q19), en groupes de Schwartz. */
const CONSERVATION = ['A', 'B', 'H'];
const OPENNESS_TO_CHANGE = ['D', 'F', 'G'];
const VALUE_WORDS: Record<string, string> = {
  A: 'la sécurité de la famille',
  B: 'les traditions et la foi',
  C: 'la réussite',
  D: 'la liberté de choisir',
  E: 'l’entraide et la justice',
  F: 'la découverte',
  G: 'les plaisirs de la vie',
  H: 'l’harmonie avec l’entourage',
  I: 'l’influence et l’aisance',
};

/** P10 : aucune valeur commune ; opposition « tradition et sécurité » / « liberté et découverte ». */
function valuesSeverity(a: string, b: string): Severity | null {
  const ka = answerKeys(a);
  const kb = answerKeys(b);
  if (ka.some((k) => kb.includes(k))) return null;
  const leaning = (keys: string[]) => {
    const cons = keys.filter((k) => CONSERVATION.includes(k)).length;
    const open = keys.filter((k) => OPENNESS_TO_CHANGE.includes(k)).length;
    if (cons >= 2 && open === 0) return 'conservation';
    if (open >= 2 && cons === 0) return 'ouverture';
    return null;
  };
  const la = leaning(ka);
  const lb = leaning(kb);
  return la && lb && la !== lb ? 'moderee' : 'mineure';
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} et ${words[words.length - 1]}`;
}

/** Ce qui fait se sentir aimé(e) (M8_Q04), en complément de « Vous vous sentez tous les deux aimés ». */
const LOVE_WORDS: Record<string, string> = {
  A: 'par des mots tendres',
  B: 'par des gestes concrets',
  C: 'par des attentions',
  D: 'par du temps passé ensemble',
  E: 'par la tendresse physique',
};

/**
 * Règles par question. Les clés d'options correspondent à `questions.data.ts`.
 * Une question absente d'ici (et des règles croisées) n'est jamais comparée.
 */
export const DIVERGENCE_RULES: Rule[] = [
  // ── Lieu de vie & mobilité
  {
    questionId: 'M0_Q03',
    theme: 'lieu',
    label: 'Déménager pour le couple',
    topic: 'Déménager pour le couple',
    severity: pairs({
      AD: 'majeure',
      BD: 'majeure',
      CD: 'moderee',
      AC: 'mineure',
      BC: 'mineure',
      AB: 'mineure',
    }),
    convergence: {
      A: 'Vous êtes tous les deux prêts à déménager pour le couple',
      D: 'Vous tenez tous les deux à rester où vous êtes',
    },
  },
  {
    questionId: 'M7_Q07',
    theme: 'lieu',
    label: 'Lieu de vie dans cinq ans',
    topic: 'Le lieu de vie dans cinq ans',
    severity: unless(
      'D',
      pairs({ AC: 'majeure', BC: 'moderee', AB: 'moderee' }),
    ),
    convergence: {
      A: 'Vous vous voyez tous les deux rester dans votre ville',
      C: "Vous envisagez tous les deux une vie à l'étranger",
    },
  },
  {
    questionId: 'M4_Q13',
    theme: 'lieu',
    label: 'Partage des affaires personnelles',
    topic: 'Le partage des affaires personnelles',
    severity: pairs({ AD: 'moderee', AC: 'mineure', BD: 'mineure' }, null),
    convergence: { A: 'Pour vous deux, ce qui est à l’un est à l’autre' },
  },

  // ── Famille
  {
    questionId: 'M0_Q06',
    theme: 'famille',
    label: "Désir d'enfants",
    topic: "Le désir d'enfants",
    severity: pairs({
      AD: 'critique',
      BD: 'majeure',
      CD: 'moderee',
      AC: 'moderee',
      BC: 'mineure',
      AB: 'mineure',
    }),
    convergence: {
      A: 'Vous souhaitez tous les deux des enfants, sans hésitation',
      D: "Vous ne souhaitez ni l'un ni l'autre d'enfants",
    },
  },
  {
    questionId: 'M0_Q05',
    theme: 'famille',
    label: 'Enfants déjà présents',
    topic: "La présence d'enfants",
    severity: pairs({ AC: 'moderee', AB: 'mineure', AD: 'mineure' }, 'mineure'),
    convergence: {
      A: 'Vous n’avez ni l’un ni l’autre d’enfant à charge',
      B: 'Vous êtes tous les deux parents d’un enfant à charge',
      C: 'Vous êtes tous les deux parents de plusieurs enfants',
      D: 'Vos enfants sont autonomes, de part et d’autre',
    },
  },
  {
    questionId: 'M3_Q04',
    theme: 'famille',
    label: 'Famille recomposée',
    topic: 'La place du beau-parent',
    severity: pairs({ AC: 'moderee', AB: 'mineure', BC: 'mineure' }),
  },
  {
    questionId: 'M5_Q01',
    theme: 'famille',
    label: 'Place de la famille dans les décisions',
    topic: 'La place de la famille dans les décisions',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      D: 'Vos décisions de couple ne regardent que vous deux',
      B: 'La famille compte, mais la décision finale vous appartient à tous les deux',
    },
  },
  {
    // V7 — garder sa position face aux siens (différenciation de soi, Bowen).
    questionId: 'M5_Q10',
    theme: 'famille',
    label: 'Garder sa position face aux proches',
    topic: 'Les décisions de couple face aux proches',
    severity: pairs({
      AB: 'moderee',
      AC: 'majeure',
      AD: 'majeure',
      BC: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      B: 'Vous décidez tous les deux à deux, et l’expliquez calmement à vos proches',
    },
  },
  {
    // V7 — la question de loyauté a enfin sa règle : minimiser l'offense
    // face à quelqu'un qui défend son partenaire.
    questionId: 'M5_Q02',
    theme: 'famille',
    label: 'Loyauté face à un parent',
    topic: 'Le soutien du partenaire face à un parent',
    severity: (a, b) =>
      a === b || (['A', 'E'].includes(a) && ['A', 'E'].includes(b))
        ? null
        : pairs({
            AD: 'majeure',
            DE: 'majeure',
            AC: 'moderee',
            CE: 'moderee',
          })(a, b),
    convergence: {
      A: 'Vous défendriez tous les deux votre partenaire face à votre famille',
      E: 'Vous soutiendriez tous les deux votre partenaire, avant d’en parler seul à seul avec votre parent',
    },
  },
  {
    questionId: 'M5_Q03',
    theme: 'famille',
    label: 'Cohabitation avec la belle-famille',
    topic: 'La cohabitation avec la belle-famille',
    severity: pairs({
      BC: 'majeure',
      AB: 'moderee',
      BD: 'moderee',
      AC: 'mineure',
      CD: 'mineure',
      AD: 'mineure',
    }),
    convergence: {
      B: 'Vous tenez tous les deux à un foyer rien qu’à vous',
    },
  },
  {
    questionId: 'M5_Q07',
    theme: 'famille',
    label: 'Fréquence des visites familiales',
    topic: 'La fréquence des visites familiales',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M1_Q13',
    theme: 'famille',
    label: 'Transmission culturelle aux enfants',
    topic: 'La transmission culturelle aux enfants',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Vous voulez tous les deux transmettre langue, traditions et religion',
      B: 'Vos enfants grandiraient entre vos deux cultures',
    },
  },
  {
    // V7 — éducation des enfants (autorité, cadre, dialogue, liberté).
    questionId: 'M8_Q15',
    theme: 'famille',
    label: 'Éducation des enfants',
    topic: 'L’éducation des enfants',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      B: 'Vous voulez tous les deux un cadre ferme, expliqué avec bienveillance',
      C: 'Le dialogue est au cœur de l’éducation pour vous deux',
    },
  },
  {
    questionId: 'M1_Q15',
    theme: 'famille',
    label: 'Si la famille désapprouve',
    topic: 'L’avis de la famille sur le partenaire',
    severity: pairs({
      AD: 'moderee',
      AC: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M4_Q07',
    theme: 'famille',
    label: 'Dot ou mahr',
    topic: 'La dot ou le mahr',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: { A: 'La dot ou le mahr compte pour vous deux' },
  },
  {
    questionId: 'M3_Q05',
    theme: 'famille',
    label: "Place de l'ex",
    topic: "La place de l'ex",
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    // V7 — partage des tâches de la maison.
    questionId: 'M4_Q15',
    theme: 'famille',
    label: 'Partage des tâches de la maison',
    topic: 'Le partage des tâches de la maison',
    severity: pairs({
      AC: 'majeure',
      BC: 'moderee',
      AB: 'mineure',
      AD: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      C: 'Vous partageriez tous les deux les tâches de la maison équitablement',
    },
  },

  // ── Argent & dettes
  {
    questionId: 'M4_Q01',
    theme: 'argent',
    label: 'Argent du couple',
    topic: "L'organisation de l'argent du couple",
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: "Vous partagez la même vision d'un pot commun",
      C: 'Vous voyez tous les deux des dépenses séparées et des charges partagées',
    },
  },
  {
    // V7 — tempérament financier (remplace M4_Q08, doublon de M4_Q01).
    questionId: 'M4_Q14',
    theme: 'argent',
    label: 'Épargne et dépenses',
    topic: 'Le rapport à l’épargne',
    severity: unless(
      'D',
      pairs({ AC: 'moderee', AB: 'mineure', BC: 'mineure' }),
    ),
    convergence: {
      A: 'Vous mettez tous les deux de côté avant tout',
      B: 'Vous trouvez tous les deux l’équilibre entre épargne et plaisir',
    },
  },
  {
    questionId: 'M4_Q03',
    theme: 'argent',
    label: "Rôle économique de l'homme",
    topic: "Le rôle économique de l'homme",
    severity: pairs({
      AC: 'majeure',
      AD: 'moderee',
      BC: 'mineure',
      AB: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M4_Q04',
    theme: 'argent',
    label: 'Rôle économique de la femme',
    topic: 'Le rôle économique de la femme',
    severity: pairs({
      AC: 'majeure',
      AD: 'majeure',
      BC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M4_Q05',
    theme: 'argent',
    label: 'Envois à la famille élargie',
    topic: "Les envois d'argent à la famille",
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BC: 'moderee',
      CD: 'moderee',
      AB: 'mineure',
      BD: 'mineure',
    }),
  },
  {
    questionId: 'M4_Q09',
    theme: 'argent',
    label: 'Transparence sur les dettes',
    topic: 'La transparence sur les dettes',
    severity: pairs({ AC: 'moderee', AB: 'mineure', BC: 'mineure' }, 'mineure'),
    convergence: {
      A: 'Pour vous deux, les dettes se disent avant de s’engager',
    },
  },
  {
    questionId: 'M4_Q10',
    theme: 'argent',
    label: 'Qui paie au premier rendez-vous',
    topic: "L'addition du premier rendez-vous",
    // « C'est à l'homme de payer » face à « moitié-moitié » : un malaise dès
    // la première sortie (Lever, Frederick & Hertz, 2015).
    severity: pairs({ AC: 'moderee' }, 'mineure'),
    convergence: {
      A: 'Pour vous deux, l’homme règle l’addition du premier rendez-vous',
      C: 'Vous partagez tous les deux l’addition, moitié-moitié',
    },
  },
  {
    questionId: 'M4_Q11',
    theme: 'argent',
    label: 'Soutien quand l’argent manque',
    topic: 'Le soutien quand l’argent manque',
    // Les difficultés financières sont l'un des facteurs de stress les plus
    // liés aux ruptures (Conger ; Dew, 2008).
    severity: pairs(
      { AD: 'majeure', BD: 'moderee', AC: 'moderee', BC: 'mineure' },
      null,
    ),
    convergence: {
      A: 'Vous vous soutiendriez tous les deux sans compter',
      B: 'Vous traverseriez tous les deux un manque d’argent avec un plan',
    },
  },
  {
    questionId: 'M4_Q12',
    theme: 'argent',
    label: 'Place de l’argent dans le choix du partenaire',
    topic: 'La place de l’argent dans le choix du partenaire',
    severity: pairs(
      { AD: 'majeure', AC: 'moderee', AB: 'mineure', BD: 'mineure' },
      null,
    ),
  },

  // ── Religion & spiritualité (la religion, la pratique et l'alimentation
  // sont des règles croisées, lues en V7 comme en V6)
  {
    questionId: 'M1_Q03',
    theme: 'spiritualite',
    label: 'Traditions de mariage',
    topic: 'Les traditions de mariage',
    severity: pairs({
      AD: 'moderee',
      BD: 'mineure',
      AC: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M8_Q03',
    theme: 'spiritualite',
    label: 'Vision du mariage',
    topic: 'La vision du mariage',
    severity: pairs({
      AD: 'majeure',
      AB: 'moderee',
      CD: 'moderee',
      BD: 'moderee',
      DE: 'moderee',
      AC: 'mineure',
      BC: 'mineure',
      AE: 'mineure',
      BE: 'mineure',
      CE: 'mineure',
    }),
    convergence: {
      A: 'Le mariage est pour vous deux un acte religieux et spirituel',
      C: 'Vous voulez tous les deux un mariage civil et religieux',
      E: 'Le mariage est pour vous deux avant tout coutumier',
    },
  },
  {
    questionId: 'M1_Q11',
    theme: 'spiritualite',
    label: 'Polygamie',
    topic: 'La polygamie',
    // V7 : « Je préfère en parler en personne » ne neutralise plus la règle
    // face à « monogamie exclusive, sans discussion ».
    severity: (a, b) => {
      if (a === b) return null;
      if (a === 'D' || b === 'D')
        return a === 'A' || b === 'A' ? 'moderee' : 'mineure';
      return pairs({ AC: 'critique', BC: 'majeure', AB: 'mineure' })(a, b);
    },
    convergence: { A: 'Monogamie exclusive pour vous deux' },
  },

  // ── Intimité & sexualité
  {
    // V7 — remplace M6_Q10 : des réponses ordonnées, sans jugement moral ;
    // aucune ne déclare seule une incompatibilité (voir M8_Q12).
    questionId: 'M6_Q18',
    theme: 'intimite',
    label: 'Fidélité',
    topic: 'La fidélité',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Pour vous deux, une infidélité mettrait fin à la relation',
      C: 'Pour vous deux, une infidélité serait très grave, mais réparable avec le temps',
    },
  },
  {
    // V7 — ce que chacun appelle « tromper » (P7).
    questionId: 'M6_Q19',
    theme: 'intimite',
    label: 'Ce que chacun appelle tromper',
    topic: 'La définition de l’infidélité',
    severity: infidelitySeverity,
    similarity: (a, b) =>
      0.7 +
      0.3 *
        overlap(
          keysWithout(a, 'G').filter((k) => k !== 'G'),
          keysWithout(b, 'G').filter((k) => k !== 'G'),
        ),
    convergenceFor: (a, b) =>
      a === b ? 'Vous avez la même idée de ce qu’est une infidélité' : null,
  },
  {
    // V7 — remplace M6_Q06 : l'importance seule. Sujet intime : jamais de
    // convergence affichée.
    questionId: 'M10_Q16',
    theme: 'intimite',
    label: "Place de l'intimité physique",
    topic: "La place de l'intimité physique",
    severity: pairs({ AC: 'moderee' }, 'mineure'),
    discreet: true,
  },
  {
    // V7 — l'intimité avant le mariage (P6). « Exclue » face à « possible sans
    // engagement » est une divergence majeure ; elle devient une
    // incompatibilité déclarée si l'un des deux l'a déclarée non négociable.
    questionId: 'M10_Q17',
    theme: 'intimite',
    label: 'Intimité avant le mariage',
    topic: "L'intimité avant le mariage",
    severity: pairs({
      AC: 'majeure',
      AB: 'moderee',
      BC: 'moderee',
      AD: 'moderee',
      BD: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Vous attendez tous les deux le mariage',
      B: 'Vous préférez tous les deux attendre un engagement sérieux',
    },
    discreet: ['C', 'D'],
  },
  {
    // V7 — écart de désir (P6) : deux personnes qui attendent chacune que
    // l'autre s'adapte. Le reste est un conseil au membre seul.
    questionId: 'M10_Q18',
    theme: 'intimite',
    label: 'Écart de désir',
    topic: 'Un écart de désir dans le couple',
    severity: () => null,
    sameRisk: { D: 'moderee' },
    risksOnly: true,
  },
  {
    questionId: 'M9_Q07',
    theme: 'intimite',
    label: 'Tendresse et affection',
    topic: 'La tendresse au quotidien',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    // V7 — remplace M5_Q04 : ce que l'on accepte chez l'autre.
    questionId: 'M5_Q09',
    theme: 'intimite',
    label: 'Amitiés de l’autre sexe',
    topic: 'Les amitiés avec l’autre sexe',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      B: 'Pour vous deux, des amitiés de l’autre sexe vont avec la transparence',
    },
  },
  {
    questionId: 'M5_Q08',
    theme: 'intimite',
    label: 'Téléphone et confiance',
    topic: "L'accès au téléphone de l'autre",
    severity: pairs({ AB: 'moderee', AC: 'mineure', BC: 'mineure' }, 'mineure'),
  },
  {
    questionId: 'M10_Q15',
    theme: 'intimite',
    label: 'Rythme de l’attirance',
    topic: 'Le rythme de l’attirance',
    // L'attirance évolue avec la connaissance de l'autre (Hunt, Eastwick &
    // Finkel, 2015) : un coup de foudre exigé face à une attirance qui se
    // construit est à aborder tôt.
    severity: pairs({ AC: 'moderee', AB: 'mineure' }, null),
  },

  // ── Communication & émotions
  {
    questionId: 'M2_Q07',
    theme: 'communication',
    label: 'Temps pour se réconcilier',
    topic: 'Le temps pour se réconcilier',
    severity: pairs({
      AD: 'moderee',
      CD: 'moderee',
      AC: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
      BD: 'mineure',
    }),
    // V5 : « signal rouge si deux D → impasse de réparation ». V7 : majeure
    // si le retrait est confirmé par une autre réponse de l'un des deux.
    sameRisk: { D: 'majeure', C: 'moderee' },
    confirmShared: (x) => withdrawalConfirmed(x, 'M2_Q07'),
    convergence: {
      A: 'Vous ne laissez ni l’un ni l’autre traîner une dispute',
    },
  },
  {
    // V7 — remplace M2_Q08 (« si je me rends compte de mon erreur »
    // contredisait la question).
    questionId: 'M2_Q22',
    theme: 'communication',
    label: 'Le premier pas après une dispute',
    topic: 'Le premier pas après une dispute',
    severity: (a, b) =>
      ['A', 'B'].includes(a) && ['A', 'B'].includes(b)
        ? null
        : pairs({ AD: 'moderee' }, 'mineure')(a, b),
    // Deux attentes que l'autre revienne, ou deux refus de s'excuser : personne
    // ne fait le premier pas.
    sameRisk: { C: 'moderee', D: 'moderee' },
    convergence: {
      A: 'Vous savez tous les deux reconnaître votre part',
      B: 'Vous faites tous les deux un pas vers l’autre, même convaincus d’avoir raison',
    },
  },
  {
    // Limite de sécurité. « Ça dépend des circonstances » face à « limite
    // absolue » : incompatibilité déclarée. Toute tolérance partagée est un
    // risque, jamais un accord.
    questionId: 'M6_Q04',
    theme: 'communication',
    label: 'Limite face à la violence physique',
    topic: 'La limite face à la violence physique',
    severity: pairs({
      AC: 'critique',
      BC: 'majeure',
      AD: 'moderee',
      CD: 'moderee',
      AB: 'mineure',
      BD: 'mineure',
    }),
    sameRisk: { B: 'moderee', C: 'majeure', D: 'majeure' },
    convergence: {
      A: 'La violence physique est pour vous deux une limite absolue',
    },
  },
  {
    questionId: 'M6_Q05',
    theme: 'communication',
    label: 'Mots blessants en dispute',
    topic: 'La limite face aux mots blessants',
    severity: pairs({
      AC: 'majeure',
      AD: 'moderee',
      BC: 'moderee',
      AB: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
    sameRisk: { B: 'moderee', C: 'majeure', D: 'majeure' },
    convergence: {
      A: 'Les insultes sont une limite absolue pour vous deux',
    },
  },
  {
    questionId: 'M8_Q06',
    theme: 'communication',
    label: 'Style de communication',
    topic: 'La communication au quotidien',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Vous aimez tous les deux vous parler de tout',
      B: 'Vous voulez tous les deux échanger en profondeur sur l’essentiel',
    },
  },
  {
    questionId: 'M9_Q03',
    theme: 'communication',
    label: 'Comptabilité affective',
    topic: 'Compter ce que l’on donne',
    severity: pairs({ AD: 'moderee', AC: 'mineure', BD: 'mineure' }, 'mineure'),
    // V5 : « C+D = ressentiment latent probable ».
    sameRisk: { D: 'moderee' },
    convergence: { A: 'Vous donnez tous les deux sans compter' },
  },
  {
    questionId: 'M6_Q03',
    theme: 'communication',
    label: 'Besoin de gagner le débat',
    topic: 'Le besoin d’avoir le dernier mot',
    severity: cross(['D'], ['A', 'B', 'C'], 'moderee'),
    // V7 : deux besoins d'avoir le dernier mot font monter les disputes.
    sameRisk: { C: 'moderee', D: 'moderee' },
    convergence: { A: 'Pour vous deux, résoudre compte plus que gagner' },
  },
  {
    questionId: 'M6_Q11',
    theme: 'communication',
    label: 'Réconciliation après dispute',
    topic: 'La réconciliation après une dispute',
    severity: pairs({ AD: 'mineure', BD: 'mineure', CD: 'mineure' }, 'mineure'),
    // V7 : deux attentes du premier pas.
    sameRisk: { D: 'moderee' },
    convergence: {
      A: 'Vous vous réconciliez tous les deux en en reparlant calmement',
    },
  },
  {
    questionId: 'M9_Q01',
    theme: 'communication',
    label: 'Prise de décision',
    topic: 'La prise de décision',
    severity: pairs({ AB: 'moderee', BC: 'mineure', AC: 'mineure' }, 'mineure'),
    // V7 : deux personnes qui prennent naturellement la direction.
    sameRisk: { B: 'moderee' },
    convergence: { A: 'Vous voulez tous les deux décider ensemble' },
  },
  {
    questionId: 'M9_Q02',
    theme: 'communication',
    label: "Philosophie de l'effort",
    topic: "L'effort en amour",
    severity: pairs(
      { AB: 'moderee', AC: 'moderee', AD: 'mineure', BC: 'mineure' },
      'mineure',
    ),
  },
  {
    questionId: 'M9_Q06',
    theme: 'communication',
    label: 'Rapport au sacrifice',
    topic: 'Le rapport au sacrifice',
    severity: pairs({ AD: 'moderee', AC: 'mineure', BD: 'mineure' }, 'mineure'),
  },
  {
    // V7 — jusqu'à deux réponses : une façon commune suffit à se comprendre.
    questionId: 'M8_Q04',
    theme: 'communication',
    label: 'Ce qui fait se sentir aimé',
    topic: 'Les façons de se sentir aimé',
    severity: (a, b) =>
      answerKeys(a).some((k) => answerKeys(b).includes(k)) ? null : 'mineure',
    similarity: (a, b) => 0.7 + 0.3 * overlap(answerKeys(a), answerKeys(b)),
    convergenceFor: (a, b) => {
      const common = answerKeys(a).filter((k) => answerKeys(b).includes(k));
      return common.length
        ? `Vous vous sentez tous les deux aimés ${joinWords(common.map((k) => LOVE_WORDS[k]))}`
        : null;
    },
  },
  {
    // V7 — répondre aux petites demandes d'attention (Gottman). Aveu sur soi :
    // il compte dans l'affinité, sans jamais être cité à l'autre.
    questionId: 'M9_Q25',
    theme: 'communication',
    label: 'Attention au quotidien',
    topic: 'L’attention au quotidien',
    severity: pairs({ AD: 'moderee', BD: 'mineure', CD: 'mineure' }, null),
    sameRisk: { D: 'moderee' },
    silent: true,
  },
  {
    // V7 — famille d'origine (P8) : jamais pénalisée seule. Deux modèles de
    // cris, ou deux modèles de silence, sont à explorer.
    questionId: 'M3_Q12',
    theme: 'communication',
    label: 'Disputes dans la famille d’origine',
    topic: 'Les disputes dans la famille d’origine',
    severity: () => null,
    sameRisk: { B: 'moderee', C: 'moderee' },
    risksOnly: true,
  },

  // ── Projet de vie
  {
    questionId: 'M8_Q01',
    theme: 'projet',
    label: 'Objectif de rencontre',
    topic: 'L’objectif de la rencontre',
    severity: pairs({
      AC: 'majeure',
      AD: 'majeure',
      BD: 'moderee',
      BC: 'moderee',
      AB: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Vous visez tous les deux le mariage',
      B: 'Vous voulez tous les deux une relation sérieuse avec un projet commun',
    },
  },
  {
    questionId: 'M8_Q02',
    theme: 'projet',
    label: "Délai d'engagement",
    topic: "Le délai d'engagement",
    severity: pairs({
      AC: 'moderee',
      AD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    // V7 — l'attitude face à la séparation, indicateur d'engagement.
    questionId: 'M8_Q13',
    theme: 'projet',
    label: 'Engagement dans les moments difficiles',
    topic: 'L’engagement dans les moments difficiles',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Pour vous deux, l’engagement est pour la vie',
      B: 'Pour vous deux, la séparation ne serait qu’un dernier recours',
    },
  },
  {
    // V7 — hiérarchie des valeurs de vie (P10), trois au plus.
    questionId: 'M7_Q19',
    theme: 'projet',
    label: 'Valeurs de vie',
    topic: 'Les valeurs de vie',
    severity: valuesSeverity,
    similarity: (a, b) => 0.6 + 0.4 * overlap(answerKeys(a), answerKeys(b)),
    convergenceFor: (a, b) => {
      const common = answerKeys(a).filter((k) => answerKeys(b).includes(k));
      return common.length
        ? `Ce qui compte le plus pour vous deux : ${joinWords(common.map((k) => VALUE_WORDS[k]))}`
        : null;
    },
  },
  {
    questionId: 'M7_Q02',
    theme: 'projet',
    label: 'Ambition professionnelle',
    topic: 'L’ambition professionnelle',
    severity: pairs({
      AC: 'moderee',
      AD: 'mineure',
      BC: 'mineure',
      AB: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M7_Q05',
    theme: 'projet',
    label: 'Rapport au changement',
    topic: 'Le rapport au changement',
    severity: pairs({
      AD: 'moderee',
      AC: 'mineure',
      BD: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M7_Q08',
    theme: 'projet',
    label: 'Temps passé ensemble',
    topic: 'Le temps passé ensemble',
    severity: pairs({
      AC: 'majeure',
      AB: 'moderee',
      BC: 'mineure',
      AD: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M8_Q09',
    theme: 'projet',
    label: 'Gestion des divergences de projet',
    topic: 'Les divergences de projet',
    severity: pairs({
      AD: 'moderee',
      AB: 'mineure',
      AC: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
      BC: 'mineure',
    }),
  },
  {
    questionId: 'M4_Q06',
    theme: 'projet',
    label: 'Projet immobilier',
    topic: 'Le projet immobilier',
    severity: pairs({
      AB: 'moderee',
      BD: 'moderee',
      AC: 'mineure',
      AD: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M8_Q11',
    theme: 'projet',
    label: 'Prendre soin de l’autre dans la maladie',
    topic: 'Prendre soin de l’autre dans la maladie',
    severity: pairs({ AD: 'moderee', AC: 'mineure', BD: 'mineure' }, null),
    convergence: {
      A: 'Pour vous deux, c’est pour le meilleur et pour le pire',
    },
  },
];

/**
 * Règles des questions V6 retirées, lues pour les entretiens V6 seulement
 * (questions de même sens : `answer-bridge.ts`). Leurs défauts sont corrigés :
 * plus de critique sur une réponse ambiguë, plus de double comptage.
 */
export const LEGACY_RULES: Rule[] = [
  {
    // « Je consomme moi-même » face à « Rédhibitoire » : ce peut être un verre
    // lors des fêtes. Majeure, plus critique (le tabac est lu par M0_Q09).
    questionId: 'M0_Q08',
    theme: 'projet',
    label: 'Tabac, alcool, substances',
    topic: 'Le tabac, l’alcool et les substances',
    severity: pairs({ AC: 'majeure', AD: 'moderee' }, 'mineure'),
    supersededBy: ['M0_Q11', 'M0_Q13'],
    skipIfFlagged: ['M0_Q09', 'M0_Q12'],
  },
  {
    questionId: 'M2_Q03',
    theme: 'communication',
    label: 'Besoin relationnel fondamental',
    topic: 'Le besoin relationnel fondamental',
    // V7 : une seule affirmation abstraite ne fait plus une majeure.
    severity: pairs({ AB: 'moderee', AC: 'mineure', BC: 'mineure' }, 'mineure'),
    convergence: {
      C: "Vous cherchez tous les deux l'équilibre entre intimité et liberté",
    },
    supersededBy: ['M2_Q23'],
  },
  {
    questionId: 'M2_Q08',
    theme: 'communication',
    label: 'S’excuser en premier',
    topic: 'S’excuser en premier',
    severity: pairs(
      { AD: 'moderee', BD: 'mineure', CD: 'mineure', AC: 'mineure' },
      'mineure',
    ),
    sameRisk: { D: 'moderee', C: 'moderee' },
    supersededBy: ['M2_Q22'],
  },
  {
    questionId: 'M5_Q04',
    theme: 'intimite',
    label: 'Amitiés avec le sexe opposé',
    topic: 'Les amitiés avec l’autre sexe',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    supersededBy: ['M5_Q09'],
  },
  {
    questionId: 'M6_Q01',
    theme: 'communication',
    label: 'Comportement en dispute',
    topic: 'Le comportement en dispute',
    // V5 : « signal rouge si deux D → impasse certaine » ; V7 : confirmé.
    sameRisk: { D: 'majeure', C: 'moderee' },
    confirmShared: (x) => withdrawalConfirmed(x, 'M6_Q01'),
    severity: pairs({
      AD: 'majeure',
      BD: 'moderee',
      AC: 'moderee',
      CD: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
    }),
    convergence: {
      B: 'Vous prenez tous les deux du recul avant de revenir calmes',
    },
    supersededBy: ['M6_Q16'],
  },
  {
    questionId: 'M6_Q07',
    theme: 'intimite',
    label: "Rythme d'intimité",
    topic: "Le rythme d'intimité",
    severity: unless(
      'D',
      pairs({ AC: 'majeure', AB: 'moderee', BC: 'mineure' }),
    ),
    discreet: true,
    supersededBy: ['M10_Q18'],
  },
  {
    // « Les tentations existent » face à « absolue » : une réponse honnête et
    // ambiguë, plus une incompatibilité déclarée.
    questionId: 'M6_Q10',
    theme: 'intimite',
    label: 'Fidélité',
    topic: 'La fidélité',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      BC: 'mineure',
      CD: 'mineure',
      AB: 'mineure',
    }),
    // Effet plafond : presque tout le monde répond « absolue ».
    discreet: true,
    supersededBy: ['M6_Q18'],
  },
  {
    questionId: 'M7_Q01',
    theme: 'projet',
    label: 'Vie rêvée dans cinq ans',
    topic: 'La vie rêvée dans cinq ans',
    // Options non exclusives : plus de majeure.
    severity: pairs({
      AC: 'moderee',
      BC: 'moderee',
      CD: 'moderee',
      AB: 'mineure',
      AD: 'mineure',
      BD: 'mineure',
    }),
    supersededBy: ['M7_Q19'],
  },
];

/** Convergences positives sans comparaison (scénarios sur soi : seule une même bonne pratique se signale). */
const POSITIVE_CONVERGENCES: Array<{
  questionId: string;
  key: string;
  theme: Theme;
  topic: string;
  label: string;
}> = [
  {
    questionId: 'M6_Q16',
    key: 'A',
    theme: 'communication',
    topic: 'La pause quand la tension monte',
    label:
      'Vous savez tous les deux proposer une pause, puis revenir en parler',
  },
  {
    questionId: 'M6_Q17',
    key: 'A',
    theme: 'communication',
    topic: 'Le besoin de pause de l’autre',
    label: 'Vous respectez tous les deux le besoin de pause de l’autre',
  },
  {
    questionId: 'M8_Q14',
    key: 'A',
    theme: 'projet',
    topic: 'Les désaccords qui durent',
    label: 'Vous acceptez tous les deux que certains désaccords durent',
  },
  {
    questionId: 'M9_Q25',
    key: 'A',
    theme: 'communication',
    topic: 'L’attention au quotidien',
    label: 'Vous prenez tous les deux le temps d’écouter l’autre, même occupés',
  },
];

export function questionText(questionId: string): string {
  return QUESTION_INDEX.get(questionId)?.text ?? questionId;
}

export function optionText(questionId: string, key: string): string {
  // Choix multiple (« A,C ») : « Échanger des messages…, Revoir un(e) ex… ».
  return answerText(QUESTION_INDEX.get(questionId), key);
}

const view = (id: string, key: string): AnswerView => ({
  key,
  text: optionText(id, key),
});

/** Ce que le moteur accumule pendant la comparaison. */
class Collector {
  divergences: Divergence[] = [];
  convergences: Convergence[] = [];
  private points: Array<{
    questionId: string;
    value?: number;
    divergence?: Divergence;
  }> = [];
  /** Divergences de fond (règles), que les déclarations peuvent ajuster. */
  adjustable = new Set<Divergence>();
  /** Relevées par une déclaration de non-négociable : P9 n'y touche plus. */
  declared = new Set<Divergence>();
  compared = 0;

  diverge(d: Divergence, adjustable = !d.shared): void {
    this.divergences.push(d);
    this.points.push({ questionId: d.questionId, divergence: d });
    if (adjustable) this.adjustable.add(d);
    this.compared++;
  }

  /** Point de comparaison sans divergence (identiques : 1 ; compatibles : 0,85). */
  agree(questionId: string, value: number): void {
    this.points.push({ questionId, value });
    this.compared++;
  }

  converge(c: Convergence): void {
    this.convergences.push(c);
  }

  comparisons(): Comparison[] {
    return this.points.map((p) => ({
      questionId: p.questionId,
      value: p.divergence
        ? SEVERITY_SIMILARITY[p.divergence.severity]
        : (p.value ?? COMPATIBLE_DIFFERENT),
    }));
  }
}

function isDiscreet(rule: Rule, key: string): boolean {
  return Array.isArray(rule.discreet)
    ? rule.discreet.includes(key)
    : !!rule.discreet;
}

function applyRule(rule: Rule, a: RawAnswers, b: RawAnswers, c: Collector) {
  const ka = a[rule.questionId];
  const kb = b[rule.questionId];
  if (!ka || !kb) return;
  if (rule.supersededBy?.some((id) => a[id] && b[id])) return;
  if (
    rule.skipIfFlagged?.some((id) =>
      c.divergences.some((d) => d.questionId === id),
    )
  )
    return;

  const same = ka === kb;
  let severity: Severity | null = same
    ? (rule.sameRisk?.[ka] ?? null)
    : rule.severity(ka, kb);
  const shared = same && severity !== null;
  if (
    shared &&
    severity === 'majeure' &&
    rule.confirmShared &&
    !rule.confirmShared(a) &&
    !rule.confirmShared(b)
  )
    severity = 'moderee';

  if (severity === null) {
    if (rule.risksOnly) return;
    c.agree(
      rule.questionId,
      same ? 1 : (rule.similarity?.(ka, kb) ?? COMPATIBLE_DIFFERENT),
    );
    if (rule.silent) return;
    const label = rule.convergenceFor
      ? rule.convergenceFor(ka, kb)
      : same
        ? (rule.convergence?.[ka] ??
          `Même réponse sur « ${rule.topic.charAt(0).toLowerCase()}${rule.topic.slice(1)} »`)
        : null;
    if (label && !isDiscreet(rule, ka)) {
      const common = answerKeys(ka).filter((k) => answerKeys(kb).includes(k));
      c.converge({
        questionId: rule.questionId,
        theme: rule.theme,
        label,
        answer: optionText(rule.questionId, same ? ka : common.join(',')),
        topic: rule.topic,
      });
    }
    return;
  }

  if (rule.silent) {
    c.agree(rule.questionId, SEVERITY_SIMILARITY[severity]);
    return;
  }
  c.diverge({
    questionId: rule.questionId,
    theme: rule.theme,
    severity,
    label: rule.label,
    question: questionText(rule.questionId),
    a: view(rule.questionId, ka),
    b: view(rule.questionId, kb),
    ...(shared ? { shared: true } : {}),
  });
}

// ─── Règles croisées : plusieurs questions, ou une question V7 et sa version V6 ─

/** Culture : « la même culture » (M1_Q02) face à des origines sans rien de commun (M1_Q01). */
function cultureRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  if (!a.M1_Q01 || !b.M1_Q01) return;
  const wants = [a.M1_Q02, b.M1_Q02];
  if (!wants[0] && !wants[1]) return;
  // Double origine : une origine commune suffit.
  const common = answerKeys(a.M1_Q01).some((k) =>
    answerKeys(b.M1_Q01).includes(k),
  );
  if (common) {
    c.agree('M1_Q02', 1);
    if (wants.some((w) => w === 'A' || w === 'B'))
      c.converge({
        questionId: 'M1_Q02',
        theme: 'famille',
        label: 'Vous partagez une origine culturelle',
        answer: optionText('M1_Q01', a.M1_Q01),
        topic: 'L’origine culturelle',
      });
    return;
  }
  const severity: Severity | null = wants.includes('A')
    ? 'majeure'
    : wants.includes('B')
      ? 'mineure'
      : null;
  if (!severity) {
    c.agree('M1_Q02', COMPATIBLE_DIFFERENT);
    return;
  }
  c.diverge({
    questionId: 'M1_Q02',
    theme: 'famille',
    severity,
    label: 'Culture du partenaire idéal',
    question: questionText('M1_Q02'),
    a: view('M1_Q01', a.M1_Q01),
    b: view('M1_Q01', b.M1_Q01),
  });
}

const strictFaith = (r: FaithRequirement | null) =>
  r === 'exclusive' || r === 'conversion';

/**
 * Deux religions ou convictions différentes (P3) : une conversion exigée face
 * à quelqu'un qui garderait la sienne est une incompatibilité déclarée ; face
 * à quelqu'un qui pourrait adopter celle de l'autre, ou qui ne l'a pas dit,
 * elle reste une divergence majeure.
 */
function faithGap(
  ra: FaithRequirement | null,
  rb: FaithRequirement | null,
): Severity {
  if (strictFaith(ra) || strictFaith(rb)) {
    if (strictFaith(ra) && strictFaith(rb)) return 'critique';
    const other = strictFaith(ra) ? rb : ra;
    return other === 'ouvert' || other === null ? 'majeure' : 'critique';
  }
  if (ra === 'souhait' || rb === 'souhait') return 'moderee';
  return 'mineure';
}

const SAME_FAITH: Partial<Record<string, string>> = {
  chretien: 'Vous partagez la même foi chrétienne',
  musulman: 'Vous partagez la même foi musulmane',
  juif: 'Vous partagez la même foi juive',
  bouddhiste_hindou: 'Vous partagez une spiritualité bouddhiste ou hindoue',
  traditionnel: 'Vous partagez une religion traditionnelle',
  spirituel: 'Vous vivez tous les deux une spiritualité personnelle',
  sans: 'Vous êtes tous les deux sans religion',
};

/** Religion (V7 : M1_Q16 à M1_Q18 ; V6 : M1_Q05 et M1_Q06), puis pratique. */
function faithRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  const fa = faithOf(a);
  const fb = faithOf(b);
  if (!fa || !fb) return;
  const qid =
    fa.questionId === 'M1_Q16' && fb.questionId === 'M1_Q16'
      ? 'M1_Q16'
      : 'M1_Q05';
  const ra = faithRequirement(a);
  const rb = faithRequirement(b);
  const religionDivergence = (severity: Severity) =>
    c.diverge({
      questionId: qid,
      theme: 'spiritualite',
      severity,
      label: 'Religion et place de la foi dans le couple',
      question: questionText(qid),
      a: view(fa.questionId, fa.key),
      b: view(fb.questionId, fb.key),
    });

  if (fa.family !== fb.family) {
    religionDivergence(faithGap(ra, rb));
    return;
  }
  if (fa.family === 'autre') {
    // Deux « autre religion » : peut-être pas la même ; ni écart ni accord affiché.
    c.agree(qid, COMPATIBLE_DIFFERENT);
  } else if (
    fa.family === 'chretien' &&
    fa.questionId === 'M1_Q16' &&
    fb.questionId === 'M1_Q16' &&
    fa.key !== fb.key
  ) {
    // Deux confessions chrétiennes : un écart seulement si l'un exige la sienne.
    if (strictFaith(ra) || strictFaith(rb)) religionDivergence('moderee');
    else c.agree(qid, COMPATIBLE_DIFFERENT);
  } else {
    c.agree(qid, 1);
    const label = SAME_FAITH[fa.family];
    if (label)
      c.converge({
        questionId: qid,
        theme: 'spiritualite',
        label,
        answer: optionText(fa.questionId, fa.key),
        topic: 'La religion',
      });
  }

  // Pratique (V7) : l'écart de pratique pèse davantage que l'appartenance.
  if (a.M1_Q17 && b.M1_Q17) {
    applyRule(PRACTICE_RULE, a, b, c);
  } else if (a.M1_Q06 && b.M1_Q06 && !a.M1_Q18 && !b.M1_Q18) {
    // V6 : place de la foi, même à religion égale.
    applyRule(FAITH_PLACE_RULE, a, b, c);
  }
}

const PRACTICE_RULE: Rule = {
  questionId: 'M1_Q17',
  theme: 'spiritualite',
  label: 'Pratique religieuse',
  topic: 'La pratique religieuse',
  severity: pairs({
    AD: 'majeure',
    AC: 'moderee',
    BD: 'moderee',
    AB: 'mineure',
    BC: 'mineure',
    CD: 'mineure',
  }),
  convergence: {
    A: 'Vous pratiquez tous les deux chaque jour',
    B: 'Vous pratiquez tous les deux chaque semaine',
    C: 'Vous pratiquez tous les deux surtout lors des fêtes',
  },
};

const FAITH_PLACE_RULE: Rule = {
  questionId: 'M1_Q06',
  theme: 'spiritualite',
  label: 'Place de la foi dans le couple',
  topic: 'La place de la foi dans le couple',
  severity: pairs({
    AD: 'majeure',
    AC: 'moderee',
    BD: 'moderee',
    AB: 'mineure',
    BC: 'mineure',
    CD: 'mineure',
  }),
  convergence: {
    A: 'Partager la même foi compte pour vous deux',
    D: 'La religion relève de l’intime pour vous deux',
  },
};

const FOOD_SAME: Record<string, string> = {
  halal: 'Vous mangez tous les deux halal',
  casher: 'Vous mangez tous les deux casher',
  vegetarien: 'Vous êtes tous les deux végétariens ou végans',
  souple: 'Vous adaptez tous les deux vos habitudes alimentaires au contexte',
  aucune: 'Vous mangez tous les deux de tout',
};

/**
 * Habitudes alimentaires (V7 : M1_Q19 ; V6 : M1_Q09). Deux règles strictes
 * différentes (halal, casher, végétarien) ne partagent pas forcément un repas :
 * la convergence n'est donnée que pour la même règle.
 */
function foodRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  const fa = foodRuleOf(a);
  const fb = foodRuleOf(b);
  if (!fa || !fb) return;
  const qid =
    fa.questionId === 'M1_Q19' && fb.questionId === 'M1_Q19'
      ? 'M1_Q19'
      : 'M1_Q09';
  const x = fa.food;
  const y = fb.food;
  let severity: Severity | null = null;
  let sameKey: string | null = null;
  if (x.kind === 'strict' && y.kind === 'strict') {
    if (x.rule && y.rule && x.rule !== y.rule) severity = 'moderee';
    else if (x.rule && x.rule === y.rule && x.rule !== 'autre')
      sameKey = x.rule;
  } else if (x.kind === 'strict' || y.kind === 'strict') {
    const other = x.kind === 'strict' ? y : x;
    severity = other.kind === 'aucune' ? 'moderee' : 'mineure';
  } else if (x.kind === y.kind) {
    sameKey = x.kind;
  }
  if (severity) {
    c.diverge({
      questionId: qid,
      theme: 'spiritualite',
      severity,
      label: 'Habitudes alimentaires',
      question: questionText(qid),
      a: view(fa.questionId, fa.key),
      b: view(fb.questionId, fb.key),
    });
    return;
  }
  c.agree(qid, sameKey ? 1 : COMPATIBLE_DIFFERENT);
  if (sameKey)
    c.converge({
      questionId: qid,
      theme: 'spiritualite',
      label: FOOD_SAME[sameKey],
      answer: optionText(fa.questionId, fa.key),
      topic: 'Les habitudes alimentaires',
    });
}

/**
 * Tabac : ce que l'un refuse chez l'autre (M0_Q11 ; V6 : M0_Q08) face à ce
 * que l'autre fait (M0_Q09). Un fumeur qui a répondu « sans importance » pour
 * l'autre est donc repéré. « Je ne pourrais pas vivre avec » face à un fumeur
 * régulier : incompatibilité déclarée ; face à un fumeur occasionnel :
 * majeure (critique si le tabac est déclaré non négociable).
 */
function tobaccoRule(
  a: RawAnswers,
  b: RawAnswers,
  rawA: RawAnswers,
  rawB: RawAnswers,
  c: Collector,
): void {
  let worst: Divergence | null = null;
  let comparable = false;
  for (const [refuser, smoker, rawRefuser, refuserIsA] of [
    [a, b, rawA, true],
    [b, a, rawB, false],
  ] as const) {
    const level = smoker.M0_Q09;
    const accept = refuser.M0_Q11;
    if (!accept || (level !== 'B' && level !== 'C')) continue;
    comparable = true;
    const severity: Severity | null =
      accept === 'A'
        ? level === 'C'
          ? 'critique'
          : 'majeure'
        : accept === 'B' && level === 'C'
          ? 'moderee'
          : null;
    if (!severity) continue;
    if (worst && SEVERITY_RANK[worst.severity] >= SEVERITY_RANK[severity])
      continue;
    const refusal = rawRefuser.M0_Q11
      ? view('M0_Q11', accept)
      : view('M0_Q08', rawRefuser.M0_Q08);
    const habit = view('M0_Q09', level);
    worst = {
      questionId: 'M0_Q09',
      theme: 'projet',
      severity,
      label: 'Tabac',
      question: questionText('M0_Q09'),
      a: refuserIsA ? refusal : habit,
      b: refuserIsA ? habit : refusal,
    };
  }
  if (worst) c.diverge(worst);
  else if (comparable) c.agree('M0_Q09', COMPATIBLE_DIFFERENT);
}

/**
 * Alcool : ce que l'un accepte (M0_Q13) face à ce que l'autre boit (M0_Q12).
 * « Même occasionnel, non » face à un verre lors des fêtes : majeure (critique
 * si l'alcool est déclaré non négociable) ; face à une consommation chaque
 * semaine ou presque quotidienne : incompatibilité déclarée. Un « rédhibitoire »
 * V6 (M0_Q08, tabac, alcool ou substances mêlés) n'est qu'un sujet à explorer.
 */
function alcoholRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  let worst: Divergence | null = null;
  let comparable = false;
  for (const [refuser, drinker, refuserIsA] of [
    [a, b, true],
    [b, a, false],
  ] as const) {
    const level = drinker.M0_Q12;
    if (!level || level === 'A') continue;
    const accept = refuser.M0_Q13;
    const legacyRefusal = !accept && refuser.M0_Q08 === 'A';
    if (!accept && !legacyRefusal) continue;
    comparable = true;
    const severity: Severity | null = legacyRefusal
      ? level === 'C' || level === 'D'
        ? 'moderee'
        : null
      : accept === 'A'
        ? level === 'B'
          ? 'majeure'
          : 'critique'
        : accept === 'B'
          ? level === 'D'
            ? 'majeure'
            : level === 'C'
              ? 'moderee'
              : null
          : null;
    if (!severity) continue;
    if (worst && SEVERITY_RANK[worst.severity] >= SEVERITY_RANK[severity])
      continue;
    const refusal = legacyRefusal
      ? view('M0_Q08', 'A')
      : view('M0_Q13', accept);
    const habit = view('M0_Q12', level);
    worst = {
      questionId: 'M0_Q12',
      theme: 'projet',
      severity,
      label: 'Alcool',
      question: questionText('M0_Q12'),
      a: refuserIsA ? refusal : habit,
      b: refuserIsA ? habit : refusal,
    };
  }
  if (worst) c.diverge(worst);
  else if (comparable) c.agree('M0_Q12', COMPATIBLE_DIFFERENT);
}

/**
 * Disponibilité : une relation précédente pas tout à fait terminée (ou une
 * rupture récente dont on se remet encore) face à quelqu'un qui envisage un
 * engagement dans les douze mois. Sujet à explorer, jamais plus.
 */
function availabilityRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  for (const [x, y, xIsA] of [
    [a, b, true],
    [b, a, false],
  ] as const) {
    if (!stillAttached(x) || y.M8_Q02 !== 'A') continue;
    const situation =
      x.M3_Q11 === 'A' || x.M3_Q11 === 'B'
        ? view('M3_Q11', x.M3_Q11)
        : view('M0_Q04', 'D');
    const hurry = view('M8_Q02', 'A');
    c.diverge({
      questionId: 'M3_Q11',
      theme: 'projet',
      severity: 'moderee',
      label: 'Disponibilité et rythme d’engagement',
      question: questionText('M3_Q11'),
      a: xIsA ? situation : hurry,
      b: xIsA ? hurry : situation,
    });
    return;
  }
}

/** Fusionne les réponses de tous les modules d'un entretien (rawResponses par module). */
export function collectRawAnswers(
  responses: Array<{ rawResponses: unknown }> | undefined | null,
): RawAnswers {
  const merged: RawAnswers = {};
  for (const r of responses ?? []) {
    const raw = r?.rawResponses;
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof v === 'string' && v.length > 0) merged[k] = v;
      }
    }
  }
  return merged;
}

const up: Record<Severity, Severity> = {
  mineure: 'mineure',
  moderee: 'majeure',
  majeure: 'critique',
  critique: 'critique',
};

/** Limites de sécurité : jamais adoucies par une déclaration ou une croyance. */
const SAFETY_QUESTIONS = new Set(['M6_Q04', 'M6_Q05']);

/**
 * P2 — ce qui est non négociable (M8_Q12). Une divergence sur un sujet
 * déclaré non négociable par l'un des deux monte d'un cran (modérée →
 * majeure, majeure → incompatibilité déclarée) ; quand les deux membres ont
 * répondu et qu'aucun n'a déclaré ce sujet, une majeure redevient un sujet à
 * explorer. Généralise la ligne rouge V6 (M8_Q05 = « enfants ou religion »).
 */
function applyNonNegotiables(a: RawAnswers, b: RawAnswers, c: Collector) {
  const na = nonNegotiablesOf(a);
  const nb = nonNegotiablesOf(b);
  if (!na && !nb) return;
  for (const d of c.adjustable) {
    const key = nonNegotiableThemeOf(d.questionId);
    if (!key) continue;
    if (na?.keys.has(key) || nb?.keys.has(key)) {
      const raised = up[d.severity];
      if (raised !== d.severity) {
        d.severity = raised;
        d.nonNegotiable = true;
      }
      c.declared.add(d);
    } else if (na?.explicit && nb?.explicit && d.severity === 'majeure') {
      d.severity = 'moderee';
    }
  }
}

/**
 * P9 — désaccords qui durent (M8_Q14). Croire qu'un désaccord durable prouve
 * qu'on n'est pas faits l'un pour l'autre fait monter d'un cran la divergence
 * modérée la plus importante (une seule) ; deux membres qui acceptent les
 * désaccords durables gardent les divergences modérées au rang de nuances.
 */
function applyPerpetualProblems(a: RawAnswers, b: RawAnswers, c: Collector) {
  const candidates = [...c.adjustable]
    .filter(
      (d) =>
        d.severity === 'moderee' &&
        !SAFETY_QUESTIONS.has(d.questionId) &&
        !c.declared.has(d),
    )
    .sort((x, y) => THEMES[x.theme].order - THEMES[y.theme].order);
  if (a.M8_Q14 === 'C' || b.M8_Q14 === 'C') {
    if (candidates[0]) candidates[0].severity = 'majeure';
  } else if (a.M8_Q14 === 'A' && b.M8_Q14 === 'A') {
    for (const d of candidates) d.severity = 'mineure';
  }
}

export function buildDivergenceReport(
  rawA: RawAnswers,
  rawB: RawAnswers,
): DivergenceReport {
  // Réponses V6 lues dans les termes de la V7 quand le sens est le même.
  const a = upgradeAnswers(rawA);
  const b = upgradeAnswers(rawB);
  const c = new Collector();

  for (const rule of DIVERGENCE_RULES) applyRule(rule, a, b, c);
  cultureRule(a, b, c);
  faithRule(a, b, c);
  foodRule(a, b, c);
  tobaccoRule(a, b, rawA, rawB, c);
  alcoholRule(a, b, c);
  availabilityRule(a, b, c);
  for (const rule of LEGACY_RULES) applyRule(rule, a, b, c);
  for (const p of POSITIVE_CONVERGENCES) {
    if (a[p.questionId] === p.key && b[p.questionId] === p.key)
      c.converge({
        questionId: p.questionId,
        theme: p.theme,
        label: p.label,
        answer: optionText(p.questionId, p.key),
        topic: p.topic,
      });
  }

  applyNonNegotiables(a, b, c);
  applyPerpetualProblems(a, b, c);

  // Échelles (attachement, émotions, dispute) : tendances croisées des deux membres.
  const divergences = [
    ...c.divergences,
    ...psychometricDivergences(a, b, c.divergences),
  ];

  divergences.sort(
    (x, y) =>
      SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity] ||
      x.theme.localeCompare(y.theme),
  );

  const rawPenalty = divergences.reduce(
    (sum, d) => sum + SEVERITY_PENALTY[d.severity],
    0,
  );
  const penalty = Math.min(MAX_PENALTY, Math.round(rawPenalty * 100) / 100);
  const hardStop = divergences.some((d) => d.severity === 'critique');
  const convergences = c.convergences;

  const themes: ThemeSummary[] = THEME_LIST.map((theme) => {
    const divs = divergences.filter((d) => d.theme === theme);
    const convs = convergences.filter((x) => x.theme === theme);
    const worst = divs.length ? divs[0].severity : null;
    const status: ThemeSummary['status'] =
      divs.length === 0 && convs.length === 0
        ? 'inconnu'
        : worst === 'critique' || worst === 'majeure'
          ? 'divergence'
          : worst === 'moderee'
            ? 'a_discuter'
            : 'aligne';
    return {
      theme,
      label: THEMES[theme].label,
      emoji: THEMES[theme].emoji,
      divergences: divs.length,
      convergences: convs.length,
      worst,
      status,
    };
  });

  return {
    divergences,
    convergences,
    themes,
    penalty,
    hardStop,
    comparedQuestions: c.compared,
    comparisons: c.comparisons(),
  };
}

export interface CompatibilitySheet {
  /** « Ce qui vous rassemble » : 3 points maximum. */
  rassemble: string[];
  /** « Votre point de vigilance » : la divergence la plus grave, ou null. */
  vigilance: string | null;
  /** Lecture par thème pour l'affichage (statut par thème). */
  themes: ThemeSummary[];
  hardStop: boolean;
}

/** Fiche de compatibilité lisible, du point de vue du membre A regardant le membre B. */
export function buildCompatibilitySheet(
  report: DivergenceReport,
  partnerFirstName: string,
): CompatibilitySheet {
  const rassemble = report.convergences
    .filter((c) => !c.label.startsWith('Même réponse'))
    .slice(0, 3)
    .map((c) => c.label);
  for (const c of report.convergences) {
    if (rassemble.length >= 3) break;
    if (c.label.startsWith('Même réponse') && !rassemble.includes(c.label))
      rassemble.push(c.label);
  }

  const top = report.divergences[0];
  let vigilance: string | null = null;
  if (top) {
    const intensity =
      top.severity === 'critique'
        ? 'Incompatibilité déclarée'
        : top.severity === 'majeure'
          ? 'Divergence majeure'
          : top.severity === 'moderee'
            ? 'Divergence à explorer'
            : 'Nuance';
    const declared = top.nonNegotiable
      ? ' Ce sujet est non négociable pour l’un de vous.'
      : '';
    vigilance = top.shared
      ? `${intensity} — ${top.label.toLowerCase()} : vous avez répondu tous les deux « ${top.a.text} ».${declared} À aborder franchement pendant le Sondeur.`
      : `${intensity} — ${top.label.toLowerCase()} : vous avez répondu « ${top.a.text} », ${partnerFirstName} a répondu « ${top.b.text} ».${declared} À aborder franchement pendant le Sondeur.`;
  }

  return {
    rassemble,
    vigilance,
    themes: report.themes,
    hardStop: report.hardStop,
  };
}

export interface DiscussionTopic {
  id: string;
  theme: Theme;
  title: string;
  prompt: string;
}

/** Sujets à aborder : une entrée par thème en divergence, de la plus grave à la moins grave. */
export function buildDiscussionTopics(
  report: DivergenceReport,
  partnerFirstName: string,
  max = 3,
): DiscussionTopic[] {
  const seen = new Set<Theme>();
  const topics: DiscussionTopic[] = [];
  for (const d of report.divergences) {
    if (seen.has(d.theme) || d.severity === 'mineure') continue;
    seen.add(d.theme);
    topics.push({
      id: d.questionId,
      theme: d.theme,
      title: `${THEMES[d.theme].emoji} ${THEMES[d.theme].label} — ${d.label.toLowerCase()}`,
      prompt: d.shared
        ? `Vous avez répondu tous les deux « ${d.a.text} ». Le jour où cela arrivera entre vous, qui fera le premier pas, et comment ?`
        : `Vous : « ${d.a.text} ». ${partnerFirstName} : « ${d.b.text} ». Qu'est-ce qui, pour chacun de vous, rend cette position importante ?`,
    });
    if (topics.length >= max) break;
  }
  return topics;
}
