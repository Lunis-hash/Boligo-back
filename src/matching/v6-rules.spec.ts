import {
  buildDivergenceReport,
  buildCompatibilitySheet,
} from './divergence.engine';
import {
  mutuallyAccepted,
  shareLanguage,
  memberLanguages,
} from './discover-filters';

describe('Règles V6 (questions rétablies de la V5)', () => {
  it('deux silences de plusieurs jours forment une impasse (risque partagé)', () => {
    const r = buildDivergenceReport({ M6_Q01: 'D' }, { M6_Q01: 'D' });
    expect(r.divergences[0]).toMatchObject({
      questionId: 'M6_Q01',
      severity: 'majeure',
      shared: true,
    });
    const sheet = buildCompatibilitySheet(r, 'Nadia');
    expect(sheet.vigilance).toMatch(/répondu tous les deux/);
  });

  it('deux réparations très lentes : divergence majeure', () => {
    const r = buildDivergenceReport({ M2_Q07: 'D' }, { M2_Q07: 'D' });
    expect(r.divergences[0].severity).toBe('majeure');
  });

  it('violence physique : « rupture immédiate » face à « ça dépend »', () => {
    const r = buildDivergenceReport({ M6_Q04: 'A' }, { M6_Q04: 'C' });
    expect(r.divergences[0].severity).toBe('majeure');
    expect(
      buildDivergenceReport({ M6_Q04: 'A' }, { M6_Q04: 'A' }).convergences[0]
        .label,
    ).toMatch(/limite absolue/);
  });

  it('transmission culturelle et dot : divergences majeures', () => {
    expect(
      buildDivergenceReport({ M1_Q13: 'A' }, { M1_Q13: 'D' }).divergences[0]
        .severity,
    ).toBe('majeure');
    expect(
      buildDivergenceReport({ M4_Q07: 'A' }, { M4_Q07: 'D' }).divergences[0]
        .severity,
    ).toBe('majeure');
  });
});

describe('Croisement par langue (M0_Q10)', () => {
  const subject = (M0_Q10?: string) => ({
    age: 30,
    city: 'Paris, France',
    answers: { M0_Q02: 'D', ...(M0_Q10 ? { M0_Q10 } : {}) },
  });

  it('exige au moins une langue commune, dans les deux sens', () => {
    expect(mutuallyAccepted(subject('A,B'), subject('B,G'))).toBe(true);
    expect(mutuallyAccepted(subject('A'), subject('B'))).toBe(false);
    expect(mutuallyAccepted(subject('B'), subject('A'))).toBe(false);
  });

  it('considère un entretien antérieur comme francophone', () => {
    expect(memberLanguages({})).toEqual(['A']);
    expect(shareLanguage({}, { M0_Q10: 'A,D' })).toBe(true);
    expect(shareLanguage({}, { M0_Q10: 'B' })).toBe(false);
  });

  it('ne filtre pas sur « une autre langue » seule (trop vague)', () => {
    expect(memberLanguages({ M0_Q10: 'I' })).toBeNull();
    expect(shareLanguage({ M0_Q10: 'I' }, { M0_Q10: 'B' })).toBe(true);
    // « Autre » ne crée pas de langue commune.
    expect(shareLanguage({ M0_Q10: 'A,I' }, { M0_Q10: 'B,I' })).toBe(false);
  });
});
