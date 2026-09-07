import { Injectable, Logger } from '@nestjs/common';
import { AgentModelConfig, HARMONIE_AI_ROUTING, HarmonieAgentsConfig } from './openrouter.config';

export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  content: string;
  modelUsed: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    if (!this.apiKey) {
      this.logger.warn(
        '⚠️ OPENROUTER_API_KEY non configurée. L\'orchestrateur fonctionnera en mode secours.',
      );
    } else {
      this.logger.log('🚀 Orchestrateur OpenRouter IA d\'Harmonie initialisé avec succès.');
    }
  }

  /**
   * Effectue un appel orchestré à OpenRouter pour l'un des agents Harmonie.
   * Bascule automatiquement sur les modèles de secours en cas d'erreur.
   */
  async executeAgentPrompt(
    agentName: keyof HarmonieAgentsConfig,
    messages: OpenRouterChatMessage[],
    customConfig?: Partial<AgentModelConfig>,
  ): Promise<OpenRouterResponse> {
    const config = { ...HARMONIE_AI_ROUTING[agentName], ...customConfig };
    const candidateModels = [config.primaryModel, ...config.fallbackModels];

    if (!this.apiKey) {
      throw new Error(`[OpenRouter] Clé API absente pour l'agent ${agentName}`);
    }

    let lastError: Error | null = null;

    for (const model of candidateModels) {
      try {
        this.logger.log(`🤖 [${agentName.toUpperCase()}] Tentative avec le modèle : ${model}`);
        
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': process.env.APP_URL || 'https://harmonie-app.com',
            'X-Title': 'Harmonie AI Coach',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content ?? '';

        if (!content) {
          throw new Error('Réponse vide retournée par le modèle');
        }

        this.logger.log(`✅ [${agentName.toUpperCase()}] Succès avec le modèle : ${model}`);
        return {
          content,
          modelUsed: model,
          usage: data.usage,
        };
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `⚠️ [${agentName.toUpperCase()}] Échec du modèle ${model}: ${error.message}. Passage au fallback...`,
        );
      }
    }

    throw new Error(
      `[OpenRouter] Tous les modèles pour l'agent ${agentName} ont échoué. Dernière erreur: ${lastError?.message}`,
    );
  }

  /**
   * Helper pour extraire du JSON propre même si le modèle entoure de triple backticks (```json ... ```)
   */
  extractJson<T = any>(rawText: string): T {
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const textToParse = jsonMatch ? jsonMatch[1] : rawText;
    return JSON.parse(textToParse.trim());
  }
}
