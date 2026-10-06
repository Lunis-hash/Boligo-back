/**
 * Garde-fous de dépense IA :
 * - budget mensuel (AI_MONTHLY_BUDGET_EUR, 10 € par défaut) pour tout ce qui
 *   n'est pas le suivi d'un parcours payé ;
 * - budget par parcours payé (AI_JOURNEY_BUDGET_EUR, 1 € par défaut).
 * Au-delà, chaque fonction bascule sur sa version sans IA (portrait rédigé,
 * questions du Sondeur sur modèles, lectures par les règles, filtre local).
 */

export const DEFAULT_MONTHLY_BUDGET_EUR = 10;

/**
 * Tarifs publics Groq en dollars par million de jetons (entrée, sortie),
 * arrondis vers le haut et comptés 1 $ = 1 € : la dépense réelle est toujours
 * un peu inférieure à celle comptée. À mettre à jour si Groq change ses prix.
 */
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'meta-llama/llama-4-scout-17b-16e-instruct': { input: 0.11, output: 0.34 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'openai/gpt-oss-20b': { input: 0.1, output: 0.5 },
  'openai/gpt-oss-120b': { input: 0.15, output: 0.75 },
  'qwen/qwen3-32b': { input: 0.29, output: 0.59 },
};

/** Un modèle inconnu est compté cher : prudence sur le budget. */
export const UNKNOWN_MODEL_PRICE = { input: 1, output: 2 };

export function modelPrice(model: string): { input: number; output: number } {
  if (/:free$/.test(model)) return { input: 0, output: 0 };
  return MODEL_PRICES[model] ?? UNKNOWN_MODEL_PRICE;
}

/** Coût en millionièmes d'euro, arrondi au-dessus. */
export function costMicroEur(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = modelPrice(model);
  return Math.ceil(inputTokens * p.input + outputTokens * p.output);
}

/** Coût à partir d'un prix en dollars par million de jetons (1 $ compté 1 €). */
export function costFromPrice(
  price: { prompt: number; completion: number },
  inputTokens: number,
  outputTokens: number,
): number {
  return Math.ceil(
    inputTokens * price.prompt + outputTokens * price.completion,
  );
}

/** Coût réel facturé en dollars → millionièmes d'euro (1 $ compté 1 €, arrondi au-dessus). */
export function usdToMicroEur(usd: number): number {
  return Math.ceil(usd * 1_000_000);
}

/** Estimation prudente : environ 3 caractères par jeton en français. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

export function monthKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Budget du mois (hors parcours payés) en millionièmes d'euro ; 0 coupe ces usages. */
export function monthlyBudgetMicroEur(
  value: string | undefined = process.env.AI_MONTHLY_BUDGET_EUR,
): number {
  const eur =
    value === undefined || value.trim() === ''
      ? DEFAULT_MONTHLY_BUDGET_EUR
      : Number(value.replace(',', '.'));
  if (!Number.isFinite(eur) || eur <= 0) return 0;
  return Math.round(eur * 1_000_000);
}

/**
 * Suivi IA d'un parcours payé (Sondeur, lectures de chaque journée, bilan) :
 * 1 € par parcours au plus, hors plafond mensuel. Un parcours coûte 15 € à
 * chacun des deux membres ; le suivi consomme en pratique environ 1 centime.
 */
export const DEFAULT_JOURNEY_BUDGET_EUR = 1;

/** Budget IA d'un parcours payé en millionièmes d'euro ; 0 coupe ce suivi. */
export function journeyBudgetMicroEur(
  value: string | undefined = process.env.AI_JOURNEY_BUDGET_EUR,
): number {
  return monthlyBudgetMicroEur(
    value === undefined || value.trim() === ''
      ? String(DEFAULT_JOURNEY_BUDGET_EUR)
      : value,
  );
}

/**
 * Filet de sécurité global : dépense totale du mois pour le suivi des parcours
 * payés (AI_JOURNEY_MONTHLY_CAP_EUR, 100 € par défaut, soit plusieurs milliers
 * de parcours). Au-delà, les parcours passent aux versions sans IA jusqu'au
 * mois suivant. 0 coupe ce suivi.
 */
export const DEFAULT_JOURNEY_MONTHLY_CAP_EUR = 100;

export function journeyMonthlyCapMicroEur(
  value: string | undefined = process.env.AI_JOURNEY_MONTHLY_CAP_EUR,
): number {
  return monthlyBudgetMicroEur(
    value === undefined || value.trim() === ''
      ? String(DEFAULT_JOURNEY_MONTHLY_CAP_EUR)
      : value,
  );
}

/**
 * Portrait des membres : rédigé sans IA par défaut (coût nul, réponse
 * immédiate). AI_PROFILE_MODE=ai réactive la rédaction par l'IA, toujours
 * sous le plafond mensuel.
 */
export function profileAiEnabled(
  value: string | undefined = process.env.AI_PROFILE_MODE,
): boolean {
  return (value ?? '').trim().toLowerCase() === 'ai';
}
