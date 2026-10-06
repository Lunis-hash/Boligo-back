/**
 * OpenRouter (offre payante) : un modèle par rôle, jamais de modèle gratuit.
 * Les réponses des membres sont des données sensibles : les modèles gratuits
 * peuvent passer par des fournisseurs qui conservent ou réutilisent les données.
 */

export type OpenRouterRole = 'default' | 'quality' | 'critic';

/**
 * Préférences par rôle : on retient le premier modèle ouvert au compte et sous
 * le prix plafond. Une variable d'environnement passe devant (un ou plusieurs
 * modèles, séparés par des virgules).
 * - quality : rédacteur du Sondeur, des lectures et du bilan (parcours payés) ;
 * - critic : relecteur indépendant, d'une autre famille que le rédacteur ;
 * - default : usages courants (modération si Groq est absent).
 */
export const OPENROUTER_PREFERENCES: Record<OpenRouterRole, string[]> = {
  quality: [
    'anthropic/claude-sonnet-5.5',
    'anthropic/claude-sonnet-5',
    'anthropic/claude-sonnet-4.6',
  ],
  critic: ['openai/gpt-5.1', 'openai/gpt-5', 'google/gemini-2.5-pro'],
  default: ['openai/gpt-oss-120b', 'meta-llama/llama-3.3-70b-instruct'],
};

export const OPENROUTER_MODEL_ENV: Record<OpenRouterRole, string> = {
  quality: 'OPENROUTER_QUALITY_MODEL',
  critic: 'OPENROUTER_CRITIC_MODEL',
  default: 'OPENROUTER_MODEL',
};

/**
 * Prix plafond, en dollars par million de jetons : OpenRouter refuse tout
 * fournisseur plus cher (paramètre max_price), et BOLIGO écarte les modèles
 * au-dessus. Réglable par OPENROUTER_MAX_PRICE_PROMPT / _COMPLETION.
 */
export const DEFAULT_MAX_PRICE = { prompt: 5, completion: 25 };

/** Réglages par défaut de chaque usage (l'appelant peut les préciser). */
export const AGENT_DEFAULTS: Record<
  'sondeur' | 'cupidon' | 'coach' | 'parcours' | 'moderation',
  { temperature: number; maxTokens: number }
> = {
  // Les 21 questions du Sondeur demandent environ 3 500 jetons en JSON.
  sondeur: { temperature: 0.6, maxTokens: 8000 },
  cupidon: { temperature: 0.5, maxTokens: 2000 },
  coach: { temperature: 0.5, maxTokens: 2000 },
  parcours: { temperature: 0.6, maxTokens: 1500 },
  moderation: { temperature: 0, maxTokens: 400 },
};

export type OpenRouterAgent = keyof typeof AGENT_DEFAULTS;
