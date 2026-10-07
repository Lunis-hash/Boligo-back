import {
  DIVERGENCE_RULES,
  LEGACY_RULES,
  THEME_LIST,
  buildCompatibilitySheet,
  buildDiscussionTopics,
  buildDivergenceReport,
  collectRawAnswers,
} from './divergence.engine';
import { QUESTIONS, RETIRED_QUESTIONS } from '../interview/questions.data';

const severities = (a: Record<string, string>, b: Record<string, string>) =>
  buildDivergenceReport(a, b).divergences.map((d) => [
    d.questionId,
    d.severity,
  ]);

describe('Moteur de divergences BOLIGO', () => {
  it('ne référence que des questions et des options existantes', () => {
    for (const [rules, list] of [
      [DIVERGENCE_RULES, QUESTIONS],
      [LEGACY_RULES, RETIRED_QUESTIONS],
    ] as const) {
      for (const rule of rules) {
        const q = list.find((x) => x.id === rule.questionId);
        expect(q).toBeDefined();
        expect(THEME_LIST).toContain(rule.theme);
        const keys = q!.options.map((o) => o.key);
        for (const key of [
          ...Object.keys(rule.convergence ?? {}),
          ...Object.keys(rule.sameRisk ?? {}),
        ])
          expect(keys).toContain(key);
      }
    }
  });

  it('donne à chaque règle un sujet d’accord neutre, sans guillemets', () => {
    for (const rule of [...DIVERGENCE_RULES, ...LEGACY_RULES]) {
      expect(rule.topic.length).toBeGreaterThan(3);
      expect(rule.topic).toMatch(/^[\p{Lu}]/u);
      expect(rule.topic).not.toMatch(/[«»]/);
      // Un sujet, jamais une phrase d'accord (« vous », « tous les deux »).
      expect(rule.topic).not.toMatch(/(^|\s)vous\b|tous les deux/i);
    }
  });

  it('couvre les sept thèmes fondamentaux', () => {
    const covered = new Set(DIVERGENCE_RULES.map((r) => r.theme));
    for (const theme of THEME_LIST) expect(covered.has(theme)).toBe(true);
  });

  it('déclare une incompatibilité sur le désir d’enfants, plus sur une réponse franche sur la fidélité', () => {
    const report = buildDivergenceReport(
      { M0_Q06: 'A', M6_Q18: 'A' },
      { M0_Q06: 'D', M6_Q18: 'C' },
    );
    expect(report.hardStop).toBe(true);
    expect(report.divergences.map((d) => d.severity)).toEqual([
      'critique',
      'moderee',
    ]);
    expect(report.penalty).toBe(0.14);
    expect(report.divergences[0].a.text).toBe('Oui, absolument');
    // V6 : « les tentations existent » face à « absolue » n'est plus critique.
    expect(severities({ M6_Q10: 'A' }, { M6_Q10: 'C' })).toEqual([
      ['M6_Q10', 'moderee'],
    ]);
  });

  it('classe les divergences par gravité et borne la pénalité', () => {
    const a = {
      M0_Q06: 'A',
      M1_Q11: 'A',
      M6_Q04: 'A',
      M4_Q01: 'A',
      M8_Q01: 'A',
      M7_Q07: 'A',
      M5_Q01: 'A',
    };
    const b = {
      M0_Q06: 'D',
      M1_Q11: 'C',
      M6_Q04: 'C',
      M4_Q01: 'D',
      M8_Q01: 'D',
      M7_Q07: 'C',
      M5_Q01: 'D',
    };
    const report = buildDivergenceReport(a, b);
    const ranks = report.divergences.map((d) => d.severity);
    expect(ranks.slice(0, 3)).toEqual(['critique', 'critique', 'critique']);
    expect(ranks.slice(3)).toEqual([
      'majeure',
      'majeure',
      'majeure',
      'majeure',
    ]);
    expect(report.penalty).toBe(0.3);
  });

  it('reconnaît les convergences et les rend lisibles', () => {
    const same = { M0_Q06: 'A', M6_Q18: 'A', M8_Q01: 'A' };
    const report = buildDivergenceReport(same, same);
    expect(report.divergences).toHaveLength(0);
    expect(report.convergences.map((c) => c.label)).toEqual([
      'Vous souhaitez tous les deux des enfants, sans hésitation',
      'Pour vous deux, une infidélité mettrait fin à la relation',
      'Vous visez tous les deux le mariage',
    ]);
    expect(report.themes.find((t) => t.theme === 'famille')?.status).toBe(
      'aligne',
    );
    expect(report.themes.find((t) => t.theme === 'argent')?.status).toBe(
      'inconnu',
    );
  });

  it('écrit des accords fidèles : jamais un fait que la réponse ne dit pas', () => {
    // Deux membres sans enfant : ni « enfants déjà présents », ni « même réponse ».
    const noKids = buildDivergenceReport({ M0_Q05: 'A' }, { M0_Q05: 'A' })
      .convergences[0];
    expect(noKids.label).toBe(
      'Vous n’avez ni l’un ni l’autre d’enfant à charge',
    );
    expect(noKids.topic).toBe("La présence d'enfants");
    // Libellé de repli : le sujet neutre de la règle.
    const visits = buildDivergenceReport({ M5_Q07: 'B' }, { M5_Q07: 'B' })
      .convergences[0];
    expect(visits.label).toBe(
      'Même réponse sur « la fréquence des visites familiales »',
    );
    // Sujets intimes : la comparaison compte, l'accord ne s'affiche pas.
    const intimacy = buildDivergenceReport({ M10_Q16: 'A' }, { M10_Q16: 'A' });
    expect(intimacy.convergences).toHaveLength(0);
    expect(intimacy.comparedQuestions).toBe(1);
    // V6 : « la fidélité est absolue » (effet plafond) n'est plus un accord affiché.
    expect(
      buildDivergenceReport({ M6_Q10: 'A' }, { M6_Q10: 'A' }).convergences,
    ).toHaveLength(0);
  });

  it('applique les règles croisées religion et culture (entretiens V6)', () => {
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
    const report = buildDivergenceReport({ M0_Q06: 'A' }, { M6_Q18: 'A' });
    expect(report.comparedQuestions).toBe(0);
    expect(report.divergences).toHaveLength(0);
    expect(report.penalty).toBe(0);
  });

  it('ne compare plus les questions sans fondement clinique (situation, humour, vécu)', () => {
    const report = buildDivergenceReport(
      { M0_Q04: 'A', M3_Q10: 'A', M10_Q04: 'A', M10_Q12: 'A' },
      { M0_Q04: 'B', M3_Q10: 'D', M10_Q04: 'D', M10_Q12: 'C' },
    );
    expect(report.comparedQuestions).toBe(0);
    expect(report.comparisons).toEqual([]);
  });

  it('donne un point de comparaison par question comparée', () => {
    const report = buildDivergenceReport(
      { M0_Q06: 'A', M4_Q01: 'A', M7_Q08: 'A' },
      { M0_Q06: 'A', M4_Q01: 'B', M7_Q08: 'C' },
    );
    expect(report.comparisons).toEqual([
      { questionId: 'M0_Q06', value: 1 },
      { questionId: 'M4_Q01', value: 0.72 },
      { questionId: 'M7_Q08', value: 0.25 },
    ]);
  });

  it('produit une fiche et des sujets de discussion personnalisés', () => {
    const report = buildDivergenceReport(
      { M0_Q06: 'A', M4_Q01: 'A', M6_Q18: 'A', M7_Q07: 'A' },
      { M0_Q06: 'B', M4_Q01: 'D', M6_Q18: 'A', M7_Q07: 'C' },
    );
    const sheet = buildCompatibilitySheet(report, 'Nadia');
    expect(sheet.rassemble[0]).toMatch(/infidélité/i);
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
      { rawResponses: { M1_Q16: 'B', M1_Q18: '' } },
      { rawResponses: null },
    ]);
    expect(merged).toEqual({ M0_Q01: 'A', M1_Q16: 'B' });
  });
});
