import { getSondeurDayState, getSondeurDayStatus, getSondeurLockedLabel, clampDay } from '@/services/sondeur';

describe('Sondeur : 7 questions par jour pendant 3 jours', () => {
  it('borne le jour calendaire entre 1 et 3', () => {
    expect(clampDay(undefined)).toBe(1);
    expect(clampDay(0)).toBe(1);
    expect(clampDay(2.7)).toBe(2);
    expect(clampDay(9)).toBe(3);
  });

  it('ouvre le jour 1 dès le début du parcours', () => {
    const state = getSondeurDayState([], 1);
    expect(state).toMatchObject({ currentDay: 1, canAnswer: true, waitingForNextDay: false, daysUntilUnlock: 0 });
  });

  it("bloque le jour 2 tant que le jour calendaire n'est pas atteint", () => {
    const state = getSondeurDayState([1], 1);
    expect(state).toMatchObject({ currentDay: 2, canAnswer: false, waitingForNextDay: true, daysUntilUnlock: 1 });
    expect(getSondeurDayStatus(1, [1], state)).toBe('done');
    expect(getSondeurDayStatus(2, [1], state)).toBe('locked');
    expect(getSondeurLockedLabel(2, state)).toBe('Disponible demain');
    expect(getSondeurLockedLabel(3, state)).toBe('Disponible dans 2 jours');
  });

  it('ouvre le jour 2 le lendemain', () => {
    const state = getSondeurDayState([1], 2);
    expect(state.canAnswer).toBe(true);
    expect(getSondeurDayStatus(2, [1], state)).toBe('active');
    expect(getSondeurDayStatus(3, [1], state)).toBe('locked');
    expect(getSondeurLockedLabel(3, state)).toBe('Disponible demain');
  });

  it("n'autorise pas à sauter une journée même si le calendrier est en avance", () => {
    const state = getSondeurDayState([], 3);
    expect(state.currentDay).toBe(1);
    expect(getSondeurDayStatus(3, [], state)).toBe('locked');
    expect(getSondeurLockedLabel(3, state)).toBe('Disponible après le jour précédent');
  });

  it('considère le Sondeur terminé après les 3 journées', () => {
    const state = getSondeurDayState([1, 2, 3], 3);
    expect(state).toMatchObject({ canAnswer: false, waitingForNextDay: false, daysUntilUnlock: 0 });
  });
});
