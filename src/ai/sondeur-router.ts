/**
 * Routeur des modèles du Sondeur.
 *
 * Les modèles utilisables sont ceux QUALIFIÉS par le banc d'essai
 * (scripts/sondeur-benchmark.ts), écrits dans config/sondeur-models.json.
 * Un modèle nouveau au catalogue n'est jamais utilisé tant qu'il n'a pas été
 * mesuré : NOUVEAU → BANC D'ESSAI → QUALIFIÉ → ÉLIGIBLE.
 *
 * Rôles :
 * - writer : rédige les questions candidates ;
 * - critic : relit, toujours d'une autre famille que le rédacteur ;
 * - escalation : modèle haut de gamme, seulement quand la relecture rejette
 *   trop (signal de difficulté) ;
 * - fallback : rédacteur de secours qualifié ; sans lui, gabarits déterministes.
 *
 * Sans fichier de qualification, le routeur reste en mode « provisoire » :
 * les préférences historiques sont utilisées et chaque trace le signale.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { sameFamily } from './groq-model';
import { OPENROUTER_PREFERENCES } from './openrouter.config';

export type SondeurRole = 'writer' | 'critic' | 'escalation' | 'fallback';

export interface Qualification {
  /** Date et identifiant du banc d'essai qui a qualifié ces modèles. */
  generatedAt: string;
  run: string;
  writer: string[];
  critic: string[];
  escalation: string[];
  fallback: string[];
  /** Part des questions rejetées par le relecteur au-delà de laquelle on escalade. */
  escalateAboveRejectRate: number;
  /**
   * Second avis : un relecteur d'une troisième famille (liste `critic`)
   * tranche chaque refus du premier.
   */
  criticVote?: boolean;
  /**
   * Rédaction des questions par l'IA (V8.3). `enabled: false` : repli complet
   * sur les questions déterministes déjà validées. `disabledThemes` /
   * `disabledFrames` : repli pour ces thèmes d'écart ou ces cadres seulement.
   * Réactiver : remettre `enabled` à true et vider les listes.
   */
  generation?: {
    enabled?: boolean;
    disabledThemes?: string[];
    disabledFrames?: string[];
  };
  /** Rédacteur par langue si le banc d'essai l'a justifié (sinon writer). */
  byLanguage?: Partial<Record<'fr' | 'en', string[]>>;
}

export const QUALIFICATION_FILE =
  process.env.SONDEUR_MODELS_FILE ??
  join(__dirname, '..', '..', 'config', 'sondeur-models.json');

/** Seuil d'escalade par défaut (mode provisoire). */
export const DEFAULT_ESCALATE_ABOVE = 0.5;

let cached: { at: number; value: Qualification | null } | null = null;

/** Qualification en vigueur (relue au plus toutes les 5 minutes). */
export function qualification(now = Date.now()): Qualification | null {
  if (cached && now - cached.at < 5 * 60_000) return cached.value;
  let value: Qualification | null = null;
  try {
    if (existsSync(QUALIFICATION_FILE)) {
      const raw = JSON.parse(
        readFileSync(QUALIFICATION_FILE, 'utf8'),
      ) as Qualification;
      value = isValidQualification(raw) ? raw : null;
    }
  } catch {
    value = null;
  }
  cached = { at: now, value };
  return value;
}

/**
 * FAIL-CLOSED : la rédaction IA du Sondeur (questions, relances, escalade,
 * relecture de rédaction) n'est active que si le fichier de qualification
 * existe, se lit, est valide ET porte `generation.enabled === true` (le
 * booléen, rien d'autre). Fichier absent, JSON invalide, `enabled` absent,
 * `"true"` en chaîne, `false` : désactivée, aucun appel, gabarits
 * déterministes. Rien ne la réactive tout seul.
 */
export function sondeurGenerationEnabled(q = qualification()): boolean {
  return !!q && q.generation?.enabled === true;
}

/** L'IA rédige-t-elle les questions du Sondeur ? (repli déterministe sinon) */
export function aiGenerationEnabled(q = qualification()): boolean {
  return sondeurGenerationEnabled(q);
}

/**
 * Thème ou cadre désactivé dans la qualification : la question de l'IA est
 * écartée (repli). Le verrou global (fail-closed) est appliqué à l'appel de
 * l'IA (aucune question n'est alors rédigée) ; ce contrôle porte sur une
 * question déjà rédigée.
 */
export function aiGenerationBlocked(
  theme: string,
  frameId: string | null,
  q = qualification(),
): boolean {
  const g = q?.generation;
  if (!g) return false;
  return (
    !!g.disabledThemes?.includes(theme) ||
    (!!frameId && !!g.disabledFrames?.includes(frameId))
  );
}

/** Pour les tests : qualification imposée (null : aucune). */
export function setQualificationForTests(q: Qualification | null) {
  cached = { at: Number.MAX_SAFE_INTEGER / 2, value: q };
}

/** Pour les tests. */
export function resetQualificationCache() {
  cached = null;
}

export function isValidQualification(q: unknown): q is Qualification {
  const v = q as Qualification;
  const list = (x: unknown) =>
    Array.isArray(x) &&
    x.every((m) => typeof m === 'string' && m.includes('/'));
  return (
    !!v &&
    list(v.writer) &&
    v.writer.length > 0 &&
    list(v.critic) &&
    v.critic.length > 0 &&
    list(v.escalation) &&
    list(v.fallback) &&
    typeof v.escalateAboveRejectRate === 'number' &&
    // Aucun modèle gratuit : leurs fournisseurs peuvent garder les données.
    ![...v.writer, ...v.critic, ...v.escalation, ...v.fallback].some((m) =>
      /:free$/.test(m),
    )
  );
}

/**
 * Modèles d'un rôle, dans l'ordre de préférence, sans la famille à éviter
 * (le relecteur n'est jamais de la famille du rédacteur).
 */
export function modelsFor(
  role: SondeurRole,
  options: {
    avoid?: string | readonly string[];
    lang?: 'fr' | 'en';
    q?: Qualification | null;
    /**
     * Rédaction du Sondeur (fail-closed) : seulement les modèles qualifiés,
     * jamais les préférences historiques ou provisoires.
     */
    strict?: boolean;
  } = {},
): { models: string[]; qualified: boolean } {
  const q = options.q === undefined ? qualification() : options.q;
  const keep = (list: string[]) =>
    [...new Set(list)].filter(
      (m) => !/:free$/.test(m) && !sameFamily(m, options.avoid),
    );
  if (!q && options.strict) return { models: [], qualified: false };
  if (!q) {
    // Mode provisoire : préférences historiques (rédacteur Claude, relecteur GPT).
    const legacy: Record<SondeurRole, string[]> = {
      writer: OPENROUTER_PREFERENCES.quality,
      critic: OPENROUTER_PREFERENCES.critic,
      escalation: OPENROUTER_PREFERENCES.quality.slice(0, 1),
      fallback: OPENROUTER_PREFERENCES.quality.slice(1),
    };
    return { models: keep(legacy[role]), qualified: false };
  }
  const base =
    role === 'writer' && options.lang && q.byLanguage?.[options.lang]?.length
      ? q.byLanguage[options.lang]!
      : q[role];
  return { models: keep(base), qualified: true };
}

/** Une variable d'environnement ne peut choisir qu'un modèle déjà qualifié. */
export function restrictToQualified(
  wanted: string[],
  role: SondeurRole,
  q: Qualification | null = qualification(),
): string[] {
  if (!q) return wanted;
  const allowed = new Set([
    ...q[role],
    ...(q.byLanguage?.fr ?? []),
    ...(q.byLanguage?.en ?? []),
  ]);
  return wanted.filter((m) => allowed.has(m));
}

/**
 * Escalade vers le modèle haut de gamme : seulement quand la relecture a
 * rejeté une trop grande part des questions d'un jour (ou qu'aucune n'a
 * survécu). Le haut de gamme n'intervient que là où il apporte quelque chose.
 */
export function shouldEscalate(
  review: { proposed: number; accepted: number },
  q: Qualification | null = qualification(),
): boolean {
  if (review.proposed === 0) return false;
  const threshold = q?.escalateAboveRejectRate ?? DEFAULT_ESCALATE_ABOVE;
  const rejectRate = 1 - review.accepted / review.proposed;
  return review.accepted === 0 || rejectRate > threshold;
}

/** Trace d'un appel du Sondeur (coût, latence, modèle, qualification). */
export interface RouterTrace {
  role: SondeurRole;
  model: string;
  qualified: boolean;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costMicroEur: number;
  ok: boolean;
}

const TRACE_LIMIT = 2_000;
const traces: RouterTrace[] = [];

export function recordTrace(t: RouterTrace) {
  traces.push(t);
  if (traces.length > TRACE_LIMIT) traces.shift();
}

/** Résumé des derniers appels : coût et latence par rôle et par modèle. */
export function traceSummary() {
  const by = new Map<
    string,
    {
      calls: number;
      failures: number;
      costMicroEur: number;
      latencies: number[];
    }
  >();
  for (const t of traces) {
    const key = `${t.role}:${t.model}`;
    const e = by.get(key) ?? {
      calls: 0,
      failures: 0,
      costMicroEur: 0,
      latencies: [],
    };
    e.calls += 1;
    if (!t.ok) e.failures += 1;
    e.costMicroEur += t.costMicroEur;
    e.latencies.push(t.latencyMs);
    by.set(key, e);
  }
  return [...by.entries()].map(([key, e]) => {
    const sorted = [...e.latencies].sort((a, b) => a - b);
    const p = (x: number) =>
      sorted[Math.min(sorted.length - 1, Math.floor(x * sorted.length))] ?? 0;
    return {
      key,
      calls: e.calls,
      failures: e.failures,
      costEur: e.costMicroEur / 1_000_000,
      latencyP50: p(0.5),
      latencyP90: p(0.9),
    };
  });
}
