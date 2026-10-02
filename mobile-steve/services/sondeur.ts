/**
 * Règle du Sondeur : 21 questions réparties sur 3 jours (7 par jour).
 *
 * Le backend fournit `currentDay` (jour calendaire depuis le début de la phase
 * Harmonie, 1 à 3). Une journée ne s'ouvre que si la précédente est répondue
 * ET si le jour calendaire est atteint : répondre aux 21 questions d'une
 * traite n'est pas possible.
 *
 * HYPOTHÈSE TEMPORAIRE : le backend n'applique pas encore cette règle côté
 * serveur (voir docs/backend-proposals/sondeur-day-gating.patch) ; l'app la
 * fait respecter en attendant.
 */
export const SONDEUR_DAYS_TOTAL = 3;

export type SondeurDayStatus = 'done' | 'active' | 'locked';

export interface SondeurDayState {
  /** Première journée non répondue (1 à 3). */
  currentDay: number;
  /** Jour calendaire fourni par le backend, borné à 1..3. */
  calendarDay: number;
  /** L'utilisateur peut répondre à la journée courante. */
  canAnswer: boolean;
  /** Journée courante répondue mais la suivante n'est pas encore ouverte. */
  waitingForNextDay: boolean;
  /** Nombre de jours avant l'ouverture de la journée courante. */
  daysUntilUnlock: number;
}

export function clampDay(day: unknown): number {
  const n = typeof day === 'number' && Number.isFinite(day) ? Math.floor(day) : 1;
  return Math.max(1, Math.min(SONDEUR_DAYS_TOTAL, n));
}

export function getSondeurDayState(answeredDays: number[], calendarDay: unknown): SondeurDayState {
  const calendar = clampDay(calendarDay);
  const allDays = Array.from({ length: SONDEUR_DAYS_TOTAL }, (_, i) => i + 1);
  const firstPending = allDays.find((d) => !answeredDays.includes(d));
  const allAnswered = firstPending === undefined;
  const currentDay = firstPending ?? SONDEUR_DAYS_TOTAL;
  const unlocked = currentDay <= calendar;
  return {
    currentDay,
    calendarDay: calendar,
    canAnswer: !allAnswered && unlocked,
    waitingForNextDay: !allAnswered && !unlocked,
    daysUntilUnlock: allAnswered ? 0 : Math.max(0, currentDay - calendar),
  };
}

export function getSondeurDayStatus(day: number, answeredDays: number[], state: SondeurDayState): SondeurDayStatus {
  if (answeredDays.includes(day)) return 'done';
  if (day === state.currentDay && state.canAnswer) return 'active';
  return 'locked';
}

/** Libellé affiché sous une journée verrouillée. */
export function getSondeurLockedLabel(day: number, state: SondeurDayState): string {
  if (day > state.calendarDay) {
    const wait = day - state.calendarDay;
    return wait === 1 ? 'Disponible demain' : `Disponible dans ${wait} jours`;
  }
  return 'Disponible après le jour précédent';
}
