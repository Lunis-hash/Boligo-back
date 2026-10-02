import {
  buildDivergenceReport,
  THEME_LIST,
} from '../matching/divergence.engine';
import {
  assembleSondeur,
  describeReportForAi,
  validateSondeurGrid,
} from './sondeur.generator';

describe('Générateur du Sondeur (3 jours × 7 thèmes)', () => {
  const report = buildDivergenceReport(
    {
      M0_Q06: 'A',
      M6_Q10: 'A',
      M4_Q01: 'A',
      M7_Q07: 'A',
      M5_Q01: 'A',
      M8_Q01: 'A',
    },
    {
      M0_Q06: 'D',
      M6_Q10: 'C',
      M4_Q01: 'D',
      M7_Q07: 'C',
      M5_Q01: 'D',
      M8_Q01: 'A',
    },
  );

  it('produit toujours 21 questions couvrant les 7 thèmes chaque jour', () => {
    const qs = assembleSondeur({ report, firstNames: ['Steve', 'Nadia'] });
    expect(qs).toHaveLength(21);
    expect(validateSondeurGrid(qs)).toBe(true);
    expect(qs.filter((q) => q.day === 1).map((q) => q.themeKey)).toEqual(
      THEME_LIST,
    );
    qs.forEach((q) => {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options[q.options.length - 1]).toMatch(/^Autre/);
      expect(q.text.length).toBeGreaterThan(30);
    });
  });

  it('cible les divergences réelles avant tout gabarit', () => {
    const qs = assembleSondeur({ report, firstNames: ['Steve', 'Nadia'] });
    const famille = qs.find((q) => q.day === 1 && q.themeKey === 'famille');
    expect(famille?.source).toBe('divergence');
    expect(famille?.text).toMatch(/enfants/i);
    expect(famille?.text).toContain('Oui, absolument');
    const intimite = qs.find((q) => q.day === 2 && q.themeKey === 'intimite');
    expect(intimite?.source).toBe('divergence');
    expect(intimite?.text).toMatch(/Fidélité/);
    // aucun écart détecté sur la spiritualité → gabarit du thème
    expect(qs.find((q) => q.themeKey === 'spiritualite')?.source).toBe(
      'gabarit',
    );
  });

  it('ne pose jamais deux fois le même texte et évite les questions déjà posées au couple', () => {
    const first = assembleSondeur({ report, firstNames: ['Steve', 'Nadia'] });
    const texts = first.map((q) => q.text);
    expect(new Set(texts).size).toBe(21);
    const second = assembleSondeur({
      report,
      firstNames: ['Steve', 'Nadia'],
      avoidTexts: texts,
    });
    second.forEach((q) => expect(texts).not.toContain(q.text));
    expect(validateSondeurGrid(second)).toBe(true);
  });

  it("retient les questions de l'IA seulement si elles respectent la grille", () => {
    const ai = [
      {
        day: 2,
        theme: 'x',
        emoji: '💬',
        text: 'Question IA conforme sur la spiritualité au quotidien, assez longue ?',
        options: ['A', 'B', 'C'],
        themeKey: 'spiritualite' as const,
      },
      {
        day: 9,
        theme: 'x',
        emoji: '💬',
        text: 'Question IA hors grille qui ne doit pas apparaître dans le parcours',
        options: ['A', 'B'],
        themeKey: 'argent' as const,
      },
    ];
    const qs = assembleSondeur({
      report,
      firstNames: ['Steve', 'Nadia'],
      aiQuestions: ai,
    });
    expect(
      qs.find((q) => q.day === 2 && q.themeKey === 'spiritualite')?.source,
    ).toBe('ia');
    expect(qs.some((q) => q.text.startsWith('Question IA hors grille'))).toBe(
      false,
    );
    expect(validateSondeurGrid(qs)).toBe(true);
  });

  it('résume le rapport pour le prompt IA sans coordonnées', () => {
    const text = describeReportForAi(report, ['Steve', 'Nadia']);
    expect(text).toMatch(/DIVERGENCES/);
    expect(text).toMatch(/\[critique\] Famille/);
    expect(text).toMatch(/CONVERGENCES/);
    expect(text).not.toMatch(/@|\+33/);
  });

  it('couvre la grille même sans aucune divergence (gabarits personnalisables)', () => {
    const empty = buildDivergenceReport({}, {});
    const qs = assembleSondeur({ report: empty, firstNames: ['A', 'B'] });
    expect(validateSondeurGrid(qs)).toBe(true);
    expect(qs.every((q) => q.source === 'gabarit')).toBe(true);
  });
});
