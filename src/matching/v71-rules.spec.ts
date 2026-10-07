/**
 * Grand Entretien V7.1 : un test de non-régression par constat de l'audit
 * clinique (B1 à B7, M1 à M14, m1 à m9). Chaque cas reproduit la situation
 * vérifiée lors de l'audit et fixe le comportement corrigé.
 */
import { QUESTION_INDEX } from '../interview/questions.data';
import { QUESTIONS_EN } from '../interview/questions.en';
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

  it('P9 ne baisse plus un sujet de projet de vie (polygamie) et ne monte plus un simple fait (enfants déjà là)', () => {
    expect(
      severityOf(
        { M1_Q11: 'A', M8_Q14: 'A' },
        { M1_Q11: 'D', M8_Q14: 'A' },
        'M1_Q11',
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
