import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { RegionService } from './region.service';
import { MatchingService } from './matching.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JourneyModule } from '../journey/journey.module';

@Module({
  imports: [PrismaModule, JourneyModule],
  controllers: [MatchingController],
  providers: [MatchingService, RegionService],
  exports: [MatchingService],
})
export class MatchingModule {}
