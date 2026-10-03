import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import {
  maskProfanityForDisplay,
  moderateMessageLocally,
} from '../moderation/chat-moderation';
import { shouldRunAiModeration } from '../moderation/ai-moderation.policy';

const MAX_MESSAGE_LENGTH = 2000;
/** Étapes où la messagerie est ouverte (même règle que POST /journey/:id/messages). */
const CHAT_STEPS = ['chat_libre', 'video', 'echange_contacts', 'termine'];

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Message envoyé par WebSocket : mêmes contrôles que la voie HTTP
   * (appartenance, étape du parcours, longueur, modération locale puis IA).
   * Le contenu diffusé est masqué comme à l'affichage.
   */
  async createMessage(data: {
    journeyId: string;
    senderId: string;
    content: string;
    type?: MessageType;
  }) {
    const journey = await this.prisma.journey.findUnique({
      where: { id: data.journeyId },
      select: { userAId: true, userBId: true, currentStep: true },
    });
    if (!journey || (journey.userAId !== data.senderId && journey.userBId !== data.senderId)) {
      throw new ForbiddenException('Accès non autorisé à cette conversation');
    }
    if (!CHAT_STEPS.includes(journey.currentStep)) {
      throw new BadRequestException(
        'Les messages sont disponibles après le Sondeur (conversation libre).',
      );
    }

    const content = typeof data.content === 'string' ? data.content.trim() : '';
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `Votre message doit contenir entre 1 et ${MAX_MESSAGE_LENGTH} caractères.`,
      );
    }
    const local = moderateMessageLocally(content);
    if (!local.allowed) {
      throw new BadRequestException(local.reason);
    }
    if (shouldRunAiModeration(content)) {
      const ai = await this.aiService.moderateChatMessage(content);
      if (!ai.allowed) {
        throw new BadRequestException(
          ai.reason || 'Ce message ne respecte pas les règles de respect de BOLIGO.',
        );
      }
    }

    const message = await this.prisma.message.create({
      data: {
        journeyId: data.journeyId,
        senderId: data.senderId,
        content,
        type: MessageType.texte,
        moderationStatus: 'ok',
      },
      include: {
        sender: { select: { id: true, firstName: true } },
      },
    });

    return { ...message, content: maskProfanityForDisplay(message.content) };
  }

  /** Refuse l'accès à une conversation dont l'utilisateur n'est pas membre. */
  async assertMember(userId: string, journeyId: string): Promise<void> {
    if (!(await this.canAccessJourney(userId, journeyId))) {
      throw new NotFoundException('Conversation non trouvée');
    }
  }

  /** Les `limit` messages les plus récents, du plus ancien au plus récent. */
  async getJourneyMessages(journeyId: string, limit = 100) {
    const latest = await this.prisma.message.findMany({
      where: {
        journeyId,
        moderationStatus: 'ok',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: limit,
    });

    return latest.reverse();
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
