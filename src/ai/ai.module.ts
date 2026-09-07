import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { OpenRouterService } from './openrouter.service';

@Global()
@Module({
  providers: [AiService, OpenRouterService],
  exports: [AiService, OpenRouterService],
})
export class AiModule {}

