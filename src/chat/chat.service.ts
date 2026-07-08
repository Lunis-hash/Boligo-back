import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(data: {
    journeyId: string;
    senderId: string;
    content: string;
    type?: MessageType;
  }) {
    // Vérifier que l'utilisateur a accès à cette conversation
    const hasAccess = await this.canAccessJourney(data.senderId, data.journeyId);
    if (!hasAccess) {
      throw new ForbiddenException('Accès non autorisé à cette conversation');
    }

    // Créer le message
    const message = await this.prisma.message.create({
      data: {
        journeyId: data.journeyId,
        senderId: data.senderId,
        content: data.content,
        type: data.type || MessageType.texte,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return message;
  }

  async getJourneyMessages(journeyId: string, limit = 50) {
    const messages = await this.prisma.message.findMany({
      where: {
        journeyId,
        moderationStatus: 'ok',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        sentAt: 'asc',
      },
      take: limit,
    });

    return messages;
  }

  async canAccessJourney(userId: string, journeyId: string): Promise<boolean> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      select: {
        userAId: true,
        userBId: true,
      },
    });

    if (!journey) {
      return false;
    }

    return journey.userAId === userId || journey.userBId === userId;
  }

  async getJourney(journeyId: string) {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        currentStep: true,
      },
    });

    if (!journey) {
      throw new NotFoundException('Conversation non trouvée');
    }

    return journey;
  }

  async getUserActiveJourneys(userId: string): Promise<string[]> {
    const journeys = await this.prisma.journey.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId },
        ],
        result: 'en_cours',
      },
      select: {
        id: true,
      },
    });

    return journeys.map(j => j.id);
  }

  async markMessagesAsRead(journeyId: string, userId: string) {
    // Marquer comme lus tous les messages non lus envoyés par l'autre utilisateur
    const journey = await this.getJourney(journeyId);
    const otherUserId = journey.userAId === userId ? journey.userBId : journey.userAId;

    await this.prisma.message.updateMany({
      where: {
        journeyId,
        senderId: otherUserId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    // Récupérer toutes les conversations actives de l'utilisateur
    const journeys = await this.prisma.journey.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId },
        ],
        result: 'en_cours',
      },
      select: {
        id: true,
        userAId: true,
        userBId: true,
      },
    });

    let unreadCount = 0;

    for (const journey of journeys) {
      const otherUserId = journey.userAId === userId ? journey.userBId : journey.userAId;
      
      const count = await this.prisma.message.count({
        where: {
          journeyId: journey.id,
          senderId: otherUserId,
          isRead: false,
          moderationStatus: 'ok',
        },
      });

      unreadCount += count;
    }

    return unreadCount;
  }

  async getLastMessage(journeyId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        journeyId,
        moderationStatus: 'ok',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    return message;
  }
}
