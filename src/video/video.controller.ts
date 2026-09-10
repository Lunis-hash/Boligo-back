import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VideoCallService } from './video-call.service';

@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(private readonly videoCallService: VideoCallService) {}

  @Get('session/:journeyId')
  async getSession(@Param('journeyId') journeyId: string, @Request() req) {
    return this.videoCallService.getSession(journeyId, req.user.userId);
  }

  @Post('join/:journeyId')
  async joinCall(@Param('journeyId') journeyId: string, @Request() req) {
    return this.videoCallService.joinCall(journeyId, req.user.userId);
  }

  @Post('call-token')
  async getCallToken(@Body() body: { journeyId: string }, @Request() req) {
    return this.videoCallService.joinCall(body.journeyId, req.user.userId);
  }

  @Post('end')
  async endCall(@Body() body: { journeyId: string; durationSec?: number }, @Request() req) {
    return this.videoCallService.endCall(body.journeyId, req.user.userId, body.durationSec);
  }
}
