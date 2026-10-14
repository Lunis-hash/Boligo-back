import { readFileSync } from 'fs';
import { join } from 'path';
import {
  QUESTION_INDEX,
  dependencyMet,
  isValidAnswer,
  mixesExclusive,
} from './questions.data';
import {
  V82_EN,
  V82_INDEX,
  V82_M8_06,
  V82_ONLY_IDS,
  V82_QUESTIONS,
  V82_REINTEGRATED,
  ageRangesConsistent,
  configuredInterviewVersion,
  interviewVersionOf,
  isValidRangeAnswer,
  localizeV82Question,
  parseAgeRange,
  questionnaire,
} from './questions.v82';
import { V82_CLARITY_FR } from './questions.v82.clarity';
import { moduleQuestions, pendingQuestions } from './questions.service';
import { isSensitiveQuestion } from './sensitive-questions';

/** Questions du modèle V8.2 validé (113), exportées par preuves/export_app.py. */
const MODEL = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '../../docs/questionnaire/V8_2_FINAL/sondeur_v82/v82_items.json',
    ),
    'utf8',
  ),
) as Record<string, { type: string; options: Record<string, string> }>;

/** Environnement de test (les types Expo exigent NODE_ENV dans ProcessEnv). */
const testEnv = (o: Record<string, string>) =>
  o as unknown as NodeJS.ProcessEnv;

describe('Grand Entretien V8.2 — contenu', () => {
  it('118 questions : les 113 du modèle validé, 4 reprises de la V7 et M8_Q13 reformulée', () => {
    expect(V82_QUESTIONS).toHaveLength(118);
    expect(new Set(V82_QUESTIONS.map((q) => q.id)).size).toBe(118);
    const ids = new Set(V82_QUESTIONS.map((q) => q.id));
    for (const id of Object.keys(MODEL)) expect(ids.has(id)).toBe(true);
    for (const id of V82_REINTEGRATED) expect(ids.has(id)).toBe(true);
    expect(ids.has('V82_M8_06')).toBe(true);
    // M8_Q13 a changé de sens : son ancien identifiant n'est plus posé.
    expect(ids.has('M8_Q13')).toBe(false);
  });

  it('options du modèle reprises à l’identique (codes et textes, relecture éditoriale comprise)', () => {
    for (const [id, m] of Object.entries(MODEL)) {
      const q = V82_INDEX.get(id)!;
      expect(Object.fromEntries(q.options.map((o) => [o.key, o.text]))).toEqual(
        { ...m.options, ...V82_CLARITY_FR[id]?.options },
      );
    }
  });

  it('les quatre questions B sont celles de la V7 (identifiant, texte, codes inchangés ; libellés relus en V8.2 seulement)', () => {
    for (const id of V82_REINTEGRATED) {
      const v7 = QUESTION_INDEX.get(id)!;
      const v82 = V82_INDEX.get(id)!;
      const fix = V82_CLARITY_FR[id];
      expect(v82.text).toBe(fix?.text ?? v7.text);
      expect(v82.options).toEqual(
        v7.options.map((o) =>
          fix?.options?.[o.key] ? { ...o, text: fix.options[o.key] } : o,
        ),
      );
      expect(v82.moduleNumber).toBe(v7.moduleNumber);
    }
  });

  it('M8_Q13 reformulée : réparation et limites, jamais le maintien dans une relation dangereuse', () => {
    expect(V82_M8_06.text).toMatch(/sans violence ni danger/);
    expect(V82_M8_06.assistance).toMatch(/sécurité passe avant/);
    const all = V82_M8_06.options.map((o) => o.text).join(' ');
    expect(all).not.toMatch(/je resterais|pour la vie/i);
    expect(V82_M8_06.options.at(-1)!.text).toBe('Je préfère ne pas répondre');
  });

  it('chaque question est traduite en anglais avec les mêmes codes', () => {
    for (const q of V82_QUESTIONS) {
      const t = V82_EN[q.id];
      expect(t).toBeDefined();
      expect(t.text.length).toBeGreaterThan(5);
      expect(Object.keys(t.options).sort()).toEqual(
        q.options.map((o) => o.key).sort(),
      );
      const en = localizeV82Question(q, 'en');
      expect(en.options.map((o) => o.key)).toEqual(q.options.map((o) => o.key));
      if (q.assistance) expect(en.assistance).not.toBe(q.assistance);
    }
    expect(localizeV82Question(V82_M8_06, 'en').text).toMatch(
      /no violence or danger/,
    );
  });

  it('chaque condition ne dépend que de questions posées avant elle', () => {
    const order = new Map(V82_QUESTIONS.map((q, i) => [q.id, i]));
    const before = (dep: string, id: string) => {
      const d = V82_INDEX.get(dep)!;
      const q = V82_INDEX.get(id)!;
      return (
        d.moduleNumber < q.moduleNumber ||
        (d.moduleNumber === q.moduleNumber && order.get(dep)! < order.get(id)!)
      );
    };
    for (const q of V82_QUESTIONS) {
      const deps = q.rules?.dependsOn;
      for (const d of Array.isArray(deps) ? deps : deps ? [deps] : [])
        expect(before(d.questionId, q.id)).toBe(true);
    }
  });
});

describe('Grand Entretien V8.2 — version servie', () => {
  it('nouvel entretien : V7.1 par défaut, V8.2 seulement sur configuration explicite', () => {
    expect(configuredInterviewVersion('u1', testEnv({}))).toBe('7.1');
    expect(
      configuredInterviewVersion('u1', testEnv({ INTERVIEW_VERSION: '' })),
    ).toBe('7.1');
    expect(
      configuredInterviewVersion('u1', testEnv({ INTERVIEW_VERSION: '8' })),
    ).toBe('7.1');
    expect(
      configuredInterviewVersion('u1', testEnv({ INTERVIEW_VERSION: '8.2' })),
    ).toBe('8.2');
    const ids = pendingQuestions(0, {}, 30, 'F', false, '7.1').map((q) => q.id);
    expect(ids).toContain('M0_Q01');
    for (const id of ids) expect(V82_ONLY_IDS.has(id)).toBe(false);
  });

  it('activation progressive : stable par membre, proportionnelle au pourcentage', () => {
    const env = testEnv({ INTERVIEW_V82_PERCENT: '20' });
    const users = Array.from({ length: 2000 }, (_, i) => `membre-${i}`);
    const v82 = users.filter(
      (u) => configuredInterviewVersion(u, env) === '8.2',
    );
    expect(v82.length / users.length).toBeGreaterThan(0.15);
    expect(v82.length / users.length).toBeLessThan(0.25);
    // Même membre, même réponse ; le pourcentage croissant n'en retire aucun.
    for (const u of v82.slice(0, 50)) {
      expect(configuredInterviewVersion(u, env)).toBe('8.2');
      expect(
        configuredInterviewVersion(u, testEnv({ INTERVIEW_V82_PERCENT: '50' })),
      ).toBe('8.2');
    }
    expect(
      configuredInterviewVersion('x', testEnv({ INTERVIEW_V82_PERCENT: '0' })),
    ).toBe('7.1');
    expect(
      configuredInterviewVersion(
        'x',
        testEnv({ INTERVIEW_V82_PERCENT: '100' }),
      ),
    ).toBe('8.2');
    expect(
      configuredInterviewVersion(
        undefined,
        testEnv({ INTERVIEW_V82_PERCENT: '100' }),
      ),
    ).toBe('7.1');
  });

  it('entretien existant : sa version enregistrée, jamais la configuration', () => {
    const env = process.env.INTERVIEW_VERSION;
    process.env.INTERVIEW_VERSION = '8.2';
    try {
      // Vierge ou seulement des identifiants communs : la version enregistrée décide.
      expect(interviewVersionOf({}, '7.1')).toBe('7.1');
      expect(interviewVersionOf({ M0_Q02: 'A', M0_Q06: 'A' }, '7.1')).toBe(
        '7.1',
      );
      expect(interviewVersionOf({ M0_Q02: 'A' }, '8.2')).toBe('8.2');
      // Entretien antérieur au versionnement : V7.1, même si INTERVIEW_VERSION=8.2.
      expect(interviewVersionOf({}, null)).toBe('7.1');
      expect(interviewVersionOf({ M0_Q02: 'A' }, undefined)).toBe('7.1');
      // Valeur inconnue : jamais une version inventée.
      expect(interviewVersionOf({}, '9')).toBe('7.1');
    } finally {
      process.env.INTERVIEW_VERSION = env;
    }
  });

  it('entretien V8.2 : questions V8.2', () => {
    const ids = pendingQuestions(0, { M0_Q02: 'A' }, 30, 'F', false, '8.2').map(
      (q) => q.id,
    );
    expect(ids).toContain('V82_M0_01');
    expect(ids).toContain('V82_M0_03');
    expect(ids).not.toContain('M0_Q01');
    expect(questionnaire('8.2')).toBe(V82_QUESTIONS);
  });

  it('conditions V8.2 : religion, ancienne relation, enfants', () => {
    const rules = (id: string) => V82_INDEX.get(id)!.rules;
    // M1_Q17 (pratique) : jamais pour « agnostique », « athée », « sans religion ».
    for (const k of ['I', 'L', 'M', 'N'])
      expect(dependencyMet(rules('M1_Q17'), { M1_Q16: k })).toBe(false);
    expect(dependencyMet(rules('M1_Q17'), { M1_Q16: 'D' })).toBe(true);
    // Lien avec l'ex : seulement après une relation sérieuse.
    expect(dependencyMet(rules('V82_M3_02'), { V82_M3_01: 'A' })).toBe(false);
    expect(dependencyMet(rules('V82_M3_02'), { V82_M3_01: 'C' })).toBe(true);
    // Comportements passés : jamais pour qui n'a pas eu de relation sérieuse.
    expect(dependencyMet(rules('V82_M9_06'), { V82_M3_01: 'A' })).toBe(false);
    // Éducation : enfants mineurs ou projet d'enfant.
    expect(
      dependencyMet(rules('M8_Q20'), { V82_M0_03: 'E', M0_Q06: 'D' }),
    ).toBe(false);
    expect(dependencyMet(rules('M8_Q20'), { V82_M0_03: 'A,B' })).toBe(true);
    // Mahr : personnes musulmanes, ou ouvertes à une autre conviction.
    expect(
      dependencyMet(rules('V82_M4_08'), { M1_Q16: 'A', M1_Q18: 'A' }),
    ).toBe(false);
    expect(dependencyMet(rules('V82_M4_08'), { M1_Q16: 'D' })).toBe(true);
  });

  it('question de suite du même module : servie avec sa condition (askIf)', () => {
    const qs = moduleQuestions(3, { V82_M0_03: 'A' }, 30, 'F', false, '8.2');
    const ex = qs.find((q) => q.id === 'V82_M3_02');
    expect(ex?.askIf).toEqual([
      { questionId: 'V82_M3_01', values: ['B', 'C', 'D'] },
    ]);
  });
});

describe('Grand Entretien V8.2 — saisies', () => {
  it('curseurs d’âge : plage « min-max » de 18 à 99 ans', () => {
    const ideal = V82_INDEX.get('V82_M0_01')!;
    expect(parseAgeRange('25-35')).toEqual([25, 35]);
    expect(isValidRangeAnswer(ideal, '25-35')).toBe(true);
    for (const bad of ['17-30', '30-25', '25', 'A', '25-100', ' 25 - 35 '])
      expect(isValidRangeAnswer(ideal, bad)).toBe(false);
    expect(
      ageRangesConsistent({ V82_M0_01: '28-34', V82_M0_02: '25-40' }),
    ).toBe(true);
    expect(
      ageRangesConsistent({ V82_M0_01: '28-34', V82_M0_02: '30-40' }),
    ).toBe(false);
  });

  it('choix multiples : bornes et options exclusives du modèle', () => {
    const kids = V82_INDEX.get('V82_M0_03')!;
    expect(isValidAnswer(kids, 'B,E')).toBe(true);
    expect(mixesExclusive(kids, 'A,B')).toBe(true);
    const roots = V82_INDEX.get('V82_M1_01')!;
    expect(roots.maxChoices).toBe(2);
    expect(roots.options.find((o) => o.key === 'A')?.freeText).toBe(true);
    expect(mixesExclusive(roots, 'A,B')).toBe(true);
    const nn = V82_INDEX.get('M8_Q12')!;
    expect(isValidAnswer(nn, 'A,B,C,D')).toBe(false);
    expect(mixesExclusive(nn, 'A,K')).toBe(true);
  });

  it('« Non applicable » proposé pour les comportements qui supposent une relation vécue', () => {
    expect(V82_INDEX.get('V82_M9_06')!.options.map((o) => o.key)).toContain(
      'NA',
    );
    expect(isValidAnswer(V82_INDEX.get('M9_Q24')!, 'NA')).toBe(true);
  });
});

describe('Grand Entretien V8.2 — données sensibles (art. 9) et sécurité', () => {
  /** Questions sensibles du modèle validé (model.py → SENSITIVE). */
  const SENSITIVE = [
    'V82_M1_01',
    'M1_Q16',
    'V82_M1_02',
    'M1_Q17',
    'M1_Q18',
    'M1_Q19',
    'M1_Q20',
    'M8_Q18',
    'V82_M4_08',
    'V82_M8_03',
    'M6_Q19',
    'V82_M10_04',
    'M10_Q17',
    'M10_Q19',
  ];

  it('toutes soumises à l’accord explicite, y compris leur précision écrite', () => {
    for (const id of SENSITIVE) expect(isSensitiveQuestion(id)).toBe(true);
    expect(isSensitiveQuestion('V82_M1_01_AUTRE')).toBe(true);
  });

  it('sans accord : aucune question sensible posée en V8.2', () => {
    const asked = [...Array(11).keys()].flatMap((m) =>
      pendingQuestions(
        m,
        { V82_M0_03: 'B', M0_Q06: 'A', M1_Q16: 'D', V82_M3_01: 'C' },
        30,
        'F',
        true,
        '8.2',
      ).map((q) => q.id),
    );
    for (const id of SENSITIVE) expect(asked).not.toContain(id);
    // Les questions de sécurité restent posées (elles ne sont pas « sensibles »).
    for (const id of ['M6_Q04', 'M6_Q05', 'M6_Q24', 'M9_Q24'])
      expect(asked).toContain(id);
  });

  it('identifiants propres à la V8.2 : aucun ne se confond avec une question V7', () => {
    for (const id of V82_ONLY_IDS) expect(QUESTION_INDEX.has(id)).toBe(false);
  });
});
