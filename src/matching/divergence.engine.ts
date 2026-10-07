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
  isV7Interview,
} from '../interview/questions.data';
import {
  STYLE_HIGH,
  buildPsychProfile,
  psychometricDivergences,
} from '../psychometrics/psychometrics';
import {
  Faith,
  FaithRequirement,
  faithOf,
  faithRequirement,
  foodRuleOf,
  keysWithout,
  nonNegotiableThemesOf,
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
  /**
   * V7.1 — tendance tirée de l'entretien (contrôle, justification de la
   * violence) : seul le sujet est affiché, jamais les réponses ni le membre
   * concerné.
   */
  neutral?: boolean;
  /**
   * V7.1 — sujet central que l'un des deux n'a pas renseigné (sans accord
   * pour les données sensibles) : affiché comme tel, jamais comme une
   * réponse.
   */
  undisclosed?: boolean;
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

/**
 * V7.1 — où vit chacun (« Ville, Pays » de l'inscription, normalisé : voir
 * `homeContext` dans discover-filters.ts). Les réponses « je reste où je
 * suis » n'ont de sens qu'avec le lieu : sans lui, elles sont lues comme
 * avant.
 */
export interface ReportContext {
  cityA?: string | null;
  cityB?: string | null;
  countryA?: string | null;
  countryB?: string | null;
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
  /**
   * V7.1 — un fait sur soi (avoir des enfants, la place de son ex) : jamais
   * comparé comme une préférence, ni écart ni point d'affinité ; seul un
   * accord qui a sa phrase est affiché. Ce que l'autre accepte de ce fait se
   * compare par une règle croisée.
   */
  fact?: boolean;
  /**
   * V7.1 — réponses relatives au lieu où chacun vit (« je reste où je
   * suis ») : deux réponses identiques ne sont ni un accord ni un point
   * d'affinité quand les deux membres ne vivent pas au même endroit
   * (`homeRule` les lit).
   */
  relative?: string[];
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

/**
 * Retrait en dispute confirmé par une autre réponse (échelle, scénario,
 * réparation). V7.1 : le point neutre (50, « parfois ») ne confirme rien ;
 * il faut le pôle haut de l'échelle (60 et plus).
 */
function withdrawalConfirmed(x: RawAnswers, exclude: string): boolean {
  const p = buildPsychProfile(x);
  return (
    (p.conflict.stonewalling ?? 0) >= STYLE_HIGH ||
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
    relative: ['C', 'D'],
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
    relative: ['A'],
  },
  {
    // V7.1 — le retour au pays d'origine de sa famille, projet fréquent
    // dans la diaspora : un projet proche face à « ma vie est ici » est
    // majeur.
    questionId: 'M7_Q36',
    theme: 'lieu',
    label: 'Retour au pays d’origine',
    topic: 'Le retour au pays d’origine',
    severity: pairs({
      AC: 'majeure',
      BC: 'moderee',
      AB: 'mineure',
      AD: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      C: 'Vous voyez tous les deux votre vie là où vous vivez aujourd’hui',
    },
    // Deux « je vis déjà au pays » : peut-être pas le même pays.
    discreet: ['D'],
    relative: ['C'],
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
    // V7.1 : « oui, si les conditions sont réunies » face à « non, c'est
    // définitif » est le non-négociable le plus robuste de la recherche sur
    // les critères de rupture : une incompatibilité déclarée, comme « oui,
    // absolument ». « Je ne suis pas certain(e) » face à « non » : majeure.
    severity: pairs({
      AD: 'critique',
      BD: 'critique',
      CD: 'majeure',
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
    // V7.1 : un fait, plus une préférence ; l'acceptation des enfants de
    // l'autre (M0_Q14) se compare à lui (`childrenAcceptRule`).
    fact: true,
    severity: () => null,
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
    // V7.1 : deux « je suis leur avis pour garder la paix » (fusion), deux
    // oppositions vives ou deux prises de distance (coupure) ne sont pas un
    // accord : personne ne tient la position du couple (Bowen).
    sameRisk: { A: 'moderee', C: 'moderee', D: 'moderee' },
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
    // V7.1 : deux attentes que « ça se règle naturellement », ou deux
    // « ne le prends pas à cœur » : personne ne protège le partenaire.
    sameRisk: { C: 'moderee', D: 'moderee' },
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
    // V7.1 — une tape ou une fessée pour éduquer : « une bonne éducation »
    // face à « jamais, c'est une violence » est majeure. Aucune convergence
    // affichée sur une tolérance partagée.
    questionId: 'M8_Q20',
    theme: 'famille',
    label: 'Punitions corporelles',
    topic: 'Les punitions corporelles',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      D: 'Vous refusez tous les deux toute tape pour éduquer un enfant',
    },
    discreet: ['A', 'B'],
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
    // V7.1 — remplace M4_Q07, posée à tous : « indispensable » face à « je
    // n'y adhère pas » est une incompatibilité déclarée ; face à quelqu'un
    // qui la respecterait sans la pratiquer, une nuance.
    questionId: 'M4_Q17',
    theme: 'famille',
    label: 'Dot',
    topic: 'La dot',
    severity: pairs({
      AD: 'critique',
      BD: 'majeure',
      AC: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'La dot est indispensable pour vous deux',
      B: 'La dot compte pour vous deux, sous une forme symbolique ou modernisée',
    },
  },
  {
    questionId: 'M3_Q05',
    theme: 'famille',
    label: "Place de l'ex",
    topic: "La place de l'ex",
    // V7.1 : « aucune place à mon ex » ne dit pas ce que l'on accepte chez
    // l'autre ; comparée à M3_Q13 (`exTiesRule`).
    fact: true,
    severity: () => null,
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
    // V7.1 — remplace M4_Q05, posée à tous (un couple mixte n'était jamais
    // comparé) : « un devoir qui ne se discute pas » face à « jamais l'argent
    // du foyer » est une incompatibilité déclarée.
    questionId: 'M4_Q16',
    theme: 'argent',
    label: 'Aide financière à la famille',
    topic: "L'aide financière à la famille",
    severity: pairs({
      AD: 'critique',
      AC: 'majeure',
      BD: 'majeure',
      CD: 'moderee',
      AB: 'moderee',
      BC: 'mineure',
    }),
    convergence: {
      A: 'Aider votre famille est pour vous deux un devoir régulier',
      B: 'Vous décideriez tous les deux à deux de l’aide à vos familles',
      D: 'Pour vous deux, l’argent du foyer reste au foyer',
    },
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
    // V7.1 — remplace M1_Q11 (cérémonies : règle croisée `marriageRule`).
    // Exclue (avec ou sans discussion) face à « envisageable » : une
    // incompatibilité déclarée ; « pas de position arrêtée » face à
    // « exclue sans discussion » : majeure.
    questionId: 'M1_Q20',
    theme: 'spiritualite',
    label: 'Polygamie',
    topic: 'La polygamie',
    severity: pairs({
      AC: 'critique',
      BC: 'critique',
      AD: 'majeure',
      BD: 'moderee',
      CD: 'moderee',
      AB: 'mineure',
    }),
    convergence: {
      A: 'Monogamie exclusive pour vous deux',
      B: 'Vous excluez tous les deux la polygamie pour votre couple',
    },
    // Deux positions non arrêtées : ni écart ni accord à afficher.
    discreet: ['D'],
  },

  // ── Intimité & sexualité
  {
    // V7 — remplace M6_Q10 : des réponses ordonnées, sans jugement moral.
    // V7.1 : la question mesure la réaction à une infidélité, pas la
    // fidélité : pardonner n'est pas être infidèle. Elle ne relève plus du
    // thème « fidélité » de M8_Q12 et pèse peu ; ce que chacun appelle
    // « tromper » (M6_Q19) reste la vraie divergence.
    questionId: 'M6_Q18',
    theme: 'intimite',
    label: 'Réaction à une infidélité',
    topic: 'La réaction à une infidélité',
    severity: pairs({
      AD: 'moderee',
      AC: 'mineure',
      BD: 'mineure',
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
    // V7.1 : « j'attends que l'autre revienne » face à « je ne m'excuse
    // pas » : personne ne fait le premier pas non plus (comme C/C et D/D).
    severity: (a, b) =>
      ['A', 'B'].includes(a) && ['A', 'B'].includes(b)
        ? null
        : pairs({ AD: 'moderee', CD: 'moderee' }, 'mineure')(a, b),
    // Deux attentes que l'autre revienne, ou deux refus de s'excuser : personne
    // ne fait le premier pas.
    sameRisk: { C: 'moderee', D: 'moderee' },
    convergence: {
      A: 'Vous savez tous les deux reconnaître votre part',
      B: 'Vous faites tous les deux un pas vers l’autre, même convaincus d’avoir raison',
    },
  },
  {
    // Limite de sécurité. « Ça dépend des circonstances » face à une limite
    // (absolue, ou « inacceptable ») : incompatibilité déclarée. Toute
    // tolérance partagée est un risque, jamais un accord ; deux « ça
    // dépend » : une incompatibilité déclarée (V7.1).
    questionId: 'M6_Q04',
    theme: 'communication',
    label: 'Limite face à la violence physique',
    topic: 'La limite face à la violence physique',
    severity: pairs({
      AC: 'critique',
      BC: 'critique',
      CD: 'majeure',
      AD: 'moderee',
      AB: 'mineure',
      BD: 'mineure',
    }),
    sameRisk: { B: 'moderee', C: 'critique', D: 'majeure' },
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
    // V7.1 — remplace M8_Q02 (délais exhaustifs, sans recoupement).
    questionId: 'M8_Q17',
    theme: 'projet',
    label: "Délai d'engagement",
    topic: "Le délai d'engagement",
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Vous envisagez tous les deux un engagement officiel dans l’année',
      B: 'Vous envisagez tous les deux un engagement officiel dans un à deux ans',
    },
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
    // V7.1 — vivre ensemble avant le mariage.
    questionId: 'M8_Q19',
    theme: 'projet',
    label: 'Vie commune avant le mariage',
    topic: 'La vie commune avant le mariage',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Vous attendez tous les deux le mariage pour vivre ensemble',
      B: 'Vous attendez tous les deux les fiançailles pour vivre ensemble',
    },
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
  // ── Questions V7 retirées en V7.1 (règles V7, lues quand la remplaçante
  // manque d'un côté ; les réponses de même sens sont traduites par
  // `answer-bridge.ts`).
  {
    // Remplacée par les cérémonies (M8_Q16) et la dot (M4_Q17).
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
    supersededBy: ['M8_Q16'],
  },
  {
    // Sujet abandonné (faible pouvoir de discrimination) : lu entre deux
    // entretiens antérieurs.
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
    questionId: 'M1_Q11',
    theme: 'spiritualite',
    label: 'Polygamie',
    topic: 'La polygamie',
    severity: (a, b) => {
      if (a === b) return null;
      if (a === 'D' || b === 'D')
        return a === 'A' || b === 'A' ? 'moderee' : 'mineure';
      return pairs({ AC: 'critique', BC: 'critique', AB: 'mineure' })(a, b);
    },
    convergence: { A: 'Monogamie exclusive pour vous deux' },
    supersededBy: ['M1_Q20'],
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
    supersededBy: ['M4_Q16'],
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
    supersededBy: ['M4_Q17'],
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
    supersededBy: ['M8_Q17'],
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
    supersededBy: ['M8_Q16'],
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
  /** Questions déjà lues par une règle croisée : leur règle simple est sautée. */
  handled = new Set<string>();
  /** V7.1 — les deux membres ne vivent pas au même endroit (`homeRule`). */
  apart = false;
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
  if (c.handled.has(rule.questionId)) return;
  if (c.apart && ka === kb && rule.relative?.includes(ka)) return;
  if (rule.supersededBy?.some((id) => a[id] && b[id])) return;
  if (rule.fact) {
    const label = ka === kb ? rule.convergence?.[ka] : undefined;
    if (label)
      c.converge({
        questionId: rule.questionId,
        theme: rule.theme,
        label,
        answer: optionText(rule.questionId, ka),
        topic: rule.topic,
      });
    return;
  }
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

/** Distance entre les deux lieux de vie : autre pays, autre ville, ou rien de connu. */
function distanceOf(ctx?: ReportContext): 'pays' | 'ville' | null {
  if (!ctx) return null;
  const { countryA, countryB, cityA, cityB } = ctx;
  if (countryA && countryB && countryA !== countryB) return 'pays';
  if (cityA && cityB && !cityA.includes(cityB) && !cityB.includes(cityA))
    return 'ville';
  return null;
}

/** « Non, je reste où je suis » (M0_Q03 D) : un refus net de déménager. */
const staysFirmly = (x: RawAnswers) => x.M0_Q03 === 'D';

/**
 * Attaché(e) à son lieu sans l'avoir dit nettement : se voit dans la même
 * ville dans cinq ans (M7_Q07 A) ou dit « ma vie est là où je vis » (M7_Q36
 * C), sans s'être dit prêt(e) à déménager (M0_Q03 A ou B).
 */
const staysHome = (x: RawAnswers) =>
  staysFirmly(x) ||
  (x.M0_Q03 !== 'A' &&
    x.M0_Q03 !== 'B' &&
    (x.M7_Q07 === 'A' || x.M7_Q36 === 'C'));

/**
 * V7.1 (B4) — lieu de vie : « je reste où je suis » et « la même ville
 * qu'aujourd'hui » sont relatifs. Deux membres qui vivent dans deux pays et
 * tiennent chacun à rester ne sont pas d'accord : ils ne pourront pas vivre
 * ensemble. Deux refus nets : critique ; un seul attachement, ou deux sans
 * refus net : majeure ; deux « cela dépend de la distance » : modérée (la
 * distance est un pays). Deux villes d'un même pays : majeure pour deux refus
 * nets, modérée pour deux attachements. Dans tous les cas, les réponses
 * relatives identiques ne comptent plus comme des accords (`relative`).
 */
function homeRule(
  a: RawAnswers,
  b: RawAnswers,
  ctx: ReportContext | undefined,
  c: Collector,
): void {
  const distance = distanceOf(ctx);
  if (!distance) return;
  c.apart = true;
  const answered = (x: RawAnswers) => !!(x.M0_Q03 || x.M7_Q07 || x.M7_Q36);
  if (!answered(a) || !answered(b)) return;
  const firm = [staysFirmly(a), staysFirmly(b)].filter(Boolean).length;
  const attached = [staysHome(a), staysHome(b)].filter(Boolean).length;
  let severity: Severity | null = null;
  if (distance === 'pays') {
    if (firm === 2) severity = 'critique';
    else if (attached > 0) severity = 'majeure';
    // Deux « cela dépend de la distance », et la distance est un pays.
    else if (a.M0_Q03 === 'C' && b.M0_Q03 === 'C') severity = 'moderee';
  } else if (attached === 2) {
    severity = firm === 2 ? 'majeure' : 'moderee';
  }
  if (!severity) return;
  c.handled.add('M0_Q03');
  const shown = (x: RawAnswers) =>
    x.M0_Q03
      ? view('M0_Q03', x.M0_Q03)
      : x.M7_Q07
        ? view('M7_Q07', x.M7_Q07)
        : view('M7_Q36', x.M7_Q36);
  c.diverge({
    questionId: 'M0_Q03',
    theme: 'lieu',
    severity,
    label:
      distance === 'ville'
        ? 'Chacun attaché à sa ville'
        : attached === 2
          ? 'Chacun attaché à son pays'
          : 'Vivre dans le même pays',
    question: questionText('M0_Q03'),
    a: shown(a),
    b: shown(b),
  });
}

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

/** V7.1 : bouddhiste (F) et hindoue (K), deux religions distinctes en V7. */
const SAME_FAITH_BY_KEY: Partial<Record<string, string>> = {
  F: 'Vous partagez la spiritualité bouddhiste',
  K: 'Vous partagez la foi hindoue',
};

/**
 * Deux réponses V7 (M1_Q16) d'une même famille qui désignent pourtant deux
 * religions : bouddhiste et hindoue (V7.1). La réponse V6 « bouddhiste /
 * hindouiste » reste compatible avec l'une comme avec l'autre.
 */
function distinctFaiths(fa: Faith, fb: Faith): boolean {
  return (
    fa.family === 'bouddhiste_hindou' &&
    fa.questionId === 'M1_Q16' &&
    fb.questionId === 'M1_Q16' &&
    fa.key !== fb.key
  );
}

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

  if (fa.family !== fb.family || distinctFaiths(fa, fb)) {
    religionDivergence(faithGap(ra, rb));
    return;
  }
  if (fa.family === 'autre') {
    // Deux « autre religion » : peut-être pas la même ; ni accord affiché,
    // et un écart à explorer si l'un exige la sienne (V7.1).
    if (strictFaith(ra) || strictFaith(rb)) religionDivergence('moderee');
    else c.agree(qid, COMPATIBLE_DIFFERENT);
  } else if (
    fa.family === 'bouddhiste_hindou' &&
    fa.questionId !== fb.questionId
  ) {
    // V6 « bouddhiste / hindouiste » face à une réponse V7 : compatible, sans
    // accord affiché (on ne sait pas laquelle des deux).
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
    const label =
      (fa.questionId === 'M1_Q16' ? SAME_FAITH_BY_KEY[fa.key] : undefined) ??
      SAME_FAITH[fa.family];
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

/** Cérémonies qui accomplissent un mariage (M8_Q16), pour les accords. */
const CEREMONY_WORDS: Record<string, string> = {
  A: 'le mariage civil',
  B: 'le mariage religieux',
  C: 'le mariage coutumier',
};

/**
 * V7.1 — cérémonies indispensables (M8_Q16, choix multiple ; V7 : M8_Q03,
 * traduite par la passerelle). Un mariage religieux exigé d'un seul côté :
 * à explorer, majeure face à quelqu'un sans religion ; un mariage coutumier
 * exigé d'un seul côté : à explorer ; seul le civil diffère : une nuance.
 * Accord sur les cérémonies communes.
 */
function marriageRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  if (!a.M8_Q16 || !b.M8_Q16) return;
  const needs = (x: RawAnswers) =>
    keysWithout(x.M8_Q16, 'D').filter((k) => k !== 'D');
  const ka = needs(a);
  const kb = needs(b);
  const onlyOne = (k: string) => ka.includes(k) !== kb.includes(k);
  const withoutFaith = (x: RawAnswers) => {
    const f = faithOf(x)?.family;
    return f === 'sans' || f === 'spirituel';
  };
  let severity: Severity | null = null;
  if (onlyOne('B')) {
    const other = ka.includes('B') ? b : a;
    severity = withoutFaith(other) ? 'majeure' : 'moderee';
  } else if (onlyOne('C')) severity = 'moderee';
  else if (onlyOne('A')) severity = 'mineure';
  if (severity) {
    c.diverge({
      questionId: 'M8_Q16',
      theme: 'spiritualite',
      severity,
      label: 'Cérémonies du mariage',
      question: questionText('M8_Q16'),
      a: view('M8_Q16', a.M8_Q16),
      b: view('M8_Q16', b.M8_Q16),
    });
    return;
  }
  c.agree('M8_Q16', 1);
  c.converge({
    questionId: 'M8_Q16',
    theme: 'spiritualite',
    label: ka.length
      ? `Pour vous deux, un mariage passe par ${joinWords(ka.map((k) => CEREMONY_WORDS[k]))}`
      : 'Aucune cérémonie n’est indispensable pour vous deux',
    answer: optionText('M8_Q16', ka.length ? ka.join(',') : 'D'),
    topic: 'Les cérémonies du mariage',
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
    // V7.1 : la réponse V6 (M0_Q08) mêlait tabac, alcool et substances ;
    // « rédhibitoire » ou « avec modération » face à un fumeur ne sont que
    // des sujets à explorer, jamais une incompatibilité déclarée.
    const legacy =
      !accept && ['A', 'B'].includes(refuser.M0_Q08)
        ? refuser.M0_Q08
        : undefined;
    if ((!accept && !legacy) || (level !== 'B' && level !== 'C')) continue;
    comparable = true;
    const severity: Severity | null = legacy
      ? legacy === 'A' && level === 'C'
        ? 'moderee'
        : 'mineure'
      : accept === 'A'
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
    // V7.1 : délai lu dans M8_Q17 (M8_Q02 traduite par la passerelle).
    if (!stillAttached(x) || y.M8_Q17 !== 'A') continue;
    const situation =
      x.M3_Q11 === 'A' || x.M3_Q11 === 'B'
        ? view('M3_Q11', x.M3_Q11)
        : view('M0_Q04', 'D');
    const hurry = view('M8_Q17', 'A');
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

/**
 * Origines culturelles communes (M1_Q01) ; null si l'un des deux ne l'a pas
 * dit (rien n'est supposé).
 */
function sameOrigin(a: RawAnswers, b: RawAnswers): boolean | null {
  if (!a.M1_Q01 || !b.M1_Q01) return null;
  return answerKeys(a.M1_Q01).some((k) => answerKeys(b.M1_Q01).includes(k));
}

/**
 * V7.1 — « tout se transmet » des deux côtés (M1_Q13 A), avec deux religions
 * ou deux cultures différentes : deux transmissions concurrentes, jamais un
 * accord. Majeure quand les religions diffèrent, à explorer quand seules les
 * origines diffèrent.
 */
function transmissionRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  if (a.M1_Q13 !== 'A' || b.M1_Q13 !== 'A') return;
  const fa = faithOf(a);
  const fb = faithOf(b);
  const otherFaith =
    !!fa && !!fb && (fa.family !== fb.family || distinctFaiths(fa, fb));
  const otherOrigin = sameOrigin(a, b) === false;
  if (!otherFaith && !otherOrigin) return;
  c.handled.add('M1_Q13');
  const answer = view('M1_Q13', 'A');
  c.diverge({
    questionId: 'M1_Q13',
    theme: 'famille',
    severity: otherFaith ? 'majeure' : 'moderee',
    label: 'Deux transmissions à concilier',
    question: questionText('M1_Q13'),
    a: answer,
    b: answer,
    shared: true,
  });
}

/**
 * V7.1 — accueillir les enfants de l'autre (M0_Q14) face aux enfants qu'il
 * ou elle a déjà (M0_Q05). Enfants à charge : « je ne pourrais pas
 * l'accepter » est une incompatibilité déclarée, « je préférerais l'éviter »
 * une divergence majeure, « s'ils ne vivent pas avec nous » un sujet à
 * explorer ; enfants autonomes : un cran en dessous.
 */
function childrenAcceptRule(a: RawAnswers, b: RawAnswers, c: Collector) {
  let worst: Divergence | null = null;
  let comparable = false;
  for (const [x, y, xIsA] of [
    [a, b, true],
    [b, a, false],
  ] as const) {
    const accept = x.M0_Q14;
    const kids = y.M0_Q05;
    if (!accept || !['B', 'C', 'D'].includes(kids)) continue;
    comparable = true;
    const table: Record<string, Severity> =
      kids === 'D'
        ? { D: 'moderee', C: 'mineure' }
        : { D: 'critique', C: 'majeure', B: 'moderee' };
    const severity = table[accept];
    if (!severity) continue;
    if (worst && SEVERITY_RANK[worst.severity] >= SEVERITY_RANK[severity])
      continue;
    const accepts = view('M0_Q14', accept);
    const has = view('M0_Q05', kids);
    worst = {
      questionId: 'M0_Q14',
      theme: 'famille',
      severity,
      label: 'Accueillir les enfants de l’autre',
      question: questionText('M0_Q14'),
      a: xIsA ? accepts : has,
      b: xIsA ? has : accepts,
    };
  }
  if (worst) c.diverge(worst);
  else if (comparable) c.agree('M0_Q14', 1);
}

/**
 * V7.1 — ce que l'un accepte des liens de l'autre avec son ex (M3_Q13) face
 * à la place que l'autre lui garde (M3_Q05). « Je ne pourrais pas
 * l'accepter » face à un ex encore présent : majeure ; « seulement pour les
 * enfants » face à une amitié ou un ex proche : à explorer ; « seulement en
 * toute transparence » face à un ex dans l'entourage proche : une nuance.
 */
function exTiesRule(a: RawAnswers, b: RawAnswers, c: Collector) {
  let worst: Divergence | null = null;
  let comparable = false;
  for (const [x, y, xIsA] of [
    [a, b, true],
    [b, a, false],
  ] as const) {
    const accept = x.M3_Q13;
    const place = y.M3_Q05;
    if (!accept || !place) continue;
    comparable = true;
    const severity: Severity | null =
      accept === 'D' && ['B', 'C', 'D'].includes(place)
        ? 'majeure'
        : accept === 'B' && ['C', 'D'].includes(place)
          ? 'moderee'
          : accept === 'C' && place === 'D'
            ? 'mineure'
            : null;
    if (!severity) continue;
    if (worst && SEVERITY_RANK[worst.severity] >= SEVERITY_RANK[severity])
      continue;
    const accepts = view('M3_Q13', accept);
    const ex = view('M3_Q05', place);
    worst = {
      questionId: 'M3_Q13',
      theme: 'famille',
      severity,
      label: 'Les liens avec un ex',
      question: questionText('M3_Q13'),
      a: xIsA ? accepts : ex,
      b: xIsA ? ex : accepts,
    };
  }
  if (worst) c.diverge(worst);
  else if (comparable) c.agree('M3_Q13', 1);
}

/**
 * V7.1 — « une gifle peut se comprendre » (M6_Q24, d'accord ou tout à fait)
 * face à quelqu'un pour qui la violence est une limite (M6_Q04 A ou B), ou
 * des deux côtés : une incompatibilité déclarée. Tendance, jamais citée.
 */
function slapRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  const justifies = (x: RawAnswers) => ['D', 'E'].includes(x.M6_Q24);
  const refuses = (x: RawAnswers) => ['A', 'B'].includes(x.M6_Q04);
  const both = justifies(a) && justifies(b);
  if (!both && !(justifies(a) && refuses(b)) && !(justifies(b) && refuses(a)))
    return;
  const view = {
    key: 'tendance',
    text: 'Point de vigilance tiré des entretiens',
  };
  c.diverge({
    questionId: 'M6_Q24',
    theme: 'communication',
    severity: 'critique',
    label: 'Limite face à la violence physique',
    question: 'La place de la violence dans un couple',
    a: view,
    b: view,
    neutral: true,
    ...(both ? { shared: true } : {}),
  });
}

/** Religion des enfants (M8_Q18), pour les accords. */
const CHILD_FAITH_SAME: Record<string, string> = {
  A: 'Vous élèveriez tous les deux vos enfants dans votre religion commune',
  B: 'Vous choisiriez à deux la religion de vos enfants',
  C: 'Vos enfants grandiraient dans vos deux traditions',
  D: 'Vous élèveriez tous les deux vos enfants sans éducation religieuse',
};

/**
 * V7.1 — religion des enfants (M8_Q18), lue avec la religion de chacun.
 * « Dans ma religion, c'est indispensable » face à « sans éducation
 * religieuse », ou des deux côtés avec deux religions différentes : une
 * incompatibilité déclarée ; face à un choix à deux ou aux deux traditions,
 * majeure quand les religions diffèrent.
 */
function childFaithRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  const ka = a.M8_Q18;
  const kb = b.M8_Q18;
  if (!ka || !kb) return;
  const fa = faithOf(a);
  const fb = faithOf(b);
  const differ =
    fa && fb ? fa.family !== fb.family || distinctFaiths(fa, fb) : null;
  let severity: Severity | null;
  if (ka === kb) {
    severity = ka === 'A' && differ === true ? 'critique' : null;
  } else {
    const pair = [ka, kb].sort().join('');
    if (pair === 'AD') severity = 'critique';
    else if (pair === 'AB' || pair === 'AC')
      severity =
        differ === true ? 'majeure' : differ === false ? 'mineure' : 'moderee';
    else if (pair === 'BD') severity = 'moderee';
    else severity = 'mineure';
  }
  if (severity) {
    c.diverge({
      questionId: 'M8_Q18',
      theme: 'spiritualite',
      severity,
      label: 'Religion des enfants',
      question: questionText('M8_Q18'),
      a: view('M8_Q18', ka),
      b: view('M8_Q18', kb),
    });
    return;
  }
  c.agree('M8_Q18', ka === kb ? 1 : COMPATIBLE_DIFFERENT);
  // « Dans ma religion » des deux côtés : un accord seulement si c'est la même.
  if (ka === kb && (ka !== 'A' || differ === false))
    c.converge({
      questionId: 'M8_Q18',
      theme: 'spiritualite',
      label: CHILD_FAITH_SAME[ka],
      answer: optionText('M8_Q18', ka),
      topic: 'La religion des enfants',
    });
}

/**
 * V7.1 — jeux d'argent : ce que l'un accepte (M0_Q16) face à ce que l'autre
 * fait (M0_Q15), sur le modèle de l'alcool. « Même rarement, non » face à
 * des paris occasionnels : majeure ; face à des paris chaque semaine ou
 * presque chaque jour : incompatibilité déclarée.
 */
function gamblingRule(a: RawAnswers, b: RawAnswers, c: Collector): void {
  let worst: Divergence | null = null;
  let comparable = false;
  for (const [refuser, player, refuserIsA] of [
    [a, b, true],
    [b, a, false],
  ] as const) {
    const level = player.M0_Q15;
    const accept = refuser.M0_Q16;
    if (!accept || !level || level === 'A') continue;
    comparable = true;
    const severity: Severity | null =
      accept === 'A'
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
    const refusal = view('M0_Q16', accept);
    const habit = view('M0_Q15', level);
    worst = {
      questionId: 'M0_Q15',
      theme: 'argent',
      severity,
      label: 'Jeux d’argent',
      question: questionText('M0_Q15'),
      a: refuserIsA ? refusal : habit,
      b: refuserIsA ? habit : refusal,
    };
  }
  if (worst) c.diverge(worst);
  else if (comparable) c.agree('M0_Q15', COMPATIBLE_DIFFERENT);
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

/**
 * Limites de sécurité : jamais adoucies par une déclaration ou une croyance
 * (V7.1 : justification de la violence, contrôle).
 */
const SAFETY_QUESTIONS = new Set(['M6_Q04', 'M6_Q05', 'M6_Q24', 'M9_Q24']);

/**
 * V7.1 — projet de vie et valeurs : jamais adoucis par P2 ni par P9. Ne pas
 * cocher un sujet dans M8_Q12 (trois choix au plus, « tout se discute » étant
 * la réponse attendue) ne prouve pas qu'il se négocie ; et M8_Q14 parle des
 * désaccords de caractère et d'habitudes, pas du projet de vie. Les refus
 * explicites (« je ne pourrais pas vivre avec ») y figurent aussi.
 */
export const CORE_DEALBREAKERS: ReadonlySet<string> = new Set([
  // Enfants (désir, enfants de l'autre)
  'M0_Q06',
  'M0_Q14',
  // Lieu de vie
  'M0_Q03',
  'M7_Q07',
  'M7_Q36',
  // Religion, pratique, polygamie, intimité avant le mariage
  'M1_Q16',
  'M1_Q05',
  'M1_Q17',
  'M1_Q11',
  'M1_Q20',
  'M8_Q16',
  'M10_Q17',
  // Dot et aide financière à la famille
  'M4_Q16',
  'M4_Q17',
  // Objectif, vie commune, rôles et éducation
  'M8_Q01',
  'M8_Q19',
  'M4_Q04',
  'M4_Q15',
  'M8_Q15',
  'M8_Q18',
  'M8_Q20',
  // Refus explicites (tabac, alcool, jeux d'argent)
  'M0_Q09',
  'M0_Q12',
  'M0_Q15',
]);

/**
 * V7.1 — P9 : M8_Q14 parle de « caractère, habitudes ». Seuls ces sujets
 * (rythme, style, petites manières de faire) montent ou descendent selon la
 * façon dont chacun vit les désaccords qui durent.
 */
export const PERPETUAL_TOPICS: ReadonlySet<string> = new Set([
  'M7_Q02',
  'M7_Q05',
  'M7_Q08',
  'M8_Q06',
  'M9_Q02',
  'M9_Q03',
  'M9_Q06',
  'M9_Q07',
  'M6_Q03',
  'M6_Q11',
  'M2_Q07',
  'M2_Q22',
  'M4_Q10',
  'M4_Q13',
  'M4_Q14',
  'M5_Q07',
  'M10_Q15',
]);

/**
 * P2 — ce qui est non négociable (M8_Q12). Une divergence sur un sujet
 * déclaré non négociable par l'un des deux monte d'un cran (modérée →
 * majeure, majeure → incompatibilité déclarée) ; quand les deux membres ont
 * coché des sujets et qu'aucun n'a coché celui-ci, une majeure redevient un
 * sujet à explorer, sauf sur le projet de vie (CORE_DEALBREAKERS).
 * Généralise la ligne rouge V6 (M8_Q05 = « enfants ou religion »).
 */
function applyNonNegotiables(a: RawAnswers, b: RawAnswers, c: Collector) {
  const na = nonNegotiablesOf(a);
  const nb = nonNegotiablesOf(b);
  if (!na && !nb) return;
  for (const d of c.adjustable) {
    const keys = nonNegotiableThemesOf(d.questionId);
    if (!keys.length) continue;
    if (keys.some((k) => na?.keys.has(k) || nb?.keys.has(k))) {
      const raised = up[d.severity];
      if (raised !== d.severity) {
        d.severity = raised;
        d.nonNegotiable = true;
      }
      c.declared.add(d);
    } else if (
      na?.explicit &&
      nb?.explicit &&
      d.severity === 'majeure' &&
      !CORE_DEALBREAKERS.has(d.questionId)
    ) {
      d.severity = 'moderee';
    }
  }
}

/**
 * P9 — désaccords qui durent (M8_Q14). Croire qu'un désaccord durable prouve
 * qu'on n'est pas faits l'un pour l'autre fait monter d'un cran la divergence
 * modérée la plus importante (une seule) ; deux membres qui acceptent les
 * désaccords durables gardent les divergences modérées au rang de nuances.
 * V7.1 : seulement sur les sujets de caractère et d'habitudes.
 */
/**
 * V7.1 (B7) — sujets centraux qu'un seul des deux a renseignés : l'autre n'a
 * pas donné son accord pour les données sensibles (ou son entretien ne les
 * posait pas). Sans ce signal, une incompatibilité déclarée disparaissait en
 * silence. Jamais une réponse citée, ni celle de l'un ni l'absence de
 * l'autre : seulement le sujet, à aborder avec tact. Majeure quand celui qui
 * a répondu en a fait un non-négociable (M8_Q12) ou une position nette ;
 * modérée sinon.
 */
export const UNDISCLOSED_SUBJECTS: Array<{
  questionId: string;
  theme: Theme;
  subject: string;
  /** Réponse connue (V7 ou V6 lue dans les termes de la V7). */
  known: (x: RawAnswers) => boolean;
  /** Clé de M8_Q12 qui en fait un non-négociable. */
  nonNegotiable: string;
  /** Position nette, qui l'autre doit connaître avant de s'engager. */
  firm: (x: RawAnswers) => boolean;
  /** Réponse « j'en parlerai en personne » : le sujet n'est pas relancé. */
  deferred?: (x: RawAnswers) => boolean;
  /** La question était posée dans l'entretien de celui qui n'a pas répondu. */
  asked?: (x: RawAnswers) => boolean;
}> = [
  {
    questionId: 'M1_Q16',
    theme: 'spiritualite',
    subject: 'la religion',
    known: (x) => !!faithOf(x),
    nonNegotiable: 'B',
    firm: (x) => ['exclusive', 'conversion'].includes(faithRequirement(x)!),
  },
  {
    questionId: 'M1_Q20',
    theme: 'spiritualite',
    subject: 'la polygamie',
    // V7 (M1_Q11) : « j'en parlerai en personne » n'a pas d'équivalent.
    known: (x) => !!(x.M1_Q20 || x.M1_Q11),
    nonNegotiable: 'H',
    firm: (x) => x.M1_Q20 === 'A' || x.M1_Q20 === 'C',
    deferred: (x) => !x.M1_Q20 && x.M1_Q11 === 'D',
  },
  {
    questionId: 'M10_Q17',
    theme: 'intimite',
    subject: 'l’intimité avant le mariage',
    known: (x) => !!x.M10_Q17,
    nonNegotiable: 'G',
    firm: (x) => x.M10_Q17 === 'A',
    deferred: (x) => x.M10_Q17 === 'D',
    // Question propre à la V7 : un entretien V6 ne la posait pas.
    asked: isV7Interview,
  },
];

const NOT_SHOWN: AnswerView = {
  key: 'non_renseigne',
  text: 'Non renseigné',
};
const SHOWN: AnswerView = { key: 'renseigne', text: 'Renseigné' };

function undisclosedDivergences(
  a: RawAnswers,
  b: RawAnswers,
  rawA: RawAnswers,
  rawB: RawAnswers,
): Divergence[] {
  const out: Divergence[] = [];
  for (const s of UNDISCLOSED_SUBJECTS) {
    const ka = s.known(a);
    const kb = s.known(b);
    if (ka === kb) continue;
    const told = ka ? a : b;
    if (s.deferred?.(told)) continue;
    // Entretien d'origine (avant lecture V6 → V7) de celui qui n'a pas
    // répondu : il a bien passé ce module, et la question y était posée.
    const silent = ka ? rawB : rawA;
    const prefix = `${s.questionId.split('_')[0]}_`;
    if (!Object.keys(silent).some((id) => id.startsWith(prefix))) continue;
    if (s.asked && !s.asked(silent)) continue;
    const declared = !!nonNegotiablesOf(told)?.keys.has(s.nonNegotiable);
    out.push({
      questionId: s.questionId,
      theme: s.theme,
      severity: declared || s.firm(told) ? 'majeure' : 'moderee',
      label: `Sujet non renseigné par l’un de vous : ${s.subject}`,
      question: questionText(s.questionId),
      a: ka ? SHOWN : NOT_SHOWN,
      b: kb ? SHOWN : NOT_SHOWN,
      undisclosed: true,
      ...(declared ? { nonNegotiable: true } : {}),
    });
  }
  return out;
}

function applyPerpetualProblems(a: RawAnswers, b: RawAnswers, c: Collector) {
  const candidates = [...c.adjustable]
    .filter(
      (d) =>
        d.severity === 'moderee' &&
        PERPETUAL_TOPICS.has(d.questionId) &&
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
  ctx?: ReportContext,
): DivergenceReport {
  // Réponses V6 lues dans les termes de la V7 quand le sens est le même.
  const a = upgradeAnswers(rawA);
  const b = upgradeAnswers(rawB);
  const c = new Collector();

  homeRule(a, b, ctx, c);
  transmissionRule(a, b, c);
  for (const rule of DIVERGENCE_RULES) applyRule(rule, a, b, c);
  childrenAcceptRule(a, b, c);
  exTiesRule(a, b, c);
  cultureRule(a, b, c);
  faithRule(a, b, c);
  foodRule(a, b, c);
  marriageRule(a, b, c);
  childFaithRule(a, b, c);
  tobaccoRule(a, b, rawA, rawB, c);
  alcoholRule(a, b, c);
  gamblingRule(a, b, c);
  slapRule(a, b, c);
  availabilityRule(a, b, c);
  for (const rule of LEGACY_RULES) applyRule(rule, a, b, c);
  // V7.1 : une « bonne pratique » partagée n'est affichée que si aucun des
  // deux portraits n'est idéalisé (la sincérité pondère aussi les scénarios).
  const sincere =
    !buildPsychProfile(a).idealized && !buildPsychProfile(b).idealized;
  for (const p of sincere ? POSITIVE_CONVERGENCES : []) {
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
    // V7.1 : sujets centraux renseignés d'un seul côté.
    ...undisclosedDivergences(a, b, rawA, rawB),
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
  /**
   * V7.1 — sujets centraux renseignés d'un seul côté (« la religion ») :
   * toujours nommés dans la vigilance, jamais attribués.
   */
  undisclosed: string[];
}

/** Sujet d'une divergence « non renseigné » (« la religion »). */
function undisclosedSubject(d: Divergence): string {
  return (
    UNDISCLOSED_SUBJECTS.find((s) => s.questionId === d.questionId)?.subject ??
    d.label.toLowerCase()
  );
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
    // V7.1 : une tendance (contrôle, violence) n'est jamais citée ni
    // attribuée ; un sujet non renseigné n'est pas une réponse.
    vigilance = top.neutral
      ? `${intensity} — ${top.label.toLowerCase()} : un point de vigilance tiré de vos entretiens, sans qu’aucune réponse ne soit citée. Le Sondeur l’aborde par les limites de chacun.`
      : top.undisclosed
        ? `${intensity} — ${top.label.toLowerCase()}.${declared} À aborder avec tact pendant le Sondeur.`
        : top.shared
          ? `${intensity} — ${top.label.toLowerCase()} : vous avez répondu tous les deux « ${top.a.text} ».${declared} À aborder franchement pendant le Sondeur.`
          : `${intensity} — ${top.label.toLowerCase()} : vous avez répondu « ${top.a.text} », ${partnerFirstName} a répondu « ${top.b.text} ».${declared} À aborder franchement pendant le Sondeur.`;
  }

  // V7.1 : un sujet central non renseigné par l'un des deux n'est jamais
  // tu, même quand une autre divergence occupe la vigilance.
  const hidden = report.divergences.filter((d) => d.undisclosed);
  const others = hidden.filter((d) => d !== top).map(undisclosedSubject);
  if (others.length)
    vigilance = [
      vigilance,
      `Non renseigné par l’un de vous : ${others.join(', ')}. À aborder avec tact pendant le Sondeur.`,
    ]
      .filter(Boolean)
      .join(' ');

  return {
    rassemble,
    vigilance,
    themes: report.themes,
    hardStop: report.hardStop,
    undisclosed: hidden.map(undisclosedSubject),
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
      prompt: d.neutral
        ? 'Quelles limites, pour chacun de vous, garantissent le respect et la liberté de l’autre dans un couple ?'
        : d.undisclosed
          ? `L’un de vous n’a pas renseigné ce sujet dans l’entretien. Quelle place aimeriez-vous lui donner, chacun, dans une vie à deux ?`
          : d.shared
            ? `Vous avez répondu tous les deux « ${d.a.text} ». Le jour où cela arrivera entre vous, qui fera le premier pas, et comment ?`
            : `Vous : « ${d.a.text} ». ${partnerFirstName} : « ${d.b.text} ». Qu'est-ce qui, pour chacun de vous, rend cette position importante ?`,
    });
    if (topics.length >= max) break;
  }
  return topics;
}
