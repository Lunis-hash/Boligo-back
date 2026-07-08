import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportReason } from '@prisma/client';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async createReport(
    reporterId: string,
    dto: {
      reportedUserId?: string;
      messageId?: string;
      reason: ReportReason;
      description?: string;
    },
  ) {
    let { reportedUserId, messageId, reason, description } = dto;

    if (!messageId && !reportedUserId) {
      throw new BadRequestException(
        'Vous devez spécifier soit un messageId soit un reportedUserId.',
      );
    }

    // Si un messageId est fourni, on résout automatiquement le reportedUserId
    if (messageId) {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: { journey: true },
      });

      if (!message) {
        throw new NotFoundException('Message non trouvé.');
      }

      // L'utilisateur doit faire partie du parcours pour signaler le message
      if (
        message.journey.userAId !== reporterId &&
        message.journey.userBId !== reporterId
      ) {
        throw new BadRequestException(
          'Vous ne faites pas partie de ce parcours.',
        );
      }

      // L'utilisateur signalé est l'autre personne dans la conversation
      const partnerId =
        message.senderId === reporterId
          ? message.journey.userAId === reporterId
            ? message.journey.userBId
            : message.journey.userAId
          : message.senderId;

      if (reportedUserId && reportedUserId !== partnerId) {
        throw new BadRequestException(
          "L'utilisateur signalé ne correspond pas à l'auteur du message.",
        );
      }

      reportedUserId = partnerId;

      // Mettre le statut du message à 'en_verification'
      await this.prisma.message.update({
        where: { id: messageId },
        data: { moderationStatus: 'en_verification' },
      });
    }

    if (reportedUserId === reporterId) {
      throw new BadRequestException('Vous ne pouvez pas vous signaler vous-même.');
    }

    const targetUserId = reportedUserId;
    if (!targetUserId) {
      throw new BadRequestException("L'identifiant de l'utilisateur signalé est requis.");
    }

    // Vérifier que l'utilisateur signalé existe
    const reportedUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!reportedUser) {
      throw new NotFoundException('Utilisateur signalé non trouvé.');
    }

    // Créer le signalement
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedId: targetUserId,
        messageId,
        reason,
        description,
        status: 'en_attente',
      },
    });

    return {
      success: true,
      reportId: report.id,
      message: 'Signalement enregistré avec succès.',
    };
  }
}
