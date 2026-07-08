import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, ReportStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

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

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
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
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async updateUser(id: string, dto: UpdateUserAdminDto) {
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

  async updateReport(id: string, status: ReportStatus) {
    return this.prisma.report.update({
      where: { id },
      data: { status },
    });
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
      note:
        'Les montants € proviennent des champs euroAmount renseignés à l\'achat. Stripe/CinetPay à brancher pour les paiements réels.',
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
        t.userId,
        escapeCsv(t.user.email),
        escapeCsv(`${t.user.firstName} ${t.user.lastName}`)
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }
}
