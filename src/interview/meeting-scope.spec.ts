import {
  keepCountry,
  meetingScopeAnswer,
  meetingScopeOf,
} from './meeting-scope';
import { pendingQuestions } from './questions.service';

describe('Périmètre de rencontre (M0_Q02)', () => {
  it("traduit le choix de l'inscription en réponse M0_Q02, et inversement", () => {
    expect(meetingScopeAnswer('local')).toBe('A');
    expect(meetingScopeAnswer('national')).toBe('C');
    expect(meetingScopeAnswer('international')).toBe('D');
    expect(meetingScopeAnswer(undefined)).toBe('A');
    expect(meetingScopeOf('B')).toBe('local');
    expect(meetingScopeOf('C')).toBe('national');
    expect(meetingScopeOf('D')).toBe('international');
    expect(meetingScopeOf(undefined)).toBeNull();
  });

  it("n'est jamais reposé pendant l'entretien, même sans réponse enregistrée", () => {
    const ids = (answers: Record<string, string>) =>
      pendingQuestions(0, answers, 30, 'F').map((q) => q.id);
    expect(ids({})).not.toContain('M0_Q02');
    expect(ids({ M0_Q02: 'C' })).not.toContain('M0_Q02');
  });

  it('garde le pays quand une ville est saisie seule', () => {
    expect(keepCountry('Lyon', 'Paris, France')).toBe('Lyon, France');
    expect(keepCountry('Dakar, Sénégal', 'Paris, France')).toBe(
      'Dakar, Sénégal',
    );
    expect(keepCountry('Abidjan', 'Abidjan')).toBe('Abidjan');
    expect(keepCountry('  Cocody ', null)).toBe('Cocody');
  });
});
