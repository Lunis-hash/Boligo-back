import { Question } from '../interview';
import {
  ageInputIssue,
  answerLabel,
  lastAnswered,
  nextUnanswered,
  previousAnswered,
  progressOf,
  widenToIdeal,
  withoutUnmet,
} from '../interviewNavigation';

const opts = (...keys: string[]) => keys.map((key) => ({ key, text: `Texte ${key}` }));

/** Module type : Q1 → Q2 (suite si Q1 = A ou B), Q3 sensible, Q4 plage d'âges. */
const LIST: Question[] = [
  { id: 'Q1', text: 'Q1', options: opts('A', 'B', 'C', 'D') },
  {
    id: 'Q2',
    text: 'Q2',
    options: opts('A', 'B'),
    askIf: [{ questionId: 'Q1', values: ['A', 'B'] }],
  },
  { id: 'Q3', text: 'Q3', options: opts('A', 'B'), sensitive: true },
  { id: 'Q4', text: 'Q4', options: [], input: 'ageRange' },
  { id: 'Q5', text: 'Q5', options: opts('A', 'B', 'C'), multiple: true },
];

describe('Grand Entretien : navigation dans un module', () => {
  it('reprise : première question visible sans réponse', () => {
    expect(nextUnanswered(LIST, {}, true)).toBe(0);
    expect(nextUnanswered(LIST, { Q1: 'C' }, true)).toBe(2); // Q2 masquée
    expect(nextUnanswered(LIST, { Q1: 'A' }, true)).toBe(1);
    expect(nextUnanswered(LIST, { Q1: 'C' }, false)).toBe(3); // Q3 refusée
  });

  it('après une modification : la suivante sans réponse, puis le début', () => {
    const ans = { Q1: 'A', Q2: 'B', Q3: 'A' };
    expect(nextUnanswered(LIST, ans, true, 0)).toBe(3);
    expect(nextUnanswered(LIST, { Q1: 'A', Q3: 'A', Q4: '25-30', Q5: 'A' }, true, 3)).toBe(1);
    expect(nextUnanswered(LIST, { Q1: 'C', Q3: 'A', Q4: '25-30', Q5: 'A' }, true, 0)).toBe(-1);
  });

  it('retour : question répondue précédente, jamais une question masquée', () => {
    const ans = { Q1: 'C', Q2: 'A', Q3: 'A' };
    expect(previousAnswered(LIST, ans, true, 3)).toBe(2);
    expect(previousAnswered(LIST, ans, true, 2)).toBe(0); // Q2 masquée (Q1 = C)
    expect(previousAnswered(LIST, ans, true, 0)).toBe(-1); // → module précédent
    expect(lastAnswered(LIST, ans, true)).toBe(2);
    expect(lastAnswered(LIST, {}, true)).toBe(-1);
  });

  it('réponse de suite devenue sans objet : retirée (en cascade)', () => {
    expect(withoutUnmet(LIST, { Q1: 'D', Q2: 'A', Q3: 'B' })).toEqual({ Q1: 'D', Q3: 'B' });
    expect(withoutUnmet(LIST, { Q1: 'A', Q2: 'A' })).toEqual({ Q1: 'A', Q2: 'A' });
  });

  it('progression cohérente : questions visibles seulement', () => {
    expect(progressOf(LIST, { Q1: 'C' }, true, 2)).toEqual({ position: 2, total: 4, answered: 1 });
    expect(progressOf(LIST, { Q1: 'A' }, true, 1)).toEqual({ position: 2, total: 5, answered: 1 });
  });

  it('libellé des réponses dans le fil', () => {
    expect(answerLabel(LIST[0], { Q1: 'B' }, 'ans')).toBe('Texte B');
    expect(answerLabel(LIST[3], { Q4: '25-40' }, 'ans')).toBe('25 – 40 ans');
    expect(answerLabel(LIST[4], { Q5: 'A,C' }, 'ans')).toBe('Texte A, Texte C');
  });
});

describe('Tranche d’âge : saisie claire, jamais bloquante', () => {
  it('erreurs dans le champ', () => {
    expect(ageInputIssue('2', '')).toBe('incomplete');
    expect(ageInputIssue('17', '30')).toBe('bounds');
    expect(ageInputIssue('40', '30')).toBe('order');
    expect(ageInputIssue('25', '40')).toBeNull();
  });

  it('plage acceptée élargie pour inclure la tranche idéale', () => {
    expect(widenToIdeal('30-40', '28-34')).toBe('28-40');
    expect(widenToIdeal('25-40', '28-34')).toBeNull();
    expect(widenToIdeal('25-30', '28-34')).toBe('25-34');
    expect(widenToIdeal('25-30', undefined)).toBeNull();
  });
});
