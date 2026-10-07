/**
 * Réserve des questions du Sondeur BOLIGO (gabarits).
 *
 * Le Sondeur ne repose pas l'entretien : il cherche le sens et le
 * fonctionnement derrière une réponse déjà donnée, avec les techniques d'un
 * clinicien du couple, transposées à deux personnes qui ne se sont encore
 * jamais parlé et qui liront la réponse de l'autre :
 *  - question circulaire, par un proche (jamais « votre partenaire ») ;
 *  - échelle de 0 à 10, avec sa relance (« pourquoi pas un point de moins ? ») ;
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
import { QUESTIONS } from '../interview/questions.data';
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
}

const opts = (a: string, b: string, c: string) => [a, b, c, 'Autre...'];

function q(
  text: string,
  technique: Technique,
  options: [string, string, string],
  about?: string[],
): PoolTemplate {
  return {
    text,
    technique,
    options: opts(...options),
    ...(about ? { about } : {}),
  };
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
  M3_Q05: "la place d'un ex dans sa vie",
  M1_Q02: 'le fait de partager la même culture',
  // Argent & dettes
  M4_Q01: "la mise en commun de l'argent",
  M4_Q03: "le rôle de l'homme dans les finances du foyer",
  M4_Q04: 'le rôle de la femme entre travail et foyer',
  M4_Q05: "l'argent que l'on envoie à sa famille",
  M4_Q08: "l'épargne à deux",
  M4_Q09: 'la transparence sur les dettes',
  M4_Q10: "l'addition du premier rendez-vous",
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
  M8_Q04: 'la façon de montrer son amour',
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
  // Projet de vie
  M4_Q06: "l'achat d'un logement",
  M8_Q01: "l'engagement que l'on cherche",
  M8_Q02: 'le délai avant un engagement officiel',
  M7_Q01: 'le genre de vie dont on rêve',
  M7_Q02: 'la place du travail dans la vie',
  M7_Q05: "le rapport à l'imprévu",
  M7_Q08: 'le temps passé ensemble dans la semaine',
  M8_Q09: "la façon de traiter un désaccord sur l'avenir",
  M0_Q08: "la consommation de tabac ou d'alcool",
  M0_Q09: 'le tabac au quotidien',
  M8_Q11: "le soin donné à l'autre dans l'épreuve",
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
  ['M1_Q05', 'M1_Q06'],
  ['M5_Q01', 'M1_Q10'],
  ['M0_Q05', 'M3_Q04'],
  ['M4_Q03', 'M4_Q04'],
  ['M5_Q08', 'M8_Q10:B'],
  ['M8_Q01', 'M8_Q10:D'],
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
  M10_Q15: [3, 2],
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
]);

export function isNonNegotiable(d: TopicSource): boolean {
  return NON_NEGOTIABLE.has(topicKey(d)) || NON_NEGOTIABLE.has(d.questionId);
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
        "De 0 à 10, à quel point l'avis de votre famille sur la personne que vous choisirez compte-t-il, et pourquoi pas un point de moins ?",
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
        "Si l'autre avait un enfant d'une précédente union, quelle place aimeriez-vous trouver auprès de cet enfant ?",
        'projection',
        [
          'Une présence bienveillante',
          'Un rôle de parent',
          'Une place à construire',
        ],
        ['M0_Q05', 'M3_Q04'],
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
        ['Celui qui apaise', 'Celui qui aide', 'Celui qui réussit'],
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
        'Imaginez un dimanche ordinaire, dans quelques années : qui, de vos deux familles, est autour de la table ?',
        'scene',
        [
          'Les deux familles',
          'Surtout la mienne',
          'Personne, un dimanche à deux',
        ],
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
      q(
        'Si vous éleviez un enfant un jour, quelle phrase entendue dans votre enfance aimeriez-vous lui redire ?',
        'origine',
        ["Une phrase d'encouragement", 'Une règle de vie', 'Une parole de foi'],
      ),
      q(
        'De 0 à 10, quelle place aimeriez-vous laisser à vos familles dans votre vie à deux, et pourquoi pas un point de plus ?',
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
        "À partir de quel montant une dépense de l'autre, faite sans vous en parler, vous mettrait mal à l'aise ?",
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
        'De 0 à 10, combien de calme vous apporte une épargne de côté, et pourquoi pas un point de moins ?',
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
        "Qu'est-ce qui, à propos de l'argent, vous est le plus difficile à dire à voix haute ?",
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
      ),
      q(
        "De 0 à 10, à quel point aimeriez-vous que l'argent soit mis en commun dans votre foyer, et pourquoi pas un point de plus ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M4_Q01'],
      ),
      q(
        "Le jour où l'argent vous inquiéterait, à quoi l'autre pourrait-il s'en apercevoir avant même que vous le disiez ?",
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
        "Imaginez votre mariage sans cérémonie religieuse : qu'est-ce qui vous manquerait le plus ?",
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
        "Si l'autre remettait en question l'une de vos pratiques devant votre famille, que ressentiriez-vous ?",
        'emotion',
        ['De la gêne', 'De la peine', 'De la colère'],
      ),
      q(
        "Si une pratique de l'autre changeait votre quotidien, jusqu'où aimeriez-vous vous y associer ?",
        'limite',
        ['Entièrement', 'Par respect, sans la partager', 'Le moins possible'],
        ['M1_Q09'],
      ),
      q(
        'Comment un proche qui vous connaît bien décrirait-il la place réelle de vos convictions dans vos journées ?',
        'circulaire',
        ['Une place centrale', 'Une place discrète', 'Une place intime'],
        ['M1_Q06'],
      ),
      q(
        'De 0 à 10, à quel point partager les mêmes convictions compte-t-il pour vous, et pourquoi pas un point de moins ?',
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
        ['M1_Q05', 'M1_Q06'],
      ),
    ],
    3: [
      q(
        'Si un enfant choisissait un jour une autre voie spirituelle que la vôtre, comment aimeriez-vous réagir ?',
        'projection',
        ['Avec confiance', 'Avec dialogue', 'Avec peine, mais présent(e)'],
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
      ),
      q(
        'Imaginez que vos deux façons de croire, ou de ne pas croire, vivent bien sous le même toit : à quoi le verriez-vous ?',
        'miracle',
        [
          'Des fêtes partagées',
          'Du respect au quotidien',
          'Des questions sans crainte',
        ],
      ),
      q(
        'Quel moment de calme ou de recueillement aimeriez-vous partager à deux chaque semaine ?',
        'scene',
        ['Une prière', 'Une marche', 'Un repas sans écran'],
      ),
      q(
        'Lors des grandes fêtes, comment aimeriez-vous honorer des traditions qui ne seraient pas les mêmes ?',
        'projection',
        ['En alternant', 'En mêlant les deux', 'En créant les nôtres'],
        ['M1_Q03'],
      ),
      q(
        "Si vos convictions restaient différentes sur un point, qu'est-ce qui vous aiderait à le vivre sans vous juger ?",
        'perpetuel',
        [
          'La curiosité',
          'Des limites claires',
          'Le respect des rites de chacun',
        ],
      ),
      q(
        'De 0 à 10, quelle place aimeriez-vous donner à la foi dans votre futur foyer, et pourquoi pas un point de plus ?',
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M1_Q06'],
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
        "Quand quelqu'un garde des contacts avec un ex, qu'est-ce qui vous permettrait d'être tranquille ?",
        'besoin',
        ['La transparence', 'Des limites claires', 'Le temps'],
        ['M3_Q05'],
      ),
      q(
        'Comment un proche décrirait-il ce dont vous avez besoin pour vous sentir en confiance dans une relation ?',
        'circulaire',
        ['De la constance', 'De la transparence', 'De la liberté'],
      ),
      q(
        "De 0 à 10, à quel point avez-vous besoin de transparence sur le téléphone de l'autre, et pourquoi pas un point de moins ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
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
        "Qu'avez-vous appris de vos relations passées sur votre façon d'aimer ?",
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
        "Qu'est-ce qui vous fait vous sentir vraiment désiré(e) dans une relation ?",
        'besoin',
        ['Les attentions', 'Les mots', 'Le temps pris pour moi'],
      ),
      q(
        "Qu'aimeriez-vous qu'on devine de vous, en tendresse, sans avoir à le demander ?",
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
        'De 0 à 10, à quel point avez-vous besoin de parler tout de suite après un désaccord, et pourquoi pas un point de moins ?',
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M6_Q01'],
      ),
      q(
        "Si l'autre consultait votre téléphone sans vous le dire, qu'est-ce que ce geste toucherait en vous ?",
        'emotion',
        ['Ma confiance', 'Mon intimité', 'Ma liberté'],
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
        "Pensez à un désaccord, en famille ou dans une relation passée, qui s'est bien terminé : qu'est-ce qui, selon vous, l'a rendu différent ?",
        'exception',
        ['Le ton', 'Le moment', "L'écoute"],
      ),
      q(
        'De 0 à 10, à quel point arrivez-vous à dire ce qui vous contrarie au moment où cela arrive, et pourquoi pas un point de moins ?',
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
        "En famille ou dans vos relations passées, qu'avez-vous appris à faire d'un désaccord qui revient toujours ?",
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
        "Qu'est-ce qui vous donne envie de vous engager maintenant, à ce moment de votre vie ?",
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
        "Quand quelqu'un répond qu'on verra en parlant d'avenir, qu'est-ce que cela réveille en vous ?",
        'emotion',
        ['De la patience', "De l'inquiétude", 'De la méfiance'],
        ['M8_Q02'],
      ),
      q(
        "Si l'autre voulait reprendre de longues études et gagner moins pendant des années, de quoi auriez-vous besoin pour le soutenir ?",
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
        "De 0 à 10, à quel point vous sentez-vous prêt(e) à vous engager dans l'année qui vient, et pourquoi pas un point de moins ?",
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
        "Qu'est-ce qui vous touche dans le couple qui vous inspire le plus autour de vous ?",
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
        "De 0 à 10, à quel point aimez-vous que l'avenir soit planifié, et pourquoi pas un point de moins ?",
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
        "On vous propose l'emploi de vos rêves à 500 km, et l'autre ne peut pas partir : qu'est-ce qui pèserait le plus dans votre décision ?",
        'scene',
        ['Le couple', 'Mon projet', 'La durée'],
        ['M0_Q03'],
      ),
      q(
        "Si vous partiez vivre dans le pays d'origine de l'autre, qu'est-ce qui vous manquerait le plus ?",
        'projection',
        ['Mes proches', 'Ma langue', 'Mes repères'],
        ['M7_Q07'],
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
        "De 0 à 10, à quel point êtes-vous prêt(e) à changer de ville pour quelqu'un, et pourquoi pas un point de moins ?",
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M0_Q03'],
      ),
      q(
        'Dans un logement partagé, quel espace ou quel moment à vous ne pourriez-vous pas céder ?',
        'limite',
        ['Un coin à moi', 'Un moment seul(e)', 'Mes affaires'],
        ['M4_Q13'],
      ),
      q(
        "Si un travail vous éloignait de l'autre plusieurs mois, qu'est-ce qui vous aiderait à garder le lien ?",
        'besoin',
        ['Des appels réguliers', 'Une date de retour', 'Des visites'],
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
        "Qu'est-ce que le pays de vos origines représente pour vous aujourd'hui ?",
        'origine',
        ['Mes racines', 'Un projet de retour', 'Un souvenir'],
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
        "Imaginez votre premier samedi dans un logement partagé : qu'est-ce qui est déjà à sa place pour que vous vous sentiez bien ?",
        'scene',
        ['Mes objets', 'Un coin à moi', 'Une table pour recevoir'],
        ['M4_Q13'],
      ),
      q(
        'Imaginez un endroit où vous vous sentiriez chez vous tous les deux : quel serait le premier détail qui vous le dirait ?',
        'miracle',
        ['La lumière', 'Le voisinage', 'Les objets des deux'],
      ),
      q(
        'Si vos familles vivaient dans deux pays différents, comment aimeriez-vous partager les fêtes et les vacances ?',
        'projection',
        ['En alternance', 'Moitié chez chacun', 'Nos propres voyages'],
      ),
      q(
        "Pour élever un enfant, qu'est-ce qu'un lieu de vie aurait à offrir avant tout à vos yeux ?",
        'sens',
        ['La sécurité', 'La famille proche', 'Des écoles'],
      ),
      q(
        'De 0 à 10, à quel point avez-vous besoin de vivre près de votre famille, et pourquoi pas un point de moins ?',
        'echelle',
        ['Note basse', 'Note moyenne', 'Note haute'],
        ['M5_Q07'],
      ),
      q(
        "Si l'un de vous rêvait d'ailleurs et l'autre d'ici, qu'est-ce qui vous aiderait à en parler sans vous braquer ?",
        'perpetuel',
        ['Du temps', 'Un projet daté', 'Un essai'],
        ['M7_Q07'],
      ),
      q(
        "Le jour où l'un de vous aurait le mal du pays, comment aimeriez-vous que l'autre réagisse ?",
        'reparation',
        ['Avec écoute', 'Avec un voyage', 'Avec patience'],
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
 * jour 2 : d'où elle vient ; jour 3 : comment elle se vivra à deux.
 */
export const TARGETED: Record<number, TopicTemplate[]> = {
  1: [
    tt(
      (w) =>
        `${w.cap} : qu'est-ce qui vous ferait sentir respecté(e), même si l'autre voit les choses autrement ?`,
      'besoin',
      [
        "Être écouté(e) jusqu'au bout",
        'Ne pas être jugé(e)',
        'Que ma limite compte',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, qu'est-ce que votre position protège de plus précieux pour vous ?`,
      'besoin',
      ['Ma sécurité', 'Ma liberté', 'Ma fidélité à mes valeurs'],
    ),
    tt(
      (w) =>
        `${w.cap} : de 0 à 10, à quel point ce sujet compte-t-il pour vous, et pourquoi pas un point de moins ?`,
      'echelle',
      ['Sujet ouvert', 'Sujet important', 'Sujet décisif'],
    ),
    tt(
      (w) =>
        `Comment un proche qui vous connaît bien expliquerait-il l'importance que vous accordez ${w.a} ?`,
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
        'Ce qui pourrait la faire évoluer',
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
    ),
    tt(
      (w) =>
        `${w.cap} : à quel moment une discussion sur ce sujet deviendrait-elle trop lourde pour vous ?`,
      'limite',
      [
        'Quand on me presse',
        'Quand on me juge',
        'Quand on y revient sans cesse',
      ],
    ),
  ],
  2: [
    tt(
      (w) =>
        `Quel moment de votre vie a façonné votre façon de voir ${w.phrase} ?`,
      'origine',
      [
        'Un exemple familial',
        'Une relation passée',
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
    ),
    tt(
      (w) =>
        `Comment un proche décrirait-il la façon dont vous défendez vos idées sur ${w.phrase} ?`,
      'circulaire',
      ['Avec calme', 'Avec passion', 'Avec réserve'],
    ),
  ],
  3: [
    tt(
      (w) =>
        `Un samedi ordinaire, dans trois ans, la question ${w.de} se pose : comment aimeriez-vous que la conversation se passe ?`,
      'scene',
      [
        'Tout de suite, calmement',
        'Après un temps de réflexion',
        'Avec une règle déjà posée',
      ],
      true,
    ),
    tt(
      (w) =>
        `Imaginez que, dans quelques années, la question ${w.de} soit devenue simple entre vous : quel en serait le premier petit signe ?`,
      'miracle',
      ['Le ton des échanges', 'Des décisions simples', "Plus d'humour"],
      true,
    ),
    tt(
      (w) =>
        `Si la question ${w.de} restait un désaccord durable, qu'est-ce qui vous aiderait à vivre avec, sans vous en vouloir ?`,
      'perpetuel',
      ['Des règles claires', "De l'humour", 'Du respect de chacun'],
      true,
    ),
    tt(
      (w) =>
        `Le jour où la question ${w.de} vous opposerait vraiment, quel geste de l'autre vous aiderait à revenir vers lui ou elle ?`,
      'reparation',
      ['Une excuse', 'Une écoute', 'Un geste tendre'],
      true,
    ),
    tt(
      (w) =>
        `Dans dix ans, qu'est-ce qui vous ferait dire que vous êtes resté(e) fidèle à vous-même à propos ${w.de} ?`,
      'projection',
      [
        "Je n'ai pas renoncé à l'essentiel",
        "J'ai su évoluer",
        "J'ai été honnête",
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
        `${w.cap} : dans un moment de tension, à quel signe sentez-vous, en vous, que la situation commence à vous échapper ?`,
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
        `${w.cap} : dans un moment de tension, que ressentez-vous à l'intérieur, que l'autre ne voit pas forcément ?`,
      'emotion',
      [
        'De la colère retenue',
        'De la peur de blesser',
        'Le besoin de me protéger',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, qui vous a appris, par l'exemple, la façon dont vous réagissez aujourd'hui ?`,
      'origine',
      ['Un parent', 'Une relation passée', 'Personne : je me suis protégé(e)'],
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
        `${w.cap} : le jour où une dispute s'installerait, qu'est-ce qui vous aiderait, vous, à faire le premier pas ?`,
      'reparation',
      [
        'Savoir que je serai accueilli(e)',
        'Un délai convenu',
        'Un mot de l’autre',
      ],
    ),
    tt(
      (w) =>
        `À propos ${w.de}, quelle règle simple aimeriez-vous poser dès le début pour vous protéger tous les deux ?`,
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
      "Si l'autre ne gagnait plus rien pendant longtemps, qu'est-ce qui, chez lui ou chez elle, vous aiderait à tenir ?",
      'besoin',
      ['Le voir chercher', "Qu'il ou elle m'en parle", 'Un plan clair'],
    ),
    2: q(
      "Dans votre famille, que disait-on de ceux qui traversent un manque d'argent ?",
      'origine',
      ['On les aidait', 'On les jugeait', "On n'en parlait pas"],
    ),
    3: q(
      "Imaginez une année sans salaire pour l'un de vous : quel filet de sécurité voudriez-vous avoir construit avant ?",
      'scene',
      ['Une épargne', 'Une règle claire', 'Le soutien des familles'],
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
      "Parmi vos affaires, laquelle est un peu une partie de vous, au point d'être difficile à prêter ?",
      'besoin',
      ['Un outil de travail', 'Un objet de famille', 'Mon téléphone'],
    ),
    2: q(
      'Dans votre famille, comment savait-on ce qui appartenait à chacun ?',
      'origine',
      ['Tout était à tous', 'On demandait avant', 'Chacun ses affaires'],
    ),
    3: q(
      "Quand vous vivrez avec quelqu'un, qu'est-ce qui restera à vous seul(e), même dans un logement partagé ?",
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
    1: q(
      "Au tout début d'une rencontre, à quoi savez-vous qu'il y a quelque chose à explorer ?",
      'sens',
      ['Un sentiment de calme', 'Une curiosité', 'Une évidence'],
    ),
    2: q(
      "Dans vos rencontres passées, qu'est-ce qui faisait naître l'attirance chez vous ?",
      'origine',
      ['Un regard', 'Une conversation', "Une façon d'être"],
    ),
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
      "De 0 à 10, à quel point avez-vous besoin de savoir où est l'autre pour être tranquille, et pourquoi pas un point de moins ?",
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
      "Pensez à une fois, en famille ou dans une relation passée, où un long silence a fini par se dénouer : qu'est-ce qui, selon vous, l'a dénoué ?",
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
      "Dans vos relations passées, qu'avez-vous appris sur le rythme auquel vous aimez entendre des mots tendres ?",
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
      "Dans vos relations passées, qu'avez-vous appris sur le bon moment pour dire ce que l'on attend ?",
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
      "Quand vous parlez de vos anciennes relations, qu'aimeriez-vous que l'on entende de vous ?",
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
      'Dans vos relations passées, quel signal avez-vous appris à prendre au sérieux ?',
      'exception',
      ['Un silence', 'Une promesse', 'Un mot de trop'],
    ),
  },
  M0_Q06: {
    1: q(
      "Quand vous imaginez votre vie dans quinze ans, quelle place y tient la présence ou l'absence d'enfants ?",
      'projection',
      [
        'Une place centrale',
        'Une place ouverte',
        'Une autre forme de transmission',
      ],
    ),
    2: q(
      "Quel moment de votre vie a rendu votre désir d'enfants, ou son absence, si clair pour vous ?",
      'origine',
      ['Mon enfance', 'Une rencontre', 'Une réflexion mûrie'],
    ),
    3: q(
      "Qu'est-ce qu'une vie avec des enfants, ou sans enfants, vous permettrait de vivre pleinement ?",
      'besoin',
      ['La transmission', 'La liberté', 'Une famille à aimer'],
    ),
  },
  M1_Q11: {
    1: q(
      "Pour vous, qu'est-ce qui rend une union juste pour chacun de ceux qui s'y engagent ?",
      'sens',
      ["L'exclusivité", 'Le consentement', 'La transparence'],
    ),
    2: q(
      'De qui ou de quoi tenez-vous votre position sur la polygamie ?',
      'origine',
      ['De ma foi', 'De ma famille', 'De ce que j’ai vu'],
    ),
  },
  M6_Q10: {
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
      "Dans dix ans, qu'est-ce qui, au quotidien, vous fera sentir que l'autre vous reste fidèle ?",
      'projection',
      ['La transparence', 'Les attentions', 'La parole tenue'],
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
      "Dans une semaine ordinaire de vie commune, qu'est-ce que votre pratique, ou votre absence de pratique, changerait à l'emploi du temps ?",
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
      "Imaginez une grande fête de famille où vos deux traditions se croisent : qu'est-ce qui compterait le plus pour vous ce jour-là ?",
      'scene',
      [
        'Le respect des rites',
        'La paix entre les familles',
        'La joie partagée',
      ],
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
      "Dans un logement partagé, qu'est-ce qui serait non négociable pour vous à propos du tabac ?",
      'limite',
      [
        'Pas de tabac à l’intérieur',
        'Pas devant les enfants',
        'Rien de particulier',
      ],
    ),
    2: q(
      "Qu'est-ce que le tabac évoque pour vous, au-delà de l'habitude ?",
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
      "Dans dix ans, dans quel genre d'endroit aimeriez-vous vous réveiller un matin ordinaire ?",
      'scene',
      ['En ville', 'Au calme', 'Près des miens'],
    ),
  },
  M0_Q03: {
    1: q(
      "Pour suivre quelqu'un dans une autre ville, de quoi auriez-vous besoin d'être sûr(e) avant de partir ?",
      'limite',
      ['Du projet commun', 'De mon travail', 'De mes repères'],
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
    ),
  },
  M5_Q01: {
    1: q(
      "Quelle décision de votre vie à deux ne regarderait que vous deux, quoi qu'en pense votre famille ?",
      'limite',
      ['Le lieu de vie', 'Les enfants', "L'argent"],
    ),
    2: q(
      'Dans votre famille, qui avait le dernier mot sur les grandes décisions ?',
      'origine',
      ['Un parent', 'Les aînés', 'Chacun pour soi'],
    ),
    3: q(
      "Imaginez qu'un parent ou un aîné vous donne un avis que vous ne partagez pas sur votre foyer : que faites-vous de cet avis ?",
      'scene',
      [
        "Je l'écoute, puis je décide",
        "J'en parle d'abord à deux",
        'Je le mets de côté',
      ],
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
      'Imaginez un dimanche ordinaire avec un parent qui vit chez vous depuis six mois : à quoi ressemble votre journée ?',
      'scene',
      ['Paisible', 'Chargée', 'Partagée'],
    ),
  },
  M3_Q05: {
    1: q(
      "Quelle place un ex peut-il garder dans la vie de quelqu'un, selon vous, sans vous inquiéter ?",
      'limite',
      ['Aucune', 'Celle des enfants', 'Une amitié claire'],
    ),
    2: q(
      "Qu'est-ce qu'une ancienne histoire peut garder, pour vous, dans une vie nouvelle ?",
      'sens',
      ['Rien', 'Un respect', 'Un lien pour les enfants'],
    ),
  },
  M8_Q01: {
    1: q(
      'À quoi reconnaîtrez-vous, au bout de quelques mois, que vous avancez dans la même direction ?',
      'projection',
      ['Des projets communs', 'Une date', 'Une présentation aux proches'],
    ),
    2: q(
      "Pour vous, à quoi reconnaît-on qu'une relation devient sérieuse ?",
      'sens',
      ['Aux proches rencontrés', 'Aux projets', 'À la régularité'],
    ),
    3: q(
      "Dans dix ans, qu'est-ce qui vous fera dire que vous avez bien fait de vous engager ?",
      'projection',
      ['Notre complicité', 'Notre famille', 'Ce que nous avons construit'],
    ),
  },
  M4_Q05: {
    1: q(
      'Quand un proche compte sur vous financièrement, quel sentiment domine en vous ?',
      'emotion',
      ['De la fierté', 'Du poids', 'Du devoir'],
    ),
    2: q(
      'Dans votre famille, que disait-on de celui ou celle qui aide les siens ?',
      'origine',
      ["On l'admirait", 'On comptait sur lui ou elle', "On n'en parlait pas"],
    ),
    3: q(
      "Imaginez un mois où un proche de l'un de vous demande une aide imprévue : comment aimeriez-vous que la décision se prenne ?",
      'scene',
      ['Ensemble', 'Par celui ou celle concerné(e)', 'Selon une règle fixée'],
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
      "Imaginez votre premier mois sous le même toit : comment voyez-vous l'argent de chacun circuler ?",
      'scene',
      ['Un pot commun', 'Selon les revenus', 'Chacun ses dépenses'],
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
      'Que viendrait dire la dot, ou le mahr, à vos deux familles ?',
      'sens',
      ['Le respect', "L'engagement", 'La tradition'],
    ),
  },
  M6_Q07: {
    3: q(
      "Le jour où vos envies d'intimité n'auraient pas le même rythme, comment aimeriez-vous qu'on en parle ?",
      'perpetuel',
      ['Avec douceur', 'Sans attendre', 'À un moment calme'],
    ),
  },
  M6_Q06: {
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
      "Quand vous pensez avoir raison, qu'est-ce qui vous coûte le plus dans le fait de faire un pas vers l'autre ?",
      'besoin',
      [
        "L'impression de céder",
        'La peur de ne pas être compris(e)',
        'La fierté',
      ],
    ),
    2: q(
      "Qui, autour de vous, vous a montré qu'on peut faire un pas vers l'autre sans perdre la face ?",
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
      'Quand vous gardez en tête ce que vous donnez, de quoi cherchez-vous à vous protéger ?',
      'besoin',
      [
        "D'être exploité(e)",
        'De donner plus que je ne reçois',
        "D'être déçu(e)",
      ],
    ),
    2: q(
      "Où avez-vous appris qu'il valait mieux garder un œil sur l'équilibre entre donner et recevoir ?",
      'origine',
      ['En famille', 'Dans une relation passée', 'Au travail'],
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
  M6_Q01: {
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
      'Quelle part de votre culture avez-vous reçue sans la choisir, et que vous êtes fier(ère) de porter ?',
      'origine',
      ['Une langue', 'Des fêtes', 'Des valeurs'],
    ),
    3: q(
      "Imaginez un enfant qui grandit entre vos deux histoires : qu'aimeriez-vous qu'il ait reçu de la vôtre à dix ans ?",
      'projection',
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
      'Dans quelques années, quel rythme de visites en famille vous laisserait à la fois proche des vôtres et libre ?',
      'projection',
      ['Chaque semaine', 'Chaque mois', 'Aux grandes occasions'],
    ),
  },
  M4_Q03: {
    1: q(
      "Pour vous, qu'est-ce qu'un homme apporte à un foyer, au-delà de son salaire ?",
      'sens',
      ['Sa présence', 'Sa protection', 'Son écoute'],
    ),
    2: q(
      "Dans la famille où vous avez grandi, comment vivait-on le fait que l'un ou l'autre gagne l'argent du foyer ?",
      'origine',
      ['Avec fierté', 'Avec tension', 'Sans en parler'],
    ),
  },
  M4_Q04: {
    1: q(
      "Pour vous, qu'est-ce qui permettrait à une femme de se sentir libre de ses choix entre travail et foyer ?",
      'besoin',
      [
        'Le soutien de son conjoint',
        'Un partage des tâches',
        'Le respect de ses choix',
      ],
    ),
    2: q(
      'Quelle femme de votre entourage a le plus façonné votre regard sur le travail et le foyer ?',
      'origine',
      ['Ma mère', 'Une grand-mère', 'Une amie'],
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
  M1_Q09: {
    2: q(
      'Que représente pour vous un repas partagé quand on ne mange pas les mêmes choses ?',
      'sens',
      ['Du respect', 'Une gêne', 'Une richesse'],
    ),
    3: q(
      'Dans une cuisine commune, quelle règle simple vous permettrait de respecter les convictions de chacun ?',
      'limite',
      [
        'Des ustensiles séparés',
        'Des repas adaptés',
        'En parler à chaque fête',
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
      "Pour vous, qu'est-ce qu'un mariage engage, que l'amour seul n'engage pas ?",
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
      "Les semaines où vous aurez moins de temps ensemble qu'espéré, qu'est-ce qui vous fera sentir que vous comptez quand même ?",
      'besoin',
      ['Un message', 'Un rituel', 'Un moment protégé'],
    ),
  },
  M7_Q01: {
    2: q(
      'Quelle image de la vie réussie vous a-t-on transmise en grandissant ?',
      'origine',
      ['Une famille unie', 'Une belle carrière', 'Une vie libre'],
    ),
    3: q(
      "Si vos rêves de vie ne prenaient pas le même chemin, qu'est-ce qui vous aiderait à en garder une part chacun ?",
      'perpetuel',
      ['Des projets à soi', 'Des étapes', 'Du dialogue'],
    ),
  },
  M4_Q06: {
    3: q(
      "Qu'est-ce que le fait d'être propriétaire, ou non, change à votre sentiment de sécurité ?",
      'besoin',
      ['Beaucoup', 'Un peu', 'Rien'],
    ),
  },
  M8_Q02: {
    1: q(
      "Qu'est-ce qui, dans votre vie actuelle, fixe le rythme que vous souhaitez avant un engagement ?",
      'besoin',
      ['Mon âge', 'Mon travail', 'Ma famille'],
    ),
    3: q(
      "Si vos rythmes d'engagement différaient, quel premier signe vous montrerait que vous avancez quand même ensemble ?",
      'projection',
      ['Des projets', 'Les proches rencontrés', 'Une date posée'],
    ),
  },
  M5_Q04: {
    1: q(
      "Si l'autre avait une amitié proche avec un homme ou une femme, qu'est-ce qui vous permettrait d'être serein(e) ?",
      'besoin',
      ['La transparence', 'La rencontrer', 'Des limites claires'],
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
  M4_Q08: {
    2: q(
      "Dans votre famille, à quoi servait l'argent mis de côté ?",
      'origine',
      ['Aux imprévus', 'Aux projets', 'À aider les proches'],
    ),
    3: q(
      "Imaginez un premier projet que vous financeriez ensemble : qu'est-ce qui le rendrait juste pour chacun ?",
      'scene',
      [
        'Une part égale',
        'Une part selon les moyens',
        'Un projet choisi à deux',
      ],
    ),
  },
  M7_Q05: {
    2: q(
      "Quel changement, dans votre vie, vous a le plus appris sur votre façon de vivre l'imprévu ?",
      'origine',
      ['Un déménagement', 'Un nouveau travail', 'Une séparation'],
    ),
  },
  M7_Q02: {
    2: q(
      "Qu'est-ce que la réussite professionnelle voulait dire pour ceux qui vous ont élevé(e) ?",
      'origine',
      ['La sécurité', 'La fierté', 'Le sacrifice'],
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
};

/** Formulation propre au sujet pour ce jour, s'il en existe une. */
export function topicDeep(
  d: TopicSource,
  day: number,
): PoolTemplate | undefined {
  return (TOPIC_DEEP[topicKey(d)] ?? TOPIC_DEEP[d.questionId])?.[day];
}

// ─── Accords réels : « même mot, même sens ? » ───────────────────────────────

/**
 * Accord réel (même réponse des deux côtés) : une phrase qui nomme l'accord
 * sans citer la réponse, et, quand elle existe, une question qui vérifie que
 * les mêmes mots veulent dire la même chose pour les deux. Une phrase vide :
 * la même réponse est un risque partagé, la question parle alors de soi, seule.
 * Clé : « question:clé de réponse », ou la question seule pour toute réponse.
 */
export const AGREEMENTS: Record<
  string,
  { statement: string; probe?: PoolTemplate }
> = {
  'M1_Q06:A': {
    statement: 'Partager la même foi compte pour vous deux.',
    probe: q(
      'Concrètement, à quoi verrait-on, dans une semaine ordinaire, que vous partagez la même foi ?',
      'sens',
      ['Des prières', 'Des repas', 'Des fêtes'],
    ),
  },
  'M1_Q06:D': {
    statement: "Pour vous deux, la foi relève de l'intime.",
    probe: q(
      "Qu'aimeriez-vous malgré tout que l'autre sache de votre rapport aux convictions ?",
      'sens',
      ['Mes fêtes', 'Mes doutes', 'Mes valeurs'],
    ),
  },
  'M6_Q10:A': {
    statement: 'La fidélité est absolue pour vous deux.',
    probe: q(
      'Où commence, pour vous, le tout premier pas de travers ?',
      'sens',
      ['Un regard', 'Un message', 'Un secret'],
    ),
  },
  'M8_Q01:A': {
    statement: 'Vous visez tous les deux le mariage.',
    probe: q(
      "Qu'est-ce qui, pour vous, changerait le lendemain du mariage par rapport à la veille ?",
      'sens',
      ['Rien', 'Un engagement devant les miens', 'Une vie commune'],
    ),
  },
  'M8_Q01:B': {
    statement: 'Vous voulez tous les deux une relation sérieuse.',
    probe: q(
      "Qu'est-ce qui, pour vous, fait passer une rencontre agréable au rang de relation sérieuse ?",
      'sens',
      ['Un projet', 'Une parole donnée', 'Les proches'],
    ),
  },
  'M8_Q06:A': {
    statement: 'Vous aimez tous les deux vous parler de tout.',
    probe: q(
      "Qu'est-ce qui, pour vous, reste malgré tout de l'ordre du jardin secret ?",
      'sens',
      ['Mon passé', 'Mes doutes', 'Mes proches'],
    ),
  },
  'M8_Q06:B': {
    statement: "Vous voulez tous les deux parler en profondeur de l'essentiel.",
    probe: q("Qu'est-ce qui fait partie de l'essentiel, pour vous ?", 'sens', [
      'Les projets',
      'Les émotions',
      'Les valeurs',
    ]),
  },
  'M2_Q07:A': {
    statement: 'Aucun de vous deux ne laisse traîner une dispute.',
    probe: q(
      "Pour vous, à quoi reconnaît-on qu'une dispute est vraiment terminée ?",
      'sens',
      ['Une excuse', 'Un geste', 'Le retour du rire'],
    ),
  },
  'M2_Q08:A': {
    statement: "Pour vous deux, l'harmonie passe avant l'ego.",
    probe: q(
      "Qu'est-ce que vous ne lâcheriez pas, même pour garder la paix ?",
      'limite',
      ['Une valeur', 'Une limite', 'La vérité'],
    ),
  },
  'M5_Q01:D': {
    statement:
      'Pour vous deux, les décisions du foyer ne regardent que le couple.',
    probe: q(
      "Quand un parent donne malgré tout son avis, qu'en faites-vous ?",
      'sens',
      ["Je l'écoute", "J'en parle à deux", 'Je le laisse de côté'],
    ),
  },
  'M5_Q01:B': {
    statement:
      'Pour vous deux, la famille compte, mais la décision finale vous revient.',
    probe: q(
      "Sur quel sujet l'avis d'un parent pèserait-il le plus ?",
      'sens',
      ['Le mariage', 'Les enfants', 'Le lieu de vie'],
    ),
  },
  'M0_Q06:A': {
    statement: 'Vous souhaitez tous les deux des enfants.',
    probe: q(
      "Qu'aimeriez-vous avoir construit dans votre vie avant l'arrivée d'un premier enfant ?",
      'sens',
      ['Un foyer', 'Une stabilité', 'Une complicité à deux'],
    ),
  },
  'M0_Q06:D': {
    statement: "Aucun de vous deux ne souhaite d'enfants.",
    probe: q(
      "Qu'est-ce que ce choix vous permet d'imaginer pour votre vie ?",
      'sens',
      ['Des voyages', 'Un engagement', 'Une liberté'],
    ),
  },
  'M1_Q13:A': {
    statement:
      'Vous voulez tous les deux transmettre langue, traditions et religion.',
    probe: q(
      "Qu'est-ce qui, de votre propre enfance, vous semble le plus précieux à transmettre ?",
      'origine',
      ['Une langue', 'Une fête', 'Une foi'],
    ),
  },
  'M1_Q13:B': {
    statement: 'Pour vous deux, des enfants grandiraient entre deux cultures.',
    probe: q(
      'Quelle fête de votre enfance tiendriez-vous à leur faire vivre ?',
      'origine',
      ['Une fête religieuse', 'Une fête familiale', 'Une fête du pays'],
    ),
  },
  'M4_Q07:A': {
    statement: 'La dot ou le mahr compte pour vous deux.',
    probe: q(
      "Qu'est-ce qui, pour vous, en fait davantage qu'une formalité ?",
      'sens',
      ['Le respect', 'La parole donnée', 'Le lien entre familles'],
    ),
  },
  'M8_Q03:A': {
    statement: 'Le mariage est pour vous deux un acte religieux.',
    probe: q(
      "Qu'est-ce qu'il engage, pour vous, qu'un mariage civil n'engage pas ?",
      'sens',
      ['Une promesse devant Dieu', 'Une communauté', 'Une durée'],
    ),
  },
  'M8_Q03:C': {
    statement: 'Vous voulez tous les deux un mariage civil et religieux.',
    probe: q(
      "Qu'est-ce que chacune des deux cérémonies engage pour vous ?",
      'sens',
      ['La loi', 'La foi', 'Les familles'],
    ),
  },
  'M4_Q11:A': {
    statement:
      "Vous soutiendriez tous les deux l'autre sans compter si l'argent manquait.",
    probe: q("Au bout d'un an, à quoi ressemblerait ce soutien ?", 'sens', [
      'Le même',
      'Plus organisé',
      'Plus difficile',
    ]),
  },
  'M4_Q11:B': {
    statement:
      "Vous traverseriez tous les deux un manque d'argent avec un plan.",
  },
  'M4_Q01:A': {
    statement: "Vous voyez tous les deux l'argent du foyer en pot commun.",
    probe: q(
      'Pour vous, quelle dépense resterait personnelle, même avec un pot commun ?',
      'sens',
      ['Un cadeau', 'Un loisir', "L'aide aux miens"],
    ),
  },
  'M4_Q01:C': {
    statement:
      'Vous voyez tous les deux des dépenses séparées et des charges partagées.',
    probe: q("Pour vous, où s'arrête une charge commune ?", 'sens', [
      'Au loyer',
      'Aux courses',
      'Aux sorties',
    ]),
  },
  'M4_Q10:A': {
    statement:
      "Pour vous deux, l'homme règle l'addition du premier rendez-vous.",
    probe: q(
      "Que veut dire ce geste pour vous, au-delà de l'argent ?",
      'sens',
      ['Le respect', "L'engagement", 'La tradition'],
    ),
  },
  'M4_Q10:C': {
    statement: "Vous partagez tous les deux l'addition, moitié-moitié.",
    probe: q(
      "Si l'autre insistait un soir pour tout payer, qu'est-ce que cela réveillerait en vous ?",
      'emotion',
      ['De la gêne', 'De la gratitude', 'Le sentiment d’être redevable'],
    ),
  },
  'M4_Q13:A': {
    statement: "Pour vous deux, ce qui est à l'un est à l'autre.",
    probe: q("Qu'est-ce qui, malgré tout, resterait à vous seul(e) ?", 'sens', [
      'Un objet',
      'Un espace',
      'Un moment',
    ]),
  },
  'M0_Q03:A': {
    statement: 'Vous êtes tous les deux prêts à déménager pour le couple.',
    probe: q(
      "Le premier dimanche dans une nouvelle ville, qu'est-ce qui vous manquerait le plus ?",
      'scene',
      ['Mes proches', 'Mes habitudes', 'Mon quartier'],
    ),
  },
  'M0_Q03:D': {
    statement: 'Vous tenez tous les deux à rester là où vous vivez.',
    probe: q(
      "Si vos deux vies étaient loin l'une de l'autre, qu'est-ce qui pourrait vous faire bouger ?",
      'limite',
      ['Un projet commun', 'Un travail', 'Rien'],
    ),
  },
  'M7_Q07:A': {
    statement: 'Vous vous voyez tous les deux rester dans votre ville.',
    probe: q(
      "Qu'est-ce que cette ville vous donne qu'aucune autre ne vous donnerait ?",
      'besoin',
      ['Mes proches', 'Mon travail', 'Mon histoire'],
    ),
  },
  'M7_Q07:C': {
    statement: "Vous envisagez tous les deux une vie à l'étranger.",
    probe: q(
      "Qu'est-ce que ce départ viendrait chercher, pour vous ?",
      'besoin',
      ["De l'aventure", 'Des opportunités', 'Un retour aux sources'],
    ),
  },
  'M2_Q03:A': {
    statement: 'Vous avez tous les deux besoin de vous sentir en sécurité.',
    probe: q(
      'Quel petit geste, dans une journée ordinaire, vous donne ce sentiment ?',
      'sens',
      ['Un message', 'Une parole', 'Une présence'],
    ),
  },
  'M2_Q03:C': {
    statement:
      'Vous cherchez tous les deux un équilibre entre intimité et liberté.',
    probe: q(
      'Où passe la frontière, pour vous, dans une semaine ordinaire ?',
      'sens',
      ['Des soirées à moi', 'Des amis à moi', 'Un projet à moi'],
    ),
  },
  'M6_Q01:B': {
    statement: 'Vous prenez tous les deux du recul avant de revenir calmes.',
    probe: q(
      "Combien de temps dure, selon vous, un recul qui reste rassurant pour l'autre ?",
      'sens',
      ['Quelques minutes', 'Quelques heures', 'Une nuit'],
    ),
  },
  'M9_Q03:A': {
    statement: 'Vous dites tous les deux donner sans compter.',
    probe: q(
      "À quoi sentiriez-vous, malgré tout, que l'équilibre n'y est plus ?",
      'sens',
      ['La fatigue', 'Le manque de merci', "L'agacement"],
    ),
  },
  'M1_Q09:A': {
    statement: 'Vous respectez tous les deux des interdits alimentaires.',
    probe: q(
      "Dans une cuisine partagée, qu'est-ce qui ne pourrait jamais se mélanger, pour vous ?",
      'sens',
      ['Certains aliments', 'Certains ustensiles', 'Rien'],
    ),
  },
  'M1_Q11:A': {
    statement: 'Pour vous deux, une union se vit à deux, sans exception.',
    probe: q(
      "Qu'est-ce que cette exclusivité protège de plus précieux pour vous ?",
      'besoin',
      ['La confiance', 'La dignité', 'La paix'],
    ),
  },
  'M8_Q11:A': {
    statement: "Pour vous deux, on s'engage pour le meilleur et pour le pire.",
  },
  'M2_Q06:A': {
    statement: 'Vous dites tous les deux votre colère clairement.',
    probe: q(
      "Pour vous, où passe la frontière entre dire sa colère et la faire porter à l'autre ?",
      'sens',
      ['Le ton', 'Les mots choisis', 'Le moment'],
    ),
  },
  'M2_Q06:B': {
    statement:
      "Vous prenez tous les deux du recul avant de parler d'une colère.",
    probe: q(
      "Pendant ce recul, qu'aimeriez-vous que l'autre sache de ce qui se passe en vous ?",
      'besoin',
      ['Que je reviendrai', 'Que je réfléchis', 'Que je tiens à lui ou à elle'],
    ),
  },
  'M6_Q01:A': {
    statement: "Vous parlez tous les deux, même quand c'est difficile.",
    probe: q(
      "Pour vous, qu'est-ce qui distingue une parole franche d'une parole qui blesse ?",
      'sens',
      ['Le ton', 'Le moment', "L'intention"],
    ),
  },
  'M2_Q07:B': {
    statement:
      "Vous avez tous les deux besoin d'une journée pour digérer une dispute.",
    probe: q(
      "Pendant cette journée, qu'aimeriez-vous que l'autre fasse, ou ne fasse pas ?",
      'besoin',
      ['Me laisser du temps', 'Un petit signe', 'Ne pas insister'],
    ),
  },
  'M2_Q08:B': {
    statement: 'Vous vous excusez tous les deux quand vous voyez votre erreur.',
    probe: q(
      "Pour vous, qu'est-ce qui fait qu'une excuse compte vraiment ?",
      'sens',
      ['Les mots', 'Les actes qui suivent', 'Le moment'],
    ),
  },
  'M9_Q04:A': {
    statement: 'Vous dites tous les deux une frustration dès que possible.',
    probe: q(
      'Concrètement, combien de temps une frustration peut-elle attendre avant d’être dite, pour vous ?',
      'sens',
      ['Quelques minutes', 'Le soir même', 'Un jour ou deux'],
    ),
  },
  'M9_Q04:B': {
    statement:
      'Vous attendez tous les deux le bon moment pour dire une frustration.',
    probe: q(
      'À quoi reconnaissez-vous, vous, que le bon moment est venu ?',
      'sens',
      ['Le calme', 'Un moment seul à deux', "L'humeur de l'autre"],
    ),
  },
  'M6_Q03:A': {
    statement: 'Pour vous deux, trouver une solution compte plus que gagner.',
    probe: q(
      "Pendant un désaccord, à quoi l'autre verrait-il que vous cherchez une solution ?",
      'sens',
      ['Mes questions', 'Mon écoute', 'Mes propositions'],
    ),
  },
  'M6_Q11:A': {
    statement:
      'Pour vous deux, une réconciliation passe par en reparler et se demander pardon.',
    probe: q("Pour vous, qu'est-ce qui rend un pardon sincère ?", 'sens', [
      'Les mots',
      'Le regard',
      'Les actes',
    ]),
  },
  'M6_Q11:B': {
    statement:
      "Pour vous deux, un geste tendre vaut mieux qu'une longue discussion.",
    probe: q(
      "Quel geste, pour vous, signifie vraiment qu'une dispute est derrière vous ?",
      'sens',
      ['Un câlin', 'Un repas partagé', 'Un sourire'],
    ),
  },
  'M6_Q11:C': {
    statement: 'Pour vous deux, chacun prend du recul, puis on tourne la page.',
    probe: q(
      "Pour vous, qu'est-ce qui reste à dire avant de tourner la page ?",
      'sens',
      ['Une excuse', 'Ce qui a blessé', 'Rien'],
    ),
  },
  // Deux attentes du premier pas : sans phrase d'accord, la question parle de soi.
  'M6_Q11:D': {
    statement: '',
    probe: q(
      "Après une dispute, qu'est-ce qui vous aiderait, vous, à faire le premier pas, même quand vous attendez celui de l'autre ?",
      'reparation',
      [
        'Un délai convenu',
        'Un signe de l’autre',
        'Savoir que je serai accueilli(e)',
      ],
    ),
  },
  'M2_Q01:A': {
    statement:
      'Quand un message reste sans réponse, vous patientez tous les deux sereinement.',
    probe: q(
      "Pour vous, après combien de temps un silence cesse-t-il d'être anodin ?",
      'sens',
      ['Quelques heures', 'Une journée', 'Plusieurs jours'],
    ),
  },
  'M2_Q02:B': {
    statement: "Vous expliquez tous les deux calmement votre besoin d'espace.",
    probe: q(
      "Quand vous expliquez ce besoin, qu'aimeriez-vous que l'autre entende ?",
      'besoin',
      [
        "Que ce n'est pas un rejet",
        "Que j'en ai besoin pour revenir",
        'Que cela ne dure pas',
      ],
    ),
  },
  'M9_Q02:B': {
    statement:
      "Pour vous deux, l'amour se construit, et l'effort en est une preuve.",
    probe: q(
      "Quel effort, pour vous, compte vraiment comme une preuve d'amour ?",
      'sens',
      ['Du temps donné', 'Une habitude changée', 'Une attention répétée'],
    ),
  },
  'M9_Q06:B': {
    statement: "Pour vous deux, un sacrifice se fait s'il est réciproque.",
    probe: q(
      "Pour vous, à quoi voit-on qu'un sacrifice est réciproque ?",
      'sens',
      ['Au temps', 'À la reconnaissance', 'Aux actes'],
    ),
  },
  'M9_Q06:C': {
    statement: 'Pour vous deux, les petits sacrifices oui, les grands non.',
    probe: q(
      'Où passe, pour vous, la frontière entre un petit et un grand sacrifice ?',
      'sens',
      ['Le travail', 'Le lieu de vie', 'Les proches'],
    ),
  },
  'M9_Q01:A': {
    statement:
      'Vous voulez tous les deux décider ensemble des choses importantes.',
    probe: q(
      "Pour vous, qu'est-ce qui fait partie des décisions importantes ?",
      'sens',
      ["L'argent", 'Le lieu de vie', 'Les enfants'],
    ),
  },
  'M9_Q01:D': {
    statement: 'Pour vous deux, chacun peut avoir ses domaines de décision.',
    probe: q(
      "Quel domaine de décision laisseriez-vous volontiers à l'autre ?",
      'sens',
      ['La maison', 'Les sorties', 'Les finances'],
    ),
  },
  'M8_Q09:A': {
    statement: "Vous abordez tous les deux tôt un désaccord sur l'avenir.",
    probe: q(
      "Pour vous, à quel moment d'une rencontre est-il temps d'aborder un point clé ?",
      'sens',
      [
        'Dès les premiers échanges',
        'Après quelques rendez-vous',
        'Avant tout engagement',
      ],
    ),
  },
  'M8_Q02:A': {
    statement: "Vous envisagez tous les deux un engagement dans l'année.",
    probe: q(
      "Qu'aimeriez-vous avoir découvert de l'autre avant cette échéance ?",
      'besoin',
      ['Sa famille', 'Sa façon de traverser un désaccord', 'Ses projets'],
    ),
  },
  'M8_Q02:D': {
    statement:
      "Pour vous deux, l'engagement viendra quand les conditions seront mûres.",
    probe: q(
      'Pour vous, quelles conditions rendraient le moment mûr, très concrètement ?',
      'sens',
      ['Une stabilité', 'Une vraie confiance', "L'accord des familles"],
    ),
  },
  'M7_Q01:A': {
    statement: "Vous rêvez tous les deux d'une vie stable et établie.",
    probe: q(
      'Pour vous, à quoi ressemble la stabilité dans une semaine ordinaire ?',
      'sens',
      ['Des horaires', 'Un foyer', 'Des rituels'],
    ),
  },
  'M7_Q08:B': {
    statement:
      'Vous imaginez tous les deux les soirées et les week-ends ensemble, avec des moments à soi.',
    probe: q(
      'Pour vous, à quoi ressemble un moment à soi, très concrètement ?',
      'sens',
      ['Une soirée seul(e)', 'Une activité', 'Des amis'],
    ),
  },
  'M9_Q07:A': {
    statement: 'Pour vous deux, la tendresse au quotidien est essentielle.',
    probe: q('Pour vous, à quoi reconnaît-on une tendresse sincère ?', 'sens', [
      'À la régularité',
      'Au moment choisi',
      'À la douceur',
    ]),
  },
  'M0_Q08:A': {
    statement:
      "Pour vous deux, le tabac, l'alcool ou d'autres substances n'ont pas leur place chez l'autre.",
    probe: q(
      "Qu'est-ce qu'un verre ou une cigarette chez l'autre viendrait abîmer, pour vous ?",
      'besoin',
      ['Ma sérénité', 'Le foyer', 'Mes valeurs'],
    ),
  },
  'M0_Q08:B': {
    statement:
      'Pour vous deux, tabac et alcool restent acceptables avec modération.',
    probe: q("Pour vous, où commence l'excès, très concrètement ?", 'sens', [
      'Au quotidien',
      'En soirée',
      'Devant les proches',
    ]),
  },
  'M6_Q10:B': {
    statement:
      'Pour vous deux, la fidélité compte, et une réconciliation reste possible.',
    probe: q(
      "Pour vous, qu'est-ce qui rendrait une réconciliation encore possible après un écart ?",
      'sens',
      ['La vérité dite', 'Le temps', 'Un engagement renouvelé'],
    ),
  },
  'M0_Q06:B': {
    statement:
      'Vous souhaitez tous les deux des enfants, si les conditions sont réunies.',
    probe: q(
      'Très concrètement, quelles conditions vous sembleraient réunies pour accueillir un enfant ?',
      'sens',
      ['Un foyer stable', 'Une sécurité financière', 'Un couple solide'],
    ),
  },
  'M0_Q06:C': {
    statement: "Vous hésitez tous les deux sur le désir d'enfants.",
    probe: q(
      "Qu'est-ce qui pourrait, avec le temps, vous aider à y voir plus clair ?",
      'besoin',
      ['Le temps', 'Une rencontre', 'Une conversation sincère'],
    ),
  },
  'M4_Q05:A': {
    statement: 'Pour vous deux, aider sa famille fait partie du quotidien.',
    probe: q(
      "Pour vous, à quel moment une aide à la famille cesse-t-elle d'être ordinaire ?",
      'sens',
      ['Un montant', 'Une urgence', 'Une fréquence'],
    ),
  },
  'M4_Q05:B': {
    statement:
      "Pour vous deux, un envoi d'argent à la famille se décide d'abord à deux.",
    probe: q(
      "Pour vous, à quel moment un envoi mérite-t-il d'en parler d'abord à deux ?",
      'sens',
      ['Dès le premier euro', 'Au-delà d’un montant', 'S’il devient régulier'],
    ),
  },
  'M4_Q05:D': {
    statement:
      "Pour vous deux, l'aide à la famille a ses limites, pour préserver le foyer.",
    probe: q('Où placeriez-vous cette limite, très concrètement ?', 'limite', [
      'Un montant',
      'Une fréquence',
      'Une décision à deux',
    ]),
  },
  'M4_Q01:B': {
    statement:
      'Vous voyez tous les deux une contribution selon les revenus de chacun.',
    probe: q(
      "Pour vous, qu'est-ce qui entre dans le calcul, au-delà du salaire ?",
      'sens',
      ['Le temps donné au foyer', 'Les dettes', 'Les enfants'],
    ),
  },
  'M4_Q01:D': {
    statement: "Pour vous deux, l'argent reste une affaire individuelle.",
    probe: q("Qu'est-ce qui, pour vous, se partagerait malgré tout ?", 'sens', [
      'Le loyer',
      'Les projets',
      'Les imprévus',
    ]),
  },
  'M3_Q04:A': {
    statement: "Pour vous deux, l'enfant de l'un devient l'enfant de l'autre.",
    probe: q(
      "Le jour où une règle serait à poser à cet enfant, qu'est-ce que cela voudrait dire concrètement pour vous ?",
      'sens',
      [
        'Décider ensemble',
        'Laisser le parent trancher',
        'Poser la règle moi-même',
      ],
    ),
  },
  'M3_Q04:B': {
    statement:
      'Pour vous deux, les rôles parentaux restent définis dans une famille recomposée.',
    probe: q(
      "Pour vous, qu'est-ce qui reviendrait toujours au parent, même avec le temps ?",
      'sens',
      ['Les règles', "L'autorité", 'Les grandes décisions'],
    ),
  },
  'M3_Q04:D': {
    statement:
      'Pour vous deux, une famille recomposée se construit avec le temps.',
    probe: q(
      'À quoi verriez-vous, au bout d’un an, que la confiance s’installe ?',
      'sens',
      ['Des confidences', 'Des rires', 'Des moments demandés'],
    ),
  },
  'M5_Q03:A': {
    statement:
      'Vous accepteriez tous les deux une cohabitation temporaire, avec des règles claires.',
    probe: q(
      'Pour vous, combien de temps peut durer une cohabitation temporaire ?',
      'sens',
      ['Quelques semaines', 'Quelques mois', 'Le temps nécessaire'],
    ),
  },
  'M5_Q03:B': {
    statement: 'Pour vous deux, le foyer appartient au couple.',
    probe: q(
      "Quand un parent aurait besoin d'aide, quelle forme de soutien resterait possible pour vous ?",
      'sens',
      ['Une aide de loin', 'Des visites', 'Un soutien financier'],
    ),
  },
  'M5_Q03:C': {
    statement:
      'Pour vous deux, vivre avec un parent est attendu dans votre culture.',
    probe: q(
      "Qu'est-ce qui, pour vous, rend une cohabitation heureuse pour tout le monde ?",
      'sens',
      ['Des règles claires', 'Un espace à soi', 'Du respect'],
    ),
  },
  'M5_Q01:A': {
    statement:
      "Pour vous deux, aucune décision ne se prend sans l'avis de la famille.",
    probe: q(
      'Concrètement, quelles décisions passeraient par la famille ?',
      'sens',
      ['Le mariage', 'Le lieu de vie', 'Les enfants'],
    ),
  },
  'M5_Q01:C': {
    statement:
      'Vous consultez tous les deux votre famille par respect, sans obligation.',
    probe: q(
      'Pour vous, où s’arrête un conseil et où commence une pression ?',
      'sens',
      ['Au ton', "À l'insistance", 'Aux conséquences'],
    ),
  },
  'M1_Q06:B': {
    statement:
      "Vous attendez tous les deux que l'autre respecte vos pratiques.",
    probe: q(
      "Pour vous, à quoi se voit le respect d'une pratique que l'on ne partage pas ?",
      'sens',
      ['Aux horaires', 'Aux repas', 'Aux paroles'],
    ),
  },
  'M1_Q06:C': {
    statement: "Vous êtes tous les deux ouverts à d'autres croyances.",
    probe: q(
      "Pour vous, jusqu'où va cette ouverture dans un foyer commun ?",
      'limite',
      ['Les fêtes', "L'éducation des enfants", 'Les pratiques'],
    ),
  },
  'M0_Q03:B': {
    statement:
      'Vous déménageriez tous les deux pour le couple, si le projet de vie est solide.',
    probe: q(
      'Pour vous, à quoi reconnaît-on un projet de vie assez solide pour partir ?',
      'sens',
      ['Un engagement', 'Un travail', 'Une date'],
    ),
  },
  'M0_Q03:C': {
    statement:
      'Pour vous deux, un déménagement pour le couple dépend de la distance.',
    probe: q(
      'À partir de quelle distance un départ deviendrait-il un vrai renoncement pour vous ?',
      'sens',
      ['Une autre ville', 'Une autre région', 'Un autre pays'],
    ),
  },
  'M7_Q07:D': {
    statement: 'Vous êtes tous les deux ouverts sur le lieu de vie.',
    probe: q(
      'Pour vous, quel lieu resterait malgré tout impossible à imaginer ?',
      'limite',
      ['Trop loin des miens', 'Une grande ville', 'Un autre pays'],
    ),
  },
  'M4_Q08:A': {
    statement:
      'Vous voulez tous les deux épargner ensemble pour des projets communs.',
    probe: q(
      'Quel premier projet commun mériterait, pour vous, cette épargne ?',
      'sens',
      ['Un logement', 'Un mariage', 'Un voyage'],
    ),
  },
  'M4_Q08:C': {
    statement:
      'Vous voyez tous les deux une épargne commune et une épargne personnelle.',
    probe: q(
      "Pour vous, à quoi servirait l'épargne personnelle, très concrètement ?",
      'sens',
      ['Mes proches', 'Ma sécurité', 'Mes projets'],
    ),
  },
  'M8_Q03:B': {
    statement:
      'Pour vous deux, le mariage est un engagement civil et symbolique.',
    probe: q(
      "Qu'est-ce que ce symbole viendrait dire, pour vous, devant vos proches ?",
      'sens',
      ['Un engagement', 'Une famille', 'Une fierté'],
    ),
  },
  'M8_Q03:D': {
    statement: "Pour vous deux, le mariage est un choix, l'amour passe avant.",
    probe: q(
      "Qu'est-ce qui, pour vous, montrerait un engagement sans passer par le mariage ?",
      'sens',
      ['Un logement commun', 'Des enfants', 'Une parole donnée'],
    ),
  },
  'M1_Q13:C': {
    statement:
      'Pour vous deux, des enfants choisiraient eux-mêmes leur culture en grandissant.',
    probe: q(
      "Qu'aimeriez-vous malgré tout leur avoir fait connaître avant qu'ils choisissent ?",
      'sens',
      ['Une langue', 'Des fêtes', 'Des histoires de famille'],
    ),
  },
  'M4_Q06:B': {
    statement:
      'Vous voyez tous les deux un achat immobilier comme un projet commun.',
    probe: q(
      "Pour vous, qu'est-ce qu'acheter à deux viendrait dire de votre engagement ?",
      'sens',
      ['Une sécurité', 'Un ancrage', 'Un avenir'],
    ),
  },
  M8_Q04: {
    statement: 'Vous avez la même façon préférée de montrer votre amour.',
    probe: q("Comment saurez-vous que l'autre la reçoit vraiment ?", 'sens', [
      'À ses mots',
      'À ses gestes',
      'À son sourire',
    ]),
  },
};

/** Questions d'accord par jour, ajoutées après la phrase qui nomme l'accord. */
export const CONVERGENT: Record<number, PoolTemplate[]> = {
  1: [
    q(
      "Qu'est-ce qui, malgré tout, pourrait vous faire changer d'avis ?",
      'limite',
      ['Rien', 'Un événement de vie', 'Une discussion sincère'],
    ),
    q(
      "Qu'est-ce que cette position vous interdirait de faire, très concrètement ?",
      'sens',
      ['Un choix de vie', 'Une habitude', 'Rien de précis'],
    ),
    q(
      'Jusqu’où cette position tient-elle quand la vie se complique ?',
      'limite',
      ['Toujours', 'Presque toujours', 'Elle peut évoluer'],
    ),
  ],
  2: [
    q('De qui tenez-vous cette façon de voir ?', 'origine', [
      'De ma famille',
      'De ma foi',
      'De mon expérience',
    ]),
    q(
      "À quoi un proche verrait-il, dans votre quotidien, que c'est vrai pour vous ?",
      'circulaire',
      ['À mes choix', 'À mes paroles', 'À mes habitudes'],
    ),
    q(
      "Qu'est-ce que cette réponse veut dire pour vous, très concrètement ?",
      'sens',
      ['Une règle', 'Une valeur', 'Une habitude'],
    ),
  ],
  3: [
    q(
      'Dans quelle situation de la vie à deux cet accord serait-il le plus mis à l’épreuve ?',
      'projection',
      ["L'arrivée d'enfants", 'Un déménagement', 'Une période difficile'],
    ),
    q(
      "Le jour où l'un de vous changerait d'avis, comment aimeriez-vous l'apprendre ?",
      'reparation',
      ['Tout de suite', 'Calmement', 'Avec ses raisons'],
    ),
    q(
      'Imaginez un samedi ordinaire, dans trois ans : à quoi verrait-on cet accord chez vous ?',
      'scene',
      ['À nos choix', 'À notre rythme', 'À nos habitudes'],
    ),
  ],
};

/** Clé de réponse d'un accord (« A ») retrouvée à partir du texte de l'option. */
export function agreementKey(c: Convergence): string | undefined {
  return QUESTIONS.find((x) => x.id === c.questionId)?.options.find(
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

export function agreementFor(c: Convergence): {
  statement: string;
  probe?: PoolTemplate;
} {
  const found =
    AGREEMENTS[`${c.questionId}:${agreementKey(c) ?? ''}`] ??
    AGREEMENTS[c.questionId];
  return (
    found ?? {
      statement: `Vous avez répondu de la même façon sur ${topicPhrase({ ...c, label: c.topic ?? c.label })}.`,
    }
  );
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
