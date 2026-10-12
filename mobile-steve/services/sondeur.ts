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
export function getSondeurLockedLabel(
  day: number,
  state: SondeurDayState,
  lang: SondeurLanguage = 'fr',
): string {
  const t = SONDEUR_TEXT[lang];
  if (day > state.calendarDay) {
    const wait = day - state.calendarDay;
    return wait === 1 ? t.lockedTomorrow : t.lockedIn(wait);
  }
  return t.lockedAfterPrevious;
}

/**
 * Langue du Sondeur : celle de l'interface du membre (la même que pour le
 * Grand Entretien). Chaque membre d'un couple lit les mêmes questions dans sa
 * langue ; rien n'indique à l'autre la langue choisie.
 */
export type SondeurLanguage = 'fr' | 'en';

export const SONDEUR_TEXT = {
  fr: {
    dayThemes: ['Lignes rouges', 'Valeurs profondes', 'Futur & Sacrifices'],
    day: 'Jour',
    question: 'Question',
    loading: 'Chargement des questions…',
    retry: 'Réessayer',
    followUp: 'Question ajoutée pour vous deux, après vos réponses d’hier',
    hint: (name: string) =>
      `Répondez librement. ${name} verra votre réponse après avoir répondu de son côté. Le résumé du jour pourra en reprendre quelques mots.`,
    placeholder: 'Écrivez votre réponse ici...',
    yourAnswer: 'Votre réponse',
    partnerAnswer: (name: string) => `La réponse de ${name}`,
    waitingFor: (name: string) => `En attente de la réponse de ${name}…`,
    next: 'Question suivante',
    sending: 'Analyse en cours…',
    submit: 'Valider la réponse',
    unavailableTitle: 'Questions indisponibles',
    unavailableBody: 'Les questions du Sondeur ne sont pas encore prêtes. Réessayez dans un instant.',
    notSavedTitle: 'Réponse non enregistrée',
    notSavedBody: 'Vérifiez votre connexion et réessayez.',
    journeyTitle: 'Parcours Harmonie — 3 jours',
    journeyIntro:
      'Des questions franches sur ce qu’il vaut mieux se dire maintenant. Chacun répond de son côté, puis voit la réponse de l’autre.',
    todayTitle: 'Question du jour',
    nextDay: (n: number) =>
      `Vos 7 questions du jour sont faites. La prochaine série s'ouvre ${n <= 1 ? 'demain' : `dans ${n} jours`}.`,
    questionCount: (n: number) => `${n} question${n > 1 ? 's' : ''}`,
    dayDone: 'Réponses comparées',
    dayActive: 'En cours · 7 questions',
    lockedTomorrow: 'Disponible demain',
    lockedIn: (n: number) => `Disponible dans ${n} jours`,
    lockedAfterPrevious: 'Disponible après le jour précédent',
  },
  en: {
    dayThemes: ['Red lines', 'Core values', 'Future & sacrifices'],
    day: 'Day',
    question: 'Question',
    loading: 'Loading questions…',
    retry: 'Try again',
    followUp: 'Question added for both of you, after yesterday’s answers',
    hint: (name: string) =>
      `Answer in your own words. ${name} will see your answer once they’ve answered too. Today’s summary may quote a few words of it.`,
    placeholder: 'Write your answer here...',
    yourAnswer: 'Your answer',
    partnerAnswer: (name: string) => `${name}'s answer`,
    waitingFor: (name: string) => `Waiting for ${name}'s answer…`,
    next: 'Next question',
    sending: 'Sending…',
    submit: 'Submit answer',
    unavailableTitle: 'Questions unavailable',
    unavailableBody: 'The questions aren’t ready yet. Please try again in a moment.',
    notSavedTitle: 'Answer not saved',
    notSavedBody: 'Check your connection and try again.',
    journeyTitle: 'Harmony journey — 3 days',
    journeyIntro:
      'Straight questions on what’s better said now. You each answer on your own, then see the other’s answer.',
    todayTitle: "Today's questions",
    nextDay: (n: number) =>
      `You've answered today's 7 questions. The next set opens ${n <= 1 ? 'tomorrow' : `in ${n} days`}.`,
    questionCount: (n: number) => `${n} question${n === 1 ? '' : 's'}`,
    dayDone: 'Answers compared',
    dayActive: 'In progress · 7 questions',
    lockedTomorrow: 'Available tomorrow',
    lockedIn: (n: number) => `Available in ${n} days`,
    lockedAfterPrevious: 'Available after the previous day',
  },
} as const;
