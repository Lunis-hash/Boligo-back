/**
 * Choix du modèle Groq.
 *
 * Les modèles proposés par Groq changent (retraits, renommages) : un nom figé
 * dans le code finit par renvoyer « model_not_found », et l'IA s'éteint sans
 * bruit. On lit donc la liste des modèles réellement ouverts au compte et on
 * retient le premier de nos préférences qui y figure.
 */

/**
 * Ordre de préférence : coût le plus bas d'abord, à condition de rendre du JSON
 * propre en bon français. Les modèles « à raisonnement » (gpt-oss, qwen3) passent
 * en dernier : leur réflexion consomme des jetons et peut tronquer la réponse.
 */
export const GROQ_PREFERRED_MODELS = [
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3-32b',
];

/** Modèles qui ne font pas de conversation écrite (audio, filtres de sécurité…). */
const NON_CHAT =
  /whisper|tts|playai|orpheus|guard|prompt-guard|distil|compound/i;

/** GROQ_MODEL peut lister plusieurs modèles, séparés par des virgules. */
export function parseModelList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

/**
 * Premier modèle préféré disponible ; à défaut, un modèle de conversation
 * quelconque du compte ; null si la liste est vide.
 */
export function pickGroqModel(
  available: string[],
  preferred: string[],
  exclude: Iterable<string> = [],
): string | null {
  const banned = new Set(exclude);
  const open = available.filter((id) => !banned.has(id));
  const fromPreferences = preferred.find((id) => open.includes(id));
  if (fromPreferences) return fromPreferences;
  return open.find((id) => !NON_CHAT.test(id)) ?? null;
}

/** Erreur « modèle introuvable / retiré » renvoyée par Groq. */
export function isModelUnavailableError(error: unknown): boolean {
  const e = error as {
    status?: number;
    code?: string;
    message?: string;
    error?: { code?: string };
  };
  const code = e?.code ?? e?.error?.code;
  if (code === 'model_not_found' || code === 'model_decommissioned')
    return true;
  return /model_not_found|model_decommissioned|does not exist|has been decommissioned/i.test(
    e?.message ?? '',
  );
}

/**
 * Réglages propres aux modèles « à raisonnement » : leur réflexion consomme
 * des jetons de la réponse. On la limite (gpt-oss) ou on la coupe (qwen3)
 * pour que le JSON attendu ne soit pas tronqué.
 */
export function reasoningOptions(model: string): {
  reasoning_effort?: 'none' | 'low';
  include_reasoning?: boolean;
} {
  if (/gpt-oss/i.test(model))
    return { reasoning_effort: 'low', include_reasoning: false };
  if (/qwen3/i.test(model)) return { reasoning_effort: 'none' };
  return {};
}
