/**
 * Statistiques de fiabilité des échelles du Grand Entretien (V7.1), pour la
 * validation psychométrique (`scripts/psychometric-validation.ts`, protocole
 * dans `docs/VALIDATION_CLINIQUE.md`). Fonctions pures, sans base de données.
 *
 * Une ligne = un membre, une colonne = une affirmation, notes 1 à 5 déjà
 * inversées pour les affirmations inversées. Seuls les membres qui ont
 * répondu à toutes les affirmations d'une échelle entrent dans son calcul.
 */

const sum = (v: number[]) => v.reduce((s, x) => s + x, 0);
const avg = (v: number[]) => (v.length ? sum(v) / v.length : NaN);

/** Variance d'échantillon (n − 1). */
export function variance(v: number[]): number {
  if (v.length < 2) return NaN;
  const m = avg(v);
  return sum(v.map((x) => (x - m) ** 2)) / (v.length - 1);
}

/** Corrélation de Pearson ; NaN si l'une des deux séries ne varie pas. */
export function pearson(x: number[], y: number[]): number {
  const mx = avg(x);
  const my = avg(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
}

const column = (rows: number[][], j: number) => rows.map((r) => r[j]);

/** Alpha de Cronbach ; null si moins de deux affirmations ou de trois membres. */
export function cronbachAlpha(rows: number[][]): number | null {
  const k = rows[0]?.length ?? 0;
  if (k < 2 || rows.length < 3) return null;
  const itemVar = sum(
    Array.from({ length: k }, (_, j) => variance(column(rows, j))),
  );
  const totalVar = variance(rows.map(sum));
  if (!totalVar || Number.isNaN(totalVar)) return null;
  return (k / (k - 1)) * (1 - itemVar / totalVar);
}

/** Alpha de l'échelle sans chacune de ses affirmations. */
export function alphaIfDeleted(rows: number[][]): Array<number | null> {
  const k = rows[0]?.length ?? 0;
  return Array.from({ length: k }, (_, j) =>
    cronbachAlpha(rows.map((r) => r.filter((_, i) => i !== j))),
  );
}

/** Corrélation de chaque affirmation avec la somme des autres (corrigée). */
export function correctedItemTotal(rows: number[][]): number[] {
  const k = rows[0]?.length ?? 0;
  return Array.from({ length: k }, (_, j) =>
    pearson(
      column(rows, j),
      rows.map((r) => sum(r) - r[j]),
    ),
  );
}

/** Matrice de corrélation des affirmations ; null si l'une ne varie pas. */
export function correlationMatrix(rows: number[][]): number[][] | null {
  const k = rows[0]?.length ?? 0;
  const cols = Array.from({ length: k }, (_, j) => column(rows, j));
  const r = cols.map((x) => cols.map((y) => pearson(x, y)));
  return r.some((line) => line.some((v) => Number.isNaN(v))) ? null : r;
}

/** Plus grande valeur propre et vecteur propre d'une matrice symétrique (puissance itérée). */
function leadingEigen(m: number[][]): { value: number; vector: number[] } {
  const k = m.length;
  let v = Array.from({ length: k }, () => 1 / Math.sqrt(k));
  let value = 0;
  for (let it = 0; it < 500; it++) {
    const w = m.map((line) => sum(line.map((x, j) => x * v[j])));
    const norm = Math.sqrt(sum(w.map((x) => x * x)));
    if (!norm) return { value: 0, vector: v };
    const next = w.map((x) => x / norm);
    value = sum(next.map((x, i) => x * w[i]));
    const delta = Math.max(...next.map((x, i) => Math.abs(x - v[i])));
    v = next;
    if (delta < 1e-10) break;
  }
  return { value, vector: v };
}

/**
 * Saturations d'un modèle à un facteur (factorisation en axes principaux,
 * communautés itérées). Signe choisi pour que leur somme soit positive.
 */
export function oneFactorLoadings(rows: number[][]): number[] | null {
  const r = correlationMatrix(rows);
  if (!r || r.length < 2) return null;
  const k = r.length;
  let h = r.map((line, i) =>
    Math.max(...line.filter((_, j) => j !== i).map(Math.abs)),
  );
  let loadings = new Array<number>(k).fill(0);
  for (let it = 0; it < 200; it++) {
    const reduced = r.map((line, i) =>
      line.map((x, j) => (i === j ? h[i] : x)),
    );
    const { value, vector } = leadingEigen(reduced);
    if (value <= 0) return null;
    loadings = vector.map((x) => x * Math.sqrt(value));
    const next = loadings.map((l) => Math.min(0.995, l * l));
    const delta = Math.max(...next.map((x, i) => Math.abs(x - h[i])));
    h = next;
    if (delta < 1e-8) break;
  }
  return sum(loadings) < 0 ? loadings.map((l) => -l) : loadings;
}

/** Oméga (McDonald) d'un modèle à un facteur ; null s'il ne peut être estimé. */
export function omegaTotal(rows: number[][]): number | null {
  if (rows.length < 3) return null;
  const loadings = oneFactorLoadings(rows);
  if (!loadings) return null;
  const common = sum(loadings) ** 2;
  const unique = sum(loadings.map((l) => 1 - l * l));
  return common / (common + unique);
}

/** Moyenne, écart-type et quartiles d'une série. */
export function describe(values: number[]): {
  n: number;
  mean: number;
  sd: number;
  q1: number;
  median: number;
  q3: number;
} {
  const s = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    if (!s.length) return NaN;
    const i = (s.length - 1) * p;
    const lo = Math.floor(i);
    return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
  };
  return {
    n: s.length,
    mean: avg(s),
    sd: Math.sqrt(variance(s)),
    q1: q(0.25),
    median: q(0.5),
    q3: q(0.75),
  };
}
