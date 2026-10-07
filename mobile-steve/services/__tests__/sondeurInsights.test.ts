import { EMPTY_INSIGHTS, parseSondeurInsights, readingCaption, readingForDay } from '../sondeurInsights';

describe('lectures du Sondeur (app)', () => {
  const day1 = {
    day: 1,
    source: 'ia',
    headline: 'Vous posez des limites claires.',
    together: ['La fidélité compte pour vous deux.', 42],
    toDiscuss: [{ theme: 'Argent & dettes', text: 'Le partage des dépenses.' }, { text: 'sans thème' }],
    openers: ['Que signifie partager ?'],
  };

  it('garde les lectures valides et écarte les données inattendues', () => {
    const insights = parseSondeurInsights({
      days: [day1, { day: 7, headline: 'hors limites' }, null],
      review: { day: 0, source: 'regles', headline: 'Sondeur terminé.', openers: ['a', 'b', 'c'], advice: '' },
      writing: true,
    });
    expect(insights.days).toHaveLength(1);
    expect(insights.days[0].together).toEqual(['La fidélité compte pour vous deux.']);
    expect(insights.days[0].toDiscuss).toEqual([{ theme: 'Argent & dettes', text: 'Le partage des dépenses.' }]);
    expect(insights.review?.source).toBe('regles');
    expect(insights.review?.advice).toBeUndefined();
    expect(insights.writing).toBe(true);
    expect(readingForDay(insights, 1)?.headline).toBe('Vous posez des limites claires.');
    expect(readingForDay(insights, 2)).toBeNull();
  });

  it('une réponse illisible donne un écran sans lecture, jamais une erreur', () => {
    expect(parseSondeurInsights(null)).toEqual(EMPTY_INSIGHTS);
    expect(parseSondeurInsights('oups')).toEqual(EMPTY_INSIGHTS);
    expect(parseSondeurInsights({ days: 'x', review: { day: 2, headline: 'pas un bilan' } })).toEqual(EMPTY_INSIGHTS);
  });

  it('indique qui a écrit la lecture', () => {
    expect(readingCaption({ ...day1, source: 'ia', together: [], toDiscuss: [], openers: [] } as never)).toContain('par BOLIGO');
    expect(readingCaption({ ...day1, source: 'regles', together: [], toDiscuss: [], openers: [] } as never)).toBe('Pistes pour en parler');
  });
});

describe('extraits cités sous chaque point', () => {
  it('garde les paires valides et ignore le reste', () => {
    const insights = parseSondeurInsights({
      days: [
        {
          day: 1,
          source: 'ia',
          headline: 'Journée 1.',
          together: ['Vous parlez tous deux de vos enfants.'],
          togetherQuotes: [['deux enfants', 'des enfants oui']],
          toDiscuss: [
            { theme: 'Argent & dettes', text: 'Le partage.', quotes: ['moitié-moitié', 'celui qui invite'] },
            { theme: 'Lieu', text: 'Le lieu.', quotes: ['seul'] },
          ],
          openers: [],
        },
      ],
      review: null,
      writing: false,
    });
    expect(insights.days[0].togetherQuotes).toEqual([['deux enfants', 'des enfants oui']]);
    expect(insights.days[0].toDiscuss[0].quotes).toEqual(['moitié-moitié', 'celui qui invite']);
    expect(insights.days[0].toDiscuss[1].quotes).toBeUndefined();
  });
});
