import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JourneyService } from './journey.service';
import { VideoCallService } from '../video/video-call.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('journey')
@UseGuards(AuthGuard('jwt'))
export class JourneyController {
  constructor(
    private readonly journeyService: JourneyService,
    private readonly videoCallService: VideoCallService,
  ) {}

  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Request() req) {
    return this.journeyService.getStatus(id, req.user.id);
  }

  @Get(':id/questions')
  async getDailyQuestions(@Param('id') id: string) {
    return this.journeyService.getDailyQuestions(id);
  }

  @Post('respond')
  async respond(
    @Body() body: { questionId: string; text: string },
    @Request() req,
  ) {
    return this.journeyService.respondToQuestion(
      body.questionId,
      req.user.id,
      body.text,
    );
  }

  @Post('message')
  async sendMessage(
    @Body() body: { journeyId: string; content: string; type?: string },
    @Request() req,
  ) {
    return this.journeyService.sendMessage(
      body.journeyId,
      req.user.id,
      body.content,
      body.type || 'texte',
    );
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string) {
    return this.journeyService.getMessages(id);
  }

  @Get('chat-access')
  async checkChatAccess(@Request() req) {
    return this.journeyService.canAccessMessages(req.user.id);
  }

  @Get('sondeur-progress')
  async sondeurProgress(@Request() req) {
    return this.journeyService.getSondeurProgress(req.user.id);
  }

  @Patch(':id/advance')
  async advanceStep(
    @Param('id') id: string,
    @Body() body: { step: string },
    @Request() req,
  ) {
    return this.journeyService.advanceStep(id, req.user.id, body.step);
  }

  @Post(':id/exchange-contact')
  async exchangeContact(
    @Param('id') id: string,
    @Body() body: { sharePhone: boolean; shareEmail: boolean },
    @Request() req,
  ) {
    return this.journeyService.exchangeContact(id, req.user.id, body.sharePhone ?? true, body.shareEmail ?? true);
  }

  @Get(':id/contact-exchange')
  async getContactExchange(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.journeyService.getContactExchange(id, req.user.id);
  }

  @Get(':id/video/session')
  async getVideoSession(@Param('id') id: string, @Request() req) {
    return this.videoCallService.getSession(id, req.user.id);
  }

  @Post(':id/video/join')
  async joinVideoCall(@Param('id') id: string, @Request() req) {
    return this.videoCallService.joinCall(id, req.user.id);
  }

  @Post(':id/video/end')
  async endVideoCall(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { durationSec?: number },
  ) {
    return this.videoCallService.endCall(id, req.user.id, body?.durationSec);
  }
}
