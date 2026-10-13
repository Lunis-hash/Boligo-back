import { normalizeAiQuestions } from './harmony-question.types';

const q = (n: number) => ({
  day: 1,
  theme: 'Lignes rouges',
  themeKey: 'argent',
  text: `Sur 3 000 € gagnés à deux, quelle part ${n} mettriez-vous de côté ?`,
  options: ['Autre...'],
  ecart: 'A épargne presque tout, B dépense pour ses envies',
});

describe('normalizeAiQuestions', () => {
  it('un jour avec un seul écart (trois propositions) n’est pas rejeté en bloc', () => {
    const out = normalizeAiQuestions([q(1), q(2), q(3)], 21, 1);
    expect(out).toHaveLength(3);
    // L'écart détecté est conservé, jamais montré aux membres.
    expect(out?.[0].gap).toBe(
      'A épargne presque tout, B dépense pour ses envies',
    );
  });

  it('par défaut, au moins quatre questions (Sondeur complet)', () => {
    expect(normalizeAiQuestions([q(1), q(2), q(3)])).toBeNull();
    expect(normalizeAiQuestions([q(1), q(2), q(3), q(4)])).toHaveLength(4);
  });
});
