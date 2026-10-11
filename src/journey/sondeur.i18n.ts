/**
 * Sondeur bilingue : version anglaise de chaque question servie.
 *
 * Le Sondeur est assemblé une fois pour le couple (mêmes sujets, mêmes jours,
 * même question pour les deux) ; chaque gabarit porte sa version anglaise,
 * rédigée pour sonner naturellement en anglais (et non traduite mot à mot),
 * dans `sondeur.en.generated.ts`. Chaque membre reçoit ensuite la question
 * dans la langue de son interface : deux membres de langues différentes
 * voient la même question, chacun dans sa langue, sans que rien ne révèle la
 * langue ni la réponse de l'autre.
 */
import type { Theme } from '../matching/divergence.engine';
import {
  EN_OPTION,
  EN_PHRASE,
  EN_TEXT,
  EN_TOPIC,
} from './sondeur.en.generated';

export type SondeurLanguage = 'fr' | 'en';

export function parseSondeurLanguage(value: unknown): SondeurLanguage {
  return typeof value === 'string' &&
    value.trim().toLowerCase().startsWith('en')
    ? 'en'
    : 'fr';
}

/** Sujet en anglais, prêt à insérer (« wanting children »). */
export interface EnTopicWords {
  phrase: string;
  cap: string;
}

export const OTHER_FR = 'Autre...';
export const OTHER_EN = 'Other...';

/** Libellés anglais des thèmes (affichés au-dessus des questions). */
export const THEME_LABEL_EN: Record<Theme, string> = {
  famille: 'Family',
  argent: 'Money & debt',
  spiritualite: 'Religion & spirituality',
  intimite: 'Intimacy & sexuality',
  communication: 'Communication & emotions',
  projet: 'Life plans',
  lieu: 'Where to live & mobility',
};

const LABEL_TO_THEME: Record<string, Theme> = {
  Famille: 'famille',
  'Argent & dettes': 'argent',
  'Religion & spiritualité': 'spiritualite',
  'Intimité & sexualité': 'intimite',
  'Communication & émotions': 'communication',
  'Projet de vie': 'projet',
  'Lieu de vie & mobilité': 'lieu',
};

/** Angles des jours (libellé affiché au-dessus des questions du jour). */
const DAY_LABEL_EN: Record<string, string> = {
  'Lignes rouges': 'Red lines',
  'Valeurs profondes': 'Core values',
  'Futur & intimité': 'Future & intimacy',
};

/** Libellé enregistré (angle du jour ou thème, en français) → anglais. */
export function themeLabelEn(label: string): string {
  if (DAY_LABEL_EN[label]) return DAY_LABEL_EN[label];
  const theme = LABEL_TO_THEME[label];
  return theme ? THEME_LABEL_EN[theme] : label;
}

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
const TEXTS = new Map(
  Object.entries(EN_TEXT).map(([fr, en]) => [normalize(fr), en]),
);
const OPTIONS = new Map(
  Object.entries(EN_OPTION).map(([fr, en]) => [normalize(fr), en]),
);
const TOPICS = new Map(EN_TOPIC);

/** Version anglaise d'un texte fixe (question, phrase d'accord), si elle existe. */
export function enText(fr: string): string | undefined {
  return TEXTS.get(normalize(fr));
}

/** Options anglaises, toutes ou aucune (jamais une grille à moitié traduite). */
export function enOptions(fr: string[]): string[] | undefined {
  const out: string[] = [];
  for (const o of fr) {
    if (normalize(o) === OTHER_FR) {
      out.push(OTHER_EN);
      continue;
    }
    const en = OPTIONS.get(normalize(o));
    if (!en) return undefined;
    out.push(en);
  }
  return out;
}

/** Sujet anglais d'une clé de tournure (même clé que TOPIC_PHRASES). */
export function enTopicWords(key: string): EnTopicWords | undefined {
  const phrase = EN_PHRASE[key];
  if (!phrase) return undefined;
  return { phrase, cap: phrase.charAt(0).toUpperCase() + phrase.slice(1) };
}

/** Gabarit à trous anglais correspondant à un gabarit français. */
export function enTopicTemplate(
  frText: (w: never) => string,
): ((w: EnTopicWords) => string) | undefined {
  return TOPICS.get(frText.toString());
}

/** Phrase d'accord suivie de sa relance, dans les deux langues. */
export function joinEn(
  statementEn: string | undefined,
  textEn: string | undefined,
): string | undefined {
  return statementEn && textEn ? `${statementEn} ${textEn}` : undefined;
}

/**
 * Question enregistrée, servie dans la langue du membre. Une question sans
 * version anglaise (antérieure au Sondeur bilingue) reste en français.
 */
export function localizeStoredQuestion<
  Q extends {
    questionText: string;
    options: unknown;
    questionTextEn?: string | null;
    optionsEn?: unknown;
    theme: string;
  },
>(q: Q, lang: SondeurLanguage): Q & { language: SondeurLanguage } {
  if (lang !== 'en' || !q.questionTextEn) return { ...q, language: 'fr' };
  return {
    ...q,
    questionText: q.questionTextEn,
    options: Array.isArray(q.optionsEn) ? q.optionsEn : q.options,
    theme: themeLabelEn(q.theme),
    language: 'en',
  };
}
