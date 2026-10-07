import {
  alphaIfDeleted,
  correctedItemTotal,
  cronbachAlpha,
  describe as describeSeries,
  oneFactorLoadings,
  omegaTotal,
  pearson,
} from './reliability';

/** Générateur pseudo-aléatoire reproductible (mulberry32) et loi normale. */
function normalGenerator(seed: number): () => number {
  let a = seed;
  const uniform = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () =>
    Math.sqrt(-2 * Math.log(uniform() || 1e-12)) *
    Math.cos(2 * Math.PI * uniform());
}

/** n membres, k affirmations saturées à `loading` sur un même facteur. */
function oneFactorSample(n: number, k: number, loading: number): number[][] {
  const z = normalGenerator(42);
  return Array.from({ length: n }, () => {
    const f = z();
    return Array.from(
      { length: k },
      () => loading * f + Math.sqrt(1 - loading ** 2) * z(),
    );
  });
}

describe('Fiabilité des échelles (validation psychométrique)', () => {
  it('alpha de Cronbach : exemple calculé à la main', () => {
    // Variances : 1 et 4/3 ; total 13/3 → alpha = 2 × (1 − (7/3)/(13/3)).
    expect(
      cronbachAlpha([
        [1, 2],
        [2, 2],
        [3, 4],
      ]),
    ).toBeCloseTo(12 / 13, 6);
    expect(cronbachAlpha([[1, 2]])).toBeNull();
  });

  it('affirmations identiques : alpha 1, corrélations item-total 1', () => {
    const rows = [1, 2, 3, 4, 5].map((v) => [v, v, v]);
    expect(cronbachAlpha(rows)).toBeCloseTo(1, 6);
    for (const r of correctedItemTotal(rows)) expect(r).toBeCloseTo(1, 6);
  });

  it('oméga retrouve la fiabilité théorique d’un modèle à un facteur', () => {
    // Six affirmations saturées à 0,7 : oméga = 4,2² / (4,2² + 6 × 0,51) ≈ 0,852.
    const rows = oneFactorSample(5000, 6, 0.7);
    expect(omegaTotal(rows)!).toBeCloseTo(0.852, 1);
    for (const l of oneFactorLoadings(rows)!) expect(l).toBeCloseTo(0.7, 1);
    // Sur des affirmations parallèles, alpha et oméga se rejoignent.
    expect(Math.abs(cronbachAlpha(rows)! - omegaTotal(rows)!)).toBeLessThan(
      0.02,
    );
  });

  it('une affirmation qui ne mesure rien fait monter l’alpha quand on la retire', () => {
    const rows = oneFactorSample(2000, 4, 0.7).map((r, i) => [
      ...r,
      ((i * 7919) % 13) / 13,
    ]);
    const without = alphaIfDeleted(rows);
    expect(without[4]!).toBeGreaterThan(cronbachAlpha(rows)!);
    expect(Math.abs(correctedItemTotal(rows)[4])).toBeLessThan(0.1);
  });

  it('une série constante n’a pas de corrélation ; quartiles d’une série', () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNaN();
    expect(omegaTotal([1, 2, 3].map(() => [1, 2]))).toBeNull();
    expect(describeSeries([1, 2, 3, 4, 5])).toMatchObject({
      n: 5,
      mean: 3,
      median: 3,
      q1: 2,
      q3: 4,
    });
  });
});
