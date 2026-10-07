import {
  QUESTIONS,
  QUESTION_INDEX,
  V61_ADDED,
  cleanFreeText,
  isValidAnswer,
} from '../interview/questions.data';
import { QUESTIONS_EN } from '../interview/questions.en';
import {
  languageChoices,
  suggestLanguages,
} from '../interview/country-languages';
import { withSuggestion } from '../interview/questions.service';
import { buildDivergenceReport, RawAnswers } from './divergence.engine';
import { mutuallyAccepted, shareLanguage } from './discover-filters';
import {
  buildPsychProfile,
  buildRelationalProfile,
} from '../psychometrics/psychometrics';
import { buildModuleAffinities } from '../portrait/module-affinity';
import {
  assembleSondeur,
  validateSondeurGrid,
} from '../journey/sondeur.generator';

const QUESTION_BY_ID_FOR_TESTS = new Map(QUESTIONS.map((q) => [q.id, q]));
const report = (a: RawAnswers, b: RawAnswers) => buildDivergenceReport(a, b);
const find = (a: RawAnswers, b: RawAnswers, id: string) =>
  report(a, b).divergences.filter((d) => d.questionId === id);

describe('Questionnaire V6.1 : intégrité', () => {
  it('ajoute 24 questions, toutes traduites quand elles sont encore posées (V7.1 : 168 questions au plus)', () => {
    expect(V61_ADDED.size).toBe(24);
    for (const id of V61_ADDED) {
      expect(QUESTION_INDEX.get(id)).toBeDefined();
      const q = QUESTION_BY_ID_FOR_TESTS.get(id);
      // M2_Q21 (« les gens se confient à moi ») est retirée en V7.
      if (!q) continue;
      const en = QUESTIONS_EN[id];
      expect(en).toBeDefined();
      if (!q.scale) expect(en.options).toHaveLength(q.options.length);
    }
    expect(QUESTIONS.length).toBeLessThanOrEqual(168);
  });

  it('limite les signaux d’alerte à trois réponses', () => {
    const flags = QUESTION_BY_ID_FOR_TESTS.get('M8_Q10')!;
    expect(isValidAnswer(flags, 'A,B,C')).toBe(true);
    expect(isValidAnswer(flags, 'A,B,C,D')).toBe(false);
  });

  it('accepte une langue écrite en lettres, refuse le reste', () => {
    expect(cleanFreeText('  Créole   haïtien ')).toBe('Créole haïtien');
    expect(cleanFreeText('Bambara, dioula')).toBe('Bambara, dioula');
    expect(cleanFreeText('x')).toBeNull();
    expect(cleanFreeText('<b>bambara</b>')).toBeNull();
    expect(cleanFreeText(42)).toBeNull();
  });

  it('ne demande ni corps, ni taille, ni couleur de peau', () => {
    const text = [...V61_ADDED]
      .map((id) => {
        const q = QUESTION_INDEX.get(id)!;
        return [q.text, ...q.options.map((o) => o.text)].join(' ');
      })
      .join(' ')
      .toLowerCase();
    for (const word of ['taille', 'poids', 'peau', 'corpulence', 'mince'])
      expect(text).not.toContain(word);
  });
});

describe('Langues proposées selon le pays (M0_Q10)', () => {
  it('propose les langues du pays de résidence', () => {
    expect(suggestLanguages('Dakar, Sénégal')).toEqual({ keys: ['A', 'F'] });
    expect(suggestLanguages('Madrid, Espagne')).toEqual({ keys: ['H'] });
    expect(suggestLanguages('Berlin, Allemagne', 'en')).toEqual({
      keys: ['I'],
      other: 'German',
    });
    expect(suggestLanguages('Bamako, Mali')).toEqual({
      keys: ['A', 'I'],
      other: 'Bambara',
    });
    expect(suggestLanguages('Paris')).toBeNull();
    expect(suggestLanguages('Ville, Pays inconnu')).toBeNull();
  });

  it('ajoute la suggestion à la seule question des langues', () => {
    const lang = QUESTION_BY_ID_FOR_TESTS.get('M0_Q10')!;
    const q = withSuggestion(lang, 'Kinshasa, Congo RDC', 'fr');
    // Quatre propositions : langue du pays, anglais, espagnol, autre langue.
    expect(q.options.map((o) => o.key)).toEqual(['A', 'B', 'H', 'I']);
    expect(q.suggested).toEqual(['A', 'I']);
    expect(q.suggestedOther).toBe('Lingala');
    const other = QUESTION_BY_ID_FOR_TESTS.get('M0_Q03')!;
    expect(withSuggestion(other, 'Dakar, Sénégal', 'fr')).toBe(other);
  });

  it('rapproche deux membres qui ont écrit la même langue, sans jamais exclure', () => {
    const bambara = { M0_Q10: 'I', M0_Q10_AUTRE: 'Bambara' };
    expect(
      shareLanguage(bambara, { M0_Q10: 'A,I', M0_Q10_AUTRE: 'bambara' }),
    ).toBe(true);
    // « Une autre langue » seule ne filtre pas, même mal orthographiée.
    expect(shareLanguage(bambara, { M0_Q10: 'B' })).toBe(true);
    const subject = (answers: RawAnswers) => ({
      age: 30,
      city: 'Bamako, Mali',
      answers: { M0_Q02: 'D', ...answers },
    });
    expect(
      mutuallyAccepted(
        subject({ M0_Q10: 'A,I', M0_Q10_AUTRE: 'Bambara' }),
        subject({ M0_Q10: 'I', M0_Q10_AUTRE: 'bambara' }),
      ),
    ).toBe(true);
  });
});

describe('Argent, partage et maladie (V6.1)', () => {
  it('premier rendez-vous : « l’homme paie » face à « moitié-moitié »', () => {
    expect(find({ M4_Q10: 'A' }, { M4_Q10: 'C' }, 'M4_Q10')[0].severity).toBe(
      'moderee',
    );
    expect(
      report({ M4_Q10: 'C' }, { M4_Q10: 'C' }).convergences[0].label,
    ).toMatch(/moitié-moitié/);
  });

  it('manque d’argent : soutien sans compter face à « raison de partir »', () => {
    expect(find({ M4_Q11: 'A' }, { M4_Q11: 'D' }, 'M4_Q11')[0].severity).toBe(
      'majeure',
    );
    expect(find({ M4_Q11: 'A' }, { M4_Q11: 'B' }, 'M4_Q11')).toHaveLength(0);
  });

  it('matérialisme, affaires personnelles, maladie, attirance', () => {
    expect(find({ M4_Q12: 'A' }, { M4_Q12: 'D' }, 'M4_Q12')[0].severity).toBe(
      'majeure',
    );
    expect(find({ M4_Q13: 'A' }, { M4_Q13: 'D' }, 'M4_Q13')[0].severity).toBe(
      'moderee',
    );
    expect(find({ M8_Q11: 'A' }, { M8_Q11: 'D' }, 'M8_Q11')[0].severity).toBe(
      'moderee',
    );
    expect(
      find({ M10_Q15: 'A' }, { M10_Q15: 'C' }, 'M10_Q15')[0].severity,
    ).toBe('moderee');
  });
});

describe('Signaux d’alerte croisés avec les habitudes (V6.1)', () => {
  it('jalousie qui contrôle face à quelqu’un qui fouille souvent le téléphone', () => {
    // « Très souvent » confirmé par une autre réponse (partir sans rien
    // expliquer quand la tension monte) : majeure ; sinon, à explorer.
    const d = find(
      { M8_Q10: 'B,C' },
      { M9_Q11: 'D', M9_Q12: 'E', M6_Q16: 'D' },
      'M8_Q10',
    );
    expect(d.map((x) => x.severity).sort()).toEqual(['majeure', 'moderee']);
    expect(
      find({ M8_Q10: 'B,C' }, { M9_Q11: 'D', M9_Q12: 'E' }, 'M8_Q10').map(
        (x) => x.severity,
      ),
    ).toEqual(['moderee', 'moderee']);
    expect(d[0].a.text).toMatch(/^Ce qui me ferait fuir/);
    expect(d.find((x) => x.severity === 'majeure')!.b.text).toMatch(
      /très souvent/,
    );
  });

  it('une habitude avouée seule n’est jamais pénalisée', () => {
    expect(find({ M8_Q10: 'A' }, { M9_Q11: 'E' }, 'M8_Q10')).toHaveLength(0);
    expect(find({}, { M9_Q11: 'E', M9_Q12: 'E' }, 'M8_Q10')).toHaveLength(0);
    expect(find({ M8_Q10: 'B' }, { M9_Q11: 'C' }, 'M8_Q10')).toHaveLength(0);
  });

  it('compte la gravité dans le module 8', () => {
    const a = { M8_Q10: 'B', M8_Q01: 'A' };
    // Fouiller le téléphone « très souvent », confirmé par « transparence totale ».
    const b = { M9_Q11: 'E', M8_Q01: 'A', M5_Q08: 'A' };
    const m8 = buildModuleAffinities(a, b, report(a, b)).find(
      (m) => m.module === 8,
    )!;
    expect(m8.value).toBeLessThanOrEqual(64);
  });
});

describe('Caprices, patience et timidité (V6.1)', () => {
  const demanding = { M9_Q16: 'E', M9_Q17: 'D', M9_Q18: 'E' };
  const easy = { M9_Q16: 'A', M9_Q17: 'B', M9_Q18: 'A' };

  it('mesure le caractère exigeant sur trois affirmations', () => {
    expect(buildPsychProfile(demanding).demandingness).toBeGreaterThanOrEqual(
      70,
    );
    expect(buildPsychProfile(easy).demandingness).toBeLessThan(30);
  });

  it('caractère exigeant face à « c’est rédhibitoire »', () => {
    const d = find({ ...easy, M9_Q19: 'D' }, demanding, 'M9_Q19');
    expect(d[0].severity).toBe('majeure');
    expect(find({ ...easy, M9_Q19: 'B' }, demanding, 'M9_Q19')).toHaveLength(0);
  });

  it('deux caractères exigeants : risque partagé', () => {
    const d = find(demanding, demanding, 'M9_Q16');
    expect(d[0]).toMatchObject({ severity: 'moderee', shared: true });
  });

  it('deux timidités, ou une timidité face à « on se parle de tout »', () => {
    const shy = { M2_Q19: 'E', M2_Q20: 'D', M2_Q21: 'B' };
    expect(find(shy, shy, 'M2_Q19')[0]).toMatchObject({
      severity: 'mineure',
      shared: true,
    });
    expect(find(shy, { M8_Q06: 'A' }, 'M2_Q19')[0].label).toBe(
      'Rythme de confidence',
    );
  });

  it('le profil relationnel parle de timidité sans en faire un défaut', () => {
    const p = buildRelationalProfile(
      { M2_Q19: 'E', M2_Q20: 'E', M2_Q21: 'B', ...demanding, M9_Q12: 'D' },
      'F',
    )!;
    expect(p.openness!.title).toBe('Une timidité de départ');
    expect(p.openness!.text).toMatch(/telle que vous êtes/);
    expect(p.observations.join(' ')).toMatch(/sortie polie/);
    expect(p.observations.join(' ')).toMatch(/avec des mots/);
  });
});

describe('Attirance : ce qui fait chavirer face à ce que l’autre dégage', () => {
  const affinity = (a: RawAnswers, b: RawAnswers) =>
    buildModuleAffinities(a, b, report(a, b)).find((m) => m.module === 10)!;

  it('une allure qui a déjà fait chavirer rapproche davantage', () => {
    const match = affinity(
      { M10_Q11: 'A', M10_Q13: 'B', M10_Q12: 'B', M10_Q14: 'F' },
      { M10_Q11: 'B', M10_Q13: 'F', M10_Q12: 'A', M10_Q14: 'B' },
    );
    const miss = affinity(
      { M10_Q11: 'A', M10_Q13: 'B', M10_Q12: 'B', M10_Q14: 'F' },
      { M10_Q11: 'C', M10_Q13: 'A', M10_Q12: 'D', M10_Q14: 'E' },
    );
    expect(match.value).toBe(100);
    expect(miss.value!).toBeLessThan(match.value!);
  });

  it('« rien de commun » ne compte ni pour ni contre', () => {
    const v = affinity({ M10_Q11: 'F' }, { M10_Q12: 'A' });
    expect(v.compared).toBe(0);
  });
});

describe('Sondeur : profondeur sur les sujets V6.1', () => {
  it('pose la scène du premier rendez-vous quand les réponses diffèrent', () => {
    const r = report({ M4_Q10: 'A' }, { M4_Q10: 'C' });
    const qs = assembleSondeur({
      report: r,
      firstNames: ['Awa', 'Malik'],
      seed: 'j1',
    });
    expect(validateSondeurGrid(qs)).toBe(true);
    const money = qs.filter((q) => q.themeKey === 'argent');
    expect(money[0].text).toMatch(/serveur pose l'addition/);
    expect(money[0].source).toBe('divergence');
    // Un même écart n'est posé qu'un jour : les autres jours explorent autre chose.
    expect(money.slice(1).map((q) => q.source)).not.toContain('divergence');
    for (const q of money.slice(1)) expect(q.text).not.toMatch(/addition/);
  });

  it('traite un sujet de fond même en divergence mineure (timidité)', () => {
    const shy = { M2_Q19: 'E', M2_Q20: 'D', M2_Q21: 'B' };
    const qs = assembleSondeur({
      report: report(shy, shy),
      firstNames: ['A', 'B'],
    });
    const day1 = qs.find((q) => q.day === 1 && q.themeKey === 'communication')!;
    expect(day1.source).toBe('divergence');
    expect(day1.text).toMatch(/quelqu'un de nouveau/);
  });

  it('les réserves de thème posent les techniques cliniques, jamais une redite de l’entretien ni la santé', () => {
    const texts = new Set<string>();
    for (let i = 0; i < 40; i++) {
      for (const q of assembleSondeur({
        report: report({}, {}),
        firstNames: ['A', 'B'],
        seed: `s${i}`,
      }))
        texts.add(q.text);
    }
    const all = [...texts].join(' | ');
    expect(all).toMatch(/De 0 à 10/);
    expect(all).toMatch(/un proche/);
    expect(all).toMatch(/Imaginez qu/);
    expect(all).toMatch(/addition/);
    expect(all).not.toMatch(/Qui paie \?|voiture|handicap|malad/);
  });
});

describe('Retours du 5 octobre : âge, langues, double origine', () => {
  it('propose quatre langues : celle du pays, anglais, espagnol, autre', () => {
    expect(languageChoices('Lisbonne, Portugal')).toEqual({
      optionKeys: ['G', 'B', 'H', 'I'],
      suggested: ['G'],
    });
    expect(languageChoices('Berlin, Allemagne')).toEqual({
      optionKeys: ['A', 'B', 'H', 'I'],
      suggested: ['I'],
      other: 'Allemand',
    });
    expect(languageChoices('Dakar, Sénégal', 'en')).toEqual({
      optionKeys: ['A', 'B', 'H', 'I'],
      suggested: ['A', 'I'],
      other: 'Wolof',
    });
    expect(languageChoices(null)).toEqual({
      optionKeys: ['A', 'B', 'H', 'I'],
      suggested: [],
    });
  });

  it('une langue écrite vaut l’option correspondante (« Wolof » = Wolof)', () => {
    const wolof = { M0_Q10: 'A,I', M0_Q10_AUTRE: 'Wolof' };
    expect(
      shareLanguage({ M0_Q10: 'I', M0_Q10_AUTRE: 'wolof' }, { M0_Q10: 'F' }),
    ).toBe(true);
    expect(shareLanguage(wolof, { M0_Q10: 'B' })).toBe(false);
    // Langue écrite inconnue de la liste : toujours aucun filtre.
    expect(
      shareLanguage({ M0_Q10: 'I', M0_Q10_AUTRE: 'Bambara' }, { M0_Q10: 'B' }),
    ).toBe(true);
  });

  it('accepte deux origines (métissage) et en tient compte partout', () => {
    const origin = QUESTION_BY_ID_FOR_TESTS.get('M1_Q01')!;
    expect(isValidAnswer(origin, 'A,C')).toBe(true);
    expect(isValidAnswer(origin, 'A,C,E')).toBe(false);
    // « La même culture » exigée : une origine commune suffit.
    expect(
      find({ M1_Q01: 'A,C', M1_Q02: 'A' }, { M1_Q01: 'C' }, 'M1_Q02'),
    ).toHaveLength(0);
    const d = find({ M1_Q01: 'A,C', M1_Q02: 'A' }, { M1_Q01: 'D' }, 'M1_Q02');
    expect(d[0].a.text).toBe('Afrique subsaharienne, Europe');
  });
});

describe('Double origine et questions conditionnelles', () => {
  it('pose la question de la dot à tous, quelle que soit l’origine (V7.1)', () => {
    const { pendingQuestions } = jest.requireActual<
      typeof import('../interview/questions.service')
    >('../interview/questions.service');
    const ids = (M1_Q01: string) =>
      pendingQuestions(4, { M1_Q01 }, 30, 'F').map((q) => q.id);
    expect(ids('C,A')).toContain('M4_Q17');
    expect(ids('C,E')).toContain('M4_Q17');
  });
});
