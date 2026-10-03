import { pendingQuestions } from './questions.service';

describe('pendingQuestions', () => {
  it("ne considère pas le module 0 terminé avec la seule réponse d'inscription (M0_Q02)", () => {
    const pending = pendingQuestions(0, { M0_Q02: 'D' }, 30, 'H').map(
      (q) => q.id,
    );
    expect(pending).toEqual([
      'M0_Q01',
      'M0_Q03',
      'M0_Q04',
      'M0_Q05',
      'M0_Q06',
      'M0_Q07',
      'M0_Q08',
    ]);
  });

  it('applique les règles d’âge et de dépendance', () => {
    // M0_Q06 (désir d'enfants) n'est plus posée à partir de 55 ans.
    expect(pendingQuestions(0, {}, 60, 'F').map((q) => q.id)).not.toContain(
      'M0_Q06',
    );
    // M4_Q05 dépend d'une origine Afrique / Maghreb-Moyen-Orient / Asie.
    expect(
      pendingQuestions(4, { M1_Q01: 'C' }, 30, 'H').map((q) => q.id),
    ).not.toContain('M4_Q05');
    expect(
      pendingQuestions(4, { M1_Q01: 'A' }, 30, 'H').map((q) => q.id),
    ).toContain('M4_Q05');
  });

  it('renvoie une liste vide quand tout est répondu', () => {
    const answers: Record<string, string> = { M0_Q02: 'D' };
    for (const q of pendingQuestions(0, answers, 30, 'H')) answers[q.id] = 'A';
    expect(pendingQuestions(0, answers, 30, 'H')).toHaveLength(0);
  });
});
