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
 * que des questions de limite et de protection, écrites à l'avance.
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
import {
  HarmonyQuestionPayload,
  ensureAutreOption,
} from './harmony-question.types';
import {
  CONVERGENT,
  PoolTemplate,
  SHARED_RISK,
  SUBJECT_FRAGMENTS,
  TARGETED,
  THEME_POOL,
  agreementFor,
  agreementKey,
  TopicSource,
  isAgreementWorthAsking,
  isDeferredAgreement,
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
   * question de limite), pour la traçabilité. Jamais affiché.
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

function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
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
 * Signature d'une question : le texte sans les réponses citées entre « », sans
 * le sujet nommé (« l'argent que l'on envoie à sa famille ») ni la
 * ponctuation. Deux questions bâties sur le même gabarit, appliqué à d'autres
 * réponses ou à un autre sujet, ont la même signature : un membre ne les verra
 * qu'une fois.
 */
export function questionSignature(text: string): string {
  let sig = text
    .toLowerCase()
    .replace(/«[^»]*»/g, '«»')
    .replace(/\([^)]*«»[^)]*\)/g, '')
    .replace(/[^a-zàâäçéèêëîïôöùûüÿœæ«» ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const pattern of SUBJECT_PATTERNS) sig = sig.replace(pattern, '«»');
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
 * 2. gabarit jamais vu, déjà utilisé ici sur un autre sujet ;
 * 3. gabarit déjà vu mais texte nouveau (appliqué à un autre sujet) ;
 * Retourne null si seuls des textes déjà posés restent disponibles.
 */
function pickFresh(
  candidates: PoolTemplate[],
  mem: Memory,
): PoolTemplate | null {
  const tiers: Array<(c: PoolTemplate, sig: string, key: string) => boolean> = [
    (_c, sig) => !mem.seenSig.has(sig) && !mem.usedSig.has(sig),
    (_c, sig, key) => !mem.seenSig.has(sig) && !mem.usedText.has(key),
    (_c, sig, key) => !mem.seenText.has(key) && !mem.usedSig.has(sig),
    (_c, _sig, key) => !mem.seenText.has(key) && !mem.usedText.has(key),
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
const RISKY_SAFETY_AGREEMENTS = new Set([
  'M6_Q04:C',
  'M6_Q04:D',
  'M6_Q05:C',
  'M6_Q05:D',
]);

/**
 * Thèmes réservés aux questions de limite : écart de sécurité, partagé ou non,
 * ou même réponse qui n'est pas la limite absolue (« ça dépend » des deux
 * côtés). Aucune question de l'IA n'y est servie.
 */
export function safetyThemesOf(report: DivergenceReport): Theme[] {
  return [
    ...new Set([
      ...report.divergences
        .filter((d) => SAFETY_QUESTIONS.has(d.questionId))
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
 * plus tard » : seulement où chacun place sa limite de sécurité, d'où il la
 * tient, et ce qu'il ferait pour se protéger si elle était franchie.
 */
export const SAFETY_TEMPLATES: Record<number, PoolTemplate[]> = {
  1: [
    {
      text: "Dans une dispute, à quel moment sentiriez-vous que vous n'êtes plus en sécurité ?",
      options: [
        'Dès un mot blessant',
        'Dès un geste brusque',
        'Je le saurais sur le moment',
      ],
    },
    {
      text: 'Quelle limite, en dispute, ne pourrait jamais être franchie avec vous, même une seule fois ?',
      options: ['Les insultes', 'Toute violence', 'Les menaces'],
    },
  ],
  2: [
    {
      text: "Qui vous a appris, par l'exemple, qu'on peut se disputer sans se faire de mal ?",
      options: [
        'Mes parents',
        'Un proche',
        "Personne : je l'ai appris seul(e)",
      ],
    },
    {
      text: "Qu'avez-vous appris, en grandissant, sur ce qu'on ne fait jamais à quelqu'un qu'on aime ?",
      options: ['Lever la main', 'Humilier', 'Menacer'],
    },
  ],
  3: [
    {
      text: "Pour vous sentir en sécurité dans une vie à deux, quelle limite aimeriez-vous que l'autre connaisse dès le début ?",
      options: ['Aucun geste violent', 'Aucune insulte', 'Aucune menace'],
    },
    {
      text: "Si quelqu'un franchissait un jour votre limite de sécurité, que feriez-vous pour vous protéger ?",
      options: [
        'Partir aussitôt',
        'Demander de l’aide à un proche',
        'Appeler une association ou les secours',
      ],
    },
  ],
};

/**
 * Formulations propres à l'écart pour ce jour (la principale, puis la
 * variante) : jamais une formulation de compromis sur un point non négociable.
 */
function usableDeep(d: Divergence, day: number): PoolTemplate[] {
  const strict = isNonNegotiable(d);
  return topicDeepAll(d, day).filter((t) => !(strict && t.compromise));
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
 * « vivre avec » la différence sur un point non négociable. Aveux et scores :
 * aucun gabarit générique, seulement leurs formulations propres.
 */
function topicTemplates(day: number, d: Divergence) {
  if (!isQuotableDivergence(d)) return [];
  if (d.shared) return SHARED_RISK[day];
  const strict = isNonNegotiable(d);
  return TARGETED[day].filter((t) => !(strict && t.compromise));
}

/**
 * Formulations d'un jour pour un écart : les formulations propres d'abord
 * (sauf un compromis sur un point non négociable), puis les gabarits ciblés.
 */
function divergenceCandidates(
  day: number,
  d: Divergence,
  seed: string | undefined,
  slot: string,
): PoolTemplate[] {
  const words = topicWords(topicPhrase(d));
  const generic = topicTemplates(day, d).map((t) => ({
    text: t.text(words),
    options: t.options,
  }));
  return [...usableDeep(d, day), ...arrange(generic, seed, `${slot}|div`)];
}

const SEVERITY_RANK: Record<Severity, number> = {
  critique: 3,
  majeure: 2,
  moderee: 1,
  mineure: 0,
};

/**
 * Plan des écarts : chaque écart est posé un seul jour, le premier de ses
 * jours possibles (jour préféré d'abord) encore libre dans son thème. Les plus
 * graves choisissent en premier, tous thèmes confondus. Un seul sujet par
 * famille de sujets voisins (la colère et la dispute, la foi et la religion…).
 * Un thème qui n'a qu'un écart le pose au jour dont l'angle convient ; ses
 * autres jours piochent dans les autres réserves.
 */
function planDivergences(report: DivergenceReport): Map<string, Divergence> {
  const plan = new Map<string, Divergence>();
  const planned = new Set<string>();
  const candidates = THEME_LIST.flatMap((theme) =>
    divergencesForTheme(report, theme),
  );
  // Tri stable : à gravité égale, l'ordre des thèmes, puis celui du moteur.
  const ordered = [...candidates].sort(
    (x, y) => SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity],
  );
  for (const d of ordered) {
    const related = relatedTopics(d);
    if (related.some((k) => planned.has(k))) continue;
    for (const day of topicDays(d)) {
      const slot = `${day}|${d.theme}`;
      if (plan.has(slot)) continue;
      if (!usableDeep(d, day).length && topicTemplates(day, d).length === 0)
        continue;
      plan.set(slot, d);
      for (const k of related) planned.add(k);
      break;
    }
  }
  return plan;
}

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
): Convergence[] {
  const eligible = report.convergences.filter(
    (c) =>
      c.theme === theme &&
      !SELF_DISCLOSURE_QUESTIONS.has(c.questionId) &&
      !SAFETY_QUESTIONS.has(c.questionId) &&
      !taken.has(c.questionId) &&
      isAgreementWorthAsking(c) &&
      topicDays({ ...c, label: c.topic ?? c.label }).includes(day),
  );
  return [
    ...eligible.filter((c) => agreementFor(c).probe),
    ...eligible.filter((c) => !agreementFor(c).probe),
  ];
}

/**
 * Formulations d'un accord : la phrase qui le nomme, puis une question. Sans
 * phrase (risque partagé non signalé), la question propre seule.
 */
function convergenceCandidates(
  day: number,
  c: Convergence,
  seed: string | undefined,
  slot: string,
): PoolTemplate[] {
  const { statement, probe } = agreementFor(c);
  if (!statement) return probe ? [probe] : [];
  const withStatement = (t: PoolTemplate) => ({
    text: `${statement} ${t.text}`,
    options: t.options,
  });
  // Point non négociable (enfants, fidélité, foi…) : on n'éprouve pas la
  // solidité d'un accord que les deux tiennent pour essentiel.
  const strict = isNonNegotiable({ ...c, label: c.topic ?? c.label });
  const generic = CONVERGENT[day].filter(
    (t) => !(strict && t.technique === 'limite'),
  );
  return [
    ...(probe ? [withStatement(probe)] : []),
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
  const plan = planDivergences(report);
  // Sujets déjà abordés ou prévus (et leurs voisins) : on ne les repose pas un
  // autre jour.
  const taken = new Set<string>();
  for (const d of plan.values()) markTaken(taken, d);
  const safetyThemes = new Set(safetyThemesOf(report));
  // Thèmes qui portent un écart non négociable : aucune question du thème qui
  // suppose de « vivre avec » la différence.
  const strictThemes = new Set(
    report.divergences.filter((d) => isNonNegotiable(d)).map((d) => d.theme),
  );

  for (let day = 1; day <= SONDEUR_DAYS; day++) {
    const angle = DAY_ANGLES[day];
    let convergenceToday = 0;
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
      // compromis ni une réconciliation, jamais une question de l'IA. Trois
      // angles distincts : limite, origine, protection. Déjà vues lors d'un
      // parcours précédent : elles reviennent plutôt que de laisser la place
      // à une autre question.
      if (safetyThemes.has(theme)) {
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
          divergenceCandidates(day, divergence, seed, slot),
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
        for (const c of convergencesFor(report, theme, day, taken)) {
          const pick = pickFresh(
            convergenceCandidates(day, c, seed, slot),
            mem,
          );
          if (!pick) continue;
          convergenceToday++;
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
            (t) => !(strictThemes.has(theme) && t.compromise),
          ),
          seed,
          `${slot}|gen`,
        );
        const touches = (t: PoolTemplate) =>
          (t.about ?? []).some((id) => taken.has(id));
        const ordered = [
          ...pool.filter((t) => !touches(t)),
          ...pool.filter(touches),
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

      mem.usedText.add(normalizeKey(question.text));
      mem.usedSig.add(questionSignature(question.text));
      mem.raw.push(question.text);
      result.push(question);
    }
  }

  return result;
}

/** Sujets où une même réponse peut cacher un contrôle (téléphone, jalousie). */
const CONTROL_TOPICS = new Set(['M5_Q08', 'M9_Q11', 'M8_Q10']);

/** Résumé compact du rapport de divergences pour un prompt IA (sans données de contact). */
export function describeReportForAi(
  report: DivergenceReport,
  firstNames: [string, string],
): string {
  const [a, b] = firstNames;
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
          `${head} : LIMITE DE SÉCURITÉ. Jamais négociable : uniquement des questions de limite et de protection, jamais de compromis, de réconciliation ni « comment le rendre vivable ».`,
        );
      } else if (!isQuotableDivergence(d)) {
        lines.push(
          `${head} : tendance tirée de l'entretien, à explorer sans jamais citer les réponses ni un niveau.`,
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
        lines.push(`${head} : même tendance, à explorer sans la citer.`);
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
