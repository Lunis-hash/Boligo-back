/**
 * Score de compatibilité entre deux cartes mentales (sans appel IA).
 * Alimente Discover et les MatchProposal.
 */

export interface MentalMapLike {
  keyValues?: unknown;
  needsList?: unknown;
  redFlags?: unknown;
  maturityScore?: number | null;
  alchemyScore?: number | null;
}

export interface CompatibilityResult {
  /** 0.35 – 0.98 */
  score: number;
  percent: number;
  summary: string;
  breakdown: {
    valuesAlignment: number;
    needsAlignment: number;
    maturityAlignment: number;
    alchemyAlignment: number;
    vibeScore: number;
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => String(x).toLowerCase().trim())
    .filter((s) => s.length > 1);
}

/** Similarité Jaccard entre deux listes de textes. */
function textListSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0.55;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
    else {
      for (const other of setB) {
        if (other.includes(token) || token.includes(other)) {
          intersection += 0.5;
          break;
        }
      }
    }
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0.5 : Math.min(1, intersection / union);
}

function scoreAlignment(a: number, b: number): number {
  return 1 - Math.min(0.55, Math.abs(a - b));
}

export function computeCompatibility(
  viewerMap: MentalMapLike | null | undefined,
  candidateMap: MentalMapLike | null | undefined,
): CompatibilityResult {
  if (!viewerMap || !candidateMap) {
    const fallback = 0.72;
    return {
      score: fallback,
      percent: Math.round(fallback * 100),
      summary: 'Compatibilité estimée sur profils complets.',
      breakdown: {
        valuesAlignment: 0.7,
        needsAlignment: 0.7,
        maturityAlignment: 0.7,
        alchemyAlignment: 0.7,
        vibeScore: 0.72,
      },
    };
  }

  const valuesAlignment = textListSimilarity(
    asStringArray(viewerMap.keyValues),
    asStringArray(candidateMap.keyValues),
  );
  const needsAlignment = textListSimilarity(
    asStringArray(viewerMap.needsList),
    asStringArray(candidateMap.needsList),
  );

  const matA = viewerMap.maturityScore ?? 0.75;
  const matB = candidateMap.maturityScore ?? 0.75;
  const alchA = viewerMap.alchemyScore ?? 0.75;
  const alchB = candidateMap.alchemyScore ?? 0.75;

  const maturityAlignment = scoreAlignment(matA, matB);
  const alchemyAlignment = scoreAlignment(alchA, alchB);
  const vibeScore = (alchA + alchB) / 2;

  const rfCount =
    asStringArray(viewerMap.redFlags).length +
    asStringArray(candidateMap.redFlags).length;
  const vigilancePenalty = rfCount > 5 ? 0.04 : rfCount > 3 ? 0.02 : 0;

  const raw =
    valuesAlignment * 0.32 +
    needsAlignment * 0.28 +
    maturityAlignment * 0.14 +
    alchemyAlignment * 0.14 +
    vibeScore * 0.12 -
    vigilancePenalty;

  const score = Math.max(0.35, Math.min(0.98, raw));

  let summary = 'Bonne résonance sur les valeurs et les besoins.';
  if (valuesAlignment >= 0.65 && needsAlignment >= 0.55) {
    summary = 'Valeurs et attentes relationnelles proches.';
  } else if (valuesAlignment < 0.4) {
    summary = 'Valeurs différentes — à explorer avec sincérité.';
  } else if (needsAlignment < 0.4) {
    summary = 'Besoins relationnels distincts — dialogue important.';
  }

  return {
    score,
    percent: Math.round(score * 100),
    summary,
    breakdown: {
      valuesAlignment: Math.round(valuesAlignment * 100) / 100,
      needsAlignment: Math.round(needsAlignment * 100) / 100,
      maturityAlignment: Math.round(maturityAlignment * 100) / 100,
      alchemyAlignment: Math.round(alchemyAlignment * 100) / 100,
      vibeScore: Math.round(vibeScore * 100) / 100,
    },
  };
}
