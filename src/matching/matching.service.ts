import { Injectable } from '@nestjs/common';
import { MatchProposal, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { collectRawAnswers, RawAnswers } from './divergence.engine';
import { buildMatchView, resolveScore } from './match-view';
import { NotificationService } from '../notifications/notification.service';
import {
  acceptRef,
  blocksOwnInvites,
  CONNECT_COST,
  connectRef,
  inLiveJourney,
  makesUnavailable,
  occupyingProposals,
  PROPOSAL_TTL_MS,
  refundRef,
} from './proposal-rules';

/** Plafonds de la Découverte : candidats évalués et fiches renvoyées. */
const DISCOVER_CANDIDATES_MAX = 500;
const DISCOVER_RESULTS_MAX = 50;
/** Un parcours réussi reste visible (coordonnées échangées) pendant 30 jours. */
const ENDED_VISIBLE_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class MatchingService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async getDiscoverProfiles(userId: string) {
    // 1. Récupérer l'utilisateur actuel pour ses préférences
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        mentalMaps: { orderBy: { generatedAt: 'desc' }, take: 1 },
      },
    });

    if (!currentUser) return [];
    await this.expireStaleProposals();

    const viewerMentalMap = currentUser.mentalMaps[0] ?? null;

    // 1.5 RÈGLE D'OR BOLIGO : Pas de multi-match. 
    // Si l'utilisateur a déjà un match actif OU une invitation envoyée en attente,
    // on ne lui propose plus rien dans Découverte.
    // Un parcours terminé (réussi ou non) ne bloque plus la Découverte.
    const activeMatch = await this.prisma.matchProposal.findFirst({
      where: blocksOwnInvites(userId),
      select: { id: true },
    });

    if (activeMatch) {
      console.log(`🚫 [Discover] Blocage pour ${userId} : match ou invitation déjà en cours.`);
      return [];
    }

    // 2. RÈGLE ABSOLUE BOLIGO :
    // Exclure :
    // a) Tous les profils avec lesquels l'utilisateur connecté a déjà interagi (liké, refusé, etc.)
    // b) N'IMPORTE QUEL profil qui est actuellement EN PARCOURS ACTIF (status = 'acceptee' ou 'en_attente') avec n'importe qui !
    const busyOrInteractedProposals = await this.prisma.matchProposal.findMany({
      where: {
        OR: [
          { sourceUserId: userId }, // Déjà liké par moi
          { targetUserId: userId }, // Déjà interagi avec moi
          occupyingProposals(), // En parcours ou invitation active dans tout le système !
        ],
      },
      select: { sourceUserId: true, targetUserId: true },
    });

    const unavailableUserIds = new Set<string>();
    unavailableUserIds.add(userId); // Exclure soi-même
    busyOrInteractedProposals.forEach((m) => {
      unavailableUserIds.add(m.sourceUserId);
      unavailableUserIds.add(m.targetUserId);
    });

    // 3. Chercher les profils du sexe opposé non occupés avec une carte mentale
    const targetGender = currentUser.gender === 'H' ? 'F' : 'H';

    // Extraire les réponses du Module 0 pour l'utilisateur connecté
    const userInterview = await this.prisma.interviewIA.findFirst({
      where: { userId, status: { in: ['en_cours', 'termine'] } },
      orderBy: { startDate: 'desc' },
      include: { responses: true },
    });

    // Réponses brutes de tous les modules : filtres du Module 0 + moteur de divergences.
    const viewerAnswers = collectRawAnswers(userInterview?.responses);
    const m0Responses = viewerAnswers;
    const agePrefOption = m0Responses.M0_Q01; // A: ±5 ans, B: plus jeune, C: plus âgé, D: peu importe
    const scopePrefOption = m0Responses.M0_Q02; // A: même ville, B: même région, C: même pays, D: international

    const currentUserBirthYear = currentUser.birthDate ? new Date(currentUser.birthDate).getFullYear() : new Date().getFullYear() - 30;
    const currentUserAge = new Date().getFullYear() - currentUserBirthYear;
    const currentUserCity = (currentUser.city || '').toLowerCase().trim();

    const matches = await this.prisma.user.findMany({
      where: {
        id: { notIn: Array.from(unavailableUserIds) },
        gender: targetGender,
        role: UserRole.USER,
        accountStatus: { not: 'suspendu' },
        mentalMaps: { some: {} },
      },
      take: DISCOVER_CANDIDATES_MAX,
      include: {
        mentalMaps: {
          orderBy: { generatedAt: 'desc' },
          take: 1,
        },
        profile: true,
      },
    });

    // Application stricte des filtres du Module 0
    const filteredMatches = matches.filter((candidate) => {
      const candidateBirthYear = candidate.birthDate ? new Date(candidate.birthDate).getFullYear() : 0;
      const candidateAge = candidateBirthYear ? new Date().getFullYear() - candidateBirthYear : 0;
      const candidateCity = (candidate.profile?.displayedCity || candidate.city || '').toLowerCase().trim();

      // 1. Filtre Tranche d'âge
      if (candidateAge > 0 && currentUserAge > 0) {
        if (agePrefOption === 'A') {
          // Même génération (±5 ans)
          if (Math.abs(candidateAge - currentUserAge) > 5) {
            return false;
          }
        } else if (agePrefOption === 'B') {
          // Plus jeune
          if (candidateAge >= currentUserAge) {
            return false;
          }
        } else if (agePrefOption === 'C') {
          // Plus âgé(e)
          if (candidateAge <= currentUserAge) {
            return false;
          }
        }
      }

      // 2. Filtre Périmètre Géographique (A: Local, B: Régional, C: National, D: International)
      if (currentUserCity && candidateCity) {
        const userParts = currentUserCity.split(',').map((p) => p.trim());
        const candidateParts = candidateCity.split(',').map((p) => p.trim());

        if (scopePrefOption === 'A') {
          // Local (Même ville)
          const isSameCity =
            userParts[0] && candidateParts[0] &&
            (candidateParts[0].includes(userParts[0]) || userParts[0].includes(candidateParts[0]));
          if (!isSameCity) return false;
        } else if (scopePrefOption === 'B') {
          // Régional (Même région ou même ville)
          const userRegion = userParts[1] || userParts[0];
          const candidateRegion = candidateParts[1] || candidateParts[0];
          const isSameRegion =
            userRegion && candidateRegion &&
            (candidateRegion.includes(userRegion) || userRegion.includes(candidateRegion));
          if (!isSameRegion) return false;
        } else if (scopePrefOption === 'C') {
          // National (Même pays)
          const userCountry = userParts[userParts.length - 1];
          const candidateCountry = candidateParts[candidateParts.length - 1];
          const isSameCountry =
            userCountry && candidateCountry &&
            (candidateCountry.includes(userCountry) || userCountry.includes(candidateCountry));
          if (!isSameCountry) return false;
        }
        // scopePrefOption === 'D' -> International (tous les profils autorisés)
      }

      return true;
    });

    // Les filtres du Module 0 sont stricts : aucun repli sur des profils hors
    // périmètre. L'app affiche alors son état vide (« aucun profil pour le moment »).
    const candidatesToScore = filteredMatches;

    // Réponses du Grand Entretien des candidats : toute la fiche (score, modules,
    // textes) en est déduite — jamais d'une valeur inventée.
    const answersByUser = await this.answersByUser(candidatesToScore.map((c) => c.id));
    const viewer = { answers: viewerAnswers, mentalMap: viewerMentalMap };

    const scored = candidatesToScore.map((m) => {
      const { _score, ...view } = buildMatchView(viewer, {
        id: m.id,
        firstName: m.firstName,
        gender: m.gender,
        birthDate: m.birthDate,
        city: m.city,
        profile: m.profile,
        mentalMap: m.mentalMaps[0] ?? null,
        answers: answersByUser.get(m.id) ?? {},
      });
      return { ...view, _sortScore: _score };
    });

    scored.sort((a, b) => b._sortScore - a._sortScore);

    return scored
      .slice(0, DISCOVER_RESULTS_MAX)
      .map(({ _sortScore, ...rest }) => rest);
  }

  /** Dernier entretien (en cours ou terminé) de chaque membre → réponses brutes. */
  private async answersByUser(userIds: string[]): Promise<Map<string, RawAnswers>> {
    const map = new Map<string, RawAnswers>();
    if (userIds.length === 0) return map;
    const interviews = await this.prisma.interviewIA.findMany({
      where: { userId: { in: userIds }, status: { in: ['en_cours', 'termine'] } },
      orderBy: { startDate: 'asc' },
      include: { responses: true },
    });
    // Tri croissant : l'entretien le plus récent écrase les précédents.
    for (const itv of interviews) {
      map.set(itv.userId, collectRawAnswers(itv.responses));
    }
    return map;
  }

  // Auto-réparer les journeys en phase_harmonie où un utilisateur a tout répondu
  // Et aussi faire avancer chat_libre → video après 3 jours
  private async autoAdvanceStaleJourneys(userId: string) {
    const journeys = await this.prisma.journey.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        currentStep: { in: ['phase_harmonie', 'chat_libre'] },
      },
      include: {
        harmonyQuestions: { include: { responses: true } },
      },
    });

    for (const journey of journeys) {
      // phase_harmonie → chat_libre : si un utilisateur a répondu à toutes les questions
      if (journey.currentStep === 'phase_harmonie') {
        const allQuestions = journey.harmonyQuestions;
        if (allQuestions.length === 0) continue;

        const userAHasAll = allQuestions.every(q =>
          q.responses.some(r => r.userId === journey.userAId),
        );
        const userBHasAll = allQuestions.every(q =>
          q.responses.some(r => r.userId === journey.userBId),
        );

        if (userAHasAll && userBHasAll) {
          await this.prisma.journey.update({
            where: { id: journey.id },
            data: { currentStep: 'chat_libre', stepStartDate: new Date() },
          });
        }
      }

      // chat_libre → video : si 3 jours de chat sont passés
      if (journey.currentStep === 'chat_libre') {
        const chatStart = journey.stepStartDate.getTime();
        const daysSinceChat = (Date.now() - chatStart) / (1000 * 60 * 60 * 24);

        if (daysSinceChat >= 3) {
          await this.prisma.journey.update({
            where: { id: journey.id },
            data: { currentStep: 'video', stepStartDate: new Date() },
          });
        }
      }
    }
  }

  private async resolveCompatibilityScore(userId: string, targetUserId: string) {
    const [viewerMap, candidateMap, answers] = await Promise.all([
      this.prisma.mentalMap.findFirst({ where: { userId }, orderBy: { generatedAt: 'desc' } }),
      this.prisma.mentalMap.findFirst({ where: { userId: targetUserId }, orderBy: { generatedAt: 'desc' } }),
      this.answersByUser([userId, targetUserId]),
    ]);
    const resolved = resolveScore(
      { answers: answers.get(userId) ?? {}, mentalMap: viewerMap },
      { answers: answers.get(targetUserId) ?? {}, mentalMap: candidateMap },
    );
    const top = resolved.report.divergences[0];
    const summary = top
      ? `Compatibilité de ${resolved.percent} %. Point de vigilance : ${top.label.toLowerCase()}.`
      : `Compatibilité de ${resolved.percent} %.`;
    return { score: resolved.score, percent: resolved.percent, summary };
  }

  // Récupérer tous les matches actifs de l'utilisateur
  async getMyMatches(userId: string) {
    // Auto-réparer : si un journey est en phase_harmonie mais un utilisateur a répondu
    // à toutes les questions, avancer à chat_libre (corrige les données périmées)
    await this.autoAdvanceStaleJourneys(userId);
    await this.expireStaleProposals();

    const now = new Date();
    const proposals = await this.prisma.matchProposal.findMany({
      where: {
        OR: [
          inLiveJourney(userId), // Parcours en cours
          {
            // Parcours réussi récent : les coordonnées restent consultables.
            status: 'acceptee',
            OR: [{ sourceUserId: userId }, { targetUserId: userId }],
            journey: {
              result: 'reussi',
              endDate: { gte: new Date(now.getTime() - ENDED_VISIBLE_MS) },
            },
          },
          { status: 'en_attente', sourceUserId: userId, expiresAt: { gt: now } }, // Invitation envoyée
        ],
      },
      include: {
        sourceUser: { include: { profile: true, mentalMaps: { orderBy: { generatedAt: 'desc' }, take: 1 } } },
        targetUser: { include: { profile: true, mentalMaps: { orderBy: { generatedAt: 'desc' }, take: 1 } } },
        journey: true,
      },
    });

    const partnerOf = (p: (typeof proposals)[0]) =>
      p.sourceUserId === userId ? p.targetUser : p.sourceUser;
    const [viewerMap, answers] = await Promise.all([
      this.prisma.mentalMap.findFirst({ where: { userId }, orderBy: { generatedAt: 'desc' } }),
      this.answersByUser([userId, ...proposals.map((p) => partnerOf(p).id)]),
    ]);
    const viewer = { answers: answers.get(userId) ?? {}, mentalMap: viewerMap };

    const mapped = proposals.map((p) => {
      // Le partenaire est l'autre utilisateur (pas soi-même)
      const partner = partnerOf(p);
      const step = p.journey?.currentStep ?? (p.status === 'en_attente' ? 'attente' : 'phase_harmonie');

      // Mapper le step du Journey vers la phase frontend
      const phaseMap: Record<string, string> = {
        attente: 'attente',
        phase_harmonie: 'sondeur',
        chat_libre: 'chat',
        video: 'video',
        echange_contacts: 'contacts',
        termine: 'contacts',
      };

      const isVideoUnlockEnv = process.env.VIDEO_TEST_UNLOCK?.trim().toLowerCase();
      const testUnlock = isVideoUnlockEnv === 'true' || isVideoUnlockEnv === '1';
      const videoEnabled = step === 'video' || (testUnlock && step === 'chat_libre');

      const { _score, id, firstName, ...view } = buildMatchView(viewer, {
        id: partner.id,
        firstName: partner.firstName,
        gender: partner.gender,
        birthDate: partner.birthDate,
        city: partner.city,
        profile: partner.profile,
        mentalMap: partner.mentalMaps?.[0] ?? null,
        answers: answers.get(partner.id) ?? {},
      });

      return {
        ...view,
        id,
        name: firstName,
        phase: phaseMap[step] ?? 'sondeur',
        journeyId: p.journey?.id ?? null,
        proposalId: p.id,
        proposalStatus: p.status,
        videoEnabled,
        testUnlock,
        contactsExchanged: step === 'termine',
        ended: Boolean(p.journey && p.journey.result !== 'en_cours'),
        journeyResult: p.journey?.result ?? null,
        expiresAt: p.status === 'en_attente' ? p.expiresAt : null,
      };
    });

    // Parcours actif (accepté + journey) avant une simple invitation en attente
    mapped.sort((a, b) => {
      const rank = (m: (typeof mapped)[0]) => {
        if (m.ended) return -1;
        if (m.journeyId && m.phase !== 'attente') return 3;
        if (m.phase === 'sondeur') return 2;
        if (m.phase === 'attente') return 0;
        return 1;
      };
      return rank(b) - rank(a);
    });

    return mapped;
  }

  // Inviter un profil : le serveur vérifie la règle d'or et débite 1 crédit.
  async createMatch(userId: string, targetUserId: string) {
    if (typeof targetUserId !== 'string' || !targetUserId || targetUserId === userId) {
      return { success: false, message: 'Profil invalide.' };
    }
    await this.expireStaleProposals();

    // Invitation croisée : l'autre membre m'a déjà invité → c'est une acceptation.
    const reverse = await this.prisma.matchProposal.findFirst({
      where: {
        sourceUserId: targetUserId,
        targetUserId: userId,
        status: 'en_attente',
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (reverse) return this.acceptMatch(reverse.id, userId);

    const compat = await this.resolveCompatibilityScore(userId, targetUserId);

    const outcome = await this.prisma.$transaction(async (tx) => {
      await this.lockMembers(tx, [userId, targetUserId]);
      const now = new Date();
      const [viewer, target] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: { gender: true, accountStatus: true, _count: { select: { mentalMaps: true } } },
        }),
        tx.user.findUnique({
          where: { id: targetUserId },
          select: {
            firstName: true,
            gender: true,
            role: true,
            accountStatus: true,
            _count: { select: { mentalMaps: true } },
          },
        }),
      ]);
      if (!viewer || viewer.accountStatus === 'suspendu') {
        return { success: false, message: "Votre compte ne permet pas d'envoyer une invitation." };
      }
      if (viewer._count.mentalMaps === 0) {
        return { success: false, message: "Terminez votre Grand Entretien avant d'inviter un profil." };
      }
      if (
        !target ||
        target.role !== UserRole.USER ||
        target.accountStatus === 'suspendu' ||
        target._count.mentalMaps === 0 ||
        target.gender === viewer.gender
      ) {
        return { success: false, message: "Ce profil n'est plus disponible." };
      }
      const already = await tx.matchProposal.findFirst({
        where: {
          OR: [
            { sourceUserId: userId, targetUserId },
            { sourceUserId: targetUserId, targetUserId: userId },
          ],
        },
        select: { id: true },
      });
      if (already) {
        return { success: false, message: 'Vous avez déjà été mis en relation avec ce profil.' };
      }
      if (await tx.matchProposal.findFirst({ where: blocksOwnInvites(userId, now), select: { id: true } })) {
        return {
          success: false,
          message: 'Vous avez déjà une invitation en attente ou un parcours en cours.',
        };
      }
      if (await tx.matchProposal.findFirst({ where: makesUnavailable(targetUserId, now), select: { id: true } })) {
        return { success: false, message: "Ce profil n'est plus disponible." };
      }

      const debited = await tx.user.updateMany({
        where: { id: userId, creditBalance: { gte: CONNECT_COST } },
        data: { creditBalance: { decrement: CONNECT_COST } },
      });
      if (debited.count !== 1) {
        return {
          success: false,
          code: 'NO_CREDIT',
          message: 'Il vous faut 1 crédit pour envoyer une invitation.',
        };
      }

      const match = await tx.matchProposal.create({
        data: {
          sourceUserId: userId,
          targetUserId,
          compatibilityScore: compat.score,
          iaExplanation: compat.summary,
          expiresAt: new Date(now.getTime() + PROPOSAL_TTL_MS),
          status: 'en_attente',
          weekNumber: 1,
        },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'consommation',
          creditAmount: -CONNECT_COST,
          paymentRef: connectRef(match.id),
          description: `Invitation envoyée à ${target.firstName}`,
        },
      });
      return { success: true, match, message: 'Invitation envoyée' };
    });

    if (outcome.success) {
      await this.notify(
        targetUserId,
        'nouveau_match',
        'Nouveau profil compatible ! 💍',
        "Quelqu'un s'intéresse à votre profil. Découvrez sa compatibilité !",
      );
    }
    return outcome;
  }

  /** La personne invitée décline : l'invitation se ferme, l'auteur récupère son crédit. */
  async declineMatch(proposalId: string, userId: string) {
    const proposal = await this.findProposal(proposalId);
    if (!proposal || proposal.targetUserId !== userId) {
      return { success: false, message: 'Proposition non trouvée' };
    }
    const closed = await this.closeProposal(proposal.id, 'refusee', 'Invitation déclinée');
    if (!closed) return { success: false, message: "Cette invitation n'est plus valide." };
    if (closed.refunded) {
      await this.notify(
        proposal.sourceUserId,
        'credit',
        'Invitation sans suite',
        "Votre invitation n'a pas abouti. Votre crédit vous a été rendu : de nouveaux profils vous attendent.",
      );
    }
    return { success: true, message: 'Invitation déclinée' };
  }

  /** L'auteur retire son invitation tant qu'elle n'est pas acceptée : crédit rendu. */
  async cancelMatch(proposalId: string, userId: string) {
    const proposal = await this.findProposal(proposalId);
    if (!proposal || proposal.sourceUserId !== userId) {
      return { success: false, message: 'Proposition non trouvée' };
    }
    const closed = await this.closeProposal(proposal.id, 'refusee', 'Invitation retirée par son auteur');
    if (!closed) return { success: false, message: "Cette invitation n'est plus valide." };
    return { success: true, refunded: closed.refunded, message: 'Invitation retirée' };
  }

  private async findProposal(proposalId: string) {
    if (typeof proposalId !== 'string' || !proposalId) return null;
    return this.prisma.matchProposal.findUnique({ where: { id: proposalId } });
  }

  /** Verrous par membre (ordre fixe) : deux invitations simultanées ne contournent pas la règle d'or. */
  private async lockMembers(tx: Prisma.TransactionClient, userIds: string[]) {
    for (const id of [...new Set(userIds)].sort()) {
      await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${'member:' + id}))) AS lock`;
    }
  }

  /** Ferme une invitation en attente et rend son crédit à l'auteur (une seule fois). */
  private async closeProposal(
    proposalId: string,
    status: 'refusee' | 'expiree',
    note: string,
  ): Promise<{ refunded: boolean } | null> {
    return this.prisma.$transaction(async (tx) => {
      const moved = await tx.matchProposal.updateMany({
        where: { id: proposalId, status: 'en_attente' },
        data: { status, iaExplanation: note },
      });
      if (moved.count !== 1) return null;
      const proposal = await tx.matchProposal.findUniqueOrThrow({ where: { id: proposalId } });
      return { refunded: await this.refundInviter(tx, proposal) };
    });
  }

  private async refundInviter(tx: Prisma.TransactionClient, proposal: MatchProposal): Promise<boolean> {
    const ref = refundRef(proposal.id);
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${ref}))) AS lock`;
    if (await tx.creditTransaction.findFirst({ where: { paymentRef: ref }, select: { id: true } })) {
      return false;
    }
    const spent =
      (await tx.creditTransaction.findFirst({
        where: { paymentRef: connectRef(proposal.id), type: 'consommation' },
      })) ?? (await this.legacyConnectSpend(tx, proposal));
    if (!spent) return false;

    const amount = Math.abs(spent.creditAmount);
    await tx.user.update({
      where: { id: proposal.sourceUserId },
      data: { creditBalance: { increment: amount } },
    });
    await tx.creditTransaction.create({
      data: {
        userId: proposal.sourceUserId,
        type: 'remboursement_justice',
        creditAmount: amount,
        paymentRef: ref,
        description: 'Crédit rendu : invitation restée sans suite',
      },
    });
    return true;
  }

  /**
   * Invitations envoyées avant le débit côté serveur : l'app débitait elle-même
   * « Connexion avec … » juste après l'envoi.
   */
  private legacyConnectSpend(tx: Prisma.TransactionClient, proposal: MatchProposal) {
    return tx.creditTransaction.findFirst({
      where: {
        userId: proposal.sourceUserId,
        type: 'consommation',
        journeyId: null,
        paymentRef: null,
        description: { startsWith: 'Connexion avec' },
        date: {
          gte: proposal.proposedAt,
          lte: new Date(proposal.proposedAt.getTime() + 10 * 60 * 1000),
        },
      },
    });
  }

  /** Invitations restées 7 jours sans réponse : fermées, crédit rendu à l'auteur. */
  private async expireStaleProposals() {
    const stale = await this.prisma.matchProposal.findMany({
      where: { status: 'en_attente', expiresAt: { lte: new Date() } },
      select: { id: true, sourceUserId: true },
      take: 50,
    });
    for (const p of stale) {
      const closed = await this.closeProposal(p.id, 'expiree', 'Invitation expirée sans réponse');
      if (closed?.refunded) {
        await this.notify(
          p.sourceUserId,
          'credit',
          'Invitation expirée',
          "Votre invitation est restée sans réponse pendant 7 jours. Votre crédit vous a été rendu.",
        );
      }
    }
  }

  private async notify(
    userId: string,
    type: 'nouveau_match' | 'credit',
    title: string,
    body: string,
  ) {
    try {
      await this.notificationService.sendPushNotification(userId, type, title, body);
    } catch (err) {
      console.error('⚠️ [Matching] Notification non envoyée :', (err as Error)?.message);
    }
  }

  // Récupérer les likes reçus (pending matches)
  async getReceivedLikes(userId: string) {
    await this.expireStaleProposals();
    const proposals = await this.prisma.matchProposal.findMany({
      where: {
        targetUserId: userId,
        status: 'en_attente',
        expiresAt: { gt: new Date() },
        sourceUser: { accountStatus: { not: 'suspendu' } },
      },
      include: {
        sourceUser: { 
          include: { 
            profile: true, 
            mentalMaps: { orderBy: { generatedAt: 'desc' }, take: 1 } 
          } 
        },
      },
    });

    const [viewerMap, answers] = await Promise.all([
      this.prisma.mentalMap.findFirst({ where: { userId }, orderBy: { generatedAt: 'desc' } }),
      this.answersByUser([userId, ...proposals.map((p) => p.sourceUser.id)]),
    ]);
    const viewer = { answers: answers.get(userId) ?? {}, mentalMap: viewerMap };

    return proposals.map((p) => {
      const { _score, id, firstName, ...view } = buildMatchView(viewer, {
        id: p.sourceUser.id,
        firstName: p.sourceUser.firstName,
        gender: p.sourceUser.gender,
        birthDate: p.sourceUser.birthDate,
        city: p.sourceUser.city,
        profile: p.sourceUser.profile,
        mentalMap: p.sourceUser.mentalMaps?.[0] ?? null,
        answers: answers.get(p.sourceUser.id) ?? {},
      });
      return {
        ...view,
        id: p.id,
        userId: id,
        name: firstName,
        firstName,
        createdAt: p.proposedAt,
      };
    });
  }

  // Accepter une invitation : 1 crédit débité, parcours créé, en une transaction.
  async acceptMatch(proposalId: string, userId: string) {
    const head = await this.findProposal(proposalId);
    if (!head) {
      return { success: false, message: 'Proposition non trouvée' };
    }
    if (head.targetUserId !== userId) {
      return { success: false, message: 'Vous ne pouvez pas accepter cette proposition' };
    }
    await this.expireStaleProposals();

    const outcome = await this.prisma.$transaction(async (tx) => {
      await this.lockMembers(tx, [head.sourceUserId, head.targetUserId]);
      const now = new Date();
      const proposal = await tx.matchProposal.findUnique({ where: { id: head.id } });
      if (!proposal || proposal.status !== 'en_attente' || proposal.expiresAt <= now) {
        return { success: false, message: "Cette invitation n'est plus valide." };
      }
      const source = await tx.user.findUnique({
        where: { id: proposal.sourceUserId },
        select: { firstName: true, accountStatus: true },
      });
      if (!source || source.accountStatus === 'suspendu') {
        return { success: false, message: "Ce profil n'est plus disponible." };
      }
      // Règle d'or : ni l'un ni l'autre ne vit déjà un autre parcours.
      const busy = await tx.matchProposal.findFirst({
        where: {
          id: { not: proposal.id },
          OR: [inLiveJourney(proposal.sourceUserId), inLiveJourney(proposal.targetUserId)],
        },
        select: { id: true },
      });
      if (busy) {
        return { success: false, message: "Un parcours est déjà en cours pour l'un de vous deux." };
      }

      const debited = await tx.user.updateMany({
        where: { id: userId, creditBalance: { gte: CONNECT_COST } },
        data: { creditBalance: { decrement: CONNECT_COST } },
      });
      if (debited.count !== 1) {
        return {
          success: false,
          code: 'NO_CREDIT',
          message: 'Il vous faut 1 crédit pour accepter cette invitation.',
        };
      }

      const match = await tx.matchProposal.update({
        where: { id: proposal.id },
        data: { status: 'acceptee', iaExplanation: 'Match mutuel accepté' },
      });
      const journey = await tx.journey.create({
        data: {
          proposalId: match.id,
          userAId: match.sourceUserId,
          userBId: match.targetUserId,
          currentStep: 'phase_harmonie',
        },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'consommation',
          creditAmount: -CONNECT_COST,
          journeyId: journey.id,
          paymentRef: acceptRef(match.id),
          description: `Parcours Harmonie avec ${source.firstName}`,
        },
      });
      // RÈGLE DE JUSTICE : le crédit de l'auteur suit le parcours (remboursable).
      const linked = await tx.creditTransaction.updateMany({
        where: { paymentRef: connectRef(match.id), type: 'consommation' },
        data: { journeyId: journey.id },
      });
      if (linked.count === 0) {
        const legacy = await this.legacyConnectSpend(tx, proposal);
        if (legacy) {
          await tx.creditTransaction.update({
            where: { id: legacy.id },
            data: { journeyId: journey.id },
          });
        }
      }
      return { success: true, match, journey, message: 'Match accepté avec succès' };
    });

    if (!outcome.success || !('match' in outcome) || !outcome.match) return outcome;
    const match = outcome.match;

    // Les autres invitations en attente des deux membres se ferment (crédit rendu).
    const others = await this.prisma.matchProposal.findMany({
      where: {
        status: 'en_attente',
        id: { not: match.id },
        OR: [
          { sourceUserId: { in: [match.sourceUserId, match.targetUserId] } },
          { targetUserId: { in: [match.sourceUserId, match.targetUserId] } },
        ],
      },
      select: { id: true, sourceUserId: true },
    });
    for (const other of others) {
      const closed = await this.closeProposal(other.id, 'expiree', 'Le membre a commencé un autre parcours');
      if (closed?.refunded) {
        await this.notify(
          other.sourceUserId,
          'credit',
          'Invitation sans suite',
          "Ce profil vient de commencer un autre parcours. Votre crédit vous a été rendu.",
        );
      }
    }

    // Questions créées au premier GET /journey/:id/questions (évite doublons si 2 appels simultanés)
    const [userA, userB] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: match.sourceUserId }, select: { firstName: true } }),
      this.prisma.user.findUnique({ where: { id: match.targetUserId }, select: { firstName: true } }),
    ]);
    await Promise.all([
      this.notify(
        match.sourceUserId,
        'nouveau_match',
        'Match mutuel ! 💍',
        `Félicitations ! ${userB?.firstName || 'Votre partenaire'} a accepté votre invitation. Votre parcours commence !`,
      ),
      this.notify(
        match.targetUserId,
        'nouveau_match',
        'Match mutuel ! 💍',
        `Félicitations ! Votre Parcours Harmonie avec ${userA?.firstName || 'votre partenaire'} a commencé.`,
      ),
    ]);

    return outcome;
  }
}
