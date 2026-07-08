import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InterviewModule } from './interview/interview.module';
import { ProfileModule } from './profile/profile.module';
import { AiModule } from './ai/ai.module';
import { JourneyModule } from './journey/journey.module';
import { NotificationModule } from './notifications/notification.module';
import { MatchingModule } from './matching/matching.module';
import { CreditModule } from './credit/credit.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { ReportModule } from './report/report.module';
import { PaymentModule } from './payment/payment.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    InterviewModule,
    ProfileModule,
    AiModule,
    JourneyModule,
    NotificationModule,
    MatchingModule,
    CreditModule,
    AdminModule,
    ChatModule,
    ReportModule,
    PaymentModule,
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 120, // max 120 requêtes par minute
    }]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

