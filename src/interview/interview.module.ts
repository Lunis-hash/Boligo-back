import { Module } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { QuestionsService } from './questions.service';

@Module({
  controllers: [InterviewController],
  providers: [InterviewService, QuestionsService],
})
export class InterviewModule {}
