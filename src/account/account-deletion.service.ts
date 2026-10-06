import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Suppression d'un compte BOLIGO (demandée par le membre ou par un
 * administrateur). Tout ce qui le concerne est effacé, sauf les paiements :
 * ils restent pour la comptabilité (10 ans), détachés de la personne. Les
 * paiements de l'autre membre d'un parcours supprimé sont conservés tels quels.
 */
@Injectable()
export class AccountDeletionService {
  constructor(private readonly prisma: PrismaService) {}

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const journeys = await this.prisma.journey.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: { id: true, proposalId: true },
    });
    const journeyIds = journeys.map((j) => j.id);
    const proposalIds = journeys.map((j) => j.proposalId);
    const interviews = await this.prisma.interviewIA.findMany({
      where: { userId },
      select: { id: true },
    });
    const interviewIds = interviews.map((i) => i.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.report.deleteMany({
        where: {
          OR: [
            { reporterId: userId },
            { reportedId: userId },
            { message: { journeyId: { in: journeyIds } } },
          ],
        },
      });
      await tx.message.deleteMany({
        where: {
          OR: [{ senderId: userId }, { journeyId: { in: journeyIds } }],
        },
      });
      await tx.harmonyResponse.deleteMany({
        where: {
          OR: [{ userId }, { question: { journeyId: { in: journeyIds } } }],
        },
      });
      await tx.harmonyQuestion.deleteMany({
        where: { journeyId: { in: journeyIds } },
      });
      await tx.videoSession.deleteMany({
        where: { journeyId: { in: journeyIds } },
      });
      await tx.contactExchange.deleteMany({
        where: { journeyId: { in: journeyIds } },
      });
      await tx.alumniCouple.deleteMany({
        where: { journeyId: { in: journeyIds } },
      });

      // Paiements : jamais supprimés. Ceux du membre sont anonymisés ; ceux de
      // l'autre membre perdent seulement le lien vers le parcours effacé.
      await tx.creditTransaction.updateMany({
        where: { userId },
        data: { userId: null, journeyId: null },
      });
      await tx.creditTransaction.updateMany({
        where: { journeyId: { in: journeyIds } },
        data: { journeyId: null },
      });

      await tx.journey.deleteMany({ where: { id: { in: journeyIds } } });
      await tx.matchProposal.deleteMany({
        where: {
          OR: [
            { sourceUserId: userId },
            { targetUserId: userId },
            { id: { in: proposalIds } },
          ],
        },
      });
      await tx.moduleResponse.deleteMany({
        where: { interviewId: { in: interviewIds } },
      });
      await tx.mentalMap.deleteMany({
        where: { OR: [{ userId }, { interviewId: { in: interviewIds } }] },
      });
      await tx.interviewIA.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.profile.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    return { success: true, message: 'Compte supprimé avec succès' };
  }
}
