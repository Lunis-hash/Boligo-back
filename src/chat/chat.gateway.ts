import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { MessageType } from '@prisma/client';
import { NotificationService } from '../notifications/notification.service';

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
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.connectedUsers.set(userId, client.id);
      client.data.userId = userId;

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
    const userId = client.data.userId;

    // Vérifier si l'utilisateur a le droit de rejoindre cette conversation
    const hasAccess = await this.chatService.canAccessJourney(userId, data.journeyId);

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
    const userId = client.data.userId;

    try {
      const message = await this.chatService.createMessage({
        journeyId: data.journeyId,
        senderId: userId,
        content: data.content,
        type: data.type as MessageType|| 'texte', // Changed from type: data.type || 'texte',  
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
          const truncatedContent = data.content.length > 60 
            ? `${data.content.substring(0, 57)}...` 
            : data.content;

          await this.notificationService.sendPushNotification(
            otherUserId,
            'message',
            `Nouveau message de ${senderName} 💬`,
            truncatedContent,
          );
        }
      } catch (err) {
        console.error('⚠️ [Chat Gateway] Failed to send push notification:', err);
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      client.emit('error', { message: 'Erreur lors de l\'envoi du message' });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string },
  ) {
    const userId = client.data.userId;

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
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { journeyId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;

    // Notifier l'autre utilisateur que quelqu'un est en train d'écrire
    this.server.to(`journey:${data.journeyId}`).emit('userTyping', {
      userId,
      isTyping: data.isTyping,
    });
  }
} 