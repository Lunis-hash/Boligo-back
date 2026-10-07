/**
 * Lectures du Sondeur renvoyées par GET /journey/:id/insights : une par
 * journée terminée par les deux membres, puis le bilan Harmonie (jour 0).
 * Rédigées par l'IA pour un parcours payé (source « ia »), sinon par les
 * règles de BOLIGO (source « regles »).
 */
export interface SondeurPoint {
  theme: string;
  text: string;
  /** Extraits cités mot pour mot dans chaque réponse. */
  quotes?: [string, string];
}

export interface SondeurReading {
  day: number;
  source: 'ia' | 'regles';
  headline: string;
  together: string[];
  /** Extraits cités pour chaque accord (même ordre que `together`). */
  togetherQuotes?: Array<[string, string] | null>;
  toDiscuss: SondeurPoint[];
  openers: string[];
  advice?: string;
}

export interface SondeurInsights {
  days: SondeurReading[];
  review: SondeurReading | null;
  writing: boolean;
}

export const EMPTY_INSIGHTS: SondeurInsights = { days: [], review: null, writing: false };

/** Paire d'extraits valide, sinon null. */
const quotePair = (value: unknown): [string, string] | null =>
  Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === 'string' && v.trim().length > 0)
    ? [value[0] as string, value[1] as string]
    : null;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : [];

function toReading(value: unknown): SondeurReading | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  const day = typeof o.day === 'number' ? o.day : NaN;
  if (!Number.isInteger(day) || day < 0 || day > 3) return null;
  if (typeof o.headline !== 'string' || !o.headline.trim()) return null;
  const points = Array.isArray(o.toDiscuss)
    ? o.toDiscuss
        .filter(
          (p): p is SondeurPoint =>
            !!p && typeof p === 'object' && typeof (p as SondeurPoint).text === 'string' && typeof (p as SondeurPoint).theme === 'string',
        )
        .map((p) => {
          const quotes = quotePair(p.quotes);
          return quotes ? { theme: p.theme, text: p.text, quotes } : { theme: p.theme, text: p.text };
        })
    : [];
  const together = Array.isArray(o.together) ? o.together : [];
  const togetherQuotes = Array.isArray(o.togetherQuotes) ? o.togetherQuotes : [];
  const kept = together
    .map((t, i) => ({ t, q: quotePair(togetherQuotes[i]) }))
    .filter((x): x is { t: string; q: [string, string] | null } => typeof x.t === 'string' && x.t.trim().length > 0);
  return {
    day,
    source: o.source === 'ia' ? 'ia' : 'regles',
    headline: o.headline,
    together: kept.map((x) => x.t),
    ...(kept.some((x) => x.q) ? { togetherQuotes: kept.map((x) => x.q) } : {}),
    toDiscuss: points,
    openers: strings(o.openers),
    advice: typeof o.advice === 'string' && o.advice.trim() ? o.advice : undefined,
  };
}

/** Réponse du serveur, vérifiée : une donnée inattendue n'empêche jamais l'écran de s'afficher. */
export function parseSondeurInsights(data: unknown): SondeurInsights {
  if (!data || typeof data !== 'object') return EMPTY_INSIGHTS;
  const o = data as Record<string, unknown>;
  const days = Array.isArray(o.days)
    ? o.days.map(toReading).filter((r): r is SondeurReading => !!r && r.day >= 1)
    : [];
  const review = toReading(o.review);
  return {
    days,
    review: review && review.day === 0 ? review : null,
    writing: o.writing === true,
  };
}

export function readingForDay(insights: SondeurInsights, day: number): SondeurReading | null {
  return insights.days.find((r) => r.day === day) ?? null;
}

/** Signature de la carte : qui a écrit la lecture. */
export function readingCaption(reading: SondeurReading): string {
  return reading.source === 'ia' ? 'Lecture de vos réponses par BOLIGO' : 'Pistes pour en parler';
}
