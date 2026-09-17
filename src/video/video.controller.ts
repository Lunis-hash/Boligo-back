import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VideoCallService } from './video-call.service';

@Controller('video')
@UseGuards(AuthGuard('jwt'))
export class VideoController {
  constructor(private readonly videoCallService: VideoCallService) {}

  @Get('session/:journeyId')
  async getSession(@Param('journeyId') journeyId: string, @Request() req) {
    const userId = (req.user as any)?.id || (req.user as any)?.userId;
    return this.videoCallService.getSession(journeyId, userId);
  }

  @Post('join/:journeyId')
  async joinCall(@Param('journeyId') journeyId: string, @Request() req) {
    const userId = (req.user as any)?.id || (req.user as any)?.userId;
    return this.videoCallService.joinCall(journeyId, userId);
  }

  @Post('call-token')
  async getCallToken(@Body() body: { journeyId: string }, @Request() req) {
    const userId = (req.user as any)?.id || (req.user as any)?.userId;
    return this.videoCallService.joinCall(body.journeyId, userId);
  }

  @Post('end')
  async endCall(@Body() body: { journeyId: string; durationSec?: number }, @Request() req) {
    const userId = (req.user as any)?.id || (req.user as any)?.userId;
    return this.videoCallService.endCall(body.journeyId, userId, body.durationSec);
  }
}
