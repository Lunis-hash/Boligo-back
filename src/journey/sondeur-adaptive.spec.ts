import { buildDivergenceReport } from '../matching/divergence.engine';
import { V82_QUESTIONS } from '../interview/questions.v82';
import { assembleSondeur } from './sondeur.generator';
import { MIN_PER_DAY, adaptiveSelection } from './sondeur-adaptive';

type Q = {
  id: string;
  options: Array<{ key: string; freeText?: boolean; text: string }>;
};

function member(seed: number): Record<string, string> {
  let a = seed;
  const r = () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
  return Object.fromEntries(
    (V82_QUESTIONS as unknown as Q[])
      .filter((q) => q.options.length)
      .map((q) => {
        const o = q.options.filter(
          (x) => !x.freeText && !/ne pas répondre/i.test(x.text),
        );
        return [
          q.id,
          (o.length ? o[Math.floor(r() * o.length)] : q.options[0]).key,
        ];
      }),
  );
}

const served = (a: Record<string, string>, b: Record<string, string>) => {
  const report = buildDivergenceReport(a, b);
  const grid = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 's' });
  return { report, grid, kept: adaptiveSelection(grid, report) };
};

describe('Sondeur adaptatif', () => {
  it('un couple aux réponses identiques reçoit le minimum, pas la grille complète', () => {
    const a = member(3);
    const { grid, kept } = served(a, a);
    expect(grid.length).toBe(21);
    expect(kept.length).toBeLessThan(grid.length);
    for (const day of [1, 2, 3])
      expect(kept.filter((q) => q.day === day).length).toBeGreaterThanOrEqual(
        MIN_PER_DAY,
      );
  });

  it('plus d’écarts réels → plus de questions', () => {
    const a = member(5);
    const near = served(a, a).kept.length;
    const far = served(a, member(99)).kept.length;
    expect(far).toBeGreaterThan(near);
  });

  it('les limites de sécurité sont toujours posées', () => {
    let found = 0;
    for (let s = 1; s < 60 && found < 5; s++) {
      const { grid, kept } = served(member(s), member(s + 1000));
      const safety = grid.filter(
        (q) => q.subject === 'securite' || q.subject === 'controle',
      );
      if (!safety.length) continue;
      found += 1;
      for (const q of safety) expect(kept).toContain(q);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('l’ordre des questions est conservé', () => {
    const { grid, kept } = served(member(7), member(8));
    const idx = kept.map((q) => grid.indexOf(q));
    expect([...idx].sort((x, y) => x - y)).toEqual(idx);
  });
});
