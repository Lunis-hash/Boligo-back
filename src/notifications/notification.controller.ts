import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('push-token')
  @ApiOperation({ summary: 'Register or update push token for current user' })
  @ApiResponse({ status: 200, description: 'Push token successfully registered.' })
  async registerPushToken(@Req() req: any, @Body() dto: RegisterPushTokenDto) {
    return this.notificationService.registerPushToken(req.user.id, dto.pushToken);
  }
}
