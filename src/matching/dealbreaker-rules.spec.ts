import {
  buildDiscussionTopics,
  buildDivergenceReport,
} from './divergence.engine';

describe('Lignes rouges déclarées dans le Grand Entretien', () => {
  it('« Rédhibitoire » face à un partenaire qui consomme est une incompatibilité déclarée', () => {
    const report = buildDivergenceReport({ M0_Q08: 'A' }, { M0_Q08: 'C' });
    expect(report.hardStop).toBe(true);
    expect(report.divergences[0]).toMatchObject({
      questionId: 'M0_Q08',
      severity: 'critique',
    });
  });

  it('compare la place de la foi même quand la religion est la même', () => {
    const report = buildDivergenceReport(
      { M1_Q05: 'B', M1_Q06: 'A' },
      { M1_Q05: 'B', M1_Q06: 'D' },
    );
    expect(report.divergences.map((d) => [d.questionId, d.severity])).toEqual([
      ['M1_Q06', 'majeure'],
    ]);
    expect(buildDiscussionTopics(report, 'Karim')[0].title).toContain(
      'place de la foi',
    );
  });

  it('applique la ligne rouge « enfants ou religion » (M8_Q05 = C)', () => {
    const a = { M0_Q06: 'B', M8_Q05: 'C' };
    const b = { M0_Q06: 'D', M8_Q05: 'A' };
    expect(buildDivergenceReport(a, b).hardStop).toBe(true);
    // Sans ligne rouge déclarée, le même écart reste une divergence majeure.
    expect(buildDivergenceReport({ ...a, M8_Q05: 'A' }, b).hardStop).toBe(
      false,
    );
  });

  it('écrit BOLIGO correctement dans les sujets à aborder', () => {
    const report = buildDivergenceReport({ M8_Q01: 'A' }, { M8_Q01: 'D' });
    const title = buildDiscussionTopics(report, 'Karim')[0].title;
    expect(title).not.toMatch(/boligo/);
    expect(title).toContain('objectif de rencontre');
  });
});
