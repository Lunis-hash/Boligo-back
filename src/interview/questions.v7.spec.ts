import {
  QUESTIONNAIRE_V6_ORDER,
  QUESTIONS,
  QUESTION_INDEX,
  RETIRED_QUESTIONS,
  SENSITIVE_OPTIONS,
  SENSITIVE_QUESTIONS,
  V7_ADDED,
  V7_CHANGES,
  V7_REPLACEMENTS,
  decodeUserResponses,
  isV7Interview,
  sensitiveCategories,
} from './questions.data';
import { QUESTIONS_EN } from './questions.en';
import { pendingQuestions } from './questions.service';

const v6 = new Set(QUESTIONNAIRE_V6_ORDER);
const current = new Set(QUESTIONS.map((q) => q.id));

describe('Grand Entretien V7 : intégrité', () => {
  it('compte 168 questions au plus (139 en V6, 160 en V7)', () => {
    expect(QUESTIONNAIRE_V6_ORDER).toHaveLength(139);
    expect(QUESTIONS.length).toBeLessThanOrEqual(168);
    expect(QUESTIONS).toHaveLength(168);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it('suit chaque évolution dans la table des versions', () => {
    for (const q of QUESTIONS) {
      if (!v6.has(q.id)) expect(V7_CHANGES[q.id]).toBe('nouvelle');
    }
    for (const id of QUESTIONNAIRE_V6_ORDER) {
      if (!current.has(id)) expect(V7_CHANGES[id]).toBe('retiree');
    }
    for (const [id, change] of Object.entries(V7_CHANGES)) {
      if (change === 'retiree') {
        expect(current.has(id)).toBe(false);
        expect(RETIRED_QUESTIONS.some((q) => q.id === id)).toBe(true);
        expect(V7_REPLACEMENTS[id]).toBeDefined();
      } else {
        expect(current.has(id)).toBe(true);
      }
      // « nouvelle » : un identifiant jamais vu en V6, pour qu'une réponse V6
      // ne soit jamais lue avec un autre sens.
      if (change === 'nouvelle') expect(v6.has(id)).toBe(false);
    }
    for (const ids of Object.values(V7_REPLACEMENTS))
      for (const id of ids) expect(current.has(id)).toBe(true);
  });

  it('garde lisibles les réponses V6 aux questions retirées', () => {
    const [m] = decodeUserResponses([
      { moduleName: 'Identité', rawResponses: { M1_Q05: 'B', M1_Q16: 'D' } },
    ]);
    expect(m.qna[0]).toEqual({
      question: 'Votre religion ou spiritualité :',
      answer: 'Musulman(e) pratiquant(e)',
    });
    expect(m.qna[1].answer).toBe('Musulmane');
  });

  it('n’utilise que les types gérés par l’app (choix unique ou multiple, échelles d’accord et de fréquence)', () => {
    for (const q of QUESTIONS) {
      if (q.scale) {
        expect(['accord', 'frequence']).toContain(q.scale);
        expect(q.options).toHaveLength(5);
        expect(q.multiple).toBeUndefined();
      }
      if (q.maxChoices) expect(q.multiple).toBe(true);
      // « Autre (précisez) » : l'app ne l'affiche que sur un choix multiple.
      if (q.options.some((o) => o.freeText)) expect(q.multiple).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('traduit en anglais chaque question posée, avec le même nombre d’options', () => {
    for (const q of QUESTIONS) {
      const t = QUESTIONS_EN[q.id];
      expect(t).toBeDefined();
      if (q.scale) expect(t.options).toBeUndefined();
      else expect(t.options).toHaveLength(q.options.length);
    }
  });

  it('n’emploie ni jargon clinique, ni diagnostic, ni question de santé', () => {
    const text = QUESTIONS.map((q) =>
      [q.text, ...q.options.map((o) => o.text)].join(' '),
    )
      .join(' ')
      .toLowerCase();
    for (const word of [
      'attachement',
      'anxieu',
      'évitant',
      'schéma',
      'trauma',
      'diagnostic',
      'pathologi',
      'dépression',
      'introverti',
      'extraverti',
      'silence punitif',
      'comptabilité mentale',
      'pourvoyeur',
      'patriarche',
      'traitement',
      'médicament',
    ])
      expect(text).not.toContain(word);
  });

  it('vouvoie le membre dans chaque question qui s’adresse à lui', () => {
    for (const q of QUESTIONS.filter((x) => !x.scale)) {
      // Le tutoiement n'apparaît que dans des citations (« tu es toujours… »).
      const outsideQuotes = q.text.replace(/«[^»]*»/g, '');
      expect(outsideQuotes).not.toMatch(/(^|\s)(tu|ton|ta|tes)\s/i);
    }
  });

  it('repère un entretien V7 dès sa première réponse propre à la V7', () => {
    expect(isV7Interview({ M0_Q01: 'A', M1_Q05: 'B' })).toBe(false);
    expect(isV7Interview({ M0_Q12: 'A' })).toBe(true);
    expect(V7_ADDED.has('M8_Q12')).toBe(true);
  });

  it('pose la pratique religieuse aux seuls membres qui ont une religion', () => {
    const ids = (M1_Q16: string) =>
      pendingQuestions(1, { M1_Q16, M1_Q01: 'A' }, 30, 'F').map((q) => q.id);
    expect(ids('D')).toContain('M1_Q17');
    expect(ids('I')).not.toContain('M1_Q17');
    expect(ids('H')).not.toContain('M1_Q17');
  });

  it('ne pose les questions sur l’ex qu’après une relation sérieuse', () => {
    const ids = (M3_Q11: string) =>
      pendingQuestions(3, { M3_Q11 }, 30, 'H').map((q) => q.id);
    expect(ids('E')).not.toContain('M3_Q05');
    expect(ids('C')).toEqual(
      expect.arrayContaining(['M3_Q03', 'M3_Q05', 'M3_Q10']),
    );
  });
});

describe('Données sensibles (RGPD, article 9)', () => {
  it('liste toute question qui parle de religion, de foi ou d’intimité', () => {
    const pattern =
      /religi|foi\b|halal|casher|prière|mahr|intimité|infidélité|tromp|séduction|pour adultes|désir|sexual/i;
    // Le mot y figure sans que la réponse révèle une conviction ou la vie intime.
    const notRevealing = new Set([
      'M2_Q03', // « équilibre entre intimité et liberté »
      'M5_Q05', // « je protège notre intimité » (réseaux sociaux)
      'M5_Q08', // « chacun garde son intimité » (téléphone)
      'M8_Q09', // « ville, enfants, religion » dans l'énoncé seulement
      'M9_Q07', // tendresse « hors sexualité »
      'M1_Q04', // traditions de mariage par région (V6)
      'M3_Q02', // cause de la dernière rupture (V6)
      'M8_Q08', // ce qui ne sera jamais accepté (V6)
    ]);
    for (const q of [...QUESTIONS, ...RETIRED_QUESTIONS]) {
      if (notRevealing.has(q.id)) continue;
      if (SENSITIVE_QUESTIONS[q.id]) continue;
      // V7.1 : sinon, seules des options le sont, et chacune est listée.
      expect(pattern.test(q.text)).toBe(false);
      for (const o of q.options)
        if (pattern.test(o.text))
          expect(SENSITIVE_OPTIONS[q.id]?.options).toContain(o.key);
    }
  });

  it('ne référence que des questions connues', () => {
    for (const id of Object.keys(SENSITIVE_QUESTIONS))
      expect(QUESTION_INDEX.has(id)).toBe(true);
    for (const [id, s] of Object.entries(SENSITIVE_OPTIONS)) {
      expect(SENSITIVE_QUESTIONS[id]).toBeUndefined();
      const q = QUESTIONS.find((x) => x.id === id)!;
      for (const key of s.options)
        expect(q.options.map((o) => o.key)).toContain(key);
      // Il reste toujours de quoi répondre sans accord.
      expect(q.options.length).toBeGreaterThan(s.options.length + 1);
    }
  });

  it('V7.1 : origine ethnique et santé ; plusieurs catégories pour une même question', () => {
    expect(SENSITIVE_QUESTIONS.M1_Q01).toMatchObject({
      category: 'origine_ethnique',
      reach: 'direct',
    });
    expect(SENSITIVE_QUESTIONS.M1_Q02.category).toBe('origine_ethnique');
    expect(SENSITIVE_QUESTIONS.M2_Q10.category).toBe('sante');
    expect(sensitiveCategories(SENSITIVE_OPTIONS.M8_Q12)).toEqual([
      'convictions_religieuses',
      'vie_sexuelle',
    ]);
    expect(sensitiveCategories(SENSITIVE_QUESTIONS.M1_Q16)).toEqual([
      'convictions_religieuses',
    ]);
  });

  it('ne pose plus la question des violences subies (V6 : M3_Q08, réponses encore enregistrées)', () => {
    expect(current.has('M3_Q08')).toBe(false);
    expect(SENSITIVE_QUESTIONS.M3_Q08.category).toBe('violences_subies');
    expect(
      Object.entries(SENSITIVE_QUESTIONS).filter(
        ([id, s]) => s.category === 'violences_subies' && current.has(id),
      ),
    ).toEqual([]);
  });
});
