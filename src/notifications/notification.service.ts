import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async registerPushToken(userId: string, pushToken: string) {
    console.log(`[PUSH] Registering push token for user ${userId}: ${pushToken}`);
    return this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
  }

  async sendPushNotification(
    userId: string,
    type: 'nouveau_match' | 'message' | 'question_harmonie' | 'rappel_reponse' | 'credit' | 'systeme',
    title: string,
    content: string,
  ) {
    console.log(`[PUSH] Creating DB notification for user ${userId}: ${title} - ${content}`);
    
    // 1. Enregistrer en base pour l'historique dans l'app
    const dbNotification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
      },
    });

    // 2. Récupérer le token de notification de l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (user && user.pushToken && user.pushToken.startsWith('ExponentPushToken')) {
      console.log(`[PUSH] Sending actual push notification to token ${user.pushToken}`);
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            to: user.pushToken,
            title,
            body: content,
            data: { type, title, content, notificationId: dbNotification.id },
            sound: 'default',
          }),
        });

        const result = await response.json();
        console.log(`[PUSH] Expo server response:`, JSON.stringify(result));
      } catch (error) {
        console.error(`[PUSH] Error sending push via Expo API:`, error);
      }
    } else {
      console.log(`[PUSH] User ${userId} has no valid pushToken. Skipping actual push.`);
    }

    return dbNotification;
  }

  async notifyVideoUnlock(userId: string, partnerName: string) {
    return this.sendPushNotification(
      userId,
      'systeme',
      'Appel vidéo débloqué ! 🎥',
      `Félicitations ! Vous avez terminé les 3 jours d'échange avec ${partnerName}. L'appel vidéo est maintenant disponible.`,
    );
  }
}
