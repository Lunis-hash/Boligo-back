import {
  RawAnswers,
  buildCompatibilitySheet,
  buildDivergenceReport,
} from './divergence.engine';
import { NATIVE_RULES, v82EngineView } from './v82-native.rules';
import { computeAnswerCompatibility } from '../portrait/module-affinity';
import { QUESTIONS } from '../interview/questions.data';

const report = (a: RawAnswers, b: RawAnswers) => buildDivergenceReport(a, b);
const sev = (a: RawAnswers, b: RawAnswers, id: string) =>
  report(a, b)
    .divergences.filter((d) => d.questionId === id)
    .map((d) => d.severity);
/** Marqueur V8.2 : une réponse propre à la V8.2. */
const v82 = (o: RawAnswers): RawAnswers => ({ V82_M2_01: 'C', ...o });

describe('V8.2 — non-régression V7.1', () => {
  it('un entretien V7.1 est lu tel quel par le moteur (même objet, même rapport)', () => {
    const a: RawAnswers = {};
    const b: RawAnswers = {};
    QUESTIONS.forEach((q, i) => {
      a[q.id] = q.options[i % q.options.length].key;
      b[q.id] = q.options[(i + 1) % q.options.length].key;
    });
    expect(v82EngineView(a)).toBe(a);
    const r = report(a, b);
    expect(r.questionnaire).toBeUndefined();
    expect(r.divergences.some((d) => d.questionId.startsWith('V82_'))).toBe(
      false,
    );
  });
});

describe('V8.2 — vue moteur (aucune réponse inventée)', () => {
  it('« je préfère ne pas répondre » et les options propres à la V8.2 ne créent aucun écart', () => {
    // M0_Q06 E = « Je préfère ne pas répondre » (ajoutée en V8.2).
    expect(sev(v82({ M0_Q06: 'A' }), v82({ M0_Q06: 'E' }), 'M0_Q06')).toEqual(
      [],
    );
    expect(v82EngineView(v82({ M0_Q06: 'E' })).M0_Q06).toBeUndefined();
    // M9_Q24 « Non applicable ».
    expect(v82EngineView(v82({ M9_Q24: 'NA' })).M9_Q24).toBeUndefined();
  });

  it('agnostique et athée : famille « sans religion » (aucun écart de foi entre eux)', () => {
    expect(v82EngineView(v82({ M1_Q16: 'L' })).M1_Q16).toBe('I');
    expect(v82EngineView(v82({ M1_Q16: 'M' })).M1_Q16).toBe('I');
    expect(v82EngineView(v82({ M1_Q16: 'N' })).M1_Q16).toBeUndefined();
    const r = report(
      v82({ M1_Q16: 'L', M1_Q18: 'A' }),
      v82({ M1_Q16: 'M', M1_Q18: 'A' }),
    );
    expect(r.divergences.filter((d) => d.theme === 'spiritualite')).toEqual([]);
  });

  it('couche de compatibilité : seulement les équivalences démontrées du modèle', () => {
    const view = v82EngineView(
      v82({ V82_M3_01: 'B', V82_M8_01: 'C', V82_M4_05: 'A', V82_M0_03: 'B' }),
    );
    expect(view.M3_Q11).toBe('A');
    // V82_M8_01 C n'a pas d'équivalent V7.
    expect(view.M8_Q01).toBeUndefined();
    expect(view.M4_Q15).toBe('C');
    // Enfants à charge : nombre inconnu, aucune réponse V7 inventée.
    expect(view.M0_Q05).toBeUndefined();
    expect(v82EngineView(v82({ V82_M0_03: 'A' })).M0_Q05).toBe('A');
  });
});

describe('V8.2 — règles natives', () => {
  it('11 règles de la stratégie A, plus les règles du modèle (N12–N14) et M8_Q13 reformulée (N15)', () => {
    expect(NATIVE_RULES.map((r) => r.id)).toEqual(
      Array.from({ length: 15 }, (_, i) => `N${i + 1}`),
    );
  });

  it('N3 corrigée : compare le lien avec l’ex des deux membres, jamais croisé avec M6_Q19', () => {
    // L'un garde une amitié (D), l'autre compte « revoir un ex sans le dire »
    // comme une infidélité : plus aucun écart prêté à l'autre.
    expect(
      sev(
        v82({ V82_M3_02: 'D' }),
        v82({ M6_Q19: 'D', V82_M3_01: 'A' }),
        'V82_M3_02',
      ),
    ).toEqual([]);
    expect(
      sev(v82({ V82_M3_02: 'A' }), v82({ V82_M3_02: 'D' }), 'V82_M3_02'),
    ).toEqual(['moderee']);
    // « Je préfère ne pas répondre » : aucune comparaison.
    expect(
      sev(v82({ V82_M3_02: 'E' }), v82({ V82_M3_02: 'D' }), 'V82_M3_02'),
    ).toEqual([]);
    // Aucun accord affiché sur un fait personnel (« aucun contact »).
    const r = report(v82({ V82_M3_02: 'A' }), v82({ V82_M3_02: 'A' }));
    expect(r.convergences.some((c) => c.questionId === 'V82_M3_02')).toBe(
      false,
    );
  });

  it('N12 : enfants de l’autre lus sur sa situation réelle', () => {
    const minor = report(v82({ M0_Q14: 'D' }), v82({ V82_M0_03: 'C' }));
    expect(
      minor.divergences.find((d) => d.questionId === 'M0_Q14')?.severity,
    ).toBe('critique');
    expect(minor.hardStop).toBe(true);
    expect(
      sev(v82({ M0_Q14: 'D' }), v82({ V82_M0_03: 'E' }), 'M0_Q14'),
    ).toEqual(['majeure']);
    expect(
      sev(v82({ M0_Q14: 'D' }), v82({ V82_M0_03: 'A' }), 'M0_Q14'),
    ).toEqual([]);
    expect(
      sev(v82({ M0_Q14: 'B' }), v82({ V82_M0_03: 'B' }), 'M0_Q14'),
    ).toEqual(['majeure']);
  });

  it('N13 Mahr et N14 exclusivité : barème du modèle validé', () => {
    expect(
      sev(v82({ V82_M4_08: 'A' }), v82({ V82_M4_08: 'D' }), 'V82_M4_08'),
    ).toEqual(['critique']);
    expect(
      sev(v82({ V82_M4_08: 'A' }), v82({ V82_M4_08: 'C' }), 'V82_M4_08'),
    ).toEqual([]);
    expect(
      sev(v82({ V82_M8_03: 'A' }), v82({ V82_M8_03: 'C' }), 'V82_M8_03'),
    ).toEqual(['majeure']);
  });

  it('N15 (M8_Q13 reformulée) : un écart, jamais une exclusion', () => {
    expect(
      sev(v82({ V82_M8_06: 'A' }), v82({ V82_M8_06: 'D' }), 'V82_M8_06'),
    ).toEqual(['majeure']);
    expect(
      sev(v82({ V82_M8_06: 'E' }), v82({ V82_M8_06: 'D' }), 'V82_M8_06'),
    ).toEqual([]);
    const r = report(v82({ V82_M8_06: 'B' }), v82({ V82_M8_06: 'B' }));
    expect(
      r.convergences.find((c) => c.questionId === 'V82_M8_06')?.label,
    ).toBe('Pour vous deux, la séparation resterait un dernier recours');
  });

  it('aucune règle native A n’est une exclusion (seules N12 et N13 le peuvent, selon le modèle)', () => {
    for (const r of NATIVE_RULES.filter((x) => !['N12', 'N13'].includes(x.id)))
      expect(Object.values(r.pairs)).not.toContain('critique');
  });

  it('les écarts natifs comptent dans les affinités par module', () => {
    const a = v82({ V82_M5_03: 'A', V82_M5_04: 'A', V82_M5_01: 'A' });
    const b = v82({ V82_M5_03: 'D', V82_M5_04: 'C', V82_M5_01: 'D' });
    const r = report(a, b);
    expect(r.comparisons?.some((c) => c.questionId === 'V82_M5_03')).toBe(true);
    const module5 = computeAnswerCompatibility(a, b, r).modules.find(
      (m) => m.module === 5,
    );
    expect(module5?.compared).toBeGreaterThan(0);
  });
});

describe('V8.2 — sécurité séparée de la compatibilité', () => {
  it('gifle, insultes, insistance, punitions corporelles : alertes, jamais une exclusion ni une pénalité', () => {
    const r = report(
      v82({ M6_Q24: 'A', M6_Q04: 'A', M9_Q24: 'A', M8_Q20: 'D' }),
      v82({ M6_Q24: 'E', M6_Q04: 'C', M9_Q24: 'E', M8_Q20: 'A' }),
    );
    expect(r.hardStop).toBe(false);
    expect(r.penalty).toBe(0);
    expect(r.safetyAlerts!.map((d) => d.questionId).sort()).toEqual(
      expect.arrayContaining(['M6_Q04', 'M8_Q20']),
    );
    const sheet = buildCompatibilitySheet(r, 'Sam');
    expect(sheet.vigilance).not.toMatch(/Incompatibilité/);
  });

  it('les deux entretiens en V8.2 : le rapport le signale (questions neutres B possibles)', () => {
    expect(report(v82({}), v82({})).questionnaire).toBe('8.2');
    expect(report(v82({}), { M0_Q01: 'A' }).questionnaire).toBeUndefined();
  });
});
