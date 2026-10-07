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
      'M0_Q09',
      'M0_Q11',
      'M0_Q12',
      'M0_Q13',
      'M0_Q10',
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

  it('pose la transmission culturelle si des enfants sont là OU souhaités (V6)', () => {
    const module1 = (answers: Record<string, string>, age = 30) =>
      pendingQuestions(1, answers, age, 'F').map((q) => q.id);
    // Ni enfant ni désir d'enfant : pas de question sur la transmission.
    expect(module1({ M0_Q05: 'A', M0_Q06: 'D' })).not.toContain('M1_Q13');
    // Enfants souhaités.
    expect(module1({ M0_Q05: 'A', M0_Q06: 'B' })).toContain('M1_Q13');
    // Déjà parent, sans désir d'autres enfants (ou plus de 55 ans, sans M0_Q06).
    expect(module1({ M0_Q05: 'C', M0_Q06: 'D' })).toContain('M1_Q13');
    expect(module1({ M0_Q05: 'B' }, 60)).toContain('M1_Q13');
  });

  it('ne pose la dot ou le Mahr qu’aux origines concernées (V6)', () => {
    expect(
      pendingQuestions(4, { M1_Q01: 'C' }, 30, 'H').map((q) => q.id),
    ).not.toContain('M4_Q07');
    expect(
      pendingQuestions(4, { M1_Q01: 'B' }, 30, 'H').map((q) => q.id),
    ).toContain('M4_Q07');
  });

  it('renvoie une liste vide quand tout est répondu', () => {
    const answers: Record<string, string> = { M0_Q02: 'D' };
    for (const q of pendingQuestions(0, answers, 30, 'H')) answers[q.id] = 'A';
    expect(pendingQuestions(0, answers, 30, 'H')).toHaveLength(0);
  });
});
