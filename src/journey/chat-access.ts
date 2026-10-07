import { Prisma } from '@prisma/client';

/**
 * Messagerie ouverte : après le Sondeur, pendant un parcours en cours, ou
 * après un parcours réussi. Un parcours arrêté (par un membre, l'anti-ghosting
 * ou la modération) ne laisse plus passer aucun message.
 */
export function chatOpen(journey: {
  currentStep: string;
  result: string;
}): boolean {
  return (
    (['chat_libre', 'video', 'echange_contacts'].includes(
      journey.currentStep,
    ) &&
      journey.result === 'en_cours') ||
    (journey.currentStep === 'termine' && journey.result === 'reussi')
  );
}

/** Même règle, en filtre Prisma. */
export const CHAT_OPEN_WHERE: Prisma.JourneyWhereInput = {
  OR: [
    {
      currentStep: { in: ['chat_libre', 'video', 'echange_contacts'] },
      result: 'en_cours',
    },
    { currentStep: 'termine', result: 'reussi' },
  ],
};
