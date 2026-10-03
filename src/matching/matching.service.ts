import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { collectRawAnswers, RawAnswers } from './divergence.engine';
import { buildMatchView, resolveScore } from './match-view';
import { NotificationService } from '../notifications/notification.service';

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

    const viewerMentalMap = currentUser.mentalMaps[0] ?? null;

    // 1.5 RÈGLE D'OR BOLIGO : Pas de multi-match. 
    // Si l'utilisateur a déjà un match actif OU une invitation envoyée en attente,
    // on ne lui propose plus rien dans Découverte.
    const activeMatch = await this.prisma.matchProposal.findFirst({
      where: {
        OR: [
          { sourceUserId: userId, status: 'en_attente' },
          { sourceUserId: userId, status: 'acceptee' },
          { targetUserId: userId, status: 'acceptee' },
        ],
      },
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
          { status: { in: ['en_attente', 'acceptee'] } }, // En parcours ou invitation active dans tout le système !
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
        mentalMaps: { some: {} },
      },
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

    return scored.map(({ _sortScore, ...rest }) => rest);
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

    const proposals = await this.prisma.matchProposal.findMany({
      where: {
        OR: [
          { status: 'acceptee', OR: [{ sourceUserId: userId }, { targetUserId: userId }] }, // Match mutuel
          { status: 'en_attente', sourceUserId: userId }, // Like envoyé (en attente)
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
        proposalStatus: p.status,
        videoEnabled,
        testUnlock,
        contactsExchanged: step === 'termine',
      };
    });

    // Parcours actif (accepté + journey) avant une simple invitation en attente
    mapped.sort((a, b) => {
      const rank = (m: (typeof mapped)[0]) => {
        if (m.journeyId && m.phase !== 'attente') return 3;
        if (m.phase === 'sondeur') return 2;
        if (m.phase === 'attente') return 0;
        return 1;
      };
      return rank(b) - rank(a);
    });

    return mapped;
  }

  // Créer un like (proposition de match)
  async createMatch(userId: string, targetUserId: string) {
    // Vérifier si un match existe déjà (dans les deux sens)
    const existingMatch = await this.prisma.matchProposal.findFirst({
      where: {
        OR: [
          { AND: [{ sourceUserId: userId }, { targetUserId: targetUserId }] },
          { AND: [{ sourceUserId: targetUserId }, { targetUserId: userId }] },
        ],
      },
    });

    if (existingMatch) {
      // Si l'autre utilisateur a déjà liké, accepter le match et créer le journey
      if (existingMatch.sourceUserId === targetUserId && existingMatch.targetUserId === userId && existingMatch.status === 'en_attente') {
        return this.acceptMatch(existingMatch.id, userId);
      }
      return { success: false, message: 'Match déjà existant' };
    }

    const compat = await this.resolveCompatibilityScore(userId, targetUserId);

    const match = await this.prisma.matchProposal.create({
      data: {
        sourceUserId: userId,
        targetUserId: targetUserId,
        compatibilityScore: compat.score,
        iaExplanation: compat.summary,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'en_attente',
        weekNumber: 1,
      },
    });

    // Envoyer une notification push au destinataire du like
    try {
      await this.notificationService.sendPushNotification(
        targetUserId,
        'nouveau_match',
        'Nouveau profil compatible ! 💍',
        "Quelqu'un s'intéresse à votre profil. Découvrez sa compatibilité !",
      );
    } catch (err) {
      console.error('⚠️ [Matching Service] Failed to send push notification for like:', err);
    }

    return {
      success: true,
      match,
      message: 'Like envoyé avec succès',
    };
  }

  // Récupérer les likes reçus (pending matches)
  async getReceivedLikes(userId: string) {
    const proposals = await this.prisma.matchProposal.findMany({
      where: {
        targetUserId: userId,
        status: 'en_attente',
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

  // Accepter un like (créer le match et le journey)
  async acceptMatch(proposalId: string, userId: string) {
    const proposal = await this.prisma.matchProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return { success: false, message: 'Proposition non trouvée' };
    }

    if (proposal.targetUserId !== userId) {
      return { success: false, message: 'Vous ne pouvez pas accepter cette proposition' };
    }

    if (proposal.status !== 'en_attente') {
      return { success: false, message: 'Cette proposition a déjà été traitée' };
    }

    // Mettre à jour le statut du match
    const match = await this.prisma.matchProposal.update({
      where: { id: proposalId },
      data: {
        status: 'acceptee',
        iaExplanation: 'Match mutuel accepté',
      },
    });

    // Créer le Journey (Parcours Harmonie)
    const journey = await this.prisma.journey.create({
      data: {
        proposalId: match.id,
        userAId: match.sourceUserId,
        userBId: match.targetUserId,
        currentStep: 'phase_harmonie',
      },
    });

    // RÈGLE DE JUSTICE : Lier les transactions de consommation de crédits récentes au journey
    try {
      await this.prisma.creditTransaction.updateMany({
        where: {
          userId: { in: [match.sourceUserId, match.targetUserId] },
          type: 'consommation',
          journeyId: null,
          date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // dernières 24 heures
        },
        data: {
          journeyId: journey.id,
        },
      });
      console.log(`🔗 [Match] Crédits récents liés au journey ${journey.id}`);
    } catch (err) {
      console.error(`⚠️ [Match] Échec de la liaison des crédits au journey ${journey.id}`, err);
    }

    // Questions créées au premier GET /journey/:id/questions (évite doublons si 2 appels simultanés)

    // Envoyer des notifications push pour le match mutuel
    try {
      const [userA, userB] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: match.sourceUserId }, select: { firstName: true } }),
        this.prisma.user.findUnique({ where: { id: match.targetUserId }, select: { firstName: true } }),
      ]);

      await Promise.all([
        this.notificationService.sendPushNotification(
          match.sourceUserId,
          'nouveau_match',
          'Match mutuel ! 💍',
          `Félicitations ! ${userB?.firstName || 'Votre partenaire'} a accepté votre invitation. Votre parcours commence !`,
        ),
        this.notificationService.sendPushNotification(
          match.targetUserId,
          'nouveau_match',
          'Match mutuel ! 💍',
          `Félicitations ! Votre Parcours Harmonie avec ${userA?.firstName || 'votre partenaire'} a commencé.`,
        ),
      ]);
    } catch (err) {
      console.error('⚠️ [Matching Service] Failed to send push notifications for mutual match:', err);
    }

    return {
      success: true,
      match,
      journey,
      message: 'Match accepté avec succès',
    };
  }
}
