/**
 * Rapport de validation psychométrique du Grand Entretien (V7.1), en
 * Markdown, à partir des réponses brutes d'entretiens terminés. Utilisé par
 * `scripts/psychometric-validation.ts` (lecture seule) ; protocole dans
 * `docs/VALIDATION_CLINIQUE.md`.
 *
 * Aucune donnée personnelle n'entre dans le rapport : seulement des
 * effectifs, des moyennes et des coefficients par échelle et par affirmation.
 */
import { isV7Interview } from '../interview/questions.data';
import type { RawAnswers } from '../matching/divergence.engine';
import {
  Item,
  SCALES,
  ScaleName,
  STYLE_HIGH,
  STYLE_LOW,
  buildPsychProfile,
} from './psychometrics';
import {
  alphaIfDeleted,
  correctedItemTotal,
  cronbachAlpha,
  describe,
  omegaTotal,
} from './reliability';

/** Effectif minimal du protocole (docs/VALIDATION_CLINIQUE.md). */
export const MIN_SAMPLE = 300;
/** Seuil de fiabilité attendu pour une échelle (alpha ou oméga). */
export const MIN_RELIABILITY = 0.7;
/** Corrélation item-total corrigée en dessous de laquelle une affirmation est à revoir. */
export const MIN_ITEM_TOTAL = 0.3;

const KEYS = ['A', 'B', 'C', 'D', 'E'];
const POINTS: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };

/**
 * Base de données locale : hôte localhost, 127.0.0.1 ou ::1, ou socket Unix.
 * Toute autre adresse est refusée par le script sans `--allow-remote`.
 */
export function isLocalDatabase(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) return false;
  const socket = parsed.searchParams.get('host');
  if (socket) return socket.startsWith('/');
  return ['localhost', '127.0.0.1', '[::1]', '::1', ''].includes(
    parsed.hostname,
  );
}

/** Adresse affichée dans le rapport : hôte, port et base, jamais d'identifiants. */
export function describeSource(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname || 'socket'}${u.port ? `:${u.port}` : ''}${u.pathname}`;
  } catch {
    return 'adresse illisible';
  }
}

const fmt = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || Number.isNaN(v)
    ? '—'
    : v.toFixed(digits).replace('.', ',');
const pct = (part: number, total: number) =>
  total ? `${Math.round((part / total) * 100)} %` : '—';

/** Note 1–5 d'une affirmation, inversée si besoin ; null sans réponse unique. */
function itemValue(answers: RawAnswers, item: Item): number | null {
  const v = POINTS[answers[item.id] ?? ''];
  if (v === undefined) return null;
  return item.reverse ? 6 - v : v;
}

interface ScaleStats {
  name: ScaleName;
  label: string;
  items: Item[];
  complete: number;
  alpha: number | null;
  omega: number | null;
  itemTotal: number[];
  alphaWithout: Array<number | null>;
  scores: ReturnType<typeof describe>;
  zones: { low: number; mid: number; high: number };
  contradictions: number | null;
  answered: number;
  distributions: Array<Record<string, number>>;
  itemMeans: Array<ReturnType<typeof describe>>;
}

function scaleStats(name: ScaleName, members: RawAnswers[]): ScaleStats | null {
  const def = SCALES[name];
  const items = def.items;
  // Réponses complètes à l'échelle (calcul de fiabilité, cas complets).
  const rows = members
    .map((m) => items.map((i) => itemValue(m, i)))
    .filter((r): r is number[] => r.every((v) => v !== null));
  const answered = members.filter((m) => items.some((i) => m[i.id])).length;
  if (!answered) return null;
  const scores = rows.map((r) =>
    Math.round(((r.reduce((s, v) => s + v, 0) / r.length - 1) / 4) * 100),
  );
  const direct = items.filter((i) => !i.reverse);
  const reversed = items.filter((i) => i.reverse);
  // D'accord (4 ou 5 en note brute) avec l'affirmation et avec son contraire.
  const agrees = (m: RawAnswers, list: Item[]) => {
    const raw = list
      .map((i) => POINTS[m[i.id] ?? ''])
      .filter((v) => v !== undefined);
    return raw.length > 0 && raw.reduce((s, v) => s + v, 0) / raw.length >= 4;
  };
  return {
    name,
    label: def.label,
    items,
    complete: rows.length,
    alpha: cronbachAlpha(rows),
    omega: omegaTotal(rows),
    itemTotal: rows.length >= 3 ? correctedItemTotal(rows) : [],
    alphaWithout: rows.length >= 3 ? alphaIfDeleted(rows) : [],
    scores: describe(scores),
    zones: {
      low: scores.filter((s) => s <= STYLE_LOW).length,
      mid: scores.filter((s) => s > STYLE_LOW && s < STYLE_HIGH).length,
      high: scores.filter((s) => s >= STYLE_HIGH).length,
    },
    contradictions:
      direct.length && reversed.length
        ? members.filter((m) => agrees(m, direct) && agrees(m, reversed)).length
        : null,
    answered,
    distributions: items.map((i) => {
      const counts: Record<string, number> = {};
      for (const k of KEYS)
        counts[k] = members.filter((m) => m[i.id] === k).length;
      return counts;
    }),
    itemMeans: items.map((i) =>
      describe(
        members
          .map((m) => itemValue(m, i))
          .filter((v): v is number => v !== null),
      ),
    ),
  };
}

function verdict(s: ScaleStats): string {
  if (s.complete < 30) return 'effectif trop faible';
  const best = Math.max(s.alpha ?? -1, s.omega ?? -1);
  if (best >= MIN_RELIABILITY) return 'fiable';
  if (best >= 0.6) return 'à surveiller';
  return 'à revoir';
}

/** Rapport Markdown de validation psychométrique. */
export function buildValidationReport(
  members: RawAnswers[],
  meta: { source: string; date: string },
): string {
  const n = members.length;
  const v7 = members.filter((m) => isV7Interview(m)).length;
  const profiles = members.map((m) => buildPsychProfile(m));
  const acquiescent = profiles.filter((p) => p.acquiescent).length;
  const idealized = profiles.filter((p) => p.idealized).length;
  const stats = (Object.keys(SCALES) as ScaleName[])
    .map((name) => scaleStats(name, members))
    .filter((s): s is ScaleStats => s !== null);

  const out: string[] = [];
  out.push('# Validation psychométrique du Grand Entretien (V7.1)');
  out.push('');
  out.push(`- Source : ${meta.source} (lecture seule)`);
  out.push(`- Date : ${meta.date}`);
  out.push(
    `- Entretiens terminés : ${n} (dont ${v7} V7, ${n - v7} antérieurs ; seules les affirmations V7 sont analysées)`,
  );
  out.push(
    `- Seuils : fiabilité ≥ ${fmt(MIN_RELIABILITY)} (alpha ou oméga), corrélation item-total corrigée ≥ ${fmt(MIN_ITEM_TOTAL)}, zones ${STYLE_LOW} / ${STYLE_HIGH} sur 100`,
  );
  if (n < MIN_SAMPLE)
    out.push(
      `- **Échantillon insuffisant (${n} < ${MIN_SAMPLE}) : résultats indicatifs, aucun seuil ne doit être recalé sur cette base.**`,
    );
  out.push('');
  out.push('## Réponses suspectes');
  out.push('');
  out.push(
    `- Acquiescement (d'accord avec une affirmation et son contraire sur trois échelles, ou toujours la même réponse) : ${acquiescent} entretiens (${pct(acquiescent, n)}).`,
  );
  out.push(
    `- Portrait idéalisé (contrôle de sincérité) : ${idealized} entretiens (${pct(idealized, n)}).`,
  );
  out.push('');
  out.push('## Synthèse par échelle');
  out.push('');
  out.push(
    '| Échelle | Affirmations | Cas complets | Alpha | Oméga | r item-total min | Moyenne /100 | Écart-type | ≤ 40 | 40–60 | ≥ 60 | Contradictions | Verdict |',
  );
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of stats) {
    const minR = s.itemTotal.length ? Math.min(...s.itemTotal) : null;
    out.push(
      `| ${s.label} | ${s.items.length} | ${s.complete} | ${fmt(s.alpha)} | ${fmt(s.omega)} | ${fmt(minR)} | ${fmt(s.scores.mean, 0)} | ${fmt(s.scores.sd, 0)} | ${pct(s.zones.low, s.complete)} | ${pct(s.zones.mid, s.complete)} | ${pct(s.zones.high, s.complete)} | ${s.contradictions === null ? '—' : pct(s.contradictions, s.answered)} | ${verdict(s)} |`,
    );
  }
  out.push('');
  out.push('## Détail par échelle');
  for (const s of stats) {
    out.push('');
    out.push(`### ${s.label}`);
    out.push('');
    out.push(
      `Cas complets : ${s.complete} sur ${s.answered} répondants. Alpha ${fmt(s.alpha)}, oméga ${fmt(s.omega)}. Score /100 : médiane ${fmt(s.scores.median, 0)}, quartiles ${fmt(s.scores.q1, 0)}–${fmt(s.scores.q3, 0)}.`,
    );
    out.push('');
    out.push(
      '| Affirmation | Inversée | Moyenne /5 | Écart-type | r item-total | Alpha sans elle | A | B | C | D | E |',
    );
    out.push('|---|---|---|---|---|---|---|---|---|---|---|');
    s.items.forEach((item, j) => {
      const d = s.distributions[j];
      const total = KEYS.reduce((t, k) => t + d[k], 0);
      const r = s.itemTotal[j];
      const flag = r !== undefined && r < MIN_ITEM_TOTAL ? ' ⚠' : '';
      out.push(
        `| ${item.id} | ${item.reverse ? 'oui' : 'non'} | ${fmt(s.itemMeans[j].mean)} | ${fmt(s.itemMeans[j].sd)} | ${fmt(r)}${flag} | ${fmt(s.alphaWithout[j])} | ${KEYS.map((k) => pct(d[k], total)).join(' | ')} |`,
      );
    });
  }
  out.push('');
  out.push('## Lecture');
  out.push('');
  out.push(
    "- Une échelle « à revoir » (alpha et oméga < 0,60) ne doit plus produire de divergence ni d'observation tant que ses affirmations n'ont pas été reprises.",
  );
  out.push(
    '- Une affirmation marquée ⚠ (r item-total < 0,30) et dont le retrait fait monter l’alpha est la première à reformuler.',
  );
  out.push(
    `- Les zones ${STYLE_LOW} / ${STYLE_HIGH} ne se recalent qu'au-delà de ${MIN_SAMPLE} entretiens, selon la procédure de docs/VALIDATION_CLINIQUE.md.`,
  );
  return out.join('\n') + '\n';
}
