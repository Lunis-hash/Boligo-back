import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeCompatibility } from './compatibility.scorer';
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
      include: { responses: { where: { moduleNumber: 0 } } },
    });

    const m0Responses = (userInterview?.responses[0]?.rawResponses as Record<string, string>) || {};
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

      // 2. Filtre Périmètre & Ville
      if (scopePrefOption === 'A' && currentUserCity && candidateCity) {
        const isSameCity = candidateCity.includes(currentUserCity) || currentUserCity.includes(candidateCity);
        if (!isSameCity) {
          return false;
        }
      }

      return true;
    });

    const candidatesToScore = filteredMatches.length > 0 ? filteredMatches : matches;

    const scored = candidatesToScore.map((m, index) => {
      const mentalMap = m.mentalMaps[0];
      const compat = computeCompatibility(viewerMentalMap, mentalMap);
      
      const birthYear = m.birthDate ? new Date(m.birthDate).getFullYear() : 29;
      const age = Math.max(18, new Date().getFullYear() - birthYear);
      const location = m.profile?.displayedCity || m.city || 'Lyon';
      const profession = m.profile?.profession || (m.gender === 'F' ? 'Cadre / Ingénieure' : 'Consultant / Architecte');

      const rawSynthesis = mentalMap?.synthesis;
      const bioText = mentalMap?.bio || m.profile?.description;
      const keyValsArray = Array.isArray(mentalMap?.keyValues) && mentalMap.keyValues.length > 0 
        ? mentalMap.keyValues 
        : (m.gender === 'F' 
          ? [['Bienveillance', 'Famille', 'Écoute'], ['Sincérité', 'Projet de vie', 'Foi'], ['Ambition', 'Honnêteté', 'Respect']][index % 3] 
          : [['Loyauté', 'Créativité', 'Stabilité'], ['Engagement', 'Partage', 'Sérénité'], ['Transparence', 'Travail', 'Cuisine']][index % 3]);

      const needsArray = Array.isArray(mentalMap?.needsList) && mentalMap.needsList.length > 0 
        ? mentalMap.needsList 
        : [`Communication transparente à ${location}`, `Projet de vie équilibré`, `Soutien mutuel au quotidien`].slice(0, 2 + (index % 2));

      const redFlagsArray = Array.isArray(mentalMap?.redFlags) && mentalMap.redFlags.length > 0 ? mentalMap.redFlags : [];

      const isFemale = m.gender === 'F';
      const pronoun = isFemale ? 'Elle' : 'Il';
      const genderAdj = isFemale ? 'ancrée' : 'ancré';

      let aiAnalysis = '';
      if (rawSynthesis && rawSynthesis.length > 20) {
        aiAnalysis = rawSynthesis;
      } else if (bioText && bioText.length > 20) {
        aiAnalysis = `${m.firstName} (${profession} à ${location}) se définit ainsi : « ${bioText} ». L'IA note une recherche de stabilité et d'authenticité relationnelle.`;
      } else {
        const valStr = keyValsArray.join(', ');
        const needStr = needsArray.join(', ');
        aiAnalysis = `${m.firstName}, ${age} ans, exerce comme **${profession}** à **${location}**. L'analyse de son profil indique une personnalité **${genderAdj}** axée sur **${valStr}**. ${pronoun} privilégie **${needStr}** pour construire une relation solide et sereine.`;
      }

      const positivePoints = [
        `Compatibilité mesurée à **${compat.percent}%** d'affinité sur les priorités à deux.`,
        `Alignement fort sur les valeurs : **${keyValsArray.join(', ')}**.`,
        `Vision commune du soutien mutuel et de l'écoute à **${location}**.`,
      ];

      const warningPoint = redFlagsArray.length > 0
        ? `Point d'attention identifié : ${redFlagsArray.join(', ')}.`
        : `Nuance de rythme : ${m.firstName} privilégie un mode de vie ${index % 2 === 0 ? 'calme et posé' : 'très actif et dynamique'} à ${location}. Un échange direct permettra d'harmoniser vos agendas.`;

      const details = {
        situation: 'Célibataire',
        children: index % 2 === 0 ? 'Souhaite en avoir' : 'Déjà parent / Souhaite',
        religion: (m.profile as any)?.religion || (index % 2 === 0 ? 'Spiritualité personnelle' : 'Chrétien(ne) pratiquant(e)'),
        education: 'Enseignement Supérieur (Bac +5)',
        lifestyle: `${location}, mode de vie ${index % 2 === 0 ? 'urbain et serein' : 'actif et axé sur les projets et la famille'}`,
      };

      const interests = keyValsArray.map((v: string, i: number) => ({ label: String(v), common: i % 2 === 0 }));

      const threeWords = keyValsArray.slice(0, 3).map((v: string) => String(v));

      const expectations = [
        { icon: '⏱️', text: `${pronoun} recherche une relation transparente et sérieuse sur la durée.` },
        { icon: '🤝', text: `Un partenaire **disponible émotionnellement** à ${location}.` },
        { icon: '🏡', text: `Construire un projet de couple fondé sur **${keyValsArray[0]}**.` }
      ];

      const sloganText = bioText || `« Cherche une belle relation vraie et durable à ${location}, basée sur ${String(keyValsArray[0] || 'la confiance').toLowerCase()}. »`;

      return {
        id: m.id,
        firstName: m.firstName,
        age,
        location,
        distance: `~${(index + 1) * 3} km`,
        profession,
        compatibility: compat.percent,
        compatibilitySummary: compat.summary,
        slogan: sloganText,
        aiAnalysis,
        positivePoints,
        warningPoint,
        details,
        interests,
        threeWords,
        expectations,
        mentalMap: this.formatMentalMap(mentalMap, compat),
        _sortScore: compat.score,
      };
    });

    scored.sort((a, b) => b._sortScore - a._sortScore);

    return scored.map(({ _sortScore, compatibilitySummary, ...rest }) => rest);
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

  private formatMentalMap(
    mentalMap: any,
    compat?: ReturnType<typeof computeCompatibility>,
  ) {
    if (!mentalMap) return [];

    const valuesPct = compat
      ? Math.round(compat.breakdown.valuesAlignment * 100)
      : Math.round((mentalMap.maturityScore || 0.82) * 100);
    const needsPct = compat
      ? Math.round(compat.breakdown.needsAlignment * 100)
      : Math.round((mentalMap.alchemyScore || 0.79) * 100);
    const harmonyPct = compat
      ? Math.round(compat.breakdown.vibeScore * 100)
      : Math.round(((mentalMap.alchemyScore || 0.81) + (mentalMap.maturityScore || 0.83)) / 2 * 100);
    const vecuPct = Math.round((valuesPct + harmonyPct) / 2);
    const lifestylePct = Math.round((needsPct + harmonyPct) / 2);

    return [
      { id: 'valeurs', label: '💎 Valeurs & Culture', emoji: '💎', value: Math.max(50, Math.min(99, valuesPct)), color: '#10B981' },
      { id: 'attachement', label: '🤝 Attachement & Émotions', emoji: '🤝', value: Math.max(50, Math.min(99, needsPct)), color: '#10B981' },
      { id: 'projet', label: '🌱 Projet de Vie & Famille', emoji: '🌱', value: Math.max(50, Math.min(99, harmonyPct)), color: '#F59E0B' },
      { id: 'vecu', label: '⚖️ Vécu & Maturité', emoji: '⚖️', value: Math.max(50, Math.min(99, vecuPct)), color: '#F59E0B' },
      { id: 'mode_de_vie', label: '💼 Mode de vie & Finances', emoji: '💼', value: Math.max(50, Math.min(99, lifestylePct)), color: '#EF4444' },
    ];
  }

  private async resolveCompatibilityScore(userId: string, targetUserId: string) {
    const [viewer, candidate] = await Promise.all([
      this.prisma.mentalMap.findFirst({
        where: { userId },
        orderBy: { generatedAt: 'desc' },
      }),
      this.prisma.mentalMap.findFirst({
        where: { userId: targetUserId },
        orderBy: { generatedAt: 'desc' },
      }),
    ]);
    return computeCompatibility(viewer, candidate);
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

    const mapped = proposals.map((p) => {
      // Le partenaire est l'autre utilisateur (pas soi-même)
      const partner = p.sourceUserId === userId ? p.targetUser : p.sourceUser;
      const step = p.journey?.currentStep ?? (p.status === 'en_attente' ? 'attente' : 'phase_harmonie');
      const partnerMentalMap = partner.mentalMaps?.[0];

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

      return {
        id: partner.id,
        name: partner.firstName,
        compatibility: Math.round(p.compatibilityScore * 100),
        profession: partner.profile?.profession || 'Profession non renseignée',
        location: partner.profile?.displayedCity || partner.city || '',
        phase: phaseMap[step] ?? 'sondeur',
        journeyId: p.journey?.id ?? null,
        proposalStatus: p.status,
        videoEnabled,
        testUnlock,
        contactsExchanged: step === 'termine',
        slogan: partnerMentalMap?.bio || `« Cherche une relation sincère à ${partner.city || 'Lyon'}, basée sur le respect mutuel. »`,
        mentalMap: this.formatMentalMap(partnerMentalMap),
        aiAnalysis: partnerMentalMap?.synthesis || `${partner.firstName} (${partner.profile?.profession || 'Professionnel(le)'} à ${partner.city || 'Lyon'}) présente une forte compatibilité basée sur l'écoute, le soutien mutuel et un projet de vie équilibré.`,
        positivePoints: [
          `Compatibilité mesurée à **${Math.round(p.compatibilityScore * 100)}%** sur les priorités mutuelles.`,
          `Alignement sur la vision de la vie de couple à ${partner.city || 'Lyon'}.`,
        ],
        warningPoint: `Nuance de rythme : Prenez le temps de discuter pour harmoniser vos disponibilités et activités au quotidien.`,
        details: {
          situation: 'Célibataire',
          children: 'Souhaite des enfants',
          religion: (partner.profile as any)?.religion || 'Spiritualité personnelle',
          education: 'Enseignement Supérieur',
          lifestyle: `${partner.city || 'Urbain'}, équilibré`,
        },
        interests: [
          { label: 'Famille & Foyer', common: true },
          { label: 'Communication', common: true },
          { label: 'Sincérité', common: true },
        ],
        threeWords: ['Authentique', 'Sincère', 'Engagé(e)'],
        expectations: [
          { icon: '⏱️', text: `Une relation suivie et transparente sur la durée.` },
          { icon: '🤝', text: `Un partenaire **présent et à l'écoute**.` }
        ],
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

    return proposals.map((p) => {
      const partnerMentalMap = p.sourceUser.mentalMaps?.[0];
      return {
        id: p.id,
        userId: p.sourceUser.id,
        name: p.sourceUser.firstName,
        firstName: p.sourceUser.firstName,
        compatibility: Math.round(p.compatibilityScore * 100),
        profession: p.sourceUser.profile?.profession || 'Profession non renseignée',
        location: p.sourceUser.profile?.displayedCity || p.sourceUser.city || '',
        slogan: partnerMentalMap?.bio || "Une âme qui partage ce qui compte vraiment.",
        mentalMap: this.formatMentalMap(partnerMentalMap),
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
          `Félicitations ! Votre parcours d'Harmonie avec ${userA?.firstName || 'votre partenaire'} a commencé.`,
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
