import { chatOpenEmail, RenderedEmail } from '../common/email-templates';
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
    // Ne renvoie rien du compte (l'ancien retour exposait tout l'utilisateur,
    // empreinte du mot de passe comprise) et ne journalise pas le jeton.
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
      select: { id: true },
    });
    return { success: true };
  }

  async sendPushNotification(
    userId: string,
    type:
      | 'nouveau_match'
      | 'message'
      | 'question_harmonie'
      | 'rappel_reponse'
      | 'credit'
      | 'systeme',
    title: string,
    content: string,
    /** Texte affiché sur l'écran verrouillé (sinon le contenu). */
    pushBody: string = content,
  ) {
    console.log(`[PUSH] Notification « ${type} » pour ${userId}`);

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

    if (
      user &&
      user.pushToken &&
      user.pushToken.startsWith('ExponentPushToken')
    ) {
      console.log(
        `[PUSH] Sending actual push notification to token ${user.pushToken}`,
      );
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            to: user.pushToken,
            title,
            body: pushBody,
            // Le contenu complet reste dans l'app (jamais dans la notification).
            data: { type, title, notificationId: dbNotification.id },
            sound: 'default',
          }),
        });

        const result = await response.json();
        console.log(`[PUSH] Expo server response:`, JSON.stringify(result));
      } catch (error) {
        console.error(`[PUSH] Error sending push via Expo API:`, error);
      }
    } else {
      console.log(
        `[PUSH] User ${userId} has no valid pushToken. Skipping actual push.`,
      );
    }

    return dbNotification;
  }

  /**
   * E-mail d'étape au membre. Jamais bloquant : une panne d'envoi ne doit pas
   * faire échouer l'action du membre. Aucune adresse dans les journaux.
   */
  async emailUser(userId: string, build: (firstName: string) => RenderedEmail) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, accountStatus: true },
      });
      if (!user?.email || user.accountStatus === 'suspendu') return;
      await this.emailService.sendStepEmail(
        user.email,
        build(user.firstName || ''),
      );
    } catch (err) {
      console.error(
        `[NOTIF] E-mail d'étape non envoyé : ${(err as Error)?.message}`,
      );
    }
  }

  // ─── Messagerie ouverte (fin du Sondeur) : push + e-mail ───────────────────
  async notifyChatOpen(userId: string, partnerName: string) {
    await this.sendPushNotification(
      userId,
      'message',
      'Messagerie ouverte',
      `Le Sondeur est terminé : vous pouvez maintenant écrire à ${partnerName}.`,
    );
    await this.emailUser(userId, (name) => chatOpenEmail(name, partnerName));
  }

  // ─── Vidéo débloquée : push + email ────────────────────────────────────────
  async notifyVideoUnlock(userId: string, partnerName: string) {
    // 1. Push notification
    await this.sendPushNotification(
      userId,
      'systeme',
      'Appel vidéo disponible',
      `Vos échanges avec ${partnerName} sont terminés : l'appel vidéo est maintenant disponible.`,
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
      }
    } catch (err) {
      console.error(
        `[NOTIF] Erreur envoi email vidéo débloquée : ${(err as Error)?.message}`,
      );
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
      'Un profil très compatible vous attend',
      `BOLIGO a trouvé un profil compatible à ${Math.round(compatibilityScore)} %. Découvrez-le dès maintenant.`,
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
      }
    } catch (err) {
      console.error(
        `[NOTIF] Erreur envoi email nouveau match : ${(err as Error)?.message}`,
      );
    }
  }
}
