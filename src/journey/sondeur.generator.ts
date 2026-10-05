/**
 * Générateur du Sondeur BOLIGO — 21 questions, 3 jours × 7 thèmes fondamentaux.
 *
 * Grille obligatoire : chaque jour couvre les 7 thèmes (famille, argent & dettes,
 * religion & spiritualité, intimité & sexualité, communication & émotions,
 * projet de vie, lieu de vie & mobilité) sous l'angle du jour :
 *   jour 1 — lignes rouges, jour 2 — valeurs profondes, jour 3 — futur & intimité.
 *
 * Chaque question cible en priorité une divergence réelle détectée entre les deux
 * entretiens (moteur de divergences) ; à défaut, un gabarit du thème, personnalisé
 * par les convergences connues. Jamais de questionnaire générique partagé par tous
 * les couples : les gabarits sont instanciés avec les réponses du couple.
 *
 * Une couche IA (Groq / OpenRouter) peut proposer des formulations plus fines ;
 * ses questions ne sont retenues que si elles respectent la grille, le reste est
 * complété ici. Coût : zéro sans IA, quelques millièmes d'euro par parcours avec.
 */
import {
  Divergence,
  DivergenceReport,
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
  EXTRA_GENERIC,
  EXTRA_TARGETED,
  PoolTemplate,
} from './sondeur.pool';

export const SONDEUR_DAYS = 3;
export const SONDEUR_QUESTIONS_PER_DAY = THEME_LIST.length; // 7

export const DAY_ANGLES: Record<
  number,
  { label: string; emoji: string; intent: string }
> = {
  1: {
    label: 'Lignes rouges',
    emoji: '🚩',
    intent: 'ce qui est non négociable',
  },
  2: {
    label: 'Valeurs profondes',
    emoji: '⚖️',
    intent: "d'où viennent vos positions",
  },
  3: {
    label: 'Futur & intimité',
    emoji: '🔮',
    intent: 'comment vous vivrez ce point à deux',
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
}

export interface SondeurQuestion extends HarmonyQuestionPayload {
  themeKey: Theme;
  /**
   * 'divergence' : ciblée sur un écart réel ; 'ia' ; 'convergence' : approfondit
   * un point d'accord réel ; 'gabarit' : question du thème.
   */
  source: 'divergence' | 'ia' | 'convergence' | 'gabarit';
}

// ─── Gabarits ciblés (une divergence réelle existe sur le thème) ──────────────

const TARGETED_B: Record<
  number,
  { text: (d: Divergence) => string; options: string[] }
> = {
  1: {
    text: (d) =>
      `Vous ne voyez pas « ${d.label.toLowerCase()} » de la même façon (« ${d.a.text} » / « ${d.b.text} »). Si rien ne bougeait, pourriez-vous construire quand même ?`,
    options: [
      'Non, ce point me bloquerait',
      'Oui, si le reste est solide',
      'Je ne sais pas encore',
      'Autre...',
    ],
  },
  2: {
    text: (d) =>
      `Qu'est-ce que vous aimeriez que l'autre comprenne de votre réponse sur « ${d.label.toLowerCase()} » (« ${d.a.text} » / « ${d.b.text} ») ?`,
    options: [
      "Que ce n'est pas un caprice mais une valeur",
      "Que j'ai déjà souffert de l'inverse",
      'Que je peux évoluer si on en parle',
      'Autre...',
    ],
  },
  3: {
    text: (d) =>
      `Concrètement, quel premier pas feriez-vous dans les prochains mois pour rapprocher vos positions sur « ${d.label.toLowerCase()} » ?`,
    options: [
      'En parler avec nos proches ou un tiers',
      'Tester une période à sa façon',
      'Poser un cadre écrit à deux',
      'Autre...',
    ],
  },
};

const TARGETED: Record<
  number,
  { text: (d: Divergence) => string; options: string[] }
> = {
  1: {
    text: (d) =>
      `Sur « ${d.label.toLowerCase()} », vos réponses diffèrent : « ${d.a.text} » d'un côté, « ${d.b.text} » de l'autre. Est-ce une ligne rouge pour vous ?`,
    options: [
      'Oui, non négociable',
      'Négociable si on en parle vraiment',
      "Je peux m'adapter sans me trahir",
      'Autre...',
    ],
  },
  2: {
    text: (d) =>
      `« ${d.label} » : l'un de vous a répondu « ${d.a.text} », l'autre « ${d.b.text} ». D'où vient votre position, et qu'est-ce qu'elle protège en vous ?`,
    options: [
      'Mon éducation et ma famille',
      'Mes convictions personnelles',
      'Une expérience passée qui a marqué',
      'Autre...',
    ],
  },
  3: {
    text: (d) =>
      `Dans cinq ans, si vous êtes ensemble, comment aurez-vous réglé votre différence sur « ${d.label.toLowerCase()} » (« ${d.a.text} » / « ${d.b.text} ») ?`,
    options: [
      'On aura construit un compromis clair',
      "L'un de nous aura cédé, et ça ira",
      'Ce sera resté une tension entre nous',
      'Autre...',
    ],
  },
};

// ─── Gabarits par thème (aucune divergence détectée sur le thème) ─────────────

type ThemeTemplates = Record<number, { text: string; options: string[] }>;

const GENERIC: Record<Theme, ThemeTemplates> = {
  famille: {
    1: {
      text: 'Votre famille désapprouve ouvertement votre partenaire. Que faites-vous ?',
      options: [
        "Je défends mon couple, quoi qu'il en coûte",
        'Je cherche à réconcilier les deux',
        'Je prends du recul avant de choisir',
        'Autre...',
      ],
    },
    2: {
      text: 'Quelle place votre famille doit-elle avoir dans les décisions de votre couple ?',
      options: [
        'Consultée, mais nous décidons seuls',
        'Impliquée sur les grands choix',
        'Aucune : notre couple nous appartient',
        'Autre...',
      ],
    },
    3: {
      text: 'Comment imaginez-vous votre foyer dans cinq ans : enfants, parents, rythme de vie ?',
      options: [
        'Un foyer avec enfants et famille proche',
        "Un couple d'abord, le reste viendra",
        'Je ne me projette pas encore',
        'Autre...',
      ],
    },
  },
  argent: {
    1: {
      text: 'Vous découvrez une dette importante que votre partenaire ne vous avait pas dite. Votre réaction ?',
      options: [
        'Rupture de confiance difficile à réparer',
        'On en parle et on construit un plan ensemble',
        "Je l'aide sans le lui reprocher",
        'Autre...',
      ],
    },
    2: {
      text: "Dans le couple, l'argent sert d'abord à quoi, selon vous ?",
      options: [
        "À sécuriser le foyer et l'avenir",
        'À profiter de la vie ensemble',
        'À aider aussi la famille élargie',
        'Autre...',
      ],
    },
    3: {
      text: "Si l'un de vous gagne beaucoup plus que l'autre, comment partagez-vous les dépenses ?",
      options: [
        'Tout en commun, sans compter',
        'Chacun selon ses revenus',
        'Chacun ses dépenses, charges partagées',
        'Autre...',
      ],
    },
  },
  spiritualite: {
    1: {
      text: "Sur la foi ou la spiritualité, qu'est-ce que vous ne pourriez pas accepter chez votre partenaire ?",
      options: [
        "Qu'il ou elle rejette ma pratique",
        "Qu'il ou elle ne partage aucune de mes valeurs",
        "Rien, tant qu'il y a du respect",
        'Autre...',
      ],
    },
    2: {
      text: 'Quelle place votre spiritualité ou vos convictions prennent-elles dans votre quotidien ?',
      options: [
        'Centrale : elle guide mes choix',
        'Importante dans les grands moments',
        'Personnelle et discrète',
        'Autre...',
      ],
    },
    3: {
      text: 'Comment souhaitez-vous transmettre (ou non) vos convictions à vos futurs enfants ?',
      options: [
        'Dans ma tradition, clairement',
        'En leur laissant le choix',
        'On décidera à deux le moment venu',
        'Autre...',
      ],
    },
  },
  intimite: {
    1: {
      text: "En matière d'intimité et de fidélité, quelle est votre limite absolue ?",
      options: [
        'Toute infidélité, même émotionnelle',
        "Le mensonge plus que l'acte",
        'Le manque de respect de mes besoins',
        'Autre...',
      ],
    },
    2: {
      text: "Pour vous, la tendresse et le désir dans un couple, ça s'entretient comment ?",
      options: [
        'Par des gestes et des mots au quotidien',
        'Par des moments à deux préservés',
        'Ça doit rester naturel, sans effort',
        'Autre...',
      ],
    },
    3: {
      text: "Si vos envies d'intimité ne se rejoignent pas à un moment de la vie, que faites-vous ?",
      options: [
        "On en parle sans tabou et on s'ajuste",
        'Je prends sur moi sans le dire',
        'Ce serait un vrai problème pour moi',
        'Autre...',
      ],
    },
  },
  communication: {
    1: {
      text: "Pendant une dispute, quel comportement de l'autre vous ferait quitter la pièce ?",
      options: [
        'Les cris ou les insultes',
        'Le silence et le mépris',
        'Les reproches sur le passé',
        'Autre...',
      ],
    },
    2: {
      text: 'Quand vous êtes blessé(e), de quoi avez-vous besoin en premier ?',
      options: [
        "Qu'on m'écoute sans me couper",
        "Qu'on reconnaisse le tort",
        "D'un peu de temps seul(e)",
        'Autre...',
      ],
    },
    3: {
      text: 'Comment aimeriez-vous que votre couple règle ses désaccords dans cinq ans ?',
      options: [
        'Un rituel de discussion calme',
        "En demandant de l'aide si besoin",
        'En laissant passer, sans drame',
        'Autre...',
      ],
    },
  },
  projet: {
    1: {
      text: "Qu'est-ce qui, dans un projet de vie, vous ferait renoncer à cette relation ?",
      options: [
        "Le refus de s'engager",
        'Des ambitions incompatibles',
        'Un désaccord sur les enfants',
        'Autre...',
      ],
    },
    2: {
      text: 'Pour vous, un engagement sérieux se prouve par quoi ?',
      options: [
        'Des actes concrets au quotidien',
        'Une date et un cadre clairs',
        'La présence dans les moments durs',
        'Autre...',
      ],
    },
    3: {
      text: 'Imaginez votre dimanche idéal dans cinq ans. À quoi ressemble-t-il ?',
      options: [
        'En famille, à la maison',
        'En sortie ou en voyage à deux',
        'Chacun son activité, puis ensemble',
        'Autre...',
      ],
    },
  },
  lieu: {
    1: {
      text: "Votre partenaire obtient une opportunité à l'étranger. Jusqu'où pouvez-vous le ou la suivre ?",
      options: [
        "Je pars, le couple d'abord",
        'Seulement si mon projet y trouve sa place',
        'Je ne quitterai pas ma ville',
        'Autre...',
      ],
    },
    2: {
      text: "Qu'est-ce qui vous rattache le plus à votre lieu de vie actuel ?",
      options: [
        'Ma famille et mes proches',
        'Mon travail et ma stabilité',
        'Rien de décisif, je suis mobile',
        'Autre...',
      ],
    },
    3: {
      text: 'Où vous voyez-vous vivre dans cinq ans, et qui aura choisi ?',
      options: [
        'Là où vit ma famille',
        'Là où nos carrières nous mènent',
        'Un nouveau départ choisi à deux',
        'Autre...',
      ],
    },
  },
};

const GENERIC_B: Record<Theme, ThemeTemplates> = {
  famille: {
    1: {
      text: "Un proche de votre partenaire s'invite chez vous plusieurs semaines sans prévenir. Que faites-vous ?",
      options: [
        "J'accepte, la famille passe avant",
        "J'accepte avec des règles claires",
        "Je refuse : notre foyer d'abord",
        'Autre...',
      ],
    },
    2: {
      text: 'Quel souvenir de votre propre famille voulez-vous absolument reproduire, ou éviter, dans votre couple ?',
      options: [
        'La chaleur et les repas ensemble',
        'Le respect des aînés',
        'Éviter les silences et les non-dits',
        'Autre...',
      ],
    },
    3: {
      text: "Si vous devenez parents, qui s'adapte professionnellement la première année ?",
      options: [
        'Moi, naturellement',
        "L'autre, naturellement",
        "À parts égales, quoi qu'il en coûte",
        'Autre...',
      ],
    },
  },
  argent: {
    1: {
      text: "Votre partenaire envoie chaque mois de l'argent à sa famille sans vous en parler. Votre réaction ?",
      options: [
        "C'est son droit tant que le foyer ne manque de rien",
        'On doit en décider ensemble',
        'Inacceptable sans transparence',
        'Autre...',
      ],
    },
    2: {
      text: "Un cadeau cher ou une épargne commune : lequel vous rassure le plus sur l'engagement de l'autre ?",
      options: [
        "L'épargne commune",
        "Le cadeau, pour l'attention",
        "Ni l'un ni l'autre : la présence",
        'Autre...',
      ],
    },
    3: {
      text: 'Dans cinq ans, comment sont gérés vos comptes ?',
      options: [
        'Un compte commun unique',
        'Trois comptes : le sien, le mien, le nôtre',
        'Séparés, avec une règle de partage',
        'Autre...',
      ],
    },
  },
  spiritualite: {
    1: {
      text: 'Votre partenaire remet en question une de vos pratiques devant votre famille. Que ressentez-vous ?',
      options: [
        'Une trahison difficile à passer',
        'De la gêne, mais on en parle après',
        'Rien de grave, chacun ses idées',
        'Autre...',
      ],
    },
    2: {
      text: "Si votre foi ou vos convictions évoluaient avec le temps, en parleriez-vous à l'autre ?",
      options: [
        'Oui, immédiatement et sans filtre',
        'Oui, une fois sûr(e) de moi',
        'Ce serait mon jardin secret',
        'Autre...',
      ],
    },
    3: {
      text: 'Quelle place prendront vos différences de convictions dans les grandes fêtes et cérémonies ?',
      options: [
        'On honore les deux traditions',
        'On suit la tradition la plus pratiquante',
        'On invente nos propres rituels',
        'Autre...',
      ],
    },
  },
  intimite: {
    1: {
      text: 'Votre partenaire garde des contacts réguliers avec un ex. Où est votre limite ?',
      options: [
        "Aucun contact, c'est clair",
        'Acceptable si tout est transparent',
        'Ça ne me regarde pas',
        'Autre...',
      ],
    },
    2: {
      text: "Qu'est-ce qui vous fait vous sentir vraiment désiré(e) dans une relation ?",
      options: [
        'Les attentions inattendues',
        'Les mots et les compliments',
        'Le temps pris pour moi',
        'Autre...',
      ],
    },
    3: {
      text: 'Dans dix ans, à quoi ressemble la tendresse entre vous ?',
      options: [
        "À la même complicité qu'au début",
        'À une tendresse plus calme mais présente',
        'Je ne sais pas, ça dépendra de la vie',
        'Autre...',
      ],
    },
  },
  communication: {
    1: {
      text: 'Après une dispute, votre partenaire ne vous parle plus pendant deux jours. Que faites-vous ?',
      options: [
        'Je fais le premier pas',
        "J'attends qu'il ou elle revienne",
        'Je pose une limite : pas de silence punitif',
        'Autre...',
      ],
    },
    2: {
      text: 'Quelle phrase aimeriez-vous entendre plus souvent dans votre couple ?',
      options: [
        '« Je comprends ce que tu ressens »',
        '« Tu as raison, excuse-moi »',
        '« On va trouver une solution ensemble »',
        'Autre...',
      ],
    },
    3: {
      text: 'Si un sujet revient sans cesse entre vous sans solution, que proposez-vous ?',
      options: [
        'Un temps dédié chaque semaine pour en parler',
        "Demander l'aide d'un tiers",
        'Accepter le désaccord et avancer',
        'Autre...',
      ],
    },
  },
  projet: {
    1: {
      text: "Votre partenaire veut repousser l'engagement de plusieurs années. Votre réaction ?",
      options: [
        'Je ne peux pas attendre sans date',
        "J'attends si le projet reste clair",
        "Le temps ne compte pas si l'amour est là",
        'Autre...',
      ],
    },
    2: {
      text: "Qu'est-ce qui compte le plus pour vous dans un projet à deux : la sécurité, l'aventure ou la transmission ?",
      options: [
        'La sécurité et la stabilité',
        "L'aventure et la découverte",
        'Transmettre et bâtir pour la suite',
        'Autre...',
      ],
    },
    3: {
      text: "Quel projet aimeriez-vous avoir réalisé ensemble d'ici cinq ans ?",
      options: [
        'Un foyer ou un bien à nous',
        'Un voyage ou une expérience marquante',
        'Un engagement officiel',
        'Autre...',
      ],
    },
  },
  lieu: {
    1: {
      text: 'Vivre à distance plusieurs mois pour une raison professionnelle : envisageable pour vous ?',
      options: [
        'Non, je veux une vie commune au quotidien',
        "Oui, si c'est limité et planifié",
        'Oui, la confiance suffit',
        'Autre...',
      ],
    },
    2: {
      text: "Entre votre ville, celle de l'autre et un lieu neutre, laquelle vous semble la plus juste pour s'installer ?",
      options: [
        'Ma ville, pour mes repères',
        "La sienne, si c'est mieux pour nous",
        'Un lieu neutre choisi ensemble',
        'Autre...',
      ],
    },
    3: {
      text: 'Comment imaginez-vous votre maison idéale dans cinq ans ?',
      options: [
        'Proche de nos familles',
        'En ville, près du travail',
        "Au calme, loin de l'agitation",
        'Autre...',
      ],
    },
  },
};

// ─── Assemblage ────────────────────────────────────────────────────────────────

/** Au plus deux questions d'accord par jour : le Sondeur reste centré sur les écarts. */
const MAX_CONVERGENCE_PER_DAY = 2;

function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Signature d'une question : le texte sans les réponses citées entre « » ni la
 * ponctuation. Deux questions bâties sur le même gabarit avec des réponses
 * différentes ont la même signature : un membre ne les verra qu'une fois.
 */
export function questionSignature(text: string): string {
  return text
    .toLowerCase()
    .replace(/«[^»]*»/g, '«»')
    .replace(/\([^)]*«»[^)]*\)/g, '')
    .replace(/[^a-zàâäçéèêëîïôöùûüÿœæ«» ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
}

/**
 * Choisit la formulation la plus neuve, par ordre de préférence :
 * 1. gabarit jamais vu par les membres et pas encore utilisé dans ce Sondeur ;
 * 2. gabarit jamais vu, déjà utilisé ici sur un autre sujet ;
 * 3. gabarit déjà vu mais texte nouveau (appliqué à d'autres réponses) ;
 * Retourne null si seuls des textes déjà posés restent disponibles.
 */
function pickFresh(candidates: PoolTemplate[], mem: Memory): PoolTemplate | null {
  const tiers: Array<(c: PoolTemplate, sig: string, key: string) => boolean> = [
    (_c, sig) => !mem.seenSig.has(sig) && !mem.usedSig.has(sig),
    (_c, sig, key) => !mem.seenSig.has(sig) && !mem.usedText.has(key),
    (_c, sig, key) => !mem.seenText.has(key) && !mem.usedSig.has(sig),
    (_c, _sig, key) => !mem.seenText.has(key) && !mem.usedText.has(key),
  ];
  for (const ok of tiers) {
    const hit = candidates.find((c) => ok(c, questionSignature(c.text), normalizeKey(c.text)));
    if (hit) return hit;
  }
  return null;
}

/** Divergences d'un thème, de la plus grave à la moins grave (mineures exclues). */
function divergencesForTheme(
  report: DivergenceReport,
  theme: Theme,
): Divergence[] {
  return report.divergences.filter(
    (d) => d.theme === theme && d.severity !== 'mineure',
  );
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
      !mem.seenSig.has(questionSignature(q.text)),
  );
  return candidate ?? null;
}

/** Les cinq formulations d'un créneau sans divergence. */
function genericPool(theme: Theme, day: number): PoolTemplate[] {
  return [GENERIC[theme][day], GENERIC_B[theme][day], ...EXTRA_GENERIC[theme][day]];
}

/** Les quatre formulations ciblées d'un jour, appliquées à une divergence. */
function targetedPool(day: number, d: Divergence): PoolTemplate[] {
  return [TARGETED[day], TARGETED_B[day], ...EXTRA_TARGETED[day]].map((t) => ({
    text: t.text(d),
    options: t.options,
  }));
}

/**
 * Construit exactement 21 questions (3 jours × 7 thèmes), ordre : jour puis thème.
 * Priorité par créneau : divergence réelle → question IA conforme → point
 * d'accord réel → question du thème. Dans chaque réserve, la formulation retenue
 * est une que ni l'un ni l'autre membre n'a déjà vue.
 */
export function assembleSondeur(input: SondeurInput): SondeurQuestion[] {
  const { report, aiQuestions, avoidTexts = [], history = [], seed } = input;
  const past = [...avoidTexts, ...history];
  const mem: Memory = {
    seenSig: new Set(past.map(questionSignature)),
    seenText: new Set(past.map(normalizeKey)),
    usedSig: new Set(),
    usedText: new Set(),
  };
  const ai = aiQuestions ?? [];
  const result: SondeurQuestion[] = [];

  for (let day = 1; day <= SONDEUR_DAYS; day++) {
    const angle = DAY_ANGLES[day];
    let convergenceToday = 0;
    for (const theme of THEME_LIST) {
      const slot = `${day}|${theme}`;
      const base = { day, theme: angle.label, emoji: THEMES[theme].emoji, themeKey: theme };
      const divs = divergencesForTheme(report, theme);
      // Jour 1 → divergence la plus grave, jour 2 → la suivante, jour 3 → la suivante (cyclique).
      const divergence = divs.length ? divs[(day - 1) % divs.length] : null;
      let question: SondeurQuestion | null = null;

      if (divergence) {
        const pick = pickFresh(arrange(targetedPool(day, divergence), seed, `${slot}|div`), mem);
        if (pick) {
          question = {
            ...base,
            text: pick.text,
            options: ensureAutreOption(pick.options),
            source: 'divergence',
          };
        }
      }

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

      if (!question && convergenceToday < MAX_CONVERGENCE_PER_DAY) {
        const convs = report.convergences.filter((c) => c.theme === theme);
        const convergence = convs.length ? convs[(day - 1) % convs.length] : null;
        if (convergence) {
          const pool = CONVERGENT[day].map((t) => ({ text: t.text(convergence), options: t.options }));
          const pick = pickFresh(arrange(pool, seed, `${slot}|conv`), mem);
          if (pick) {
            convergenceToday++;
            question = {
              ...base,
              text: pick.text,
              options: ensureAutreOption(pick.options),
              source: 'convergence',
            };
          }
        }
      }

      if (!question) {
        const pool = arrange(genericPool(theme, day), seed, `${slot}|gen`);
        // Réserve épuisée (au-delà de cinq parcours) : une formulation déjà vue revient.
        const tpl =
          pickFresh(pool, mem) ??
          pool.find((t) => !mem.usedText.has(normalizeKey(t.text))) ??
          pool[0];
        question = {
          ...base,
          text: tpl.text,
          options: ensureAutreOption(tpl.options),
          source: 'gabarit',
        };
      }

      mem.usedText.add(normalizeKey(question.text));
      mem.usedSig.add(questionSignature(question.text));
      result.push(question);
    }
  }

  return result;
}

/** Résumé compact du rapport de divergences pour un prompt IA (sans données de contact). */
export function describeReportForAi(
  report: DivergenceReport,
  firstNames: [string, string],
): string {
  const [a, b] = firstNames;
  const lines: string[] = [];
  lines.push(
    `Questions comparées : ${report.comparedQuestions}. Incompatibilité déclarée : ${report.hardStop ? 'oui' : 'non'}.`,
  );
  if (report.divergences.length) {
    lines.push('DIVERGENCES (de la plus grave à la moins grave) :');
    for (const d of report.divergences.slice(0, 12)) {
      lines.push(
        `- [${d.severity}] ${THEMES[d.theme].label} — ${d.label} : ${a} « ${d.a.text} » / ${b} « ${d.b.text} »`,
      );
    }
  } else {
    lines.push('Aucune divergence notable détectée dans les entretiens.');
  }
  if (report.convergences.length) {
    lines.push('CONVERGENCES :');
    for (const c of report.convergences.slice(0, 6))
      lines.push(`- ${THEMES[c.theme].label} — ${c.label}`);
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
