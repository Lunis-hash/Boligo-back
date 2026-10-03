/**
 * Règles d'une invitation (MatchProposal) et de son crédit.
 *
 *  - Inviter coûte 1 crédit, débité par le serveur à l'envoi ; accepter coûte
 *    1 crédit, débité à l'acceptation. L'app ne débite plus rien elle-même.
 *  - Une invitation refusée, retirée ou expirée rend son crédit à son auteur.
 *  - Règle d'or : un membre n'a qu'une invitation envoyée en attente OU un
 *    parcours en cours à la fois. Un parcours terminé (réussi ou non) libère
 *    les deux membres.
 */
import { Prisma } from '@prisma/client';

export const CONNECT_COST = 1;
export const PROPOSAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Référence de la consommation du crédit de l'auteur de l'invitation. */
export const connectRef = (proposalId: string) => `MATCH_${proposalId}`;
/** Référence de la consommation du crédit de la personne qui accepte. */
export const acceptRef = (proposalId: string) => `MATCH_${proposalId}_ACCEPT`;
/** Référence du crédit rendu à l'auteur (refus, retrait, expiration). */
export const refundRef = (proposalId: string) => `MATCH_${proposalId}_REFUND`;

const involving = (userId: string): Prisma.MatchProposalWhereInput => ({
  OR: [{ sourceUserId: userId }, { targetUserId: userId }],
});

/** Parcours accepté et toujours en cours (ou pas encore créé). */
const liveAccepted: Prisma.MatchProposalWhereInput = {
  status: 'acceptee',
  OR: [{ journey: { is: null } }, { journey: { result: 'en_cours' } }],
};

const pendingNotExpired = (now: Date): Prisma.MatchProposalWhereInput => ({
  status: 'en_attente',
  expiresAt: { gt: now },
});

/** Parcours en cours (ou en création) impliquant ce membre. */
export function inLiveJourney(userId: string): Prisma.MatchProposalWhereInput {
  return { AND: [liveAccepted, involving(userId)] };
}

/**
 * Ce qui empêche un membre d'inviter quelqu'un : une invitation qu'il a
 * envoyée et qui attend encore, ou un parcours en cours.
 */
export function blocksOwnInvites(
  userId: string,
  now = new Date(),
): Prisma.MatchProposalWhereInput {
  return {
    OR: [
      { ...pendingNotExpired(now), sourceUserId: userId },
      { AND: [liveAccepted, involving(userId)] },
    ],
  };
}

/**
 * Ce qui rend un membre indisponible pour les autres : toute invitation en
 * attente (envoyée ou reçue) ou un parcours en cours.
 */
export function makesUnavailable(
  userId: string,
  now = new Date(),
): Prisma.MatchProposalWhereInput {
  return {
    OR: [
      { AND: [pendingNotExpired(now), involving(userId)] },
      { AND: [liveAccepted, involving(userId)] },
    ],
  };
}

/** Toutes les invitations qui occupent quelqu'un en ce moment. */
export function occupyingProposals(
  now = new Date(),
): Prisma.MatchProposalWhereInput {
  return { OR: [pendingNotExpired(now), liveAccepted] };
}
