import {
  deviceLanguage,
  getResumeModule,
  initialPicked,
  isValidFreeText,
  joinMultipleAnswer,
  LAST_MODULE,
  Question,
  togglePick,
} from '@/services/interview';

describe('getResumeModule', () => {
  it('starts at module 0 for a brand new interview', () => {
    expect(getResumeModule({ currentModule: 0, isCompleted: false, completedModules: [] })).toBe(0);
  });

  it('resumes at the first module never saved even if the backend says otherwise', () => {
    // Module 0 pre-filled at sign-up (meetingScope) → backend currentModule = 1,
    // but modules 1..10 are not saved: first missing module is 1.
    expect(getResumeModule({ currentModule: 1, isCompleted: false, completedModules: [0] })).toBe(1);
    // Module 3 saved before module 2 (retry / reconnection): resume at 2.
    expect(getResumeModule({ currentModule: 4, isCompleted: false, completedModules: [0, 1, 3] })).toBe(2);
  });

  it('falls back to currentModule when completedModules is missing', () => {
    expect(getResumeModule({ currentModule: 5, isCompleted: false })).toBe(5);
    expect(getResumeModule({ currentModule: 99, isCompleted: false })).toBe(LAST_MODULE);
  });

  it('returns LAST_MODULE + 1 for a completed interview or no status', () => {
    expect(getResumeModule({ currentModule: 11, isCompleted: true, completedModules: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })).toBe(LAST_MODULE + 1);
    expect(getResumeModule(null)).toBe(LAST_MODULE + 1);
  });
});

describe('Choix multiple et langue du Grand Entretien (V6)', () => {
  const languages = {
    id: 'M0_Q10',
    text: 'Langues',
    multiple: true,
    options: [
      { key: 'A', text: 'Français' },
      { key: 'B', text: 'English' },
      { key: 'G', text: 'Português' },
    ],
  };

  it('envoie les langues cochées dans l’ordre des options', () => {
    expect(joinMultipleAnswer(languages, ['G', 'A'])).toEqual({ key: 'A,G', text: 'Français, Português' });
    expect(joinMultipleAnswer(languages, ['B'])).toEqual({ key: 'B', text: 'English' });
  });

  it('ignore une clé inconnue', () => {
    expect(joinMultipleAnswer(languages, ['Z', 'B'])).toEqual({ key: 'B', text: 'English' });
  });

  it('choisit le français ou l’anglais selon l’appareil', () => {
    expect(['fr', 'en']).toContain(deviceLanguage());
  });
});

describe('Langues proposées et signaux d’alerte (V6.1)', () => {
  const languages: Question = {
    id: 'M0_Q10',
    text: 'Langues',
    multiple: true,
    suggested: ['A', 'F', 'Z'],
    options: [
      { key: 'A', text: 'Français' },
      { key: 'B', text: 'Anglais — English' },
      { key: 'F', text: 'Wolof' },
      { key: 'I', text: 'Une autre langue (précisez)', freeText: true },
    ],
  };
  const flags: Question = {
    id: 'M8_Q10',
    text: 'Signaux',
    multiple: true,
    maxChoices: 3,
    options: ['A', 'B', 'C', 'D'].map((key) => ({ key, text: key })),
  };

  it('coche d’office les langues du pays, sans clé inconnue', () => {
    expect(initialPicked(languages)).toEqual(['A', 'F']);
    expect(initialPicked({ ...languages, multiple: false })).toEqual([]);
  });

  it('ne dépasse jamais le nombre maximal de réponses', () => {
    let picked: string[] = [];
    for (const k of ['A', 'B', 'C', 'D']) picked = togglePick(flags, picked, k);
    expect(picked).toEqual(['A', 'B', 'C']);
    expect(togglePick(flags, picked, 'B')).toEqual(['A', 'C']);
  });

  it('affiche la langue écrite à la place de « une autre langue »', () => {
    expect(joinMultipleAnswer(languages, ['I', 'A'], ' Bambara ')).toEqual({
      key: 'A,I',
      text: 'Français, Bambara',
    });
  });

  it('valide la précision écrite comme le serveur', () => {
    expect(isValidFreeText('Créole haïtien')).toBe(true);
    expect(isValidFreeText('b')).toBe(false);
    expect(isValidFreeText('<script>')).toBe(false);
  });
});
