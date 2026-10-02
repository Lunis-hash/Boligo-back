import {
  DIVERGENCE_RULES,
  THEME_LIST,
  buildCompatibilitySheet,
  buildDiscussionTopics,
  buildDivergenceReport,
  collectRawAnswers,
} from './divergence.engine';
import { QUESTIONS } from '../interview/questions.data';

describe('Moteur de divergences BOLIGO', () => {
  it('ne référence que des questions et des options existantes', () => {
    for (const rule of DIVERGENCE_RULES) {
      const q = QUESTIONS.find((x) => x.id === rule.questionId);
      expect(q).toBeDefined();
      expect(THEME_LIST).toContain(rule.theme);
      for (const key of Object.keys(rule.convergence ?? {})) {
        expect(q!.options.map((o) => o.key)).toContain(key);
      }
    }
  });

  it('couvre les sept thèmes fondamentaux', () => {
    const covered = new Set(DIVERGENCE_RULES.map((r) => r.theme));
    for (const theme of THEME_LIST) expect(covered.has(theme)).toBe(true);
  });

  it("déclare une incompatibilité critique sur le désir d'enfants et la fidélité", () => {
    const report = buildDivergenceReport(
      { M0_Q06: 'A', M6_Q10: 'A' },
      { M0_Q06: 'D', M6_Q10: 'C' },
    );
    expect(report.hardStop).toBe(true);
    expect(report.divergences.map((d) => d.severity)).toEqual([
      'critique',
      'critique',
    ]);
    expect(report.penalty).toBe(0.24);
    expect(report.divergences[0].a.text).toMatch(/Oui, absolument|Absolue/);
  });

  it('classe les divergences par gravité et borne la pénalité', () => {
    const a = {
      M0_Q06: 'A',
      M6_Q10: 'A',
      M4_Q01: 'A',
      M8_Q01: 'A',
      M7_Q01: 'A',
      M5_Q01: 'A',
      M1_Q11: 'A',
    };
    const b = {
      M0_Q06: 'D',
      M6_Q10: 'D',
      M4_Q01: 'D',
      M8_Q01: 'D',
      M7_Q01: 'C',
      M5_Q01: 'D',
      M1_Q11: 'C',
    };
    const report = buildDivergenceReport(a, b);
    const ranks = report.divergences.map((d) => d.severity);
    expect(ranks.slice(0, 3)).toEqual(['critique', 'critique', 'critique']);
    expect(report.penalty).toBe(0.3);
  });

  it('reconnaît les convergences et les rend lisibles', () => {
    const report = buildDivergenceReport(
      { M0_Q06: 'A', M6_Q10: 'A', M8_Q01: 'A' },
      { M0_Q06: 'A', M6_Q10: 'A', M8_Q01: 'A' },
    );
    expect(report.divergences).toHaveLength(0);
    expect(report.convergences.map((c) => c.label)).toEqual([
      'Vous souhaitez tous les deux des enfants, sans hésitation',
      'La fidélité est absolue et non négociable pour vous deux',
      'Vous visez tous les deux le mariage',
    ]);
    expect(report.themes.find((t) => t.theme === 'famille')?.status).toBe(
      'aligne',
    );
    expect(report.themes.find((t) => t.theme === 'argent')?.status).toBe(
      'inconnu',
    );
  });

  it('applique les règles croisées religion et culture', () => {
    const report = buildDivergenceReport(
      { M1_Q05: 'A', M1_Q06: 'A', M1_Q01: 'A', M1_Q02: 'A' },
      { M1_Q05: 'B', M1_Q06: 'D', M1_Q01: 'C', M1_Q02: 'D' },
    );
    const religion = report.divergences.find((d) => d.questionId === 'M1_Q05');
    const culture = report.divergences.find((d) => d.questionId === 'M1_Q02');
    expect(religion?.severity).toBe('critique');
    expect(culture?.severity).toBe('majeure');
    expect(
      buildDivergenceReport(
        { M1_Q05: 'A', M1_Q06: 'D' },
        { M1_Q05: 'E', M1_Q06: 'D' },
      ).divergences[0].severity,
    ).toBe('mineure');
  });

  it('ignore les questions non répondues par les deux membres', () => {
    const report = buildDivergenceReport({ M0_Q06: 'A' }, { M6_Q10: 'A' });
    expect(report.comparedQuestions).toBe(0);
    expect(report.divergences).toHaveLength(0);
    expect(report.penalty).toBe(0);
  });

  it('produit une fiche et des sujets de discussion personnalisés', () => {
    const report = buildDivergenceReport(
      { M0_Q06: 'A', M4_Q01: 'A', M6_Q10: 'A', M7_Q07: 'A' },
      { M0_Q06: 'B', M4_Q01: 'D', M6_Q10: 'A', M7_Q07: 'C' },
    );
    const sheet = buildCompatibilitySheet(report, 'Nadia');
    expect(sheet.rassemble[0]).toMatch(/fidélité/i);
    expect(sheet.vigilance).toMatch(/^Divergence majeure/);
    expect(sheet.vigilance).toContain('Nadia');
    const topics = buildDiscussionTopics(report, 'Nadia');
    expect(topics.length).toBeGreaterThanOrEqual(2);
    expect(new Set(topics.map((t) => t.theme)).size).toBe(topics.length);
    expect(topics[0].prompt).toContain('Nadia');
  });

  it('fusionne les réponses brutes des modules', () => {
    const merged = collectRawAnswers([
      { rawResponses: { M0_Q01: 'A' } },
      { rawResponses: { M1_Q05: 'B', M1_Q06: '' } },
      { rawResponses: null },
    ]);
    expect(merged).toEqual({ M0_Q01: 'A', M1_Q05: 'B' });
  });
});
