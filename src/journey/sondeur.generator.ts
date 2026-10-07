/**
 * Générateur du Sondeur BOLIGO — 21 questions, 3 jours × 7 thèmes fondamentaux.
 *
 * Grille obligatoire : chaque jour couvre les 7 thèmes (famille, argent & dettes,
 * religion & spiritualité, intimité & sexualité, communication & émotions,
 * projet de vie, lieu de vie & mobilité) sous l'angle du jour :
 *   jour 1 — lignes rouges, jour 2 — valeurs profondes, jour 3 — futur & intimité.
 *
 * Chaque question cible en priorité une divergence réelle détectée entre les deux
 * entretiens (moteur de divergences) ; à défaut, un point d'accord réel (« même
 * mot, même sens ? »), puis une question du thème. Les questions nomment le
 * sujet (« l'argent que l'on envoie à sa famille »), jamais ce que chacun a
 * répondu : les réponses restent indépendantes.
 *
 * Un même écart n'est posé qu'un seul jour, celui dont l'angle lui convient :
 * les autres jours du thème piochent dans les autres réserves.
 *
 * Un thème qui porte un écart de sécurité (violence, mots blessants) ne reçoit
 * que des questions de limite, écrites à l'avance (jamais un plan de mise en
 * sécurité, que l'autre lirait).
 *
 * Une couche IA (Groq / OpenRouter) peut proposer des formulations plus fines ;
 * ses questions, toujours relues en amont, passent avant les gabarits si elles
 * respectent la grille ; le reste est complété ici. Coût : zéro sans IA,
 * quelques millièmes d'euro par parcours avec.
 */
import {
  Convergence,
  Divergence,
  DivergenceReport,
  Severity,
  THEMES,
  THEME_LIST,
  Theme,
} from '../matching/divergence.engine';
import { QUESTION_INDEX } from '../interview/questions.data';
import {
  HarmonyQuestionPayload,
  ensureAutreOption,
} from './harmony-question.types';
import {
  CHILDREN_TOPICS,
  CONVERGENT,
  PoolTemplate,
  RECOMPOSED_TOPICS,
  SHARED_RISK,
  SUBJECT_FRAGMENTS,
  TARGETED,
  THEME_POOL,
  agreementFor,
  agreementKey,
  agreementProbes,
  TopicSource,
  hasNoChildren,
  isAgreementWorthAsking,
  isDeferredAgreement,
  isChildFree,
  isContradictedAgreement,
  isDeferredDivergence,
  isNonNegotiable,
  relatedTopics,
  topicDays,
  topicDeepAll,
  topicKey,
  topicPhrase,
  topicWords,
} from './sondeur.pool';

import { hasClinicalJargon, similarQuestions } from './clinical-lens';

export const SONDEUR_DAYS = 3;
export const SONDEUR_QUESTIONS_PER_DAY = THEME_LIST.length; // 7

export const DAY_ANGLES: Record<
  number,
  { label: string; emoji: string; intent: string }
> = {
  1: {
    label: 'Lignes rouges',
    emoji: '🚩',
    intent: 'ce que chacun protège',
  },
  2: {
    label: 'Valeurs profondes',
    emoji: '⚖️',
    intent: "d'où viennent vos positions",
  },
  3: {
    label: 'Futur & intimité',
    emoji: '🔮',
    intent:
      "ce qu'il faudrait savoir avant de s'engager, et comment chacun le vivrait au quotidien",
  },
};

/** Question proposée par l'IA, déjà normalisée, avec son thème fondamental. */
export interface AiSondeurQuestion extends HarmonyQuestionPayload {
  themeKey?: Theme;
}

export interface SondeurInput {
  report: DivergenceReport;
  /** Prénoms, uniquement pour les formulations (jamais de données de contact). */
  firstNames: [string, string];
  /** Questions IA candidates (facultatif). */
  aiQuestions?: AiSondeurQuestion[] | null;
  /** Textes déjà posés à ce couple : on évite de les reposer. */
  avoidTexts?: string[];
  /**
   * Textes déjà posés à l'un ou l'autre membre lors de parcours précédents,
   * avec d'autres partenaires : comparés par « signature » (sans les réponses
   * citées), pour ne pas resservir la même question sous un autre habillage.
   */
  history?: string[];
  /** Graine du tirage (l'identifiant du parcours) : deux couples ne reçoivent pas la même série. */
  seed?: string;
  /**
   * Questions de l'IA relues et validées par un second modèle indépendant.
   * Conservé pour compatibilité : toute question de l'IA transmise ici a été
   * relue (jamais de question non relue), elle passe donc toujours avant les
   * gabarits, et seules les questions de sécurité la précèdent.
   */
  preferAi?: boolean;
}

export interface SondeurQuestion extends HarmonyQuestionPayload {
  themeKey: Theme;
  /**
   * 'divergence' : ciblée sur un écart réel ; 'ia' ; 'convergence' : approfondit
   * un point d'accord réel ; 'gabarit' : question du thème.
   */
  source: 'divergence' | 'ia' | 'convergence' | 'gabarit';
  /**
   * Sujet visé (identifiant de la question d'entretien, « securite » pour une
   * question de limite, « controle » pour la limite de contrôle), pour la
   * traçabilité. Jamais affiché.
   */
  subject?: string;
}

// ─── Assemblage ────────────────────────────────────────────────────────────────

/** Au plus deux questions d'accord par jour : le Sondeur reste centré sur les écarts. */
const MAX_CONVERGENCE_PER_DAY = 2;

/**
 * Écarts mineurs gardés malgré tout : sujets de fond V6.1 (premier rendez-vous,
 * timidité, caprices…) qui ont leurs propres formulations.
 */
const MINOR_WORTH_ASKING = new Set([
  'M4_Q10',
  'M4_Q11',
  'M4_Q12',
  'M4_Q13',
  'M8_Q10',
  'M9_Q19',
  'M9_Q16',
  'M2_Q19',
  'M8_Q11',
  'M10_Q15',
]);

/** Texte comparable : casse, espaces et apostrophes (droite ou courbe) unifiés. */
function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ').trim();
}

/** Lettres et espaces seulement, comme une signature. */
function lettersOnly(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zàâäçéèêëîïôöùûüÿœæ«» ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ARTICLE = /^(?:le|la|les|l) /;

/**
 * Sujets nommés dans les gabarits (tournures et phrases d'accord), du plus long
 * au plus court, avec l'article ou la préposition qui peut les précéder.
 */
const SUBJECT_PATTERNS: RegExp[] = [
  ...new Set(SUBJECT_FRAGMENTS.map((f) => lettersOnly(f).replace(ARTICLE, ''))),
]
  .filter((core) => core.length >= 4)
  .sort((a, b) => b.length - a.length)
  .map(
    (core) =>
      new RegExp(
        `(?<=^| )(?:(?:du|des|de la|de l|de|d|le|la|les|l|au|aux|à la|à l|à|sur) )?${core}(?= |$)`,
        'g',
      ),
  );

/**
 * Signatures déjà calculées : chaque assemblage compare des centaines de
 * formulations, toujours les mêmes, à quelque 150 sujets.
 */
const SIGNATURES = new Map<string, string>();
const MAX_SIGNATURES = 20000;

/**
 * Signature d'une question : le texte sans les réponses citées entre « », sans
 * le sujet nommé (« l'argent que l'on envoie à sa famille ») ni la
 * ponctuation. Deux questions bâties sur le même gabarit, appliqué à d'autres
 * réponses ou à un autre sujet, ont la même signature : un membre ne les verra
 * qu'une fois.
 */
export function questionSignature(text: string): string {
  const cached = SIGNATURES.get(text);
  if (cached !== undefined) return cached;
  let sig = text
    .toLowerCase()
    .replace(/«[^»]*»/g, '«»')
    .replace(/\([^)]*«»[^)]*\)/g, '')
    .replace(/[^a-zàâäçéèêëîïôöùûüÿœæ«» ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const pattern of SUBJECT_PATTERNS) sig = sig.replace(pattern, '«»');
  if (SIGNATURES.size >= MAX_SIGNATURES) SIGNATURES.clear();
  SIGNATURES.set(text, sig);
  return sig;
}

/** Tirage pseudo-aléatoire reproductible (même graine → même série). */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sans graine : ordre d'origine. Avec graine : mélange reproductible propre au créneau. */
function arrange<T>(items: T[], seed: string | undefined, slot: string): T[] {
  if (!seed) return items;
  const rand = seededRandom(`${seed}|${slot}`);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface Memory {
  /** Signatures déjà vues par l'un des membres (parcours précédents). */
  seenSig: Set<string>;
  /** Textes exacts déjà vus par l'un des membres. */
  seenText: Set<string>;
  /** Signatures et textes déjà retenus dans ce Sondeur. */
  usedSig: Set<string>;
  usedText: Set<string>;
  /** Textes complets (passés et retenus) : repère les questions de l'IA trop proches. */
  raw: string[];
}

/**
 * Choisit la formulation la plus neuve, par ordre de préférence :
 * 1. gabarit jamais vu par les membres et pas encore utilisé dans ce Sondeur ;
 * 2. gabarit déjà vu lors d'un parcours précédent (texte nouveau, appliqué à
 *    un autre sujet), mais pas encore utilisé dans ce Sondeur : une même
 *    tournure ne revient pas deux fois dans un même Sondeur tant qu'il reste
 *    une autre formulation ;
 * 3. gabarit jamais vu, déjà utilisé ici sur un autre sujet ;
 * 4. texte nouveau, quel que soit le gabarit.
 * Retourne null si seuls des textes déjà posés restent disponibles.
 */
function pickFresh(
  candidates: PoolTemplate[],
  mem: Memory,
  /** Faux : jamais une tournure déjà utilisée dans ce Sondeur (paliers 1 et 2). */
  allowRepeat = true,
): PoolTemplate | null {
  const tiers: Array<(c: PoolTemplate, sig: string, key: string) => boolean> = [
    (_c, sig) => !mem.seenSig.has(sig) && !mem.usedSig.has(sig),
    (_c, sig, key) => !mem.seenText.has(key) && !mem.usedSig.has(sig),
    ...(allowRepeat
      ? [
          (_c: PoolTemplate, sig: string, key: string) =>
            !mem.seenSig.has(sig) && !mem.usedText.has(key),
          (_c: PoolTemplate, _sig: string, key: string) =>
            !mem.seenText.has(key) && !mem.usedText.has(key),
        ]
      : []),
  ];
  const keyed = candidates.map((c) => ({
    c,
    sig: questionSignature(c.text),
    key: normalizeKey(c.text),
  }));
  for (const ok of tiers) {
    const hit = keyed.find((k) => ok(k.c, k.sig, k.key));
    if (hit) return hit.c;
  }
  return null;
}

/**
 * Sujets de sécurité : jamais présentés comme un compromis ni « à rendre
 * vivables ». Le Sondeur n'y pose que des questions de limite et d'origine.
 */
export const SAFETY_QUESTIONS = new Set(['M6_Q04', 'M6_Q05']);

/**
 * Auto-évaluations (aveux, fréquences sur soi) : la réponse d'un membre n'est
 * jamais citée à l'autre.
 */
export const SELF_DISCLOSURE_QUESTIONS = new Set([
  'M6_Q03',
  'M9_Q03',
  'M2_Q11',
  'M6_Q13',
  'M6_Q15',
  'M8_Q10',
]);

/**
 * Même réponse à risque sur une question de sécurité (« ça dépend des
 * circonstances », « ça peut arriver dans un couple ») : traitée comme un
 * écart de sécurité, même avant que le moteur ne la signale lui-même.
 */
/** Réponse qui n'est pas un refus (« ça dépend », « je ne sais pas », « ça peut arriver », « passer outre »). */
const RISKY_SAFETY_KEYS = new Set(['C', 'D']);

const RISKY_SAFETY_AGREEMENTS = new Set([
  'M6_Q04:C',
  'M6_Q04:D',
  'M6_Q05:C',
  'M6_Q05:D',
]);

/**
 * Thèmes réservés aux questions de limite : écart de sécurité partagé ou au
 * moins modéré, ou même réponse qui n'est pas la limite absolue (« ça
 * dépend » des deux côtés). Un écart mineur entre deux refus de la violence
 * ne réserve pas le thème. Aucune question de l'IA n'y est servie.
 */
export function safetyThemesOf(report: DivergenceReport): Theme[] {
  return [
    ...new Set([
      ...report.divergences
        .filter(
          (d) =>
            SAFETY_QUESTIONS.has(d.questionId) &&
            (d.severity !== 'mineure' ||
              d.shared ||
              RISKY_SAFETY_KEYS.has(d.a.key) ||
              RISKY_SAFETY_KEYS.has(d.b.key)),
        )
        .map((d) => d.theme),
      ...report.convergences
        .filter((c) =>
          RISKY_SAFETY_AGREEMENTS.has(`${c.questionId}:${agreementKey(c)}`),
        )
        .map((c) => c.theme),
    ]),
  ];
}

/** Écart tiré d'une échelle (clé = score) : un score ne se cite pas comme une réponse. */
function isScaleDivergence(d: Divergence): boolean {
  return /^\d+$/.test(d.a.key) || /^\d+$/.test(d.b.key);
}

/** Écart citable dans une question : ni sécurité, ni aveu, ni score. */
export function isQuotableDivergence(d: Divergence): boolean {
  return (
    !SAFETY_QUESTIONS.has(d.questionId) &&
    !SELF_DISCLOSURE_QUESTIONS.has(d.questionId) &&
    !isScaleDivergence(d)
  );
}

/**
 * Questions de limite (sécurité), sans citer les réponses. Face à la violence
 * ou aux mots blessants, jamais de réconciliation ni de signal pour « reprendre
 * plus tard » : seulement la règle de respect que chacun tient pour non
 * négociable dans un couple (jour 1), la valeur ou le principe qui la fonde
 * (jour 2, jamais le récit de ce qui a été vécu ou vu), et ce qui montrerait
 * au quotidien que les limites de chacun sont respectées (jour 3). Toujours
 * une norme partagée ou une valeur, jamais un seuil personnel (« à quel
 * moment… », « même une seule fois… ») qu'un partenaire contrôlant pourrait
 * apprendre puis approcher. Jamais ce que l'on ferait pour se protéger, où
 * l'on irait ni qui l'on appellerait : l'autre lit la réponse, et un plan de
 * mise en sécurité reste confidentiel. Trois formulations par jour : un membre
 * qui enchaîne les parcours ne retrouve pas toujours la même.
 */
export const SAFETY_TEMPLATES: Record<number, PoolTemplate[]> = {
  1: [
    {
      text: "Même en colère, qu'est-ce qui n'a jamais sa place dans un couple, selon vous ?",
      options: ['Les insultes', 'Toute violence', 'Les menaces'],
    },
    {
      text: 'Quelle règle de respect tiendriez-vous pour absolue dans un foyer ?',
      options: ['Ni cris ni insultes', 'Aucune violence', 'Aucune menace'],
    },
    {
      text: "Entre deux personnes qui s'aiment, quelle façon de se parler reste exclue pour vous, même en dispute ?",
      options: ['Crier', 'Rabaisser', 'Menacer'],
    },
  ],
  2: [
    {
      text: "Sur quelle valeur repose, pour vous, l'idée qu'aucun désaccord n'autorise un mot ou un geste qui blesse ?",
      options: ['Le respect', 'La dignité', 'La confiance'],
    },
    {
      text: "Quel principe, reçu de votre éducation ou de vos convictions, vous fait dire qu'on ne fait jamais peur à quelqu'un qu'on aime ?",
      options: ['Le respect', 'La douceur', 'La parole donnée'],
    },
    {
      text: 'Quelle valeur fait, à vos yeux, que la colère ne donne jamais le droit de faire peur ?',
      options: ["L'égalité", 'La dignité', 'La confiance'],
    },
  ],
  3: [
    {
      text: "Dès le début d'une vie à deux, quelle limite commune aimeriez-vous poser, pour l'un comme pour l'autre ?",
      options: ['Aucun geste violent', 'Aucune insulte', 'Aucune menace'],
    },
    {
      text: 'Au quotidien, quel geste ou quelle parole montrerait, pour vous, que les limites de chacun sont respectées ?',
      options: [
        'Un ton qui reste calme',
        'Une pause respectée',
        'Aucune menace, même en colère',
      ],
    },
    {
      text: 'À quoi ressemblerait, pour vous, un désaccord vécu en sécurité dans une vie à deux ?',
      options: ['Un ton posé', 'Le droit de dire non', 'Sans peur ni menace'],
    },
  ],
};

/**
 * Formulations propres à l'écart pour ce jour (la principale, puis la
 * variante) : jamais une formulation de compromis sur un point non négociable,
 * ni sur un autre sujet d'un thème qui en porte un (`strictTheme`).
 */
function usableDeep(
  d: Divergence,
  day: number,
  strictTheme = false,
): PoolTemplate[] {
  const strict = strictTheme || isNonNegotiable(d);
  return topicDeepAll(d, day).filter((t) => !(strict && t.compromise));
}

/**
 * Signal de contrôle (jalousie qui surveille, accès total au téléphone voulu
 * par l'un) : traité comme une limite de sécurité, jamais comme un compromis.
 * Même exigence que les questions de limite : une norme partagée ou une
 * valeur, jamais un seuil personnel, un récit vécu ni un plan de protection.
 */
export const CONTROL_LIMIT: PoolTemplate = {
  text: "Même par inquiétude, quel geste de surveillance n'a pas sa place dans un couple, selon vous ?",
  options: [
    'Fouiller un téléphone',
    "Exiger de savoir où l'on est",
    "Isoler l'autre de ses proches",
  ],
};

export const CONTROL_LIMITS: PoolTemplate[] = [
  CONTROL_LIMIT,
  {
    text: "Dans un couple, quelle liberté de chacun reste intacte pour vous, même quand l'autre s'inquiète ?",
    options: ['Son téléphone', 'Ses sorties', 'Ses amitiés'],
  },
  {
    text: "Quel principe vous fait dire qu'aimer ne donne aucun droit de regard sur le téléphone ou les sorties de l'autre ?",
    options: ['La liberté de chacun', 'Le respect', 'La dignité'],
  },
];

export function isControlSignal(d: Divergence): boolean {
  return (
    topicKey(d) === 'M8_Q10:B' ||
    (d.questionId === 'M5_Q08' && (d.a.key === 'A' || d.b.key === 'A'))
  );
}

/**
 * Thème où poser la limite de contrôle, au jour 2 : celui du signal le plus
 * grave. Une seule fois par Sondeur, même si les deux signaux sont présents.
 */
export function controlThemeOf(report: DivergenceReport): Theme | undefined {
  const signals = report.divergences
    .filter(isControlSignal)
    .sort((x, y) => SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity]);
  return signals[0]?.theme;
}

/** Une formulation propre au sujet existe-t-elle pour l'un des jours ? */
function hasTopicDeep(d: Divergence): boolean {
  return [1, 2, 3].some((day) => usableDeep(d, day).length > 0);
}

/**
 * Divergences d'un thème, de la plus grave à la moins grave. Les mineures sont
 * écartées, sauf sur les sujets de fond V6.1 (premier rendez-vous, timidité…)
 * qui ont leurs propres formulations : elles passent alors en dernier.
 * Les écarts de sécurité ne sont jamais ciblés ici ; les aveux et les scores
 * seulement par une formulation propre, qui ne cite rien. Un sujet que l'un des
 * deux a préféré garder pour une conversation en personne n'est pas relancé.
 */
function divergencesForTheme(
  report: DivergenceReport,
  theme: Theme,
): Divergence[] {
  const ofTheme = report.divergences.filter(
    (d) =>
      d.theme === theme &&
      !SAFETY_QUESTIONS.has(d.questionId) &&
      !isDeferredDivergence(d) &&
      (isQuotableDivergence(d) || hasTopicDeep(d)),
  );
  return [
    ...ofTheme.filter((d) => d.severity !== 'mineure'),
    ...ofTheme.filter(
      (d) =>
        d.severity === 'mineure' &&
        MINOR_WORTH_ASKING.has(d.questionId) &&
        hasTopicDeep(d),
    ),
  ];
}

/**
 * Gabarits ciblés d'un jour pour cet écart : risque partagé (même réponse qui
 * pose problème) ou écart de positions. Jamais de gabarit qui suppose de
 * « vivre avec » la différence sur un point non négociable, ni dans un thème
 * qui en porte un. Aveux et scores : aucun gabarit générique, seulement leurs
 * formulations propres. Intimité : aucun gabarit générique non plus (ni
 * dispute, ni premier pas, ni règle pour « se protéger ») ; un écart de désir
 * n'est posé que par ses formulations propres, sinon le créneau prend une
 * question du thème intimité.
 */
function topicTemplates(day: number, d: Divergence, strictTheme = false) {
  if (!isQuotableDivergence(d) || d.theme === 'intimite') return [];
  const strict = strictTheme || isNonNegotiable(d);
  const pool = d.shared ? SHARED_RISK[day] : TARGETED[day];
  return pool.filter((t) => !(strict && t.compromise));
}

/**
 * Ouverture d'une question (jusqu'à la première virgule, quatre mots au plus) :
 * « avant de vous engager », « de 0 à 10 », « dans votre famille »…
 */
export function questionOpening(text: string): string {
  return (text.toLowerCase().split(/[,:?]/)[0] ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(' ');
}

/**
 * Formules d'angle repérées n'importe où dans la question, pas seulement à
 * l'ouverture : « …, avant de vous engager ? » compte comme « Avant tout
 * engagement, … ». Une même formule ne revient pas plus de deux fois dans une
 * journée tant qu'une autre tournure existe.
 */
const FORMULAS: Array<[string, RegExp]> = [
  [
    'engagement',
    /(?<!\p{L})avant (?:de vous engager|de s['’]engager|tout engagement|un engagement)/iu,
  ],
  [
    'vie commune',
    /(?<!\p{L})avant (?:de vivre|une vie commune|de partager un foyer)/iu,
  ],
  ['dire oui', /(?<!\p{L})avant de (?:vous )?dire oui/iu],
  ['unir', /(?<!\p{L})avant d['’]unir vos vies/iu],
  ['vie à deux', /(?<!\p{L})pour une vie à deux/iu],
  ['avant', /(?<!\p{L})avant (?:de|d['’]|tout|un|une)(?!\p{L})/iu],
  [
    "savoir de l'autre",
    /(?:voudriez|aimeriez)-vous (?:savoir|comprendre|connaître)/iu,
  ],
  ['quotidien à deux', /(?<!\p{L})au quotidien, à deux/iu],
  ['échelle', /(?<!\p{L})de 0 à 10/iu],
  [
    "famille d'origine",
    /(?<!\p{L})dans (?:votre famille|la famille où vous avez grandi|la maison où vous avez grandi)/iu,
  ],
];

/** Une formule ne revient pas une troisième fois dans la journée. */
const MAX_FORMULA_PER_DAY = 2;

/** Formules d'angle présentes dans une question. */
export function questionFormulas(text: string): string[] {
  return FORMULAS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** Ouvertures et formules déjà servies ce jour-là. */
interface DayUsage {
  openings: Set<string>;
  formulas: Map<string, number>;
}

/**
 * Dans chaque groupe (ordre conservé à rang égal), les formulations dont une
 * formule a déjà servi deux fois ce jour-là passent en dernier, puis celles
 * dont l'ouverture a déjà servi : une journée n'enchaîne pas trois « Avant de
 * vous engager… », ni trois « …, avant de vous engager ? », quand une autre
 * tournure existe.
 */
function preferNewOpenings(
  list: PoolTemplate[],
  used: DayUsage,
): PoolTemplate[] {
  const rank = (t: PoolTemplate) =>
    (questionFormulas(t.text).some(
      (f) => (used.formulas.get(f) ?? 0) >= MAX_FORMULA_PER_DAY,
    )
      ? 2
      : 0) + (used.openings.has(questionOpening(t.text)) ? 1 : 0);
  return list
    .map((t, i) => ({ t, i, r: rank(t) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map(({ t }) => t);
}

/**
 * Formulations d'un jour pour un écart : les formulations propres d'abord
 * (sauf un compromis sur un point non négociable ou dans son thème), puis les
 * gabarits ciblés ; dans chacun des deux groupes, une ouverture neuve ce
 * jour-là d'abord (jamais un gabarit avant une formulation propre).
 */
function divergenceCandidates(
  day: number,
  d: Divergence,
  seed: string | undefined,
  slot: string,
  strictTheme: boolean,
  used: DayUsage,
): PoolTemplate[] {
  const words = topicWords(topicPhrase(d));
  const generic = topicTemplates(day, d, strictTheme).map((t) => ({
    text: t.text(words),
    options: t.options,
  }));
  return [
    ...preferNewOpenings(usableDeep(d, day, strictTheme), used),
    ...preferNewOpenings(arrange(generic, seed, `${slot}|div`), used),
  ];
}

const SEVERITY_RANK: Record<Severity, number> = {
  critique: 3,
  majeure: 2,
  moderee: 1,
  mineure: 0,
};

/**
 * Jour où poser un écart : le premier de ses jours possibles (jour préféré
 * d'abord) encore libre dans son thème et qui a une formulation. Un écart
 * critique ou majeur qui n'en trouve aucun essaie ensuite les autres jours,
 * avec les seules formulations strictes (jamais avant le jour 3 pour
 * l'intimité).
 */
function dayFor(
  d: Divergence,
  plan: Map<string, Divergence>,
  reserved: Set<string>,
  strictTheme: boolean,
): number | undefined {
  const fits = (day: number) => {
    const slot = `${day}|${d.theme}`;
    return (
      !plan.has(slot) &&
      !reserved.has(slot) &&
      (usableDeep(d, day, strictTheme).length > 0 ||
        topicTemplates(day, d, strictTheme).length > 0)
    );
  };
  const preferred = topicDays(d);
  const found = preferred.find(fits);
  if (
    found ||
    !['critique', 'majeure'].includes(d.severity) ||
    d.theme === 'intimite'
  )
    return found;
  // Un écart majeur ne change de jour qu'avec une formulation propre.
  return [1, 2, 3]
    .filter((day) => !preferred.includes(day))
    .find(
      (day) =>
        fits(day) &&
        (d.severity === 'critique' ||
          usableDeep(d, day, strictTheme).length > 0),
    );
}

/**
 * Plan des écarts : chaque écart est posé un seul jour (dayFor). Les plus
 * graves choisissent en premier, tous thèmes confondus. Un seul sujet par
 * famille de sujets voisins (la colère et la dispute, la foi et la religion…).
 * Un thème qui n'a qu'un écart le pose au jour dont l'angle convient ; ses
 * autres jours piochent dans les autres réserves. Les thèmes de sécurité
 * n'en reçoivent aucun (leurs créneaux vont aux questions de limite), ni les
 * créneaux réservés (limite de contrôle) : un écart prévu là serait perdu et
 * bloquerait en plus ses sujets voisins.
 */
function planDivergences(
  report: DivergenceReport,
  reserved: Set<string>,
  excluded: Set<string>,
  strictThemes: Set<Theme>,
): Map<string, Divergence> {
  const plan = new Map<string, Divergence>();
  const planned = new Set<string>();
  const safety = new Set(safetyThemesOf(report));
  const candidates = THEME_LIST.filter((theme) => !safety.has(theme))
    .flatMap((theme) => divergencesForTheme(report, theme))
    .filter((d) => !excluded.has(d.questionId))
    // Signal de contrôle : posé une seule fois, par la limite de contrôle.
    .filter((d) => !(reserved.size && isControlSignal(d)));
  // Tri stable : à gravité égale, l'ordre des thèmes, puis celui du moteur.
  const ordered = [...candidates].sort(
    (x, y) =>
      SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity] ||
      Number(isNonNegotiable(y)) - Number(isNonNegotiable(x)),
  );
  for (const d of ordered) {
    const related = relatedTopics(d);
    if (related.some((k) => planned.has(k))) continue;
    const day = dayFor(d, plan, reserved, strictThemes.has(d.theme));
    if (!day) continue;
    plan.set(`${day}|${d.theme}`, d);
    for (const k of related) planned.add(k);
  }
  // Incompatibilité déclarée (écart critique) posée les jours 1 ou 2 : une
  // seconde question au jour 3, sur la façon dont chacun la vivrait au
  // quotidien, si son thème y a un créneau libre et une formulation propre
  // (jamais de compromis). Deux au plus, pour garder la place des autres
  // sujets.
  let second = 0;
  for (const [slot, d] of [...plan]) {
    if (second >= MAX_CRITICAL_SECOND_LOOKS) break;
    const late = `3|${d.theme}`;
    if (
      d.severity !== 'critique' ||
      slot.startsWith('3|') ||
      plan.has(late) ||
      reserved.has(late) ||
      usableDeep(d, 3, strictThemes.has(d.theme)).length === 0
    )
      continue;
    plan.set(late, d);
    second++;
  }
  return plan;
}

/** Écarts critiques revus au jour 3, par Sondeur. */
const MAX_CRITICAL_SECOND_LOOKS = 2;

/** Un sujet et ses voisins : rien de tout cela ne sera reposé un autre jour. */
function markTaken(taken: Set<string>, src: TopicSource): void {
  taken.add(src.questionId);
  for (const k of relatedTopics(src)) taken.add(k);
}

/**
 * Accords d'un thème qui valent une question ce jour-là : jamais une
 * auto-évaluation, une limite de sécurité, une réponse différée ou un simple
 * fait ; jamais un sujet déjà abordé. Ceux qui ont leur question « même mot,
 * même sens ? » passent en premier.
 */
function convergencesFor(
  report: DivergenceReport,
  theme: Theme,
  day: number,
  taken: Set<string>,
  childFree: boolean,
): Convergence[] {
  const eligible = report.convergences.filter(
    (c) =>
      c.theme === theme &&
      !SELF_DISCLOSURE_QUESTIONS.has(c.questionId) &&
      !SAFETY_QUESTIONS.has(c.questionId) &&
      !taken.has(c.questionId) &&
      !isContradictedAgreement(c, report.divergences, report.convergences) &&
      isAgreementWorthAsking(c) &&
      !(childFree && agreementFor(c).needsChildren) &&
      topicDays({ ...c, label: c.topic ?? c.label }).includes(day),
  );
  const hasProbe = (c: Convergence) =>
    agreementProbes(agreementFor(c)).length > 0;
  return [
    ...eligible.filter(hasProbe),
    ...eligible.filter((c) => !hasProbe(c)),
  ];
}

/**
 * Formulations d'un accord : la phrase qui le nomme, puis une question. Les
 * relances propres écrites pour l'angle du jour passent d'abord (jour 1 : ce
 * que chacun protège ou la limite de l'accord ; jour 2 : d'où vient la
 * position ; jour 3 : comment chacun la vivrait au quotidien, ce qu'il
 * faudrait savoir avant de s'engager), puis les autres relances propres pour
 * un membre qui a déjà tout vu, puis les questions d'accord du jour. Sans
 * phrase (risque partagé non signalé), les relances propres seules.
 * Intimité : les relances propres seules, jamais une question d'accord
 * générique.
 */
function convergenceCandidates(
  day: number,
  c: Convergence,
  seed: string | undefined,
  slot: string,
  used: DayUsage,
): PoolTemplate[] {
  const agreement = agreementFor(c);
  const { statement } = agreement;
  // Point non négociable (enfants, fidélité, foi…) : on n'éprouve pas la
  // solidité d'un accord que les deux tiennent pour essentiel, ni par une
  // relance propre ni par une question générique.
  const strict = isNonNegotiable({ ...c, label: c.topic ?? c.label });
  const allowed = (t: PoolTemplate) => !(strict && t.technique === 'limite');
  const probes = agreementProbes(agreement).filter(allowed);
  // Dans chaque groupe, une formule d'angle déjà servie deux fois ce jour-là
  // (« dans votre famille »…) passe en dernier.
  const own = [
    ...preferNewOpenings(
      probes.filter((t) => t.angle === day),
      used,
    ),
    ...preferNewOpenings(
      probes.filter((t) => t.angle !== day),
      used,
    ),
  ];
  if (!statement) return own;
  const withStatement = (t: PoolTemplate) => ({
    text: `${statement} ${t.text}`,
    options: t.options,
  });
  const generic = c.theme === 'intimite' ? [] : CONVERGENT[day].filter(allowed);
  return [
    ...own.map(withStatement),
    ...arrange(generic.map(withStatement), seed, `${slot}|conv`),
  ];
}

function pickAi(
  aiQuestions: AiSondeurQuestion[],
  day: number,
  theme: Theme,
  mem: Memory,
): AiSondeurQuestion | null {
  const candidate = aiQuestions.find(
    (q) =>
      q.day === day &&
      q.themeKey === theme &&
      !mem.usedText.has(normalizeKey(q.text)) &&
      !mem.seenText.has(normalizeKey(q.text)) &&
      !mem.seenSig.has(questionSignature(q.text)) &&
      // Garde-fous : ni jargon clinique, ni redite d'une question déjà posée.
      !hasClinicalJargon(q.text) &&
      !mem.raw.some((t) => similarQuestions(t, q.text)),
  );
  return candidate ?? null;
}

/**
 * Construit exactement 21 questions (3 jours × 7 thèmes), ordre : jour puis thème.
 * Priorité par créneau : question de limite si le thème porte un écart de
 * sécurité (absolue) → question de l'IA (toujours relue en amont) → écart
 * réel prévu ce jour-là → point d'accord réel → question du thème. Dans chaque
 * réserve, la formulation retenue est une que ni l'un ni l'autre membre n'a
 * déjà vue, et un même sujet n'est jamais reposé un autre jour.
 */
export function assembleSondeur(input: SondeurInput): SondeurQuestion[] {
  const { report, aiQuestions, avoidTexts = [], history = [], seed } = input;
  const past = [...avoidTexts, ...history];
  const mem: Memory = {
    seenSig: new Set(past.map(questionSignature)),
    seenText: new Set(past.map(normalizeKey)),
    usedSig: new Set(),
    usedText: new Set(),
    raw: [...past],
  };
  const ai = aiQuestions ?? [];
  const result: SondeurQuestion[] = [];
  // Signal de contrôle : une question de limite au jour 2 de son thème.
  const controlTheme = controlThemeOf(report);
  const reserved = new Set(controlTheme ? [`2|${controlTheme}`] : []);
  // L'un ne veut pas d'enfants : aucune question qui en suppose. Aucun des
  // deux n'a d'enfant : jamais la famille recomposée (enfants d'une autre
  // union), ni comme écart ni comme accord.
  const childFree = isChildFree(report.divergences, report.convergences);
  const excluded = new Set<string>([
    ...(childFree ? CHILDREN_TOPICS : []),
    ...(hasNoChildren(report.convergences) ? RECOMPOSED_TOPICS : []),
  ]);
  // Thèmes qui portent un écart non négociable : aucune question du thème qui
  // suppose de « vivre avec » la différence, même sur un sujet voisin.
  const strictThemes = new Set(
    report.divergences.filter((d) => isNonNegotiable(d)).map((d) => d.theme),
  );
  const plan = planDivergences(report, reserved, excluded, strictThemes);
  // Sujets déjà abordés ou prévus (et leurs voisins) : on ne les repose pas un
  // autre jour.
  const taken = new Set<string>(excluded);
  for (const d of plan.values()) markTaken(taken, d);
  if (controlTheme)
    markTaken(taken, { questionId: 'M5_Q08', label: '', theme: 'intimite' });
  const safetyThemes = new Set(safetyThemesOf(report));

  for (let day = 1; day <= SONDEUR_DAYS; day++) {
    const angle = DAY_ANGLES[day];
    let convergenceToday = 0;
    const openingsToday = new Set<string>();
    // Ouvertures et formules des questions déjà retenues ce jour-là (toutes
    // sources).
    const usedToday: DayUsage = { openings: new Set(), formulas: new Map() };
    for (const theme of THEME_LIST) {
      const slot = `${day}|${theme}`;
      const base = {
        day,
        theme: angle.label,
        emoji: THEMES[theme].emoji,
        themeKey: theme,
      };
      let question: SondeurQuestion | null = null;

      // 1. Écart de sécurité sur ce thème : une question de limite, jamais un
      // compromis ni une réconciliation, jamais une question de l'IA, jamais
      // un plan de mise en sécurité. Trois angles distincts : la limite, la
      // valeur qui la fonde, son respect au quotidien. Déjà vues lors
      // d'un parcours précédent : elles reviennent plutôt que de laisser la
      // place à une autre question. Signal de contrôle : au jour 2 de son
      // thème, la limite de contrôle.
      if (day === 2 && theme === controlTheme) {
        const limit = pickFresh(CONTROL_LIMITS, mem) ?? CONTROL_LIMIT;
        question = {
          ...base,
          text: limit.text,
          options: ensureAutreOption(limit.options),
          source: 'divergence',
          subject: 'controle',
        };
      } else if (safetyThemes.has(theme)) {
        const limits = arrange(SAFETY_TEMPLATES[day], seed, `${slot}|limite`);
        const pick =
          pickFresh(limits, mem) ??
          limits.find((t) => !mem.usedText.has(normalizeKey(t.text))) ??
          limits[0];
        question = {
          ...base,
          text: pick.text,
          options: ensureAutreOption(pick.options),
          source: 'divergence',
          subject: 'securite',
        };
      }

      // 2. Question de l'IA, relue par un second modèle : avant les gabarits.
      if (!question) {
        const fromAi = pickAi(ai, day, theme, mem);
        if (fromAi) {
          question = {
            ...fromAi,
            ...base,
            options: ensureAutreOption(fromAi.options),
            source: 'ia',
          };
        }
      }

      // 3. Écart réel prévu ce jour-là.
      const divergence = plan.get(slot);
      if (!question && divergence) {
        const pick = pickFresh(
          divergenceCandidates(
            day,
            divergence,
            seed,
            slot,
            strictThemes.has(theme),
            usedToday,
          ),
          mem,
        );
        if (pick) {
          question = {
            ...base,
            text: pick.text,
            options: ensureAutreOption(pick.options),
            source: 'divergence',
            subject: topicKey(divergence),
          };
        }
      }

      // 4. Point d'accord réel (deux par jour au plus).
      if (!question && convergenceToday < MAX_CONVERGENCE_PER_DAY) {
        for (const c of convergencesFor(report, theme, day, taken, childFree)) {
          const opening = agreementFor(c)
            .statement.split(/[ ,]/)
            .slice(0, 3)
            .join(' ')
            .toLowerCase();
          if (opening && openingsToday.has(opening)) continue;
          // Un accord ne reprend jamais une tournure déjà posée dans ce
          // Sondeur : le créneau prend alors une question du thème.
          const pick = pickFresh(
            convergenceCandidates(day, c, seed, slot, usedToday),
            mem,
            false,
          );
          if (!pick) continue;
          convergenceToday++;
          if (opening) openingsToday.add(opening);
          markTaken(taken, { ...c, label: c.topic ?? c.label });
          question = {
            ...base,
            text: pick.text,
            options: ensureAutreOption(pick.options),
            source: 'convergence',
            subject: c.questionId,
          };
          break;
        }
      }

      // 5. Question du thème ; celles qui touchent un sujet déjà abordé passent
      // en dernier. Jamais une formulation de compromis dans un thème qui
      // porte un écart non négociable.
      if (!question) {
        const pool = arrange(
          THEME_POOL[theme][day].filter(
            (t) =>
              !(strictThemes.has(theme) && t.compromise) &&
              !(childFree && t.needsChildren),
          ),
          seed,
          `${slot}|gen`,
        );
        const touches = (t: PoolTemplate) =>
          (t.about ?? []).some((id) => taken.has(id));
        const ordered = [
          ...preferNewOpenings(
            pool.filter((t) => !touches(t)),
            usedToday,
          ),
          ...preferNewOpenings(pool.filter(touches), usedToday),
        ];
        // Réserve épuisée (au-delà de sept parcours) : une formulation déjà vue revient.
        const tpl =
          pickFresh(ordered, mem) ??
          ordered.find((t) => !mem.usedText.has(normalizeKey(t.text))) ??
          ordered[0];
        for (const id of tpl.about ?? []) taken.add(id);
        question = {
          ...base,
          text: tpl.text,
          options: ensureAutreOption(tpl.options),
          source: 'gabarit',
        };
      }

      usedToday.openings.add(questionOpening(question.text));
      for (const f of questionFormulas(question.text))
        usedToday.formulas.set(f, (usedToday.formulas.get(f) ?? 0) + 1);
      mem.usedText.add(normalizeKey(question.text));
      mem.usedSig.add(questionSignature(question.text));
      mem.raw.push(question.text);
      result.push(question);
    }
  }

  // Aucun des deux n'a de pratique religieuse : la grille cachée ne leur
  // impose ni foi ni prière, seulement des valeurs, des convictions, des
  // traditions familiales.
  if (hasNoReligiousPractice(report))
    for (const question of result)
      question.options = neutralOptions(question.options);

  return result;
}

// ─── Options cachées sans religion ─────────────────────────────────────────────

/** Texte d'une option de l'entretien (questions retirées comprises). */
const interviewOption = (id: string, key: string): string =>
  QUESTION_INDEX.get(id)?.options.find((o) => o.key === key)?.text ?? '';

/** Religion ou conviction déclarée (V7 : M1_Q16 ; V6 : M1_Q05). */
const FAITH_QUESTIONS = new Set(['M1_Q16', 'M1_Q05']);

/**
 * Sans religion : « sans religion » ou « une spiritualité personnelle, sans
 * religion » (V7), « agnostique / athée » ou « spirituel(le) sans religion
 * définie » (V6).
 */
const NO_RELIGION_ANSWERS = new Set(
  [
    interviewOption('M1_Q16', 'H'),
    interviewOption('M1_Q16', 'I'),
    interviewOption('M1_Q05', 'E'),
    interviewOption('M1_Q05', 'F'),
  ].filter(Boolean),
);

/** Pratique religieuse « rarement ou jamais » (M1_Q17, V7). */
const NO_PRACTICE_ANSWER = interviewOption('M1_Q17', 'D');

/**
 * Aucun des deux membres n'a de pratique religieuse, d'après ce que le
 * rapport laisse voir de leurs entretiens : chacun est sans religion
 * (M1_Q16, M1_Q05), ou pratique « rarement ou jamais » (M1_Q17). Un membre
 * dont le rapport ne dit rien de sa pratique est compté comme pratiquant :
 * dans le doute, les options restent celles du gabarit.
 */
export function hasNoReligiousPractice(report: DivergenceReport): boolean {
  // Pour chaque membre (A, B) : religion déclarée, pratique déclarée.
  const religion: Array<boolean | undefined> = [undefined, undefined];
  const practice: Array<boolean | undefined> = [undefined, undefined];
  for (const d of report.divergences) {
    const sides = [d.a.text, d.b.text];
    if (FAITH_QUESTIONS.has(d.questionId))
      sides.forEach((t, i) => (religion[i] = !NO_RELIGION_ANSWERS.has(t)));
    if (d.questionId === 'M1_Q17')
      sides.forEach((t, i) => (practice[i] = t !== NO_PRACTICE_ANSWER));
  }
  for (const c of report.convergences) {
    if (FAITH_QUESTIONS.has(c.questionId))
      religion[0] = religion[1] = !NO_RELIGION_ANSWERS.has(c.answer);
    if (c.questionId === 'M1_Q17')
      practice[0] = practice[1] = c.answer !== NO_PRACTICE_ANSWER;
  }
  return [0, 1].every((i) => religion[i] === false || practice[i] === false);
}

/** Option cachée qui suppose une foi ou une pratique religieuse. */
export const RELIGIOUS_OPTION =
  /(?<!\p{L})(?:foi|pri(?:è|e)r\p{L}*|dieu|religi\p{L}*|bénédiction\p{L}*|béni\p{L}*|rites?(?! familial)|culte|église|mosquée|temple|synagogue|messe|jeûne|ramadan|carême|halal|casher|sacr(?!ifi)\p{L}*|recueillement|spiritu\p{L}*|croyan\p{L}*|croyant\p{L}*)(?!\p{L})|(?<!\p{L})(?:ma|mes|une|les|des|la|même|leur|leurs|sa|ses) pratiques?(?!\p{L})/iu;

/**
 * Équivalents neutres des options religieuses les plus courantes : des
 * valeurs, des convictions, des traditions familiales.
 */
const NEUTRAL_OPTIONS: Record<string, string> = {
  'Ma foi': 'Mes convictions',
  'De ma foi': 'De mes convictions',
  'La foi': 'La sagesse',
  'Une foi': 'Des valeurs',
  'Leur foi': 'Leurs valeurs',
  'Ma foi ou mes valeurs': 'Mes valeurs',
  'Une exigence de foi': 'Une exigence de valeurs',
  'Une condition de foi': 'Une condition de valeurs',
  'Une parole de foi': 'Une parole de sagesse',
  'Une parole de ma foi': 'Une parole de sagesse',
  'La bénédiction': 'Le soutien des familles',
  'La bénédiction des familles': 'Le soutien des familles',
  'Une bénédiction': 'Un encouragement',
  'Leur bénédiction': 'Leur soutien',
  'Une prière': 'Une tradition familiale',
  'Des prières': 'Des traditions familiales',
  'La prière': 'Les traditions familiales',
  'Par la prière': 'Par nos valeurs',
  'La prière à deux': 'Des valeurs partagées',
  'Un temps de prière': 'Un temps de calme',
  'Le respect des rites': 'Le respect des traditions',
  'Le respect des rites de chacun': 'Le respect des traditions de chacun',
  'Un rite de ma tradition': 'Une tradition de ma famille',
  'Une pratique': 'Une conviction',
  'Une pratique moquée': 'Une conviction moquée',
  'Une pratique ignorée': 'Une conviction ignorée',
  'Ma pratique': 'Mes convictions',
  'Mes pratiques': 'Mes convictions',
  'Les pratiques': 'Les convictions',
  'Le respect de mes pratiques': 'Le respect de mes convictions',
  'Une même pratique': 'Des valeurs communes',
  'Une promesse devant Dieu': 'Une promesse solennelle',
  'La même religion': 'Les mêmes valeurs',
  'Une religion proche': 'Des valeurs proches',
  'La religion': 'Les convictions',
  'La religieuse': 'La familiale',
  'Une fête religieuse': 'Une fête traditionnelle',
};

/** Repli, dans l'ordre, quand l'équivalent est absent ou déjà proposé. */
const NEUTRAL_FALLBACKS = [
  'Mes valeurs',
  'Mes convictions',
  'Les traditions de ma famille',
];

/**
 * Grille cachée sans option religieuse, pour deux membres sans pratique :
 * chaque option qui suppose une foi devient une valeur, une conviction ou une
 * tradition familiale, jamais deux fois la même.
 */
export function neutralOptions(options: string[]): string[] {
  const out: string[] = [];
  for (const o of options) {
    if (!RELIGIOUS_OPTION.test(o)) {
      out.push(o);
      continue;
    }
    const taken = (x: string) => out.includes(x) || options.includes(x);
    const mapped = NEUTRAL_OPTIONS[o];
    out.push(
      mapped && !taken(mapped)
        ? mapped
        : (NEUTRAL_FALLBACKS.find((x) => !taken(x)) ?? 'Mes valeurs'),
    );
  }
  return out;
}

/** Sujets où une même réponse peut cacher un contrôle (téléphone, jalousie). */
const CONTROL_TOPICS = new Set(['M5_Q08', 'M9_Q11', 'M8_Q10']);

/** Résumé compact du rapport de divergences pour un prompt IA (sans données de contact). */
export function describeReportForAi(
  report: DivergenceReport,
  firstNames: [string, string],
): string {
  // Prénoms sur une ligne, sans citation : rien ne peut s'y glisser.
  const [a, b] = firstNames.map(
    (n) =>
      (n.split(/[\n\r]/)[0] ?? '')
        .replace(/[‹›«»"]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40) || 'Membre',
  );
  const lines: string[] = [];
  // Points non négociables et signaux de contrôle : nommés au rédacteur.
  const marks = (d: Divergence) =>
    `${isNonNegotiable(d) ? ' — POINT NON NÉGOCIABLE : jamais de compromis ni de terrain d’entente ; au jour 3, ce que chacun aurait besoin de savoir avant de s’engager.' : ''}${CONTROL_TOPICS.has(d.questionId) ? ' — CONTRÔLE POSSIBLE : demande où chacun place la frontière entre confiance et surveillance ; jamais l’accès au téléphone ou à la localisation présenté comme une preuve d’amour.' : ''}`;
  lines.push(
    `Questions comparées : ${report.comparedQuestions}. Incompatibilité déclarée : ${report.hardStop ? 'oui' : 'non'}.`,
  );
  if (report.divergences.length) {
    lines.push('DIVERGENCES (de la plus grave à la moins grave) :');
    for (const d of report.divergences.slice(0, 12)) {
      const head = `- [${d.severity}] ${THEMES[d.theme].label} — ${d.label}`;
      if (SAFETY_QUESTIONS.has(d.questionId)) {
        lines.push(
          `${head} : LIMITE DE SÉCURITÉ. Jamais négociable : uniquement des questions sur la limite de chacun (jamais un plan de protection ni un récit vécu), jamais de compromis, de réconciliation ni « comment le rendre vivable ».`,
        );
      } else if (!isQuotableDivergence(d)) {
        lines.push(
          `${head} : tendance tirée de l'entretien, à explorer sans jamais citer les réponses ni un niveau.${marks(d)}`,
        );
      } else if (isDeferredDivergence(d)) {
        lines.push(
          `${head} : l'un préfère en parler en personne. Ne pas relancer ce sujet.`,
        );
      } else {
        lines.push(
          `${head} : ${a} « ${d.a.text} » / ${b} « ${d.b.text} »${marks(d)}`,
        );
      }
    }
  } else {
    lines.push('Aucune divergence notable détectée dans les entretiens.');
  }
  if (report.convergences.length) {
    lines.push('CONVERGENCES (même réponse des deux côtés) :');
    for (const c of report.convergences.slice(0, 6)) {
      const head = `- ${THEMES[c.theme].label} — ${c.topic ?? c.label}`;
      if (SAFETY_QUESTIONS.has(c.questionId)) {
        lines.push(
          `${head} : même réponse « ${c.answer} » — LIMITE DE SÉCURITÉ : uniquement des questions de limite, jamais de compromis.`,
        );
      } else if (SELF_DISCLOSURE_QUESTIONS.has(c.questionId)) {
        lines.push(
          `${head} : même tendance, à explorer sans la citer.${CONTROL_TOPICS.has(c.questionId) ? ' — CONTRÔLE POSSIBLE : demande où chacun place la frontière entre confiance et surveillance.' : ''}`,
        );
      } else if (isDeferredAgreement(c)) {
        lines.push(
          `${head} : les deux préfèrent en parler en personne. Ne pas relancer ce sujet.`,
        );
      } else {
        lines.push(
          `${head} : même réponse des deux, « ${c.answer} »${CONTROL_TOPICS.has(c.questionId) ? ' — CONTRÔLE POSSIBLE : demande où chacun place la frontière entre confiance et surveillance.' : ''}`,
        );
      }
    }
  }
  return lines.join('\n');
}

/** Vérifie la grille : 21 questions, 7 par jour, chaque thème présent chaque jour. */
export function validateSondeurGrid(
  questions: Array<{ day: number; themeKey: Theme }>,
): boolean {
  if (questions.length !== SONDEUR_DAYS * SONDEUR_QUESTIONS_PER_DAY)
    return false;
  for (let day = 1; day <= SONDEUR_DAYS; day++) {
    const themes = new Set(
      questions.filter((q) => q.day === day).map((q) => q.themeKey),
    );
    if (themes.size !== THEME_LIST.length) return false;
  }
  return true;
}
