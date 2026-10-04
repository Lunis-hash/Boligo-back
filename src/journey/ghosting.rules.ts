/**
 * Règles anti-ghosting du Parcours Harmonie (fonctions pures, sans base).
 *
 * Principe : quand un membre attend une réponse de l'autre, un compte à
 * rebours démarre. L'autre reçoit un rappel, puis un dernier avertissement ;
 * sans réponse à l'échéance, le parcours se termine et, pendant le parcours,
 * la personne qui attendait récupère son crédit. Si plus personne ne bouge
 * pendant longtemps, le parcours est clos sans remboursement.
 */

export const HOUR_MS = 60 * 60 * 1000;

/** Sondeur : 3 jours + 24 h de grâce (Règle de Justice historique). */
export const SONDEUR_DEADLINE_HOURS = 96;
/** Chat libre : durée de l'étape, puis passage automatique à la vidéo. */
export const CHAT_DURATION_HOURS = 72;
/** Chat libre : délai de réponse au dernier message de l'autre. */
export const CHAT_REPLY_HOURS = 48;
/** Vidéo : délai minimal dans l'étape avant clôture (Règle de Justice historique). */
export const VIDEO_STEP_HOURS = 48;
/** Vidéo : délai laissé pour rejoindre après l'appel de l'autre. */
export const VIDEO_REPLY_HOURS = 24;
/** Échange de coordonnées : délai pour répondre. */
export const CONTACT_REPLY_HOURS = 72;
/** Plus aucune activité des deux membres : clôture sans remboursement. */
export const INACTIVE_DAYS = 7;

export type GhostStep =
  | 'phase_harmonie'
  | 'chat_libre'
  | 'video'
  | 'echange_contacts';

export interface GhostingInput {
  step: GhostStep;
  stepStart: Date;
  userAId: string;
  userBId: string;
  /** Sondeur : nombre de questions répondues et dernière réponse de chacun. */
  answeredA?: number;
  answeredB?: number;
  lastAnswerA?: Date | null;
  lastAnswerB?: Date | null;
  /** Chat libre : dernier message publié. */
  lastMessage?: { senderId: string; sentAt: Date } | null;
  /** Vidéo : qui a rejoint l'appel, et quand le premier l'a lancé. */
  joinedA?: boolean;
  joinedB?: boolean;
  callStartedAt?: Date | null;
  /** Échange de coordonnées : qui a déjà répondu. */
  contactA?: boolean;
  contactB?: boolean;
}

/**
 * - ghosting : un membre attend l'autre ; clôture avec remboursement de celui
 *   qui attendait (sauf à l'échange de coordonnées, le parcours ayant eu lieu).
 * - inactive : plus aucune activité des deux côtés.
 */
export type GhostingKind = 'none' | 'ghosting' | 'inactive';

export interface GhostingAssessment {
  kind: GhostingKind;
  /** Membre attendu (celui qui doit agir). */
  waitingOnId: string | null;
  /** Membre qui attend. */
  waitingForId: string | null;
  /** Début de l'attente. */
  since: Date | null;
  /** Premier rappel au membre attendu. */
  remindAt: Date | null;
  /** Dernier avertissement avant la clôture. */
  warnAt: Date | null;
  /** Échéance : le parcours se termine si rien ne bouge. Null = pas d'échéance dans l'étape. */
  closeAt: Date | null;
  /** La personne qui attend récupère son crédit à la clôture. */
  refundWaiting: boolean;
}

const NONE: GhostingAssessment = {
  kind: 'none',
  waitingOnId: null,
  waitingForId: null,
  since: null,
  remindAt: null,
  warnAt: null,
  closeAt: null,
  refundWaiting: false,
};

const plus = (d: Date, hours: number) =>
  new Date(d.getTime() + hours * HOUR_MS);
const latest = (...dates: Array<Date | null | undefined>) => {
  const times = dates
    .filter((d): d is Date => d instanceof Date)
    .map((d) => d.getTime());
  return times.length ? new Date(Math.max(...times)) : null;
};

function waiting(
  waitingOnId: string,
  waitingForId: string,
  since: Date,
  remindAt: Date,
  warnAt: Date,
  closeAt: Date | null,
  refundWaiting: boolean,
): GhostingAssessment {
  return {
    kind: 'ghosting',
    waitingOnId,
    waitingForId,
    since,
    remindAt,
    warnAt,
    closeAt,
    refundWaiting,
  };
}

/** Dernière activité connue des deux membres dans l'étape. */
export function lastActivity(input: GhostingInput): Date {
  return (
    latest(
      input.stepStart,
      input.lastAnswerA,
      input.lastAnswerB,
      input.lastMessage?.sentAt,
      input.callStartedAt,
    ) ?? input.stepStart
  );
}

function assessWaiting(input: GhostingInput): GhostingAssessment {
  const { step, stepStart, userAId, userBId } = input;

  if (step === 'phase_harmonie') {
    const a = input.answeredA ?? 0;
    const b = input.answeredB ?? 0;
    if (a === b) return NONE;
    const [behind, ahead] = a < b ? [userAId, userBId] : [userBId, userAId];
    const closeAt = plus(stepStart, SONDEUR_DEADLINE_HOURS);
    const aheadLast = a < b ? input.lastAnswerB : input.lastAnswerA;
    return waiting(
      behind,
      ahead,
      latest(aheadLast, stepStart)!,
      plus(closeAt, -48),
      plus(closeAt, -24),
      closeAt,
      true,
    );
  }

  if (step === 'chat_libre') {
    const last = input.lastMessage;
    if (!last) return NONE;
    const waitingOnId = last.senderId === userAId ? userBId : userAId;
    const deadline = latest(
      plus(last.sentAt, CHAT_REPLY_HOURS),
      plus(stepStart, CHAT_REPLY_HOURS),
    )!;
    // Le chat passe à la vidéo au bout de 72 h : pas d'échéance au-delà.
    const closeAt =
      deadline < plus(stepStart, CHAT_DURATION_HOURS) ? deadline : null;
    return waiting(
      waitingOnId,
      last.senderId,
      last.sentAt,
      plus(last.sentAt, 24),
      plus(last.sentAt, 36),
      closeAt,
      true,
    );
  }

  if (step === 'video') {
    const joinedA = input.joinedA === true;
    const joinedB = input.joinedB === true;
    if (joinedA === joinedB) return NONE;
    const [waitingOnId, waitingForId] = joinedA
      ? [userBId, userAId]
      : [userAId, userBId];
    const since = latest(input.callStartedAt, stepStart)!;
    const closeAt = latest(
      plus(stepStart, VIDEO_STEP_HOURS),
      plus(since, VIDEO_REPLY_HOURS),
    )!;
    return waiting(
      waitingOnId,
      waitingForId,
      since,
      plus(since, 12),
      plus(closeAt, -12),
      closeAt,
      true,
    );
  }

  // echange_contacts
  const contactA = input.contactA === true;
  const contactB = input.contactB === true;
  if (contactA === contactB) return NONE;
  const [waitingOnId, waitingForId] = contactA
    ? [userBId, userAId]
    : [userAId, userBId];
  const closeAt = plus(stepStart, CONTACT_REPLY_HOURS);
  return waiting(
    waitingOnId,
    waitingForId,
    stepStart,
    plus(stepStart, 24),
    plus(closeAt, -24),
    closeAt,
    false,
  );
}

export function assessGhosting(
  input: GhostingInput,
  now: Date = new Date(),
): GhostingAssessment {
  const assessment = assessWaiting(input);
  if (assessment.kind === 'ghosting') return assessment;

  // Personne n'attend personne : si plus rien ne bouge, le parcours s'éteint.
  const since = lastActivity(input);
  const closeAt = plus(since, INACTIVE_DAYS * 24);
  if (now < plus(since, 24)) return NONE;
  return { ...NONE, kind: 'inactive', since, closeAt };
}

export type GhostingAction = 'none' | 'remind' | 'warn' | 'close';

/** Action due à l'instant `now` pour une évaluation donnée. */
export function dueAction(
  assessment: GhostingAssessment,
  now: Date = new Date(),
): GhostingAction {
  if (assessment.kind === 'none') return 'none';
  if (assessment.closeAt && now >= assessment.closeAt) return 'close';
  if (assessment.kind !== 'ghosting') return 'none';
  // Le dernier avertissement annonce une clôture : sans échéance, simple rappel.
  if (assessment.closeAt && assessment.warnAt && now >= assessment.warnAt)
    return 'warn';
  if (assessment.remindAt && now >= assessment.remindAt) return 'remind';
  return 'none';
}

/** Vue du compte à rebours pour un membre donné (affichée dans l'app). */
export interface GhostingView {
  /** « me » : on attend ma réponse ; « partner » : j'attends l'autre ; null : rien. */
  waitingOn: 'me' | 'partner' | null;
  since: string | null;
  closeAt: string | null;
  /** Je récupère mon crédit si le parcours se clôt faute de réponse de l'autre. */
  refundOnClose: boolean;
}

export function ghostingViewFor(
  assessment: GhostingAssessment,
  userId: string,
): GhostingView {
  if (assessment.kind !== 'ghosting') {
    return {
      waitingOn: null,
      since: null,
      closeAt: null,
      refundOnClose: false,
    };
  }
  const mine = assessment.waitingOnId === userId;
  return {
    waitingOn: mine ? 'me' : 'partner',
    since: assessment.since?.toISOString() ?? null,
    closeAt: assessment.closeAt?.toISOString() ?? null,
    refundOnClose: !mine && assessment.refundWaiting,
  };
}
