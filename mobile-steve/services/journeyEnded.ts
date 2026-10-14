import client from './api';
import { getItem, setItem } from './storage';

/** Dernier parcours clos sans succès (moins de 14 jours), renvoyé par le serveur. */
export interface EndedJourney {
  journeyId: string;
  partnerName: string;
  result: 'abandonne' | 'echoue';
  endedAt: string;
  /** Crédits rendus au membre (0 : aucun). */
  creditReturned: number;
}

const SEEN_PREFIX = 'endedJourneySeen_';

/** Message de l'onglet Matchs : ce qui s'est passé, et le crédit éventuel. */
export function endedJourneyMessage(e: EndedJourney): { title: string; body: string } {
  const title = `Votre parcours avec ${e.partnerName} est terminé`;
  const why =
    e.result === 'echoue'
      ? 'Le parcours a été clos faute de réponse dans les délais.'
      : 'Le parcours a été arrêté.';
  const credit =
    e.creditReturned > 0
      ? ` Votre crédit vous a été rendu : vous pouvez lancer un nouveau parcours depuis Découverte.`
      : ' Vous pouvez lancer un nouveau parcours depuis Découverte.';
  return { title, body: `${why}${credit}` };
}

/** Parcours terminé à afficher, sauf s'il a déjà été lu sur cet appareil. */
export async function fetchUnseenEndedJourney(): Promise<EndedJourney | null> {
  const { data } = await client.get<{ ended: EndedJourney | null }>('/journey/last-ended');
  const ended = data?.ended ?? null;
  if (!ended) return null;
  return (await getItem(SEEN_PREFIX + ended.journeyId)) ? null : ended;
}

export async function markEndedJourneySeen(journeyId: string): Promise<void> {
  await setItem(SEEN_PREFIX + journeyId, '1');
}
