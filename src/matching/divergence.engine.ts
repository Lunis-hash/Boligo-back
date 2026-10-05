/**
 * Moteur de divergences BOLIGO — déterministe, sans IA, coût nul.
 *
 * Compare les réponses brutes de deux membres aux questions du Grand Entretien
 * (clé d'option par identifiant de question) et en déduit :
 *  - les divergences, classées par gravité (critique > majeure > modérée > mineure),
 *    rattachées aux 7 thèmes fondamentaux de BOLIGO ;
 *  - les convergences (« ce qui vous rassemble ») ;
 *  - une pénalité de score bornée et un drapeau « incompatibilité déclarée » ;
 *  - une fiche de compatibilité et des sujets de discussion prêts à afficher.
 *
 * Inspiration : lignes rouges et besoins fondamentaux (Gottman), styles
 * d'attachement (Bowlby), valeurs et projet de vie partagés.
 */
import { QUESTIONS } from '../interview/questions.data';
import { psychometricDivergences } from '../psychometrics/psychometrics';

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
}

export interface Convergence {
  questionId: string;
  theme: Theme;
  label: string;
  answer: string;
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
}

/** Gravité d'une paire de réponses ; `null` = compatible / convergent. */
type SeverityFn = (a: string, b: string) => Severity | null;

interface Rule {
  questionId: string;
  theme: Theme;
  label: string;
  severity: SeverityFn;
  /** Libellé quand les deux réponses sont identiques (sinon libellé générique). */
  convergence?: Partial<Record<string, string>>;
  /**
   * Même réponse des deux côtés mais risque réel (questionnaire V5 : « signal
   * rouge si deux D → impasse de réparation »).
   */
  sameRisk?: Partial<Record<string, Severity>>;
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

/**
 * Règles par question. Les clés d'options correspondent à `questions.data.ts`.
 * Toute question absente d'ici est ignorée par le moteur (pas de divergence).
 */
export const DIVERGENCE_RULES: Rule[] = [
  // ── Lieu de vie & mobilité
  {
    questionId: 'M0_Q03',
    theme: 'lieu',
    label: 'Déménager pour le couple',
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
    severity: (a, b) =>
      a === b || a === 'D' || b === 'D'
        ? null
        : pairs({ AC: 'majeure', BC: 'moderee', AB: 'moderee' })(a, b),
    convergence: {
      A: 'Vous vous voyez tous les deux rester dans votre ville',
      C: "Vous envisagez tous les deux une vie à l'étranger",
    },
  },

  // ── Famille
  {
    questionId: 'M0_Q06',
    theme: 'famille',
    label: "Désir d'enfants",
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
    severity: pairs({ AC: 'moderee', AB: 'mineure', AD: 'mineure' }, 'mineure'),
  },
  {
    questionId: 'M3_Q04',
    theme: 'famille',
    label: 'Famille recomposée',
    severity: pairs({ AC: 'moderee', AB: 'mineure', BC: 'mineure' }),
  },
  {
    questionId: 'M5_Q01',
    theme: 'famille',
    label: 'Place de la famille dans les décisions',
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
    questionId: 'M5_Q03',
    theme: 'famille',
    label: 'Cohabitation avec la belle-famille',
    severity: pairs({
      BC: 'majeure',
      AB: 'moderee',
      BD: 'moderee',
      AC: 'mineure',
      CD: 'mineure',
      AD: 'mineure',
    }),
  },
  {
    questionId: 'M5_Q07',
    theme: 'famille',
    label: 'Fréquence des visites familiales',
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
    questionId: 'M1_Q10',
    theme: 'famille',
    label: 'Rôle des anciens',
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
    questionId: 'M1_Q15',
    theme: 'famille',
    label: 'Si la famille désapprouve',
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
    label: 'Dot ou Mahr',
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
    convergence: { A: 'La dot ou le Mahr compte pour vous deux' },
  },
  {
    questionId: 'M3_Q05',
    theme: 'famille',
    label: "Place de l'ex",
    severity: pairs({
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
  },

  // ── Argent & dettes
  {
    questionId: 'M4_Q01',
    theme: 'argent',
    label: 'Argent du couple',
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
    questionId: 'M4_Q03',
    theme: 'argent',
    label: "Rôle économique de l'homme",
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
    questionId: 'M4_Q08',
    theme: 'argent',
    label: 'Épargne du couple',
    severity: pairs({
      AB: 'moderee',
      AD: 'moderee',
      BC: 'mineure',
      AC: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
  },
  {
    questionId: 'M4_Q09',
    theme: 'argent',
    label: 'Transparence sur les dettes',
    severity: pairs({ AC: 'moderee', AB: 'mineure', BC: 'mineure' }, 'mineure'),
  },
  {
    questionId: 'M4_Q06',
    theme: 'projet',
    label: 'Projet immobilier',
    severity: pairs({
      AB: 'moderee',
      BD: 'moderee',
      AC: 'mineure',
      AD: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    }),
  },

  // ── Religion & spiritualité
  {
    questionId: 'M1_Q03',
    theme: 'spiritualite',
    label: 'Traditions de mariage',
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
    questionId: 'M1_Q09',
    theme: 'spiritualite',
    label: 'Interdits alimentaires',
    severity: pairs({
      AC: 'moderee',
      AD: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Vous respectez tous les deux des interdits alimentaires',
    },
  },
  {
    questionId: 'M8_Q03',
    theme: 'spiritualite',
    label: 'Vision du mariage',
    severity: pairs({
      AD: 'majeure',
      AB: 'moderee',
      CD: 'moderee',
      BD: 'moderee',
      AC: 'mineure',
      BC: 'mineure',
    }),
    convergence: {
      A: 'Le mariage est pour vous deux un acte religieux et spirituel',
      C: 'Vous voulez tous les deux un mariage civil et religieux',
    },
  },
  {
    questionId: 'M1_Q06',
    theme: 'spiritualite',
    label: 'Place de la foi dans le couple',
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
  },
  {
    questionId: 'M1_Q11',
    theme: 'spiritualite',
    label: 'Polygamie',
    severity: (a, b) =>
      a === b || a === 'D' || b === 'D'
        ? null
        : pairs({ AC: 'critique', BC: 'majeure', AB: 'mineure' })(a, b),
    convergence: { A: 'Monogamie exclusive pour vous deux' },
  },

  // ── Intimité & sexualité
  {
    questionId: 'M6_Q10',
    theme: 'intimite',
    label: 'Fidélité',
    severity: pairs({
      AC: 'critique',
      AD: 'critique',
      BD: 'majeure',
      BC: 'moderee',
      CD: 'mineure',
      AB: 'mineure',
    }),
    convergence: {
      A: 'La fidélité est absolue et non négociable pour vous deux',
    },
  },
  {
    questionId: 'M6_Q06',
    theme: 'intimite',
    label: 'Place de la sexualité',
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
    questionId: 'M6_Q07',
    theme: 'intimite',
    label: "Rythme d'intimité",
    severity: (a, b) =>
      a === b || a === 'D' || b === 'D'
        ? null
        : pairs({ AC: 'majeure', AB: 'moderee', BC: 'mineure' })(a, b),
  },
  {
    questionId: 'M9_Q07',
    theme: 'intimite',
    label: 'Tendresse et affection',
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
    questionId: 'M5_Q04',
    theme: 'intimite',
    label: 'Amitiés avec le sexe opposé',
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
    questionId: 'M5_Q08',
    theme: 'intimite',
    label: 'Téléphone et confiance',
    severity: pairs({ AB: 'moderee', AC: 'mineure', BC: 'mineure' }, 'mineure'),
  },

  // ── Communication & émotions (attachement)
  {
    questionId: 'M2_Q03',
    theme: 'communication',
    label: 'Besoin relationnel fondamental',
    severity: pairs({ AB: 'majeure', AC: 'mineure', BC: 'mineure' }, 'mineure'),
    convergence: {
      C: "Vous cherchez tous les deux l'équilibre entre intimité et liberté",
      A: 'Vous avez tous les deux besoin de vous sentir en sécurité',
    },
  },
  {
    questionId: 'M2_Q01',
    theme: 'communication',
    label: "Réaction à l'absence de réponse",
    severity: pairs({
      AD: 'moderee',
      BD: 'mineure',
      CD: 'mineure',
      AB: 'mineure',
      AC: 'mineure',
      BC: 'mineure',
    }),
  },
  {
    questionId: 'M2_Q02',
    theme: 'communication',
    label: 'Demande de proximité',
    severity: pairs({
      AC: 'moderee',
      CD: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
      AD: 'mineure',
      BD: 'mineure',
    }),
  },
  {
    questionId: 'M2_Q06',
    theme: 'communication',
    label: 'Expression de la colère',
    // Deux silences punitifs : personne ne relance.
    sameRisk: { D: 'moderee' },
    severity: pairs({
      AD: 'moderee',
      AC: 'moderee',
      BD: 'moderee',
      CD: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
    }),
  },
  {
    questionId: 'M6_Q01',
    theme: 'communication',
    label: 'Comportement en dispute',
    // V5 : « signal rouge si deux D → impasse certaine ».
    sameRisk: { D: 'majeure', C: 'moderee' },
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
  },
  {
    questionId: 'M2_Q07',
    theme: 'communication',
    label: 'Temps pour se réconcilier',
    severity: pairs({
      AD: 'moderee',
      CD: 'moderee',
      AC: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
      BD: 'mineure',
    }),
    // V5 : « signal rouge si deux D → impasse de réparation certaine ».
    sameRisk: { D: 'majeure', C: 'moderee' },
    convergence: {
      A: 'Vous ne laissez ni l’un ni l’autre traîner une dispute',
    },
  },
  {
    questionId: 'M2_Q08',
    theme: 'communication',
    label: 'S’excuser en premier',
    severity: pairs(
      { AD: 'moderee', BD: 'mineure', CD: 'mineure', AC: 'mineure' },
      'mineure',
    ),
    sameRisk: { D: 'majeure', C: 'moderee' },
    convergence: {
      A: 'L’harmonie passe avant l’ego pour vous deux',
    },
  },
  {
    questionId: 'M6_Q04',
    theme: 'communication',
    label: 'Limite face à la violence physique',
    severity: pairs({
      AC: 'majeure',
      AD: 'moderee',
      BC: 'moderee',
      AB: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'La violence physique est pour vous deux une limite absolue',
    },
  },
  {
    questionId: 'M6_Q05',
    theme: 'communication',
    label: 'Mots blessants en dispute',
    severity: pairs({
      AC: 'majeure',
      AD: 'moderee',
      BC: 'moderee',
      AB: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
    convergence: {
      A: 'Les insultes sont une limite absolue pour vous deux',
    },
  },
  {
    questionId: 'M8_Q06',
    theme: 'communication',
    label: 'Style de communication',
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
    severity: pairs({ AD: 'moderee', AC: 'mineure', BD: 'mineure' }, 'mineure'),
    // V5 : « C+D = ressentiment latent probable ».
    sameRisk: { D: 'moderee' },
    convergence: { A: 'Vous donnez tous les deux sans compter' },
  },
  {
    questionId: 'M6_Q03',
    theme: 'communication',
    label: 'Besoin de gagner le débat',
    severity: cross(['D'], ['A', 'B', 'C'], 'moderee'),
  },
  {
    questionId: 'M6_Q11',
    theme: 'communication',
    label: 'Réconciliation après dispute',
    severity: pairs({ AD: 'mineure', BD: 'mineure', CD: 'mineure' }, 'mineure'),
  },
  {
    questionId: 'M9_Q04',
    theme: 'communication',
    label: 'Gestion de la frustration',
    sameRisk: { D: 'moderee' },
    severity: pairs({ AD: 'moderee', AC: 'mineure', BD: 'mineure' }, 'mineure'),
  },
  {
    questionId: 'M9_Q01',
    theme: 'communication',
    label: 'Prise de décision',
    severity: pairs({ AB: 'moderee', BC: 'mineure', AC: 'mineure' }, 'mineure'),
  },
  {
    questionId: 'M9_Q02',
    theme: 'communication',
    label: "Philosophie de l'effort",
    severity: pairs(
      { AB: 'moderee', AC: 'moderee', AD: 'mineure', BC: 'mineure' },
      'mineure',
    ),
  },
  {
    questionId: 'M9_Q06',
    theme: 'communication',
    label: 'Rapport au sacrifice',
    severity: pairs({ AD: 'moderee', AC: 'mineure', BD: 'mineure' }, 'mineure'),
  },
  {
    questionId: 'M8_Q04',
    theme: 'communication',
    label: "Langage de l'amour",
    severity: (a, b) => (a === b ? null : 'mineure'),
  },

  // ── Projet de vie
  {
    questionId: 'M8_Q01',
    theme: 'projet',
    label: 'Objectif de rencontre',
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
    questionId: 'M7_Q01',
    theme: 'projet',
    label: 'Vie rêvée dans cinq ans',
    severity: pairs({
      AC: 'majeure',
      BC: 'moderee',
      CD: 'moderee',
      AB: 'mineure',
      AD: 'mineure',
      BD: 'mineure',
    }),
  },
  {
    questionId: 'M7_Q02',
    theme: 'projet',
    label: 'Ambition professionnelle',
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
    questionId: 'M0_Q08',
    theme: 'projet',
    label: 'Tabac, alcool, substances',
    // « Rédhibitoire — je ne pourrais pas vivre avec » face à « Je consomme moi-même ».
    severity: pairs({
      AC: 'critique',
      AB: 'mineure',
      AD: 'moderee',
      BC: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    }),
  },

  // ── V6.1 : argent pendant la fréquentation et dans l'adversité
  {
    questionId: 'M4_Q10',
    theme: 'argent',
    label: 'Qui paie au premier rendez-vous',
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
    severity: pairs(
      { AD: 'majeure', AC: 'moderee', AB: 'mineure', BD: 'mineure' },
      null,
    ),
  },
  {
    questionId: 'M4_Q13',
    theme: 'lieu',
    label: 'Partage des affaires personnelles',
    severity: pairs({ AD: 'moderee', AC: 'mineure', BD: 'mineure' }, null),
    convergence: { A: 'Pour vous deux, ce qui est à l’un est à l’autre' },
  },
  {
    questionId: 'M8_Q11',
    theme: 'projet',
    label: 'Prendre soin de l’autre dans la maladie',
    severity: pairs({ AD: 'moderee', AC: 'mineure', BD: 'mineure' }, null),
    convergence: {
      A: 'Pour vous deux, c’est pour le meilleur et pour le pire',
    },
  },
  {
    questionId: 'M10_Q15',
    theme: 'intimite',
    label: 'Rythme de l’attirance',
    // L'attirance évolue avec la connaissance de l'autre (Hunt, Eastwick &
    // Finkel, 2015) : un coup de foudre exigé face à une attirance qui se
    // construit est à aborder tôt.
    severity: pairs({ AC: 'moderee', AB: 'mineure' }, null),
  },
];

/** Règles croisées : la gravité dépend de deux questions (culture, religion). */
function crossRules(a: RawAnswers, b: RawAnswers): Divergence[] {
  const out: Divergence[] = [];
  const view = (id: string, key: string): AnswerView => ({
    key,
    text: optionText(id, key),
  });

  // Religion : « même foi obligatoire » (M1_Q06 = A) alors que les religions (M1_Q05) diffèrent.
  if (a.M1_Q05 && b.M1_Q05 && a.M1_Q05 !== b.M1_Q05) {
    const wantsSameFaith = a.M1_Q06 === 'A' || b.M1_Q06 === 'A';
    const wantsRespect = a.M1_Q06 === 'B' || b.M1_Q06 === 'B';
    const oneIsAtheist = a.M1_Q05 === 'E' || b.M1_Q05 === 'E';
    const severity: Severity = wantsSameFaith
      ? 'critique'
      : wantsRespect && oneIsAtheist
        ? 'majeure'
        : wantsRespect
          ? 'moderee'
          : 'mineure';
    out.push({
      questionId: 'M1_Q05',
      theme: 'spiritualite',
      severity,
      label: 'Religion et place de la foi dans le couple',
      question: questionText('M1_Q05'),
      a: view('M1_Q05', a.M1_Q05),
      b: view('M1_Q05', b.M1_Q05),
    });
  }

  // Culture : l'un veut « la même culture » (M1_Q02 = A) alors que les origines (M1_Q01) diffèrent.
  if (
    a.M1_Q01 &&
    b.M1_Q01 &&
    a.M1_Q01 !== b.M1_Q01 &&
    (a.M1_Q02 === 'A' || b.M1_Q02 === 'A')
  ) {
    out.push({
      questionId: 'M1_Q02',
      theme: 'famille',
      severity: 'majeure',
      label: 'Culture du partenaire idéal',
      question: questionText('M1_Q02'),
      a: view('M1_Q01', a.M1_Q01),
      b: view('M1_Q01', b.M1_Q01),
    });
  }

  // Tabac : ce que l'un refuse chez l'autre (M0_Q08) face à ce que l'autre fait
  // (M0_Q09). Un fumeur qui a répondu « sans importance » pour l'autre est donc
  // repéré. Les entretiens antérieurs à M0_Q09 restent couverts par la règle
  // M0_Q08 (« je consomme moi-même ») : pas de double comptage.
  const smoke = smokingDivergence(a, b, view);
  if (smoke) out.push(smoke);

  return out;
}

/** Fumeur (M0_Q09), occasionnel ou régulier. */
function smokes(x: RawAnswers): boolean {
  return x.M0_Q09 === 'B' || x.M0_Q09 === 'C';
}

function smokingDivergence(
  a: RawAnswers,
  b: RawAnswers,
  view: (id: string, key: string) => AnswerView,
): Divergence | null {
  for (const [refuser, smoker, refuserIsA] of [
    [a, b, true],
    [b, a, false],
  ] as const) {
    if (!smokes(smoker) || smoker.M0_Q08 === 'C') continue;
    const severity: Severity | null =
      refuser.M0_Q08 === 'A'
        ? 'critique'
        : refuser.M0_Q08 === 'B' && smoker.M0_Q09 === 'C'
          ? 'moderee'
          : null;
    if (!severity) continue;
    const refusal = view('M0_Q08', refuser.M0_Q08);
    const habit = view('M0_Q09', smoker.M0_Q09);
    return {
      questionId: 'M0_Q09',
      theme: 'projet',
      severity,
      label: 'Tabac',
      question: questionText('M0_Q09'),
      a: refuserIsA ? refusal : habit,
      b: refuserIsA ? habit : refusal,
    };
  }
  return null;
}

const QUESTION_INDEX = new Map(QUESTIONS.map((q) => [q.id, q]));

export function questionText(questionId: string): string {
  return QUESTION_INDEX.get(questionId)?.text ?? questionId;
}

export function optionText(questionId: string, key: string): string {
  return (
    QUESTION_INDEX.get(questionId)?.options.find((o) => o.key === key)?.text ??
    key
  );
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

export function buildDivergenceReport(
  a: RawAnswers,
  b: RawAnswers,
): DivergenceReport {
  const divergences: Divergence[] = [];
  const convergences: Convergence[] = [];
  let compared = 0;

  for (const rule of DIVERGENCE_RULES) {
    const ka = a[rule.questionId];
    const kb = b[rule.questionId];
    if (!ka || !kb) continue;
    compared++;
    const sameRisk = ka === kb ? rule.sameRisk?.[ka] : undefined;
    const severity = sameRisk ?? rule.severity(ka, kb);
    if (severity === null) {
      if (ka === kb) {
        convergences.push({
          questionId: rule.questionId,
          theme: rule.theme,
          label:
            rule.convergence?.[ka] ??
            `Même réponse sur « ${rule.label.toLowerCase()} »`,
          answer: optionText(rule.questionId, ka),
        });
      }
      continue;
    }
    divergences.push({
      questionId: rule.questionId,
      theme: rule.theme,
      severity,
      label: rule.label,
      question: questionText(rule.questionId),
      a: { key: ka, text: optionText(rule.questionId, ka) },
      b: { key: kb, text: optionText(rule.questionId, kb) },
      ...(sameRisk ? { shared: true } : {}),
    });
  }

  divergences.push(...crossRules(a, b));
  // Échelles V6 (attachement, dispute) : tendances croisées des deux membres.
  divergences.push(...psychometricDivergences(a, b, divergences));

  // Ligne rouge déclarée (M8_Q05 = « Désaccord profond sur les enfants ou la
  // religion ») : un désaccord majeur sur ces deux sujets devient une incompatibilité.
  if (a.M8_Q05 === 'C' || b.M8_Q05 === 'C') {
    for (const d of divergences) {
      if (
        d.severity === 'majeure' &&
        (d.questionId === 'M0_Q06' || d.questionId === 'M1_Q05')
      ) {
        d.severity = 'critique';
      }
    }
  }

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

  const themes: ThemeSummary[] = THEME_LIST.map((theme) => {
    const divs = divergences.filter((d) => d.theme === theme);
    const convs = convergences.filter((c) => c.theme === theme);
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
    comparedQuestions: compared,
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
    vigilance = top.shared
      ? `${intensity} — ${top.label.toLowerCase()} : vous avez répondu tous les deux « ${top.a.text} ». À aborder franchement pendant le Sondeur.`
      : `${intensity} — ${top.label.toLowerCase()} : vous avez répondu « ${top.a.text} », ${partnerFirstName} a répondu « ${top.b.text} ». À aborder franchement pendant le Sondeur.`;
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
