import {
  QUESTIONNAIRE_V6_ORDER,
  QUESTIONS,
  QUESTION_INDEX,
} from '../interview/questions.data';
import {
  buildCompatibilitySheet,
  buildDivergenceReport,
  Divergence,
  RawAnswers,
} from './divergence.engine';
import { upgradeAnswers } from './answer-bridge';
import { computeAnswerCompatibility } from '../portrait/module-affinity';
import { buildPortrait } from '../portrait/portrait.writer';
import { buildRelationalProfile } from '../psychometrics/psychometrics';
import {
  SAFETY_QUESTIONS,
  isQuotableDivergence,
} from '../journey/sondeur.generator';

const report = (a: RawAnswers, b: RawAnswers) => buildDivergenceReport(a, b);
const find = (a: RawAnswers, b: RawAnswers, id: string): Divergence[] =>
  report(a, b).divergences.filter((d) => d.questionId === id);
const severityOf = (a: RawAnswers, b: RawAnswers, id: string) =>
  find(a, b, id).map((d) => d.severity);

/** Entretien complet sans même réponse à risque : option A, échelles au point neutre. */
function complete(ids: string[], overrides: RawAnswers = {}): RawAnswers {
  const out: RawAnswers = {};
  for (const id of ids) {
    const q = QUESTION_INDEX.get(id)!;
    out[id] = q.scale ? 'C' : q.options[0].key;
  }
  // Dernière relation terminée depuis plus de deux ans (pas de séparation en cours).
  if (out.M3_Q11) out.M3_Q11 = 'D';
  return { ...out, ...overrides };
}
const v7 = (o: RawAnswers = {}) =>
  complete(
    QUESTIONS.map((q) => q.id),
    o,
  );
const v6 = (o: RawAnswers = {}) =>
  complete(QUESTIONNAIRE_V6_ORDER, { M6_Q01: 'B', ...o });

describe('Violence et mots blessants : limites de sécurité', () => {
  it('« ça dépend des circonstances » face à « limite absolue » est une incompatibilité déclarée', () => {
    const r = report({ M6_Q04: 'A' }, { M6_Q04: 'C' });
    expect(r.hardStop).toBe(true);
    expect(r.divergences[0]).toMatchObject({
      questionId: 'M6_Q04',
      severity: 'critique',
    });
    // L'identifiant reste celui que le Sondeur protège (questions de limite, sans citation).
    expect(SAFETY_QUESTIONS.has('M6_Q04')).toBe(true);
    expect(SAFETY_QUESTIONS.has('M6_Q05')).toBe(true);
    expect(isQuotableDivergence(r.divergences[0])).toBe(false);
  });

  it('une tolérance partagée est un risque, jamais un accord', () => {
    for (const id of ['M6_Q04', 'M6_Q05']) {
      expect(severityOf({ [id]: 'B' }, { [id]: 'B' }, id)).toEqual(['moderee']);
      expect(severityOf({ [id]: 'C' }, { [id]: 'C' }, id)).toEqual(['majeure']);
      expect(severityOf({ [id]: 'D' }, { [id]: 'D' }, id)).toEqual(['majeure']);
      const shared = find({ [id]: 'C' }, { [id]: 'C' }, id)[0];
      expect(shared.shared).toBe(true);
      expect(
        report({ [id]: 'C' }, { [id]: 'C' }).convergences.some(
          (c) => c.questionId === id,
        ),
      ).toBe(false);
      // Seule la limite absolue des deux côtés est un accord.
      expect(
        report({ [id]: 'A' }, { [id]: 'A' }).convergences[0].label,
      ).toMatch(/limite absolue/);
    }
  });

  it('ni « tout se discute » ni l’acceptation des désaccords n’adoucissent une limite de sécurité', () => {
    const calm = { M8_Q12: 'K', M8_Q14: 'A' };
    expect(
      severityOf({ ...calm, M6_Q04: 'A' }, { ...calm, M6_Q04: 'C' }, 'M6_Q04'),
    ).toEqual(['critique']);
    expect(
      severityOf({ ...calm, M6_Q04: 'A' }, { ...calm, M6_Q04: 'D' }, 'M6_Q04'),
    ).toEqual(['moderee']);
  });
});

describe('P2 : ce qui est non négociable distingue une divergence d’une nuance', () => {
  const far = { M7_Q07: 'A' };
  const abroad = { M7_Q07: 'C' };

  it('sans déclaration, la gravité reste celle de la règle', () => {
    expect(severityOf(far, abroad, 'M7_Q07')).toEqual(['majeure']);
  });

  it('un sujet non négociable pour l’un monte d’un cran', () => {
    const d = find({ ...far, M8_Q12: 'E' }, abroad, 'M7_Q07')[0];
    expect(d.severity).toBe('critique');
    expect(d.nonNegotiable).toBe(true);
    const sheet = buildCompatibilitySheet(
      report({ ...far, M8_Q12: 'E' }, abroad),
      'Awa',
    );
    expect(sheet.vigilance).toMatch(/non négociable pour l’un de vous/);
    // Modérée → majeure (l'argent du couple, non négociable pour l'un).
    expect(
      severityOf({ M4_Q01: 'A', M8_Q12: 'D' }, { M4_Q01: 'C' }, 'M4_Q01'),
    ).toEqual(['majeure']);
  });

  it('entre deux membres qui ont déclaré le sujet négociable, une majeure redevient un sujet à explorer', () => {
    expect(
      severityOf({ ...far, M8_Q12: 'K' }, { ...abroad, M8_Q12: 'A' }, 'M7_Q07'),
    ).toEqual(['moderee']);
    // Un entretien V6 n'a rien déclaré : pas d'adoucissement.
    expect(severityOf({ ...far, M8_Q12: 'K' }, abroad, 'M7_Q07')).toEqual([
      'majeure',
    ]);
    // « Aucun » coché avec d'autres sujets : les sujets cochés priment.
    expect(
      severityOf(
        { ...far, M8_Q12: 'E,K' },
        { ...abroad, M8_Q12: 'K' },
        'M7_Q07',
      ),
    ).toEqual(['critique']);
  });

  it('une question sans thème déclarable (objectif de rencontre) garde sa gravité', () => {
    expect(
      severityOf(
        { M8_Q01: 'A', M8_Q12: 'K' },
        { M8_Q01: 'C', M8_Q12: 'K' },
        'M8_Q01',
      ),
    ).toEqual(['majeure']);
  });
});

describe('P9 : les désaccords qui durent', () => {
  const a = { M4_Q01: 'A', M5_Q07: 'A', M6_Q04: 'A' };
  const b = { M4_Q01: 'C', M5_Q07: 'C', M6_Q04: 'D' };

  it('« si un désaccord ne se règle pas, nous ne sommes pas faits l’un pour l’autre » relève la modérée la plus importante, une seule', () => {
    const r = report({ ...a, M8_Q14: 'C' }, b);
    const sev = Object.fromEntries(
      r.divergences.map((d) => [d.questionId, d.severity]),
    );
    expect(sev).toEqual({
      M5_Q07: 'majeure',
      M4_Q01: 'moderee',
      M6_Q04: 'moderee',
    });
  });

  it('deux membres qui acceptent les désaccords durables gardent les modérées au rang de nuances (sauf la sécurité)', () => {
    const r = report({ ...a, M8_Q14: 'A' }, { ...b, M8_Q14: 'A' });
    const sev = Object.fromEntries(
      r.divergences.map((d) => [d.questionId, d.severity]),
    );
    expect(sev).toEqual({
      M5_Q07: 'mineure',
      M4_Q01: 'mineure',
      M6_Q04: 'moderee',
    });
    expect(r.convergences.map((c) => c.questionId)).toContain('M8_Q14');
  });
});

describe('Nouvelles règles V7', () => {
  it('P7 : ce que chacun appelle « tromper »', () => {
    expect(severityOf({ M6_Q19: 'A,B' }, { M6_Q19: 'A' }, 'M6_Q19')).toEqual([
      'mineure',
    ]);
    expect(severityOf({ M6_Q19: 'A,B,C' }, { M6_Q19: 'D' }, 'M6_Q19')).toEqual([
      'moderee',
    ]);
    expect(
      severityOf({ M6_Q19: 'G' }, { M6_Q19: 'A,B,C,D' }, 'M6_Q19'),
    ).toEqual(['majeure']);
    // « Aucun » coché avec d'autres : les autres priment.
    expect(find({ M6_Q19: 'A,G' }, { M6_Q19: 'A' }, 'M6_Q19')).toHaveLength(0);
    expect(
      report({ M6_Q19: 'A,E' }, { M6_Q19: 'A,E' }).convergences[0].label,
    ).toBe('Vous avez la même idée de ce qu’est une infidélité');
  });

  it('P10 : valeurs de vie opposées sans rien de commun, ou valeurs partagées', () => {
    expect(
      severityOf({ M7_Q19: 'A,B,H' }, { M7_Q19: 'D,F' }, 'M7_Q19'),
    ).toEqual(['moderee']);
    expect(severityOf({ M7_Q19: 'A,C' }, { M7_Q19: 'D,E' }, 'M7_Q19')).toEqual([
      'mineure',
    ]);
    const shared = report({ M7_Q19: 'A,D,E' }, { M7_Q19: 'A,E,F' });
    expect(shared.divergences).toHaveLength(0);
    expect(shared.convergences[0].label).toBe(
      'Ce qui compte le plus pour vous deux : la sécurité de la famille et l’entraide et la justice',
    );
    expect(shared.comparisons![0].value).toBeCloseTo(0.6 + 0.4 * 0.5);
  });

  it('P3 : religion, pratique et attente de conversion', () => {
    const muslim = { M1_Q16: 'D', M1_Q17: 'A' };
    expect(
      severityOf(
        { ...muslim, M1_Q18: 'A' },
        { M1_Q16: 'A', M1_Q18: 'D' },
        'M1_Q16',
      ),
    ).toEqual(['critique']);
    // L'autre pourrait adopter la religion du premier : majeure, à discuter.
    expect(
      severityOf(
        { ...muslim, M1_Q18: 'B' },
        { M1_Q16: 'I', M1_Q18: 'E' },
        'M1_Q16',
      ),
    ).toEqual(['majeure']);
    expect(
      severityOf(
        { ...muslim, M1_Q18: 'C' },
        { M1_Q16: 'I', M1_Q18: 'D' },
        'M1_Q16',
      ),
    ).toEqual(['moderee']);
    // Même religion : l'écart de pratique pèse.
    const r = report(muslim, { M1_Q16: 'D', M1_Q17: 'D' });
    expect(r.divergences.map((d) => [d.questionId, d.severity])).toEqual([
      ['M1_Q17', 'majeure'],
    ]);
    expect(r.convergences[0].label).toBe('Vous partagez la même foi musulmane');
    // Deux confessions chrétiennes : un écart seulement si l'un exige la sienne.
    expect(find({ M1_Q16: 'A' }, { M1_Q16: 'B' }, 'M1_Q16')).toHaveLength(0);
    expect(
      severityOf({ M1_Q16: 'A', M1_Q18: 'A' }, { M1_Q16: 'B' }, 'M1_Q16'),
    ).toEqual(['moderee']);
  });

  it('alimentation : deux règles strictes différentes ne font plus une convergence', () => {
    expect(severityOf({ M1_Q19: 'A' }, { M1_Q19: 'B' }, 'M1_Q19')).toEqual([
      'moderee',
    ]);
    expect(report({ M1_Q19: 'A' }, { M1_Q19: 'A' }).convergences[0].label).toBe(
      'Vous mangez tous les deux halal',
    );
    // V6 : « stricts » des deux côtés, sans savoir lesquels : ni écart ni accord.
    const legacy = report({ M1_Q09: 'A' }, { M1_Q09: 'A' });
    expect(legacy.divergences).toHaveLength(0);
    expect(legacy.convergences).toHaveLength(0);
    // V6 strict face à V7 « je mange de tout ».
    expect(severityOf({ M1_Q09: 'A' }, { M1_Q19: 'F' }, 'M1_Q09')).toEqual([
      'moderee',
    ]);
  });

  it('tabac et alcool : ce que l’un accepte face à ce que l’autre fait', () => {
    expect(severityOf({ M0_Q11: 'A' }, { M0_Q09: 'C' }, 'M0_Q09')).toEqual([
      'critique',
    ]);
    expect(severityOf({ M0_Q11: 'A' }, { M0_Q09: 'B' }, 'M0_Q09')).toEqual([
      'majeure',
    ]);
    expect(severityOf({ M0_Q11: 'B' }, { M0_Q09: 'C' }, 'M0_Q09')).toEqual([
      'moderee',
    ]);
    // Un verre lors des fêtes face à « même occasionnel, non » : majeure…
    expect(severityOf({ M0_Q13: 'A' }, { M0_Q12: 'B' }, 'M0_Q12')).toEqual([
      'majeure',
    ]);
    // … critique si l'alcool est déclaré non négociable, ou chaque semaine.
    expect(
      severityOf({ M0_Q13: 'A', M8_Q12: 'I' }, { M0_Q12: 'B' }, 'M0_Q12'),
    ).toEqual(['critique']);
    expect(severityOf({ M0_Q13: 'A' }, { M0_Q12: 'C' }, 'M0_Q12')).toEqual([
      'critique',
    ]);
    expect(severityOf({ M0_Q13: 'B' }, { M0_Q12: 'D' }, 'M0_Q12')).toEqual([
      'majeure',
    ]);
    expect(find({ M0_Q13: 'C' }, { M0_Q12: 'D' }, 'M0_Q12')).toHaveLength(0);
    // V6 « rédhibitoire » (tabac, alcool, substances mêlés) : à explorer.
    expect(severityOf({ M0_Q08: 'A' }, { M0_Q12: 'C' }, 'M0_Q12')).toEqual([
      'moderee',
    ]);
  });

  it('famille : loyauté face à un parent et position face aux proches', () => {
    expect(severityOf({ M5_Q02: 'A' }, { M5_Q02: 'D' }, 'M5_Q02')).toEqual([
      'majeure',
    ]);
    expect(severityOf({ M5_Q02: 'E' }, { M5_Q02: 'D' }, 'M5_Q02')).toEqual([
      'majeure',
    ]);
    expect(find({ M5_Q02: 'A' }, { M5_Q02: 'E' }, 'M5_Q02')).toHaveLength(0);
    expect(severityOf({ M5_Q10: 'A' }, { M5_Q10: 'B' }, 'M5_Q10')).toEqual([
      'moderee',
    ]);
    expect(severityOf({ M5_Q10: 'A' }, { M5_Q10: 'D' }, 'M5_Q10')).toEqual([
      'majeure',
    ]);
  });

  it('famille d’origine : deux modèles de cris, ou de silence, à explorer ; jamais pénalisée seule', () => {
    const d = find({ M3_Q12: 'C' }, { M3_Q12: 'C' }, 'M3_Q12');
    expect(d[0]).toMatchObject({ severity: 'moderee', shared: true });
    const different = report({ M3_Q12: 'A' }, { M3_Q12: 'B' });
    expect(different.divergences).toHaveLength(0);
    expect(different.comparedQuestions).toBe(0);
  });

  it('intimité : avant le mariage et écart de désir, sans accord affiché sur l’intime', () => {
    expect(severityOf({ M10_Q17: 'A' }, { M10_Q17: 'C' }, 'M10_Q17')).toEqual([
      'majeure',
    ]);
    expect(
      severityOf({ M10_Q17: 'A', M8_Q12: 'G' }, { M10_Q17: 'C' }, 'M10_Q17'),
    ).toEqual(['critique']);
    expect(severityOf({ M10_Q17: 'A' }, { M10_Q17: 'D' }, 'M10_Q17')).toEqual([
      'moderee',
    ]);
    expect(
      report({ M10_Q17: 'A' }, { M10_Q17: 'A' }).convergences[0].label,
    ).toBe('Vous attendez tous les deux le mariage');
    expect(
      report({ M10_Q17: 'C' }, { M10_Q17: 'C' }).convergences,
    ).toHaveLength(0);
    expect(
      find({ M10_Q18: 'D' }, { M10_Q18: 'D' }, 'M10_Q18')[0],
    ).toMatchObject({
      severity: 'moderee',
      shared: true,
    });
    expect(report({ M10_Q18: 'A' }, { M10_Q18: 'B' }).comparedQuestions).toBe(
      0,
    );
  });

  it('disponibilité : une séparation en cours face à un engagement dans l’année', () => {
    const d = find({ M3_Q11: 'A' }, { M8_Q02: 'A' }, 'M3_Q11');
    expect(d[0].severity).toBe('moderee');
    // Une rupture récente encore douloureuse : on cite la date, jamais la douleur.
    const recent = find(
      { M3_Q11: 'B', M3_Q03: 'A' },
      { M8_Q02: 'A' },
      'M3_Q11',
    );
    expect(recent[0].a.text).toBe("S'est terminée il y a moins de 6 mois");
    expect(find({ M3_Q11: 'D' }, { M8_Q02: 'A' }, 'M3_Q11')).toHaveLength(0);
  });

  it('attention au quotidien : un aveu compte dans l’affinité, sans être cité', () => {
    const r = report({ M9_Q25: 'A' }, { M9_Q25: 'D' });
    expect(r.divergences).toHaveLength(0);
    expect(r.comparisons).toEqual([{ questionId: 'M9_Q25', value: 0.5 }]);
  });

  it('cycle de dispute : deux pauses bien prises sont un accord', () => {
    expect(
      report(
        { M6_Q16: 'A', M6_Q17: 'A' },
        { M6_Q16: 'A', M6_Q17: 'A' },
      ).convergences.map((c) => c.questionId),
    ).toEqual(['M6_Q16', 'M6_Q17']);
  });
});

describe('Membres V6 : réponses sans les nouvelles questions', () => {
  it('lit une réponse V6 de même sens dans les termes de la V7, sans écraser la V7', () => {
    expect(upgradeAnswers({ M1_Q10: 'B' }).M5_Q01).toBe('B');
    expect(upgradeAnswers({ M1_Q10: 'B', M5_Q01: 'D' }).M5_Q01).toBe('D');
    expect(upgradeAnswers({ M0_Q08: 'A' }).M0_Q11).toBe('A');
    expect(upgradeAnswers({ M0_Q08: 'C' }).M0_Q11).toBeUndefined();
    expect(upgradeAnswers({ M2_Q08: 'B' }).M2_Q22).toBeUndefined();
  });

  it('compare un membre V6 et un membre V7 sur les questions communes et les sujets traduits', () => {
    const old = v6({ M1_Q05: 'A', M1_Q06: 'A' }); // chrétien, même foi indispensable
    const now = v7({ M1_Q16: 'D', M1_Q17: 'B', M1_Q18: 'D' }); // musulmane
    const r = report(old, now);
    expect(r.comparedQuestions).toBeGreaterThan(30);
    expect(find(old, now, 'M1_Q05')[0].severity).toBe('critique');
    const score = computeAnswerCompatibility(old, now, r);
    expect(score.score).not.toBeNull();
    expect(score.modules.filter((m) => m.value !== null)).toHaveLength(11);
  });

  it('garde deux membres V6 identiques au plus haut, sans critique héritée', () => {
    const a = v6();
    const r = report(a, a);
    expect(r.divergences.filter((d) => d.severity !== 'mineure')).toEqual([]);
    expect(computeAnswerCompatibility(a, a, r).score).toBe(0.98);
  });

  it('rédige la fiche et le bilan d’un membre V6 avec ses propres questions', () => {
    const p = buildPortrait({
      firstName: 'Nadia',
      gender: 'F',
      age: 34,
      answers: v6({ M1_Q05: 'B', M1_Q06: 'B' }),
    });
    expect(p.clarity).toBe(100);
    expect(p.modules).toHaveLength(11);
    expect(p.details.religion).toBe('Musulmane pratiquante');
    expect(p.analysis).toMatch(/Sa foi musulmane/);
    const q = buildPortrait({
      firstName: 'Awa',
      gender: 'F',
      age: 30,
      answers: v7({ M1_Q16: 'D', M1_Q17: 'A', M1_Q18: 'A' }),
    });
    expect(q.clarity).toBe(100);
    expect(q.details.religion).toBe('Musulmane pratiquante');
    expect(q.analysis).toMatch(
      /Sa foi musulmane rythme son quotidien ; elle cherche quelqu’un qui la partage/,
    );
    expect(buildRelationalProfile(v6(), 'F')).not.toBeNull();
  });
});
