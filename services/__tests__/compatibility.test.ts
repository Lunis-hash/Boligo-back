import { getDiscussionTopics, hasMajorDivergence } from '@/services/compatibility';

const pillars = [
  { id: 'valeurs', label: '💎 Valeurs & Culture', value: 52 },
  { id: 'attachement', label: '🤝 Attachement & Émotions', value: 78 },
  { id: 'projet', label: '🌱 Projet de Vie & Famille', value: 58 },
  { id: 'vecu', label: '⚖️ Vécu & Maturité', value: 70 },
  { id: 'mode_de_vie', label: '💼 Mode de vie & Finances', value: 50 },
];

describe('Sujets à aborder (divergences → dialogue)', () => {
  it('transforme les piliers faibles en sujets, du plus faible au moins faible', () => {
    const topics = getDiscussionTopics(74, pillars);
    expect(topics.map((t) => t.id)).toEqual(['mode_de_vie', 'valeurs', 'projet']);
    expect(topics[0].title).toMatch(/mode de vie/i);
    expect(topics[0].prompt.length).toBeGreaterThan(20);
  });

  it('ne propose rien quand tous les piliers sont solides et le score bon', () => {
    const strong = pillars.map((p) => ({ ...p, value: 80 }));
    expect(getDiscussionTopics(82, strong)).toEqual([]);
  });

  it('propose un sujet générique quand seul le score global est bas', () => {
    const strong = pillars.map((p) => ({ ...p, value: 80 }));
    const topics = getDiscussionTopics(45, strong);
    expect(topics).toHaveLength(1);
    expect(topics[0].id).toBe('attentes');
  });

  it('limite à trois sujets et tolère un pilier inconnu', () => {
    const many = [...pillars, { id: 'autre', label: '🧭 Spiritualité', value: 51 }];
    const topics = getDiscussionTopics(60, many);
    expect(topics).toHaveLength(3);
    expect(getDiscussionTopics(60, [{ id: 'autre', label: '🧭 Spiritualité', value: 51 }])[0].title).toBe('Spiritualité');
  });

  it('qualifie la divergence majeure', () => {
    expect(hasMajorDivergence(74, pillars)).toBe(true); // un pilier à 50 %
    expect(hasMajorDivergence(50, pillars.map((p) => ({ ...p, value: 80 })))).toBe(true);
    expect(hasMajorDivergence(80, pillars.map((p) => ({ ...p, value: 80 })))).toBe(false);
    expect(hasMajorDivergence(80, undefined)).toBe(false);
  });
});
