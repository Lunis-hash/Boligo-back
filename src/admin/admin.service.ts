import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, ReportStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { NotificationService } from '../notifications/notification.service';
import { isStaff } from './guards/admin-roles';
import { AccountDeletionService } from '../account/account-deletion.service';
import { checkDiscount, normalizePromoCode } from './promo-rules';
import { revenueByCode } from '../partners/partner-sales';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/promo-code.dto';
import { CreditService } from '../credit/credit.service';
import {
  CATEGORY_LABEL,
  holdsCategories,
  refusalHolds,
  parseSondeurReport,
  supportMessages,
} from '../journey/journey-insights.service';

const userListSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  city: true,
  gender: true,
  role: true,
  accountStatus: true,
  creditBalance: true,
  isVerified: true,
  createdAt: true,
  lastLogin: true,
  profile: {
    select: { profileStatus: true, mainPhoto: true, profession: true },
  },
  _count: {
    select: {
      receivedProposals: true,
      targetedProposals: true,
      journeysA: true,
      journeysB: true,
      sentReports: true,
      receivedReports: true,
    },
  },
} satisfies Prisma.UserSelect;

/** Rappel affiché sur la page Finances : d'où viennent les montants et si Stripe débite réellement. */
export function financeNote(stripeSecretKey?: string): string {
  const source =
    'Les montants en euros sont ceux enregistrés à chaque achat (0 € pour un code promo gratuit).';
  if (!stripeSecretKey) return `${source} Stripe n'est pas configuré : aucun paiement possible.`;
  return stripeSecretKey.startsWith('sk_live_')
    ? `${source} Stripe est en mode réel.`
    : `${source} Stripe est en mode test : aucune carte n'est débitée.`;
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationService: NotificationService,
    private accountDeletion: AccountDeletionService,
    private credits: CreditService,
  ) {}

  /**
   * Suppression définitive d'un membre par un administrateur, comme si le
   * membre l'avait demandée : profil, entretien, parcours et messages effacés,
   * paiements gardés anonymisés. Un compte d'équipe perd d'abord son accès.
   */
  async deleteUser(actorId: string, id: string, confirmEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (user.id === actorId) {
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte depuis le tableau de bord.',
      );
    }
    if (user.role !== UserRole.USER) {
      throw new BadRequestException(
        'Ce compte fait partie de l’équipe : retirez d’abord son accès (page Équipe).',
      );
    }
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException(
        'L’adresse saisie ne correspond pas à ce compte.',
      );
    }
    await this.accountDeletion.deleteUser(id);
    console.log(`[ADMIN] Compte ${id} supprimé par l'administrateur ${actorId}.`);
    return { deleted: true };
  }

  /** Au démarrage : premier administrateur désigné par ADMIN_BOOTSTRAP_EMAIL. */
  async onModuleInit() {
    try {
      await this.ensureBootstrapAdmin();
    } catch (err) {
      console.warn(
        '[ADMIN] Vérification de l’administrateur initial impossible :',
        (err as Error).message,
      );
    }
  }

  /**
   * Tant qu'aucun administrateur n'existe, le compte BOLIGO vérifié dont
   * l'adresse est ADMIN_BOOTSTRAP_EMAIL devient administrateur. Une fois un
   * administrateur en place, cette variable n'a plus aucun effet : les accès
   * se gèrent depuis la page Équipe du tableau de bord.
   */
  async ensureBootstrapAdmin(): Promise<boolean> {
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    if (!email) return false;
    const adminCount = await this.prisma.user.count({
      where: { role: UserRole.ADMIN },
    });
    if (adminCount > 0) return false;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isVerified || user.accountStatus === 'suspendu') {
      console.log(
        '[ADMIN] Administrateur initial : le compte désigné doit d’abord être créé et vérifié dans l’application.',
      );
      return false;
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { role: UserRole.ADMIN },
    });
    console.log(
      '[ADMIN] Administrateur initial attribué au compte désigné (ADMIN_BOOTSTRAP_EMAIL).',
    );
    return true;
  }

  async login(dto: AdminLoginDto) {
    const email = dto.email.trim().toLowerCase();
    if (email === process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase()) {
      await this.ensureBootstrapAdmin();
    }
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user || !isStaff(user.role) || user.accountStatus === 'suspendu') {
      throw new UnauthorizedException('Identifiants invalides');
    }
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash || '');
    if (!isMatch) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: '8h',
      secret: process.env.JWT_SECRET,
    });
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async getStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersWeek,
      newUsersDay,
      interviewsDone,
      interviewsInProgress,
      proposalsTotal,
      proposalsPending,
      proposalsAccepted,
      journeysTotal,
      journeysInProgress,
      journeysSuccess,
      reportsPending,
      messagesBlocked,
      messagesTotal,
      creditsSum,
      videoSessionsDone,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.USER } }),
      this.prisma.user.count({
        where: { role: UserRole.USER, accountStatus: 'actif' },
      }),
      this.prisma.user.count({
        where: { role: UserRole.USER, accountStatus: 'suspendu' },
      }),
      this.prisma.user.count({
        where: { role: UserRole.USER, createdAt: { gte: weekAgo } },
      }),
      this.prisma.user.count({
        where: { role: UserRole.USER, createdAt: { gte: dayAgo } },
      }),
      this.prisma.interviewIA.count({ where: { status: 'termine' } }),
      this.prisma.interviewIA.count({ where: { status: 'en_cours' } }),
      this.prisma.matchProposal.count(),
      this.prisma.matchProposal.count({ where: { status: 'en_attente' } }),
      this.prisma.matchProposal.count({ where: { status: 'acceptee' } }),
      this.prisma.journey.count(),
      this.prisma.journey.count({ where: { result: 'en_cours' } }),
      this.prisma.journey.count({ where: { result: 'reussi' } }),
      this.prisma.report.count({ where: { status: ReportStatus.en_attente } }),
      this.prisma.message.count({ where: { moderationStatus: 'bloque' } }),
      this.prisma.message.count(),
      this.prisma.user.aggregate({
        where: { role: UserRole.USER },
        _sum: { creditBalance: true },
      }),
      this.prisma.videoSession.count({ where: { status: 'terminee' } }),
    ]);

    const journeysByStep = await this.prisma.journey.groupBy({
      by: ['currentStep'],
      _count: { id: true },
      where: { result: 'en_cours' },
    });

    const usersByStatus = await this.prisma.user.groupBy({
      by: ['accountStatus'],
      _count: { id: true },
      where: { role: UserRole.USER },
    });

    // Promo codes stats
    const [promoCodesTotal, promoCodesActive, promoUsagesTotal] = await Promise.all([
      this.prisma.promoCode.count(),
      this.prisma.promoCode.count({ where: { isActive: true } }),
      this.prisma.promoUsage.count(),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        newThisWeek: newUsersWeek,
        newToday: newUsersDay,
        byStatus: usersByStatus,
      },
      interviews: { completed: interviewsDone, inProgress: interviewsInProgress },
      matching: {
        proposalsTotal,
        pending: proposalsPending,
        accepted: proposalsAccepted,
      },
      journeys: {
        total: journeysTotal,
        inProgress: journeysInProgress,
        successful: journeysSuccess,
        byStep: journeysByStep,
      },
      moderation: {
        reportsPending,
        messagesBlocked,
        messagesTotal,
      },
      credits: { totalBalance: creditsSum._sum.creditBalance ?? 0 },
      video: { sessionsCompleted: videoSessionsDone },
      promoCodes: {
        total: promoCodesTotal,
        active: promoCodesActive,
        totalUsages: promoUsagesTotal,
      },
    };
  }

  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { role: UserRole.USER };
    if (params.status) {
      where.accountStatus = params.status as Prisma.EnumAccountStatusFilter['equals'];
    }
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userListSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async exportUsersCSV(): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: { role: UserRole.USER },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        city: true,
        gender: true,
        accountStatus: true,
        creditBalance: true,
        isVerified: true,
        createdAt: true,
        lastLogin: true,
      }
    });

    const header = ['ID', 'Email', 'Prenom', 'Nom', 'Ville', 'Genre', 'Statut', 'Credits', 'Certifie', 'Inscription', 'Derniere_Connexion'].join(',');
    const rows = users.map(u => {
      const escapeCsv = (str: string | null) => {
        if (!str) return '""';
        return `"${str.replace(/"/g, '""')}"`;
      };
      return [
        u.id,
        u.email,
        escapeCsv(u.firstName),
        escapeCsv(u.lastName),
        escapeCsv(u.city),
        u.gender,
        u.accountStatus,
        u.creditBalance,
        u.isVerified ? 'Oui' : 'Non',
        u.createdAt.toISOString(),
        u.lastLogin ? u.lastLogin.toISOString() : ''
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: UserRole.USER },
      include: {
        profile: true,
        mentalMaps: { orderBy: { generatedAt: 'desc' }, take: 1 },
        interviews: { orderBy: { startDate: 'desc' }, take: 3 },
        transactions: { orderBy: { date: 'desc' }, take: 20 },
        receivedProposals: {
          take: 10,
          orderBy: { proposedAt: 'desc' },
          include: {
            targetUser: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        targetedProposals: {
          take: 10,
          orderBy: { proposedAt: 'desc' },
          include: {
            sourceUser: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        journeysA: {
          take: 5,
          include: {
            userB: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        journeysB: {
          take: 5,
          include: {
            userA: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        receivedReports: {
          where: { status: ReportStatus.en_attente },
          take: 10,
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    // Aucun secret ne quitte le serveur, même vers l'administration.
    const safe: Partial<typeof user> = { ...user };
    for (const field of [
      'passwordHash',
      'hashedRefreshToken',
      'verificationCode',
      'resetCode',
      'resetCodeExpires',
      'pushToken',
    ] as const) {
      delete safe[field];
    }
    return { ...safe, hasPushToken: Boolean(user.pushToken) };
  }

  async updateUser(id: string, dto: UpdateUserAdminDto, actorRole?: UserRole) {
    // La modération suspend ou réactive un compte ; crédits et vérification
    // restent réservés à l'administrateur.
    if (
      actorRole !== UserRole.ADMIN &&
      (dto.creditBalance !== undefined || dto.isVerified !== undefined)
    ) {
      throw new ForbiddenException('Action réservée à l’administrateur');
    }
    const user = await this.prisma.user.findFirst({
      where: { id, role: UserRole.USER },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.user.update({
      where: { id },
      data: {
        accountStatus: dto.accountStatus,
        isVerified: dto.isVerified,
        creditBalance: dto.creditBalance,
      },
      select: userListSelect,
    });
  }

  async listMatches(params: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MatchProposalWhereInput = {};
    if (params.status) {
      where.status = params.status as Prisma.EnumProposalStatusFilter['equals'];
    }

    const [data, total] = await Promise.all([
      this.prisma.matchProposal.findMany({
        where,
        include: {
          sourceUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          targetUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          journey: {
            select: { id: true, currentStep: true, result: true },
          },
        },
        orderBy: { proposedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.matchProposal.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listJourneys(params: {
    page?: number;
    limit?: number;
    result?: string;
    step?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.JourneyWhereInput = {};
    if (params.result) {
      where.result = params.result as Prisma.EnumJourneyResultFilter['equals'];
    }
    if (params.step) {
      where.currentStep = params.step as Prisma.EnumJourneyStepFilter['equals'];
    }

    const [data, total] = await Promise.all([
      this.prisma.journey.findMany({
        where,
        include: {
          userA: { select: { id: true, firstName: true, lastName: true, email: true } },
          userB: { select: { id: true, firstName: true, lastName: true, email: true } },
          proposal: { select: { compatibilityScore: true, status: true } },
          videoSession: { select: { status: true, durationMinutes: true } },
          _count: { select: { messages: true, harmonyQuestions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.journey.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getJourney(id: string) {
    const journey = await this.prisma.journey.findUnique({
      where: { id },
      include: {
        userA: { select: { id: true, firstName: true, lastName: true, email: true } },
        userB: { select: { id: true, firstName: true, lastName: true, email: true } },
        proposal: true,
        harmonyQuestions: {
          include: { responses: true },
          orderBy: { day: 'asc' },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 50,
          include: {
            sender: { select: { firstName: true, lastName: true } },
          },
        },
        videoSession: true,
        contactExchange: true,
      },
    });
    if (!journey) throw new NotFoundException('Parcours introuvable');
    return journey;
  }

  async listReports(params: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ReportWhereInput = {};
    if (params.status) {
      where.status = params.status as Prisma.EnumReportStatusFilter['equals'];
    }

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          reported: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          message: { select: { id: true, content: true, sentAt: true } },
        },
        orderBy: { reportedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Décision de la modération. Pour un signal du Sondeur confirmé, l'équipe
   * peut préciser la catégorie (une réponse « en attente de classement »
   * n'en a pas encore) : elle décide de la clôture, du crédit rendu et du
   * message d'aide.
   */
  async updateReport(id: string, status: ReportStatus, category?: string) {
    let description: string | undefined;
    // Menace ou contrôle : la victime peut avoir été lue comme l'auteur.
    // L'équipe choisit la catégorie avant de confirmer (le parcours sera clos).
    if (status === 'traite' && !category) {
      const current = await this.prisma.report.findUnique({
        where: { id },
        select: { description: true },
      });
      const signal = current?.description
        ? parseSondeurReport({
            reportedId: '',
            status,
            description: current.description,
          })
        : null;
      if (
        signal &&
        !signal.refused &&
        signal.categories.some((c) => c === 'menace' || c === 'controle')
      )
        throw new BadRequestException(
          'Choisissez la catégorie avant de confirmer : menace ou contrôle exercés, ou violence subie par la personne qui écrit.',
        );
    }
    if (status === 'traite' && category) {
      if (!(category in CATEGORY_LABEL))
        throw new BadRequestException('Catégorie inconnue.');
      const current = await this.prisma.report.findUnique({
        where: { id },
        select: { description: true },
      });
      const label = CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL];
      if (
        current?.description &&
        parseSondeurReport({
          reportedId: '',
          status,
          description: current.description,
        })
      )
        description =
          current.description.replace(
            / · catégorie : [^\n]*?catégories=\[[^\]]*\]/,
            ` · catégorie : ${label} · catégories=[${category}]`,
          ) + `\nCatégorie confirmée par la modération : ${label}.`;
    }
    const report = await this.prisma.report.update({
      where: { id },
      data: { status, ...(description ? { description } : {}) },
    });
    if (status === 'traite')
      await this.closeJourneyAfterConfirmedSignal(report);
    return report;
  }

  /**
   * Signal du Sondeur confirmé par la modération (menace, contrôle, violence
   * exercée, détresse, minorité, demande d'argent…) : le parcours est clos, la
   * réponse reste cachée, et le crédit est rendu au membre mis en danger (aux
   * deux pour une détresse ou une minorité, où personne n'est en faute). Une
   * confidence de violence subie seule ne clôt rien. Les deux membres sont
   * prévenus sans que le motif soit donné.
   */
  private async closeJourneyAfterConfirmedSignal(report: {
    reportedId: string;
    status: string;
    description: string | null;
  }) {
    const signal = parseSondeurReport(report);
    // Une trace de réponse refusée (jamais montrée) ne clôt le parcours que si
    // elle évoque un danger pour l'autre (menace, contrôle…) ; une insulte ou
    // un contact sont seulement classés.
    if (
      !signal ||
      !holdsCategories(signal.categories) ||
      (signal.refused && !refusalHolds(signal.categories))
    )
      return;
    const journey = await this.prisma.journey.findUnique({
      where: { id: signal.journeyId },
      select: { userAId: true, userBId: true },
    });
    if (!journey) return;
    const closed = await this.prisma.journey.updateMany({
      where: { id: signal.journeyId, result: 'en_cours' },
      data: {
        currentStep: 'termine',
        result: 'abandonne',
        endDate: new Date(),
        closingReason:
          'Sécurité : signalement du Sondeur confirmé par la modération',
      },
    });
    if (closed.count === 0) return;
    const partnerId =
      journey.userAId === signal.authorId ? journey.userBId : journey.userAId;
    const noFault = signal.categories.every((c) =>
      ['detresse', 'mineur', 'violence_subie'].includes(c),
    );
    const refundTo = noFault ? [partnerId, signal.authorId] : [partnerId];
    // Détresse confirmée : une pause pour prendre soin de soi, pas une
    // sanction ; le message d'aide est renvoyé.
    const distress = signal.categories.includes('detresse');
    // Numéros d'aide du pays de l'auteur (« Ville, Pays »).
    const authorCity = distress
      ? await this.prisma.user
          .findUnique({
            where: { id: signal.authorId },
            select: { city: true },
          })
          .then((u) => u?.city ?? null)
          .catch(() => null)
      : null;
    for (const memberId of [journey.userAId, journey.userBId]) {
      const refunded = refundTo.includes(memberId)
        ? await this.credits.refundJourneyOnce(
            memberId,
            signal.journeyId,
            'Parcours clos par l’équipe BOLIGO : crédit rendu',
          )
        : 0;
      const author = memberId === signal.authorId;
      const text =
        distress && author
          ? `L’équipe BOLIGO a mis ce parcours en pause pour que vous puissiez prendre soin de vous.${refunded ? ' Votre crédit vous a été rendu : vous pourrez reprendre quand vous le souhaiterez.' : ''} ${supportMessages(['detresse'], authorCity).join(' ')}`
          : `L’équipe BOLIGO a mis fin à votre parcours.${refunded ? ' Votre crédit vous a été rendu.' : ''} Elle reste joignable depuis votre profil.`;
      await this.notificationService
        .sendPushNotification(
          memberId,
          'systeme',
          distress && author ? 'BOLIGO' : 'Parcours terminé',
          text,
          distress && author
            ? 'Un message de l’équipe BOLIGO vous attend dans l’application.'
            : undefined,
        )
        .catch(() => undefined);
    }
  }

  async listBlockedMessages(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = { moderationStatus: 'bloque' as const };

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, email: true } },
          journey: {
            select: {
              id: true,
              userA: { select: { firstName: true } },
              userB: { select: { firstName: true } },
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getFinanceStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const purchaseWhere = { type: 'achat' as const };
    const consumptionWhere = { type: 'consommation' as const };
    const refundWhere = { type: 'remboursement_justice' as const };

    const [
      purchasesAll,
      purchasesMonth,
      purchasesWeek,
      consumptions,
      refunds,
      creditsInCirculation,
      transactionsTotal,
      byType,
    ] = await Promise.all([
      this.prisma.creditTransaction.aggregate({
        where: purchaseWhere,
        _sum: { euroAmount: true, creditAmount: true },
        _count: true,
      }),
      this.prisma.creditTransaction.aggregate({
        where: { ...purchaseWhere, date: { gte: monthStart } },
        _sum: { euroAmount: true, creditAmount: true },
        _count: true,
      }),
      this.prisma.creditTransaction.aggregate({
        where: { ...purchaseWhere, date: { gte: weekAgo } },
        _sum: { euroAmount: true, creditAmount: true },
        _count: true,
      }),
      this.prisma.creditTransaction.aggregate({
        where: consumptionWhere,
        _sum: { creditAmount: true },
        _count: true,
      }),
      this.prisma.creditTransaction.aggregate({
        where: refundWhere,
        _sum: { creditAmount: true, euroAmount: true },
        _count: true,
      }),
      this.prisma.user.aggregate({
        where: { role: UserRole.USER },
        _sum: { creditBalance: true },
      }),
      this.prisma.creditTransaction.count(),
      this.prisma.creditTransaction.groupBy({
        by: ['type'],
        _count: { id: true },
        _sum: { euroAmount: true, creditAmount: true },
      }),
    ]);

    const revenueAll = purchasesAll._sum.euroAmount ?? 0;
    const revenueMonth = purchasesMonth._sum.euroAmount ?? 0;
    const revenueWeek = purchasesWeek._sum.euroAmount ?? 0;
    const creditsSold = purchasesAll._sum.creditAmount ?? 0;
    const creditsSpent = Math.abs(consumptions._sum.creditAmount ?? 0);
    const creditsRefunded = refunds._sum.creditAmount ?? 0;

    return {
      revenue: {
        totalEur: revenueAll,
        monthEur: revenueMonth,
        weekEur: revenueWeek,
        purchasesCount: purchasesAll._count,
        purchasesMonthCount: purchasesMonth._count,
      },
      credits: {
        sold: creditsSold,
        spent: creditsSpent,
        refunded: creditsRefunded,
        inCirculation: creditsInCirculation._sum.creditBalance ?? 0,
        consumptionsCount: consumptions._count,
        refundsCount: refunds._count,
      },
      transactionsTotal,
      byType,
      note: financeNote(process.env.STRIPE_SECRET_KEY),
    };
  }

  async listTransactions(params: {
    page?: number;
    limit?: number;
    type?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CreditTransactionWhereInput = {};
    if (params.type) {
      where.type = params.type as Prisma.EnumTransactionTypeFilter['equals'];
    }

    const [data, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              creditBalance: true,
            },
          },
          journey: {
            select: {
              id: true,
              userA: { select: { firstName: true } },
              userB: { select: { firstName: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.creditTransaction.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async exportTransactionsCSV(): Promise<string> {
    const tx = await this.prisma.creditTransaction.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    const header = ['ID', 'Date', 'Type', 'Montant_Credits', 'Montant_Euros', 'Reference_Paiement', 'Description', 'ID_Utilisateur', 'Email_Utilisateur', 'Nom_Utilisateur'].join(',');
    const rows = tx.map(t => {
      const escapeCsv = (str: string | null) => {
        if (!str) return '""';
        return `"${str.replace(/"/g, '""')}"`;
      };
      return [
        t.id,
        t.date.toISOString(),
        t.type,
        t.creditAmount,
        t.euroAmount ?? 0,
        escapeCsv(t.paymentRef),
        escapeCsv(t.description),
        t.userId ?? '',
        escapeCsv(t.user ? t.user.email : 'compte supprimé'),
        escapeCsv(t.user ? `${t.user.firstName} ${t.user.lastName}` : ''),
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GESTION DES CODES PROMO
  // ════════════════════════════════════════════════════════════════════════════

  async listPromoCodes(params: {
    page?: number;
    limit?: number;
    isActive?: string;
    q?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PromoCodeWhereInput = {};
    if (params.isActive === 'true') where.isActive = true;
    if (params.isActive === 'false') where.isActive = false;
    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.promoCode.findMany({
        where,
        include: {
          _count: { select: { usages: true } },
          partner: {
            select: { id: true, name: true, company: true, type: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.promoCode.count({ where }),
    ]);
    const sales = await revenueByCode(
      this.prisma,
      rows.map((r) => r.id),
    );
    const data = rows.map((r) => ({
      ...r,
      sales: sales.get(r.id) ?? { purchases: 0, revenue: 0 },
    }));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Hors administrateurs, les utilisations sont rendues sans l'identifiant du membre. */
  async getPromoCode(id: string, actorRole?: UserRole) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id },
      include: {
        usages: {
          include: {
            promoCode: { select: { code: true } },
          },
          orderBy: { usedAt: 'desc' },
          take: 50,
        },
        _count: { select: { usages: true } },
      },
    });
    if (!promo) throw new NotFoundException('Code promo introuvable');
    if (actorRole === UserRole.ADMIN) return promo;
    return {
      ...promo,
      usages: promo.usages.map((u) => ({
        id: u.id,
        promoCodeId: u.promoCodeId,
        usedAt: u.usedAt,
        promoCode: u.promoCode,
      })),
    };
  }

  async createPromoCode(dto: CreatePromoCodeDto) {
    const code = normalizePromoCode(dto.code);
    if (!code) {
      throw new BadRequestException(
        'Code : 3 à 30 lettres ou chiffres, sans espace ni accent.',
      );
    }
    const existing = await this.prisma.promoCode.findUnique({
      where: { code },
    });
    if (existing) throw new BadRequestException(`Le code ${code} existe déjà.`);

    const discount = checkDiscount(dto.discountType, dto.discountValue);
    if ('error' in discount) throw new BadRequestException(discount.error);

    return this.prisma.promoCode.create({
      data: {
        code,
        discountType: dto.discountType,
        discountValue: discount.value,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive !== false,
        description: dto.description?.trim() || null,
      },
    });
  }

  async updatePromoCode(id: string, dto: UpdatePromoCodeDto) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo introuvable');

    let discountValue: number | undefined;
    const type = dto.discountType ?? promo.discountType;
    if (dto.discountType !== undefined || dto.discountValue !== undefined) {
      const discount = checkDiscount(
        type,
        dto.discountValue ??
          (dto.discountType === undefined ||
          dto.discountType === promo.discountType
            ? promo.discountValue
            : undefined),
      );
      if ('error' in discount) throw new BadRequestException(discount.error);
      discountValue = discount.value;
    }

    return this.prisma.promoCode.update({
      where: { id },
      data: {
        ...(dto.discountType !== undefined ? { discountType: type } : {}),
        ...(discountValue !== undefined ? { discountValue } : {}),
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
      },
    });
  }

  async togglePromoCode(id: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo introuvable');
    return this.prisma.promoCode.update({
      where: { id },
      data: { isActive: !promo.isActive },
    });
  }

  /**
   * Supprime un code jamais utilisé. Un code déjà utilisé reste pour
   * l'historique des paiements : il est mis en pause. Le code d'un partenaire
   * se gère depuis sa fiche.
   */
  async deletePromoCode(id: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id },
      include: {
        _count: { select: { usages: true, transactions: true } },
        partner: { select: { id: true } },
      },
    });
    if (!promo) throw new NotFoundException('Code promo introuvable');
    if (promo.partner) {
      throw new BadRequestException(
        'Ce code appartient à un partenaire : mettez-le en pause plutôt que de le supprimer.',
      );
    }
    if (promo._count.usages > 0 || promo._count.transactions > 0) {
      await this.prisma.promoCode.update({
        where: { id },
        data: { isActive: false },
      });
      return { deleted: false, paused: true };
    }
    await this.prisma.promoCode.delete({ where: { id } });
    return { deleted: true, paused: false };
  }

  async getPromoStats() {
    const [total, active, expired, topCodes] = await Promise.all([
      this.prisma.promoCode.count(),
      this.prisma.promoCode.count({ where: { isActive: true } }),
      this.prisma.promoCode.count({
        where: { expiresAt: { lt: new Date() }, isActive: true },
      }),
      this.prisma.promoCode.findMany({
        orderBy: { usedCount: 'desc' },
        take: 5,
        select: { code: true, usedCount: true, discountType: true, discountValue: true, maxUses: true },
      }),
    ]);

    const totalUsages = await this.prisma.promoUsage.count();
    const freeActivations = await this.prisma.promoUsage.count({
      where: { promoCode: { discountType: 'free' } },
    });

    return {
      total,
      active,
      expired,
      totalUsages,
      freeActivations,
      topCodes,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GESTION DES SESSIONS VIDÉO
  // ════════════════════════════════════════════════════════════════════════════

  async listVideoSessions(params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.VideoSessionWhereInput = {};
    if (params.status) {
      where.status = params.status as Prisma.EnumVideoStatusFilter['equals'];
    }

    const [data, total] = await Promise.all([
      this.prisma.videoSession.findMany({
        where,
        include: {
          journey: {
            include: {
              userA: { select: { id: true, firstName: true, lastName: true, email: true } },
              userB: { select: { id: true, firstName: true, lastName: true, email: true } },
              proposal: { select: { compatibilityScore: true } },
            },
          },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.videoSession.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVideoStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, completed, inProgress, planned, thisWeek, thisMonth, avgDuration] =
      await Promise.all([
        this.prisma.videoSession.count(),
        this.prisma.videoSession.count({ where: { status: 'terminee' } }),
        this.prisma.videoSession.count({ where: { status: 'en_cours' } }),
        this.prisma.videoSession.count({ where: { status: 'planifiee' } }),
        this.prisma.videoSession.count({ where: { startDate: { gte: weekAgo } } }),
        this.prisma.videoSession.count({ where: { startDate: { gte: monthStart } } }),
        this.prisma.videoSession.aggregate({
          where: { status: 'terminee', durationMinutes: { not: null } },
          _avg: { durationMinutes: true },
          _sum: { durationMinutes: true },
        }),
      ]);

    return {
      total,
      completed,
      inProgress,
      planned,
      thisWeek,
      thisMonth,
      totalDurationMinutes: avgDuration._sum.durationMinutes ?? 0,
      avgDurationMinutes: avgDuration._avg.durationMinutes ?? 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // NOTIFICATIONS PUSH (ADMIN)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Envoyer une notification push à tous les utilisateurs actifs
   * ou à un utilisateur spécifique.
   */
  async broadcastPushNotification(dto: {
    title: string;
    content: string;
    type: 'nouveau_match' | 'message' | 'question_harmonie' | 'rappel_reponse' | 'credit' | 'systeme';
    targetUserId?: string;
  }) {
    const { title, content, type, targetUserId } = dto;

    if (targetUserId) {
      // Envoi ciblé à un utilisateur
      await this.notificationService.sendPushNotification(targetUserId, type, title, content);
      return { sent: 1, targetUserId };
    }

    // Envoi broadcast : tous les utilisateurs avec un pushToken valide
    const users = await this.prisma.user.findMany({
      where: {
        pushToken: { not: null },
        accountStatus: { not: 'suspendu' },
      },
      select: { id: true },
    });

    let sent = 0;
    for (const user of users) {
      try {
        await this.notificationService.sendPushNotification(user.id, type, title, content);
        sent++;
      } catch (e) {
        // Continuer même si un envoi échoue
      }
    }

    return { sent, total: users.length };
  }

  /**
   * Historique des notifications envoyées (paginé).
   */
  async getNotificationHistory(params: { page?: number; limit?: number; userId?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, params.limit ?? 20);
    const skip = (page - 1) * limit;

    const where = params.userId ? { userId: params.userId } : {};

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          isRead: true,
          sentAt: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    return {
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════
  // ÉQUIPE (accès au tableau de bord)
  // ═══════════════════════════════════════════════

  async listTeam() {
    return this.prisma.user.findMany({
      where: { role: { not: UserRole.USER } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLogin: true,
        accountStatus: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
  }

  /**
   * Donne, change ou retire un accès d'équipe. Le compte doit exister et être
   * vérifié (il est créé depuis l'application). On ne peut pas modifier son
   * propre accès, ni retirer le dernier administrateur.
   */
  async setTeamRole(actorId: string, emailInput: string, role: UserRole) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException(
        'Aucun compte BOLIGO avec cette adresse : la personne doit d’abord s’inscrire dans l’application.',
      );
    }
    if (!user.isVerified) {
      throw new BadRequestException(
        'Ce compte n’a pas encore confirmé son adresse e-mail.',
      );
    }
    if (user.id === actorId) {
      throw new BadRequestException(
        'Vous ne pouvez pas modifier votre propre accès.',
      );
    }
    if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      const admins = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });
      if (admins <= 1) {
        throw new BadRequestException(
          'Il doit rester au moins un administrateur.',
        );
      }
    }
    return this.prisma.user.update({
      where: { id: user.id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLogin: true,
        accountStatus: true,
      },
    });
  }
}
