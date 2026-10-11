/**
 * Sondeur bilingue : couverture anglaise des gabarits, forme des questions
 * anglaises, contrôles de fidélité (validateEn) et couple de langues mixtes.
 */
import { buildDivergenceReport } from '../matching/divergence.engine';
import { QUESTIONS } from '../interview/questions.data';
import { V82_QUESTIONS } from '../interview/questions.v82';
import { assembleSondeur } from './sondeur.generator';
import {
  EvidenceItem,
  EvidencedQuestion,
  validateEn,
} from './sondeur-evidence';
import {
  enOptions,
  enText,
  localizeStoredQuestion,
  parseSondeurLanguage,
  themeLabelEn,
} from './sondeur.i18n';

type Q = { id: string; options: { key: string; freeText?: boolean }[] };

function couples(qs: readonly Q[], n: number, seed: number) {
  let a = seed;
  const r = () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
  const fill = () =>
    Object.fromEntries(
      qs
        .filter((q) => q.options.length)
        .map((q) => {
          const opts = q.options.filter((o) => !o.freeText);
          return [q.id, opts[Math.floor(r() * opts.length)].key];
        }),
    );
  return Array.from({ length: n }, (_, i) =>
    assembleSondeur({
      report: buildDivergenceReport(fill(), fill()),
      firstNames: ['A', 'B'],
      seed: `c${seed}-${i}`,
    }),
  );
}

const FRENCH = /\b(?:vous|votre|vos|quel(?:le)?s?|pour|avec|dans|est-ce)\b/i;

describe('Sondeur bilingue — gabarits', () => {
  const served = [
    ...couples(QUESTIONS as unknown as Q[], 60, 7),
    ...couples(V82_QUESTIONS as unknown as Q[], 60, 82),
  ].flat();

  it('chaque question assemblée (V7.1 et V8.2) a sa version anglaise complète', () => {
    expect(served.length).toBeGreaterThan(1000);
    const missing = served.filter((q) => !q.textEn || !q.optionsEn);
    expect(missing.map((q) => q.text)).toEqual([]);
  });

  it('même nombre d’options, « Autre... » conservé à sa place, une seule question terminée par « ? »', () => {
    for (const q of served) {
      expect(q.optionsEn).toHaveLength(q.options.length);
      q.options.forEach((o, i) => {
        if (o === 'Autre...') expect(q.optionsEn![i]).toBe('Other...');
      });
      expect(q.textEn!.trim().endsWith('?')).toBe(true);
      expect(FRENCH.test(q.textEn!)).toBe(false);
    }
  });

  it('options : toutes traduites ou aucune (jamais une grille à moitié anglaise)', () => {
    expect(
      enOptions(['Oui, clairement', 'Option inconnue xyz']),
    ).toBeUndefined();
    expect(enText('Texte qui n’existe dans aucun gabarit')).toBeUndefined();
  });
});

describe('Sondeur bilingue — contrôles de fidélité (validateEn)', () => {
  const index: EvidenceItem[] = [
    {
      id: 'E1',
      theme: 'famille',
      kind: 'divergence',
      subjects: ['M1_Q01'],
      topic: 'Accueillir un proche',
      privateTexts: ['I would never host my parents long term'],
    },
    {
      id: 'N-famille',
      theme: 'famille',
      kind: 'neutral',
      subjects: [],
      topic: 'famille',
      privateTexts: [],
    },
  ];
  const q = (evidence: string[]): EvidencedQuestion => ({
    day: 1,
    themeKey: 'famille',
    text: 'Quelle place voulez-vous donner à vos proches ?',
    evidence,
    claim: 'neutral',
  });

  it('accepte une question anglaise naturelle et fondée', () => {
    expect(
      validateEn(
        'How much room do you want family to have in your home life?',
        q(['N-famille']),
        index,
      ).ok,
    ).toBe(true);
  });

  it.each([
    [undefined, 'EN1'],
    ['How do you see family? And money?', 'EN2'],
    ['Quelle place pour vos proches ?', 'EN3'],
    ['What makes you two disagree about family?', 'EN4'],
    ['Since you both agree on family, what comes next?', 'EN4'],
    ['Where does your fear of your in-laws come from?', 'EN5'],
    ['Why did one of you answer differently about family?', 'EN6'],
    ['Your partner said family comes first: what about you?', 'EN6'],
  ])('rejette %p (%s)', (text, code) => {
    const v = validateEn(text, q(['N-famille']), index);
    expect(v.ok).toBe(false);
    expect(v.reasons.join(' ')).toContain(code);
  });

  it('rejette une question qui reprend la réponse anglaise d’un membre (EN7)', () => {
    const v = validateEn(
      'What if I would never host my parents long term — how would you react?',
      q(['E1']),
      index,
    );
    expect(v.ok).toBe(false);
    expect(v.reasons.join(' ')).toContain('EN7');
  });
});

describe('Sondeur bilingue — couple de langues mixtes', () => {
  const stored = {
    id: 'h1',
    questionText: 'Quelle place voulez-vous donner à vos proches ?',
    options: ['Beaucoup', 'Un peu', 'Autre...'],
    questionTextEn: 'How much room do you want family to have?',
    optionsEn: ['A lot', 'A little', 'Other...'],
    theme: 'Lignes rouges',
    answerA: null,
    answerB: null,
  };

  it('chaque membre reçoit la même question dans sa langue, sans autre différence', () => {
    const fr = localizeStoredQuestion(stored, 'fr');
    const en = localizeStoredQuestion(stored, 'en');
    expect(fr.questionText).toBe(stored.questionText);
    expect(en.questionText).toBe(stored.questionTextEn);
    expect(en.options).toEqual(stored.optionsEn);
    expect(en.theme).toBe('Red lines');
    // Même identifiant, mêmes champs de réponse : rien ne révèle la langue de l'autre.
    const shared = (q: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(q).filter(
          ([k]) =>
            !['questionText', 'options', 'theme', 'language'].includes(k),
        ),
      );
    expect(shared(en)).toEqual(shared(fr));
    expect(en.options).toHaveLength(fr.options.length);
  });

  it('une question antérieure au bilingue reste en français, signalée comme telle', () => {
    const old = { ...stored, questionTextEn: null, optionsEn: null };
    const en = localizeStoredQuestion(old, 'en');
    expect(en.questionText).toBe(stored.questionText);
    expect(en.language).toBe('fr');
  });

  it('langue de l’interface : en / en-GB → anglais, tout le reste → français', () => {
    expect(parseSondeurLanguage('en')).toBe('en');
    expect(parseSondeurLanguage('en-GB')).toBe('en');
    expect(parseSondeurLanguage('fr')).toBe('fr');
    expect(parseSondeurLanguage(undefined)).toBe('fr');
    expect(parseSondeurLanguage('de')).toBe('fr');
    expect(themeLabelEn('Argent & dettes')).toBe('Money & debt');
  });
});
