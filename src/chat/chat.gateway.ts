import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { HttpException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { chatOpen } from '../journey/chat-access';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  /** Le socket a-t-il rejoint (après contrôle d'appartenance) ce parcours ? */
  private inJourney(client: Socket, journeyId: unknown): journeyId is string {
    return typeof journeyId === 'string' && client.rooms.has(`journey:${journeyId}`);
  }

  /**
   * La messagerie est-elle encore ouverte ? Sinon (parcours clos, retenue de
   * sécurité), le socket quitte la salle.
   */
  private async chatOpenFor(
    client: Socket,
    journeyId: string,
  ): Promise<boolean> {
    const journey = await this.chatService.journeyState(journeyId);
    if (journey && chatOpen(journey)) return true;
    client.leave(`journey:${journeyId}`);
    return false;
  }

  /**
   * Attend la fin de l'authentification du socket : un client peut émettre
   * joinJourney dès l'événement « connect », avant que handleConnection ait fini.
   */
  private async authenticatedUser(client: Socket): Promise<string | undefined> {
    await client.data.authReady;
    return client.data.userId;
  }

  async handleConnection(client: Socket) {
    client.data.authReady = this.authenticate(client);
    await client.data.authReady;
  }

  private async authenticate(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      // Compte supprimé ou suspendu : pas de messagerie.
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { accountStatus: true, firstName: true },
      });
      if (!user || user.accountStatus === 'suspendu') {
        client.disconnect(true);
        return;
      }

      this.connectedUsers.set(userId, client.id);
      client.data.userId = userId;
      client.data.firstName = user.firstName;

      console.log(`✅ User ${userId} connected via WebSocket`);

      // Rejoindre les rooms des conversations actives
      const activeJourneys = await this.chatService.getUserActiveJourneys(userId);
      activeJourneys.forEach(journeyId => {
        client.join(`journey:${journeyId}`);
      });

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      console.log(`🔌 User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('joinJourney')
  async handleJoinJourney(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string },
  ) {
    const userId = await this.authenticatedUser(client);
    if (!userId) return;

    // Membre du parcours, et messagerie ouverte (ni pendant le Sondeur, ni
    // pendant une retenue de sécurité, ni après une clôture).
    const hasAccess = await this.chatService.canJoinJourney(
      userId,
      data.journeyId,
    );

    if (hasAccess) {
      client.join(`journey:${data.journeyId}`);
      console.log(`👤 User ${userId} joined journey ${data.journeyId}`);

      // Envoyer l'historique des messages
      const messages = await this.chatService.getJourneyMessages(data.journeyId);
      client.emit('messageHistory', messages);
    } else {
      client.emit('error', { message: 'Accès non autorisé à cette conversation' });
    }
  }

  @SubscribeMessage('leaveJourney')
  handleLeaveJourney(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string },
  ) {
    client.leave(`journey:${data.journeyId}`);
    console.log(`👤 User ${client.data.userId} left journey ${data.journeyId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string; content: string; type?: string },
  ) {
    const userId = await this.authenticatedUser(client);
    if (!userId) return;

    try {
      const message = await this.chatService.createMessage({
        journeyId: data?.journeyId,
        senderId: userId,
        content: data?.content,
      });

      // Diffuser le message à tous les participants de la conversation
      this.server.to(`journey:${data.journeyId}`).emit('newMessage', message);

      // Marquer comme lu pour l'expéditeur
      await this.chatService.markMessagesAsRead(data.journeyId, userId);

      // Envoyer une notification push au destinataire s'il est hors-ligne
      try {
        const journey = await this.chatService.getJourney(data.journeyId);
        const otherUserId = journey.userAId === userId ? journey.userBId : journey.userAId;
        const isOnline = this.connectedUsers.has(otherUserId);
        
        if (!isOnline) {
          const senderName = message.sender?.firstName || 'Votre partenaire';
          const truncatedContent = message.content.length > 60
            ? `${message.content.substring(0, 57)}…`
            : message.content;

          await this.notificationService.sendPushNotification(
            otherUserId,
            'message',
            `Nouveau message de ${senderName}`,
            truncatedContent,
          );
        }
      } catch (err) {
        console.error('⚠️ [Chat Gateway] Failed to send push notification:', err);
      }

    } catch (error) {
      // Refus explicite (modération, étape, longueur) : le motif est renvoyé tel quel.
      const reason =
        error instanceof HttpException ? error.message : 'Erreur lors de l\'envoi du message';
      if (!(error instanceof HttpException)) console.error('❌ Error sending message:', error);
      client.emit('error', { message: reason });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string },
  ) {
    const userId = await this.authenticatedUser(client);
    if (!userId || !this.inJourney(client, data?.journeyId)) return;

    try {
      await this.chatService.markMessagesAsRead(data.journeyId, userId);

      // Notifier l'autre utilisateur que les messages sont lus
      const journey = await this.chatService.getJourney(data.journeyId);
      const otherUserId = journey.userAId === userId ? journey.userBId : journey.userAId;
      const otherSocketId = this.connectedUsers.get(otherUserId);

      if (otherSocketId) {
        this.server.to(otherSocketId).emit('messagesRead', { journeyId: data.journeyId });
      }
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      client.emit('error', { message: 'Erreur lors de la mise à jour du statut de lecture' });
    }
  }

  /** Diffusion après création HTTP (journey) ou WebSocket. */
  broadcastNewMessage(journeyId: string, message: unknown) {
    this.server.to(`journey:${journeyId}`).emit('newMessage', message);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!this.inJourney(client, data?.journeyId)) return;
    if (!(await this.chatOpenFor(client, data.journeyId))) return;

    // Notifier l'autre utilisateur que quelqu'un est en train d'écrire
    client.to(`journey:${data.journeyId}`).emit('userTyping', {
      userId,
      isTyping: data.isTyping,
    });
  }

  /** Diffusion d'un appel vidéo entrant */
  broadcastIncomingCall(journeyId: string, callerId: string, callerName: string) {
    this.server.to(`journey:${journeyId}`).emit('incomingCall', {
      journeyId,
      callerId,
      callerName,
    });
  }

  @SubscribeMessage('callUser')
  async handleCallUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string; callerName: string },
  ) {
    const callerId = client.data.userId;
    if (!this.inJourney(client, data?.journeyId)) return;
    // Un appel ne sonne qu'à l'étape vidéo d'un parcours en cours.
    const journey = await this.chatService.journeyState(data.journeyId);
    if (journey?.currentStep !== 'video' || journey.result !== 'en_cours')
      return;
    // Le nom affiché vient du serveur, jamais du client (pas d'appel usurpé).
    client.to(`journey:${data.journeyId}`).emit('incomingCall', {
      journeyId: data.journeyId,
      callerId,
      callerName: client.data.firstName ?? 'Votre partenaire',
    });
  }

  @SubscribeMessage('rejectCall')
  handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string },
  ) {
    if (!this.inJourney(client, data?.journeyId)) return;
    this.server.to(`journey:${data.journeyId}`).emit('callRejected', {
      journeyId: data.journeyId,
      userId: client.data.userId,
    });
  }
} 