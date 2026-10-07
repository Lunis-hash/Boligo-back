/**
 * Réserve des questions du Sondeur BOLIGO (gabarits).
 *
 * Le Sondeur ne repose pas l'entretien : il cherche le sens et le
 * fonctionnement derrière une réponse déjà donnée, avec les techniques d'un
 * clinicien du couple, transposées à deux personnes qui ne se sont encore
 * jamais parlé et qui liront la réponse de l'autre :
 *  - question circulaire, par un proche (jamais « votre partenaire ») ;
 *  - échelle de 0 à 10, avec sa relance neutre (« qu'est-ce qui vous fait choisir ce chiffre ? ») ;
 *  - exception tirée de la famille ou d'une relation passée (ce qu'on en a
 *    appris, jamais le récit) ;
 *  - question miracle, besoin caché, réparation, problème qui revient toujours,
 *    famille d'origine, scène ordinaire de la vie à deux ;
 *  - « même mot, même sens ? » quand les deux réponses sont identiques.
 *
 * Règles de forme, vérifiées par les tests sur chaque variante : 180
 * caractères au plus, une seule question ouverte (jamais oui ou non, jamais
 * d'ultimatum), vouvoiement, aucune réponse citée entre guillemets, aucun
 * jargon, aucun passé commun supposé, rien sur le corps, l'apparence ou la
 * santé, et les questions les plus intimes au jour 3. Elles respectent aussi le
 * contrôle de forme que le code applique aux questions de l'IA.
 *
 * Un sujet n'est posé qu'un jour, et jamais avec un sujet voisin
 * (TOPIC_FAMILIES). Une même réponse sur soi (dispute, intimité,
 * consommation…) n'est nommée comme accord que par une phrase écrite pour ne
 * rien exposer (AGREEMENTS).
 *
 * Les options ne sont jamais affichées (réponse libre de 500 caractères) :
 * elles restent une grille de lecture cachée, courte et neutre.
 */
import { QUESTION_INDEX } from '../interview/questions.data';
import type {
  Convergence,
  Divergence,
  Severity,
  Theme,
} from '../matching/divergence.engine';
import { RED_FLAG_HABITS } from '../psychometrics/psychometrics';

/** Technique clinique d'une formulation (traçabilité et tests, jamais affichée). */
export type Technique =
  | 'circulaire'
  | 'echelle'
  | 'exception'
  | 'miracle'
  | 'besoin'
  | 'reparation'
  | 'perpetuel'
  | 'origine'
  | 'scene'
  | 'sens'
  | 'limite'
  | 'emotion'
  | 'projection';

export interface PoolTemplate {
  text: string;
  /** Grille de lecture cachée : trois pistes neutres, puis « Autre... ». */
  options: string[];
  technique?: Technique;
  /**
   * Sujets d'entretien que la question aborde (identifiants de question) :
   * le Sondeur évite de reposer un sujet déjà traité un autre jour.
   */
  about?: string[];
  /**
   * Suppose que l'on vivra avec la différence (aménager, s'ajuster, honorer
   * deux façons de faire) : jamais servie sur un point non négociable.
   */
  compromise?: boolean;
  /** Suppose des enfants à venir : jamais servie si l'un n'en veut pas. */
  needsChildren?: boolean;
  /**
   * Relance d'accord : angle du jour auquel elle répond (DayAngle). Sans
   * angle, elle ne sert qu'à défaut d'une relance écrite pour le jour.
   */
  angle?: DayAngle;
}

/**
 * Angle du jour d'une relance d'accord : 1, ce que chacun protège ou la
 * limite de l'accord ; 2, d'où vient la position ; 3, comment chacun la
 * vivrait au quotidien et ce qu'il faudrait savoir avant de s'engager.
 */
export type DayAngle = 1 | 2 | 3;

const opts = (a: string, b: string, c: string) => [a, b, c, 'Autre...'];

/** Formulation qui suppose des enfants à venir. */
const withChildren = (t: PoolTemplate): PoolTemplate => ({
  ...t,
  needsChildren: true,
});

function q(
  text: string,
  technique: Technique,
  options: [string, string, string],
  about?: string[],
  compromise = false,
): PoolTemplate {
  return {
    text,
    technique,
    options: opts(...options),
    ...(about ? { about } : {}),
    ...(compromise ? { compromise } : {}),
  };
}

/** Relance d'accord du jour 1 : ce que chacun protège, ou la limite de l'accord. */
function protectProbe(
  text: string,
  technique: Technique,
  options: [string, string, string],
): PoolTemplate {
  return { ...q(text, technique, options), angle: 1 };
}

/** Relance d'accord du jour 2 : d'où vient la position de chacun. */
function originProbe(
  text: string,
  technique: Technique,
  options: [string, string, string],
): PoolTemplate {
  return { ...q(text, technique, options), angle: 2 };
}

/**
 * Relance d'accord du jour 3 : comment chacun le vivrait au quotidien, ce
 * qu'il faudrait savoir avant de s'engager.
 */
function dailyProbe(
  text: string,
  technique: Technique,
  options: [string, string, string],
): PoolTemplate {
  return { ...q(text, technique, options), angle: 3 };
}

// ─── Tournures naturelles des sujets ──────────────────────────────────────────

/**
 * Identifiant de question (ou variante « id:clé ») → tournure naturelle du
 * sujet, avec son article. Elle remplace la citation des réponses : on nomme
 * le sujet, jamais ce que chacun a répondu.
 */
export const TOPIC_PHRASES: Record<string, string> = {
  // Lieu de vie & mobilité
  M0_Q03: "le déménagement pour suivre l'autre",
  M7_Q07: 'le lieu où vivre dans les années à venir',
  M4_Q13: 'le partage des affaires personnelles',
  // Famille
  M0_Q06: "le désir d'enfants",
  M0_Q05: "la place des enfants que l'on a déjà",
  M3_Q04: 'la famille recomposée',
  M5_Q01: 'la place de la famille dans les décisions',
  M5_Q03: 'la cohabitation avec la belle-famille',
  M5_Q07: 'le rythme des visites à la belle-famille',
  M1_Q10: 'le rôle des aînés dans les décisions',
  M1_Q13: 'la transmission de sa culture aux enfants',
  M1_Q15: "l'avis de la famille sur la personne choisie",
  M4_Q07: 'la tradition de la dot ou du mahr',
  M3_Q05: "les liens que l'on garde avec son passé",
  M1_Q02: 'le fait de partager la même culture',
  // Argent & dettes
  M4_Q01: "la mise en commun de l'argent",
  M4_Q03: "le rôle de l'homme dans les finances du foyer",
  M4_Q04: 'le rôle de la femme entre travail et foyer',
  M4_Q05: "l'argent que l'on envoie à sa famille",
  M4_Q08: "l'épargne à deux",
  M4_Q09: 'la transparence sur les dettes',
  M4_Q10: "l'addition d'une première sortie",
  M4_Q11: "le soutien quand l'argent vient à manquer",
  M4_Q12: "le niveau de vie dans le choix d'un partenaire",
  // Religion & spiritualité
  M1_Q03: 'les traditions de mariage',
  M1_Q09: 'les interdits alimentaires',
  M8_Q03: 'le sens du mariage',
  M1_Q06: 'la place de la foi dans la vie à deux',
  M1_Q11: 'la polygamie',
  M1_Q05: 'la foi de chacun',
  // Intimité & sexualité
  M6_Q10: 'la fidélité',
  M6_Q06: "la place de l'intimité dans la vie à deux",
  M6_Q07: "le rythme de l'intimité",
  M9_Q07: 'la tendresse au quotidien',
  M5_Q04: 'les amitiés entre hommes et femmes',
  M5_Q08: "l'accès au téléphone de l'autre",
  M10_Q15: "le rythme de l'attirance",
  // Communication & émotions
  M2_Q03: 'le besoin le plus profond dans une relation',
  M2_Q01: 'les messages qui restent sans réponse',
  M2_Q02: "le besoin de proximité et d'espace",
  M2_Q06: 'la façon de montrer sa colère',
  'M2_Q06:partage': 'les silences qui suivent la colère',
  M6_Q01: 'la façon de réagir pendant une dispute',
  'M6_Q01:partage': "l'éloignement pendant une dispute",
  M2_Q07: "le temps qu'il faut pour se réconcilier",
  'M2_Q07:partage': 'les réconciliations qui prennent du temps',
  M2_Q08: 'les excuses après une dispute',
  'M2_Q08:partage': 'les excuses qui coûtent',
  M6_Q04: 'la limite face à la violence',
  M6_Q05: 'les mots blessants dans une dispute',
  M8_Q06: 'la façon de se parler au quotidien',
  M9_Q03: "le compte de ce que l'on donne",
  'M9_Q03:partage': "l'équilibre entre donner et recevoir",
  M6_Q03: "le besoin d'avoir le dernier mot",
  M6_Q11: 'la réconciliation après une dispute',
  M9_Q04: 'la façon de vivre une frustration',
  'M9_Q04:partage': "les frustrations qui s'accumulent",
  M9_Q01: 'la façon de prendre les décisions',
  M9_Q02: "la place de l'effort en amour",
  M9_Q06: "les sacrifices que l'on fait par amour",
  M8_Q04: 'les attentions qui font se sentir aimé',
  // Écarts tirés des échelles (jamais un score, jamais un aveu)
  M2_Q11: "l'équilibre entre proximité et espace",
  M6_Q15: 'la façon de réagir quand une dispute monte',
  'M6_Q15:partage': 'les silences pendant une dispute',
  M6_Q13: 'le ton employé pendant une dispute',
  M9_Q16: 'les envies qui ne sont pas satisfaites',
  M9_Q19: 'la façon de répondre à une bouderie',
  M2_Q19: "le temps qu'il faut pour se livrer",
  M8_Q10: "les signaux qui inquiètent au début d'une relation",
  'M8_Q10:A': "les déclarations d'amour très rapides",
  'M8_Q10:B': 'la jalousie qui surveille',
  'M8_Q10:C': 'les disparitions sans explication',
  'M8_Q10:D': 'les intentions qui restent floues',
  'M8_Q10:E': 'la façon de parler de ses ex',
  'M8_Q10:H': 'la façon de reconnaître ses torts',
  'M8_Q10:J': 'le téléphone pendant les moments à deux',
  'M8_Q10:I': "le respect d'un refus",
  // Projet de vie
  M4_Q06: "l'achat d'un logement",
  M8_Q01: "l'engagement que l'on cherche",
  M8_Q02: 'le délai avant un engagement officiel',
  M7_Q01: 'le genre de vie dont on rêve',
  M7_Q02: 'la place du travail dans la vie',
  M7_Q05: "le rapport à l'imprévu",
  M7_Q08: 'le temps passé ensemble dans la semaine',
  M8_Q09: "les désaccords sur l'avenir",
  M0_Q08: "la consommation de tabac ou d'alcool",
  M0_Q09: 'le tabac au quotidien',
  M8_Q11: "le soin donné à l'autre dans l'épreuve",
  // Grand Entretien V7
  M5_Q10: "l'avis des proches sur les choix du couple",
  M5_Q02: 'la défense du conjoint face à un parent',
  M8_Q15: "l'éducation des enfants",
  M4_Q15: 'le partage des tâches de la maison',
  M4_Q14: "l'équilibre entre épargne et dépenses",
  M6_Q18: 'la fidélité',
  M6_Q19: 'la définition de la trahison',
  M10_Q16: "la place de l'intimité dans la vie à deux",
  M10_Q17: "l'intimité avant le mariage",
  M10_Q18: 'les différences de désir',
  M5_Q09: 'les amitiés entre hommes et femmes',
  M2_Q22: 'le premier pas après une dispute',
  M9_Q25: "l'attention portée à l'autre au quotidien",
  M3_Q12: "les disputes dans la famille où l'on a grandi",
  M8_Q13: "l'engagement dans les moments difficiles",
  M7_Q19: 'les valeurs qui guident une vie',
  M0_Q12: "la place de l'alcool",
  M1_Q17: 'la pratique religieuse au quotidien',
  M1_Q19: 'les règles alimentaires',
  M1_Q16: 'la religion de chacun',
  M3_Q11: "le rythme d'engagement",
  M6_Q17: 'le besoin de pause dans un désaccord',
  M6_Q16: 'la pause, puis le retour au dialogue',
  M8_Q14: 'les désaccords qui durent',
  // Grand Entretien V7.1
  M1_Q20: 'la polygamie',
  M4_Q16: "l'argent que l'on envoie à sa famille",
  M4_Q17: 'la tradition de la dot',
  M8_Q17: 'le délai avant un engagement officiel',
  M8_Q16: 'les cérémonies du mariage',
  M0_Q14: "l'accueil des enfants de l'autre",
  M3_Q13: "les liens que l'on garde avec son passé",
  M7_Q36: 'le retour aux racines de sa famille',
  M8_Q19: 'la vie commune avant le mariage',
  M8_Q20: 'la manière de punir un enfant',
  M8_Q18: 'la religion dans laquelle élever des enfants',
  M0_Q15: "les jeux d'argent",
  // Sujets de sécurité (questions de limite seulement)
  M6_Q24: 'la limite face à la violence',
  M9_Q24: 'le respect des limites de chacun',
};

/**
 * Tournure de repli pour une règle inconnue (questions V7 à venir) : le thème,
 * toujours grammatical et neutre, jamais le libellé brut de la règle.
 */
export const THEME_FALLBACK_PHRASES: Record<Theme, string> = {
  famille: 'la place de la famille',
  argent: "la façon de vivre l'argent",
  spiritualite: 'la place des convictions',
  intimite: "l'intimité à deux",
  communication: 'la façon de se parler',
  projet: 'le projet de vie',
  lieu: 'le lieu de vie',
};

/** Ce qu'il faut d'un écart ou d'un accord pour nommer son sujet. */
export interface TopicSource {
  questionId: string;
  label: string;
  theme: Theme;
  shared?: boolean;
}

/**
 * Clé du sujet : l'identifiant de la question, précisé pour les signaux
 * d'alerte (« M8_Q10:B ») et pour les risques partagés qui ont leur tournure.
 */
export function topicKey(d: TopicSource): string {
  if (d.questionId === 'M8_Q10') {
    const label = d.label.toLowerCase();
    const flag = Object.entries(RED_FLAG_HABITS).find(([, m]) =>
      label.endsWith(m.label.toLowerCase()),
    );
    return flag ? `M8_Q10:${flag[0]}` : 'M8_Q10';
  }
  if (d.shared && `${d.questionId}:partage` in TOPIC_PHRASES)
    return `${d.questionId}:partage`;
  return d.questionId;
}

/** Entrée d'une table propre au sujet : variante d'abord, question ensuite. */
function lookup<T>(table: Record<string, T>, d: TopicSource): T | undefined {
  return table[topicKey(d)] ?? table[d.questionId];
}

export function topicPhrase(d: TopicSource): string {
  return lookup(TOPIC_PHRASES, d) ?? THEME_FALLBACK_PHRASES[d.theme];
}

/**
 * Sujets voisins : deux questions d'entretien qui mesurent presque la même
 * chose (la colère et la dispute, la foi et la religion, le rôle des aînés et
 * celui de la famille…). Un seul sujet par famille est posé dans un parcours,
 * le plus grave : poser l'autre un autre jour reviendrait à reposer le même.
 */
export const TOPIC_FAMILIES: string[][] = [
  ['M2_Q01', 'M2_Q11', 'M8_Q10:C'],
  [
    'M6_Q01',
    'M6_Q01:partage',
    'M6_Q15',
    'M6_Q15:partage',
    'M2_Q06',
    'M2_Q06:partage',
  ],
  ['M2_Q07', 'M2_Q07:partage', 'M6_Q11'],
  ['M2_Q08', 'M2_Q08:partage', 'M8_Q10:H'],
  ['M9_Q19', 'M9_Q16'],
  ['M0_Q08', 'M0_Q09'],
  ['M1_Q05', 'M1_Q06', 'M1_Q16', 'M1_Q17'],
  ['M6_Q10', 'M6_Q18', 'M6_Q19'],
  ['M6_Q06', 'M6_Q07', 'M10_Q16', 'M10_Q17', 'M10_Q18'],
  ['M1_Q09', 'M1_Q19'],
  ['M4_Q08', 'M4_Q14', 'M0_Q15'],
  ['M6_Q16', 'M6_Q17'],
  ['M1_Q13', 'M8_Q15', 'M8_Q18', 'M8_Q20'],
  ['M5_Q01', 'M1_Q10'],
  ['M0_Q05', 'M3_Q04', 'M0_Q14'],
  ['M4_Q03', 'M4_Q04'],
  ['M5_Q08', 'M8_Q10:B'],
  ['M8_Q01', 'M8_Q10:D'],
  // V7.1 : une question remplacée et sa remplaçante sont un même sujet.
  ['M1_Q11', 'M1_Q20'],
  ['M4_Q05', 'M4_Q16'],
  ['M4_Q07', 'M4_Q17'],
  ['M8_Q02', 'M8_Q17'],
  ['M8_Q03', 'M8_Q16', 'M8_Q19'],
  ['M3_Q05', 'M3_Q13'],
  ['M7_Q07', 'M7_Q36'],
  ['M6_Q04', 'M6_Q24'],
  ['M8_Q10:I', 'M9_Q24'],
];

/** Le sujet et ses voisins (lui seul s'il n'a pas de famille). */
export function relatedTopics(d: TopicSource): string[] {
  const key = topicKey(d);
  return (
    TOPIC_FAMILIES.find((f) => f.includes(key) || f.includes(d.questionId)) ?? [
      key,
    ]
  );
}

/** « de » + tournure : du désir d'enfants, des interdits, de la fidélité, de l'épargne. */
export function deTopic(phrase: string): string {
  if (phrase.startsWith('le ')) return `du ${phrase.slice(3)}`;
  if (phrase.startsWith('les ')) return `des ${phrase.slice(4)}`;
  return `de ${phrase}`;
}

/** « à » + tournure : au désir d'enfants, aux interdits, à la fidélité, à l'épargne. */
export function aTopic(phrase: string): string {
  if (phrase.startsWith('le ')) return `au ${phrase.slice(3)}`;
  if (phrase.startsWith('les ')) return `aux ${phrase.slice(4)}`;
  return `à ${phrase}`;
}

export interface TopicWords {
  /** « le désir d'enfants » */
  phrase: string;
  /** « du désir d'enfants » */
  de: string;
  /** « au désir d'enfants » */
  a: string;
  /** « Le désir d'enfants » */
  cap: string;
}

export function topicWords(phrase: string): TopicWords {
  return {
    phrase,
    de: deTopic(phrase),
    a: aTopic(phrase),
    cap: phrase.charAt(0).toUpperCase() + phrase.slice(1),
  };
}

// ─── Jour de chaque sujet (pudeur graduée, un écart posé un seul jour) ───────

/**
 * Jours où un sujet peut être posé, le jour préféré en premier :
 * 1 lignes rouges (ce qui protège chacun), 2 valeurs (d'où cela vient),
 * 3 futur et intimité (comment cela se vivra à deux). Les sujets les plus
 * intimes ne sont posés qu'au jour 3.
 */
export const TOPIC_DAYS: Record<string, number[]> = {
  // Lieu
  M0_Q03: [1, 2, 3],
  M7_Q07: [3, 1, 2],
  M4_Q13: [2, 3],
  // Famille
  M0_Q06: [1, 3, 2],
  M0_Q05: [3],
  M3_Q04: [3, 2],
  M5_Q01: [2, 1, 3],
  M5_Q03: [1, 3, 2],
  M5_Q07: [3, 2],
  M1_Q10: [2, 1],
  M1_Q13: [3, 2],
  M1_Q15: [1, 2],
  M4_Q07: [2, 1],
  M3_Q05: [1, 2],
  M1_Q02: [2, 1],
  // Argent
  M4_Q01: [2, 3, 1],
  M4_Q03: [2, 1],
  M4_Q04: [2, 1],
  M4_Q05: [1, 2, 3],
  M4_Q08: [3, 2],
  M4_Q09: [1, 2],
  M4_Q10: [1, 2],
  M4_Q11: [1, 3, 2],
  M4_Q12: [2, 1],
  // Spiritualité
  M1_Q03: [3, 2],
  M1_Q09: [2, 3],
  M8_Q03: [2, 3],
  M1_Q06: [1, 2, 3],
  M1_Q11: [1, 2],
  M1_Q05: [1, 2, 3],
  // Intimité : le désir et le rythme au jour 3 seulement
  M6_Q10: [1, 2, 3],
  M6_Q06: [3],
  M6_Q07: [3],
  M9_Q07: [3, 2],
  M5_Q04: [1, 2],
  M5_Q08: [1, 2],
  M10_Q15: [3],
  // Communication
  M2_Q03: [2, 3],
  M2_Q01: [2, 3],
  M2_Q02: [3, 2],
  M2_Q06: [2, 1],
  M6_Q01: [1, 2, 3],
  M2_Q07: [3, 2],
  M2_Q08: [2, 3],
  M6_Q04: [1, 2, 3],
  M6_Q05: [1, 2, 3],
  M8_Q06: [2, 3],
  M9_Q03: [2, 3],
  M6_Q03: [1, 2],
  M6_Q11: [3, 2],
  M9_Q04: [2, 3],
  M9_Q01: [3, 2],
  M9_Q02: [2, 3],
  M9_Q06: [2, 1],
  M8_Q04: [3, 2],
  M2_Q11: [2, 3, 1],
  M6_Q15: [1, 2, 3],
  M6_Q13: [1, 2, 3],
  M9_Q16: [2, 3, 1],
  M9_Q19: [2, 1, 3],
  M2_Q19: [1, 3, 2],
  M8_Q10: [1, 2],
  // Projet
  M4_Q06: [3],
  M8_Q01: [1, 2, 3],
  M8_Q02: [1, 3],
  M7_Q01: [3, 2],
  M7_Q02: [2, 3],
  M7_Q05: [2, 3],
  M7_Q08: [3, 2],
  M8_Q09: [1, 3],
  M0_Q08: [1, 2],
  M0_Q09: [1, 2],
  M8_Q11: [3, 2],
  // Grand Entretien V7 (sujets intimes au jour 3 seulement)
  M5_Q10: [2, 1, 3],
  M5_Q02: [2, 1],
  M8_Q15: [3, 2],
  M4_Q15: [3, 2],
  M4_Q14: [2, 3],
  M6_Q18: [1, 2],
  M6_Q19: [1, 2],
  M10_Q16: [3],
  M10_Q17: [3],
  M10_Q18: [3],
  M5_Q09: [1, 2],
  M2_Q22: [2, 3],
  M9_Q25: [3, 2],
  M3_Q12: [2],
  M8_Q13: [3, 1],
  M7_Q19: [2, 1],
  M0_Q12: [1, 2],
  M1_Q17: [2, 3],
  M1_Q19: [2, 3],
  M1_Q16: [1, 2],
  M3_Q11: [1, 3],
  M6_Q17: [2, 3],
  M6_Q16: [3, 2],
  M8_Q14: [3, 2],
  // Grand Entretien V7.1
  M1_Q20: [1, 2],
  M4_Q16: [1, 2, 3],
  M4_Q17: [2, 1],
  M8_Q17: [1, 3],
  M8_Q16: [2, 3],
  M0_Q14: [3, 2],
  M3_Q13: [1, 2],
  M7_Q36: [3, 1, 2],
  M8_Q19: [2, 3],
  M8_Q20: [3, 2],
  M8_Q18: [3, 2],
  M0_Q15: [2, 3],
  M6_Q24: [1, 2, 3],
  M9_Q24: [1, 2, 3],
};

const DEFAULT_DAYS: Record<Severity, number[]> = {
  critique: [1, 2, 3],
  majeure: [1, 2, 3],
  moderee: [2, 3, 1],
  mineure: [3, 2, 1],
};

/** Jours possibles d'un sujet ; règle inconnue : selon la gravité, intimité au jour 3. */
export function topicDays(d: TopicSource & { severity?: Severity }): number[] {
  const days = lookup(TOPIC_DAYS, d);
  if (days) return days;
  if (d.theme === 'intimite') return [3];
  return DEFAULT_DAYS[d.severity ?? 'moderee'];
}

/**
 * Points non négociables : jamais de gabarit qui suppose de « vivre avec » la
 * différence. Seulement ce que la position protège, d'où elle vient, ce
 * dont chacun a besoin pour se sentir respecté.
 */
export const NON_NEGOTIABLE = new Set([
  // V6 (entretiens déjà enregistrés)
  'M0_Q06',
  'M1_Q11',
  'M1_Q05',
  'M1_Q06',
  'M6_Q10',
  'M0_Q08',
  'M0_Q09',
  'M7_Q07',
  'M1_Q02',
  'M8_Q01',
  'M8_Q10:B',
  // V7 : religion, règles alimentaires, fidélité, intimité avant le mariage,
  // alcool, lieu de vie, engagement, mariage, accès au téléphone
  'M1_Q16',
  'M1_Q17',
  'M1_Q18',
  'M1_Q19',
  'M6_Q18',
  'M6_Q19',
  'M10_Q17',
  'M0_Q12',
  'M0_Q03',
  'M8_Q13',
  'M8_Q03',
  'M5_Q08',
]);

/**
 * Point non négociable : sujet listé, sujet déclaré non négociable par l'un
 * des deux (M8_Q12), ou écart classé « incompatibilité déclarée ». Jamais de
 * gabarit de compromis ni de « vivre avec » sur un tel point.
 */
export function isNonNegotiable(
  d: TopicSource & { severity?: Severity; nonNegotiable?: boolean },
): boolean {
  return (
    d.nonNegotiable === true ||
    d.severity === 'critique' ||
    NON_NEGOTIABLE.has(topicKey(d)) ||
    NON_NEGOTIABLE.has(d.questionId)
  );
}

/**
 * Réponses qui remettent le sujet à une conversation en personne : jamais
 * relancées, ni comme écart ni comme accord.
 */
export const DEFERRED_ANSWERS = new Set(['M1_Q11:D', 'M6_Q06:D']);

/** Réponses qui ne sont pas une position (« je ne me suis jamais posé la question ») : pas d'accord à explorer. */
const NON_POSITION_ANSWERS = new Set([
  'M4_Q09:D',
  'M5_Q08:D',
  'M1_Q09:C',
  'M1_Q09:D',
  'M2_Q03:D',
  'M6_Q04:D',
]);

/**
 * Sujets qui supposent des enfants à venir : écartés quand l'un des deux n'en
 * veut pas (M0_Q06 = D).
 */
export const CHILDREN_TOPICS = new Set(['M8_Q15', 'M1_Q13']);

/** L'un des deux, ou les deux, ne veulent pas d'enfants. */
export function isChildFree(
  divergences: Divergence[],
  convergences: Convergence[],
): boolean {
  return (
    divergences.some(
      (d) => d.questionId === 'M0_Q06' && (d.a.key === 'D' || d.b.key === 'D'),
    ) ||
    convergences.some(
      (c) => c.questionId === 'M0_Q06' && agreementKey(c) === 'D',
    )
  );
}

/**
 * Accord démenti par la réponse de l'un des deux à un sujet voisin : la phrase
 * qui le nomme serait fausse pour lui ou pour elle. « Accord » → { question
 * voisine : réponses qui le démentent } (clés de questions.data.ts).
 *
 * Chaque réponse listée doit rester visible dans le rapport (écart ou accord
 * sur la question voisine), quelle que soit la réponse de l'autre : sinon, la
 * phrase d'accord est réécrite pour ne dire que ce qui a été répondu (« ne se
 * voit pas déménager pour un partenaire » plutôt que « rester là où vous
 * vivez », que M7_Q07 B ou C face à D ne laisse pas voir).
 */
export const AGREEMENT_CONTRADICTIONS: Record<
  string,
  Record<string, string[]>
> = {
  // Lieu : « ouverts sur le lieu de vie » ou « une vie à l'étranger » face à
  // « je reste où je suis » (M0_Q03 D).
  'M7_Q07:D': { M0_Q03: ['D'] },
  'M7_Q07:C': { M0_Q03: ['D'] },
  // Famille : « la décision finale vous revient », « les décisions ne
  // regardent que le couple », « consultée sans obligation » face à « je suis
  // leur avis pour garder la paix » (M5_Q10 A) ou « je revois ma décision »
  // quand la famille désapprouve (M1_Q15 A).
  'M5_Q01:B': { M5_Q10: ['A'], M1_Q15: ['A'] },
  'M5_Q01:C': { M5_Q10: ['A'], M1_Q15: ['A'] },
  'M5_Q01:D': { M5_Q10: ['A'], M1_Q15: ['A'] },
  // Argent : « un pot commun » face à « c'est mon argent, c'est mon affaire »
  // (M4_Q05 C) ; « ce qui est à l'un est à l'autre » face à « l'argent reste
  // une affaire individuelle » (M4_Q01 D).
  'M4_Q01:A': { M4_Q05: ['C'] },
  'M4_Q13:A': { M4_Q01: ['D'] },
  // Dispute : « se demander pardon » face à « je ne m'excuse pas tant que je
  // pense avoir raison » (M2_Q22 D).
  'M6_Q11:A': { M2_Q22: ['D'] },
  // Engagement : « prendre soin de l'autre dans l'épreuve, une évidence »
  // face à « je partirais sans trop attendre » (M8_Q13 D) ; « le mariage »
  // face à « un choix optionnel » (M8_Q03 D) ; « un engagement dans l'année »
  // face à « ouvert à voir ce qui se présente » (M8_Q01 D).
  'M8_Q11:A': { M8_Q13: ['D'] },
  'M8_Q01:A': { M8_Q03: ['D'], M8_Q16: ['D'] },
  'M8_Q02:A': { M8_Q01: ['D'] },
  // V7.1 : mêmes démentis pour les questions remplaçantes.
  'M8_Q17:A': { M8_Q01: ['D'] },
};

/** L'accord est démenti par un écart ou un autre accord sur le sujet voisin. */
export function isContradictedAgreement(
  c: Convergence,
  divergences: Divergence[],
  convergences: Convergence[],
): boolean {
  const rules =
    AGREEMENT_CONTRADICTIONS[`${c.questionId}:${agreementKey(c) ?? ''}`] ?? {};
  return Object.entries(rules).some(
    ([id, keys]) =>
      divergences.some(
        (d) =>
          d.questionId === id &&
          (keys.includes(d.a.key) || keys.includes(d.b.key)),
      ) ||
      convergences.some(
        (o) => o.questionId === id && keys.includes(agreementKey(o) ?? ''),
      ),
  );
}

/**
 * Famille recomposée (enfants d'une autre union) : écartée, écart comme
 * accord, quand aucun des deux n'a d'enfant.
 */
export const RECOMPOSED_TOPICS = new Set(['M0_Q05', 'M3_Q04']);

/** Aucun des deux n'a d'enfant d'après ses réponses (M0_Q05 = A des deux côtés). */
export function hasNoChildren(convergences: Convergence[]): boolean {
  return convergences.some(
    (c) => c.questionId === 'M0_Q05' && agreementKey(c) === 'A',
  );
}

/** Questions factuelles (enfants déjà nés) : une même réponse n'est pas un accord. */
const FACT_QUESTIONS = new Set(['M0_Q05']);

export function isDeferredDivergence(d: Divergence): boolean {
  return (
    DEFERRED_ANSWERS.has(`${d.questionId}:${d.a.key}`) ||
    DEFERRED_ANSWERS.has(`${d.questionId}:${d.b.key}`)
  );
}

// ─── Questions de thème (aucun écart à cibler dans le créneau) ────────────────

/**
 * Formulations par thème et par jour. Chaque créneau en compte sept ou huit :
 * un membre peut enchaîner plusieurs parcours sans retrouver les mêmes.
 */
export const THEME_POOL: Record<Theme, Record<number, PoolTemplate[]>> = {
  famille: {
    1: [
      q(
        "Si un parent de l'autre venait vivre avec vous, quelle règle de la maison aimeriez-vous poser dès le premier jour ?",
        'limite',
        ['Un espace à nous', 'Nos décisions de foyer', 'Un temps à deux'],
        ['M5_Q03'],
      ),
      q(
        "Si vos deux familles ne s'entendaient pas, qu'est-ce que vous ne sacrifieriez ni pour l'une ni pour l'autre ?",
        'limite',
        ['Mon couple', 'Le lien avec les miens', 'Ma paix intérieure'],
        ['M1_Q15'],
      ),
      q(
        'Comment un proche qui vous connaît bien décrirait-il la place que tient votre famille dans vos choix ?',
        'circulaire',
        ['Une place centrale', 'Une place consultée', 'Une place discrète'],
        ['M5_Q01', 'M1_Q10'],
      ),
      q(
        "De 0 à 10, à quel point l'avis de votre famille sur la personne que vous choisirez compte-t-il, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M1_Q15'],
      ),
      q(
        "Envers votre famille, qu'est-ce qui, pour vous, ne se discutera jamais ?",
        'limite',
        [
          'Le respect des aînés',
          "L'aide aux miens",
          'Ma présence aux grands moments',
        ],
      ),
      q(
        "Pensez à une fois où vous avez dit non à votre famille et où cela s'est bien passé : qu'est-ce qui a aidé ?",
        'exception',
        ['Le ton employé', 'Le bon moment', 'Un allié dans la famille'],
      ),
      q(
        "Quelle tradition de votre famille tiendriez-vous à transmettre, même si l'autre ne la connaissait pas ?",
        'limite',
        ['Une fête', 'Une langue', 'Un rite familial'],
      ),
      q(
        "Quand votre famille désapprouve l'un de vos choix, de quoi avez-vous besoin pour tenir votre position ?",
        'besoin',
        ["D'être écouté(e)", 'De temps', "D'un soutien extérieur"],
        ['M1_Q15'],
      ),
    ],
    2: [
      q(
        "Qui, dans votre entourage, vous a le plus appris ce qu'est un couple solide ?",
        'origine',
        [
          'Un parent ou un grand-parent',
          'Un proche admiré',
          "Personne : j'ai appris par contraste",
        ],
      ),
      q(
        'Quel souvenir de votre famille aimeriez-vous retrouver un jour dans votre propre foyer ?',
        'origine',
        ['Les repas ensemble', 'Le respect des aînés', 'La joie des fêtes'],
      ),
      q(
        'Quelle habitude de votre famille aimeriez-vous ne pas reproduire, sans rien renier des vôtres ?',
        'origine',
        ['Les non-dits', 'Les éclats de voix', 'Le poids des attentes'],
      ),
      q(
        "Dans votre famille, quel rôle vous revenait sans que personne ne l'ait jamais dit ?",
        'origine',
        ['Apaiser les tensions', 'Aider les autres', 'Réussir pour tous'],
      ),
      q(
        'Dans la famille où vous avez grandi, comment exprimait-on la colère ?',
        'origine',
        ['À voix haute', 'Par le silence', "On ne l'exprimait pas"],
      ),
      q(
        'Dans la famille où vous avez grandi, qui consolait quand quelqu’un allait mal ?',
        'origine',
        ['Un parent', 'Un frère, une sœur', 'Personne en particulier'],
      ),
      q(
        "Dans votre culture ou votre famille, qu'attend-on d'un enfant envers les aînés qui vieillissent ?",
        'origine',
        ["Qu'il les accueille", "Qu'il les aide", "Qu'il reste présent"],
        ['M5_Q03'],
      ),
      q(
        "Si l'on demandait à un proche de votre famille ce que vous avez hérité des vôtres, que répondrait-il ?",
        'circulaire',
        ['Un caractère', 'Des valeurs', 'Une façon de faire'],
      ),
    ],
    3: [
      q(
        'Imaginez un jour de repos ordinaire, dans quelques années : qui, de vos deux familles, est autour de la table ?',
        'scene',
        ['Les deux familles', 'Surtout la mienne', 'Personne, un jour à deux'],
        ['M5_Q07'],
      ),
      q(
        "Imaginez que vos deux familles s'entendent à merveille : quel serait le premier petit signe que vous remarqueriez ?",
        'miracle',
        [
          'Une invitation spontanée',
          'Des nouvelles échangées',
          'Des rires partagés',
        ],
      ),
      q(
        'Dans chaque famille, certains sujets reviennent toujours : lequel, dans la vôtre, aimeriez-vous garder hors de votre foyer ?',
        'perpetuel',
        [
          "L'argent",
          'Les attentes envers les enfants',
          'Les vieilles rancunes',
        ],
      ),
      withChildren(
        q(
          'Si vous éleviez un enfant un jour, quelle phrase entendue dans votre enfance aimeriez-vous lui redire ?',
          'origine',
          [
            "Une phrase d'encouragement",
            'Une règle de vie',
            'Une parole de foi',
          ],
        ),
      ),
      q(
        "De 0 à 10, quelle place aimeriez-vous laisser à vos familles dans votre vie à deux, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M5_Q01', 'M5_Q07'],
      ),
      q(
        "Dans dix ans, comment aimeriez-vous qu'un enfant de votre entourage décrive votre foyer ?",
        'circulaire',
        ['Chaleureux', 'Ouvert', 'Paisible'],
      ),
      q(
        "Un proche de l'autre s'installe chez vous plusieurs semaines sans l'avoir prévu : qu'est-ce qui vous aiderait à bien le vivre ?",
        'scene',
        ['Une durée claire', 'Un espace préservé', "En parler d'abord à deux"],
        ['M5_Q03'],
      ),
      q(
        "Le jour où un membre de votre famille ferait une remarque blessante à l'autre, qu'attendriez-vous de vous-même ?",
        'reparation',
        [
          'Réagir sur le moment',
          'En parler à ma famille ensuite',
          "En parler d'abord avec l'autre",
        ],
      ),
    ],
  },
  argent: {
    1: [
      q(
        "Quel genre de dépense de l'autre, faite sans vous en parler, vous mettrait mal à l'aise ?",
        'limite',
        [
          'Un petit montant',
          'Un montant fixé à deux',
          'Aucun : chacun son argent',
        ],
        ['M4_Q01'],
      ),
      q(
        "Si un proche demandait à l'un de vous de se porter garant, qu'est-ce qui guiderait votre réponse ?",
        'besoin',
        [
          'La sécurité du foyer',
          'Le lien avec ce proche',
          'Une décision à deux',
        ],
        ['M4_Q05'],
      ),
      q(
        "Quel secret d'argent vous paraîtrait le plus difficile à pardonner ?",
        'limite',
        ['Une dette cachée', 'Des dépenses dissimulées', 'Un revenu tu'],
        ['M4_Q09'],
      ),
      q(
        "Comment un ami proche décrirait-il votre rapport à l'argent quand vous êtes sous pression ?",
        'circulaire',
        ['Prudent', 'Généreux', 'Inquiet'],
      ),
      q(
        "De 0 à 10, combien de calme vous apporte une épargne de côté, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M4_Q08'],
      ),
      q(
        "Si l'autre envoyait chaque mois de l'argent à sa famille sans vous en parler, qu'est-ce que ce silence réveillerait en vous ?",
        'emotion',
        [
          'De la confiance',
          "Le sentiment d'être tenu(e) à l'écart",
          'De la compréhension',
        ],
        ['M4_Q05'],
      ),
      q(
        "Qu'est-ce que l'argent apaise en vous, quand vous en avez assez ?",
        'besoin',
        ['Une peur du manque', 'Un besoin de liberté', 'Un besoin de dignité'],
      ),
    ],
    2: [
      q(
        "Comment l'argent était-il vécu dans la famille où vous avez grandi ?",
        'origine',
        ['Avec prudence', 'Avec générosité', 'Avec tension'],
      ),
      q(
        "Quand quelqu'un paie l'addition pour vous, qu'est-ce que vous ressentez ?",
        'emotion',
        ['De la gratitude', "Le sentiment d'être redevable", 'Du respect'],
        ['M4_Q10'],
      ),
      q(
        "Si l'un de vous gagnait beaucoup plus que l'autre, qu'est-ce que cela changerait dans la façon dont vous vous sentez à la maison ?",
        'besoin',
        ['Rien du tout', 'Un besoin de me sentir utile', 'Une gêne à dépasser'],
        ['M4_Q03', 'M4_Q04'],
      ),
      q(
        "Quand on parle d'argent, quel sujet vous met le plus mal à l'aise, sans entrer dans les chiffres ?",
        'besoin',
        ['Ce que je gagne', 'Ce que je dois', 'Ce que je donne aux miens'],
      ),
      q(
        "Quelle phrase sur l'argent entendiez-vous souvent quand vous étiez enfant ?",
        'origine',
        [
          'Une phrase de prudence',
          'Une phrase de partage',
          'Une phrase de peur',
        ],
      ),
      q(
        "Pour vous, être généreux avec l'argent, à quoi cela se voit-il concrètement ?",
        'sens',
        ['Au partage', 'Aux cadeaux', "À l'aide aux proches"],
      ),
      q(
        'Comment vos proches décriraient-ils votre façon de dépenser quand tout va bien ?',
        'circulaire',
        ['Raisonnable', 'Généreuse', 'Spontanée'],
      ),
      q(
        "Qu'est-ce qui, dans l'usage que l'autre fait de l'argent, vous rassurerait sur son engagement ?",
        'besoin',
        ['Sa transparence', 'Sa prévoyance', 'Sa générosité'],
      ),
    ],
    3: [
      q(
        "Imaginez qu'un matin, parler d'argent à deux ne vous pèse plus du tout : quel serait le premier petit signe de ce changement ?",
        'miracle',
        [
          'Un budget fait sans tension',
          'Une question posée sans gêne',
          'Un projet partagé',
        ],
      ),
      q(
        'Un soir ordinaire, une facture imprévue arrive : comment aimeriez-vous que la discussion se passe ?',
        'scene',
        [
          'Calmement, tout de suite',
          'Le lendemain, à tête reposée',
          'Avec une règle déjà fixée',
        ],
      ),
      q(
        "Si l'un de vous perdait son emploi, de quoi auriez-vous besoin de la part de l'autre les premières semaines ?",
        'besoin',
        ['De patience', "D'un plan", 'De confiance'],
        ['M4_Q11'],
      ),
      q(
        "Si l'un aime dépenser et l'autre épargner, qu'est-ce qui vous aiderait à ne pas en faire un combat ?",
        'perpetuel',
        [
          'Une règle simple',
          'Une part libre pour chacun',
          'En reparler sans juger',
        ],
        ['M4_Q08'],
        true,
      ),
      q(
        "De 0 à 10, à quel point aimeriez-vous que l'argent soit mis en commun dans votre foyer, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M4_Q01'],
      ),
      q(
        "Le jour où l'argent vous inquiéterait, à quel signe pourrait-on s'en apercevoir avant même que vous le disiez ?",
        'emotion',
        ['Je deviens silencieux(se)', 'Je compte tout', "Je m'agace vite"],
      ),
      q(
        'Pour quel rêve seriez-vous prêt(e) à vous priver un peu pendant quelques années ?',
        'besoin',
        ['Un logement', 'Un voyage', 'Un projet pour les miens'],
      ),
    ],
  },
  spiritualite: {
    1: [
      q(
        "Le jour d'un mariage, qu'est-ce qui, religieux ou non, ne pourrait pas manquer pour vous ?",
        'scene',
        ['La bénédiction', 'La présence des miens', 'Rien en particulier'],
        ['M8_Q03', 'M1_Q03'],
      ),
      q(
        "Sur la foi ou les convictions, qu'est-ce qui vous ferait vous sentir seul(e) à deux ?",
        'besoin',
        ['Une pratique moquée', 'Une pratique ignorée', 'Des valeurs opposées'],
        ['M1_Q06'],
      ),
      q(
        "Si l'autre remettait en question l'une de vos pratiques ou de vos convictions devant votre famille, que ressentiriez-vous ?",
        'emotion',
        ['De la gêne', 'De la peine', 'De la colère'],
      ),
      q(
        "Si une pratique de l'autre changeait votre quotidien, jusqu'où aimeriez-vous vous y associer ?",
        'limite',
        ['Entièrement', 'Par respect, sans la partager', 'Le moins possible'],
        ['M1_Q09'],
        true,
      ),
      q(
        'Comment un proche qui vous connaît bien décrirait-il la place réelle de vos convictions dans vos journées ?',
        'circulaire',
        ['Une place centrale', 'Une place discrète', 'Une place intime'],
        ['M1_Q06'],
      ),
      q(
        "De 0 à 10, à quel point partager les mêmes convictions compte-t-il pour vous, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M1_Q06', 'M1_Q05'],
      ),
      q(
        "Quelle pratique ou quelle valeur garderiez-vous, même si l'autre ne la comprenait pas ?",
        'limite',
        ['Une prière', 'Un interdit', 'Une fête'],
      ),
    ],
    2: [
      q(
        'Quel moment de votre vie a le plus façonné vos convictions ?',
        'origine',
        ['Mon éducation', 'Une épreuve', 'Une rencontre'],
      ),
      q('Dans les moments difficiles, sur quoi vous appuyez-vous ?', 'besoin', [
        'Ma foi',
        'Mes proches',
        'Ma propre force',
      ]),
      q(
        'Si un doute traversait un jour vos convictions, à qui en parleriez-vous en premier ?',
        'besoin',
        ["À l'autre", 'À un proche', 'À personne'],
        undefined,
        // Suppose que les convictions peuvent bouger : jamais quand la foi
        // est un point non négociable.
        true,
      ),
      q(
        'À quoi verrait-on, dans une de vos journées, la valeur que vous tenez pour la plus sacrée ?',
        'sens',
        ['À mes gestes', 'À mes paroles', 'À mes choix'],
      ),
      q(
        "Si vos convictions évoluaient avec le temps, comment aimeriez-vous en parler à l'autre ?",
        'projection',
        ['Tout de suite', 'Une fois au clair avec moi', 'Avec précaution'],
        undefined,
        true,
      ),
      q(
        'Dans votre famille, comment vous a-t-on transmis la foi ou les valeurs ?',
        'origine',
        ["Par l'exemple", 'Par des règles', 'Par la liberté'],
      ),
      q(
        "Si l'on demandait à vos proches ce qui vous rend fidèle à vos convictions, que répondraient-ils ?",
        'circulaire',
        ['Ma famille', 'Mon histoire', 'Ma conscience'],
      ),
      q(
        "Quand vous vous dites croyant(e), pratiquant(e) ou non croyant(e), qu'est-ce que ce mot change dans votre semaine ?",
        'sens',
        ['Mon emploi du temps', 'Mes repas', 'Mes choix'],
        ['M1_Q05', 'M1_Q06', 'M1_Q16', 'M1_Q17'],
      ),
    ],
    3: [
      withChildren(
        q(
          "Si un enfant choisissait un jour d'autres convictions que les vôtres, croyantes ou non, comment aimeriez-vous réagir ?",
          'projection',
          ['Avec confiance', 'Avec dialogue', 'Avec peine, mais présent(e)'],
        ),
      ),
      q(
        "Imaginez une grande fête religieuse ou familiale, dans quelques années : qu'est-ce qui la rendrait réussie pour vous ?",
        'scene',
        [
          'La présence des deux familles',
          'Le respect des rites',
          'La joie simple',
        ],
        ['M1_Q03'],
        // Fête commune projetée : jamais quand la foi est un point non négociable.
        true,
      ),
      q(
        'Imaginez que vos deux façons de croire, ou de ne pas croire, vivent bien sous le même toit : à quoi le verriez-vous ?',
        'miracle',
        [
          'Des fêtes partagées',
          'Du respect au quotidien',
          'Des questions sans crainte',
        ],
        undefined,
        true,
      ),
      q(
        'Quel moment de calme ou de recueillement aimeriez-vous partager à deux chaque semaine ?',
        'scene',
        ['Une prière', 'Une marche', 'Un repas sans écran'],
        undefined,
        true,
      ),
      q(
        'Lors des grandes fêtes, comment aimeriez-vous honorer des traditions qui ne seraient pas les mêmes ?',
        'projection',
        ['En alternant', 'En mêlant les deux', 'En créant les nôtres'],
        ['M1_Q03'],
        true,
      ),
      q(
        "Si vos convictions restaient différentes sur un point, qu'est-ce qui vous aiderait à le vivre sans vous juger ?",
        'perpetuel',
        [
          'La curiosité',
          'Des limites claires',
          'Le respect des rites de chacun',
        ],
        undefined,
        true,
      ),
      q(
        "De 0 à 10, quelle place aimeriez-vous donner à la foi ou à vos convictions dans votre futur foyer, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M1_Q06'],
      ),
      // Sans compromis : la place de ses propres convictions, jamais un
      // terrain d'entente.
      q(
        'Dans votre futur foyer, quel moment de la semaine aimeriez-vous garder pour votre foi ou vos valeurs ?',
        'projection',
        ['Un temps de prière', 'Un temps de silence', 'Un temps en communauté'],
      ),
      q(
        'Quand vous pensez à vos vieux jours, quelle place imaginez-vous pour la foi ou les convictions ?',
        'projection',
        ['Une place centrale', 'Une place intime', 'Une place discrète'],
      ),
    ],
  },
  intimite: {
    1: [
      q(
        'Pour vous, quel serait le tout premier message qui franchirait la ligne de la fidélité ?',
        'sens',
        ['Un message tendre', 'Un message caché', 'Un rendez-vous proposé'],
        ['M6_Q10'],
      ),
      q(
        "Dans une relation naissante, quel geste vous montrerait que l'autre prend votre pudeur au sérieux ?",
        'besoin',
        ['Respecter mon rythme', 'Demander avant', 'Ne pas insister'],
      ),
      q(
        'Comment un proche décrirait-il ce dont vous avez besoin pour vous sentir en confiance dans une relation ?',
        'circulaire',
        ['De la constance', 'De la transparence', 'De la liberté'],
      ),
      q(
        "Dans une relation, qu'est-ce qui distingue, pour vous, un jardin secret d'un secret ?",
        'sens',
        [
          'Ce qui ne blesse pas l’autre',
          'Ce qui n’engage que moi',
          'Ce que je dirais si on me le demandait',
        ],
        ['M5_Q08'],
      ),
      q(
        "Qu'est-ce qui, au début d'une relation, vous fait sentir que vous comptez vraiment ?",
        'besoin',
        ['La régularité', "L'écoute", 'Les attentions'],
      ),
      q(
        'Avant un engagement officiel, quelle limite aimeriez-vous voir respectée dans la relation ?',
        'limite',
        ['Une limite de temps', 'Une limite de pudeur', 'Une limite familiale'],
      ),
      q(
        "Dans une amitié entre un homme et une femme, où passe, pour vous, la frontière avec l'ambiguïté ?",
        'sens',
        ['Les messages', 'Les sorties à deux', 'Les confidences'],
        ['M5_Q04'],
      ),
    ],
    2: [
      q(
        "Qu'avez-vous appris sur votre façon d'aimer, en famille, en amitié ou en amour ?",
        'exception',
        ["Mon besoin d'être rassuré(e)", 'Ma façon de donner', 'Mes limites'],
      ),
      q(
        "Qu'est-ce qui vous fait vous sentir choisi(e) par quelqu'un ?",
        'besoin',
        ['Être présenté(e) aux siens', 'Être une priorité', 'Être écouté(e)'],
      ),
      q(
        'Que veut dire la pudeur pour vous, très concrètement, dans une vie à deux ?',
        'sens',
        [
          'Une valeur à préserver',
          'Une confiance qui grandit',
          'Une liberté de chacun',
        ],
      ),
      q(
        "Dans votre famille, comment se montrait-on de l'affection ?",
        'origine',
        ['Par des mots', 'Par des gestes', 'Par des actes'],
      ),
      q(
        "Pensez à un moment de tendresse qui vous a fait du bien, avec un proche ou dans une relation : qu'est-ce qui le rendait juste ?",
        'exception',
        ['Le moment choisi', 'La simplicité', "L'attention"],
      ),
      q(
        "Qu'est-ce qui, chez quelqu'un, vous donne envie de vous rapprocher ?",
        'besoin',
        ['Sa douceur', 'Son humour', 'Sa sincérité'],
      ),
      q(
        'Comment vos proches décriraient-ils la façon dont vous prenez soin de ceux que vous aimez ?',
        'circulaire',
        ['Avec attention', 'Avec des actes', 'Avec discrétion'],
      ),
      q(
        "Qu'est-ce qui, pour vous, distingue la tendresse de l'amitié ?",
        'sens',
        ['Les gestes', "L'exclusivité", 'Le désir'],
      ),
    ],
    3: [
      q(
        "Comment aimeriez-vous qu'on vous dise non, un soir, pour ne pas le vivre comme un rejet ?",
        'besoin',
        ['Avec douceur', 'Avec une explication', 'Avec un geste tendre'],
      ),
      q(
        "Quand vous dites non à un moment d'intimité, qu'aimeriez-vous que l'autre comprenne ?",
        'besoin',
        [
          "Que ce n'est pas un rejet",
          "Que j'ai besoin de temps",
          'Que je reste proche',
        ],
      ),
      q(
        "Dans une vie à deux, à quoi sentez-vous que l'autre tient vraiment à vous ?",
        'besoin',
        ['Les attentions', 'Les mots', 'Le temps pris pour moi'],
      ),
      q(
        "En tendresse, quel besoin aimeriez-vous pouvoir dire simplement, sans attendre qu'on le devine ?",
        'besoin',
        ['Un besoin de douceur', 'Un besoin de temps', 'Un besoin de mots'],
      ),
      q(
        "Dans une vie à deux bien installée, qu'est-ce qui, pour vous, garde vivant le désir de se retrouver ?",
        'sens',
        ['La surprise', 'La complicité', 'Le temps à deux'],
      ),
      q(
        "Si la routine s'installait, comment aimeriez-vous que l'un de vous en parle en premier ?",
        'reparation',
        ['Avec humour', 'Avec franchise', 'Avec une proposition'],
      ),
      q(
        "Si l'autre trouvait difficile de parler d'intimité, qu'est-ce qui vous aiderait à respecter son rythme ?",
        'besoin',
        ['La patience', "L'écrit", 'Un cadre calme'],
        ['M6_Q06'],
      ),
      q(
        "Imaginez qu'après des années, vous vous sentiez encore attendu(e) par l'autre le soir : qu'est-ce qui aurait permis cela ?",
        'miracle',
        ['Des rituels', 'De la curiosité', 'De la tendresse'],
      ),
      q(
        'Le jour où la vie serait très chargée, quel moment à deux aimeriez-vous protéger avant tout ?',
        'projection',
        [
          'Une soirée par semaine',
          'Un week-end par saison',
          'Un moment chaque jour',
        ],
      ),
    ],
  },
  communication: {
    1: [
      q(
        "Pendant une dispute, quel comportement de l'autre vous ferait quitter la pièce ?",
        'limite',
        ['Les cris', 'Le mépris', 'Les reproches sur le passé'],
      ),
      q(
        "Si l'autre se moquait de vous devant des amis, qu'auriez-vous besoin de lui dire ensuite ?",
        'besoin',
        ['Que cela me blesse', 'Où est ma limite', 'Ce que j’attends'],
      ),
      q(
        'Quelle parole, même dite sous la colère, vous resterait longtemps en travers ?',
        'limite',
        ['Une insulte', 'Une menace de départ', 'Un mot sur ma famille'],
      ),
      q(
        'Comment un proche qui vous a vu(e) en colère décrirait-il votre façon de vous calmer ?',
        'circulaire',
        ['Par le silence', 'Par la parole', 'Par le mouvement'],
      ),
      q(
        "De 0 à 10, à quel point avez-vous besoin de parler tout de suite après un désaccord, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M6_Q01'],
      ),
      q(
        "Autour du téléphone, quel geste de l'autre vous ferait sentir respecté(e) dans votre jardin secret ?",
        'besoin',
        ['Ne pas regarder mon écran', 'Demander avant', 'Ne rien exiger'],
        ['M5_Q08'],
      ),
      q(
        "Imaginez qu'après une dispute, l'autre ne vous parle plus pendant deux jours : que ressentez-vous au deuxième soir ?",
        'scene',
        ['De la peine', 'De la colère', "L'envie de faire un pas"],
        ['M2_Q07'],
      ),
      q(
        "Au plus fort d'une dispute, qu'avez-vous le plus besoin que l'autre comprenne ?",
        'besoin',
        ['Ma peine', 'Ma limite', 'Mon besoin de calme'],
      ),
    ],
    2: [
      q(
        'Quand vous êtes blessé(e), de quoi avez-vous besoin en premier ?',
        'besoin',
        ["Qu'on m'écoute", "Qu'on reconnaisse le tort", "D'un peu de temps"],
      ),
      q(
        'Dans votre famille, qui faisait le premier pas après un conflit ?',
        'origine',
        ['Un parent', 'Les enfants', 'Personne'],
      ),
      q(
        "Qu'est-ce qui vous donne le sentiment d'être vraiment écouté(e) ?",
        'besoin',
        ['Un regard', 'Une question', 'Un geste après'],
      ),
      q(
        "Quand vous n'obtenez pas ce que vous voulez, comment le montrez-vous ?",
        'sens',
        ['Je le dis', 'Je me tais', "Je m'éloigne un moment"],
      ),
      q(
        'Comment un proche décrirait-il votre façon de reconnaître que vous avez eu tort ?',
        'circulaire',
        ['Rapide', 'Lente', 'Par des gestes'],
      ),
      q(
        "Quand vous vous retirez d'une discussion, qu'est-ce que vous cherchez à protéger ?",
        'besoin',
        ["L'autre", 'Moi-même', 'La relation'],
      ),
      q(
        "Quand quelqu'un se retire d'une discussion avec vous, qu'est-ce que cela réveille en vous ?",
        'emotion',
        ['De l’inquiétude', 'De la colère', 'Du calme'],
      ),
      q(
        "Pensez à un désaccord, en famille ou entre proches, qui s'est bien terminé : qu'est-ce qui, selon vous, l'a rendu différent ?",
        'exception',
        ['Le ton', 'Le moment', "L'écoute"],
      ),
      q(
        "De 0 à 10, à quel point arrivez-vous à dire ce qui vous contrarie au moment où cela arrive, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M9_Q04'],
      ),
    ],
    3: [
      q(
        "Après une tension, quel mot ou quel geste vous aide à revenir vers quelqu'un ?",
        'reparation',
        ['Une excuse', 'Un geste tendre', 'Une proposition de reparler'],
        ['M6_Q11'],
      ),
      q(
        "En famille ou entre amis, qu'avez-vous appris à faire d'un désaccord qui revient toujours ?",
        'perpetuel',
        ['En rire', "L'accepter", 'En reparler autrement'],
      ),
      q(
        "Si un même sujet revenait sans cesse entre vous, qu'est-ce qui vous aiderait à en parler sans chercher à gagner ?",
        'perpetuel',
        ['Un moment prévu', "L'écoute", "L'humour"],
        ['M6_Q03'],
      ),
      q(
        "Imaginez qu'après une dispute, vous vous retrouviez plus proches qu'avant : qu'est-ce qui se serait passé ?",
        'miracle',
        ['Une vraie écoute', 'Une excuse', 'Un geste'],
      ),
      q(
        "Quel rituel simple aimeriez-vous pour vous dire les choses importantes, sans attendre qu'elles débordent ?",
        'projection',
        ['Un moment chaque semaine', 'Un message écrit', 'Une promenade'],
      ),
      q(
        "Si vous traversiez une période très difficile, comment aimeriez-vous que l'autre vous soutienne ?",
        'besoin',
        ['Par sa présence', 'Par de l’espace', 'Par une aide concrète'],
      ),
      q(
        'Quand quelque chose vous coûte à exprimer, quelle façon de le faire comprendre vous convient le mieux ?',
        'besoin',
        ["L'écrit", 'Un geste', 'Un moment calme'],
        ['M2_Q19'],
      ),
      q(
        "Un soir ordinaire, l'un rentre fatigué et l'autre a envie de parler : comment aimeriez-vous que ce moment se passe ?",
        'scene',
        [
          'Un temps de calme, puis parler',
          'Parler un peu tout de suite',
          'Remettre au lendemain',
        ],
        ['M8_Q06'],
      ),
    ],
  },
  projet: {
    1: [
      q(
        "Qu'est-ce qui vous a donné envie de vous inscrire sur BOLIGO à ce moment de votre vie ?",
        'besoin',
        [
          'Je me sens prêt(e)',
          'Le désir de fonder',
          'Ce que je cherche est clair',
        ],
        ['M8_Q01'],
      ),
      q(
        "Qu'est-ce qui vous ferait dire qu'une relation n'est pas sérieuse ?",
        'sens',
        [
          "L'absence de projet",
          'Le refus de présenter ses proches',
          'Le manque de temps',
        ],
      ),
      q(
        "Quand quelqu'un reste vague sur l'avenir, qu'est-ce que cela réveille en vous ?",
        'emotion',
        ['De la patience', "De l'inquiétude", 'De la méfiance'],
        ['M8_Q02'],
      ),
      q(
        "Si l'autre voulait reprendre de longues études et gagner moins pendant des années, que se passerait-il en vous ?",
        'besoin',
        ["D'un plan", 'De confiance', 'De temps à deux'],
        ['M7_Q02'],
      ),
      q(
        'Quelle part de votre vie actuelle tiendriez-vous à garder intacte, même dans une vie à deux heureuse ?',
        'limite',
        ['Mon travail', 'Mes amitiés', 'Ma liberté'],
      ),
      q(
        "Comment un ami proche décrirait-il ce que vous attendez vraiment d'une vie à deux ?",
        'circulaire',
        ['De la stabilité', 'Du partage', 'De l’élan'],
      ),
      q(
        "De 0 à 10, à quel point vous sentez-vous prêt(e) à vous engager dans l'année qui vient, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M8_Q02'],
      ),
    ],
    2: [
      q('Par quoi, pour vous, un engagement sérieux se prouve-t-il ?', 'sens', [
        'Des actes',
        'Une date',
        'La présence dans les épreuves',
      ]),
      q(
        "Si vous pensez à un couple que vous admirez, qu'est-ce qui vous touche dans sa façon d'être ensemble ?",
        'origine',
        ['Sa complicité', 'Sa loyauté', 'Sa façon de traverser les épreuves'],
      ),
      q(
        'Pour vous, réussir sa vie, à quoi cela se verrait-il dans dix ans ?',
        'sens',
        ['Une famille unie', 'Un travail qui a du sens', 'Une vie libre'],
      ),
      q(
        "Qu'est-ce qui, en vous, pourrait encore hésiter face à un engagement ?",
        'besoin',
        ['La peur de me tromper', 'Mon indépendance', 'Le rythme'],
      ),
      q(
        "Quel rêve d'enfance vit encore dans l'un de vos projets d'aujourd'hui ?",
        'besoin',
        [
          'Un rêve de sécurité',
          'Un rêve de liberté',
          'Un rêve de transmission',
        ],
      ),
      q(
        "Qu'est-ce que ceux qui vous ont élevé(e) espéraient pour votre vie ?",
        'origine',
        ['La réussite', 'La sécurité', 'Le bonheur simple'],
      ),
      q(
        'Quelle décision de votre vie vos proches citeraient-ils pour dire qui vous êtes ?',
        'circulaire',
        ['Un départ', 'Un engagement', 'Un refus'],
      ),
      q(
        "Qu'est-ce qu'une vie à deux pourrait vous apporter que vous ne trouvez pas seul(e) ?",
        'besoin',
        ['Du partage', 'De la sécurité', 'De l’élan'],
      ),
    ],
    3: [
      q(
        'Imaginez un mardi soir ordinaire, dans cinq ans : à quoi ressemble votre soirée ?',
        'scene',
        ['En famille', 'À deux', 'Chacun son activité, puis ensemble'],
        ['M7_Q08'],
      ),
      q(
        'Imaginez que, dans dix ans, vous regardiez votre vie à deux avec fierté : quel choix aurait tout changé ?',
        'miracle',
        ['Un choix de lieu', 'Un choix de rythme', 'Un choix de priorités'],
      ),
      q(
        "Le jour où le travail prendrait toute la place, à quel signe sentiriez-vous qu'il est temps de rééquilibrer ?",
        'limite',
        ['La fatigue', 'Moins de temps à deux', 'Une remarque d’un proche'],
        ['M7_Q02'],
      ),
      q(
        "Quel projet personnel aimeriez-vous que l'autre protège, même quand la vie sera chargée ?",
        'besoin',
        ['Un projet de travail', 'Une passion', 'Un engagement associatif'],
      ),
      q(
        "Si vos rythmes de vie restaient différents, qu'est-ce qui vous aiderait à vous retrouver chaque semaine ?",
        'perpetuel',
        ['Un rendez-vous fixe', 'Des messages', 'Un projet commun'],
        ['M7_Q08'],
      ),
      q(
        "De 0 à 10, à quel point aimez-vous que l'avenir soit planifié, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M7_Q05'],
      ),
      q(
        'Quel temps à vous seul(e) aimeriez-vous garder dans une semaine à deux ?',
        'besoin',
        [
          'Une soirée',
          'Un moment chaque jour',
          'Un week-end de temps en temps',
        ],
        ['M7_Q08'],
      ),
    ],
  },
  lieu: {
    1: [
      q(
        'Si un travail rêvé vous attendait loin, de quoi auriez-vous besoin pour en décider à deux ?',
        'besoin',
        ['De temps', 'D’un projet commun', 'De l’avis des miens'],
        ['M0_Q03'],
        // Décider à deux d'un départ : jamais quand le lieu de vie est un
        // point non négociable.
        true,
      ),
      q(
        "Si vous partiez vivre là où l'autre a ses racines, qu'est-ce qui vous manquerait le plus ?",
        'projection',
        ['Mes proches', 'Ma langue', 'Mes repères'],
        ['M7_Q07'],
        true,
      ),
      q(
        "Si l'autre ne pouvait pas quitter sa ville, qu'est-ce que cela changerait pour vous ?",
        'limite',
        [
          'Rien, je peux bouger',
          'Tout dépend de mon travail',
          'Ce serait difficile',
        ],
        ['M0_Q03'],
      ),
      q(
        "Qu'est-ce que vous ne pourriez pas laisser derrière vous, même par amour ?",
        'limite',
        ['Mes proches', 'Mon travail', 'Mon pays'],
        ['M0_Q03'],
      ),
      q(
        'Comment un proche décrirait-il le lien qui vous unit au lieu où vous vivez ?',
        'circulaire',
        ['Un lien fort', 'Un lien pratique', 'Un lien léger'],
        ['M7_Q07'],
      ),
      q(
        "De 0 à 10, à quel point êtes-vous prêt(e) à changer de ville pour quelqu'un, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M0_Q03'],
      ),
      q(
        "Sous le même toit, quel espace ou quel moment à vous tiendriez-vous à garder, quoi qu'il arrive ?",
        'limite',
        ['Un coin à moi', 'Un moment seul(e)', 'Mes affaires'],
        ['M4_Q13'],
      ),
      q(
        "Si un travail vous éloignait de l'autre plusieurs mois, qu'est-ce qui vous aiderait à garder le lien ?",
        'besoin',
        ['Des appels réguliers', 'Une date de retour', 'Des visites'],
        undefined,
        true,
      ),
    ],
    2: [
      q('Où vous sentez-vous vraiment chez vous ?', 'sens', [
        "Là où j'ai grandi",
        'Là où sont mes proches',
        'Partout où je construis',
      ]),
      q(
        "Quand vous arrivez dans un nouvel endroit, qu'est-ce qui vous aide à vous y sentir chez vous ?",
        'exception',
        ['Des visages connus', 'Mes habitudes', 'Mes objets'],
      ),
      q('Quel endroit de votre passé vous manque encore parfois ?', 'origine', [
        'Une maison',
        'Un quartier',
        'Un pays',
      ]),
      q(
        'Dans votre famille, que disait-on de ceux qui partent vivre loin ?',
        'origine',
        ['On les admirait', 'On les regrettait', 'On les jugeait'],
        ['M0_Q03'],
      ),
      q(
        'Quel paysage ou quelle ambiance vous ressource le plus quand vous êtes fatigué(e) ?',
        'besoin',
        ["L'énergie d'une ville", 'Le calme de la nature', 'La mer'],
      ),
      q(
        "Si l'on demandait à vos amis où vous êtes le plus vous-même, quel endroit citeraient-ils ?",
        'circulaire',
        ['Chez moi', 'Chez les miens', 'En voyage'],
      ),
      q(
        "Qu'est-ce que le lieu de vos racines représente pour vous aujourd'hui ?",
        'origine',
        ['Une fierté', 'Un projet de retour', 'Un souvenir'],
        ['M7_Q07'],
      ),
      q(
        "Quel objet, emporté de logement en logement, raconte le mieux d'où vous venez ?",
        'origine',
        ['Un objet de famille', 'Une photo', 'Un livre'],
      ),
    ],
    3: [
      q(
        "Si vous suiviez un jour quelqu'un dans une autre ville, qu'auriez-vous peur de lui reprocher plus tard ?",
        'besoin',
        ['Mon travail perdu', 'Mes proches éloignés', 'Mes repères'],
        ['M0_Q03'],
      ),
      q(
        "Imaginez votre premier samedi sous le même toit : qu'est-ce qui est déjà à sa place pour que vous vous sentiez bien ?",
        'scene',
        ['Mes objets', 'Un coin à moi', 'Une table pour recevoir'],
        ['M4_Q13'],
      ),
      q(
        'Imaginez un endroit où vous vous sentiriez chez vous tous les deux : quel serait le premier détail qui vous le dirait ?',
        'miracle',
        ['La lumière', 'Le voisinage', 'Les objets des deux'],
        undefined,
        true,
      ),
      q(
        'Si vos familles vivaient dans deux pays différents, comment aimeriez-vous partager les fêtes et les vacances ?',
        'projection',
        ['En alternance', 'Moitié chez chacun', 'Nos propres voyages'],
        undefined,
        true,
      ),
      withChildren(
        q(
          "Pour élever un enfant, qu'est-ce qu'un lieu de vie aurait à offrir avant tout à vos yeux ?",
          'sens',
          ['La sécurité', 'La famille proche', 'Des écoles'],
        ),
      ),
      q(
        "De 0 à 10, à quel point avez-vous besoin de vivre près de votre famille, et qu'est-ce qui vous fait choisir ce chiffre ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M5_Q07'],
      ),
      q(
        "Si l'un de vous rêvait d'ailleurs et l'autre d'ici, qu'est-ce qui vous aiderait à en parler sans vous braquer ?",
        'perpetuel',
        ['Du temps', 'Un projet daté', 'Un essai'],
        ['M7_Q07'],
        true,
      ),
      q(
        "Le jour où l'un de vous aurait le mal du pays, comment aimeriez-vous que l'autre réagisse ?",
        'reparation',
        ['Avec écoute', 'Avec un voyage', 'Avec patience'],
        undefined,
        true,
      ),
      // Sans compromis : ce dont chacun a besoin, jamais un arrangement.
      q(
        "Quand vous imaginez l'endroit où vous vivrez dans dix ans, qu'est-ce qui ne pourrait pas y manquer ?",
        'projection',
        ['Mes proches', 'Mon travail', 'Mes racines'],
        ['M7_Q07'],
      ),
      q(
        "Qu'est-ce qui vous ferait dire, un jour, que vous vivez au bon endroit ?",
        'miracle',
        [
          'Mes proches autour',
          'Un travail qui me plaît',
          'Un sentiment de paix',
        ],
      ),
    ],
  },
};

// ─── Gabarits ciblés sur un écart réel (le sujet, jamais les réponses) ───────

export interface TopicTemplate {
  text: (w: TopicWords) => string;
  options: string[];
  technique: Technique;
  /**
   * Suppose que l'on vivra avec la différence : jamais servi sur un point non
   * négociable (enfants, foi exigée, polygamie, fidélité…).
   */
  compromise?: boolean;
}

function tt(
  text: (w: TopicWords) => string,
  technique: Technique,
  options: [string, string, string],
  compromise = false,
): TopicTemplate {
  return {
    text,
    technique,
    options: opts(...options),
    ...(compromise ? { compromise } : {}),
  };
}

/**
 * Écart réel entre les deux entretiens. Jour 1 : ce que la position protège ;
 * jour 2 : d'où elle vient ; jour 3 : ce qu'il faudrait en savoir avant de
 * s'engager.
 */
export const TARGETED: Record<number, TopicTemplate[]> = {
  1: [
    tt(
      (w) =>
        `Sur ${w.phrase}, qu'est-ce qui vous ferait sentir respecté(e), même si l'autre voit les choses autrement ?`,
      'besoin',
      [
        "Être écouté(e) jusqu'au bout",
        'Ne pas être jugé(e)',
        'Que ma limite compte',
      ],
      true,
    ),
    tt(
      (w) =>
        `À propos ${w.de}, qu'est-ce que votre position protège de plus précieux pour vous ?`,
      'besoin',
      ['Ma sécurité', 'Ma liberté', 'Ma fidélité à mes valeurs'],
    ),
    tt(
      (w) =>
        `De 0 à 10, à quel point votre position sur ${w.phrase} est-elle arrêtée, et qu'est-ce qui vous fait choisir ce chiffre ?`,
      'echelle',
      ['Position ouverte', 'Position réfléchie', 'Position arrêtée'],
      true,
    ),
    tt(
      (w) =>
        `Comment un proche qui vous connaît bien expliquerait-il votre position sur ${w.phrase} ?`,
      'circulaire',
      [
        'Une question de valeurs',
        "Une question d'histoire",
        'Une question de sécurité',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, qu'auriez-vous besoin de comprendre de l'autre avant d'aller plus loin ?`,
      'limite',
      [
        'Ce que sa position veut dire',
        "D'où elle lui vient",
        "Ce qu'elle protège",
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, qu'auriez-vous besoin d'entendre de l'autre pour en parler sans vous braquer ?`,
      'reparation',
      [
        'Qu’il ou elle me comprend',
        'Qu’on ne cherche pas à me convaincre',
        "Qu'on a le temps",
      ],
      true,
    ),
    tt(
      (w) =>
        `À propos ${w.de}, à quel moment une discussion deviendrait-elle trop lourde pour vous ?`,
      'limite',
      [
        'Quand on me presse',
        'Quand on me juge',
        'Quand on y revient sans cesse',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, qu'est-ce qui, pour vous, restera ferme quoi qu'il arrive ?`,
      'limite',
      [
        'Une condition de foi',
        'Une condition de vie',
        'Une condition familiale',
      ],
    ),
  ],
  2: [
    tt(
      (w) => `Quel moment de votre vie a forgé votre regard sur ${w.phrase} ?`,
      'origine',
      [
        'Un exemple familial',
        'Une expérience vécue',
        'Une conviction mûrie seul(e)',
      ],
    ),
    tt(
      (w) => `Dans la famille où vous avez grandi, que disait-on ${w.de} ?`,
      'origine',
      [
        'On en parlait ouvertement',
        'On en parlait peu',
        "On n'en parlait jamais",
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, qu'aimeriez-vous que l'autre comprenne de votre histoire ?`,
      'besoin',
      [
        "Ce que j'ai vu grandir",
        "Ce que j'ai vécu",
        'Ce que je me suis promis',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, quelle valeur reçue de votre famille tenez-vous à garder intacte ?`,
      'origine',
      ['Le respect', 'La loyauté', 'La liberté'],
    ),
    tt(
      (w) =>
        `Pensez à une personne que vous estimez et qui voit ${w.phrase} autrement que vous : qu'est-ce qui vous touche chez elle ?`,
      'exception',
      ['Sa cohérence', 'Sa liberté', 'Sa générosité'],
      true,
    ),
    tt(
      (w) =>
        `Comment un proche décrirait-il votre manière de défendre vos idées sur ${w.phrase} ?`,
      'circulaire',
      ['Avec calme', 'Avec passion', 'Avec réserve'],
    ),
    tt(
      (w) => `À propos ${w.de}, de qui ou de quoi tenez-vous votre position ?`,
      'origine',
      ['De ma famille', 'De ma foi', 'De mon expérience'],
    ),
  ],
  3: [
    // Jour 3 : ce qu'il faudrait savoir avant de s'engager. Aucun de ces
    // gabarits ne suppose de « vivre avec » l'écart.
    tt(
      (w) =>
        `Avant tout engagement, qu'auriez-vous besoin d'avoir compris de la position de l'autre sur ${w.phrase} ?`,
      'limite',
      [
        'Ce qui ne bougera pas',
        "D'où elle lui vient",
        'Ce qu’elle demande à chacun',
      ],
    ),
    tt(
      (w) =>
        `Sur ${w.phrase}, que voudriez-vous avoir clarifié à deux avant de vous engager ?`,
      'limite',
      ['Nos attentes', 'Ce qui ne se discute pas', 'Une règle simple'],
    ),
    tt(
      (w) =>
        `Quel exemple concret aimeriez-vous entendre de l'autre sur ${w.phrase}, avant une vie commune ?`,
      'sens',
      [
        'Une scène de son quotidien',
        'Un choix déjà fait',
        'Une habitude de sa famille',
      ],
    ),
    tt(
      (w) =>
        `Avant un engagement, que diriez-vous de vous-même sur ${w.phrase}, pour que l'autre sache à quoi s'attendre ?`,
      'besoin',
      ['Ce qui compte pour moi', 'Ce que je ne changerai pas', 'Mes doutes'],
    ),
    tt(
      (w) =>
        `Avant de vous dire oui, quelle question aimeriez-vous poser à l'autre à propos ${w.de} ?`,
      'limite',
      [
        'Ce qui ne bougera pas',
        "D'où vient sa position",
        'Ce qu’il ou elle attend',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, que voudriez-vous avoir posé clairement avant de vivre sous le même toit ?`,
      'limite',
      ['Une règle simple', 'Une limite', 'Un accord écrit'],
    ),
    tt(
      (w) =>
        `En pensant ${w.a}, quel petit geste du quotidien vous montrerait que l'autre respecte votre position ?`,
      'besoin',
      ['Une attention', 'Une parole', 'Une règle tenue'],
      true,
    ),
    tt(
      (w) =>
        `À propos ${w.de}, que vous faudrait-il savoir de l'autre, très concrètement, pour une vie à deux ?`,
      'limite',
      [
        'Ce qu’il ou elle ne changera pas',
        'Ce qu’il ou elle attend de moi',
        'Sa façon de vivre ce point',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, qu'aimeriez-vous que l'autre sache de vous avant même un premier projet commun ?`,
      'besoin',
      [
        'Ce qui ne bougera pas',
        'D’où vient ma position',
        'Ce dont j’ai besoin',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, quelle parole claire aimeriez-vous échanger avec l'autre avant de vivre ensemble ?`,
      'limite',
      ['Une promesse', 'Une limite', 'Une attente'],
    ),
  ],
};

/**
 * Risque partagé (même réponse des deux côtés, et c'est elle qui pose
 * problème : deux silences, deux réconciliations lentes). La question ne dit
 * jamais que les réponses sont identiques, ce qui révélerait celle de
 * l'autre : elle prépare la réparation. Les risques connus ont leurs
 * formulations propres (TOPIC_DEEP, « …:partage ») ; celles-ci servent de
 * repli pour une règle à venir.
 */
export const SHARED_RISK: Record<number, TopicTemplate[]> = {
  1: [
    tt(
      (w) =>
        `À propos ${w.de}, à quel signe sentez-vous, dans un moment de tension, que la situation commence à vous échapper ?`,
      'emotion',
      ['Je me tais', "Je m'agace vite", 'Je prends mes distances'],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, pensez à une fois, en famille ou ailleurs, où une tension s'est bien dénouée : qu'est-ce qui vous a aidé ?`,
      'exception',
      ['Un geste', 'Du temps', 'Une parole juste'],
    ),
  ],
  2: [
    tt(
      (w) =>
        `À propos ${w.de}, que ressentez-vous à l'intérieur, dans un moment de tension, que l'autre ne voit pas forcément ?`,
      'emotion',
      [
        'De la colère retenue',
        'De la peur de blesser',
        'Le besoin de me protéger',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, qui vous a appris, par l'exemple, à réagir comme vous le faites aujourd'hui ?`,
      'origine',
      ['Un parent', 'Une expérience vécue', 'Personne : je me suis protégé(e)'],
    ),
  ],
  3: [
    tt(
      (w) =>
        `À propos ${w.de}, quel signal discret aimeriez-vous convenir à deux pour dire que vous êtes prêt(e) à reparler ?`,
      'reparation',
      ['Un mot convenu', 'Un geste tendre', 'Un moment proposé'],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, le jour où une dispute s'installerait, qu'est-ce qui vous aiderait, vous, à faire le premier pas ?`,
      'reparation',
      [
        'Savoir que je serai accueilli(e)',
        'Un délai convenu',
        'Un mot de l’autre',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, quelle règle simple aimeriez-vous poser dès le début pour garder le dialogue ouvert ?`,
      'limite',
      [
        'Ne pas laisser passer la nuit',
        'Reparler dans les 24 heures',
        'Demander de l’aide si cela se répète',
      ],
    ),
  ],
};

// ─── Formulations propres à un sujet (écarts V6.1, échelles, points clés) ────

/**
 * Formulations de fond propres à un sujet, par jour. Elles passent avant les
 * gabarits ciblés : une question pensée pour ce sujet fait parler plus vrai.
 * Elles ne citent jamais les réponses : ce sont les seules qui servent les
 * écarts tirés des échelles et des aveux (jamais un score, jamais un aveu).
 */
export const TOPIC_DEEP: Record<
  string,
  Partial<Record<number, PoolTemplate>>
> = {
  M4_Q10: {
    1: q(
      "Premier rendez-vous : le serveur pose l'addition au milieu de la table. Que se passe-t-il en vous pendant ces quelques secondes ?",
      'scene',
      ['De la gêne', 'De la fierté', 'Du calme'],
    ),
    2: q(
      "Dans votre culture ou votre famille, qu'est-ce que la façon de régler l'addition dit d'une personne ?",
      'origine',
      ['Son respect', 'Son indépendance', 'Sa générosité'],
    ),
    3: q(
      "Au fil des sorties, qu'est-ce qui vous ferait sentir à égalité, même avec des revenus différents ?",
      'projection',
      ['Payer chacun son tour', 'Selon les moyens', 'Ne pas compter'],
    ),
  },
  M4_Q11: {
    1: q(
      "Quand l'argent vient à manquer, qu'attendez-vous avant tout de la personne qui partage votre vie ?",
      'besoin',
      [
        'Qu’il ou elle cherche une solution',
        'De la transparence',
        'Du courage',
      ],
    ),
    2: q(
      "Dans votre famille, que disait-on de ceux qui traversent un manque d'argent ?",
      'origine',
      ['On les aidait', 'On les jugeait', "On n'en parlait pas"],
    ),
    3: q(
      "Avant d'unir vos vies, qu'aimeriez-vous que l'autre sache de ce que vous attendriez de lui ou d'elle si l'argent manquait longtemps ?",
      'besoin',
      [
        'Qu’il ou elle cherche activement un revenu',
        'De la transparence',
        'Un plan à deux',
      ],
    ),
  },
  M4_Q12: {
    1: q(
      "Au-delà du confort, qu'est-ce qu'un certain niveau de vie vous apporte intérieurement ?",
      'besoin',
      ['De la sécurité', 'De la fierté', 'De la liberté'],
    ),
    2: q(
      "Dans la famille où vous avez grandi, qu'est-ce qui donnait de la valeur à une personne ?",
      'origine',
      ['Sa réussite', 'Sa droiture', 'Sa générosité'],
    ),
    3: q(
      "En dehors de l'argent, qu'est-ce que l'autre pourrait apporter au foyer pour que vous vous sentiez à égalité ?",
      'besoin',
      ['Du temps', 'Du soin', 'Des idées'],
    ),
  },
  M4_Q13: {
    1: q(
      "Sous un même toit, quel coin ou quel objet aimeriez-vous garder rien qu'à vous pour vous sentir chez vous ?",
      'besoin',
      ['Un coin à moi', 'Un objet précieux', 'Mes affaires de travail'],
    ),
    2: q(
      'Dans la maison où vous avez grandi, quel endroit ou quel objet était vraiment à vous ?',
      'origine',
      ['Une chambre', 'Un coin à moi', 'Rien en particulier'],
    ),
    3: q(
      "Quand vous vivrez avec quelqu'un, qu'est-ce qui restera à vous seul(e), même sous le même toit ?",
      'projection',
      ['Un objet', 'Un espace', 'Un moment'],
    ),
  },
  M8_Q11: {
    1: q(
      "Si la vie mettait l'un de vous à l'épreuve pendant des années, qu'est-ce qui vous aiderait à rester présent(e) sans vous perdre ?",
      'besoin',
      ['Du soutien autour', 'Du temps pour moi', 'Ma foi ou mes valeurs'],
    ),
    2: q(
      "Qui, dans votre entourage, vous a montré ce que veut dire prendre soin de quelqu'un dans la durée ?",
      'origine',
      ['Un parent', 'Un proche', 'Personne encore'],
    ),
    3: q(
      "Dans une épreuve longue, sur qui aimeriez-vous pouvoir compter, en plus de l'autre ?",
      'projection',
      ['Nos familles', 'Des amis', 'Des aides extérieures'],
    ),
  },
  M10_Q15: {
    3: q(
      "Si l'étincelle n'était pas là dès le premier échange, qu'est-ce qui vous donnerait envie de laisser le temps faire ?",
      'projection',
      ['La curiosité', 'Le rire', 'La confiance'],
    ),
  },
  M9_Q19: {
    1: q(
      "Quand quelqu'un vous fait sentir sa déception par un silence, que se passe-t-il en vous ?",
      'emotion',
      ["L'envie de céder", "De l'agacement", "L'envie de m'éloigner"],
    ),
    2: q(
      "Quand vous étiez enfant, que se passait-il quand vous n'obteniez pas ce que vous vouliez ?",
      'origine',
      [
        'On me cédait souvent',
        'On m’expliquait, puis on tenait bon',
        'Je devais m’en contenter',
      ],
    ),
    3: q(
      "Quand une envie de l'un ne pourra pas être satisfaite, comment aimeriez-vous qu'on se le dise ?",
      'projection',
      ['Avec des mots clairs', 'Avec un geste', 'Plus tard, au calme'],
    ),
  },
  M9_Q16: {
    1: q(
      "Le jour où vous voudrez deux choses opposées le même soir, qu'est-ce qui vous aiderait à lâcher prise ?",
      'besoin',
      [
        'Savoir que mon tour viendra',
        'Comprendre son besoin',
        'Une règle simple',
      ],
    ),
    2: q(
      "Si vous boudiez un jour, qu'espéreriez-vous que l'autre comprenne sans que vous ayez à le dire ?",
      'besoin',
      ['Le sentiment de ne pas compter', 'La fatigue', "L'envie qu'on devine"],
    ),
    3: q(
      "Quelle règle aimeriez-vous poser pour qu'une envie non satisfaite ne gâche pas une journée à deux ?",
      'projection',
      ['Dire ce qu’on veut', 'Accepter un non', 'Chercher une autre idée'],
    ),
  },
  M2_Q19: {
    1: q(
      "Pour un premier échange de vive voix avec quelqu'un de nouveau, qu'est-ce qui vous mettrait à l'aise dès les premières minutes ?",
      'besoin',
      [
        'Un sujet léger',
        'Une question préparée',
        "Que l'autre se livre un peu",
      ],
    ),
    2: q(
      "Qu'est-ce qui vous aide à vous ouvrir à quelqu'un de nouveau ?",
      'besoin',
      [
        'Écrire avant de parler',
        'Un cadre calme',
        "Sentir que l'autre s'ouvre",
      ],
    ),
    3: q(
      "À quel signe saurez-vous que vous êtes vraiment à l'aise avec l'autre ?",
      'projection',
      [
        'Les silences ne gênent plus',
        'Je parle de mes doutes',
        'On rit facilement',
      ],
    ),
  },
  M2_Q11: {
    1: q(
      "Quand l'autre ne donne pas de nouvelles pendant une journée, qu'est-ce qui vous traverse l'esprit ?",
      'emotion',
      ['Rien de particulier', 'Une petite inquiétude', "L'envie d'écrire"],
    ),
    2: q(
      "Comment un proche qui vous connaît bien décrirait-il votre besoin de nouvelles quand vous êtes loin de quelqu'un que vous aimez ?",
      'circulaire',
      ['Un besoin fort', 'Un besoin moyen', 'Un besoin discret'],
    ),
    3: q(
      "De 0 à 10, à quel point avez-vous besoin de nouvelles dans la journée pour vous sentir proche, et qu'est-ce qui vous fait choisir ce chiffre ?",
      'echelle',
      ['Note basse', 'Note moyenne', 'Note haute'],
    ),
  },
  M6_Q15: {
    1: q(
      "Pendant une dispute, l'un a souvent besoin de parler tout de suite, l'autre de s'éloigner un moment. Quand cela vous arrive, qu'espérez-vous que l'autre comprenne ?",
      'besoin',
      [
        'Que je tiens à lui ou à elle',
        "Que j'ai besoin de calme",
        "Que j'ai besoin d'être entendu(e)",
      ],
    ),
    2: q(
      'Dans votre famille, que faisait-on quand le ton montait ?',
      'origine',
      ['On criait', 'On se taisait', 'On sortait'],
    ),
    3: q(
      "Quand une dispute montera, quel signal aimeriez-vous convenir pour faire une pause sans que l'autre se sente laissé(e) seul(e) ?",
      'reparation',
      ['Un mot convenu', 'Une heure de retour', 'Un geste'],
    ),
  },
  'M6_Q15:partage': {
    1: q(
      "Après une dispute, quand le silence s'installe des deux côtés, qu'est-ce qui pourrait vous aider à faire le premier pas ?",
      'reparation',
      ['Un délai convenu', 'Un message', 'Un geste'],
    ),
    2: q(
      "Pensez à une fois, en famille ou entre proches, où un long silence a fini par se dénouer : qu'est-ce qui, selon vous, l'a dénoué ?",
      'exception',
      ['Un geste', 'Une parole', 'Le temps'],
    ),
    3: q(
      'Quel signal discret aimeriez-vous convenir à deux pour dire, après un silence, que vous êtes prêt(e) à reparler ?',
      'reparation',
      ['Un mot', 'Un geste', 'Un moment proposé'],
    ),
  },
  M6_Q13: {
    1: q(
      "Pendant une dispute, quel ton de l'autre vous ferait vous sentir rabaissé(e) ?",
      'limite',
      ["L'ironie", 'La moquerie', 'Le mépris'],
    ),
    2: q(
      'Dans votre famille, où passait la frontière entre taquiner et blesser ?',
      'origine',
      ['On riait de tout', 'On faisait attention', 'La frontière était floue'],
    ),
    3: q(
      "Quand l'humour devient piquant dans une dispute, qu'est-ce qui vous aiderait à revenir au calme ?",
      'reparation',
      ['Un mot', 'Une pause', 'Un sourire sincère'],
    ),
  },
  'M8_Q10:A': {
    1: q(
      "Au début d'une relation, qu'est-ce qui rend des mots d'amour crédibles à vos yeux ?",
      'sens',
      ['Le temps', 'Les actes', 'La constance'],
    ),
    2: q(
      "Au fil de vos rencontres, si vous en avez vécu, qu'avez-vous appris sur le rythme auquel vous aimez entendre des mots tendres ?",
      'exception',
      ['Plutôt tôt', 'Plutôt tard', 'Au fil des actes'],
    ),
  },
  'M8_Q10:B': {
    1: q(
      "Où passe, pour vous, la frontière entre s'inquiéter pour l'autre et le surveiller ?",
      'limite',
      ['Poser une question', 'Demander des comptes', 'Vérifier en cachette'],
    ),
    2: q(
      "Dans votre famille, comment montrait-on à quelqu'un qu'on lui faisait confiance ?",
      'origine',
      [
        'En le laissant libre',
        'En le lui disant',
        'En lui confiant des choses',
      ],
    ),
  },
  'M8_Q10:C': {
    1: q(
      "Quand quelqu'un ne donne plus de nouvelles pendant plusieurs jours, que se passe-t-il en vous ?",
      'emotion',
      ["De l'inquiétude", 'De la colère', 'Du détachement'],
    ),
    2: q(
      "Quand vous avez besoin de vous retirer un moment, comment aimeriez-vous pouvoir le dire sans inquiéter l'autre ?",
      'besoin',
      ['Un message court', 'Une durée annoncée', 'Un mot convenu'],
    ),
  },
  'M8_Q10:D': {
    1: q(
      "Au début d'une relation, qu'est-ce qui vous montre que l'autre sait ce qu'il ou elle veut ?",
      'sens',
      ['Ses projets', 'Sa constance', 'Ses mots clairs'],
    ),
    2: q(
      "Si vous avez vécu d'autres rencontres, qu'avez-vous appris sur le bon moment pour dire ce que l'on attend ?",
      'exception',
      ['Très tôt', 'Après quelques semaines', 'Quand la confiance est là'],
    ),
  },
  'M8_Q10:E': {
    1: q(
      "Quand quelqu'un vous parle de ses anciennes relations, qu'est-ce qui vous met en confiance ?",
      'besoin',
      ['Du respect', 'Ce qu’il ou elle en a appris', 'De la discrétion'],
    ),
    2: q(
      "Si vous parlez un jour de relations passées, qu'aimeriez-vous que l'on entende de vous ?",
      'besoin',
      [
        'Ce que j’en ai appris',
        'Que la page est tournée',
        'Que je reste respectueux(se)',
      ],
    ),
  },
  'M8_Q10:H': {
    1: q(
      "Quand quelqu'un reconnaît ses torts devant vous, qu'est-ce qui rend ses mots sincères à vos yeux ?",
      'sens',
      ['Le ton', 'Les actes qui suivent', 'La précision'],
    ),
    2: q(
      "Dans votre famille, comment s'excusait-on, quand on s'excusait ?",
      'origine',
      ['Avec des mots', 'Avec des gestes', 'On ne s’excusait pas'],
    ),
  },
  'M8_Q10:J': {
    1: q(
      'Pendant un moment à deux, à quel instant un téléphone vous donnerait-il le sentiment de passer après ?',
      'limite',
      ['Au repas', 'Pendant une confidence', 'Dès le premier regard dessus'],
    ),
    2: q(
      'Pensez à une personne auprès de qui vous vous sentez pleinement écouté(e) : que fait-elle de différent ?',
      'besoin',
      ['Son regard', 'Ses questions', 'Son attention entière'],
    ),
  },
  M8_Q10: {
    1: q(
      "Au début d'une relation, qu'est-ce qui vous fait comprendre qu'il vaut mieux ralentir ?",
      'limite',
      ['Un manque de respect', 'Un flou', 'Une pression'],
    ),
    2: q(
      'Au fil de vos rencontres ou de vos amitiés, quel signal avez-vous appris à prendre au sérieux ?',
      'exception',
      ['Un silence', 'Une promesse', 'Un mot de trop'],
    ),
  },
  M0_Q06: {
    1: q(
      "Pour vous, qu'est-ce que votre choix sur les enfants protège de plus précieux ?",
      'besoin',
      ['Ma liberté', 'Mon envie de transmettre', 'Ma vision de la famille'],
    ),
    2: q(
      "Quel moment de votre vie a rendu votre désir d'enfants, ou son absence, si clair pour vous ?",
      'origine',
      ['Mon enfance', 'Une rencontre', 'Une réflexion mûrie'],
    ),
    3: q(
      "Que voudriez-vous comprendre de la place que l'autre donne aux enfants, avant de vous engager ?",
      'limite',
      ['Son désir profond', 'Ce qui ne bougera pas', 'D’où vient son choix'],
    ),
  },
  M1_Q11: {
    1: q(
      "Quand vous pensez à la polygamie, qu'est-ce qui, pour vous, ne se discute pas ?",
      'sens',
      ["L'exclusivité", 'Le consentement', 'La transparence'],
    ),
    2: q(
      'De qui ou de quoi tenez-vous votre position sur la polygamie ?',
      'origine',
      ['De ma foi', 'De ma famille', 'De ce que j’ai vu'],
    ),
  },
  M6_Q18: {
    1: q(
      'Quand vous pensez à la fidélité, quelle situation précise vous ferait vous sentir trahi(e) ?',
      'limite',
      ['Un mensonge', 'Un message caché', 'Une rencontre'],
    ),
    2: q(
      "Qui, autour de vous, vous a montré ce qu'est une fidélité solide ?",
      'origine',
      ['Mes parents', 'Un proche', 'Personne encore'],
    ),
    3: q(
      "Avant de vous engager, qu'aimeriez-vous que l'autre comprenne de ce que la fidélité veut dire pour vous, très concrètement ?",
      'sens',
      ['Ne rien cacher', 'Pas de séduction ailleurs', 'Tenir parole'],
    ),
  },
  M1_Q06: {
    1: q(
      "Qu'est-ce qui, dans votre foi ou vos convictions, a besoin d'être respecté, même par quelqu'un qui ne les partage pas ?",
      'besoin',
      ['Mes pratiques', 'Mes interdits', 'Mes fêtes'],
    ),
    2: q(
      "Qu'est-ce que votre foi, ou votre absence de foi, vous apporte dans les moments difficiles ?",
      'sens',
      ['Du courage', 'De la paix', 'Du recul'],
    ),
    3: q(
      "Avant de partager un foyer, qu'aimeriez-vous savoir de ce que la foi, ou son absence, change concrètement dans les journées de l'autre ?",
      'sens',
      ['Des prières', 'Des repas', 'Des fêtes'],
    ),
  },
  M1_Q05: {
    1: q(
      "Si l'autre ne partageait pas votre religion, qu'est-ce qui vous serait indispensable pour vous sentir respecté(e) ?",
      'besoin',
      [
        'Le respect de mes pratiques',
        'Le respect de mes fêtes',
        'Le respect de mes proches',
      ],
    ),
    2: q(
      "Qu'est-ce que votre religion ou votre spiritualité représente pour votre famille, au-delà de vous ?",
      'origine',
      ['Une fierté', 'Une attente', 'Une liberté'],
    ),
    3: q(
      "Avant tout engagement, que voudriez-vous savoir de ce que les convictions de l'autre, religieuses ou non, attendent d'un futur conjoint ?",
      'limite',
      ['Une même pratique', 'Le respect des rites', 'Rien de particulier'],
    ),
  },
  M0_Q08: {
    1: q(
      "En matière de tabac ou d'alcool, où s'arrête, pour vous, ce qui reste acceptable à la maison ?",
      'limite',
      ['Rien à la maison', 'Avec modération', 'Ça ne me gêne pas'],
    ),
    2: q(
      "Qu'avez-vous vu, en grandissant, qui a façonné votre regard sur le tabac ou l'alcool ?",
      'origine',
      ['Un proche', 'Des fêtes', 'Des règles strictes'],
    ),
  },
  M0_Q09: {
    1: q(
      "Sous le même toit, qu'est-ce qui serait non négociable pour vous à propos du tabac ?",
      'limite',
      [
        'Pas de tabac à l’intérieur',
        'Pas devant mes proches',
        'Rien de particulier',
      ],
    ),
    2: q(
      "Qu'est-ce que le tabac évoque pour vous, que vous fumiez ou non ?",
      'sens',
      ['Un souvenir', 'Une gêne', 'Une pause'],
    ),
  },
  M7_Q07: {
    1: q(
      "Qu'est-ce qui, dans le lieu où vous vivez, vous retient plus fort que tout le reste ?",
      'limite',
      ['Mes proches', 'Mon travail', 'Mes racines'],
    ),
    2: q(
      'Quel lieu de votre enfance vous revient quand vous imaginez votre futur foyer ?',
      'origine',
      ['Une maison', 'Un village', 'Une ville'],
    ),
    3: q(
      "Que vous faudrait-il savoir, avant tout engagement, du lien de l'autre avec le lieu où il ou elle vit ?",
      'limite',
      [
        'Ce qui le ou la retient',
        'Ses projets de départ',
        'La place de sa famille',
      ],
    ),
  },
  M0_Q03: {
    1: q(
      "Quand vous pensez à déménager pour quelqu'un, qu'est-ce qui, pour vous, ne se discute pas ?",
      'limite',
      ['Rester près des miens', 'Garder mon travail', 'Mes repères'],
    ),
    2: q(
      "Qu'avez-vous appris, en regardant vos proches, sur ceux qui suivent quelqu'un loin de chez eux ?",
      'origine',
      ['Que cela peut réussir', 'Que cela coûte', 'Que cela se prépare'],
    ),
    3: q(
      "Si l'un de vous déménageait pour l'autre, qu'est-ce qui l'aiderait à ne pas se sentir redevable des années plus tard ?",
      'reparation',
      ['Un choix fait à deux', 'Un projet pour lui ou elle', 'Le dire souvent'],
      undefined,
      true,
    ),
  },
  M5_Q01: {
    1: q(
      'Pour vous, où passe la frontière entre les choix du couple et ceux où la famille a son mot à dire ?',
      'limite',
      ['Le lieu de vie', 'Avoir des enfants ou non', 'Le mariage'],
    ),
    2: q(
      'Dans votre famille, qui avait le dernier mot sur les grandes décisions ?',
      'origine',
      ['Un parent', 'Les aînés', 'Chacun pour soi'],
    ),
    3: q(
      "Qu'aimeriez-vous comprendre, avant de vous engager, de la place que l'avis des aînés tient dans les décisions de l'autre ?",
      'limite',
      ['Un poids décisif', 'Un conseil écouté', 'Un avis parmi d’autres'],
    ),
  },
  M5_Q03: {
    1: q(
      "Si un parent venait vivre sous votre toit, qu'est-ce qui resterait, quoi qu'il arrive, à vous deux ?",
      'limite',
      ['Notre chambre', 'Nos décisions', 'Un temps à deux'],
    ),
    2: q(
      "Dans votre culture, qu'attend-on d'un couple quand un parent ne peut plus vivre seul ?",
      'origine',
      ["Qu'il l'accueille", "Qu'il l'aide de loin", "Qu'il décide à deux"],
    ),
    3: q(
      "Si un parent âgé ne pouvait plus vivre seul, que voudriez-vous savoir des choix de l'autre avant de vous dire oui ?",
      'limite',
      [
        "L'accueillir chez nous",
        'Une aide à domicile',
        'Une décision en famille',
      ],
    ),
  },
  M3_Q05: {
    1: q(
      'Dans une vie à deux, quels liens avec le passé vous sembleraient compatibles avec votre tranquillité ?',
      'limite',
      ['Aucun lien', 'Des liens utiles et clairs', 'Une amitié transparente'],
    ),
    2: q(
      "Si vous avez vécu une histoire importante, qu'est-ce qu'elle peut garder, pour vous, dans une vie nouvelle ?",
      'sens',
      ['Rien', 'Un respect', 'Une amitié'],
    ),
  },
  M8_Q01: {
    1: q(
      "Qu'attendez-vous d'une relation pour accepter de vous y engager pleinement ?",
      'besoin',
      [
        'Des projets communs',
        'Une parole claire',
        'Une présentation aux proches',
      ],
    ),
    2: q(
      "Pour vous, à quoi reconnaît-on qu'une relation devient sérieuse ?",
      'sens',
      ['Aux proches rencontrés', 'Aux projets', 'À la régularité'],
    ),
    3: q(
      "À quel signe sauriez-vous, avant de vous engager, que vous cherchez la même chose que l'autre ?",
      'limite',
      [
        'Des projets dits clairement',
        'Une date évoquée',
        'La rencontre des proches',
      ],
    ),
  },
  M4_Q05: {
    1: q(
      'Si un proche comptait sur vous financièrement, quel sentiment dominerait en vous ?',
      'emotion',
      ['De la fierté', 'Du poids', 'Du devoir'],
    ),
    2: q(
      'Dans votre famille, que disait-on de celui ou celle qui aide les siens ?',
      'origine',
      ["On l'admirait", 'On comptait sur lui ou elle', "On n'en parlait pas"],
    ),
    3: q(
      "Avant de partager un budget, que voudriez-vous savoir de ce que l'aide aux siens représente pour l'autre ?",
      'limite',
      ['Un devoir', 'Une fierté', 'Un choix'],
    ),
  },
  M4_Q01: {
    1: q(
      "Qu'est-ce que mettre son argent en commun voudrait dire pour vous, au-delà des chiffres ?",
      'sens',
      ['La confiance', 'Une perte de liberté', 'Un projet commun'],
    ),
    2: q(
      "Quand vous étiez enfant, qui décidait de ce que l'on faisait de l'argent à la maison ?",
      'origine',
      ['Un parent', 'Les deux parents', 'Chacun pour soi'],
    ),
    3: q(
      "Avant de vivre ensemble, qu'aimeriez-vous avoir dit à l'autre de votre façon de voir l'argent du foyer ?",
      'besoin',
      ['Ce qui est commun', 'Ce qui reste à moi', 'Ce qui se décide à deux'],
    ),
  },
  M1_Q10: {
    1: q(
      "Sur quelle décision accepteriez-vous que l'avis d'un aîné passe avant le vôtre ?",
      'limite',
      ['Aucune', 'Le mariage', 'Les grandes fêtes'],
    ),
    2: q(
      "Dans votre famille, quel aîné aura l'avis le plus fort sur la personne que vous choisirez ?",
      'origine',
      ['Un parent', 'Un grand-parent', 'Aucun'],
    ),
  },
  M4_Q07: {
    1: q(
      "À propos de la dot ou du mahr, qu'est-ce qui, pour vous, ne peut pas être négocié ?",
      'limite',
      ['Son principe', 'Son sens', 'Rien'],
    ),
    2: q(
      'Que représente la dot, ou le mahr, pour vous comme pour votre propre famille ?',
      'sens',
      ['Le respect', "L'engagement", 'La tradition'],
    ),
  },
  M10_Q18: {
    3: q(
      "Le jour où vos envies d'intimité n'auraient pas le même rythme, comment aimeriez-vous qu'on en parle ?",
      'perpetuel',
      ['Avec douceur', 'Sans attendre', 'À un moment calme'],
    ),
  },
  M10_Q16: {
    3: q(
      "Dans une vie à deux, qu'est-ce que l'intimité vient dire, pour vous, que les mots ne disent pas ?",
      'sens',
      ['La confiance', 'Le désir', 'La tendresse'],
    ),
  },
  M9_Q07: {
    2: q(
      'Comment un proche décrirait-il votre façon de montrer votre affection ?',
      'circulaire',
      ['Démonstrative', 'Discrète', 'Par des actes'],
    ),
    3: q(
      'Un soir ordinaire, après une longue journée, quel petit geste de tendresse vous ferait du bien ?',
      'scene',
      ['Un mot', 'Un geste', 'Un moment ensemble'],
    ),
  },
  // Risques partagés : la même réponse des deux côtés, et c'est elle qui pose
  // problème. La question parle de soi, jamais de « vous deux ».
  'M2_Q06:partage': {
    1: q(
      "Quand la colère vous pousse à vous taire, qu'est-ce que ce silence cherche à dire à l'autre ?",
      'besoin',
      [
        'Que je suis touché(e)',
        "Que j'ai besoin de temps",
        'Qu’une limite a été dépassée',
      ],
    ),
    2: q(
      'Dans votre famille, comment se terminait un silence après une colère ?',
      'origine',
      ['Par une parole', 'Par un geste', 'Il finissait par passer'],
    ),
    3: q(
      "Si un silence s'installait un jour après une colère, quel mot convenu aimeriez-vous pour en sortir sans perdre la face ?",
      'reparation',
      ['Un mot à nous', 'Un message', 'Une heure fixée'],
    ),
  },
  'M6_Q01:partage': {
    1: q(
      "Quand vous quittez une dispute pour vous retirer, qu'aimeriez-vous que l'autre comprenne de ce départ ?",
      'besoin',
      ['Que je reviendrai', "Que j'ai besoin de calme", 'Que je me protège'],
    ),
    2: q(
      "Dans votre famille, que devenait une dispute quand quelqu'un quittait la pièce ?",
      'origine',
      [
        'Elle reprenait plus tard',
        'Elle restait en suspens',
        "On n'en parlait plus",
      ],
    ),
    3: q(
      'Après un éloignement pendant une dispute, quel délai vous semblerait juste avant de revenir en parler ?',
      'reparation',
      ['Une heure', 'Le soir même', 'Le lendemain'],
    ),
  },
  'M2_Q07:partage': {
    1: q(
      "Quand une dispute vous laisse touché(e) plusieurs jours, qu'est-ce qui vous retient de revenir plus tôt ?",
      'besoin',
      ['La fierté', 'La peur que cela recommence', "L'attente d'un geste"],
    ),
    2: q(
      'Dans votre famille, qui mettait fin à une fâcherie qui durait ?',
      'origine',
      ['Un parent', 'Un aîné', 'Personne : le temps'],
    ),
    3: q(
      "Si une brouille durait entre vous, quel premier signe de l'autre vous donnerait envie de revenir vers lui ou elle ?",
      'reparation',
      ['Un message', 'Un geste', 'Une excuse'],
    ),
  },
  'M2_Q08:partage': {
    1: q(
      "Quand vous pensez avoir raison, qu'est-ce qui vous coûte le plus dans le fait de revenir vers l'autre ?",
      'besoin',
      [
        "L'impression de céder",
        'La peur de ne pas être compris(e)',
        'La fierté',
      ],
    ),
    2: q(
      "Qui, autour de vous, vous a montré qu'on peut revenir vers l'autre sans perdre la face ?",
      'origine',
      ['Un parent', 'Un ami', 'Personne encore'],
    ),
    3: q(
      "Le jour où un mot d'excuse vous coûterait trop, quel geste simple pourrait le remplacer ?",
      'reparation',
      ['Un café préparé', 'Une main tendue', 'Un message'],
    ),
  },
  'M9_Q03:partage': {
    1: q(
      "Dans une relation, qu'est-ce qui vous ferait sentir que vous donnez plus que vous ne recevez ?",
      'besoin',
      ['La fatigue', 'Le manque de merci', 'Des efforts à sens unique'],
    ),
    2: q(
      "Qu'avez-vous appris, en grandissant, sur la façon de rendre ce que l'on reçoit ?",
      'origine',
      ['En famille', 'Par expérience', 'Au travail'],
    ),
    3: q(
      "Dans une vie à deux, qu'est-ce qui vous permettrait de donner sans avoir besoin de compter ?",
      'besoin',
      ['La confiance', 'Des attentions en retour', 'Le temps'],
    ),
  },
  'M9_Q04:partage': {
    1: q(
      "Quand une frustration s'accumule en vous, à quel signe sentez-vous que vous approchez de la limite ?",
      'emotion',
      ['Je deviens irritable', 'Je me ferme', 'Je rumine'],
    ),
    2: q(
      "Dans votre famille, qu'arrivait-il à ceux qui disaient leur mécontentement ?",
      'origine',
      ['On les écoutait', 'On les faisait taire', 'On en riait'],
    ),
    3: q(
      "Quel rendez-vous régulier aimeriez-vous proposer pour dire les petites frustrations avant qu'elles ne s'accumulent ?",
      'projection',
      ['Chaque semaine', 'Un moment fixe', 'Un mot écrit'],
    ),
  },
  // L'un a besoin de parler tout de suite, l'autre de s'éloigner.
  M6_Q16: {
    1: q(
      "Quand une dispute commence, qu'est-ce que votre première réaction cherche à protéger ?",
      'besoin',
      ['Le lien', 'Ma dignité', 'Mon calme'],
    ),
    2: q(
      'Quand vous étiez adolescent(e), comment réagissiez-vous quand on vous faisait un reproche ?',
      'origine',
      ['Je répondais', 'Je me taisais', 'Je sortais'],
    ),
    3: q(
      "Si l'un de vous avait besoin de parler tout de suite et l'autre de souffler, quel accord simple vous permettrait de vous retrouver ?",
      'perpetuel',
      ['Une pause datée', 'Un mot convenu', 'Parler en marchant'],
    ),
  },
  M2_Q01: {
    2: q(
      'Dans votre famille, comment se donnait-on des nouvelles quand on était loin ?',
      'origine',
      ['Souvent', 'Rarement', 'Seulement en cas de besoin'],
    ),
    3: q(
      'Dans une vie à deux, quelle habitude de nouvelles aimeriez-vous installer pendant les journées chargées ?',
      'projection',
      ['Un message le midi', 'Un appel le soir', 'Rien de fixe'],
    ),
  },
  M2_Q02: {
    2: q(
      "Quand quelqu'un vous demande plus de présence que vous n'en avez envie, que se passe-t-il en vous ?",
      'emotion',
      ['De la gêne', 'Un besoin de fuir', "L'envie de faire plaisir"],
    ),
    3: q(
      "Si l'un de vous avait besoin de plus de présence et l'autre de plus d'air, qu'est-ce qui vous aiderait à vous ajuster ?",
      'perpetuel',
      ['Des moments fixes', 'Le dire simplement', 'Des activités à part'],
    ),
  },
  M2_Q03: {
    2: q(
      "Pensez à un moment où vous vous sentiez profondément aimé(e) : qu'est-ce qui vous donnait ce sentiment ?",
      'exception',
      ['Une présence', 'Une parole', 'Un geste'],
    ),
    3: q(
      "Dans une vie à deux, qu'est-ce qui vous ferait sentir à la fois proche et libre ?",
      'besoin',
      ['Des moments à soi', 'La confiance', 'Des rituels'],
    ),
  },
  // V7.1 — jeux d'argent (M0_Q15, croisée avec M0_Q16).
  M0_Q15: {
    2: q(
      "Qu'avez-vous vu, autour de vous, de ce que les paris ou les jeux d'argent changent dans un foyer ?",
      'origine',
      ['Des espoirs', 'Des tensions', 'Rien de grave'],
    ),
    3: q(
      "Avant de partager un budget, que voudriez-vous savoir du rapport de l'autre aux jeux d'argent ?",
      'limite',
      ['Une règle claire', 'Un plafond convenu', 'Aucun pari'],
    ),
  },
  // V7.1 — ce que l'on accepte des liens de l'autre avec son ex (M3_Q13).
  M3_Q13: {
    1: q(
      "Pour vous, qu'est-ce qui distingue un lien apaisé avec un ancien amour d'un lien qui empiète sur le couple ?",
      'limite',
      ['La transparence', 'La fréquence', 'Le respect du couple'],
    ),
    2: q(
      "Qu'avez-vous appris, autour de vous, sur la place qu'un couple laisse aux histoires d'avant ?",
      'origine',
      ['Qu’elles s’effacent', 'Qu’elles restent', 'Que cela dépend'],
    ),
  },
  // V7.1 — religion des enfants (M8_Q18).
  M8_Q18: {
    2: q(
      "Qu'avez-vous reçu, enfant, de la foi ou des convictions de votre famille, que vous aimeriez transmettre ?",
      'origine',
      ['Des fêtes', 'Des valeurs', 'Une pratique'],
    ),
    3: q(
      "Avant de vous engager, que voudriez-vous savoir de ce que l'autre souhaite transmettre de ses convictions à des enfants ?",
      'limite',
      ['Une pratique', 'Des valeurs', 'La liberté de choisir'],
    ),
  },
  // V7.1 — accueillir les enfants de l'autre (M0_Q14) : un point non
  // négociable possible ; au jour 3, ce qu'il faudrait savoir avant de
  // s'engager.
  M0_Q14: {
    2: q(
      "Autour de vous, qu'est-ce qui a aidé un adulte à trouver sa place auprès des enfants de l'autre ?",
      'exception',
      ['Du temps', 'Des rôles clairs', 'De la patience'],
    ),
    3: q(
      "Avant une vie commune, que voudriez-vous savoir de la place que l'autre souhaite donner à des enfants déjà là ?",
      'limite',
      ['Leur rythme', 'Le rôle de chacun', 'Le temps qu’il faudra'],
    ),
  },
  M0_Q05: {
    3: q(
      "Quand une vie à deux commence avec des enfants déjà là, qu'est-ce qui vous semble le plus important à protéger les premiers mois ?",
      'besoin',
      [
        'Leur rythme',
        'Leur lien avec l’autre parent',
        'Une place pour le couple',
      ],
    ),
  },
  M3_Q04: {
    2: q(
      "Si vous pensez à une famille recomposée où chacun semblait à sa place, qu'est-ce qui rendait cela possible ?",
      'exception',
      ['Du temps', 'Des rôles clairs', 'Beaucoup de dialogue'],
    ),
    3: q(
      "Dans une famille recomposée, qu'est-ce qui, selon vous, aiderait chacun à trouver sa place sans prendre celle d'un autre ?",
      'besoin',
      ['Des rôles clairs', 'Du temps', 'Des moments à part'],
    ),
  },
  M1_Q13: {
    2: q(
      'Quelle part de votre culture, reçue sans la choisir, êtes-vous fier(ère) de porter ?',
      'origine',
      ['Une langue', 'Des fêtes', 'Des valeurs'],
    ),
    3: q(
      "Que voudriez-vous comprendre, avant une vie commune, de ce que l'autre tient à transmettre de sa culture ?",
      'limite',
      ['Une langue', 'Des fêtes', 'Une foi'],
    ),
  },
  M1_Q15: {
    1: q(
      "Si votre famille hésitait devant la personne que vous choisissez, qu'est-ce qui vous aiderait à rester vous-même sans vous éloigner des vôtres ?",
      'besoin',
      ['Du temps', 'Un dialogue', 'Un allié dans la famille'],
    ),
    2: q(
      "Dans votre famille, comment accueille-t-on quelqu'un qui vient d'une autre culture ?",
      'origine',
      ['Avec curiosité', 'Avec prudence', 'Avec réserve'],
    ),
  },
  M5_Q07: {
    2: q(
      'Dans votre famille, que voulait dire le fait de rendre souvent visite aux siens ?',
      'sens',
      ['De l’amour', 'Du devoir', 'Une habitude'],
    ),
    3: q(
      "Avant de partager un foyer, qu'aimeriez-vous que l'autre sache du lien que vous gardez avec les vôtres, semaine après semaine ?",
      'besoin',
      ['Les visites', 'Les appels', 'Les fêtes'],
    ),
  },
  M4_Q03: {
    1: q(
      "Si le foyer reposait surtout sur vos revenus, ou surtout sur ceux de l'autre, comment vivriez-vous cette place ?",
      'emotion',
      ['Avec fierté', 'Avec gêne', 'Sans y penser'],
    ),
    2: q(
      "Dans la maison où vous avez grandi, comment vivait-on la question de qui gagne l'argent du foyer ?",
      'origine',
      ['Avec fierté', 'Avec tension', 'Sans en parler'],
    ),
  },
  M4_Q04: {
    1: q(
      "Pour vous, à qui revient le choix de la place d'une femme entre travail et foyer ?",
      'sens',
      ['À elle seule', 'Au couple, ensemble', 'À la famille aussi'],
    ),
    2: q(
      'Quel exemple, vu en grandissant, a le plus influencé votre regard sur la place de chacun entre travail et foyer ?',
      'origine',
      ['Mes parents', 'Un grand-parent', 'Un proche'],
    ),
  },
  M4_Q09: {
    1: q(
      "À quel moment d'une rencontre vous semblerait-il juste de parler de ses dettes ?",
      'limite',
      ['Très tôt', 'Avant de vivre ensemble', 'Avant un engagement'],
    ),
    2: q(
      'Dans votre famille, comment parlait-on des dettes ou des crédits ?',
      'origine',
      ['Ouvertement', 'À voix basse', 'Jamais'],
    ),
  },
  M1_Q19: {
    2: q(
      'Que représente pour vous un repas partagé quand on ne mange pas les mêmes choses ?',
      'sens',
      ['Du respect', 'Une gêne', 'Une richesse'],
    ),
    3: q(
      "Avant de dire oui, qu'aimeriez-vous que l'autre comprenne de vos règles alimentaires, ou de votre liberté de tout manger ?",
      'besoin',
      [
        'Ce qu’elles signifient',
        'D’où elles viennent',
        'Ce qu’elles demandent à l’autre',
      ],
    ),
  },
  M1_Q03: {
    2: q(
      'Quelle tradition de mariage, dans votre famille, vous touche le plus ?',
      'origine',
      ['La dot', 'La fête', 'La bénédiction'],
    ),
    3: q(
      "Le jour d'un mariage, quelle tradition, si elle manquait, vous laisserait un regret ?",
      'projection',
      ['Une cérémonie', 'Un rite familial', 'Une fête'],
    ),
  },
  M8_Q03: {
    2: q(
      "Dans votre entourage, qu'est-ce que le mariage changeait pour ceux qui se mariaient ?",
      'origine',
      ['Leur place dans la famille', 'Leur foi', 'Peu de choses'],
    ),
    3: q(
      "Avant de dire oui, qu'aimeriez-vous comprendre de ce que le mariage engage pour l'autre, au-delà de l'amour ?",
      'sens',
      ['Une promesse', 'Deux familles', 'Une foi'],
    ),
  },
  M7_Q08: {
    2: q(
      'Dans votre famille, comment se partageait le temps entre être ensemble et chacun pour soi ?',
      'origine',
      ['Tout ensemble', 'Chacun sa vie', 'Un équilibre'],
    ),
    3: q(
      "Les semaines où le temps à deux manquerait, qu'est-ce qui vous ferait sentir que vous comptez pour l'autre ?",
      'besoin',
      ['Un message', 'Un rituel', 'Un moment protégé'],
    ),
  },
  M7_Q19: {
    2: q(
      'Quelle image de la vie réussie vous a-t-on transmise en grandissant ?',
      'origine',
      ['Une famille unie', 'Une belle carrière', 'Une vie libre'],
    ),
    3: q(
      "Si vos rêves de vie ne prenaient pas le même chemin, qu'est-ce qui vous aiderait à en garder une part chacun ?",
      'perpetuel',
      ['Des projets à soi', 'Des étapes', 'Du dialogue'],
      undefined,
      true,
    ),
  },
  M4_Q06: {
    3: q(
      "Qu'est-ce que le fait d'être propriétaire, ou non, change à votre sentiment de sécurité ?",
      'besoin',
      ['Un ancrage', 'Une liberté', 'Une tranquillité pour demain'],
    ),
  },
  M8_Q02: {
    1: q(
      "Qu'est-ce qui, dans votre vie actuelle, fixe le rythme que vous souhaitez avant un engagement ?",
      'besoin',
      ['Mon âge', 'Mon travail', 'Ma famille'],
    ),
    3: q(
      "Que voudriez-vous savoir du rythme auquel l'autre souhaite avancer vers un engagement ?",
      'limite',
      ['Ses étapes', 'Ce qui le ou la retient', 'Ce qui le ou la presse'],
    ),
  },
  M5_Q09: {
    1: q(
      "Dans une amitié de l'autre avec un homme ou une femme, quel geste franchirait pour vous la ligne ?",
      'limite',
      ['Des messages cachés', 'Des sorties à deux', 'Des confidences intimes'],
    ),
    2: q(
      'Que vous a appris votre entourage sur les amitiés entre hommes et femmes ?',
      'origine',
      [
        "Qu'elles sont possibles",
        "Qu'elles sont fragiles",
        "Qu'elles demandent des limites",
      ],
    ),
  },
  M1_Q02: {
    1: q(
      "Qu'est-ce qu'une culture partagée vous éviterait d'avoir à expliquer ?",
      'besoin',
      ['Nos fêtes', 'Nos codes familiaux', 'Notre langue'],
    ),
    2: q(
      'Que souhaite votre famille pour la culture de la personne que vous choisirez ?',
      'origine',
      ['La même culture', 'Une culture proche', 'Rien de particulier'],
    ),
  },
  M4_Q14: {
    2: q(
      "Dans votre famille, à quoi servait l'argent mis de côté ?",
      'origine',
      ['Aux imprévus', 'Aux projets', 'À aider les proches'],
    ),
    3: q(
      "Que voudriez-vous comprendre, avant de vous engager, du rapport de l'autre entre l'épargne et les envies du moment ?",
      'limite',
      ['La prudence', 'Le plaisir', 'Un équilibre'],
    ),
  },
  M7_Q05: {
    2: q(
      "Quel changement, dans votre vie, vous a le plus appris sur votre façon de vivre l'imprévu ?",
      'origine',
      ['Un déménagement', 'Un nouveau travail', 'Une rencontre'],
    ),
    3: q(
      "Au quotidien, à deux, à quoi sauriez-vous que l'autre traverse bien un imprévu ?",
      'limite',
      ['Son calme', 'Sa parole', 'Sa souplesse'],
    ),
  },
  M7_Q02: {
    2: q(
      "Qu'est-ce que la réussite professionnelle voulait dire pour ceux qui vous ont élevé(e) ?",
      'origine',
      ['La sécurité', 'La fierté', 'Le sacrifice'],
    ),
    3: q(
      "Quel équilibre entre travail et vie à deux aimeriez-vous connaître chez l'autre, avant de vous engager ?",
      'limite',
      ['Une priorité au travail', 'Un équilibre', 'Une priorité au foyer'],
    ),
  },
  M6_Q03: {
    1: q(
      "Dans un désaccord, qu'est-ce qui vous ferait sentir entendu(e), même sans avoir eu le dernier mot ?",
      'besoin',
      [
        'Être écouté(e) jusqu’au bout',
        'Une question de l’autre',
        'Un geste après',
      ],
    ),
    2: q(
      "Dans votre famille, qu'apportait le fait d'avoir raison dans une dispute ?",
      'origine',
      ['Du respect', 'La paix', 'Rien du tout'],
    ),
  },
  M9_Q03: {
    2: q(
      "Dans votre famille, comment savait-on si l'on donnait autant que l'on recevait ?",
      'origine',
      ['On ne comptait pas', 'On le disait', 'On le sentait'],
    ),
    3: q(
      "Dans une vie à deux, à quel signe sentiriez-vous que chacun reçoit autant qu'il donne ?",
      'projection',
      ['Des mercis', 'Des attentions', 'Des efforts partagés'],
    ),
  },
  // Grand Entretien V7
  M1_Q16: {
    1: q(
      'Dans votre futur foyer, que changerait pour vous le fait de partager, ou non, les mêmes convictions ?',
      'besoin',
      ['La paix du foyer', 'La transmission', 'Le lien avec ma famille'],
    ),
    2: q(
      'Dans votre famille, comment parlait-on des mariages entre personnes de religions différentes ?',
      'origine',
      ['Avec ouverture', 'Avec réserve', 'On n’en parlait pas'],
    ),
  },
  M0_Q12: {
    1: q(
      "Dans le foyer que vous voulez construire, quelle place l'alcool pourrait-il avoir, ou ne jamais avoir ?",
      'limite',
      ['Aucune', 'Aux fêtes seulement', 'Une place libre'],
    ),
    2: q(
      "Dans votre famille ou votre tradition, que disait-on de l'alcool ?",
      'origine',
      ['Un interdit', 'Un plaisir partagé', 'Un danger'],
    ),
  },
  M10_Q17: {
    3: q(
      "Avant de vous engager, qu'aimeriez-vous que l'autre comprenne de votre choix sur l'intimité avant le mariage ?",
      'besoin',
      ['Ce qu’il protège', 'D’où il vient', 'Ce qu’il demande à l’autre'],
    ),
  },
  M3_Q11: {
    1: q(
      "Si vous avez vécu une relation importante, qu'avez-vous appris sur le temps dont vous avez besoin avant de vous engager à nouveau ?",
      'exception',
      [
        'Qu’il faut du temps',
        'Qu’il faut tourner la page',
        'Que je suis prêt(e)',
      ],
    ),
    3: q(
      "Avant tout engagement, à quoi sentiriez-vous que l'autre est vraiment disponible pour une histoire à deux ?",
      'limite',
      ['Son rythme', 'Ce qu’il ou elle cherche', 'Sa présence'],
    ),
  },
  M8_Q13: {
    1: q(
      "Pour vous, qu'est-ce qu'un engagement pour la vie demande, très concrètement, les années où tout est difficile ?",
      'sens',
      ['De la patience', 'Des efforts des deux', 'Une aide extérieure'],
    ),
    3: q(
      "Avant de vous engager, que voudriez-vous savoir de la façon dont l'autre traverse les années difficiles ?",
      'projection',
      [
        'Ce qui l’aide à tenir',
        'Sa façon de demander de l’aide',
        'Ce qu’il ou elle attend de moi',
      ],
    ),
  },
  M5_Q02: {
    1: q(
      "Si un parent manquait de respect à la personne que vous aimez, qu'est-ce qui passerait en premier pour vous ?",
      'limite',
      [
        'Défendre la personne aimée',
        'Le respect dû au parent',
        'En parler en privé',
      ],
    ),
    2: q(
      "Dans votre famille, comment réagissait-on quand un parent n'acceptait pas le conjoint d'un enfant ?",
      'origine',
      ['On prenait parti', 'On se taisait', 'On cherchait à apaiser'],
    ),
  },
  M5_Q10: {
    1: q(
      "Si vos proches insistaient sur un choix de couple, qu'est-ce qui vous coûterait le plus ?",
      'besoin',
      ['Les décevoir', 'Céder', 'Le conflit'],
    ),
    2: q(
      "Dans votre famille, que se passait-il quand un enfant devenu adulte refusait l'avis de ses parents ?",
      'origine',
      ['On respectait son choix', 'On insistait', 'On prenait ses distances'],
    ),
    3: q(
      "Avant d'unir vos vies, qu'aimeriez-vous savoir de la manière dont l'autre répond aux siens quand ils insistent ?",
      'limite',
      ['Avec calme', 'En cédant parfois', 'En tenant bon'],
    ),
  },
  M8_Q15: {
    2: q(
      'Quand vous étiez enfant, comment vous faisait-on comprendre une règle ?',
      'origine',
      ['Par l’autorité', 'Par l’explication', 'Par l’exemple'],
    ),
    3: q(
      "Avant de vous engager, qu'aimeriez-vous comprendre de l'idée que l'autre se fait de l'autorité auprès d'un enfant ?",
      'limite',
      ['Avec fermeté', 'Avec des explications', 'Par l’exemple'],
    ),
  },
  // Désaccord sur un point clé de l'avenir : en parler tôt, attendre, chercher.
  M8_Q09: {
    1: q(
      "Face à un point clé de l'avenir sur lequel vous divergez, qu'est-ce que votre manière d'en parler cherche à préserver ?",
      'besoin',
      ['Ma sincérité', 'La relation naissante', 'Mon temps'],
    ),
    3: q(
      "Qu'aimeriez-vous savoir, avant de vous engager, de la façon dont l'autre aborde un désaccord sur l'avenir ?",
      'limite',
      ['Tôt et franchement', 'Avec le temps', 'En cherchant une solution'],
    ),
  },
  M4_Q15: {
    2: q(
      'Quel partage des tâches, vu dans votre enfance, aimeriez-vous reproduire ou éviter ?',
      'origine',
      ['Un partage égal', 'Des rôles séparés', 'Une seule personne pour tout'],
    ),
    3: q(
      "Avant de vivre sous le même toit, qu'aimeriez-vous savoir de la façon dont l'autre imagine les tâches de la maison ?",
      'limite',
      [
        'Qui fait quoi',
        'Ce qu’il ou elle a vu chez les siens',
        'Ce qui ne se discute pas',
      ],
    ),
  },
  M3_Q12: {
    2: q(
      "Dans la maison où vous avez grandi, que faisiez-vous, vous, quand un problème n'était jamais dit ?",
      'origine',
      ['Je me taisais aussi', 'J’essayais d’en parler', 'Je m’éloignais'],
    ),
  },
  M5_Q08: {
    1: q(
      "Pour vous, qu'est-ce qui distingue la transparence d'une surveillance ?",
      'sens',
      ['Le consentement', "L'intention", 'La réciprocité'],
    ),
    2: q(
      'Dans votre famille, qu’est-ce qui relevait du jardin secret de chacun ?',
      'origine',
      ['Le courrier', 'Les amitiés', 'Rien'],
    ),
  },
  M2_Q22: {
    2: q(
      "Qui, dans votre entourage, vous a montré qu'on peut reconnaître sa part sans s'abaisser ?",
      'origine',
      ['Un parent', 'Un ami', 'Personne encore'],
    ),
    3: q(
      "Après un désaccord, quel premier pas de l'autre vous dirait qu'il ou elle tient à vous ?",
      'limite',
      ['Une excuse', 'Un geste', 'Une question'],
    ),
  },
  M8_Q06: {
    2: q(
      'À la table de votre enfance, de quoi ne parlait-on jamais ?',
      'origine',
      ['Des sentiments', 'De l’argent', 'Des conflits'],
    ),
    3: q(
      'Quelle place aimeriez-vous que les longues conversations prennent dans votre vie à deux ?',
      'limite',
      ['Chaque jour', 'Pour l’essentiel', 'Quand c’est nécessaire'],
    ),
  },
  M2_Q07: {
    2: q(
      'Dans la maison où vous avez grandi, combien de temps durait une fâcherie ?',
      'origine',
      ['Quelques heures', 'Quelques jours', 'Longtemps'],
    ),
    3: q(
      "Après une dispute, quel signe vous dit que vous êtes prêt(e) à revenir vers l'autre ?",
      'besoin',
      ['Le calme revenu', "L'envie de parler", "Un geste de l'autre"],
    ),
  },
  // Réconciliation après une dispute : sa formulation propre, jamais un
  // gabarit générique.
  M6_Q11: {
    3: q(
      'Pour vous, à quoi reconnaît-on une réconciliation sincère ?',
      'sens',
      ['Aux mots', 'Aux gestes qui suivent', 'Au calme retrouvé'],
    ),
  },
  M9_Q01: {
    2: q(
      'Chez vous, enfant, qui tranchait quand les avis divergeaient ?',
      'origine',
      ['Un parent', 'Les deux ensemble', 'Le plus âgé'],
    ),
    3: q(
      "À quoi verriez-vous, pour une vie à deux, qu'une grande décision a vraiment été prise ensemble ?",
      'sens',
      ['On en a parlé', 'Chacun a pesé', 'Personne n’a cédé'],
    ),
  },
};

/**
 * Seconde formulation propre, pour les sujets les plus fréquents : un membre
 * qui enchaîne les parcours retrouve une question pensée pour le sujet plutôt
 * qu'un gabarit générique.
 */
export const TOPIC_DEEP_VARIANTS: Record<
  string,
  Partial<Record<number, PoolTemplate>>
> = {
  // Les douze sujets d'écart les plus servis (600 couples aléatoires, octobre
  // 2026), aux jours où ils sont posés.
  // Sujets les plus servis en gabarit générique au 2e parcours.
  M8_Q03: {
    2: q(
      'Quel couple marié de votre entourage a le plus marqué votre idée du mariage ?',
      'origine',
      ['Mes parents', 'Des grands-parents', 'Un couple ami'],
    ),
    3: q(
      "Pour une vie à deux, qu'aimeriez-vous que l'autre sache de la cérémonie qui compte vraiment pour vous ?",
      'besoin',
      ['La religieuse', 'La civile', 'La coutumière'],
    ),
  },
  M4_Q13: {
    2: q(
      'Dans votre famille, quelles affaires gardait-on pour soi, sans les prêter ?',
      'origine',
      ['Les vêtements', 'La voiture', 'Rien du tout'],
    ),
  },
  M8_Q13: {
    3: q(
      "Avant de dire oui, qu'aimeriez-vous que l'autre sache de votre manière de traverser les années difficiles ?",
      'besoin',
      ['Ce qui me fait tenir', 'Ce qui me fait douter', 'Ce dont j’ai besoin'],
    ),
  },
  M6_Q18: {
    1: q(
      'Quelle promesse, dans la fidélité, vous semble la plus importante à tenir ?',
      'limite',
      ['Ne rien cacher', 'Ne pas séduire ailleurs', 'Tenir parole'],
    ),
    2: q('Dans votre famille, que disait-on de la fidélité ?', 'origine', [
      'Qu’elle va de soi',
      'Qu’elle se construit',
      'On n’en parlait pas',
    ]),
  },
  M4_Q01: {
    2: q(
      "Dans votre famille, où passait la frontière entre l'argent de chacun et l'argent de tous ?",
      'origine',
      ['Tout était commun', 'Chacun le sien', 'Selon les besoins'],
    ),
    3: q(
      "Avant de vivre sous le même toit, que voudriez-vous comprendre de ce que l'argent commun représente pour l'autre ?",
      'limite',
      ['La confiance', 'Une contrainte', 'Un projet'],
    ),
  },
  M5_Q01: {
    2: q(
      'Dans votre famille, à qui demandait-on conseil avant une grande décision ?',
      'origine',
      ['Aux parents', 'Aux aînés', 'À personne'],
    ),
    1: q(
      "Qu'est-ce que l'avis de votre famille vous apporte, que vous ne voudriez pas perdre ?",
      'besoin',
      ['Un regard extérieur', 'Leur bénédiction', 'De la sécurité'],
    ),
    3: q(
      "Avant une vie commune, que voudriez-vous savoir des décisions sur lesquelles la famille de l'autre attend d'être consultée ?",
      'limite',
      ['Le mariage', 'Le lieu de vie', 'Les grandes dépenses'],
    ),
  },
  M5_Q07: {
    3: q(
      "Pour une vie à deux, que voudriez-vous savoir de la place que la famille de l'autre prendrait dans vos semaines ?",
      'limite',
      ['Les visites', 'Les fêtes', 'Les appels'],
    ),
  },
  M5_Q10: {
    1: q(
      "Face à l'insistance des vôtres, quelle décision de votre vie à deux tiendriez-vous à garder pour vous deux ?",
      'limite',
      ['Le lieu de vie', 'Le mariage', 'Nos finances'],
    ),
    2: q(
      "Qu'avez-vous vu, en grandissant, chez ceux qui tenaient tête à leur famille ?",
      'origine',
      ['Du respect', 'Une brouille', 'Une réconciliation'],
    ),
    3: q(
      "Avant de partager un foyer, que voudriez-vous comprendre de la place que l'autre laisse aux siens dans ses choix ?",
      'limite',
      ['Une grande place', 'Une place mesurée', 'Aucune place'],
    ),
  },
  M9_Q07: {
    2: q(
      "Dans la maison où vous avez grandi, comment rassurait-on quelqu'un sans un mot ?",
      'origine',
      ['Une main sur l’épaule', 'Un câlin', 'Un repas préparé'],
    ),
    3: q(
      'Dans une semaine chargée, quel petit rituel de tendresse aimeriez-vous ne jamais sacrifier ?',
      'projection',
      ['Un mot le matin', 'Un geste le soir', 'Un moment le week-end'],
    ),
  },
  M4_Q12: {
    1: q(
      "Qu'est-ce que vous refuseriez de sacrifier, dans votre niveau de vie, même par amour ?",
      'limite',
      ['Mon confort', 'Ma sécurité', 'Rien'],
    ),
    2: q(
      "Dans votre entourage, que disait-on de ceux qui épousent quelqu'un de plus aisé ou de moins aisé ?",
      'origine',
      ['Rien de mal', 'On les jugeait', 'On les admirait'],
    ),
  },
  M0_Q12: {
    1: q(
      "Lors d'une fête de famille, à quel moment la présence d'alcool deviendrait-elle une limite pour vous ?",
      'limite',
      ['Dès le premier verre', "Quand quelqu'un est ivre", 'Jamais vraiment'],
    ),
    2: q(
      "Qui, dans votre entourage, a le plus compté dans votre façon de voir l'alcool ?",
      'origine',
      ['Un parent', 'Ma foi', 'Mes amis'],
    ),
  },
  M0_Q09: {
    1: q(
      "Pour vous, à quel endroit ou à quel moment la cigarette n'aurait-elle jamais sa place ?",
      'limite',
      ['À la maison', 'En voiture', 'Pendant les repas'],
    ),
    2: q(
      'Dans la famille où vous avez grandi, quelle place avait la cigarette ?',
      'origine',
      ['Aucune', 'Une habitude ordinaire', 'Un sujet de dispute'],
    ),
  },
  M1_Q16: {
    1: q(
      "Dans votre foi ou vos convictions, qu'est-ce qu'un futur conjoint ne pourrait jamais vous demander de mettre de côté ?",
      'limite',
      ['Ma pratique', 'Mes fêtes', 'Ma communauté'],
    ),
    2: q(
      "Dans votre famille, qu'espère-t-on de la religion de celui ou celle que vous épouserez ?",
      'origine',
      ['La même religion', 'Une religion proche', 'Rien de particulier'],
    ),
  },
  M1_Q19: {
    2: q(
      "D'où vous viennent les règles alimentaires que vous suivez, ou votre liberté de tout manger ?",
      'origine',
      ['De ma foi', 'De ma famille', 'D’un choix personnel'],
    ),
    3: q(
      "Avant de partager une cuisine avec quelqu'un, que voudriez-vous savoir de ses règles alimentaires, très concrètement ?",
      'limite',
      [
        'Ce qu’il ou elle ne mange jamais',
        'Ce qui compte à ses yeux',
        'Ses habitudes aux fêtes',
      ],
    ),
  },
  M0_Q06: {
    1: q(
      "Quand vous pensez à la question des enfants, qu'est-ce qui, pour vous, ne pourra pas se discuter ?",
      'limite',
      ['Avoir des enfants ou non', 'Le moment', 'Leur nombre'],
    ),
    3: q(
      "Avant de vous dire oui, qu'aimeriez-vous que l'autre sache de ce que les enfants, ou leur absence, représentent pour vous ?",
      'besoin',
      ['Un projet de vie', 'Une liberté', 'Une évidence'],
    ),
  },
  M8_Q01: {
    1: q(
      "Quelle intention aimeriez-vous entendre clairement de l'autre dès les premières semaines ?",
      'besoin',
      ['Le mariage', 'Une relation sérieuse', 'Prendre le temps'],
    ),
    2: q(
      "Dans votre famille, à quel moment considérait-on qu'une relation devenait sérieuse ?",
      'origine',
      [
        'Dès les présentations',
        'À la demande en mariage',
        'Avec la vie commune',
      ],
    ),
    3: q(
      'Avant de vous dire oui, quelle étape aimeriez-vous avoir franchie pour vous sentir sûr(e) de votre choix ?',
      'limite',
      ['Rencontrer sa famille', 'Parler de nos projets', 'Fixer une date'],
    ),
  },
  M4_Q11: {
    1: q(
      "Si l'un de vous traversait une longue période sans revenus, qu'est-ce qui resterait non négociable pour vous ?",
      'limite',
      [
        'La transparence',
        'La recherche active d’un revenu',
        'Le partage des charges',
      ],
    ),
    3: q(
      "Que voudriez-vous comprendre, avant de vous engager, de ce que l'argent qui manque réveille chez l'autre ?",
      'limite',
      ['Une inquiétude', 'Une gêne', 'Une énergie'],
    ),
  },
  M10_Q18: {
    3: q(
      "Le jour où vos envies de proximité ne se rencontreraient pas, qu'est-ce qui vous permettrait de dire non sans crainte ?",
      'besoin',
      [
        'Un non accueilli sans reproche',
        'Le temps de le dire à mon rythme',
        'Pouvoir en parler librement',
      ],
    ),
  },
  M10_Q17: {
    3: q(
      "Pour une vie à deux, comment aimeriez-vous que l'autre vous fasse part de ses attentes sur l'intimité avant le mariage ?",
      'besoin',
      ['Tôt et simplement', 'Avec délicatesse', 'Quand la confiance est là'],
    ),
  },
  M4_Q05: {
    1: q(
      'Pour vous, quelle aide à vos proches resterait prioritaire, même quand le foyer aurait ses propres besoins ?',
      'limite',
      ['L’aide à mes parents', 'Les urgences', 'Les études d’un proche'],
    ),
    3: q(
      "Avant d'unir vos vies, qu'aimeriez-vous comprendre de ce que la famille de l'autre attend de lui ou d'elle ?",
      'limite',
      ['Un soutien régulier', 'Une aide ponctuelle', 'Aucune attente'],
    ),
  },
  M4_Q10: {
    1: q(
      "Lors d'une première sortie, quel geste autour de l'addition vous mettrait mal à l'aise ?",
      'limite',
      [
        'Qu’on insiste pour payer',
        'Qu’on compte au centime',
        'Qu’on me laisse tout payer',
      ],
    ),
    2: q(
      "Autour de vous, en grandissant, que voulait dire le fait d'inviter quelqu'un au restaurant ?",
      'origine',
      ['Du respect', 'Un engagement', 'Une simple politesse'],
    ),
  },
  M0_Q03: {
    1: q(
      "Qu'est-ce qui, dans votre vie actuelle, ne pourrait pas se déplacer avec vous ?",
      'limite',
      ['Mon travail', 'Mes proches', 'Mes engagements'],
    ),
  },
  M7_Q07: {
    3: q(
      "Pour une vie à deux, qu'aimeriez-vous comprendre de ce qui pourrait un jour pousser l'autre à changer de lieu de vie ?",
      'limite',
      ['Un travail', 'Sa famille', 'Ses racines'],
    ),
  },
  // Troisième lot (octobre 2026) : les couples (sujet, jour) les plus servis
  // en gabarit générique au 2e parcours, mesurés sur 600 couples et deux
  // graines. Aucun ne suppose de « vivre avec » l'écart ; au jour 3, ce qu'il
  // faudrait savoir avant de s'engager.
  M4_Q04: {
    1: q(
      "Entre travail et foyer, quelle liberté tiendriez-vous à garder, quoi qu'il arrive dans votre vie à deux ?",
      'limite',
      ['Travailler', 'Choisir mon rythme', 'Décider à deux'],
    ),
    2: q(
      'Autour de vous, en grandissant, que disait-on des femmes qui travaillaient hors de la maison ?',
      'origine',
      ['On l’admirait', 'On la jugeait', 'On n’en parlait pas'],
    ),
  },
  M5_Q09: {
    1: q(
      "Face aux amitiés proches de l'autre, qu'est-ce qui vous mettrait en confiance sans avoir besoin de tout savoir ?",
      'besoin',
      ['Les rencontrer', 'Sa transparence', 'Le temps'],
    ),
    2: q(
      'Dans la famille où vous avez grandi, comment voyait-on un homme et une femme simplement amis ?',
      'origine',
      ['Avec naturel', 'Avec méfiance', 'On n’en voyait pas'],
    ),
  },
  M1_Q11: {
    1: q(
      "Dans votre idée d'une union, qu'est-ce que l'exclusivité, ou son absence, vient protéger ?",
      'besoin',
      ['La confiance', 'La foi', 'L’équilibre familial'],
    ),
    2: q(
      'Dans votre entourage, comment parlait-on des unions polygames ?',
      'origine',
      ['Avec respect', 'Avec réserve', 'Avec rejet'],
    ),
  },
  M1_Q02: {
    2: q(
      'Dans votre entourage, comment parlait-on des couples venus de deux cultures différentes ?',
      'origine',
      ['Avec fierté', 'Avec réserve', 'Avec curiosité'],
    ),
  },
  M7_Q08: {
    3: q(
      "Avant d'unir vos vies, qu'aimeriez-vous savoir du temps à soi dont l'autre a besoin chaque semaine ?",
      'limite',
      ['Une soirée', 'Un moment chaque jour', 'Un week-end de temps en temps'],
    ),
    2: q(
      'Enfant, à quoi ressemblait un jour de repos ordinaire chez vous ?',
      'origine',
      ['Tous ensemble', 'Chacun de son côté', 'Avec la famille élargie'],
    ),
  },
  M4_Q07: {
    1: q(
      "Qu'est-ce que la dot ou le mahr vient honorer, ou abîmer, à vos yeux ?",
      'besoin',
      ['Le respect des familles', 'La liberté de choisir', 'La parole donnée'],
    ),
    2: q(
      "Qu'a-t-on transmis chez vous, en grandissant, sur le sens de la dot ou du mahr ?",
      'origine',
      ['Un honneur', 'Un engagement', 'Une simple coutume'],
    ),
  },
  M5_Q02: {
    1: q(
      "Si un proche parlait mal de la personne que vous aimez, qu'est-ce que vous tiendriez à défendre ?",
      'limite',
      ['Sa dignité', 'Notre couple', 'La vérité'],
    ),
    2: q(
      "Qu'avez-vous appris, en grandissant, sur la place des parents une fois que l'on vit en couple ?",
      'origine',
      [
        'Ils passent en premier',
        'Le couple passe en premier',
        'Chacun a sa place',
      ],
    ),
  },
  M5_Q03: {
    1: q(
      'Dans un foyer où vit aussi un parent, quel moment de la journée tiendriez-vous à garder pour le couple ?',
      'limite',
      ['Le repas du soir', 'Le réveil', 'Le week-end'],
    ),
    3: q(
      "Avant de vivre sous le même toit, que voudriez-vous savoir de la place qu'un parent pourrait un jour y prendre ?",
      'limite',
      ['Une visite', 'Un séjour', 'Une vie commune'],
    ),
  },
  M3_Q05: {
    1: q(
      "Dans une vie à deux, qu'est-ce qui vous aiderait à être serein(e) face aux amitiés anciennes de l'autre ?",
      'besoin',
      ['La transparence', 'Les connaître', 'Du temps'],
    ),
    2: q(
      "Dans votre entourage, comment vivait-on les amitiés d'avant, une fois en couple ?",
      'origine',
      ['Elles restaient', 'Elles s’effaçaient', 'Elles se partageaient'],
    ),
  },
  M8_Q11: {
    2: q(
      'Dans votre enfance, qui veillait sur ceux qui traversaient une longue épreuve ?',
      'origine',
      ['Un parent', 'Toute la famille', 'Chacun comme il pouvait'],
    ),
    3: q(
      "Avant de dire oui, qu'aimeriez-vous comprendre de la manière dont l'autre prend soin d'un proche qui va mal ?",
      'limite',
      ['Sa présence', 'Son aide concrète', 'Sa patience'],
    ),
  },
  M4_Q03: {
    1: q(
      "Si le foyer reposait sur les revenus d'une seule personne, qu'est-ce que vous tiendriez à préserver ?",
      'besoin',
      ['Ma dignité', 'Notre équilibre', 'Ma liberté'],
    ),
    2: q(
      "Qu'avez-vous entendu, en grandissant, sur ce qu'un homme apporte à son foyer ?",
      'origine',
      ['Les revenus', 'La protection', 'La présence'],
    ),
  },
  M4_Q15: {
    3: q(
      "Avant de vivre ensemble, qu'aimeriez-vous dire à l'autre de la place que vous voyez pour chacun dans les tâches de la maison ?",
      'besoin',
      [
        'Un partage égal',
        'Selon le temps de chacun',
        'Selon les goûts de chacun',
      ],
    ),
  },
  M8_Q02: {
    3: q(
      'Avant un engagement officiel, à quoi sauriez-vous que le moment est venu ?',
      'sens',
      [
        'Une confiance installée',
        'Des familles présentées',
        'Des projets clairs',
      ],
    ),
    1: q(
      "Qu'est-ce qui vous ferait sentir que les choses vont trop vite, ou trop lentement ?",
      'limite',
      ['Une pression', 'Un flou', 'Un silence'],
    ),
  },
  M8_Q15: {
    3: q(
      "Si un enfant venait un jour, qu'aimeriez-vous savoir, avant une vie commune, de ce que l'autre attendrait de vous comme parent ?",
      'limite',
      ['De la fermeté', 'De la douceur', 'De la présence'],
    ),
    2: q(
      'Dans la famille où vous avez grandi, qui fixait les règles ?',
      'origine',
      ['Un parent', 'Plusieurs adultes', 'Un aîné'],
    ),
  },
  // Foi et pratique (M1_Q17 par l'alias de M1_Q06).
  M1_Q06: {
    2: q(
      'Dans la maison de votre enfance, comment se vivait la pratique religieuse, ou son absence ?',
      'origine',
      ['Avec rigueur', 'Avec liberté', 'Discrètement'],
    ),
    3: q(
      "Pour une vie à deux, que voudriez-vous comprendre de ce que la foi de l'autre, ou son absence, lui demande au quotidien ?",
      'limite',
      ['Des prières', 'Des repas', 'Des fêtes'],
    ),
  },
  M3_Q11: {
    3: q(
      "Avant une vie commune, qu'aimeriez-vous que l'autre comprenne de votre rythme pour vous sentir prêt(e) ?",
      'besoin',
      ['Quelques semaines', 'Quelques mois', 'Le temps de la confiance'],
    ),
    1: q(
      "Pour vous, à quoi reconnaît-on qu'on est prêt(e) à s'engager ?",
      'sens',
      ['Le cœur en paix', 'Un projet clair', 'Le temps passé'],
    ),
  },
  M10_Q15: {
    3: q(
      "À quel moment d'une rencontre sentez-vous naître une attirance pour quelqu'un ?",
      'sens',
      ['Dès le premier regard', 'Au fil des échanges', 'Ça dépend'],
    ),
  },
  M1_Q15: {
    1: q(
      'Si votre famille émettait des réserves sur la personne que vous aimez, sur quoi ne transigeriez-vous pas ?',
      'limite',
      ['Mon choix', 'Le respect des miens', 'Le temps de les rassurer'],
    ),
    2: q(
      'À quoi votre famille verrait-elle que vous avez fait un bon choix ?',
      'origine',
      ['Le respect', 'La même culture', 'La stabilité'],
    ),
  },
  M4_Q06: {
    3: q(
      "Autour d'un logement, que voudriez-vous savoir des projets de l'autre avant une vie commune ?",
      'limite',
      ['Acheter seul(e)', 'Acheter à deux', 'Louer pour l’instant'],
    ),
  },
  M1_Q13: {
    3: q(
      "Avant d'unir vos vies, qu'aimeriez-vous que l'autre sache de ce que vous tenez à transmettre de votre culture, si des enfants venaient un jour ?",
      'besoin',
      ['Une langue', 'Des fêtes', 'Une foi'],
    ),
  },
  M4_Q14: {
    2: q(
      "Qu'avez-vous vu, en grandissant, chez ceux qui dépensaient sans compter ?",
      'origine',
      ['De la joie', 'Des soucis', 'De la générosité'],
    ),
    3: q(
      "Avant de partager un budget, qu'aimeriez-vous que l'autre sache de vos envies, petites ou grandes ?",
      'besoin',
      ['Mes plaisirs', 'Mes projets', 'Mes priorités'],
    ),
  },
  M1_Q03: {
    3: q(
      "Avant de dire oui, que voudriez-vous savoir des traditions de mariage auxquelles tient la famille de l'autre ?",
      'limite',
      ['La dot', 'La cérémonie', 'La fête'],
    ),
  },
  M7_Q02: {
    2: q(
      "En grandissant, qu'avez-vous entendu dire de ceux qui travaillaient sans compter leurs heures ?",
      'origine',
      ['On les admirait', 'On les plaignait', 'On les imitait'],
    ),
    3: q(
      "Avant d'unir vos vies, qu'aimeriez-vous que l'autre sache de vos ambitions pour les années à venir ?",
      'besoin',
      ['Un projet précis', 'Une évolution', 'Un équilibre'],
    ),
  },
  M10_Q16: {
    3: q(
      "Dans une vie à deux, qu'est-ce qui vous aiderait à dire oui, ou non, à un moment d'intimité en toute confiance ?",
      'besoin',
      ['Être écouté(e)', 'Ne pas être pressé(e)', 'Pouvoir en reparler'],
    ),
  },
  M4_Q09: {
    1: q(
      "Sur les dettes ou les crédits, qu'est-ce qui, pour vous, ne pourrait pas rester un secret dans un couple ?",
      'limite',
      ['Leur existence', 'Leur poids sur le foyer', 'Leur origine'],
    ),
  },
  M5_Q08: {
    1: q(
      "Qu'est-ce que vous tenez à garder pour vous sur votre téléphone, même avec une personne aimée ?",
      'limite',
      ['Mes messages', 'Mes amitiés', 'Rien'],
    ),
  },
  'M2_Q07:partage': {
    3: q(
      "Quand une fâcherie s'éternise, quel petit pas aimeriez-vous pouvoir faire, vous, sans attendre l'autre ?",
      'reparation',
      ['Un message', 'Un geste', 'Une proposition de reparler'],
    ),
  },
  M2_Q22: {
    2: q(
      "Dans votre entourage, que pensait-on de la personne qui s'excusait la première ?",
      'origine',
      [
        'Qu’elle était sage',
        'Qu’elle était faible',
        'On n’y prêtait pas attention',
      ],
    ),
  },
  M8_Q06: {
    2: q('Avec qui, en grandissant, pouviez-vous parler de tout ?', 'origine', [
      'Un parent',
      'Un frère ou une sœur',
      'Personne',
    ]),
  },
  M7_Q05: {
    2: q(
      'Enfant, comment voyiez-vous les adultes réagir face à un imprévu ?',
      'origine',
      ['Avec calme', 'Avec inquiétude', 'Avec humour'],
    ),
    3: q(
      "Si un imprévu bousculait vos plans à deux, qu'est-ce qui vous aiderait à rebondir ?",
      'besoin',
      ['Un plan B', 'Du temps', 'De l’humour'],
    ),
  },
  M2_Q07: {
    3: q(
      "Quand une dispute vous laisse touché(e), qu'aimeriez-vous que l'autre fasse en attendant ?",
      'besoin',
      ['Me laisser du temps', 'Un petit signe', 'Rester proche'],
    ),
  },
  M9_Q01: {
    3: q(
      "Avant de dire oui, qu'aimeriez-vous savoir des décisions que l'autre préfère prendre seul(e) ?",
      'limite',
      ['Son travail', 'Ses dépenses', 'Ses amitiés'],
    ),
  },
  M8_Q09: {
    1: q(
      "Sur un point clé de l'avenir, qu'est-ce que vous ne voudriez surtout pas découvrir trop tard ?",
      'limite',
      ['Un désir de famille', 'Un projet de départ', 'Une exigence de foi'],
    ),
    3: q(
      "Avant de vous dire oui, quel point clé de l'avenir aimeriez-vous avoir abordé à deux ?",
      'limite',
      ['Le lieu de vie', 'La foi', 'Avoir des enfants ou non'],
    ),
  },
  // V7.1 — jeux d'argent, liens avec un ex, religion des enfants.
  M0_Q15: {
    2: q(
      "Qui, dans votre entourage, a le plus influencé votre regard sur les jeux d'argent ?",
      'origine',
      ['Un parent', 'Des amis', 'Mon expérience'],
    ),
    3: q(
      "Pour une vie à deux, quelle règle sur les jeux d'argent vous semblerait juste dès le début ?",
      'limite',
      ['Aucun pari', 'Un plafond convenu', 'Chacun décide'],
    ),
  },
  M3_Q13: {
    1: q(
      "Quelle limite poseriez-vous, dès le début, aux liens que l'autre garde avec une histoire passée ?",
      'limite',
      ['Aucun secret', 'Pas de tête-à-tête', 'Aucune limite'],
    ),
    2: q(
      "D'où vous vient votre regard sur les amitiés avec un ancien amour ?",
      'origine',
      ['Ma famille', 'Mes amis', 'Mon expérience'],
    ),
  },
  M8_Q18: {
    2: q(
      "Dans votre famille, comment la foi ou les convictions passaient-elles d'une génération à l'autre ?",
      'origine',
      ['Par l’exemple', 'Par des règles', 'Par la liberté'],
    ),
    3: q(
      "Pour une vie à deux, quelle place aimeriez-vous donner aux convictions dans l'éducation ?",
      'limite',
      ['Une place centrale', 'Une place partagée', 'Un choix libre'],
    ),
  },
  // V7.1 — accueillir les enfants de l'autre (M0_Q14).
  M0_Q14: {
    2: q(
      "Qu'avez-vous appris, en grandissant ou auprès de vos proches, sur les familles où des enfants arrivent d'une autre union ?",
      'origine',
      ['Qu’il faut du temps', 'Que les rôles comptent', 'Que l’amour aide'],
    ),
    3: q(
      "Avant de vous engager, qu'aimeriez-vous comprendre du rôle que l'autre imagine pour un beau-parent ?",
      'limite',
      ['Une présence', 'Une autorité partagée', 'Un rôle à construire'],
    ),
  },
  // Sujets du jour 3 qui n'avaient qu'une formulation propre.
  M0_Q05: {
    3: q(
      "Si des enfants font déjà partie de la vie de l'un, qu'aimeriez-vous que l'autre comprenne de leur place, avant une vie commune ?",
      'besoin',
      ['Leur rythme', 'Leur lien avec l’autre parent', 'Le temps qu’il faudra'],
    ),
  },
  M3_Q04: {
    3: q(
      'Dans une famille recomposée, à quoi verriez-vous que chacun se sent respecté dans son rôle ?',
      'besoin',
      ['Des règles claires', 'Du temps', 'Une place pour chacun'],
    ),
  },
};

/**
 * Troisième formulation propre, pour les sujets les plus servis au troisième
 * parcours d'un même membre (il garde ses réponses et change de partenaire :
 * mesure sur 600 membres, octobre 2026). Mêmes règles que les deux premières :
 * jamais de compromis sur un point non négociable ; au jour 3, ce qu'il
 * faudrait savoir avant une vie commune, avec une formule variée (« avant de
 * vous dire oui », « pour une vie à deux »…) pour qu'une journée ne répète pas
 * trois fois « avant de vous engager ».
 */
export const TOPIC_DEEP_THIRD: Record<
  string,
  Partial<Record<number, PoolTemplate>>
> = {
  M0_Q09: {
    1: q(
      "Qu'est-ce que votre position sur le tabac protège, pour vous ou pour vos proches ?",
      'besoin',
      ['Ma tranquillité', 'Mes proches', 'Mes principes'],
    ),
    2: q(
      "Quelle règle sur le tabac, reçue en grandissant, vous semble encore juste aujourd'hui ?",
      'origine',
      ['Pas à la maison', 'Pas devant les aînés', 'Aucune règle'],
    ),
  },
  M0_Q12: {
    1: q(
      "Qu'est-ce qu'un verre d'alcool à la maison viendrait toucher de vos valeurs ?",
      'besoin',
      ['Ma foi', 'Ma sérénité', 'Mes principes'],
    ),
    2: q(
      "Quelle valeur, reçue en grandissant, guide aujourd'hui votre regard sur l'alcool ?",
      'origine',
      ['La foi', 'La modération', 'La liberté'],
    ),
  },
  M1_Q16: {
    1: q(
      'Quand vous imaginez votre futur foyer, quelle part de vos convictions y aurait forcément sa place ?',
      'limite',
      ['Une pratique', 'Des fêtes', 'Des valeurs'],
    ),
    2: q(
      'Parmi les convictions reçues en grandissant, laquelle avez-vous faite vraiment vôtre ?',
      'origine',
      ['Une valeur', 'Une pratique', 'Une liberté'],
    ),
  },
  M10_Q18: {
    3: q(
      "Dans l'intimité, qu'est-ce qui vous fait sentir que votre rythme est respecté ?",
      'besoin',
      [
        'Une écoute sans reproche',
        'Le temps laissé',
        'Un non accepté simplement',
      ],
    ),
  },
  M10_Q17: {
    3: q(
      "Avant de vous dire oui, que voudriez-vous savoir de la place que l'autre donne à l'intimité avant le mariage ?",
      'limite',
      [
        'Ce qui compte pour lui ou elle',
        'Ce qui ne bougera pas',
        'D’où vient son choix',
      ],
    ),
  },
  M8_Q03: {
    2: q(
      "Qu'est-ce que le mariage représentait dans la famille où vous avez grandi ?",
      'origine',
      [
        'Une promesse devant Dieu',
        'Une alliance de familles',
        'Un choix personnel',
      ],
    ),
  },
  M4_Q05: {
    1: q(
      'Envers les vôtres, quel soutien vous semblerait impossible à refuser ?',
      'limite',
      ['Une urgence', 'Les études d’un proche', 'Les soins d’un parent'],
    ),
  },
  M6_Q18: {
    1: q(
      "À vos yeux, qu'est-ce que la fidélité vient protéger dans une vie à deux ?",
      'besoin',
      ['La confiance', 'La dignité', 'La paix du foyer'],
    ),
  },
  M0_Q03: {
    1: q(
      'Pour vous, quelle attache rendrait un déménagement impossible à envisager ?',
      'limite',
      ['Mes proches', 'Mon travail', 'Mes racines'],
    ),
  },
  M7_Q07: {
    3: q(
      "Avant une vie commune, que voudriez-vous savoir de l'endroit où l'autre se voit vieillir ?",
      'limite',
      ['Sa ville', 'Son pays', 'Là où vit sa famille'],
    ),
  },
  M0_Q06: {
    1: q(
      "Qu'est-ce qui rend votre position sur les enfants si importante à dire dès le début ?",
      'besoin',
      [
        'Ne pas perdre de temps',
        'Le respect de chacun',
        'Ma vision de la famille',
      ],
    ),
    3: q(
      "Pour une vie à deux, que voudriez-vous savoir de la place que les enfants, ou leur absence, tiennent dans les projets de l'autre ?",
      'limite',
      ['Un projet central', 'Une question ouverte', 'Une liberté'],
    ),
  },
  M4_Q13: {
    2: q(
      "Qu'avez-vous appris, en grandissant, sur le fait de prêter ce qui vous appartient ?",
      'origine',
      ['À partager volontiers', 'À demander avant', 'À garder mes affaires'],
    ),
  },
  M0_Q05: {
    3: q(
      'Pour une vie à deux avec des enfants déjà là, quel rythme vous semblerait juste pour trouver chacun sa place ?',
      'projection',
      ['Quelques mois', 'Une année', 'Le rythme des enfants'],
    ),
  },
  // V7.1 — troisième formulation des nouveaux sujets (troisième parcours).
  M0_Q15: {
    2: q(
      "Dans votre famille, comment parlait-on de l'argent gagné ou perdu au jeu ?",
      'origine',
      ['Avec méfiance', 'En riant', 'On n’en parlait pas'],
    ),
  },
  M3_Q13: {
    1: q(
      "Dans une vie à deux, quelle transparence attendriez-vous sur les liens de l'autre avec une histoire passée ?",
      'limite',
      ['Tout savoir', 'L’essentiel', 'Rien de particulier'],
    ),
  },
  M8_Q18: {
    3: q(
      "Avant de vous dire oui, qu'aimeriez-vous savoir des traditions que l'autre voudrait faire vivre à des enfants ?",
      'limite',
      ['Des fêtes', 'Des valeurs', 'Une pratique'],
    ),
  },
  M1_Q19: {
    2: q(
      "Qu'avez-vous reçu de votre famille sur la façon de partager un repas ?",
      'origine',
      ['Le respect des règles', 'L’hospitalité', 'La liberté de chacun'],
    ),
    3: q(
      "Avant une vie commune, qu'aimeriez-vous savoir de la place que les règles alimentaires tiennent dans la vie de l'autre ?",
      'limite',
      ['Une obligation', 'Une habitude', 'Aucune place'],
    ),
  },
  M8_Q13: {
    3: q(
      "Avant une vie commune, que voudriez-vous comprendre de ce que l'engagement veut dire pour l'autre les années difficiles ?",
      'limite',
      ['Rester quoi qu’il arrive', 'Se battre ensemble', 'Savoir partir'],
    ),
  },
  M3_Q11: {
    3: q(
      "Pour une vie à deux, quel rythme vous semblerait juste avant de parler d'avenir ensemble ?",
      'besoin',
      ['Quelques semaines', 'Quelques mois', 'Le temps de la confiance'],
    ),
  },
  M1_Q02: {
    2: q(
      "Pour votre famille, que signifie partager la même culture avec quelqu'un ?",
      'origine',
      ['La langue', 'Les fêtes', 'La religion'],
    ),
  },
  M4_Q01: {
    2: q(
      "Quelle idée de l'argent partagé vous a-t-on transmise en grandissant ?",
      'origine',
      ['Tout mettre en commun', 'Chacun le sien', 'Selon les besoins'],
    ),
  },
  M5_Q01: {
    2: q(
      "Qu'avez-vous retenu, en grandissant, de la place des aînés dans les choix d'un couple ?",
      'origine',
      [
        'Un avis qui compte',
        'Un conseil parmi d’autres',
        'Une décision qui leur revient',
      ],
    ),
  },
  M5_Q10: {
    2: q(
      "Quelle valeur vous guide quand l'avis des vôtres et le vôtre ne vont pas dans le même sens ?",
      'origine',
      ['Le respect', 'La liberté', 'La paix'],
    ),
  },
  M8_Q01: {
    1: q(
      "Qu'est-ce qui vous ferait comprendre, dès les premiers échanges, que vous ne cherchez pas la même chose ?",
      'limite',
      ['Des projets flous', 'Un rythme différent', 'Un silence sur l’avenir'],
    ),
  },
  M9_Q07: {
    3: q(
      'Au quotidien, à deux, quelle marque de tendresse compterait le plus pour vous ?',
      'besoin',
      ['Un mot', 'Un geste', 'Un moment'],
    ),
  },
  M4_Q11: {
    3: q(
      "Pour une vie à deux, qu'aimeriez-vous que l'autre sache de votre façon de vivre un manque d'argent ?",
      'besoin',
      ['Mon inquiétude', 'Mon énergie', 'Mon besoin de parler'],
    ),
  },
};

/**
 * Quatrième formulation propre, pour les écarts les plus servis en question
 * générique du quatrième au sixième parcours d'un même membre (il garde ses
 * réponses et change de partenaire : mesure sur 320 membres, octobre 2026).
 * Mêmes règles que les trois premières, sous l'angle du jour : la règle que
 * chacun tient pour ferme (jour 1), d'où vient sa position (jour 2), ce qu'il
 * faudrait savoir avant de s'engager ou comment chacun le vivrait au
 * quotidien (jour 3).
 */
export const TOPIC_DEEP_FOURTH: Record<
  string,
  Partial<Record<number, PoolTemplate>>
> = {
  M0_Q09: {
    1: q(
      "Dans une maison partagée, quel espace tiendriez-vous à garder sans fumée, quoi qu'il arrive ?",
      'limite',
      ['La chambre', 'Toute la maison', 'La cuisine'],
    ),
  },
  M0_Q12: {
    1: q(
      "Quelle règle sur l'alcool resterait ferme pour vous, même lors des fêtes ?",
      'limite',
      ['Aucun alcool', 'Avec modération', 'Pas devant les proches'],
    ),
    2: q(
      "Quel exemple, en grandissant, a façonné votre rapport à l'alcool ?",
      'origine',
      ['Un parent', 'Un ami', 'Une expérience'],
    ),
  },
  M4_Q10: {
    1: q(
      "Lors d'une première sortie, qu'est-ce qui, pour vous, ne se discute pas au moment de payer ?",
      'limite',
      ['Qui invite paie', 'Chacun sa part', 'Rien de figé'],
    ),
  },
  M8_Q03: {
    2: q(
      'Quelle parole sur le mariage, entendue en grandissant, vous accompagne encore ?',
      'origine',
      [
        'Une parole de mes parents',
        'Une parole de ma foi',
        'Une parole d’un proche',
      ],
    ),
  },
  M8_Q01: {
    1: q(
      "Dans l'engagement que vous cherchez, quelle exigence tenez-vous à poser d'emblée ?",
      'besoin',
      ['La fidélité', 'La sincérité', 'Un projet commun'],
    ),
  },
  M4_Q04: {
    2: q(
      'Quelle femme de votre famille a le plus inspiré votre regard sur le travail et le foyer ?',
      'origine',
      ['Ma mère', 'Une grand-mère', 'Une tante'],
    ),
  },
  M5_Q07: {
    3: q(
      'Au quotidien, à deux, quel rythme de visites aux familles vous semblerait juste ?',
      'projection',
      ['Chaque semaine', 'Chaque mois', 'Aux fêtes'],
    ),
  },
  M3_Q11: {
    3: q(
      "Avant tout engagement, à quoi verriez-vous que vous avancez au même rythme que l'autre ?",
      'limite',
      [
        'Des projets évoqués',
        'Des proches présentés',
        'Une confiance installée',
      ],
    ),
  },
  M4_Q11: {
    1: q(
      "Face à un manque d'argent, qu'est-ce que vous ne voudriez jamais avoir à cacher à l'autre ?",
      'limite',
      ['Une dette', 'Une dépense', 'Mon inquiétude'],
    ),
  },
  M4_Q12: {
    2: q(
      "Quel regard sur l'argent et la réussite vous a-t-on transmis en grandissant ?",
      'origine',
      ['La réussite compte', 'La droiture compte plus', 'L’argent ne dit rien'],
    ),
  },
  M4_Q01: {
    2: q(
      "Qui, autour de vous, vous a montré une façon de gérer l'argent à deux qui vous inspire ?",
      'origine',
      ['Mes parents', 'Un couple ami', 'Personne encore'],
    ),
  },
  'M2_Q07:partage': {
    3: q(
      'Dans une vie à deux, quel rituel simple pourrait, selon vous, raccourcir une brouille ?',
      'reparation',
      ['Un mot le soir', 'Une promenade', 'Un repas'],
    ),
  },
  M0_Q06: {
    1: q(
      'Sur la question des enfants, quelle certitude tenez-vous à exprimer dès maintenant ?',
      'besoin',
      ['Mon envie', 'Mon refus', 'Mon besoin de temps'],
    ),
  },
  M1_Q02: {
    2: q(
      "Qu'avez-vous reçu de votre culture que vous tiendriez à retrouver chez l'autre ?",
      'origine',
      ['La langue', 'Les fêtes', 'Les valeurs'],
    ),
  },
  M7_Q07: {
    3: q(
      "Avant de vous dire oui, que voudriez-vous connaître des racines qui retiennent l'autre ?",
      'limite',
      ['Sa famille', 'Son travail', 'Son histoire'],
    ),
  },
  M8_Q11: {
    3: q(
      "Pour une vie à deux, que voudriez-vous savoir de la façon dont l'autre aimerait être soutenu(e) dans l'épreuve ?",
      'projection',
      ['Par la présence', 'Par l’aide concrète', 'Par la discrétion'],
    ),
  },
  M1_Q03: {
    3: q(
      "Pour une vie à deux, quelle tradition de mariage aimeriez-vous voir respectée par la famille de l'autre ?",
      'projection',
      ['La dot', 'La cérémonie', 'La fête'],
    ),
  },
  M8_Q02: {
    3: q(
      'Avant tout engagement, comment aimeriez-vous parler à deux du calendrier de vos projets ?',
      'projection',
      ['Tôt', 'Au fil des mois', 'Quand la confiance est là'],
    ),
  },
  M7_Q08: {
    3: q(
      'Pour une vie à deux, quel moment de la semaine aimeriez-vous protéger pour être ensemble ?',
      'besoin',
      ['Le dîner', 'Le week-end', 'Une soirée fixe'],
    ),
  },
};

/**
 * Sujets qui partagent une formulation propre : anciennes clés V6 (entretiens
 * déjà enregistrés) et sujets V7 voisins.
 */
export const DEEP_ALIASES: Record<string, string> = {
  // V7 voisins
  M6_Q19: 'M6_Q18',
  M6_Q17: 'M6_Q16',
  M1_Q17: 'M1_Q06',
  // V6 → V7
  M6_Q10: 'M6_Q18',
  M5_Q04: 'M5_Q09',
  M6_Q06: 'M10_Q16',
  M6_Q07: 'M10_Q18',
  M4_Q08: 'M4_Q14',
  M1_Q09: 'M1_Q19',
  M7_Q01: 'M7_Q19',
  M6_Q01: 'M6_Q16',
  // V7.1 → V7 : la question remplaçante garde les formulations du sujet.
  M1_Q20: 'M1_Q11',
  M4_Q16: 'M4_Q05',
  M4_Q17: 'M4_Q07',
  M8_Q17: 'M8_Q02',
  M8_Q16: 'M8_Q03',
  // V7.1, sujets nouveaux : les formulations d'un sujet voisin.
  M0_Q14: 'M0_Q05',
  M3_Q13: 'M3_Q05',
  M7_Q36: 'M7_Q07',
  M8_Q19: 'M8_Q03',
  M8_Q20: 'M8_Q15',
  M8_Q18: 'M1_Q13',
  M0_Q15: 'M4_Q14',
};

function deepEntry(
  table: Record<string, Partial<Record<number, PoolTemplate>>>,
  d: TopicSource,
): Partial<Record<number, PoolTemplate>> | undefined {
  const key = topicKey(d);
  return (
    table[key] ??
    table[d.questionId] ??
    table[DEEP_ALIASES[key]] ??
    table[DEEP_ALIASES[d.questionId]]
  );
}

/** Formulation propre au sujet pour ce jour, s'il en existe une. */
export function topicDeep(
  d: TopicSource,
  day: number,
): PoolTemplate | undefined {
  return deepEntry(TOPIC_DEEP, d)?.[day];
}

/**
 * Formulations propres au sujet pour ce jour : la principale, la variante,
 * la troisième, puis la quatrième.
 */
export function topicDeepAll(d: TopicSource, day: number): PoolTemplate[] {
  return [
    deepEntry(TOPIC_DEEP, d)?.[day],
    deepEntry(TOPIC_DEEP_VARIANTS, d)?.[day],
    deepEntry(TOPIC_DEEP_THIRD, d)?.[day],
    deepEntry(TOPIC_DEEP_FOURTH, d)?.[day],
  ].filter((t): t is PoolTemplate => !!t);
}

// ─── Accords réels : « même mot, même sens ? » ───────────────────────────────

/**
 * Accord réel (même réponse des deux côtés) : une phrase qui nomme l'accord
 * sans citer la réponse, et, quand elle existe, une question qui vérifie que
 * les mêmes mots veulent dire la même chose pour les deux. Une phrase vide :
 * la même réponse est un risque partagé, la question parle alors de soi, seule.
 * Clé : « question:clé de réponse », ou la question seule pour toute réponse.
 */
export interface Agreement {
  statement: string;
  probe?: PoolTemplate;
  /**
   * Seconde relance propre, pour les accords les plus servis : un membre qui a
   * déjà vu la première reçoit encore une question pensée pour cet accord,
   * plutôt qu'une question d'accord générique. Même règle que `probe` : une
   * relance qui met l'accord à l'épreuve est étiquetée « limite » (jamais
   * servie sur un point non négociable).
   */
  probeVariant?: PoolTemplate;
  /**
   * Troisième relance propre, pour les accords les plus servis au troisième
   * parcours d'un même membre (il garde ses réponses, change de partenaire) :
   * même règle que `probe` et `probeVariant`.
   */
  probeThird?: PoolTemplate;
  /**
   * Relances supplémentaires, écrites pour l'angle d'un jour qui manquait
   * (`angle`) ou pour un membre qui a déjà vu les trois premières : même
   * règle que `probe`.
   */
  extraProbes?: PoolTemplate[];
  /** Suppose des enfants à venir : jamais servi si l'un n'en veut pas. */
  needsChildren?: boolean;
}

/**
 * Relances propres d'un accord, dans l'ordre : la principale, la variante, la
 * troisième, puis les supplémentaires. Chacune porte, quand elle en a un,
 * l'angle du jour auquel elle répond (1 : ce que chacun protège ou la limite
 * de l'accord ; 2 : d'où vient la position ; 3 : comment chacun la vivrait au
 * quotidien, ce qu'il faudrait savoir avant de s'engager).
 */
export function agreementProbes(a: Agreement): PoolTemplate[] {
  return [
    a.probe,
    a.probeVariant,
    a.probeThird,
    ...(a.extraProbes ?? []),
  ].filter((t): t is PoolTemplate => !!t);
}

export const AGREEMENTS: Record<string, Agreement> = {
  'M1_Q06:A': {
    statement: 'Partager la même foi compte pour vous deux.',
    probe: dailyProbe(
      'Concrètement, à quoi verrait-on, dans une semaine ordinaire, que vous partagez la même foi ?',
      'sens',
      ['Des prières', 'Des repas', 'Des fêtes'],
    ),
    extraProbes: [
      protectProbe(
        "Dans une foi partagée, qu'est-ce qui vous semble le plus important à préserver ?",
        'besoin',
        ['La prière à deux', 'La transmission', 'La paix du foyer'],
      ),
      originProbe(
        "Qui vous a transmis l'envie de partager votre foi avec la personne aimée ?",
        'origine',
        ['Mes parents', 'Ma communauté', 'Ma propre histoire'],
      ),
    ],
  },
  'M1_Q06:D': {
    statement: "Pour vous deux, la foi relève de l'intime.",
    probe: dailyProbe(
      "Qu'aimeriez-vous malgré tout que l'autre sache de votre rapport aux convictions ?",
      'sens',
      ['Mes fêtes', 'Mes doutes', 'Mes valeurs'],
    ),
    extraProbes: [
      protectProbe(
        "Qu'est-ce que garder la foi dans l'intime vous permet de préserver ?",
        'besoin',
        ['Ma liberté', 'La paix du foyer', 'Le respect de chacun'],
      ),
      originProbe(
        'Qui vous a appris que la foi se vit dans le secret du cœur ?',
        'origine',
        ['De ma famille', 'De mon histoire', 'D’un choix personnel'],
      ),
    ],
  },
  // Fidélité (V7) : un accord se précise, il ne se met pas à l'épreuve.
  'M6_Q18:A': {
    statement: 'Pour vous deux, une infidélité mettrait fin à la relation.',
    probe: protectProbe(
      'Quel geste précis serait déjà, à vos yeux, une infidélité ?',
      'sens',
      ['Un message caché', 'Un rendez-vous', 'Un mensonge'],
    ),
    probeVariant: originProbe(
      "D'où vous vient cette exigence de fidélité absolue ?",
      'origine',
      ['De ma famille', 'De ma foi', 'De ce que j’ai vu'],
    ),
    probeThird: dailyProbe(
      "Qu'aimeriez-vous que l'autre sache de cette exigence dès le début ?",
      'besoin',
      ['Qu’elle est absolue', 'D’où elle vient', 'Ce qu’elle protège'],
    ),
    extraProbes: [
      protectProbe(
        "Qu'est-ce qu'une fidélité sans écart vous permet de garder intact ?",
        'besoin',
        ['La confiance', 'Le respect', 'La paix'],
      ),
    ],
  },
  'M6_Q18:C': {
    statement:
      'Pour vous deux, une infidélité serait très grave, mais réparable avec le temps.',
    probe: q(
      "Qu'est-ce qui permettrait, pour vous, de réparer la confiance après un écart ?",
      'sens',
      ['La vérité dite', 'Le temps', 'Des preuves'],
    ),
    probeVariant: originProbe(
      "Qu'est-ce qui vous a appris qu'une confiance blessée peut se reconstruire ?",
      'origine',
      ['Ma famille', 'Mon expérience', 'Ma foi'],
    ),
    probeThird: q(
      'Quelle preuve de sincérité compterait le plus pour vous, après un écart ?',
      'sens',
      ['La vérité dite', 'Des actes répétés', 'Du temps'],
    ),
    extraProbes: [
      protectProbe(
        "Qu'est-ce qui, dans la confiance, vous paraît le plus précieux à protéger ?",
        'besoin',
        ['La parole donnée', 'La transparence', 'Le respect'],
      ),
      protectProbe(
        'Même en réparant la confiance, quelle part de vous tiendriez-vous à protéger ?',
        'besoin',
        ['Ma dignité', 'Mon estime de moi', 'Mes valeurs'],
      ),
    ],
  },
  'M6_Q10:A': {
    statement: 'La fidélité est absolue pour vous deux.',
    probe: protectProbe(
      'Où commence, pour vous, le tout premier pas de travers ?',
      'sens',
      ['Un regard', 'Un message', 'Un secret'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a transmis l'idée d'une fidélité absolue ?",
        'origine',
        ['Mes parents', 'Ma foi', 'Ma propre histoire'],
      ),
      dailyProbe(
        'Au quotidien, à quoi verrait-on que la fidélité compte autant pour vous ?',
        'projection',
        ['À ma transparence', 'À mes choix', 'À ma parole'],
      ),
    ],
  },
  'M8_Q01:A': {
    statement: 'Vous visez tous les deux le mariage.',
    probe: dailyProbe(
      "Qu'est-ce qui, pour vous, changerait le lendemain du mariage par rapport à la veille ?",
      'sens',
      ['Rien', 'Un engagement devant les miens', 'Une vie commune'],
    ),
    probeVariant: q(
      "Qu'est-ce qui vous donne envie de vous marier, plutôt que de seulement vivre à deux ?",
      'besoin',
      ['Ma foi', 'Un engagement devant les miens', 'Une sécurité'],
    ),
    probeThird: dailyProbe(
      'Quelle étape avant le mariage vous tient le plus à cœur ?',
      'sens',
      ['La rencontre des familles', 'Les fiançailles', 'La demande'],
    ),
    extraProbes: [
      protectProbe(
        "Qu'est-ce que le mariage protège, à vos yeux, qu'une vie à deux sans lui ne protégerait pas ?",
        'besoin',
        ['Une promesse', 'Une famille', 'Une sécurité'],
      ),
      originProbe(
        'De qui tenez-vous cette envie de mariage, dans votre famille ou ailleurs ?',
        'origine',
        ['De mes parents', 'De ma foi', 'D’un couple qui m’inspire'],
      ),
      originProbe(
        "Qu'est-ce qui, dans votre histoire, a fait du mariage un but pour vous ?",
        'origine',
        ['Ma famille', 'Ma foi', 'Mes propres choix'],
      ),
    ],
  },
  'M8_Q01:B': {
    statement: 'Vous voulez tous les deux une relation sérieuse.',
    probe: q(
      "Qu'est-ce qui, pour vous, fait passer une rencontre agréable au rang de relation sérieuse ?",
      'sens',
      ['Un projet', 'Une parole donnée', 'Les proches'],
    ),
    probeVariant: dailyProbe(
      "Qu'est-ce qu'une relation sérieuse vous demanderait de changer dans votre vie actuelle ?",
      'projection',
      ['Mon emploi du temps', 'Mes priorités', 'Rien de particulier'],
    ),
    probeThird: dailyProbe(
      'À quoi sauriez-vous, au bout de quelques mois, que la relation prend le bon chemin ?',
      'sens',
      ['Des projets', 'La confiance', 'Les proches présentés'],
    ),
    extraProbes: [
      protectProbe(
        "Dans un engagement, qu'est-ce que vous tenez avant tout à protéger ?",
        'besoin',
        ['Ma sincérité', 'Mon temps', 'Ma confiance'],
      ),
      protectProbe(
        'Quand vous vous engagez sérieusement, quelle exigence tenez-vous pour essentielle ?',
        'besoin',
        ['La sincérité', 'La fidélité', 'Le respect'],
      ),
      originProbe(
        "D'où vous vient ce besoin de sérieux plutôt que de légèreté ?",
        'origine',
        ['De ma famille', 'De mon histoire', 'De ma foi'],
      ),
      originProbe(
        "Qui, dans votre entourage, vous a montré ce qu'est un engagement sérieux ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Personne encore'],
      ),
    ],
  },
  'M8_Q06:A': {
    statement: 'Vous aimez tous les deux vous parler de tout.',
    probe: protectProbe(
      "Qu'est-ce qui, pour vous, reste malgré tout de l'ordre du jardin secret ?",
      'sens',
      ['Mon passé', 'Mes doutes', 'Mes proches'],
    ),
    extraProbes: [
      originProbe(
        'Qui, autour de vous, vous a appris à tout vous dire ?',
        'origine',
        ['Un parent', 'Un ami', 'Personne encore'],
      ),
      dailyProbe(
        'Dans une semaine ordinaire, quel moment aimeriez-vous garder pour vous parler de tout ?',
        'projection',
        ['Le soir', 'Le repas', 'Un appel'],
      ),
    ],
  },
  'M8_Q06:B': {
    statement: "Vous voulez tous les deux parler en profondeur de l'essentiel.",
    probe: q("Qu'est-ce qui fait partie de l'essentiel, pour vous ?", 'sens', [
      'Les projets',
      'Les émotions',
      'Les valeurs',
    ]),
    extraProbes: [
      originProbe(
        'Qui vous a donné le goût des conversations profondes ?',
        'origine',
        ['Un parent', 'Un ami', 'Personne encore'],
      ),
      dailyProbe(
        'Dans une vie à deux, quel moment aimeriez-vous réserver aux conversations de fond ?',
        'projection',
        ['Le soir', 'Le week-end', 'Une promenade'],
      ),
    ],
  },
  'M2_Q07:A': {
    statement: 'Aucun de vous deux ne laisse traîner une dispute.',
    probe: q(
      "Pour vous, à quoi reconnaît-on qu'une dispute est vraiment terminée ?",
      'sens',
      ['Une excuse', 'Un geste', 'Le retour du rire'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient l'idée qu'un désaccord se règle sans attendre ?",
        'origine',
        ['De ma famille', 'De mon histoire', 'De mon caractère'],
      ),
      dailyProbe(
        'Au quotidien, comment aimeriez-vous clore un désaccord avant la fin de la journée ?',
        'projection',
        ['En se parlant', 'Par un geste', 'Par une excuse'],
      ),
    ],
  },
  'M2_Q08:A': {
    statement: "Pour vous deux, l'harmonie passe avant l'ego.",
    probe: protectProbe(
      "Qu'est-ce que vous ne lâcheriez pas, même pour garder la paix ?",
      'limite',
      ['Une valeur', 'Une limite', 'La vérité'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a appris que la paix compte plus que d'avoir raison ?",
        'origine',
        ['Un parent', 'Un grand-parent', 'Ma propre expérience'],
      ),
      dailyProbe(
        'Dans une vie à deux, quel geste simple montrerait que vous faites passer la paix avant votre fierté ?',
        'projection',
        ['Écouter jusqu’au bout', 'Reconnaître un tort', 'Un mot doux'],
      ),
    ],
  },
  'M5_Q01:D': {
    statement:
      'Pour vous deux, les décisions du foyer ne regardent que le couple.',
    probe: q(
      "Quand un parent donne malgré tout son avis, qu'en faites-vous ?",
      'sens',
      ["Je l'écoute", "J'en parle à deux", 'Je le laisse de côté'],
    ),
    probeVariant: originProbe(
      "D'où vous vient cette idée que le foyer décide seul ?",
      'origine',
      ['De ma famille', 'De ce que j’ai vu', 'D’un choix personnel'],
    ),
    probeThird: dailyProbe(
      'Comment aimeriez-vous garder les vôtres proches, tout en décidant à deux ?',
      'besoin',
      [
        'En les tenant informés',
        'En les invitant souvent',
        'En leur expliquant nos choix',
      ],
    ),
    extraProbes: [
      protectProbe(
        "Quand vous décidez à deux, qu'est-ce que vous tenez à garder hors de portée des familles ?",
        'besoin',
        ['Nos finances', 'Notre intimité', 'Nos projets'],
      ),
    ],
  },
  'M5_Q01:B': {
    statement:
      'Pour vous deux, la famille compte, mais la décision finale vous revient.',
    probe: q(
      "Sur quel sujet l'avis d'un parent pèserait-il le plus ?",
      'sens',
      ['Le mariage', 'Les projets de famille', 'Le lieu de vie'],
    ),
    probeVariant: dailyProbe(
      'Comment aimeriez-vous dire non à un parent, sur une décision qui vous revient ?',
      'besoin',
      ['Avec douceur', 'Avec des raisons', 'Avec l’appui de l’autre'],
    ),
    probeThird: dailyProbe(
      "Qu'est-ce qui vous aiderait à garder le dernier mot sans blesser les vôtres ?",
      'besoin',
      ['Le respect', 'L’appui de l’autre', 'Le temps'],
    ),
    extraProbes: [
      protectProbe(
        "Qu'est-ce que cette liberté de trancher vous permet de préserver ?",
        'besoin',
        ['Nos choix', 'Notre intimité', 'Ma liberté'],
      ),
      originProbe(
        'De qui tenez-vous cet équilibre entre respect des parents et liberté de choisir ?',
        'origine',
        ['De mes parents', 'D’un aîné', 'De ma propre histoire'],
      ),
      originProbe(
        "Quel exemple vous a convaincu(e) qu'on peut aimer sa famille et décider à deux ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Ma propre histoire'],
      ),
    ],
  },
  'M0_Q06:A': {
    statement: 'Vous souhaitez tous les deux des enfants.',
    probe: dailyProbe(
      "Qu'aimeriez-vous avoir construit dans votre vie avant l'arrivée d'un enfant ?",
      'sens',
      ['Un foyer', 'Une stabilité', 'Une complicité à deux'],
    ),
    probeVariant: dailyProbe(
      "Quand vous imaginez votre vie avec des enfants, qu'est-ce qui vous fait le plus envie ?",
      'projection',
      ['Transmettre', 'Une maison vivante', 'Les voir grandir'],
    ),
    probeThird: q(
      'Quelle valeur aimeriez-vous transmettre en premier à un enfant ?',
      'projection',
      ['Le respect', 'La foi', 'La confiance en soi'],
    ),
    extraProbes: [
      protectProbe(
        "Dans ce souhait, qu'est-ce qui, pour vous, ne se discute pas ?",
        'besoin',
        ['Le principe', 'Le moment', 'La façon de les élever'],
      ),
      protectProbe(
        "Qu'est-ce que ce projet d'enfants représente de plus précieux pour vous ?",
        'besoin',
        ['Une transmission', 'Une famille à moi', 'Un sens à ma vie'],
      ),
      protectProbe(
        'Quelle valeur tiendriez-vous à préserver coûte que coûte en accueillant un enfant ?',
        'besoin',
        ['Le respect', 'La stabilité du foyer', 'Du temps pour nous deux'],
      ),
      originProbe(
        "D'où vous vient ce souhait de fonder une famille ?",
        'origine',
        ['De ma famille', 'De ma foi', 'D’un rêve ancien'],
      ),
    ],
  },
  'M0_Q06:D': {
    statement: "Aucun de vous deux ne souhaite d'enfants.",
    probe: dailyProbe(
      "Qu'est-ce que ce choix vous permet d'imaginer pour votre vie ?",
      'sens',
      ['Des voyages', 'Un engagement', 'Une liberté'],
    ),
    probeVariant: q(
      "Qu'aimeriez-vous que vos proches comprennent de ce choix ?",
      'besoin',
      ['Qu’il est réfléchi', 'Qu’il est définitif', 'Qu’il m’appartient'],
    ),
    probeThird: originProbe(
      "D'où vous vient la clarté de ce choix ?",
      'origine',
      ['D’une réflexion', 'De mon histoire', 'De ce que j’ai vu'],
    ),
    extraProbes: [
      protectProbe(
        "Qu'est-ce que ce choix protège de plus important dans la vie que vous imaginez ?",
        'besoin',
        ['Ma liberté', 'Mes projets', 'Une vie à deux choisie'],
      ),
      protectProbe(
        "Dans ce choix, qu'est-ce qui vous semble le plus précieux à défendre ?",
        'besoin',
        [
          'Le choix lui-même',
          'Son caractère définitif',
          'Le respect de ce choix',
        ],
      ),
      protectProbe(
        'Quelle liberté, dans ce choix, tenez-vous le plus à garder ?',
        'besoin',
        ['Celle de voyager', 'Celle de mes projets', 'Celle de notre temps'],
      ),
    ],
  },
  'M1_Q13:A': {
    needsChildren: true,
    statement:
      'Vous voulez tous les deux transmettre langue, traditions et religion.',
    probe: originProbe(
      "Qu'est-ce qui, de votre propre enfance, vous semble le plus précieux à transmettre ?",
      'origine',
      ['Une langue', 'Une fête', 'Une foi'],
    ),
    probeVariant: q(
      'Quelle part de cette transmission vous tiendrait le plus à cœur ?',
      'sens',
      ['La langue', 'Les traditions', 'La foi'],
    ),
    extraProbes: [
      dailyProbe(
        'Dans une semaine ordinaire, comment cette transmission prendrait-elle place à la maison ?',
        'projection',
        ['Par la langue parlée', 'Par les repas', 'Par les fêtes'],
      ),
    ],
  },
  'M1_Q13:B': {
    needsChildren: true,
    statement: 'Pour vous deux, des enfants grandiraient entre deux cultures.',
    probe: originProbe(
      'Quelle fête de votre enfance tiendriez-vous à leur faire vivre ?',
      'origine',
      ['Une fête religieuse', 'Une fête familiale', 'Une fête du pays'],
    ),
    probeVariant: q(
      "Qu'est-ce qui, à vos yeux, aide un enfant à se sentir chez lui dans deux cultures ?",
      'sens',
      ['La langue', 'Les fêtes', 'Les deux familles'],
    ),
    extraProbes: [
      dailyProbe(
        'Au quotidien, quelle langue ou quel rituel aimeriez-vous faire vivre à la maison ?',
        'projection',
        ['Une langue', 'Un repas', 'Une fête'],
      ),
    ],
  },
  'M4_Q07:A': {
    statement: 'La dot ou le mahr compte pour vous deux.',
    probe: q(
      "Qu'est-ce qui, pour vous, en fait davantage qu'une formalité ?",
      'sens',
      ['Le respect', 'La parole donnée', 'Le lien entre familles'],
    ),
    probeVariant: q(
      "Qu'aimeriez-vous que la dot ou le mahr dise de vous à la famille de l'autre ?",
      'sens',
      ['Mon respect', 'Mon sérieux', 'Ma fidélité aux traditions'],
    ),
    extraProbes: [
      protectProbe(
        "Qu'est-ce que cette tradition vient protéger, pour vous ?",
        'besoin',
        ['Le respect des familles', 'La parole donnée', 'Une dignité'],
      ),
      originProbe(
        'Qui vous a transmis le sens de cette tradition ?',
        'origine',
        ['Mes parents', 'Un aîné', 'Ma communauté'],
      ),
    ],
  },
  'M8_Q03:A': {
    statement: 'Le mariage est pour vous deux un acte religieux.',
    probe: q(
      "Qu'est-ce qu'il engage, pour vous, qu'un mariage civil n'engage pas ?",
      'sens',
      ['Une promesse devant Dieu', 'Une communauté', 'Une durée'],
    ),
    probeVariant: originProbe(
      'Quel exemple, dans votre entourage, a donné au mariage religieux tout son sens pour vous ?',
      'origine',
      ['Un parent', 'Un grand-parent', 'Ma communauté'],
    ),
    probeThird: dailyProbe(
      'Quelle bénédiction ou quel rite aimeriez-vous voir au cœur de ce jour-là ?',
      'scene',
      ['Une prière', 'La bénédiction des familles', 'Un rite de ma tradition'],
    ),
    extraProbes: [
      originProbe(
        "De qui tenez-vous l'idée que le mariage engage devant Dieu ?",
        'origine',
        ['De mes parents', 'De ma communauté', 'De ma foi'],
      ),
      dailyProbe(
        'Une fois mariés, comment aimeriez-vous que la foi accompagne votre vie de tous les jours ?',
        'projection',
        ['Par la prière', 'Par les fêtes', 'Par nos choix'],
      ),
    ],
  },
  'M8_Q03:C': {
    statement: 'Vous voulez tous les deux un mariage civil et religieux.',
    probe: q(
      "Qu'est-ce que chacune des deux cérémonies engage pour vous ?",
      'sens',
      ['La loi', 'La foi', 'Les familles'],
    ),
    probeVariant: q(
      'Quel moment de ces deux cérémonies vous tient le plus à cœur ?',
      'scene',
      ['L’engagement civil', 'La bénédiction', 'La fête'],
    ),
    probeThird: originProbe(
      'Qui, autour de vous, vous a donné envie de ces deux cérémonies ?',
      'origine',
      ['Ma famille', 'Ma communauté', 'Un couple ami'],
    ),
    extraProbes: [
      dailyProbe(
        'Une fois mariés, comment aimeriez-vous que ces deux engagements se retrouvent dans votre vie ?',
        'projection',
        ['Par nos choix', 'Par nos fêtes', 'Par notre parole'],
      ),
      originProbe(
        "Qu'est-ce qui, dans votre histoire, donne du sens à ces deux cérémonies ?",
        'origine',
        ['De ma famille', 'De ma foi', 'De la loi du pays'],
      ),
      dailyProbe(
        "Avant de vous engager, que voudriez-vous savoir de l'importance que l'autre donne à chaque cérémonie ?",
        'projection',
        ['Son sens', 'Sa place dans la fête', 'Le rôle des familles'],
      ),
    ],
  },
  'M4_Q11:A': {
    statement:
      "Vous soutiendriez tous les deux l'autre sans compter si l'argent manquait.",
    probe: dailyProbe(
      'Pour vous, soutenir sans compter, à quoi cela ressemblerait-il au quotidien ?',
      'sens',
      ['Prendre les charges', 'Être présent(e)', 'Encourager'],
    ),
    probeVariant: originProbe(
      'Qui, dans votre entourage, incarne pour vous ce soutien sans condition ?',
      'origine',
      ['Un parent', 'Un ami', 'Personne encore'],
    ),
    probeThird: q(
      "Qu'est-ce qui vous aiderait, vous, à demander de l'aide si c'était votre tour ?",
      'besoin',
      ['La confiance', 'Ne pas être jugé(e)', 'Un dialogue ouvert'],
    ),
    extraProbes: [
      protectProbe(
        "Même en donnant beaucoup, qu'est-ce que vous tiendriez à préserver pour vous ?",
        'besoin',
        ['Mon épargne', 'Ma dignité', 'Ma liberté'],
      ),
      originProbe(
        "Qu'avez-vous appris, en grandissant, sur la façon d'aider un proche à court d'argent ?",
        'origine',
        [
          'Qu’on aide sans compter',
          'Qu’on aide avec mesure',
          'Qu’on n’en parle pas',
        ],
      ),
      dailyProbe(
        "Le jour où l'autre traverserait un manque d'argent, quel premier geste aimeriez-vous avoir ?",
        'projection',
        ['Prendre les charges', 'En parler calmement', 'Rassurer'],
      ),
      dailyProbe(
        'Dans une vie à deux, comment aimeriez-vous que ce soutien se vive sans gêne pour celui qui le reçoit ?',
        'projection',
        ['Avec discrétion', 'Sans compter', 'Avec des mots simples'],
      ),
    ],
  },
  'M4_Q11:B': {
    statement:
      "Vous traverseriez tous les deux un manque d'argent avec un plan.",
    probe: dailyProbe(
      'Concrètement, quelle serait la toute première étape de ce plan, pour vous ?',
      'sens',
      ['Réduire les dépenses', 'Chercher des revenus', 'Faire le point à deux'],
    ),
    probeVariant: originProbe(
      'Qui, autour de vous, vous a montré comment traverser une période difficile à deux ?',
      'origine',
      ['Mes parents', 'Un couple ami', 'Personne encore'],
    ),
    probeThird: dailyProbe(
      "Comment aimeriez-vous vous dire les choses, à deux, si l'argent venait à manquer ?",
      'besoin',
      ['Franchement', 'Avec un point régulier', 'Sans reproche'],
    ),
    extraProbes: [
      protectProbe(
        "Dans un tel plan, quelle dépense tiendriez-vous à protéger jusqu'au bout ?",
        'besoin',
        ['Le logement', 'L’aide aux miens', 'Un projet'],
      ),
      originProbe(
        "D'où vous vient ce réflexe de vous organiser dans les périodes difficiles ?",
        'origine',
        ['De mes parents', 'De mon travail', 'D’une période difficile'],
      ),
      dailyProbe(
        'Au quotidien, comment aimeriez-vous suivre ce plan à deux, semaine après semaine ?',
        'projection',
        ['Un point régulier', 'Un tableau partagé', 'Une discussion le soir'],
      ),
    ],
  },
  'M4_Q01:A': {
    statement: "Vous voyez tous les deux l'argent du foyer en pot commun.",
    probe: protectProbe(
      'Pour vous, quelle dépense resterait malgré tout personnelle ?',
      'sens',
      ['Un cadeau', 'Un loisir', "L'aide aux miens"],
    ),
    probeVariant: dailyProbe(
      "Le jour d'un achat important, que voudrait dire ce pot commun pour vous ?",
      'sens',
      ['Décider à deux', 'Payer ensemble', 'En parler avant'],
    ),
    probeThird: q(
      "Qu'est-ce que ce pot commun viendrait dire de votre confiance ?",
      'sens',
      ['Qu’elle est entière', 'Qu’elle se construit', 'Qu’on avance ensemble'],
    ),
    extraProbes: [
      protectProbe("Jusqu'où ce pot commun irait-il, pour vous ?", 'limite', [
        'Tous les revenus',
        'Les charges seulement',
        'Les projets communs',
      ]),
      protectProbe(
        "Qu'est-ce que ce pot commun protège, à vos yeux ?",
        'besoin',
        ['La confiance', 'L’égalité', 'La simplicité'],
      ),
      originProbe(
        "Dans la maison où vous avez grandi, comment l'argent se partageait-il ?",
        'origine',
        ['Tout en commun', 'Chacun le sien', 'Un parent décidait'],
      ),
    ],
  },
  'M4_Q01:C': {
    statement:
      'Vous voyez tous les deux des dépenses séparées et des charges partagées.',
    probe: protectProbe("Pour vous, où s'arrête une charge commune ?", 'sens', [
      'Au loyer',
      'Aux courses',
      'Aux sorties',
    ]),
    probeVariant: dailyProbe(
      'Quelle dépense du quotidien vous semblerait-il naturel de payer à deux ?',
      'sens',
      ['Les courses', 'Les sorties', 'Les cadeaux aux familles'],
    ),
    probeThird: protectProbe(
      "Qu'est-ce que cette façon de faire protège, pour vous ?",
      'besoin',
      ['Ma liberté', 'La paix du couple', 'Une forme d’égalité'],
    ),
    extraProbes: [
      protectProbe(
        "Quelle dépense tenez-vous à garder pour vous seul(e), quoi qu'il arrive ?",
        'besoin',
        ['Un loisir', 'Un cadeau', 'L’aide aux miens'],
      ),
      originProbe(
        "D'où vous vient cette façon de faire, entre argent à soi et argent commun ?",
        'origine',
        ['De ma famille', 'D’une expérience', 'D’un souci d’égalité'],
      ),
      dailyProbe(
        'Au quotidien, comment aimeriez-vous répartir les charges communes ?',
        'projection',
        ['Moitié-moitié', 'Selon les revenus', 'Par postes'],
      ),
    ],
  },
  'M4_Q10:A': {
    statement:
      "Pour vous deux, l'homme règle l'addition du premier rendez-vous.",
    probe: q(
      "Que veut dire ce geste pour vous, au-delà de l'argent ?",
      'sens',
      ['Le respect', "L'engagement", 'La tradition'],
    ),
    probeVariant: originProbe(
      "Qui vous a transmis l'idée que ce geste revient à l'homme ?",
      'origine',
      ['Ma famille', 'Ma culture', 'Ma foi'],
    ),
    extraProbes: [
      protectProbe(
        "Qu'est-ce que ce geste protège, pour vous, au début d'une rencontre ?",
        'besoin',
        ['Le respect', 'Une tradition', 'Une façon d’honorer l’autre'],
      ),
    ],
  },
  'M4_Q10:C': {
    statement: "Vous préférez tous les deux partager l'addition.",
    probe: q(
      "Si l'autre insistait un soir pour tout payer, qu'est-ce que cela réveillerait en vous ?",
      'emotion',
      ['De la gêne', 'De la gratitude', 'Le sentiment d’être redevable'],
    ),
    probeVariant: q(
      "Pour vous, que dit d'une personne le fait de partager l'addition ?",
      'sens',
      ['Son indépendance', 'Son respect', 'Son sens de l’égalité'],
    ),
    extraProbes: [
      protectProbe(
        'Quelle part de votre indépendance ce geste vous permet-il de protéger ?',
        'besoin',
        ['Ne rien devoir', 'Payer ma part', 'Choisir librement'],
      ),
      originProbe(
        "Dans votre entourage, comment se réglait l'addition entre amis ou en famille ?",
        'origine',
        ['Chacun sa part', 'Celui qui invite', 'À tour de rôle'],
      ),
      originProbe(
        "Qui vous a transmis l'idée qu'on paie chacun sa part ?",
        'origine',
        ['Mes parents', 'Mes amis', 'Ma propre expérience'],
      ),
    ],
  },
  'M4_Q13:A': {
    statement: "Pour vous deux, ce qui est à l'un est à l'autre.",
    probe: protectProbe(
      "Qu'est-ce qui, malgré tout, resterait à vous seul(e) ?",
      'sens',
      ['Un objet', 'Un espace', 'Un moment'],
    ),
    probeVariant: originProbe(
      'Dans votre famille, comment se partageaient les affaires de chacun ?',
      'origine',
      ['Tout était à tous', 'Chacun ses affaires', 'Selon les objets'],
    ),
    extraProbes: [
      dailyProbe(
        'Sous le même toit, comment imaginez-vous le partage des affaires de chacun ?',
        'projection',
        ['Tout en commun', 'Quelques objets à soi', 'Selon les cas'],
      ),
    ],
  },
  'M0_Q03:A': {
    statement: 'Vous êtes tous les deux prêts à déménager pour le couple.',
    probe: dailyProbe(
      "Le premier jour de repos dans une nouvelle ville, qu'est-ce qui vous manquerait le plus ?",
      'scene',
      ['Mes proches', 'Mes habitudes', 'Mon quartier'],
    ),
    probeVariant: q(
      "Qu'est-ce qui rendrait un départ pour le couple léger plutôt que lourd, pour vous ?",
      'besoin',
      ['Un projet commun', 'Un travail', 'Des proches à portée'],
    ),
    probeThird: q(
      "Qu'est-ce qui vous rend prêt(e) à partir sans condition pour le couple ?",
      'besoin',
      ['Ma confiance', 'Mon goût du changement', 'Ma foi'],
    ),
    extraProbes: [
      protectProbe(
        "Même prêt(e) à partir, qu'est-ce que vous tiendriez à garder de votre vie d'ici ?",
        'besoin',
        ['Mes amitiés', 'Mon travail', 'Des visites aux miens'],
      ),
      protectProbe(
        "Qu'est-ce que vous refuseriez de laisser derrière vous en partant pour l'autre ?",
        'besoin',
        ['Le lien avec les miens', 'Mon métier', 'Mes repères'],
      ),
      protectProbe(
        "Qu'est-ce que vous voudriez protéger avant tout en changeant de ville ?",
        'besoin',
        ['Mon équilibre', 'Mes liens', 'Mon travail'],
      ),
      originProbe(
        "D'où vous vient cette disposition à partir pour quelqu'un ?",
        'origine',
        ['De ma famille', 'De mon goût du changement', 'D’une conviction'],
      ),
    ],
  },
  'M0_Q03:D': {
    statement:
      "Vous ne vous voyez ni l'un ni l'autre déménager pour un partenaire.",
    probe: protectProbe(
      "Qu'est-ce que ne pas déménager pour quelqu'un vous permet de protéger ?",
      'besoin',
      ['Mes proches', 'Mon travail', 'Mon histoire'],
    ),
    probeVariant: originProbe(
      "D'où vous vient l'idée qu'on ne déménage pas pour quelqu'un ?",
      'origine',
      ['De ma famille', 'De mon travail', 'De mon histoire'],
    ),
    probeThird: dailyProbe(
      "Qu'est-ce que ce choix de ne pas suivre quelqu'un vous permet de construire ?",
      'sens',
      ['Une stabilité', 'Des liens', 'Un avenir'],
    ),
    extraProbes: [
      protectProbe(
        "Quel ancrage, dans votre vie d'ici, tenez-vous à préserver avant tout ?",
        'besoin',
        ['Mes proches', 'Mon travail', 'Mon histoire'],
      ),
      protectProbe(
        'Quel lien, ici, tenez-vous à ne jamais laisser derrière vous ?',
        'besoin',
        ['Mes parents', 'Mes amis', 'Ma communauté'],
      ),
    ],
  },
  'M7_Q07:A': {
    statement:
      "Vous vous voyez tous les deux rester dans la ville où vous vivez aujourd'hui.",
    probe: q(
      "Qu'est-ce que cette ville vous donne qu'aucune autre ne vous donnerait ?",
      'besoin',
      ['Mes proches', 'Mon travail', 'Mon histoire'],
    ),
    probeVariant: dailyProbe(
      'Qui, dans votre ville, compte le plus dans votre quotidien ?',
      'besoin',
      ['Ma famille', 'Mes amis', 'Ma communauté'],
    ),
    probeThird: dailyProbe(
      "Qu'aimeriez-vous construire dans cette ville dans les années à venir ?",
      'projection',
      ['Un foyer', 'Un projet', 'Des liens'],
    ),
    extraProbes: [
      protectProbe(
        "Quel lien à cette ville tenez-vous à préserver, quoi qu'il arrive ?",
        'besoin',
        ['Mes proches', 'Mon quartier', 'Mon travail'],
      ),
      originProbe(
        "Qu'est-ce qui, dans votre histoire, vous a ancré(e) dans cette ville ?",
        'origine',
        ['Ma famille', 'Mon enfance', 'Mon travail'],
      ),
      originProbe(
        "Qui, autour de vous, vous a transmis ce goût d'être enraciné(e) ?",
        'origine',
        ['Mes parents', 'Mes grands-parents', 'Ma communauté'],
      ),
    ],
  },
  'M7_Q07:C': {
    statement: "Vous envisagez tous les deux une vie à l'étranger.",
    probe: q(
      "Qu'est-ce que ce départ viendrait chercher, pour vous ?",
      'besoin',
      ["De l'aventure", 'Des opportunités', 'Un nouveau départ'],
    ),
    probeVariant: protectProbe(
      "Qu'aimeriez-vous garder de votre culture, où que vous viviez ?",
      'besoin',
      ['Une langue', 'Des fêtes', 'Des liens'],
    ),
    probeThird: q(
      "Quel genre de vie à l'étranger vous attire le plus ?",
      'sens',
      ['Une grande ville', 'Une vie simple', 'Une nouvelle culture'],
    ),
    extraProbes: [
      dailyProbe(
        "Une fois installé(e) à l'étranger, à quoi ressemblerait pour vous une semaine ordinaire ?",
        'projection',
        ['Du travail', 'Des découvertes', 'Des liens à créer'],
      ),
      originProbe("D'où vous vient cette envie d'ailleurs ?", 'origine', [
        'D’un voyage',
        'De ma famille',
        'De mon travail',
      ]),
    ],
  },
  'M2_Q03:A': {
    statement: 'Vous avez tous les deux besoin de vous sentir en sécurité.',
    probe: dailyProbe(
      'Quel petit geste, dans une journée ordinaire, vous donne ce sentiment ?',
      'sens',
      ['Un message', 'Une parole', 'Une présence'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient l'importance que vous donnez à ce sentiment de sécurité ?",
        'origine',
        ['De mon enfance', 'De mon histoire', 'De mon caractère'],
      ),
    ],
  },
  'M2_Q03:C': {
    statement:
      'Vous cherchez tous les deux un équilibre entre intimité et liberté.',
    probe: dailyProbe(
      'Où passe la frontière, pour vous, dans une semaine ordinaire ?',
      'sens',
      ['Des soirées à moi', 'Des amis à moi', 'Un projet à moi'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a montré qu'on peut être proche tout en gardant sa liberté ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Ma propre expérience'],
      ),
    ],
  },
  'M6_Q01:B': {
    statement: 'Vous prenez tous les deux du recul avant de revenir calmes.',
    probe: protectProbe(
      "Combien de temps dure, selon vous, un recul qui reste rassurant pour l'autre ?",
      'sens',
      ['Quelques minutes', 'Quelques heures', 'Une nuit'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient ce besoin de recul avant de reparler ?",
        'origine',
        ['De ma famille', 'De mon caractère', 'D’une expérience'],
      ),
      dailyProbe(
        'Dans une vie à deux, comment aimeriez-vous signaler que vous prenez ce recul ?',
        'projection',
        ['Par un mot', 'Par un geste', 'Par un message'],
      ),
    ],
  },
  'M9_Q03:A': {
    statement: 'Vous dites tous les deux donner sans compter.',
    probe: protectProbe(
      "À quoi sentiriez-vous, malgré tout, que l'équilibre n'y est plus ?",
      'limite',
      ['La fatigue', 'Le manque de merci', "L'agacement"],
    ),
    extraProbes: [
      originProbe('Qui vous a appris à donner sans compter ?', 'origine', [
        'Un parent',
        'Ma foi',
        'Ma propre nature',
      ]),
      dailyProbe(
        'Au quotidien, à quoi verrait-on que vous donnez sans attendre en retour ?',
        'projection',
        ['À mon temps', 'À mes attentions', 'À mon aide'],
      ),
    ],
  },
  'M1_Q09:A': {
    statement: 'Vous respectez tous les deux des interdits alimentaires.',
    probe: dailyProbe(
      "Dans une cuisine partagée, qu'est-ce qui ne pourrait jamais se mélanger, pour vous ?",
      'sens',
      ['Certains aliments', 'Certains ustensiles', 'Rien'],
    ),
    extraProbes: [
      originProbe(
        'De qui tenez-vous les règles que vous suivez à table ?',
        'origine',
        ['De ma famille', 'De ma foi', 'D’un choix personnel'],
      ),
    ],
  },
  'M1_Q11:A': {
    statement: 'Pour vous deux, une union se vit à deux, sans exception.',
    probe: protectProbe(
      "Qu'est-ce que cette exclusivité protège de plus précieux pour vous ?",
      'besoin',
      ['La confiance', 'La dignité', 'La paix'],
    ),
    probeVariant: originProbe(
      "D'où vous vient cette conviction qu'une union se vit à deux ?",
      'origine',
      ['De ma foi', 'De ma famille', 'De ce que j’ai vu'],
    ),
    extraProbes: [
      protectProbe(
        'Quelle place tenez-vous à réserver à une seule personne dans votre vie ?',
        'besoin',
        ['Mon intimité', 'Ma confiance', 'Mon avenir'],
      ),
    ],
  },
  'M8_Q11:A': {
    statement:
      "Pour vous deux, prendre soin de l'autre dans l'épreuve serait une évidence.",
    probe: dailyProbe(
      "Qu'est-ce que prendre soin de l'autre voudrait dire, très concrètement, pour vous ?",
      'sens',
      ['Être présent(e)', 'Organiser l’aide', 'Rester patient(e)'],
    ),
    probeVariant: originProbe(
      "Quel exemple de présence fidèle dans l'épreuve vous a le plus inspiré(e) ?",
      'origine',
      ['Un parent', 'Un proche', 'Personne encore'],
    ),
  },
  'M2_Q06:A': {
    statement: 'Vous dites tous les deux clairement quand vous êtes en colère.',
    probe: protectProbe(
      "Pour vous, où passe la frontière entre dire sa colère et la faire porter à l'autre ?",
      'sens',
      ['Le ton', 'Les mots choisis', 'Le moment'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a appris qu'une colère se dit plutôt que de se taire ?",
        'origine',
        ['Un parent', 'Ma propre expérience', 'Une amitié'],
      ),
    ],
  },
  'M2_Q06:B': {
    statement:
      "Vous prenez tous les deux du recul avant de parler d'une colère.",
    probe: dailyProbe(
      "Pendant ce recul, qu'aimeriez-vous que l'autre sache de ce qui se passe en vous ?",
      'besoin',
      ['Que je reviendrai', 'Que je réfléchis', 'Que je tiens à lui ou à elle'],
    ),
    extraProbes: [
      protectProbe(
        "Qu'est-ce que ce temps de recul vous permet de protéger ?",
        'besoin',
        ['Mes mots', 'L’autre', 'Notre calme'],
      ),
      originProbe(
        "D'où vous vient l'habitude de laisser retomber la colère avant d'en parler ?",
        'origine',
        ['De ma famille', 'De mon caractère', 'D’une expérience'],
      ),
    ],
  },
  'M6_Q01:A': {
    statement: "Vous parlez tous les deux, même quand c'est difficile.",
    probe: protectProbe(
      "Pour vous, qu'est-ce qui distingue une parole franche d'une parole qui blesse ?",
      'sens',
      ['Le ton', 'Le moment', "L'intention"],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient ce courage de parler quand les mots coûtent ?",
        'origine',
        ['De ma famille', 'De ma foi', 'D’une expérience'],
      ),
      dailyProbe(
        'Dans une vie à deux, comment aimeriez-vous aborder un sujet qui fâche ?',
        'projection',
        ['Calmement', 'Au bon moment', 'Sans détour'],
      ),
    ],
  },
  'M2_Q07:B': {
    statement:
      "Vous avez tous les deux besoin d'une journée pour digérer une dispute.",
    probe: dailyProbe(
      "Pendant cette journée, qu'aimeriez-vous que l'autre fasse, ou ne fasse pas ?",
      'besoin',
      ['Me laisser du temps', 'Un petit signe', 'Ne pas insister'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient ce besoin de temps pour digérer un désaccord ?",
        'origine',
        ['De mon caractère', 'De ma famille', 'D’une expérience'],
      ),
    ],
  },
  'M2_Q08:B': {
    statement: 'Vous vous excusez tous les deux quand vous voyez votre erreur.',
    probe: q(
      "Pour vous, qu'est-ce qui fait qu'une excuse compte vraiment ?",
      'sens',
      ['Les mots', 'Les actes qui suivent', 'Le moment'],
    ),
    extraProbes: [
      originProbe(
        'Qui vous a appris à reconnaître une erreur sans perdre la face ?',
        'origine',
        ['Un parent', 'Un professeur', 'Ma propre expérience'],
      ),
      dailyProbe(
        "Dans une vie à deux, comment aimeriez-vous qu'une excuse soit dite ?",
        'projection',
        ['Avec des mots simples', 'Par un geste', 'Sans attendre'],
      ),
    ],
  },
  'M9_Q04:A': {
    statement: 'Vous dites tous les deux une frustration dès que possible.',
    probe: dailyProbe(
      'Concrètement, combien de temps une frustration peut-elle attendre avant d’être dite, pour vous ?',
      'sens',
      ['Quelques minutes', 'Le soir même', 'Un jour ou deux'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient l'idée qu'une frustration se dit vite ?",
        'origine',
        ['De ma famille', 'D’une expérience', 'De mon caractère'],
      ),
    ],
  },
  'M9_Q04:B': {
    statement:
      'Vous attendez tous les deux le bon moment pour dire une frustration.',
    probe: q(
      'À quoi reconnaissez-vous, vous, que le bon moment est venu ?',
      'sens',
      ['Le calme', 'Un moment seul à deux', "L'humeur de l'autre"],
    ),
    extraProbes: [
      originProbe(
        'Qui vous a appris à choisir le moment pour dire ce qui vous pèse ?',
        'origine',
        ['Un parent', 'Ma propre expérience', 'Une amitié'],
      ),
      dailyProbe(
        'Dans une vie à deux, quel moment de la semaine vous semblerait juste pour ces mises au point ?',
        'projection',
        ['Le week-end', 'Un soir calme', 'Une promenade'],
      ),
    ],
  },
  'M6_Q03:A': {
    statement: 'Pour vous deux, trouver une solution compte plus que gagner.',
    probe: q(
      'Pendant un désaccord, à quoi verrait-on que vous cherchez une solution ?',
      'sens',
      ['Mes questions', 'Mon écoute', 'Mes propositions'],
    ),
    extraProbes: [
      protectProbe(
        'Dans un désaccord, quelle valeur resterait à protéger, même en cherchant une solution ?',
        'besoin',
        ['La vérité', 'Le respect', 'Ma dignité'],
      ),
      originProbe(
        "D'où vous vient le réflexe de chercher une solution plutôt qu'un gagnant ?",
        'origine',
        ['De ma famille', 'De mon travail', 'De mon caractère'],
      ),
    ],
  },
  'M6_Q11:A': {
    statement:
      'Pour vous deux, une réconciliation passe par en reparler et se demander pardon.',
    probe: q("Qu'est-ce qui rend un pardon sincère à vos yeux ?", 'sens', [
      'Les mots',
      'Le regard',
      'Les actes',
    ]),
    extraProbes: [
      originProbe(
        "Qui vous a appris que se demander pardon fait partie de l'amour ?",
        'origine',
        ['Un parent', 'Ma foi', 'Ma propre expérience'],
      ),
      dailyProbe(
        "Au quotidien, qu'est-ce qui rendrait facile, pour vous, de reparler d'un désaccord ?",
        'projection',
        ['Un moment calme', 'Un mot doux', 'Du temps'],
      ),
    ],
  },
  'M6_Q11:B': {
    statement:
      "Pour vous deux, un geste tendre vaut mieux qu'une longue discussion.",
    probe: q(
      "Quel geste, pour vous, signifie vraiment qu'une dispute est derrière vous ?",
      'sens',
      ['Un câlin', 'Un repas partagé', 'Un sourire'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient cette préférence pour les gestes plutôt que les mots ?",
        'origine',
        ['De ma famille', 'De mon caractère', 'D’une expérience'],
      ),
      dailyProbe(
        'Au quotidien, quel geste tendre aimeriez-vous recevoir après un désaccord ?',
        'projection',
        ['Un mot doux', 'Un café préparé', 'Un sourire'],
      ),
    ],
  },
  'M6_Q11:C': {
    statement: 'Pour vous deux, chacun prend du recul, puis on tourne la page.',
    probe: q(
      "Qu'est-ce qui, à vos yeux, reste à dire avant de passer à autre chose ?",
      'sens',
      ['Une excuse', 'Ce qui a blessé', 'Rien'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient cette façon de laisser passer les choses ?",
        'origine',
        ['De ma famille', 'De mon caractère', 'D’une expérience'],
      ),
      dailyProbe(
        'Au quotidien, combien de temps de recul vous semblerait juste avant de tourner la page ?',
        'projection',
        ['Une heure', 'Une soirée', 'Une nuit'],
      ),
    ],
  },
  // Deux attentes du premier pas : sans phrase d'accord, la question parle de soi.
  'M6_Q11:D': {
    statement: '',
    probe: dailyProbe(
      "Après une dispute, qu'est-ce qui vous aiderait, vous, à faire le premier pas, même quand vous attendez celui de l'autre ?",
      'reparation',
      [
        'Un délai convenu',
        'Un signe de l’autre',
        'Savoir que je serai accueilli(e)',
      ],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient votre manière de vivre le premier pas après une dispute ?",
        'origine',
        ['Qu’il coûte', 'Qu’il apaise', 'Qu’on l’attendait de moi'],
      ),
    ],
  },
  'M2_Q01:A': {
    statement:
      'Quand un message reste sans réponse, vous patientez tous les deux sereinement.',
    probe: protectProbe(
      "Pour vous, après combien de temps un silence cesse-t-il d'être anodin ?",
      'limite',
      ['Quelques heures', 'Une journée', 'Plusieurs jours'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient cette patience face aux silences ?",
        'origine',
        ['De mon caractère', 'De ma confiance', 'D’une expérience'],
      ),
      dailyProbe(
        'Dans une vie à deux, comment aimeriez-vous que chacun donne des nouvelles au fil de la journée ?',
        'projection',
        ['Un message', 'Un appel', 'Pas besoin'],
      ),
    ],
  },
  'M2_Q02:B': {
    statement: "Vous expliquez tous les deux calmement votre besoin d'espace.",
    probe: dailyProbe(
      "Quand vous expliquez ce besoin, qu'aimeriez-vous que l'autre entende ?",
      'besoin',
      [
        "Que ce n'est pas un rejet",
        "Que j'en ai besoin pour revenir",
        'Que cela ne dure pas',
      ],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a appris qu'on peut demander de l'espace sans blesser ?",
        'origine',
        ['Un parent', 'Une amitié', 'Ma propre expérience'],
      ),
    ],
  },
  'M9_Q02:B': {
    statement:
      "Pour vous deux, l'amour se construit, et l'effort en est une preuve.",
    probe: q(
      "Quel effort, pour vous, compte vraiment comme une preuve d'amour ?",
      'sens',
      ['Du temps donné', 'Une habitude changée', 'Une attention répétée'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a montré qu'un amour grandit à force d'efforts ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Ma foi'],
      ),
      dailyProbe(
        "Dans une semaine ordinaire, quel effort tiendriez-vous à faire pour l'autre ?",
        'projection',
        ['Du temps', 'De l’écoute', 'Une attention'],
      ),
    ],
  },
  'M9_Q06:B': {
    statement: "Pour vous deux, un sacrifice se fait s'il est réciproque.",
    probe: q("À quoi voyez-vous qu'un sacrifice est réciproque ?", 'sens', [
      'Au temps',
      'À la reconnaissance',
      'Aux actes',
    ]),
    extraProbes: [
      protectProbe(
        'Quel sacrifice, même réciproque, resterait pour vous hors de question ?',
        'limite',
        ['Mon travail', 'Mes proches', 'Mes valeurs'],
      ),
      originProbe(
        'Qui vous a appris que les sacrifices se font à deux ?',
        'origine',
        ['Mes parents', 'Un couple ami', 'Ma propre expérience'],
      ),
    ],
  },
  'M9_Q06:C': {
    statement: 'Pour vous deux, les petits sacrifices oui, les grands non.',
    probe: protectProbe(
      'Où passe, pour vous, la frontière entre un petit et un grand sacrifice ?',
      'sens',
      ['Le travail', 'Le lieu de vie', 'Les proches'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient cette prudence face aux grands sacrifices ?",
        'origine',
        ['De ma famille', 'D’une expérience', 'De mon caractère'],
      ),
    ],
  },
  'M9_Q01:A': {
    statement:
      'Vous voulez tous les deux décider ensemble des choses importantes.',
    probe: q(
      "Pour vous, qu'est-ce qui fait partie des décisions importantes ?",
      'sens',
      ["L'argent", 'Le lieu de vie', 'Avoir des enfants ou non'],
    ),
    extraProbes: [
      originProbe(
        'Qui vous a montré ce que veut dire décider à deux ?',
        'origine',
        ['Mes parents', 'Un couple ami', 'Personne encore'],
      ),
      dailyProbe(
        'Au quotidien, comment aimeriez-vous prendre ensemble une grande décision ?',
        'projection',
        ['En prenant le temps', 'En listant les options', 'En parlant le soir'],
      ),
    ],
  },
  'M9_Q01:D': {
    statement: 'Pour vous deux, chacun peut avoir ses domaines de décision.',
    probe: q(
      "Quel domaine de décision laisseriez-vous volontiers à l'autre ?",
      'sens',
      ['La maison', 'Les sorties', 'Les finances'],
    ),
    extraProbes: [
      dailyProbe(
        'Une fois sous le même toit, comment aimeriez-vous partager les domaines de décision ?',
        'projection',
        ['Selon nos goûts', 'Selon nos forces', 'Au fil du temps'],
      ),
      originProbe(
        "Qui vous a montré qu'on peut se partager les décisions sans conflit ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Personne encore'],
      ),
    ],
  },
  'M8_Q09:A': {
    statement: "Vous abordez tous les deux tôt un désaccord sur l'avenir.",
    probe: dailyProbe(
      "Pour vous, à quel moment d'une rencontre est-il temps d'aborder un point clé ?",
      'sens',
      [
        'Dès les premiers échanges',
        'Après quelques rendez-vous',
        'Avant tout engagement',
      ],
    ),
    probeVariant: q(
      "Qu'est-ce qui vous pousse à poser tôt les questions qui fâchent ?",
      'besoin',
      ['Ne pas perdre de temps', 'La sincérité', 'Le respect de l’autre'],
    ),
    extraProbes: [
      protectProbe(
        "En parlant tôt de ce qui fâche, qu'est-ce que vous cherchez à préserver ?",
        'besoin',
        ['Mon temps', 'La sincérité', 'Le respect de l’autre'],
      ),
      dailyProbe(
        'Avant de vous engager, quel sujet aimeriez-vous avoir mis sur la table ?',
        'projection',
        ['Le lieu de vie', 'La famille', 'L’argent'],
      ),
    ],
  },
  'M8_Q02:A': {
    statement: "Vous envisagez tous les deux un engagement dans l'année.",
    probe: dailyProbe(
      "Qu'aimeriez-vous avoir découvert de l'autre avant cette échéance ?",
      'besoin',
      ['Sa famille', 'Sa façon de traverser un désaccord', 'Ses projets'],
    ),
    probeVariant: q(
      "Qu'est-ce qui rend ce délai d'un an juste pour vous ?",
      'sens',
      ['Ma foi', 'Mon projet de vie', 'Le sérieux de ma démarche'],
    ),
    extraProbes: [
      protectProbe(
        "Quelle étape tenez-vous à ne pas brûler d'ici cet engagement ?",
        'besoin',
        ['Connaître sa famille', 'Parler de nos projets', 'Prendre le temps'],
      ),
      dailyProbe(
        "Au fil de cette année, comment aimeriez-vous découvrir le quotidien de l'autre ?",
        'projection',
        [
          'En se voyant souvent',
          'En rencontrant les proches',
          'En partageant des projets',
        ],
      ),
    ],
  },
  'M8_Q02:D': {
    statement:
      "Pour vous deux, l'engagement viendra quand les conditions seront mûres.",
    probe: dailyProbe(
      'Quelles conditions rendraient le moment mûr, très concrètement ?',
      'sens',
      ['Une stabilité', 'Une vraie confiance', "L'accord des familles"],
    ),
    probeVariant: originProbe(
      'Qui, autour de vous, vous a appris à attendre que les conditions soient réunies ?',
      'origine',
      ['Mes parents', 'Ma foi', 'Mon expérience'],
    ),
    extraProbes: [
      protectProbe(
        "En attendant que le moment soit mûr, qu'est-ce que vous tenez à préserver ?",
        'besoin',
        ['Ma liberté', 'Ma sérénité', 'Mes projets'],
      ),
    ],
  },
  'M7_Q01:A': {
    statement: "Vous rêvez tous les deux d'une vie stable et établie.",
    probe: dailyProbe(
      'Pour vous, à quoi ressemble la stabilité dans une semaine ordinaire ?',
      'sens',
      ['Des horaires', 'Un foyer', 'Des rituels'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a transmis le besoin d'un foyer stable ?",
        'origine',
        ['Mes parents', 'Mon enfance', 'Ma propre histoire'],
      ),
    ],
  },
  'M7_Q08:B': {
    statement:
      'Vous imaginez tous les deux les soirées et les week-ends ensemble, avec des moments à soi.',
    probe: dailyProbe(
      'Pour vous, à quoi ressemble un moment à soi, très concrètement ?',
      'sens',
      ['Une soirée seul(e)', 'Une activité', 'Des amis'],
    ),
    probeVariant: dailyProbe(
      'Quel moment à vous, dans une semaine, vous rend plus présent(e) ensuite ?',
      'besoin',
      ['Un sport', 'Une soirée entre amis', 'Un temps seul(e)'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient ce besoin de garder des moments à vous ?",
        'origine',
        ['De mon caractère', 'De ma famille', 'De mon rythme'],
      ),
      originProbe(
        "Quel couple, autour de vous, vous a montré l'art de vivre ensemble sans s'effacer ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Personne encore'],
      ),
    ],
  },
  'M9_Q07:A': {
    statement: 'Pour vous deux, la tendresse au quotidien est essentielle.',
    probe: q('À quoi reconnaissez-vous une tendresse sincère ?', 'sens', [
      'À la régularité',
      'Au moment choisi',
      'À la douceur',
    ]),
    probeVariant: originProbe(
      "D'où vous vient ce besoin de tendresse au quotidien ?",
      'origine',
      ['De ma famille', 'De ce qui m’a manqué', 'De mon caractère'],
    ),
    probeThird: q(
      'Quel geste de tendresse vous fait vous sentir vraiment aimé(e) ?',
      'sens',
      ['Un mot doux', 'Une main tendue', 'Un câlin'],
    ),
    extraProbes: [
      originProbe(
        'Qui vous a montré la tendresse que vous aimeriez vivre ?',
        'origine',
        ['Un parent', 'Un grand-parent', 'Personne encore'],
      ),
      dailyProbe(
        'Dans une journée ordinaire, à quel moment la tendresse compterait-elle le plus pour vous ?',
        'projection',
        ['Le matin', 'Le retour du travail', 'Le soir'],
      ),
    ],
  },
  'M0_Q08:A': {
    statement:
      "Pour vous deux, le tabac, l'alcool ou d'autres substances n'ont pas leur place chez l'autre.",
    probe: protectProbe(
      "Qu'est-ce qu'un verre ou une cigarette chez l'autre viendrait abîmer, pour vous ?",
      'besoin',
      ['Ma sérénité', 'Le foyer', 'Mes valeurs'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient cette exigence d'une vie sans tabac ni alcool ?",
        'origine',
        ['De ma foi', 'De ma famille', 'De ce que j’ai vu'],
      ),
    ],
  },
  'M0_Q08:B': {
    statement:
      'Pour vous deux, tabac et alcool restent acceptables avec modération.',
    probe: protectProbe(
      "Où commence l'excès, très concrètement, à vos yeux ?",
      'sens',
      ['Au quotidien', 'En soirée', 'Devant les proches'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a transmis l'idée qu'on peut boire ou fumer avec mesure ?",
        'origine',
        ['Ma famille', 'Mes amis', 'Ma propre expérience'],
      ),
    ],
  },
  'M6_Q10:B': {
    statement:
      'Pour vous deux, la fidélité compte, et une réconciliation reste possible.',
    probe: q(
      "Qu'est-ce qui, à vos yeux, rendrait une réconciliation encore possible après un écart ?",
      'sens',
      ['La vérité dite', 'Le temps', 'Un engagement renouvelé'],
    ),
    extraProbes: [
      protectProbe(
        'Quelle part de la confiance vous semble la plus précieuse à garder intacte ?',
        'besoin',
        ['La parole donnée', 'La transparence', 'Le respect'],
      ),
      originProbe(
        "Qui vous a appris qu'une confiance peut se retrouver ?",
        'origine',
        ['Mes parents', 'Ma foi', 'Ma propre histoire'],
      ),
      dailyProbe(
        'Dans une vie à deux, quel geste simple entretiendrait la confiance, jour après jour ?',
        'projection',
        ['La transparence', 'Les attentions', 'La parole tenue'],
      ),
    ],
  },
  'M0_Q06:B': {
    statement:
      'Vous souhaitez tous les deux des enfants, si les conditions sont réunies.',
    probe: dailyProbe(
      "Très concrètement, quelles conditions aimeriez-vous voir réunies avant d'accueillir un enfant ?",
      'sens',
      ['Un foyer stable', 'Une sécurité financière', 'Un couple solide'],
    ),
    probeVariant: originProbe(
      "D'où vous vient le besoin de réunir certaines conditions avant d'accueillir un enfant ?",
      'origine',
      ['De ma famille', 'De ce que j’ai vu', 'De ma foi'],
    ),
    probeThird: q(
      "Si les conditions tardaient à venir, qu'est-ce qui vous aiderait à garder confiance ?",
      'besoin',
      ['Le temps', 'Notre complicité', 'Ma foi'],
    ),
    extraProbes: [
      protectProbe(
        "Parmi ces conditions, laquelle vous semble essentielle, quoi qu'il arrive ?",
        'besoin',
        ['Un foyer stable', 'Une sécurité financière', 'Un couple solide'],
      ),
      protectProbe(
        "Qu'est-ce que ces conditions viennent protéger, pour vous ?",
        'besoin',
        ['L’enfant à venir', 'Le couple', 'Ma tranquillité'],
      ),
      protectProbe(
        'Quelle condition, pour vous, ne pourrait pas être mise de côté ?',
        'besoin',
        ['Un logement', 'Un travail stable', 'Une vraie complicité'],
      ),
    ],
  },
  'M0_Q06:C': {
    statement: "Vous hésitez tous les deux sur le désir d'enfants.",
    probe: q(
      "Qu'est-ce qui pourrait, avec le temps, vous aider à y voir plus clair ?",
      'besoin',
      ['Le temps', 'Une rencontre', 'Une conversation sincère'],
    ),
    probeVariant: q(
      "Qu'est-ce qui, dans cette hésitation, pèse le plus pour vous aujourd'hui ?",
      'besoin',
      ['Ma liberté', 'Le bon moment', 'La peur de mal faire'],
    ),
    probeThird: q(
      "Si l'on vous demandait ce qui ferait pencher la balance, que répondriez-vous ?",
      'sens',
      ['Une rencontre', 'Une stabilité', 'Le temps'],
    ),
    extraProbes: [
      protectProbe(
        "Dans cette hésitation, qu'est-ce que vous cherchez à protéger ?",
        'besoin',
        ['Ma liberté', 'Ma sérénité', 'Le bon moment'],
      ),
      protectProbe(
        'Quelle part de votre vie actuelle tenez-vous à garder, quelle que soit votre décision ?',
        'besoin',
        ['Mon travail', 'Ma liberté', 'Mes projets'],
      ),
      protectProbe(
        "Qu'est-ce qui vous semble précieux à respecter tant que la question reste ouverte ?",
        'besoin',
        ['Mon rythme', 'La sincérité', 'Le temps'],
      ),
      originProbe(
        "D'où vous vient le besoin de prendre votre temps sur ce choix ?",
        'origine',
        ['De mon histoire', 'De ma famille', 'De ce que j’ai vu'],
      ),
      dailyProbe(
        'Une fois en couple, à quel rythme aimeriez-vous en reparler ?',
        'projection',
        ['Régulièrement', 'Sans pression', 'Quand l’un est prêt'],
      ),
    ],
  },
  'M4_Q05:A': {
    statement: 'Pour vous deux, aider sa famille fait partie du quotidien.',
    probe: protectProbe(
      "À quel moment une aide à la famille cesse-t-elle, pour vous, d'être ordinaire ?",
      'limite',
      ['Un montant', 'Une urgence', 'Une fréquence'],
    ),
    probeVariant: q(
      "Qu'est-ce que cette aide aux vôtres vous apporte, à vous ?",
      'besoin',
      ['De la fierté', 'De la paix', 'Le sentiment d’être utile'],
    ),
    probeThird: dailyProbe(
      'Comment aimeriez-vous que cette aide se décide, une fois en couple ?',
      'projection',
      ['Seul(e)', 'À deux', 'Selon les cas'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a transmis ce devoir d'aider les vôtres ?",
        'origine',
        ['Mes parents', 'Ma culture', 'Ma foi'],
      ),
      dailyProbe(
        'Une fois en couple, comment aimeriez-vous organiser cette aide au fil des mois ?',
        'projection',
        ['Un budget dédié', 'Au cas par cas', 'Une décision à deux'],
      ),
    ],
  },
  'M4_Q05:B': {
    statement:
      "Pour vous deux, un envoi d'argent à la famille se décide d'abord à deux.",
    probe: protectProbe(
      "À partir de quel moment un envoi mérite-t-il, selon vous, qu'on en parle ensemble ?",
      'sens',
      ['Dès le premier envoi', 'Au-delà d’un montant', 'S’il devient régulier'],
    ),
    probeVariant: q(
      "Qu'est-ce qui rend, à vos yeux, une décision d'argent vraiment prise à deux ?",
      'sens',
      ['En parler avant', 'Un accord des deux', 'La même information'],
    ),
    probeThird: dailyProbe(
      "Qu'est-ce qui vous aiderait à dire non à un proche, quand l'argent du foyer ne le permet pas ?",
      'besoin',
      ['L’appui de l’autre', 'Une règle claire', 'Une autre aide à proposer'],
    ),
    extraProbes: [
      originProbe(
        "De qui tenez-vous cette façon de décider ensemble de l'aide aux siens ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Ma propre expérience'],
      ),
      dailyProbe(
        'Au quotidien, comment aimeriez-vous en parler avant chaque envoi ?',
        'projection',
        [
          'Un message rapide',
          'Une vraie discussion',
          'Une règle posée une fois',
        ],
      ),
    ],
  },
  'M4_Q05:D': {
    statement:
      "Pour vous deux, l'aide à la famille a ses limites, pour préserver le foyer.",
    probe: protectProbe(
      'À quel signe sentiriez-vous que cette limite est atteinte ?',
      'limite',
      ['Un montant', 'Une fréquence', 'Une décision à deux'],
    ),
    probeVariant: dailyProbe(
      'Comment aimeriez-vous expliquer ce choix à vos proches, le jour où vous direz non ?',
      'besoin',
      ['Calmement', 'Avec l’autre à mes côtés', 'Au cas par cas'],
    ),
    probeThird: originProbe(
      "D'où vous vient ce souci de préserver d'abord le foyer ?",
      'origine',
      ['De ma famille', 'De ce que j’ai vu', 'D’un choix personnel'],
    ),
    extraProbes: [
      dailyProbe(
        'Une fois en couple, comment aimeriez-vous fixer ensemble ces limites ?',
        'projection',
        ['Un budget', 'Une règle simple', 'Au cas par cas'],
      ),
    ],
  },
  'M4_Q01:B': {
    statement:
      'Vous voyez tous les deux une contribution selon les revenus de chacun.',
    probe: q(
      "Pour vous, qu'est-ce qui entre dans le calcul, au-delà de ce que chacun gagne ?",
      'sens',
      ['Le temps donné au foyer', 'Les dettes', 'Les charges de chacun'],
    ),
    probeVariant: dailyProbe(
      'Pour vous, une contribution juste, à quoi se voit-elle à la fin du mois ?',
      'sens',
      ['Aux factures payées', 'À l’absence de gêne', 'À ce qui reste à chacun'],
    ),
    probeThird: originProbe(
      "D'où vous vient l'idée que chacun participe selon ses moyens ?",
      'origine',
      ['De ma famille', 'De ce que j’ai vu', 'D’un sens de la justice'],
    ),
    extraProbes: [
      protectProbe(
        "Pour vous, où s'arrêterait la part de la personne qui gagne le plus ?",
        'limite',
        ['Aux charges', 'Aux projets', 'Aux imprévus'],
      ),
      protectProbe(
        "Qu'est-ce que ce partage proportionnel protège, à vos yeux ?",
        'besoin',
        ['L’égalité', 'La paix', 'La dignité de chacun'],
      ),
      protectProbe(
        "Quelle dépense, pour vous, resterait à partager à parts égales quoi qu'il arrive ?",
        'besoin',
        ['Le loyer', 'Les courses', 'Les loisirs'],
      ),
      originProbe(
        "Qui vous a montré qu'une contribution juste tient compte des moyens de chacun ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Mon sens de la justice'],
      ),
      dailyProbe(
        'Au quotidien, comment aimeriez-vous calculer la part de chacun ?',
        'projection',
        ['Au pourcentage', 'Par postes', 'Simplement'],
      ),
    ],
  },
  'M4_Q01:D': {
    statement: "Pour vous deux, l'argent reste une affaire individuelle.",
    probe: protectProbe(
      "Qu'est-ce qui, pour vous, se partagerait malgré tout ?",
      'sens',
      ['Le loyer', 'Les projets', 'Les imprévus'],
    ),
    probeVariant: protectProbe(
      'Que protège, à vos yeux, le fait de garder son argent à soi ?',
      'besoin',
      ['Ma liberté', 'La paix du couple', 'Ma sécurité'],
    ),
    probeThird: dailyProbe(
      "Le jour d'un projet commun, comment aimeriez-vous en parler à deux ?",
      'projection',
      ['Avant toute dépense', 'Au cas par cas', 'Avec un budget dédié'],
    ),
    extraProbes: [
      protectProbe(
        "Jusqu'où cette indépendance financière irait-elle, pour vous ?",
        'limite',
        ['Tout séparé', 'Sauf le loyer', 'Sauf les projets'],
      ),
      originProbe(
        "D'où vous vient l'idée que chacun garde la main sur son argent ?",
        'origine',
        ['De ma famille', 'D’une expérience', 'D’un besoin d’indépendance'],
      ),
      dailyProbe(
        'Au quotidien, comment aimeriez-vous régler les dépenses partagées ?',
        'projection',
        ['Chacun son tour', 'Moitié-moitié', 'Au cas par cas'],
      ),
    ],
  },
  'M3_Q04:A': {
    statement: "Pour vous deux, l'enfant de l'un devient l'enfant de l'autre.",
    probe: dailyProbe(
      'Dans une famille recomposée, comment imaginez-vous la façon de poser les règles aux enfants ?',
      'sens',
      [
        'Décider ensemble',
        'Laisser le parent trancher',
        'Poser la règle moi-même',
      ],
    ),
    probeVariant: q(
      "Qu'est-ce que le mot parent veut dire pour vous, au-delà du lien du sang ?",
      'sens',
      ['Protéger', 'Éduquer', 'Aimer'],
    ),
    probeThird: q(
      "À quoi un enfant sentirait-il qu'il a toute sa place auprès de vous ?",
      'sens',
      ['Mon attention', 'Ma patience', 'Des moments à nous'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient l'idée qu'un enfant peut devenir le vôtre sans lien de sang ?",
        'origine',
        ['De ma famille', 'De ma foi', 'De ce que j’ai vu'],
      ),
      originProbe(
        "Qui, autour de vous, vous a montré qu'on peut aimer l'enfant d'un autre comme le sien ?",
        'origine',
        ['Un beau-parent', 'Un proche', 'Personne encore'],
      ),
      originProbe(
        'Dans votre entourage, comment parlait-on des familles recomposées ?',
        'origine',
        ['Avec chaleur', 'Avec méfiance', 'On n’en parlait pas'],
      ),
      dailyProbe(
        'Dans une famille recomposée, à quoi ressemblerait pour vous une journée ordinaire réussie ?',
        'projection',
        ['Des repas ensemble', 'Des jeux', 'Du calme'],
      ),
    ],
  },
  'M3_Q04:B': {
    statement:
      'Pour vous deux, les rôles parentaux restent définis dans une famille recomposée.',
    probe: q(
      "Qu'est-ce qui reviendrait toujours au parent, selon vous, même avec le temps ?",
      'sens',
      ['Les règles', "L'autorité", 'Les grandes décisions'],
    ),
    probeVariant: q(
      'À quoi se voit, selon vous, une place affectueuse qui ne prend le rôle de personne ?',
      'sens',
      ['Une écoute', 'Des attentions', 'De la discrétion'],
    ),
    probeThird: q(
      "Qu'est-ce qui, selon vous, aide un beau-parent à trouver sa juste place ?",
      'sens',
      ['Le temps', 'Le respect du parent', 'La patience'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient l'idée que chaque parent garde son rôle ?",
        'origine',
        ['De ma famille', 'De ce que j’ai vu', 'D’une conviction'],
      ),
      originProbe(
        'Quel exemple, autour de vous, vous a appris à respecter le rôle de chacun dans une famille ?',
        'origine',
        ['Mes parents', 'Un proche', 'Personne encore'],
      ),
      originProbe(
        "Dans votre entourage, qu'avez-vous retenu de la place laissée à chaque parent ?",
        'origine',
        ['Qu’elle compte', 'Qu’elle se respecte', 'Qu’elle évolue'],
      ),
      dailyProbe(
        "Au quotidien, quelle place aimeriez-vous prendre auprès de l'enfant de l'autre ?",
        'projection',
        ['Une présence', 'Un soutien', 'Une écoute'],
      ),
    ],
  },
  'M3_Q04:D': {
    statement:
      'Pour vous deux, une famille recomposée se construit avec le temps.',
    probe: dailyProbe(
      'À quoi verriez-vous, au bout d’un an, que la confiance s’installe ?',
      'sens',
      ['Des confidences', 'Des rires', 'Des moments demandés'],
    ),
    probeVariant: q(
      "Qu'est-ce qui, selon vous, fait grandir la confiance entre des personnes qui deviennent une famille ?",
      'sens',
      ['Le temps', 'La patience', 'Des moments partagés'],
    ),
    probeThird: dailyProbe(
      "Qu'est-ce qui vous aiderait à être patient(e) pendant ces premiers temps ?",
      'besoin',
      ['Le soutien de l’autre', 'Des petites victoires', 'Du temps pour nous'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient l'idée qu'une famille se tisse avec le temps ?",
        'origine',
        ['De ma famille', 'De mon expérience', 'De ma foi'],
      ),
      originProbe(
        'Qui vous a appris que la patience fait les liens solides ?',
        'origine',
        ['Un parent', 'Un grand-parent', 'Ma propre expérience'],
      ),
      originProbe(
        "Quelle famille, autour de vous, vous a montré qu'on peut devenir proches peu à peu ?",
        'origine',
        ['Une famille amie', 'Ma propre famille', 'Personne encore'],
      ),
    ],
  },
  'M5_Q03:A': {
    statement:
      'Vous accepteriez tous les deux de vivre un temps avec un parent, avec des règles claires.',
    probe: protectProbe(
      'Pour vous, combien de temps peut durer une cohabitation temporaire ?',
      'sens',
      ['Quelques semaines', 'Quelques mois', 'Le temps nécessaire'],
    ),
    probeVariant: dailyProbe(
      'À quoi verriez-vous, pendant ce temps-là, que les règles sont respectées ?',
      'sens',
      ['Un espace préservé', 'Une durée tenue', 'Des décisions à deux'],
    ),
    probeThird: dailyProbe(
      "Qu'est-ce qui vous aiderait à dire, le moment venu, que ce temps-là est fini ?",
      'besoin',
      ['Une date fixée', 'Un dialogue', 'Un accord de départ'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a appris qu'on accueille mieux un proche quand le cadre est clair ?",
        'origine',
        ['Mes parents', 'Une expérience', 'Ma culture'],
      ),
    ],
  },
  'M5_Q03:B': {
    statement: 'Pour vous deux, le foyer appartient au couple.',
    probe: protectProbe(
      "Quand un parent aurait besoin d'aide, quelle forme de soutien resterait possible pour vous ?",
      'sens',
      ['Une aide de loin', 'Des visites', 'Un soutien financier'],
    ),
    probeVariant: protectProbe(
      "Qu'est-ce que ce foyer à deux protège de plus précieux à vos yeux ?",
      'besoin',
      ['Notre intimité', 'Nos décisions', 'Notre calme'],
    ),
    probeThird: originProbe(
      "D'où vous vient l'idée que le foyer appartient d'abord au couple ?",
      'origine',
      ['De ma famille', 'De ce que j’ai vu', 'D’un choix personnel'],
    ),
    extraProbes: [
      dailyProbe(
        'Au quotidien, comment aimeriez-vous recevoir les vôtres chez vous ?',
        'projection',
        ['Souvent', 'À des moments choisis', 'Pour les fêtes'],
      ),
      dailyProbe(
        "Avant de partager un foyer, que voudriez-vous convenir avec l'autre des visites de la famille ?",
        'projection',
        ['Leur fréquence', 'Leur durée', 'Qui invite'],
      ),
    ],
  },
  'M5_Q03:C': {
    statement:
      'Pour chacun de vous, vivre avec un parent est attendu dans sa culture.',
    probe: q(
      "Qu'est-ce qui, pour vous, rend une cohabitation heureuse pour tout le monde ?",
      'sens',
      ['Des règles claires', 'Un espace à soi', 'Du respect'],
    ),
    probeVariant: originProbe(
      'Dans votre famille, comment se partageait la maison entre les générations ?',
      'origine',
      ['Chacun son espace', 'Tout en commun', 'Selon les âges'],
    ),
    probeThird: dailyProbe(
      'Quelle place aimeriez-vous donner aux aînés dans la vie du foyer ?',
      'sens',
      ['Une place d’honneur', 'Une place de conseil', 'Une place de soin'],
    ),
    extraProbes: [
      protectProbe(
        "Dans cette cohabitation, qu'est-ce que vous tiendriez à préserver pour le couple ?",
        'besoin',
        ['Une chambre à nous', 'Nos décisions', 'Des moments à deux'],
      ),
      originProbe(
        "Qui vous a transmis l'idée qu'on vit avec les siens quand ils vieillissent ?",
        'origine',
        ['Mes parents', 'Ma culture', 'Ma foi'],
      ),
      dailyProbe(
        "Sous le même toit qu'un parent, à quoi ressemblerait une journée réussie pour vous ?",
        'projection',
        ['Des repas partagés', 'Un espace à soi', 'Du calme'],
      ),
    ],
  },
  'M5_Q01:A': {
    statement:
      "Pour vous deux, aucune décision ne se prend sans l'avis de la famille.",
    probe: dailyProbe(
      'Concrètement, quelles décisions passeraient par la famille ?',
      'sens',
      ['Le mariage', 'Le lieu de vie', 'Les projets de famille'],
    ),
    probeVariant: originProbe(
      "Dans votre famille, qui donne l'avis qui compte le plus ?",
      'origine',
      ['Un parent', 'Un aîné', 'Toute la famille'],
    ),
    probeThird: dailyProbe(
      'Comment aimeriez-vous que vos deux familles soient associées aux grandes décisions ?',
      'projection',
      ['Consultées ensemble', 'Chacune à son tour', 'Selon les sujets'],
    ),
    extraProbes: [
      protectProbe(
        'Quelle décision, malgré tout, garderiez-vous pour vous deux seulement ?',
        'limite',
        ['Notre intimité', 'Nos sorties', 'Nos petites dépenses'],
      ),
      originProbe(
        "D'où vous vient l'habitude de consulter les vôtres ?",
        'origine',
        ['De mon éducation', 'De ma culture', 'De ma foi'],
      ),
      originProbe(
        'Qui vous a appris que les grandes décisions se prennent avec les aînés ?',
        'origine',
        ['Mes parents', 'Mes grands-parents', 'Ma communauté'],
      ),
    ],
  },
  'M5_Q01:C': {
    statement:
      'Vous consultez tous les deux votre famille par respect, sans obligation.',
    probe: protectProbe(
      'Pour vous, où s’arrête un conseil et où commence une pression ?',
      'sens',
      ['Au ton', "À l'insistance", 'Aux conséquences'],
    ),
    probeVariant: q(
      "Sur quel sujet demanderiez-vous d'abord conseil aux vôtres ?",
      'sens',
      ['Le mariage', 'Un achat important', 'Le lieu de vie'],
    ),
    probeThird: q(
      "Quand vous consultez les vôtres, qu'est-ce que vous venez y chercher ?",
      'sens',
      ['Un regard', 'Une bénédiction', 'Du recul'],
    ),
    extraProbes: [
      originProbe(
        'Qui vous a appris à écouter les vôtres tout en restant libre ?',
        'origine',
        ['Mes parents', 'Un aîné', 'Ma propre expérience'],
      ),
      originProbe(
        "Dans votre famille, comment donnait-on un conseil sans l'imposer ?",
        'origine',
        ['Avec douceur', 'Par l’exemple', 'En laissant choisir'],
      ),
      dailyProbe(
        'Une fois en couple, comment aimeriez-vous associer vos familles à un choix important ?',
        'projection',
        ['En les informant', 'En leur demandant conseil', 'Au cas par cas'],
      ),
    ],
  },
  'M1_Q06:B': {
    statement:
      "Vous attendez tous les deux que l'autre respecte vos pratiques.",
    probe: q(
      "Pour vous, à quoi se voit le respect d'une pratique que l'on ne partage pas ?",
      'sens',
      ['Aux horaires', 'Aux repas', 'Aux paroles'],
    ),
    extraProbes: [
      dailyProbe(
        'Sous le même toit, à quoi verrait-on, très concrètement, que vos pratiques sont respectées ?',
        'projection',
        ['Aux horaires', 'Aux repas', 'Aux paroles'],
      ),
      protectProbe(
        'Quelle pratique tenez-vous à voir respectée avant tout ?',
        'besoin',
        ['La prière', 'Les fêtes', 'Les repas'],
      ),
      originProbe(
        "De qui tenez-vous l'importance que vous donnez à vos pratiques ?",
        'origine',
        ['De mes parents', 'De ma communauté', 'De ma foi'],
      ),
    ],
  },
  'M1_Q06:C': {
    statement: "Vous êtes tous les deux ouverts à d'autres croyances.",
    probe: protectProbe(
      "Pour vous, jusqu'où va cette ouverture dans un foyer commun ?",
      'limite',
      ['Les fêtes', 'Les repas', 'Les pratiques'],
    ),
    extraProbes: [
      protectProbe(
        "Dans cette ouverture, qu'est-ce que vous tenez à garder de vos propres convictions ?",
        'besoin',
        ['Mes valeurs', 'Mes fêtes', 'Ma pratique'],
      ),
      originProbe(
        'Qui vous a appris à respecter des croyances différentes des vôtres ?',
        'origine',
        ['Mes parents', 'Des amis', 'Mes voyages'],
      ),
      dailyProbe(
        "Sous le même toit, à quoi verrait-on que chacun accueille les croyances de l'autre ?",
        'projection',
        ['Aux fêtes partagées', 'Aux repas', 'Aux questions posées'],
      ),
    ],
  },
  'M0_Q03:B': {
    statement:
      'Vous déménageriez tous les deux pour le couple, si le projet de vie est solide.',
    probe: q(
      'Pour vous, à quoi reconnaît-on un projet de vie assez solide pour partir ?',
      'sens',
      ['Un engagement', 'Un travail', 'Une date'],
    ),
    probeVariant: q(
      "Si vous partiez pour le couple, qu'aimeriez-vous emporter de votre vie actuelle ?",
      'projection',
      ['Mes habitudes', 'Mes amitiés', 'Mon travail'],
    ),
    probeThird: originProbe(
      "D'où vous vient l'idée qu'un départ se prépare d'abord à deux ?",
      'origine',
      ['De ma famille', 'De ce que j’ai vu', 'De mon expérience'],
    ),
    extraProbes: [
      dailyProbe(
        "Dans une nouvelle ville, qu'est-ce qui vous aiderait à vous sentir vite chez vous ?",
        'projection',
        ['Des amis', 'Un travail', 'Des habitudes à deux'],
      ),
      protectProbe(
        "Dans un tel départ, qu'est-ce que vous tiendriez à protéger ?",
        'besoin',
        ['Mon travail', 'Mes liens', 'Mon équilibre'],
      ),
      protectProbe(
        "Qu'est-ce qui, dans votre vie d'ici, ne pourrait pas être quitté à la légère ?",
        'besoin',
        ['Mes proches', 'Mon travail', 'Ma maison'],
      ),
      protectProbe(
        "Quelle garantie, pour vous, rendrait un départ possible sans rien sacrifier d'essentiel ?",
        'besoin',
        ['Un engagement clair', 'Un travail sur place', 'Une date fixée'],
      ),
    ],
  },
  'M0_Q03:C': {
    statement:
      'Pour vous deux, un déménagement pour le couple dépend de la distance.',
    probe: protectProbe(
      'À partir de quelle distance un départ deviendrait-il un vrai renoncement pour vous ?',
      'sens',
      ['Une autre ville', 'Une autre région', 'Un autre pays'],
    ),
    probeVariant: protectProbe(
      "Qu'est-ce qu'un départ trop lointain vous ferait perdre en premier ?",
      'besoin',
      ['Mes proches', 'Mon travail', 'Mes repères'],
    ),
    probeThird: dailyProbe(
      "Qu'est-ce qui vous aiderait à garder vos repères après un départ ?",
      'besoin',
      ['Des visites', 'Des appels', 'Des habitudes gardées'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient le besoin de rester à portée des vôtres ?",
        'origine',
        ['De ma famille', 'De ma culture', 'De mon histoire'],
      ),
    ],
  },
  'M7_Q07:D': {
    statement: 'Vous êtes tous les deux ouverts sur le lieu de vie.',
    probe: dailyProbe(
      "Qu'est-ce qui ferait d'un lieu nouveau un vrai chez-vous ?",
      'sens',
      ['Mes proches', 'Mes habitudes', 'Un projet à deux'],
    ),
    probeVariant: dailyProbe(
      "Sur quoi aimeriez-vous fonder le choix d'un lieu de vie, le moment venu ?",
      'sens',
      ['Le travail', 'La famille', 'La qualité de vie'],
    ),
    probeThird: q(
      "Qu'est-ce qui pourrait un jour vous donner envie de vivre loin d'ici ?",
      'besoin',
      ['Un travail', 'Une famille', 'Une envie d’ailleurs'],
    ),
    extraProbes: [
      protectProbe(
        "Où que vous soyez, qu'est-ce que vous tiendriez à protéger de votre façon de vivre ?",
        'besoin',
        ['Mes habitudes', 'Mes liens', 'Mon rythme'],
      ),
      originProbe(
        "D'où vous vient cette facilité à vous imaginer ailleurs ?",
        'origine',
        ['De mes voyages', 'De ma famille', 'De mon caractère'],
      ),
      originProbe(
        "Qui vous a montré qu'on peut se sentir chez soi en plusieurs endroits ?",
        'origine',
        ['Ma famille', 'Un ami', 'Mes voyages'],
      ),
    ],
  },
  'M4_Q08:A': {
    statement:
      'Vous voulez tous les deux épargner ensemble pour des projets communs.',
    probe: q(
      'Quel premier projet commun mériterait, pour vous, cette épargne ?',
      'sens',
      ['Un logement', 'Un mariage', 'Un voyage'],
    ),
    extraProbes: [
      dailyProbe(
        'Au quotidien, comment aimeriez-vous suivre ensemble cette épargne ?',
        'projection',
        ['Un point régulier', 'Un compte partagé', 'Un objectif affiché'],
      ),
      originProbe(
        'Qui vous a transmis le goût de mettre de côté pour un projet ?',
        'origine',
        ['Mes parents', 'Ma propre expérience', 'Personne'],
      ),
    ],
  },
  'M4_Q08:C': {
    statement:
      'Vous voyez tous les deux une épargne commune et une épargne personnelle.',
    probe: dailyProbe(
      "Pour vous, à quoi servirait l'épargne personnelle, très concrètement ?",
      'sens',
      ['Mes proches', 'Ma sécurité', 'Mes projets'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient l'idée de garder une épargne à soi ?",
        'origine',
        ['De ma famille', 'D’une expérience', 'D’un besoin de sécurité'],
      ),
    ],
  },
  'M8_Q03:B': {
    statement:
      'Pour vous deux, le mariage est un engagement civil et symbolique.',
    probe: q(
      "Qu'est-ce que ce symbole viendrait dire, pour vous, devant vos proches ?",
      'sens',
      ['Un engagement', 'Une famille', 'Une fierté'],
    ),
    probeVariant: dailyProbe(
      "Quel geste, le jour d'un mariage, porte pour vous tout le sens de l'engagement ?",
      'sens',
      ['L’échange des consentements', 'Les alliances', 'La signature'],
    ),
    probeThird: q(
      "Qu'est-ce qui, pour vous, donnerait au mariage civil toute sa valeur ?",
      'sens',
      ['Les témoins', 'La promesse', 'La fête'],
    ),
    extraProbes: [
      originProbe(
        "D'où vous vient l'idée que le mariage tient d'abord du symbole ?",
        'origine',
        ['De ma famille', 'De mes convictions', 'D’un couple qui m’inspire'],
      ),
      originProbe(
        "Qui, dans votre entourage, vous a donné le goût d'un mariage simple ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Personne encore'],
      ),
      dailyProbe(
        "Dans la vie de tous les jours, qu'est-ce que ce mariage civil viendrait changer pour vous ?",
        'projection',
        ['Notre sécurité', 'Notre famille', 'Rien de visible'],
      ),
    ],
  },
  'M8_Q03:D': {
    statement: "Pour vous deux, le mariage est un choix, l'amour passe avant.",
    probe: q(
      "Qu'est-ce qui, pour vous, montrerait un engagement sans passer par le mariage ?",
      'sens',
      ['Un logement commun', 'Des projets communs', 'Une parole donnée'],
    ),
    probeVariant: originProbe(
      "Qu'est-ce qui, dans votre histoire, a rendu l'amour plus important que le papier ?",
      'origine',
      ['Ma famille', 'Ce que j’ai vu', 'Une conviction'],
    ),
    probeThird: dailyProbe(
      "À quoi verrait-on, chez vous, qu'un amour est vraiment engagé ?",
      'sens',
      ['Au temps', 'Aux projets', 'À la parole donnée'],
    ),
    extraProbes: [
      originProbe(
        "Qui vous a appris qu'un amour engagé n'a pas besoin d'un papier ?",
        'origine',
        ['Mes parents', 'Un couple ami', 'Ma propre histoire'],
      ),
    ],
  },
  'M1_Q13:C': {
    needsChildren: true,
    statement:
      'Pour vous deux, des enfants choisiraient eux-mêmes leur culture en grandissant.',
    probe: q(
      "Qu'aimeriez-vous malgré tout leur avoir fait connaître avant qu'ils choisissent ?",
      'sens',
      ['Une langue', 'Des fêtes', 'Des histoires de famille'],
    ),
    probeVariant: originProbe(
      "D'où vous vient cette idée de laisser un enfant choisir sa culture ?",
      'origine',
      ['De mon histoire', 'De ma famille', 'D’une conviction'],
    ),
    extraProbes: [
      dailyProbe(
        'À la maison, comment aimeriez-vous faire découvrir vos racines, sans rien imposer ?',
        'projection',
        ['Par des récits', 'Par des voyages', 'Par la cuisine'],
      ),
    ],
  },
  'M4_Q06:B': {
    statement:
      'Vous voyez tous les deux un achat immobilier comme un projet commun.',
    probe: q(
      "Pour vous, qu'est-ce qu'acheter à deux viendrait dire de votre engagement ?",
      'sens',
      ['Une sécurité', 'Un ancrage', 'Un avenir'],
    ),
    probeVariant: originProbe(
      "Dans votre famille, que représentait le fait d'avoir sa maison ?",
      'origine',
      ['Une sécurité', 'Une fierté', 'Un héritage'],
    ),
    extraProbes: [
      dailyProbe(
        "Avant d'acheter à deux, qu'aimeriez-vous connaître des priorités de l'autre ?",
        'projection',
        ['Le lieu rêvé', 'Son rapport au crédit', 'Ses projets'],
      ),
      dailyProbe(
        "Dans la vie de tous les jours, que changerait pour vous le fait d'être propriétaires à deux ?",
        'projection',
        ['Ma sérénité', 'Nos projets', 'Rien de visible'],
      ),
    ],
  },
  M8_Q04: {
    statement: "Pour vous deux, les mêmes attentions disent l'amour.",
    probe: dailyProbe(
      'Quelle attention précise, dans une journée ordinaire, vous touche le plus ?',
      'sens',
      ['Un mot tendre', 'Un service rendu', 'Du temps ensemble'],
    ),
    extraProbes: [
      originProbe(
        "De qui avez-vous appris ces attentions qui disent l'amour ?",
        'origine',
        ['Mes parents', 'Un grand-parent', 'Mes amis'],
      ),
    ],
  },
};

/**
 * Questions d'accord par jour, ajoutées après la phrase qui nomme l'accord,
 * quand ses relances propres ont toutes été vues : chacune sous l'angle du
 * jour (la limite de l'accord, d'où vient la position, comment chacun la
 * vivrait au quotidien).
 */
export const CONVERGENT: Record<number, PoolTemplate[]> = {
  1: [
    protectProbe(
      "Qu'est-ce qui, malgré tout, pourrait vous faire changer d'avis ?",
      'limite',
      ['Rien', 'Un événement de vie', 'Une discussion sincère'],
    ),
    protectProbe(
      'Sur ce point, dans quelle situation concrète tiendriez-vous le plus à cet accord ?',
      'limite',
      ['Un choix important', 'Une période difficile', 'Le quotidien'],
    ),
    protectProbe(
      "Jusqu'où cette position tient-elle quand la vie se complique ?",
      'limite',
      ['Toujours', 'Presque toujours', 'Elle peut évoluer'],
    ),
  ],
  2: [
    originProbe('De qui tenez-vous cette façon de voir ?', 'origine', [
      'De ma famille',
      'De ma foi',
      'De mon expérience',
    ]),
    originProbe(
      "Qu'est-ce qui, dans votre histoire, a forgé cette position ?",
      'origine',
      ['Ma famille', 'Une rencontre', 'Une épreuve'],
    ),
    originProbe(
      "Quel exemple, autour de vous, vous a convaincu(e) de l'importance de ce point ?",
      'origine',
      ['Un parent', 'Un couple ami', 'Un proche'],
    ),
  ],
  3: [
    dailyProbe(
      "Dans quelle situation de la vie à deux cet accord serait-il le plus mis à l'épreuve ?",
      'limite',
      ['Un désaccord familial', 'Un déménagement', 'Une période difficile'],
    ),
    dailyProbe(
      "Le jour où l'un de vous changerait d'avis, comment aimeriez-vous l'apprendre ?",
      'limite',
      ['Tout de suite', 'Calmement', 'Avec ses raisons'],
    ),
    dailyProbe(
      "Dans quelle décision d'une vie à deux ce point compterait-il le plus pour vous ?",
      'projection',
      ['Le lieu de vie', "L'argent", 'Les projets de famille'],
    ),
    dailyProbe(
      'À quoi un proche verrait-il, dans votre quotidien, que ce point compte pour vous ?',
      'circulaire',
      ['À mes choix', 'À mes paroles', 'À mes habitudes'],
    ),
    dailyProbe(
      "Concrètement, qu'est-ce que cet accord changerait dans votre quotidien ?",
      'sens',
      ['Une règle', 'Une valeur', 'Une habitude'],
    ),
  ],
};

/**
 * Clé de réponse d'un accord (« A ») retrouvée à partir du texte de l'option.
 * Questions actuelles et questions retirées (V6, V7) : un accord entre deux
 * entretiens anciens garde sa phrase et ses relances propres.
 */
export function agreementKey(c: Convergence): string | undefined {
  return QUESTION_INDEX.get(c.questionId)?.options.find(
    (o) => o.text === c.answer,
  )?.key;
}

/**
 * Réponses sur soi (réaction en dispute, jalousie, intimité, consommation…) :
 * une même réponse n'est servie comme accord que si elle a sa propre phrase,
 * écrite pour ne rien exposer. Sinon, nommer l'accord révélerait à l'autre un
 * aveu (« vous avez répondu de la même façon sur le besoin d'avoir le dernier
 * mot »).
 */
const EXPLICIT_AGREEMENT_ONLY = new Set([
  'M2_Q01',
  'M2_Q02',
  'M2_Q06',
  'M6_Q01',
  'M2_Q07',
  'M2_Q08',
  'M9_Q03',
  'M6_Q03',
  'M9_Q04',
  'M6_Q11',
  'M0_Q08',
  'M9_Q07',
  'M6_Q06',
  'M6_Q07',
  'M3_Q05',
  'M5_Q08',
  'M9_Q02',
  'M9_Q06',
  'M10_Q15',
  'M6_Q10',
  'M6_Q18',
  'M6_Q19',
]);

/**
 * Un accord vaut une question : ni réponse différée, ni non-position, ni
 * simple fait, ni aveu sans phrase propre.
 */
export function isAgreementWorthAsking(c: Convergence): boolean {
  if (FACT_QUESTIONS.has(c.questionId)) return false;
  const key = `${c.questionId}:${agreementKey(c) ?? ''}`;
  if (EXPLICIT_AGREEMENT_ONLY.has(c.questionId) && !AGREEMENTS[key])
    return false;
  return !DEFERRED_ANSWERS.has(key) && !NON_POSITION_ANSWERS.has(key);
}

/** Les deux ont remis ce sujet à une conversation en personne. */
export function isDeferredAgreement(c: Convergence): boolean {
  return DEFERRED_ANSWERS.has(`${c.questionId}:${agreementKey(c) ?? ''}`);
}

/**
 * V7.1 : accord sur une question remplaçante dont la réponse garde le sens
 * de celle de la question remplacée (passerelle V7 → V7.1) : même phrase et
 * mêmes relances que l'accord écrit pour la question remplacée.
 */
export const AGREEMENT_ALIASES: Record<string, string> = {
  'M1_Q20:A': 'M1_Q11:A',
  'M4_Q16:A': 'M4_Q05:A',
  'M4_Q16:B': 'M4_Q05:B',
  'M4_Q16:C': 'M4_Q05:D',
  'M4_Q17:A': 'M4_Q07:A',
  'M4_Q17:B': 'M4_Q07:A',
  'M8_Q17:A': 'M8_Q02:A',
  'M8_Q17:D': 'M8_Q02:D',
  'M8_Q16:A': 'M8_Q03:B',
  'M8_Q16:B': 'M8_Q03:A',
  'M8_Q16:D': 'M8_Q03:D',
};

export function agreementFor(c: Convergence): Agreement {
  const key = `${c.questionId}:${agreementKey(c) ?? ''}`;
  const found =
    AGREEMENTS[key] ??
    AGREEMENTS[AGREEMENT_ALIASES[key]] ??
    AGREEMENTS[c.questionId];
  // Accord sans phrase écrite pour lui : pas de question d'accord générique
  // (« vous avez répondu de la même façon sur… » dit ce que chacun a répondu
  // et ouvrait sur des relances vagues) ; le créneau prend un autre gabarit.
  return found ?? { statement: '' };
}

/**
 * Fragments propres à un sujet (tournures et phrases d'accord) : la signature
 * d'une question les retire, pour reconnaître un même gabarit appliqué à un
 * autre sujet.
 */
export const SUBJECT_FRAGMENTS: string[] = [
  ...Object.values(TOPIC_PHRASES),
  ...Object.values(THEME_FALLBACK_PHRASES),
  ...Object.values(AGREEMENTS).map((a) => a.statement),
];
