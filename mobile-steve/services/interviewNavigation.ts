/**
 * Grand Entretien : navigation dans un module (retour à une question
 * précédente, reprise après interruption). Fonctions pures, testées seules ;
 * l'écran app/interview/[moduleNumber].tsx s'en sert.
 *
 * Le module est servi en entier (questions déjà répondues comprises) avec les
 * réponses enregistrées. La question « en cours » est un index dans cette
 * liste ; le fil de discussion affiché est reconstruit à partir des réponses.
 */
import {
  AGE_MAX,
  AGE_MIN,
  FREE_TEXT_SUFFIX,
  Question,
  askIfMet,
  joinMultipleAnswer,
} from './interview';

export type Answers = Record<string, string>;

/** Question affichée : accord respecté pour les questions sensibles, condition de suite remplie. */
export function isVisible(q: Question, answers: Answers, consent: boolean | null | undefined): boolean {
  if (consent === false && q.sensitive) return false;
  return askIfMet(q, answers);
}

/** Indices des questions visibles, dans l'ordre. */
export function visibleIndices(list: Question[], answers: Answers, consent: boolean | null | undefined): number[] {
  return list.map((q, i) => (isVisible(q, answers, consent) ? i : -1)).filter((i) => i >= 0);
}

/**
 * Question à poser ensuite : la première question visible SANS réponse après
 * `from` (exclu), sinon la première sans réponse depuis le début ; -1 quand le
 * module est entièrement répondu.
 */
export function nextUnanswered(
  list: Question[],
  answers: Answers,
  consent: boolean | null | undefined,
  from = -1,
): number {
  const visible = visibleIndices(list, answers, consent).filter((i) => !answers[list[i].id]);
  return visible.find((i) => i > from) ?? visible[0] ?? -1;
}

/** Question visible et répondue juste avant `index` (retour en arrière) ; -1 s'il n'y en a pas dans ce module. */
export function previousAnswered(
  list: Question[],
  answers: Answers,
  consent: boolean | null | undefined,
  index: number,
): number {
  const before = visibleIndices(list, answers, consent).filter(
    (i) => (index < 0 ? true : i < index) && !!answers[list[i].id],
  );
  return before.length ? before[before.length - 1] : -1;
}

/** Dernière question visible et répondue du module (arrivée depuis le module suivant). */
export function lastAnswered(list: Question[], answers: Answers, consent: boolean | null | undefined): number {
  return previousAnswered(list, answers, consent, -1);
}

/**
 * Réponses dont la condition de suite (même module) n'est plus remplie : le
 * serveur les efface aussi ; on les retire tout de suite à l'écran.
 */
export function withoutUnmet(list: Question[], answers: Answers): Answers {
  let current = { ...answers };
  for (let changed = true; changed; ) {
    changed = false;
    for (const q of list) {
      if (current[q.id] && q.askIf?.length && !askIfMet(q, current)) {
        const { [q.id]: _gone, [`${q.id}${FREE_TEXT_SUFFIX}`]: _other, ...rest } = current;
        current = rest;
        changed = true;
      }
    }
  }
  return current;
}

/** Libellé d'une réponse enregistrée, pour le fil de discussion. */
export function answerLabel(q: Question, answers: Answers, ageUnit: string): string {
  const value = answers[q.id] ?? '';
  if (q.input === 'ageRange') {
    const [lo, hi] = value.split('-');
    return `${lo} – ${hi} ${ageUnit}`;
  }
  const keys = value.split(',').map((k) => k.trim()).filter(Boolean);
  if (q.multiple || keys.length > 1) {
    return joinMultipleAnswer(q, keys, answers[`${q.id}${FREE_TEXT_SUFFIX}`]).text || value;
  }
  return q.options.find((o) => o.key === keys[0])?.text ?? value;
}

/** Position de la question en cours parmi les questions visibles (1…n) et leur nombre. */
export function progressOf(
  list: Question[],
  answers: Answers,
  consent: boolean | null | undefined,
  index: number,
): { position: number; total: number; answered: number } {
  const visible = visibleIndices(list, answers, consent);
  const answered = visible.filter((i) => !!answers[list[i].id]).length;
  const at = visible.indexOf(index);
  return {
    position: at >= 0 ? at + 1 : Math.min(answered + 1, visible.length),
    total: visible.length,
    answered,
  };
}

/** Problème de saisie d'une plage d'âges, ou null. */
export type AgeIssue = 'incomplete' | 'bounds' | 'order';

export function ageInputIssue(min: string, max: string): AgeIssue | null {
  if (!/^\d{2}$/.test(min.trim()) || !/^\d{2}$/.test(max.trim())) return 'incomplete';
  const lo = Number(min);
  const hi = Number(max);
  if (lo < AGE_MIN || hi > AGE_MAX || lo > AGE_MAX || hi < AGE_MIN) return 'bounds';
  if (lo > hi) return 'order';
  return null;
}

/**
 * Plage acceptée (V82_M0_02) qui n'englobe pas la tranche idéale (V82_M0_01) :
 * élargie juste ce qu'il faut. Jamais bloquant ; null si rien à changer.
 */
export function widenToIdeal(accepted: string, ideal: string | undefined): string | null {
  const a = /^(\d{2})-(\d{2})$/.exec(accepted);
  const i = /^(\d{2})-(\d{2})$/.exec(ideal ?? '');
  if (!a || !i) return null;
  const [alo, ahi, ilo, ihi] = [a[1], a[2], i[1], i[2]].map(Number);
  if (alo <= ilo && ahi >= ihi) return null;
  return `${Math.min(alo, ilo)}-${Math.max(ahi, ihi)}`;
}
