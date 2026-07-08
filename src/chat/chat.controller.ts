import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('journeys/:journeyId/messages')
  async getJourneyMessages(@Param('journeyId') journeyId: string) {
    return this.chatService.getJourneyMessages(journeyId);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.chatService.getUnreadCount(req.user.userId);
  }

  @Get('journeys/:journeyId/last-message')
  async getLastMessage(@Param('journeyId') journeyId: string) {
    return this.chatService.getLastMessage(journeyId);
  }

  @Post('journeys/:journeyId/read')
  async markAsRead(@Param('journeyId') journeyId: string, @Request() req) {
    await this.chatService.markMessagesAsRead(journeyId, req.user.userId);
    return { success: true };
  }
}
