import { Module, forwardRef } from '@nestjs/common';
import { JourneyController } from './journey.controller';
import { JourneyService } from './journey.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { DailyService } from '../video/daily.service';
import { VideoCallService } from '../video/video-call.service';
import { ChatModule } from '../chat/chat.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [PrismaModule, AiModule, CreditModule, forwardRef(() => ChatModule)],
  controllers: [JourneyController],
  providers: [JourneyService, DailyService, VideoCallService],
  exports: [JourneyService, VideoCallService],
})
export class JourneyModule {}
