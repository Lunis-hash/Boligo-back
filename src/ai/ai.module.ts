import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { OpenRouterService } from './openrouter.service';
import { AiBudgetService } from './ai-budget.service';

@Global()
@Module({
  providers: [AiService, OpenRouterService, AiBudgetService],
  exports: [AiService, OpenRouterService, AiBudgetService],
})
export class AiModule {}

