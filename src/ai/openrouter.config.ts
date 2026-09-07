export interface AgentModelConfig {
  primaryModel: string;
  fallbackModels: string[];
  temperature: number;
  maxTokens: number;
}

export interface HarmonieAgentsConfig {
  sondeur: AgentModelConfig;
  cupidon: AgentModelConfig;
  coach: AgentModelConfig;
  parcours: AgentModelConfig;
  moderation: AgentModelConfig;
}

export const HARMONIE_AI_ROUTING: HarmonieAgentsConfig = {
  // 🧠 Sondeur IA : Analyse psychologique profonde, cartes mentales et questions Hard-Mode (100% Gratuit)
  sondeur: {
    primaryModel: 'openrouter/free',
    fallbackModels: [
      'minimax/minimax-m2.7:free',
      'minimax/minimax-m3:free',
      'google/gemma-4-31b-it:free',
    ],
    temperature: 0.7,
    maxTokens: 2500,
  },

  // 💖 Cupidon IA & Compatibilité : Calcul du score d'affinité 6D et matching (100% Gratuit)
  cupidon: {
    primaryModel: 'openrouter/free',
    fallbackModels: [
      'minimax/minimax-m2.7:free',
      'minimax/minimax-m3:free',
      'google/gemma-4-26b-a4b-it:free',
    ],
    temperature: 0.5,
    maxTokens: 2000,
  },

  // 💬 Coach de Conversation : Accompagnement en temps réel dans le chat (100% Gratuit)
  coach: {
    primaryModel: 'openrouter/free',
    fallbackModels: [
      'minimax/minimax-m2.7:free',
      'dots-studio/dots-3-note-preview:free',
    ],
    temperature: 0.7,
    maxTokens: 1024,
  },

  // 🌱 Parcours Harmonie : Programme d'évolution personnelle (100% Gratuit)
  parcours: {
    primaryModel: 'openrouter/free',
    fallbackModels: [
      'minimax/minimax-m2.7:free',
      'minimax/minimax-m3:free',
    ],
    temperature: 0.6,
    maxTokens: 1500,
  },

  // 🛡️ Médiateur & Modération IA : Modèle de sécurité spécialisé & gratuit (100% Gratuit)
  moderation: {
    primaryModel: 'nvidia/nemotron-3.5-content-safety:free',
    fallbackModels: [
      'openrouter/free',
      'minimax/minimax-m2.7:free',
    ],
    temperature: 0.2,
    maxTokens: 512,
  },
};
