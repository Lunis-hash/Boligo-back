import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email.service';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

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

  // ─── Vidéo débloquée : push + email ────────────────────────────────────────
  async notifyVideoUnlock(userId: string, partnerName: string) {
    // 1. Push notification
    await this.sendPushNotification(
      userId,
      'systeme',
      'Appel vidéo débloqué ! 🎥',
      `Félicitations ! Vous avez terminé les échanges avec ${partnerName}. L'appel vidéo est maintenant disponible.`,
    );

    // 2. Email de notification vidéo débloquée
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (user) {
        await this.emailService.sendVideoUnlockEmail(
          user.email,
          user.firstName,
          partnerName,
        );
        console.log(`[NOTIF] Email vidéo débloquée envoyé à ${user.email}`);
      }
    } catch (err: any) {
      console.error(`[NOTIF] Erreur envoi email vidéo débloquée : ${err.message}`);
    }
  }

  // ─── Nouveau match : push + email ──────────────────────────────────────────
  async notifyNewMatch(
    userId: string,
    compatibilityScore: number,
    expiresInDays: number = 7,
  ) {
    // 1. Push notification
    await this.sendPushNotification(
      userId,
      'nouveau_match',
      'Un match exceptionnel vous attend ! 💍',
      `L'IA BOLIGO a trouvé un profil compatible à ${Math.round(compatibilityScore)}%. Consultez votre match dès maintenant !`,
    );

    // 2. Email de nouveau match
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (user) {
        await this.emailService.sendNewMatchEmail(
          user.email,
          user.firstName,
          compatibilityScore,
          expiresInDays,
        );
        console.log(`[NOTIF] Email nouveau match envoyé à ${user.email}`);
      }
    } catch (err: any) {
      console.error(`[NOTIF] Erreur envoi email nouveau match : ${err.message}`);
    }
  }
}
