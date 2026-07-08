import { Controller, Get, Post, UseGuards, Request, Body } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('matching')
@UseGuards(AuthGuard('jwt'))
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('discover')
  async getDiscover(@Request() req) {
    return this.matchingService.getDiscoverProfiles(req.user.id);
  }

  @Get('my-matches')
  async getMyMatches(@Request() req) {
    return this.matchingService.getMyMatches(req.user.id);
  }

  @Post('connect')
  async connectWithProfile(
    @Request() req,
    @Body() body: { targetUserId: string },
  ) {
    return this.matchingService.createMatch(req.user.id, body.targetUserId);
  }

  @Get('received-likes')
  async getReceivedLikes(@Request() req) {
    return this.matchingService.getReceivedLikes(req.user.id);
  }

  @Post('accept')
  async acceptLike(
    @Request() req,
    @Body() body: { proposalId: string },
  ) {
    return this.matchingService.acceptMatch(body.proposalId, req.user.id);
  }
}
