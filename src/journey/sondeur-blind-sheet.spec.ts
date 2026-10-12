import {
  controlSummary,
  gapLine,
  pick,
} from '../../scripts/sondeur-blind-sheet';

const gaps = [
  {
    id: 'E1',
    kind: 'divergence',
    topic: "Désir d'enfants",
    a: 'Deux enfants',
    b: 'Quatre enfants',
  },
  { id: 'E2', kind: 'safety', topic: 'Violence', a: null, b: null },
  { id: 'E3', kind: 'convergence', topic: 'Lieu de vie', a: null, b: null },
  { id: 'E4', kind: 'neutral', topic: 'Tendresse', a: null, b: null },
];
const cases = new Map([
  ['C1', { id: 'C1', scenario: 'ecart_important', topics: ['enfants'], gaps }],
  ['C2', { id: 'C2', scenario: 'aucun_ecart', topics: [], gaps: [] }],
]);

function runs(model: string, n: number) {
  return ['C1', 'C2'].map((caseId) => ({
    model,
    caseId,
    drafted: n + 1,
    passedGate: n,
    formRejected: 1,
    evidenceRejected: 0,
    reasons: { P14: 1 },
    costMicro: 1000,
    latencyMs: 2000,
    questions: Array.from({ length: n }, (_, i) => ({
      text: `${model} ${caseId} q${i}`,
      evidence: caseId === 'C1' ? ['E1'] : [],
    })),
  }));
}

describe('fiche à l’aveugle du banc Sondeur', () => {
  it('écart en une ligne : réponses A/B, sécurité sans réponses, aucun écart', () => {
    expect(gapLine(cases.get('C1')!, ['E1'])).toBe(
      "Désir d'enfants : A « Deux enfants », B « Quatre enfants »",
    );
    expect(gapLine(cases.get('C1')!, ['E2'])).toBe(
      'Signal de sécurité (Violence)',
    );
    expect(gapLine(cases.get('C2')!, [])).toBe('Aucun écart détecté');
    expect(gapLine(cases.get('C1')!, ['E3'])).toBe(
      'Accord : Lieu de vie (mêmes réponses)',
    );
    expect(gapLine(cases.get('C1')!, ['E4'])).toBe(
      'Sujet ouvert, ni écart ni accord établi : Tendresse',
    );
  });

  it('30 questions, 5 à 7 par modèle, numérotées, couples variés', () => {
    const all = ['m/a', 'm/b', 'm/c', 'm/d', 'm/e'].flatMap((m) => runs(m, 6));
    const lines = pick(all, cases, 30);
    expect(lines).toHaveLength(30);
    expect(lines.map((l) => l.n)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
    const per = new Map<string, number>();
    for (const l of lines) per.set(l.model, (per.get(l.model) ?? 0) + 1);
    for (const v of per.values()) {
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(7);
    }
    // Les deux couples sont représentés pour chaque modèle.
    expect(new Set(lines.map((l) => l.caseId))).toEqual(new Set(['C1', 'C2']));
  });

  it('résumé du contrôle : rejets, raisons, coût et latence par modèle', () => {
    const [s] = controlSummary(runs('m/a', 3));
    expect(s).toMatchObject({
      model: 'm/a',
      drafted: 8,
      passed: 6,
      formRejected: 2,
      reasons: { P14: 2 },
      costEur: 0.002,
      latencyP50s: 2,
      errors: 0,
    });
  });
});
