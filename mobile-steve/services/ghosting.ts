/**
 * Pacte anti-ghosting côté application : compte à rebours renvoyé par
 * GET /journey/:id/status (champ « ghosting ») et messages de courtoisie
 * proposés quand on met fin à un parcours.
 */

export interface GhostingView {
  /** « me » : l'autre attend ma réponse ; « partner » : j'attends l'autre. */
  waitingOn: 'me' | 'partner' | null;
  since: string | null;
  closeAt: string | null;
  /** Je récupère mon crédit si le parcours se termine faute de réponse de l'autre. */
  refundOnClose: boolean;
}

/** Codes acceptés par POST /journey/:id/leave (liste fermée côté serveur). */
export const FAREWELLS: { code: string; text: string }[] = [
  { code: 'merci', text: 'Merci pour ces échanges. Je préfère m’arrêter ici, je vous souhaite le meilleur.' },
  { code: 'pas_compatible', text: 'Je ne pense pas que nous soyons faits pour avancer ensemble. Merci pour votre sincérité.' },
  { code: 'pas_disponible', text: 'Je ne suis plus disponible pour poursuivre ce parcours. Merci, et bonne continuation.' },
];

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « jeudi 8 octobre à 14:00 », dans le fuseau de l'appareil. */
export function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} à ${hh}:${mm}`;
}

export function isGhostingView(value: unknown): value is GhostingView {
  return (
    !!value &&
    typeof value === 'object' &&
    'waitingOn' in value &&
    ((value as GhostingView).waitingOn === 'me' || (value as GhostingView).waitingOn === 'partner')
  );
}

/** Texte du bandeau de compte à rebours, ou null si personne n'attend. */
export function ghostingBannerText(view: GhostingView | null | undefined, partnerName: string): { title: string; body: string } | null {
  if (!view || !view.waitingOn) return null;
  const deadline = view.closeAt ? formatDeadline(view.closeAt) : '';
  if (view.waitingOn === 'me') {
    return {
      title: `${partnerName} attend votre réponse`,
      body: deadline
        ? `Répondez avant le ${deadline}, ou mettez fin poliment au parcours. Sans réponse, il se terminera.`
        : 'Répondez-lui, ou mettez fin poliment au parcours.',
    };
  }
  return {
    title: `Vous attendez la réponse de ${partnerName}`,
    body: deadline
      ? `Sans réponse avant le ${deadline}, le parcours se terminera${view.refundOnClose ? ' et votre crédit vous sera rendu' : ''}.`
      : 'Votre message l’attend dans la conversation.',
  };
}
