import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoCallService } from './video-call.service';
import { DailyService } from './daily.service';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [VideoController],
  providers: [VideoCallService, DailyService],
  exports: [VideoCallService],
})
export class VideoModule {}
