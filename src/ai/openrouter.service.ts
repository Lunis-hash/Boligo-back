import { Injectable, Logger } from '@nestjs/common';
import {
  AGENT_DEFAULTS,
  DEFAULT_MAX_PRICE,
  OPENROUTER_MODEL_ENV,
  OPENROUTER_PREFERENCES,
  OpenRouterAgent,
  OpenRouterRole,
} from './openrouter.config';
import { modelFamily, parseModelList } from './groq-model';

const OPENROUTER_TIMEOUT_MS = 20_000;
/** La liste des modèles et leurs prix sont relus toutes les six heures. */
const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
/** Adresse de l'API ; OPENROUTER_BASE_URL ne sert qu'aux essais locaux. */
const api = () =>
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

export interface OpenRouterChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  content: string;
  modelUsed: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    /** Coût réel facturé par OpenRouter, en dollars. */
    cost?: number;
  };
}

export interface OpenRouterCallOptions {
  role?: OpenRouterRole;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Rédacteur à écarter : le relecteur est d'une autre famille. */
  avoidModel?: string;
}

/** Prix d'un modèle en dollars par million de jetons. */
export interface ModelPrice {
  prompt: number;
  completion: number;
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const n =
    raw === undefined || raw.trim() === ''
      ? NaN
      : Number(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function maxPrice(): ModelPrice {
  return {
    prompt: envNumber('OPENROUTER_MAX_PRICE_PROMPT', DEFAULT_MAX_PRICE.prompt),
    completion: envNumber(
      'OPENROUTER_MAX_PRICE_COMPLETION',
      DEFAULT_MAX_PRICE.completion,
    ),
  };
}

/** Modèles « à raisonnement » : leur réflexion est limitée pour ne pas tronquer le JSON. */
function reasoningFor(model: string): Record<string, unknown> {
  return /^openai\/(gpt-5|o\d|gpt-oss)/.test(model)
    ? { reasoning: { effort: 'low', exclude: true } }
    : {};
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private catalog: { at: number; prices: Map<string, ModelPrice> } | null =
    null;

  private get apiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY || undefined;
  }

  /**
   * Modèles ouverts au compte et leur prix réel (dollars par million de
   * jetons). null si la liste est injoignable : le prix plafond reste alors
   * imposé par OpenRouter lui-même (max_price).
   */
  async catalogPrices(): Promise<Map<string, ModelPrice> | null> {
    if (this.catalog && Date.now() - this.catalog.at < CATALOG_TTL_MS) {
      return this.catalog.prices;
    }
    try {
      const res = await fetch(`${api()}/models`, {
        signal: AbortSignal.timeout(10_000),
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        data?: Array<{
          id?: string;
          pricing?: { prompt?: string; completion?: string };
        }>;
      };
      const prices = new Map<string, ModelPrice>();
      for (const m of body.data ?? []) {
        const prompt = Number(m.pricing?.prompt);
        const completion = Number(m.pricing?.completion);
        if (m.id && Number.isFinite(prompt) && Number.isFinite(completion)) {
          prices.set(m.id, {
            prompt: prompt * 1_000_000,
            completion: completion * 1_000_000,
          });
        }
      }
      this.catalog = { at: Date.now(), prices };
      return prices;
    } catch (error) {
      this.logger.warn(
        `⚠️ [OpenRouter] Liste des modèles indisponible : ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Modèles candidats d'un rôle, dans l'ordre : variable d'environnement puis
   * préférences ; jamais gratuits ; présents au catalogue et sous le prix
   * plafond quand le catalogue est connu.
   */
  async candidates(role: OpenRouterRole, avoid?: string): Promise<string[]> {
    const wanted = [
      ...parseModelList(process.env[OPENROUTER_MODEL_ENV[role]]),
      ...OPENROUTER_PREFERENCES[role],
    ];
    const cap = maxPrice();
    const catalog = await this.catalogPrices();
    const out: string[] = [];
    for (const model of wanted) {
      if (out.includes(model) || /:free$/.test(model)) continue;
      if (avoid && modelFamily(model) === modelFamily(avoid)) continue;
      if (catalog) {
        const price = catalog.get(model);
        if (!price) continue;
        if (price.prompt > cap.prompt || price.completion > cap.completion)
          continue;
      }
      out.push(model);
    }
    return out;
  }

  /** Prix connu d'un modèle (dollars par million de jetons), sinon null. */
  priceOf(model: string): ModelPrice | null {
    return this.catalog?.prices.get(model) ?? null;
  }

  /**
   * Appel OpenRouter pour un usage BOLIGO : premier modèle candidat du rôle,
   * puis les suivants en cas d'échec. Fournisseurs qui ne conservent pas les
   * données, prix plafonné, longueur de réponse bornée.
   */
  async executeAgentPrompt(
    agentName: OpenRouterAgent,
    messages: OpenRouterChatMessage[],
    options: OpenRouterCallOptions = {},
  ): Promise<OpenRouterResponse> {
    if (!this.apiKey) {
      throw new Error(`[OpenRouter] Clé API absente pour l'agent ${agentName}`);
    }
    const defaults = AGENT_DEFAULTS[agentName];
    const role = options.role ?? 'default';
    const models = await this.candidates(role, options.avoidModel);
    if (models.length === 0) {
      throw new Error(
        `[OpenRouter] Aucun modèle disponible sous le prix plafond pour le rôle ${role}`,
      );
    }
    const cap = maxPrice();
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const response = await fetch(`${api()}/chat/completions`, {
          method: 'POST',
          // Un modèle qui ne répond pas ne doit pas bloquer la requête du membre.
          signal: AbortSignal.timeout(
            options.timeoutMs ?? OPENROUTER_TIMEOUT_MS,
          ),
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer':
              process.env.APP_URL || 'https://boligo-web.onrender.com',
            'X-Title': 'BOLIGO',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? defaults.temperature,
            max_tokens: options.maxTokens ?? defaults.maxTokens,
            provider: {
              // Jamais de fournisseur qui collecte les données (conservation ou entraînement).
              data_collection: 'deny',
              ...(process.env.OPENROUTER_ZDR === 'true' ? { zdr: true } : {}),
              max_price: { prompt: cap.prompt, completion: cap.completion },
            },
            ...reasoningFor(model),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
          );
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: OpenRouterResponse['usage'];
        };
        const content = data.choices?.[0]?.message?.content ?? '';
        if (!content) throw new Error('Réponse vide retournée par le modèle');

        return { content, modelUsed: model, usage: data.usage };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `⚠️ [OpenRouter] ${agentName} : échec du modèle ${model} (${lastError.message}).`,
        );
      }
    }

    throw new Error(
      `[OpenRouter] Tous les modèles du rôle ${role} ont échoué. Dernière erreur : ${lastError?.message}`,
    );
  }

  /**
   * Helper pour extraire du JSON propre même si le modèle entoure de triple backticks (```json ... ```)
   */
  extractJson<T = any>(rawText: string): T {
    const jsonMatch =
      rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
      rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const textToParse = jsonMatch ? jsonMatch[1] : rawText;
    return JSON.parse(textToParse.trim()) as T;
  }
}
