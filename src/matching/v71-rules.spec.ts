/**
 * Grand Entretien V7.1 : un test de non-régression par constat de l'audit
 * clinique (B1 à B7, M1 à M14, m1 à m9). Chaque cas reproduit la situation
 * vérifiée lors de l'audit et fixe le comportement corrigé.
 */
import { QUESTION_INDEX } from '../interview/questions.data';
import { QUESTIONS_EN } from '../interview/questions.en';
import { buildRelationalProfile } from '../psychometrics/psychometrics';
import {
  agreementFor,
  agreementKey,
  isDeferredAgreement,
} from '../journey/sondeur.pool';
import {
  buildDivergenceReport,
  Divergence,
  RawAnswers,
} from './divergence.engine';

const report = (a: RawAnswers, b: RawAnswers) => buildDivergenceReport(a, b);
const find = (a: RawAnswers, b: RawAnswers, id: string): Divergence[] =>
  report(a, b).divergences.filter((d) => d.questionId === id);
const severityOf = (a: RawAnswers, b: RawAnswers, id: string) =>
  find(a, b, id).map((d) => d.severity);
const themeStatus = (a: RawAnswers, b: RawAnswers, theme: string) =>
  report(a, b).themes.find((t) => t.theme === theme)?.status;

/** « Tout se discute » et « on apprend à vivre avec les désaccords », des deux côtés. */
const calm = { M8_Q12: 'K', M8_Q14: 'A' };

describe('B1 — P2 et P9 n’effacent plus les vrais non-négociables', () => {
  it('désir d’enfants « oui si » face à « non, définitif », avec K et A des deux côtés : incompatibilité déclarée', () => {
    const a = { ...calm, M0_Q06: 'B' };
    const b = { ...calm, M0_Q06: 'D' };
    const r = report(a, b);
    expect(severityOf(a, b, 'M0_Q06')).toEqual(['critique']);
    expect(r.hardStop).toBe(true);
    expect(themeStatus(a, b, 'famille')).toBe('divergence');
  });

  it('« tout se discute » seul n’est pas une déclaration : une majeure de projet de vie le reste', () => {
    expect(
      severityOf({ ...calm, M0_Q06: 'C' }, { ...calm, M0_Q06: 'D' }, 'M0_Q06'),
    ).toEqual(['majeure']);
  });

  it('deux membres qui ont coché d’autres sujets : le projet de vie n’est jamais adouci', () => {
    expect(
      severityOf(
        { M0_Q06: 'C', M8_Q12: 'C' },
        { M0_Q06: 'D', M8_Q12: 'D' },
        'M0_Q06',
      ),
    ).toEqual(['majeure']);
  });

  it('P9 ne baisse plus un sujet de projet de vie (polygamie, rôles)', () => {
    // Entretien V7 (M1_Q11) : « inacceptable » face à « en parler en
    // personne » reste à explorer, comme la V7.1 « exclue mais j'accepte
    // d'en parler » face à « pas de position arrêtée ».
    expect(
      severityOf(
        { M1_Q11: 'A', M8_Q14: 'A' },
        { M1_Q11: 'D', M8_Q14: 'A' },
        'M1_Q11',
      ),
    ).toEqual(['moderee']);
    expect(
      severityOf(
        { M1_Q20: 'B', M8_Q14: 'A' },
        { M1_Q20: 'D', M8_Q14: 'A' },
        'M1_Q20',
      ),
    ).toEqual(['moderee']);
    expect(
      severityOf(
        { M4_Q04: 'B', M8_Q14: 'C' },
        { M4_Q04: 'C', M8_Q14: 'A' },
        'M4_Q04',
      ),
    ).toEqual(['moderee']);
  });

  it('P9 garde son effet sur les sujets de caractère et d’habitudes', () => {
    expect(
      severityOf(
        { M7_Q08: 'A', M8_Q14: 'A' },
        { M7_Q08: 'B', M8_Q14: 'A' },
        'M7_Q08',
      ),
    ).toEqual(['mineure']);
    expect(
      severityOf({ M7_Q08: 'A', M8_Q14: 'C' }, { M7_Q08: 'B' }, 'M7_Q08'),
    ).toEqual(['majeure']);
  });
});

describe('B2 — désir d’enfants : le non-négociable le plus robuste', () => {
  it('« oui » ou « oui si » face à « non, définitif » : critique ; « pas certain(e) » face à « non » : majeure', () => {
    expect(severityOf({ M0_Q06: 'A' }, { M0_Q06: 'D' }, 'M0_Q06')).toEqual([
      'critique',
    ]);
    expect(severityOf({ M0_Q06: 'B' }, { M0_Q06: 'D' }, 'M0_Q06')).toEqual([
      'critique',
    ]);
    expect(severityOf({ M0_Q06: 'C' }, { M0_Q06: 'D' }, 'M0_Q06')).toEqual([
      'majeure',
    ]);
  });

  it('la question s’adresse aussi aux parents (« ou d’autres enfants »), en français et en anglais', () => {
    expect(QUESTION_INDEX.get('M0_Q06')!.text).toMatch(/ou d'autres enfants/);
    expect(QUESTIONS_EN.M0_Q06.text).toMatch(/or more children/);
  });
});

describe('M1 — la réaction à une infidélité n’est pas une mesure de fidélité', () => {
  it('« rupture immédiate » face à « épreuve surmontable », fidélité déclarée non négociable : pas d’incompatibilité', () => {
    const r = report(
      { M6_Q18: 'A', M8_Q12: 'C' },
      { M6_Q18: 'D', M8_Q12: 'C' },
    );
    expect(r.hardStop).toBe(false);
    expect(r.divergences[0]).toMatchObject({
      questionId: 'M6_Q18',
      severity: 'moderee',
      label: 'Réaction à une infidélité',
    });
    expect(severityOf({ M6_Q18: 'A' }, { M6_Q18: 'C' }, 'M6_Q18')).toEqual([
      'mineure',
    ]);
  });

  it('ce que chacun appelle « tromper » reste relevé par la fidélité déclarée', () => {
    expect(
      severityOf({ M6_Q19: 'G', M8_Q12: 'C' }, { M6_Q19: 'A,B,C,D' }, 'M6_Q19'),
    ).toEqual(['critique']);
  });
});

describe('M2 — la condition de conversion est dite comme une condition', () => {
  it('M1_Q18 B, en français et en anglais', () => {
    const b = QUESTION_INDEX.get('M1_Q18')!.options.find((o) => o.key === 'B')!;
    expect(b.text).toMatch(/condition/);
    expect(QUESTIONS_EN.M1_Q18.options![1]).toMatch(/condition/);
  });
});

describe('M4 — Bowen : deux fusions ou deux coupures ne font pas un accord', () => {
  it('même réponse à risque face aux proches : à explorer, jamais « même réponse »', () => {
    for (const key of ['A', 'C', 'D']) {
      const r = report({ M5_Q10: key }, { M5_Q10: key });
      expect(r.divergences[0]).toMatchObject({
        questionId: 'M5_Q10',
        severity: 'moderee',
        shared: true,
      });
      expect(r.convergences).toHaveLength(0);
    }
    for (const key of ['C', 'D']) {
      const r = report({ M5_Q02: key }, { M5_Q02: key });
      expect(r.divergences[0]).toMatchObject({
        questionId: 'M5_Q02',
        severity: 'moderee',
        shared: true,
      });
      expect(r.convergences).toHaveLength(0);
    }
    expect(report({ M5_Q10: 'B' }, { M5_Q10: 'B' }).convergences).toHaveLength(
      1,
    );
  });
});

describe('M12 — désirabilité sociale dans les scénarios', () => {
  /** Portrait idéalisé : aucun petit travers admis. */
  const idealized = {
    M9_Q08: 'E',
    M9_Q21: 'E',
    M9_Q20: 'A',
    M9_Q22: 'A',
    M9_Q23: 'A',
  };
  const good = { M6_Q16: 'A', M6_Q17: 'A' };

  it('une « bonne pratique » partagée n’est affichée que si aucun portrait n’est idéalisé', () => {
    expect(report(good, good).convergences).toHaveLength(2);
    expect(report({ ...good, ...idealized }, good).convergences).toHaveLength(
      0,
    );
  });

  it('les options « évidentes » sont reformulées (téléphone, loyauté face à un parent)', () => {
    const text = (id: string, key: string) =>
      QUESTION_INDEX.get(id)!.options.find((o) => o.key === key)!.text;
    expect(text('M5_Q08', 'B')).not.toMatch(/confiance/i);
    expect(text('M5_Q02', 'A')).not.toMatch(/immédiatement/);
    expect(text('M5_Q02', 'E')).not.toMatch(/sur le moment/);
  });
});

describe('M13 — le point neutre (50) ne confirme plus un retrait', () => {
  it('deux réparations très lentes avec un repli « rarement » restent à explorer', () => {
    const slow = { M2_Q07: 'D', M6_Q15: 'B', M6_Q23: 'B' };
    expect(find(slow, slow, 'M2_Q07')[0]).toMatchObject({
      severity: 'moderee',
      shared: true,
    });
    // Repli fréquent (75) : le risque partagé est confirmé.
    const walls = { M2_Q07: 'D', M6_Q15: 'D', M6_Q23: 'B' };
    expect(severityOf(walls, walls, 'M2_Q07')).toEqual(['majeure']);
  });
});

describe('m2 — une affirmation d’accord se cite en accord', () => {
  it('« intentions floues » face à M9_Q13 (échelle d’accord)', () => {
    const d = find({ M8_Q10: 'D' }, { M9_Q13: 'E' }, 'M8_Q10')[0];
    expect(d.b.text).toBe(
      'Tout à fait d’accord : je préfère ne pas définir la relation trop tôt',
    );
    const often = find({ M8_Q10: 'B' }, { M9_Q11: 'D' }, 'M8_Q10')[0];
    expect(often.b.text).toMatch(/^Il m’arrive souvent que/);
  });
});

describe('m4 — affirmations sans biais de revenu ni d’emploi', () => {
  it('M7_Q22 et M7_Q32', () => {
    expect(QUESTION_INDEX.get('M7_Q22')!.text).not.toMatch(/factures/);
    expect(QUESTION_INDEX.get('M7_Q32')!.text).toMatch(/études|famille/);
  });
});

describe('m9 — personne ne fait le premier pas', () => {
  it('« j’attends que l’autre revienne » face à « je ne m’excuse pas » : à explorer', () => {
    expect(severityOf({ M2_Q22: 'C' }, { M2_Q22: 'D' }, 'M2_Q22')).toEqual([
      'moderee',
    ]);
  });
});

describe('B3 — polygamie : son propre couple, sans réponse refuge', () => {
  it('exclue (même ouverte à la discussion) face à « envisageable » : incompatibilité déclarée, même avec K', () => {
    for (const key of ['A', 'B'])
      expect(
        severityOf(
          { ...calm, M1_Q20: key },
          { ...calm, M1_Q20: 'C' },
          'M1_Q20',
        ),
      ).toEqual(['critique']);
    expect(severityOf({ M1_Q20: 'A' }, { M1_Q20: 'D' }, 'M1_Q20')).toEqual([
      'majeure',
    ]);
    expect(severityOf({ M1_Q20: 'A' }, { M1_Q20: 'B' }, 'M1_Q20')).toEqual([
      'mineure',
    ]);
  });

  it('un entretien V7 (M1_Q11) est lu dans les termes de la V7.1', () => {
    expect(
      severityOf({ M1_Q11: 'B', ...calm }, { M1_Q20: 'C' }, 'M1_Q20'),
    ).toEqual(['critique']);
    expect(
      QUESTION_INDEX.get('M1_Q20')!.options.map((o) => o.text),
    ).not.toContain('Je préfère en parler en personne');
  });
});

describe('B5 — aide à la famille et dot : posées à tous, enfin comparées', () => {
  it('un Africain « ma famille compte sur moi » et « dot indispensable » face à une Européenne : comparé', () => {
    const africa = { M1_Q01: 'A', M4_Q16: 'A', M4_Q17: 'A' };
    const europe = { M1_Q01: 'C', M4_Q16: 'D', M4_Q17: 'D' };
    const r = report(africa, europe);
    expect(severityOf(africa, europe, 'M4_Q16')).toEqual(['critique']);
    expect(severityOf(africa, europe, 'M4_Q17')).toEqual(['critique']);
    expect(r.hardStop).toBe(true);
    for (const id of ['M4_Q16', 'M4_Q17'])
      expect(QUESTION_INDEX.get(id)!.rules?.dependsOn).toBeUndefined();
  });

  it('« absente de ma culture, mais je la respecterais » face à « indispensable » : une nuance', () => {
    expect(severityOf({ M4_Q17: 'A' }, { M4_Q17: 'C' }, 'M4_Q17')).toEqual([
      'mineure',
    ]);
  });

  it('passerelle V7 → V7.1 de la dot, et « bride price » en anglais', () => {
    expect(severityOf({ M4_Q07: 'C' }, { M4_Q17: 'D' }, 'M4_Q17')).toEqual([
      'majeure',
    ]);
    expect(JSON.stringify(QUESTIONS_EN)).not.toMatch(/dowry/i);
    expect(QUESTIONS_EN.M4_Q17.text).toMatch(/bride price/);
  });
});

describe('M8 — délai d’engagement : des options exhaustives', () => {
  it('« dans l’année » face à « sans échéance » : majeure ; passerelle de M8_Q02', () => {
    expect(severityOf({ M8_Q17: 'A' }, { M8_Q17: 'D' }, 'M8_Q17')).toEqual([
      'majeure',
    ]);
    expect(severityOf({ M8_Q02: 'A' }, { M8_Q02: 'C' }, 'M8_Q17')).toEqual([
      'majeure',
    ]);
    const texts = QUESTION_INDEX.get('M8_Q17')!.options.map((o) => o.text);
    expect(texts).toEqual(
      expect.arrayContaining(["Dans l'année", 'Dans un à deux ans']),
    );
  });
});

describe('M9 — cérémonies du mariage : civil, religieux et coutumier se cumulent', () => {
  it('« les deux, civil et religieux » face à « coutumier » n’est plus une nuance', () => {
    // V7 : M8_Q03 C face à E (mineure à l'audit).
    expect(severityOf({ M8_Q03: 'C' }, { M8_Q03: 'E' }, 'M8_Q16')).toEqual([
      'moderee',
    ]);
    // Mariage religieux exigé face à quelqu'un sans religion : majeure.
    expect(
      severityOf(
        { M8_Q16: 'A,B', M1_Q16: 'D' },
        { M8_Q16: 'A', M1_Q16: 'I' },
        'M8_Q16',
      ),
    ).toEqual(['majeure']);
    const same = report({ M8_Q16: 'A,C' }, { M8_Q16: 'A,C' });
    expect(same.divergences).toHaveLength(0);
    expect(same.convergences[0].label).toBe(
      'Pour vous deux, un mariage passe par le mariage civil et le mariage coutumier',
    );
  });
});

describe('m3 — bouddhisme et hindouisme, deux religions', () => {
  it('ne donne plus « même spiritualité » à un bouddhiste et une hindoue', () => {
    expect(severityOf({ M1_Q16: 'F' }, { M1_Q16: 'K' }, 'M1_Q16')).toEqual([
      'mineure',
    ]);
    expect(
      severityOf(
        { M1_Q16: 'F', M1_Q18: 'A' },
        { M1_Q16: 'K', M1_Q18: 'D' },
        'M1_Q16',
      ),
    ).toEqual(['critique']);
    expect(report({ M1_Q16: 'K' }, { M1_Q16: 'K' }).convergences[0].label).toBe(
      'Vous partagez la foi hindoue',
    );
  });

  it('deux « autre religion » dont l’un exige la sienne : à explorer', () => {
    expect(
      severityOf({ M1_Q16: 'J', M1_Q18: 'A' }, { M1_Q16: 'J' }, 'M1_Q16'),
    ).toEqual(['moderee']);
    expect(find({ M1_Q16: 'J' }, { M1_Q16: 'J' }, 'M1_Q16')).toHaveLength(0);
  });
});

describe('Sondeur : accords sur des questions retirées (V6 et V7)', () => {
  it('retrouve la clé d’un accord sur une question retirée, sans changer les questions actuelles', () => {
    const deferred = report({ M1_Q11: 'D' }, { M1_Q11: 'D' }).convergences[0];
    expect(deferred.questionId).toBe('M1_Q11');
    expect(agreementKey(deferred)).toBe('D');
    expect(isDeferredAgreement(deferred)).toBe(true);
    // Accord V6 qui a sa phrase propre : désormais servi.
    const v6 = report(
      { M1_Q05: 'A', M1_Q06: 'A' },
      { M1_Q05: 'A', M1_Q06: 'A' },
    ).convergences.find((c) => c.questionId === 'M1_Q06')!;
    expect(agreementKey(v6)).toBe('A');
    expect(agreementFor(v6).statement).toBe(
      'Partager la même foi compte pour vous deux.',
    );
    // Question actuelle : inchangé.
    const now = report({ M0_Q06: 'A' }, { M0_Q06: 'A' }).convergences[0];
    expect(agreementKey(now)).toBe('A');
  });

  it('un accord sur une question remplaçante reprend la phrase de la question remplacée, quand le sens est le même', () => {
    const c = report({ M1_Q20: 'A' }, { M1_Q20: 'A' }).convergences[0];
    expect(agreementFor(c).statement).toBe(
      'Pour vous deux, une union se vit à deux, sans exception.',
    );
    // Sans équivalent sûr : pas de phrase d'accord.
    const none = report({ M1_Q20: 'B' }, { M1_Q20: 'B' }).convergences[0];
    expect(agreementFor(none).statement).toBe('');
  });
});

describe('M5 — « tout se transmet » des deux côtés, avec deux religions ou deux cultures', () => {
  it('Afrique musulmane face à Europe catholique : deux transmissions concurrentes, jamais un accord', () => {
    const a = { M1_Q13: 'A', M1_Q01: 'A', M1_Q16: 'D' };
    const b = { M1_Q13: 'A', M1_Q01: 'C', M1_Q16: 'A' };
    const r = report(a, b);
    expect(find(a, b, 'M1_Q13')[0]).toMatchObject({
      severity: 'majeure',
      shared: true,
      label: 'Deux transmissions à concilier',
    });
    expect(r.convergences.some((c) => c.questionId === 'M1_Q13')).toBe(false);
    // Même foi, origines différentes : à explorer.
    expect(
      severityOf({ ...a, M1_Q16: 'A' }, { ...b, M1_Q16: 'A' }, 'M1_Q13'),
    ).toEqual(['moderee']);
    // Même origine et même foi : l'accord reste.
    expect(
      report({ ...a, M1_Q01: 'C', M1_Q16: 'A' }, b).convergences.some(
        (c) => c.questionId === 'M1_Q13',
      ),
    ).toBe(true);
  });
});

describe('M6 — la place de son ex est un fait ; ce que l’on accepte se compare', () => {
  it('« aucune place à mon ex » face à « ex dans mon entourage » n’est plus une divergence', () => {
    expect(find({ M3_Q05: 'A' }, { M3_Q05: 'D' }, 'M3_Q05')).toHaveLength(0);
    expect(report({ M3_Q05: 'A' }, { M3_Q05: 'D' }).comparedQuestions).toBe(0);
  });

  it('« je ne pourrais pas l’accepter » face à un ex resté proche : majeure ; « pour les enfants » face à une amitié : à explorer', () => {
    expect(
      severityOf({ M3_Q13: 'D' }, { M3_Q05: 'C', M3_Q13: 'A' }, 'M3_Q13'),
    ).toEqual(['majeure']);
    expect(
      severityOf({ M3_Q13: 'B' }, { M3_Q05: 'C', M3_Q13: 'A' }, 'M3_Q13'),
    ).toEqual(['moderee']);
    expect(
      find({ M3_Q13: 'D' }, { M3_Q05: 'A', M3_Q13: 'A' }, 'M3_Q13'),
    ).toHaveLength(0);
  });
});

describe('M7 — accueillir les enfants de l’autre', () => {
  it('« je ne pourrais pas l’accepter » face à un parent : incompatibilité déclarée ; « je préférerais l’éviter » : majeure', () => {
    const parent = { M0_Q05: 'B', M0_Q14: 'A' };
    expect(severityOf({ M0_Q14: 'D' }, parent, 'M0_Q14')).toEqual(['critique']);
    expect(severityOf({ M0_Q14: 'C' }, parent, 'M0_Q14')).toEqual(['majeure']);
    expect(severityOf({ M0_Q14: 'B' }, parent, 'M0_Q14')).toEqual(['moderee']);
    // Enfants autonomes : un cran en dessous.
    expect(severityOf({ M0_Q14: 'D' }, { M0_Q05: 'D' }, 'M0_Q14')).toEqual([
      'moderee',
    ]);
    // Le fait seul (avoir ou non des enfants) n'est plus comparé.
    expect(find({ M0_Q05: 'A' }, { M0_Q05: 'C' }, 'M0_Q05')).toHaveLength(0);
    expect(report({ M0_Q05: 'A' }, { M0_Q05: 'A' }).convergences[0].label).toBe(
      'Vous n’avez ni l’un ni l’autre d’enfant à charge',
    );
  });
});

describe('M11 — dire non à l’intimité : une observation pour le membre seul', () => {
  it('M10_Q19 remplace M6_Q08, n’est jamais comparée, et donne une observation bienveillante', () => {
    expect(QUESTION_INDEX.get('M10_Q19')!.moduleNumber).toBe(10);
    expect(report({ M10_Q19: 'A' }, { M10_Q19: 'B' }).comparedQuestions).toBe(
      0,
    );
    const profile = buildRelationalProfile({ M10_Q19: 'B' }, 'F');
    expect(profile?.observations.join(' ')).toMatch(/dire non simplement/);
    expect(buildRelationalProfile({ M10_Q19: 'A' }, 'F')).toBeNull();
  });
});
