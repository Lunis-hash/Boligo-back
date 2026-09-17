import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoCallService } from './video-call.service';
import { DailyService } from './daily.service';
import { NotificationModule } from '../notifications/notification.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [NotificationModule, ChatModule],
  controllers: [VideoController],
  providers: [VideoCallService, DailyService],
  exports: [VideoCallService],
})
export class VideoModule {}
