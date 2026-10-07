import {
  buildDiscussionTopics,
  buildDivergenceReport,
} from './divergence.engine';

describe('Lignes rouges déclarées dans le Grand Entretien', () => {
  it('V6 : « Rédhibitoire » face à « je consomme moi-même » n’est plus une incompatibilité déclarée (ce peut être un verre lors des fêtes)', () => {
    const report = buildDivergenceReport({ M0_Q08: 'A' }, { M0_Q08: 'C' });
    expect(report.hardStop).toBe(false);
    expect(report.divergences[0]).toMatchObject({
      questionId: 'M0_Q08',
      severity: 'majeure',
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
    // V7.1 : « pas certain(e) » face à « non, c'est définitif » est majeure ;
    // la ligne rouge déclarée la rend incompatible.
    const a = { M0_Q06: 'C', M8_Q05: 'C' };
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

  it('repère un fumeur même s’il a répondu « sans importance » pour l’autre', () => {
    // V7.1 : le « rédhibitoire » V6 mêlait tabac, alcool et substances : un
    // sujet à explorer face à un fumeur régulier, plus une incompatibilité.
    const refuses = { M0_Q08: 'A', M0_Q09: 'A' };
    const smoker = { M0_Q08: 'D', M0_Q09: 'C' };
    const report = buildDivergenceReport(refuses, smoker);
    expect(report.hardStop).toBe(false);
    const tabac = report.divergences.find((d) => d.label === 'Tabac')!;
    expect(tabac.severity).toBe('moderee');
    expect(tabac.a.text).toMatch(/Rédhibitoire/);
    expect(tabac.b.text).toBe('Oui, régulièrement');
    // Sens inverse : les réponses restent attribuées au bon membre.
    const reverse = buildDivergenceReport(smoker, refuses).divergences.find(
      (d) => d.label === 'Tabac',
    )!;
    expect(reverse.a.text).toBe('Oui, régulièrement');
  });

  it('ne compte pas deux fois un ancien entretien sans la question « fumez-vous ? »', () => {
    const report = buildDivergenceReport(
      { M0_Q08: 'A' },
      { M0_Q08: 'C', M0_Q09: 'B' },
    );
    expect(
      report.divergences.filter((d) => /tabac/i.test(d.label)),
    ).toHaveLength(1);
  });

  it('reste une nuance entre « avec modération » (V6, toutes substances) et un fumeur régulier', () => {
    const report = buildDivergenceReport(
      { M0_Q08: 'B', M0_Q09: 'A' },
      { M0_Q08: 'D', M0_Q09: 'C' },
    );
    expect(report.hardStop).toBe(false);
    expect(report.divergences.find((d) => d.label === 'Tabac')?.severity).toBe(
      'mineure',
    );
    expect(
      buildDivergenceReport(
        { M0_Q08: 'D', M0_Q09: 'A' },
        { M0_Q08: 'D', M0_Q09: 'C' },
      ).divergences,
    ).toHaveLength(0);
  });
});
