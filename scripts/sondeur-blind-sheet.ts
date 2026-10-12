/**
 * Fiche à l'aveugle pour le contrôle humain d'un essai du banc Sondeur.
 *
 *   npx ts-node --skipProject --transpile-only scripts/sondeur-blind-sheet.ts <run> [total=30]
 *
 * Lit docs/sondeur-benchmark/<run>/screen-runs.json et corpus-screen.json.
 * Retient des questions FR qui ont passé le contrôle déterministe, réparties
 * entre les modèles (5 à 7 chacun), mélangées. Écrit :
 *   - blind-sheet.md : numéro, sujet, écart détecté, question (aucun nom de modèle) ;
 *   - blind-key.json : correspondance numéro → modèle, couple, preuves ;
 *   - control-summary.json : rejets du contrôle, coût, latence par modèle.
 * Aucun appel réseau ; couples synthétiques uniquement.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Gap {
  id: string;
  kind: string;
  topic: string;
  a: string | null;
  b: string | null;
}
interface Case {
  id: string;
  scenario: string;
  topics: string[];
  gaps: Gap[];
}
interface Question {
  theme?: string;
  text: string;
  evidence?: string[];
}
interface Run {
  model: string;
  caseId: string;
  drafted: number;
  passedGate: number;
  formRejected: number;
  evidenceRejected: number;
  reasons: Record<string, number>;
  costMicro: number;
  latencyMs: number;
  questions: Question[];
  error?: string;
  run?: string;
}

export interface SheetLine {
  n: number;
  subject: string;
  gap: string;
  question: string;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
}

const short = (t: string) => (t.length > 70 ? `${t.slice(0, 67)}…` : t);

/** Écart en une ligne, à partir des preuves citées par la question. */
export function gapLine(c: Case, evidence: string[] = []): string {
  const cited = c.gaps.filter((g) => evidence.includes(g.id));
  if (c.scenario === 'aucun_ecart' || c.gaps.length === 0)
    return 'Aucun écart détecté';
  const g = cited[0] ?? c.gaps[0];
  if (g.kind === 'safety') return `Signal de sécurité (${g.topic})`;
  if (!g.a || !g.b) return `${g.topic} (sujet seulement)`;
  return `${g.topic} : A « ${short(g.a)} », B « ${short(g.b)} »`;
}

/** Choix équilibré : 5 à 7 questions par modèle, couples variés, ordre mélangé. */
export function pick(
  runs: Run[],
  cases: Map<string, Case>,
  total = 30,
  seed = 42,
): Array<SheetLine & { model: string; caseId: string; evidence: string[] }> {
  const r = rng(seed);
  // Seuls les modèles qui ont produit des questions figurent sur la fiche.
  const models = [
    ...new Set(runs.filter((x) => x.questions.length).map((x) => x.model)),
  ];
  const pool = new Map<string, Array<{ q: Question; caseId: string }>>();
  for (const m of models) {
    // Tour par couple : une question de chaque couple avant la deuxième.
    const byCase = runs
      .filter((x) => x.model === m && !x.error)
      .map((x) => x.questions.map((q) => ({ q, caseId: x.caseId })));
    const list: Array<{ q: Question; caseId: string }> = [];
    for (let i = 0; byCase.some((l) => l[i]); i++)
      for (const l of byCase) if (l[i]) list.push(l[i]);
    pool.set(m, list);
  }
  const per = Math.max(
    5,
    Math.min(7, Math.floor(total / Math.max(1, models.length))),
  );
  const chosen: Array<{ model: string; q: Question; caseId: string }> = [];
  for (const m of models)
    for (const x of (pool.get(m) ?? []).slice(0, per))
      chosen.push({ model: m, ...x });
  // Complète jusqu'au total sans dépasser 7 par modèle.
  for (const m of models)
    for (const x of (pool.get(m) ?? []).slice(per, 7))
      if (chosen.length < total) chosen.push({ model: m, ...x });
  const lines = chosen.slice(0, total);
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [lines[i], lines[j]] = [lines[j], lines[i]];
  }
  return lines.map((x, i) => {
    const c = cases.get(x.caseId)!;
    const ev = x.q.evidence ?? [];
    const g = c.gaps.find((y) => ev.includes(y.id));
    return {
      n: i + 1,
      subject: g?.topic ?? x.q.theme ?? c.topics[0] ?? '',
      gap: gapLine(c, ev),
      question: x.q.text,
      model: x.model,
      caseId: x.caseId,
      evidence: ev,
    };
  });
}

function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

/** Résumé par modèle et par essai (une relance n'est pas mêlée à l'essai initial). */
export function controlSummary(runs: Run[]) {
  const keys = [...new Set(runs.map((x) => `${x.model}|${x.run ?? ''}`))];
  return keys.map((key) => {
    const [m, run] = key.split('|');
    const rs = runs.filter((x) => x.model === m && (x.run ?? '') === run);
    const reasons: Record<string, number> = {};
    for (const x of rs)
      for (const [k, v] of Object.entries(x.reasons))
        reasons[k] = (reasons[k] ?? 0) + v;
    return {
      model: m,
      ...(run ? { run } : {}),
      cases: rs.length,
      errors: rs.filter((x) => x.error).length,
      drafted: rs.reduce((a, x) => a + x.drafted, 0),
      passed: rs.reduce((a, x) => a + x.passedGate, 0),
      formRejected: rs.reduce((a, x) => a + x.formRejected, 0),
      evidenceRejected: rs.reduce((a, x) => a + x.evidenceRejected, 0),
      reasons,
      costEur: rs.reduce((a, x) => a + x.costMicro, 0) / 1e6,
      latencyP50s:
        quantile(
          rs.map((x) => x.latencyMs),
          0.5,
        ) / 1000,
    };
  });
}

if (require.main === module) {
  // Plusieurs essais séparés par des virgules (ex. un essai et sa relance) :
  // la fiche et ses fichiers sont écrits dans le premier.
  const names = (process.argv[2] ?? '').split(',').filter(Boolean);
  if (!names.length) {
    console.error('Usage : sondeur-blind-sheet.ts <run[,run2]> [total]');
    process.exit(2);
  }
  const run = names.join(' + ');
  const total = Number(process.argv[3] ?? 30);
  const base = join(__dirname, '..', 'docs', 'sondeur-benchmark');
  const dir = join(base, names[0]);
  const runs: Run[] = [];
  const cases = new Map<string, Case>();
  for (const n of names) {
    for (const x of JSON.parse(
      readFileSync(join(base, n, 'screen-runs.json'), 'utf8'),
    ) as Run[])
      runs.push({ ...x, run: n });
    for (const c of JSON.parse(
      readFileSync(join(base, n, 'corpus-screen.json'), 'utf8'),
    ) as Case[])
      cases.set(c.id, c);
  }
  const lines = pick(runs, cases, total);
  const md = [
    `# Fiche à l'aveugle — Sondeur (essai ${run})`,
    '',
    'Couples synthétiques. Questions FR ayant passé le contrôle déterministe, mélangées.',
    'Pour chaque question : note de 1 à 5 et commentaire libre.',
    '',
    ...lines.map(
      (l) =>
        `${l.n}. [${l.subject}] Écart : ${l.gap}\n   Question : ${l.question}\n   Note : __ /5`,
    ),
    '',
  ].join('\n');
  writeFileSync(join(dir, 'blind-sheet.md'), md);
  writeFileSync(
    join(dir, 'blind-key.json'),
    JSON.stringify(
      lines.map(({ n, model, caseId, evidence }) => ({
        n,
        model,
        caseId,
        evidence,
      })),
      null,
      2,
    ),
  );
  const sum = controlSummary(runs);
  writeFileSync(
    join(dir, 'control-summary.json'),
    JSON.stringify(sum, null, 2),
  );
  console.log(md);
  for (const s of sum)
    console.log(
      `${s.model}${s.run ? ` (${s.run})` : ''} : ${s.drafted} rédigées, ${s.passed} retenues, rejets forme ${s.formRejected} / preuve ${s.evidenceRejected} ${JSON.stringify(s.reasons)}, ${s.costEur.toFixed(4)} €, latence P50 ${s.latencyP50s.toFixed(1)} s, erreurs ${s.errors}`,
    );
}
