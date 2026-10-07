/**
 * Grand Entretien V7.1 : un test de non-régression par constat de l'audit
 * clinique (B1 à B7, M1 à M14, m1 à m9). Chaque cas reproduit la situation
 * vérifiée lors de l'audit et fixe le comportement corrigé.
 */
import {
  languageChoices,
  suggestLanguages,
} from '../interview/country-languages';
import {
  QUESTIONS,
  QUESTION_INDEX,
  V71_CHANGES,
  V7_CHANGES,
} from '../interview/questions.data';
import { QUESTIONS_EN, localizeQuestion } from '../interview/questions.en';
import {
  SCALES,
  buildRelationalProfile,
  controlRisk,
} from '../psychometrics/psychometrics';
import {
  agreementFor,
  agreementKey,
  isDeferredAgreement,
} from '../journey/sondeur.pool';
import {
  SAFETY_QUESTIONS,
  describeReportForAi,
  safetyThemesOf,
} from '../journey/sondeur.generator';
import {
  buildCompatibilitySheet,
  buildDivergenceReport,
  Divergence,
  RawAnswers,
} from './divergence.engine';
import { homeContext, shareLanguage } from './discover-filters';
import { resolveScore } from './match-view';

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

describe('Section 3 — les questions décisives qui manquaient', () => {
  it('religion des enfants : « dans ma religion, indispensable » face à « sans éducation religieuse », ou deux religions différentes : incompatibilité', () => {
    const muslim = { M1_Q16: 'D', M8_Q18: 'A' };
    const catholic = { M1_Q16: 'A', M8_Q18: 'A' };
    expect(severityOf(muslim, catholic, 'M8_Q18')).toEqual(['critique']);
    expect(severityOf(muslim, { M1_Q16: 'D', M8_Q18: 'D' }, 'M8_Q18')).toEqual([
      'critique',
    ]);
    expect(severityOf(muslim, { M1_Q16: 'A', M8_Q18: 'B' }, 'M8_Q18')).toEqual([
      'majeure',
    ]);
    const same = report(muslim, { M1_Q16: 'D', M8_Q18: 'A' });
    expect(same.divergences.filter((d) => d.questionId === 'M8_Q18')).toEqual(
      [],
    );
    expect(same.convergences.map((c) => c.questionId)).toContain('M8_Q18');
  });

  it('vivre ensemble avant le mariage : « exclu » face à « souhaitable » est majeur', () => {
    expect(severityOf({ M8_Q19: 'A' }, { M8_Q19: 'D' }, 'M8_Q19')).toEqual([
      'majeure',
    ]);
  });

  it('une tape pour éduquer : « bonne éducation » face à « jamais » est majeur, et une tolérance partagée n’est jamais affichée comme un accord', () => {
    expect(severityOf({ M8_Q20: 'A' }, { M8_Q20: 'D' }, 'M8_Q20')).toEqual([
      'majeure',
    ]);
    expect(report({ M8_Q20: 'A' }, { M8_Q20: 'A' }).convergences).toEqual([]);
    expect(report({ M8_Q20: 'D' }, { M8_Q20: 'D' }).convergences[0].label).toBe(
      'Vous refusez tous les deux toute tape pour éduquer un enfant',
    );
  });

  it('retour au pays : un projet proche face à « ma vie est ici » est majeur', () => {
    expect(severityOf({ M7_Q36: 'A' }, { M7_Q36: 'C' }, 'M7_Q36')).toEqual([
      'majeure',
    ]);
  });

  it('jeux d’argent : ce que l’un refuse face à ce que l’autre fait', () => {
    expect(severityOf({ M0_Q16: 'A' }, { M0_Q15: 'B' }, 'M0_Q15')).toEqual([
      'majeure',
    ]);
    expect(severityOf({ M0_Q16: 'A' }, { M0_Q15: 'C' }, 'M0_Q15')).toEqual([
      'critique',
    ]);
    expect(severityOf({ M0_Q16: 'B' }, { M0_Q15: 'D' }, 'M0_Q15')).toEqual([
      'majeure',
    ]);
    expect(find({ M0_Q16: 'C' }, { M0_Q15: 'D' }, 'M0_Q15')).toHaveLength(0);
  });

  it('retraits justifiés : plus posés, toujours lus pour les entretiens enregistrés', () => {
    for (const id of ['M2_Q10', 'M3_Q07', 'M1_Q03', 'M4_Q06'])
      expect(QUESTION_INDEX.get(id)).toBeDefined();
    expect(severityOf({ M4_Q06: 'A' }, { M4_Q06: 'B' }, 'M4_Q06')).toEqual([
      'moderee',
    ]);
    expect(severityOf({ M1_Q03: 'A' }, { M1_Q03: 'D' }, 'M1_Q03')).toEqual([
      'moderee',
    ]);
  });
});

describe('B6 — le contrôle coercitif devient visible, sans accuser', () => {
  /** Le profil de l'audit : téléphone, insistance, transparence totale, amitiés refusées. */
  const controlling = {
    M9_Q11: 'E',
    M9_Q24: 'E',
    M5_Q08: 'A',
    M5_Q09: 'D',
  };

  it('le profil de l’audit est une incompatibilité déclarée, même sans signal d’alerte chez l’autre', () => {
    const r = report(controlling, { M5_Q08: 'B' });
    const d = r.divergences.find((x) => x.questionId === 'M9_Q24')!;
    expect(controlRisk(controlling)).toBe('eleve');
    expect(d).toMatchObject({
      severity: 'critique',
      theme: 'communication',
      label: 'Respect des limites et de la liberté de l’autre',
      neutral: true,
    });
    expect(r.hardStop).toBe(true);
    // Jamais une réponse citée, jamais le membre concerné.
    expect(d.a).toEqual(d.b);
    expect(d.a.text).not.toMatch(/téléphone|insiste|transparence/i);
    const sheet = buildCompatibilitySheet(r, 'Awa');
    expect(sheet.vigilance).toMatch(/sans qu’aucune réponse ne soit citée/);
    expect(sheet.vigilance).not.toMatch(/Awa a répondu/);
  });

  it('deux signes de contrôle : à vérifier (majeure) ; un seul : rien', () => {
    expect(severityOf({ M9_Q26: 'D', M9_Q27: 'E' }, {}, 'M9_Q24')).toEqual([
      'majeure',
    ]);
    expect(find({ M9_Q26: 'D' }, {}, 'M9_Q24')).toHaveLength(0);
    // Des normes de couple seules ne suffisent jamais.
    expect(find({ M5_Q08: 'A', M5_Q09: 'D' }, {}, 'M9_Q24')).toHaveLength(0);
  });

  it('des réponses acquiescentes ne font pas un profil de contrôle', () => {
    const yes = Object.fromEntries(
      [
        ...SCALES.anxiety.items,
        ...SCALES.avoidance.items,
        ...SCALES.reappraisal.items,
      ].map((i) => [i.id, 'E']),
    );
    const attitudes = { M9_Q26: 'E', M9_Q27: 'E', M9_Q28: 'E' };
    expect(controlRisk({ ...yes, ...attitudes })).toBe('aucun');
    expect(controlRisk(attitudes)).toBe('eleve');
  });

  it('le Sondeur ne pose que des questions de limite, et le résumé de l’IA ne cite rien', () => {
    expect(SAFETY_QUESTIONS.has('M9_Q24')).toBe(true);
    const r = report(controlling, {});
    expect(safetyThemesOf(r)).toContain('communication');
    const summary = describeReportForAi(r, ['A', 'B']);
    expect(summary).toMatch(
      /Respect des limites et de la liberté de l’autre : LIMITE DE SÉCURITÉ/,
    );
    expect(summary).not.toMatch(/Point de vigilance tiré/);
  });

  it('M9_Q24 dit enfin la situation (insister pour quoi ?)', () => {
    expect(QUESTION_INDEX.get('M9_Q24')!.text).toMatch(
      /jusqu'à ce qu'il ou elle cède/,
    );
    expect(QUESTIONS_EN.M9_Q24.text).toMatch(/until they give in/);
  });
});

describe('M3 — violence physique : tolérance et justification séparées', () => {
  it('« ça dépend » face à « inacceptable » ou des deux côtés : incompatibilité déclarée ; face à « je ne sais pas » : majeure', () => {
    expect(severityOf({ M6_Q04: 'B' }, { M6_Q04: 'C' }, 'M6_Q04')).toEqual([
      'critique',
    ]);
    expect(severityOf({ M6_Q04: 'C' }, { M6_Q04: 'C' }, 'M6_Q04')).toEqual([
      'critique',
    ]);
    expect(severityOf({ M6_Q04: 'C' }, { M6_Q04: 'D' }, 'M6_Q04')).toEqual([
      'majeure',
    ]);
  });

  it('« une gifle peut se comprendre » face à une limite : incompatibilité déclarée, jamais citée', () => {
    const d = find({ M6_Q24: 'D' }, { M6_Q04: 'A' }, 'M6_Q24')[0];
    expect(d).toMatchObject({ severity: 'critique', neutral: true });
    expect(SAFETY_QUESTIONS.has('M6_Q24')).toBe(true);
    expect(find({ M6_Q24: 'C' }, { M6_Q04: 'A' }, 'M6_Q24')).toHaveLength(0);
    // Ni « tout se discute » ni l'acceptation des désaccords ne l'adoucissent.
    expect(
      severityOf({ M6_Q24: 'E', ...calm }, { M6_Q04: 'B', ...calm }, 'M6_Q24'),
    ).toEqual(['critique']);
  });
});

describe('B4 — lieu de vie : « je reste » se lit avec la ville et le pays', () => {
  const paris = { city: 'Paris, France' };
  const lyon = { city: 'Lyon, France' };
  const dakar = { city: 'Dakar, Sénégal' };
  type Home = { city: string };
  const at = (a: RawAnswers, b: RawAnswers, ha: Home, hb: Home) =>
    buildDivergenceReport(a, b, homeContext(ha, hb));
  const home = (r: ReturnType<typeof at>) =>
    r.divergences.filter((d) => d.questionId === 'M0_Q03');
  const stays = { M0_Q03: 'D', M7_Q07: 'A' };

  it('deux « je reste où je suis » dans deux pays : incompatibilité déclarée, plus aucun accord', () => {
    const r = at(stays, stays, paris, dakar);
    expect(home(r)).toHaveLength(1);
    expect(home(r)[0]).toMatchObject({
      severity: 'critique',
      theme: 'lieu',
      label: 'Chacun attaché à son pays',
    });
    expect(r.hardStop).toBe(true);
    // Ni accord affiché ni accord du Sondeur sur « rester où l'on est ».
    expect(
      r.convergences.filter((c) => ['M0_Q03', 'M7_Q07'].includes(c.questionId)),
    ).toEqual([]);
  });

  it('même ville, ou lieu inconnu : l’accord reste un accord', () => {
    const labels = [
      'Vous tenez tous les deux à rester où vous êtes',
      'Vous vous voyez tous les deux rester dans votre ville',
    ];
    for (const r of [
      at(stays, stays, paris, { city: 'Paris, France' }),
      buildDivergenceReport(stays, stays),
      buildDivergenceReport(stays, stays, homeContext(null, dakar)),
    ]) {
      expect(home(r)).toEqual([]);
      expect(r.convergences.map((c) => c.label)).toEqual(
        expect.arrayContaining(labels),
      );
    }
  });

  it('dans deux pays : un seul attachement est majeur ; deux « ça dépend de la distance », modérés', () => {
    expect(home(at({ M0_Q03: 'D' }, { M0_Q03: 'A' }, paris, dakar))).toEqual([
      expect.objectContaining({
        severity: 'majeure',
        label: 'Vivre dans le même pays',
      }),
    ]);
    // « Même ville dans cinq ans » sans s'être dit prêt(e) à déménager.
    expect(
      home(at({ M0_Q03: 'C', M7_Q07: 'A' }, { M0_Q03: 'B' }, paris, dakar)),
    ).toEqual([expect.objectContaining({ severity: 'majeure' })]);
    expect(
      home(at({ M0_Q03: 'C' }, { M0_Q03: 'C' }, paris, dakar)).map(
        (d) => d.severity,
      ),
    ).toEqual(['moderee']);
    // Deux membres prêts à déménager : un vrai accord, où qu'ils vivent.
    const mobile = at({ M0_Q03: 'A' }, { M0_Q03: 'A' }, paris, dakar);
    expect(home(mobile)).toEqual([]);
    expect(mobile.convergences.map((c) => c.questionId)).toContain('M0_Q03');
  });

  it('deux villes d’un même pays : majeure pour deux refus nets, modérée pour deux attachements', () => {
    expect(home(at(stays, stays, paris, lyon))).toEqual([
      expect.objectContaining({
        severity: 'majeure',
        label: 'Chacun attaché à sa ville',
      }),
    ]);
    const attached = { M0_Q03: 'C', M7_Q07: 'A' };
    expect(
      home(at(attached, attached, paris, lyon)).map((d) => d.severity),
    ).toEqual(['moderee']);
    expect(
      at(attached, attached, paris, lyon).convergences.map((c) => c.questionId),
    ).not.toContain('M7_Q07');
  });

  it('la fiche de compatibilité passe le lieu de chacun au moteur', () => {
    const r = resolveScore(
      { answers: stays, mentalMap: null, ...paris },
      { answers: stays, mentalMap: null, ...dakar },
    );
    expect(r.report.hardStop).toBe(true);
    expect(
      resolveScore(
        { answers: stays, mentalMap: null, ...paris },
        { answers: stays, mentalMap: null, ...paris },
      ).report.hardStop,
    ).toBe(false);
  });

  it('lit « Ville, Pays » sans accents ni casse ; un seul élément ne donne pas de pays', () => {
    expect(
      homeContext(dakar, { city: null, profile: { displayedCity: 'Paris' } }),
    ).toEqual({
      cityA: 'dakar',
      cityB: 'paris',
      countryA: 'senegal',
      countryB: null,
    });
  });
});

describe('B7 — un membre sans accord ne fait plus disparaître les incompatibilités', () => {
  // Exigeante : même religion, monogamie, attente du mariage, tout non négociable.
  const demanding: RawAnswers = {
    M0_Q12: 'A',
    M1_Q15: 'B',
    M1_Q16: 'D',
    M1_Q17: 'A',
    M1_Q18: 'A',
    M1_Q20: 'A',
    M8_Q12: 'B,G,H',
    M10_Q11: 'C',
    M10_Q17: 'A',
  };
  // Sans accord pour les données sensibles : ni religion, ni polygamie, ni intimité.
  const silent: RawAnswers = {
    M0_Q12: 'A',
    M1_Q15: 'C',
    M8_Q12: 'A',
    M10_Q11: 'B',
  };
  const hidden = (r: ReturnType<typeof report>) =>
    r.divergences.filter((d) => d.undisclosed);

  it('chaque sujet central non renseigné devient une divergence, sans réponse citée', () => {
    const r = report(demanding, silent);
    expect(
      hidden(r)
        .map((d) => [d.questionId, d.severity, d.nonNegotiable])
        .sort(),
    ).toEqual([
      ['M10_Q17', 'majeure', true],
      ['M1_Q16', 'majeure', true],
      ['M1_Q20', 'majeure', true],
    ]);
    // Une inconnue n'est pas une incompatibilité déclarée.
    expect(r.hardStop).toBe(false);
    for (const d of hidden(r)) {
      expect(d.label).toMatch(/^Sujet non renseigné par l’un de vous : /);
      expect([d.a.text, d.b.text].sort()).toEqual([
        'Non renseigné',
        'Renseigné',
      ]);
    }
    // Les deux sens donnent le même signal.
    expect(hidden(report(silent, demanding))).toHaveLength(3);
  });

  it('la fiche le dit toujours, et le Sondeur en reçoit le sujet sans réponse', () => {
    const r = report(demanding, silent);
    const sheet = buildCompatibilitySheet(r, 'Awa');
    expect([...sheet.undisclosed].sort()).toEqual([
      'la polygamie',
      'la religion',
      'l’intimité avant le mariage',
    ]);
    expect(sheet.vigilance).toMatch(/non renseigné par l’un de vous/i);
    expect(sheet.vigilance).not.toMatch(/Musulman|Exclue|attends le mariage/);
    const summary = describeReportForAi(r, ['A', 'B']);
    expect(summary).toMatch(/SUJET NON RENSEIGNÉ par l'un des deux/);
    expect(summary).not.toMatch(/« Renseigné »|« Non renseigné »/);
  });

  it('modérée sans non-négociable ni position nette', () => {
    const r = report(
      { M0_Q12: 'A', M1_Q15: 'B', M1_Q16: 'I', M1_Q20: 'B' },
      silent,
    );
    expect(hidden(r).map((d) => d.severity)).toEqual(['moderee', 'moderee']);
  });

  it('rien sans entretien du module, ni pour une question que l’entretien V6 ne posait pas, ni pour « j’en parlerai en personne »', () => {
    expect(hidden(report(demanding, { M0_Q12: 'A' }))).toEqual([]);
    // Entretien V6 complet (M1_Q05 : religion) : seule l'intimité manque, et
    // la V6 ne la demandait pas.
    const v6: RawAnswers = { M1_Q05: 'A', M1_Q11: 'A', M10_Q01: 'A' };
    expect(hidden(report(demanding, v6))).toEqual([]);
    expect(
      hidden(report({ ...demanding, M10_Q17: 'D' }, silent)).map(
        (d) => d.questionId,
      ),
    ).not.toContain('M10_Q17');
  });
});

describe('Point 6 — relecture culturelle', () => {
  const culture = (a: RawAnswers, b: RawAnswers) => severityOf(a, b, 'M1_Q02');

  it('origine par région : une Martiniquaise et une Américaine, un Congolais et un Somalien ne partagent plus « la même origine »', () => {
    // Caraïbes (G) et Amérique du Nord (H) : même continent, cultures proches.
    expect(
      culture({ M1_Q21: 'G', M1_Q02: 'A' }, { M1_Q21: 'H', M1_Q02: 'A' }),
    ).toEqual(['moderee']);
    // Afrique centrale (B) et Afrique de l'Est (C).
    expect(culture({ M1_Q21: 'B', M1_Q02: 'A' }, { M1_Q21: 'C' })).toEqual([
      'moderee',
    ]);
    // « Une culture proche » : deux régions d'un même continent conviennent.
    expect(culture({ M1_Q21: 'B', M1_Q02: 'B' }, { M1_Q21: 'C' })).toEqual([]);
    // Deux continents : comme avant.
    expect(culture({ M1_Q21: 'A', M1_Q02: 'A' }, { M1_Q21: 'J' })).toEqual([
      'majeure',
    ]);
    const same = report({ M1_Q21: 'G', M1_Q02: 'A' }, { M1_Q21: 'A,G' });
    expect(same.convergences.map((c) => c.label)).toContain(
      'Vous partagez une origine culturelle',
    );
  });

  it('une réponse V7 (continent) reste comparée par continent, sans rien supposer de plus fin', () => {
    expect(
      culture({ M1_Q01: 'A', M1_Q02: 'A' }, { M1_Q21: 'B', M1_Q02: 'A' }),
    ).toEqual([]);
    expect(culture({ M1_Q01: 'E', M1_Q02: 'A' }, { M1_Q21: 'A' })).toEqual([
      'majeure',
    ]);
    // La transmission lit la même origine.
    const both = { M1_Q13: 'A', M1_Q16: 'D' };
    expect(
      find({ ...both, M1_Q21: 'G' }, { ...both, M1_Q21: 'H' }, 'M1_Q13').map(
        (d) => d.label,
      ),
    ).toEqual(['Deux transmissions à concilier']);
  });

  it('le créole (Kreyòl) : proposé en Haïti, pré-écrit aux Antilles, reconnu en toutes lettres', () => {
    expect(suggestLanguages('Port-au-Prince, Haïti')).toEqual({
      keys: ['J', 'A'],
    });
    expect(languageChoices('Fort-de-France, Martinique')).toEqual({
      optionKeys: ['A', 'B', 'H', 'I'],
      suggested: ['A', 'I'],
      other: 'Créole',
    });
    expect(
      shareLanguage(
        { M0_Q10: 'A,I', M0_Q10_AUTRE: 'Créole' },
        { M0_Q10: 'J,H' },
      ),
    ).toBe(true);
    const q = QUESTION_INDEX.get('M0_Q10')!;
    expect(q.options.map((o) => o.text)).toContain('Créole — Kreyòl');
    expect(QUESTIONS_EN.M0_Q10.options).toHaveLength(q.options.length);
  });

  it('niveau d’études hors du seul système français ; « bride price » en anglais ; M4_Q13 dans l’argent', () => {
    const studies = QUESTION_INDEX.get('M0_Q07')!.options.map((o) => o.text);
    expect(studies.join(' ')).not.toMatch(/CAP|BEP|Bac \+/);
    expect(QUESTIONS_EN.M4_Q17.text).toMatch(/bride price/);
    expect(JSON.stringify(QUESTIONS_EN)).not.toMatch(/dowry/i);
    expect(
      find({ M4_Q13: 'A' }, { M4_Q13: 'D' }, 'M4_Q13').map((d) => d.theme),
    ).toEqual(['argent']);
  });

  it('table V7.1 : une question nouvelle ou retirée l’est aussi dans la V7', () => {
    const current = new Set(QUESTIONS.map((q) => q.id));
    for (const [id, change] of Object.entries(V71_CHANGES)) {
      if (change === 'nouvelle' || change === 'retiree')
        expect(V7_CHANGES[id]).toBe(change);
      expect(current.has(id)).toBe(change !== 'retiree');
    }
  });
});

describe('m5 — charge : jamais plus de douze affirmations d’affilée', () => {
  const ofModule = (m: number) => QUESTIONS.filter((q) => q.moduleNumber === m);

  it('dans chaque module, au plus douze affirmations d’échelle à la suite et une bascule accord / fréquence', () => {
    for (let m = 0; m <= 10; m++) {
      let run = 0;
      let longest = 0;
      let switches = 0;
      let last: string | undefined;
      for (const q of ofModule(m)) {
        if (!q.scale) {
          run = 0;
          continue;
        }
        longest = Math.max(longest, ++run);
        if (last && last !== q.scale) switches++;
        last = q.scale;
      }
      expect(longest).toBeLessThanOrEqual(12);
      expect(switches).toBeLessThanOrEqual(1);
    }
  });

  it('le désir est demandé avant l’allure, pas à bout de fatigue', () => {
    const ids = ofModule(10).map((q) => q.id);
    for (const intimate of ['M10_Q16', 'M10_Q17', 'M10_Q18', 'M10_Q19'])
      for (const allure of ['M10_Q11', 'M10_Q12', 'M10_Q13', 'M10_Q14'])
        expect(ids.indexOf(intimate)).toBeLessThan(ids.indexOf(allure));
  });
});

describe('m7 — pas d’option « Marié(e) » : l’aide de M0_Q04 le dit', () => {
  it('en français et en anglais', () => {
    const q = QUESTION_INDEX.get('M0_Q04')!;
    expect(q.options.map((o) => o.text).join(' ')).not.toMatch(/mari/i);
    expect(q.assistance).toMatch(/libres de s'engager/);
    expect(localizeQuestion(q, 'en').assistance).toMatch(/free to commit/);
    // Une question sans aide n'en reçoit pas en anglais.
    expect(
      localizeQuestion(QUESTION_INDEX.get('M0_Q05')!, 'en').assistance,
    ).toBeUndefined();
  });
});
