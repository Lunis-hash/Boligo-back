import { moduleQuestions, pendingQuestions } from './questions.service';

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
      'M0_Q14',
      'M0_Q07',
      'M0_Q09',
      'M0_Q11',
      'M0_Q12',
      'M0_Q13',
      'M0_Q15',
      'M0_Q16',
      'M0_Q10',
    ]);
  });

  it('applique les règles d’âge et de dépendance', () => {
    // M0_Q06 (désir d'enfants) n'est plus posée à partir de 55 ans.
    expect(pendingQuestions(0, {}, 60, 'F').map((q) => q.id)).not.toContain(
      'M0_Q06',
    );
    // V7.1 : l'aide financière à la famille (M4_Q16) est posée à tous, quelle
    // que soit l'origine (un couple mixte doit pouvoir être comparé).
    for (const M1_Q01 of ['A', 'C'])
      expect(
        pendingQuestions(4, { M1_Q01 }, 30, 'H').map((q) => q.id),
      ).toContain('M4_Q16');
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

  it('pose la dot à tous (V7.1 : un Africain et une Européenne doivent pouvoir être comparés)', () => {
    for (const M1_Q01 of ['B', 'C'])
      expect(
        pendingQuestions(4, { M1_Q01 }, 30, 'H').map((q) => q.id),
      ).toContain('M4_Q17');
    expect(pendingQuestions(4, {}, 30, 'H').map((q) => q.id)).not.toContain(
      'M4_Q07',
    );
  });

  it('renvoie une liste vide quand tout est répondu', () => {
    const answers: Record<string, string> = { M0_Q02: 'D' };
    for (const q of pendingQuestions(0, answers, 30, 'H')) answers[q.id] = 'A';
    expect(pendingQuestions(0, answers, 30, 'H')).toHaveLength(0);
  });
});

describe('moduleQuestions : questions de suite du même module', () => {
  const ids = (qs: Array<{ id: string }>) => qs.map((q) => q.id);

  it('joint la suite avec sa condition, dans l’ordre, pour que l’app la pose', () => {
    const qs = moduleQuestions(3, {}, 30, 'F');
    const rupture = qs.find((q) => q.id === 'M3_Q03');
    expect(rupture?.askIf).toEqual([
      { questionId: 'M3_Q11', values: ['A', 'B', 'C', 'D'] },
    ]);
    expect(ids(qs).indexOf('M3_Q11')).toBeLessThan(ids(qs).indexOf('M3_Q03'));
    // Le contrôle de fin de module, lui, ne l’attend pas encore.
    expect(ids(pendingQuestions(3, {}, 30, 'F'))).not.toContain('M3_Q03');
  });

  it('ne repose rien quand la réponse déclencheuse ferme la suite', () => {
    const qs = moduleQuestions(3, { M3_Q11: 'E' }, 30, 'F');
    expect(ids(qs)).not.toContain('M3_Q03');
    expect(ids(qs)).not.toContain('M3_Q11');
  });

  it('pose la suite sans condition quand la réponse est déjà enregistrée', () => {
    const qs = moduleQuestions(3, { M3_Q11: 'B' }, 30, 'F');
    const rupture = qs.find((q) => q.id === 'M3_Q03');
    expect(rupture).toBeDefined();
    expect(rupture?.askIf).toBeUndefined();
  });

  it('pratique religieuse après la religion ; rien si les questions sensibles sont refusées', () => {
    const qs = moduleQuestions(1, {}, 30, 'F');
    expect(qs.find((q) => q.id === 'M1_Q17')?.askIf?.[0].questionId).toBe(
      'M1_Q16',
    );
    const refused = moduleQuestions(1, {}, 30, 'F', true);
    expect(ids(refused)).not.toContain('M1_Q16');
    expect(ids(refused)).not.toContain('M1_Q17');
  });

  it('une dépendance d’un autre module non remplie écarte la question', () => {
    const qs = moduleQuestions(1, { M0_Q05: 'A', M0_Q06: 'D' }, 30, 'F');
    expect(ids(qs)).not.toContain('M1_Q13');
  });
});
