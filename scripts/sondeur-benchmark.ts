/**
 * Banc d'essai des modèles du Sondeur — couples SYNTHÉTIQUES uniquement.
 *
 * Mesure, ne suppose rien : catalogue OpenRouter réel du jour, même prompt de
 * production pour tous, même contrôle du code, juges aveugles de deux familles,
 * seuils de qualité d'abord, coût ensuite. Écrit des résultats JSON/CSV et,
 * avec --qualify, le fichier de qualification lu par le routeur
 * (config/sondeur-models.json). Rien n'est qualifié si les seuils ne sont pas
 * atteints.
 *
 *   OPENROUTER_API_KEY=... (ou OPENROUTER_AUTH=proxy NODE_USE_ENV_PROXY=1) BENCH_MAX_EUR=20 npx ts-node --skipProject --transpile-only \
 *     -O '{"module":"commonjs","esModuleInterop":true}' scripts/sondeur-benchmark.ts all [--qualify]
 *
 * Étapes : catalog | screen | judge | final | critic | cost | select | all (corpus : aperçu sans réseau).
 * Aucune base de données n'est utilisée ; aucune donnée réelle de membre.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AiService } from '../src/ai/ai.service';
import {
  OpenRouterService,
  openRouterAccountError,
  openRouterAuthAvailable,
  openRouterAuthHeaders,
} from '../src/ai/openrouter.service';
import { OpenRouterRole } from '../src/ai/openrouter.config';
import { modelFamily } from '../src/ai/groq-model';
import {
  buildDivergenceReport,
  DivergenceReport,
} from '../src/matching/divergence.engine';
import { V82_QUESTIONS } from '../src/interview/questions.v82';
import { draftReviewedSondeur } from '../src/journey/sondeur-ai';
import { describeCoupleContext } from '../src/journey/couple-context';
import { describeReportForAi } from '../src/journey/sondeur.generator';
import { isNonNegotiable } from '../src/journey/sondeur.pool';
import {
  EvidencedQuestion,
  buildEvidence,
  describeEvidenceForAi,
  validate,
} from '../src/journey/sondeur-evidence';
import { INDEX } from '../src/journey/sondeur-evidence.corpus';
import { HarmonyQuestionPayload } from '../src/journey/harmony-question.types';
import {
  dayReadingPrompt,
  fidelityPrompt,
  followUpPrompt,
  reviewPrompt,
  AnsweredItem,
} from '../src/journey/sondeur-insights';

const step = process.argv[2] ?? 'all';
const QUALIFY = process.argv.includes('--qualify');
const RUN = process.env.BENCH_RUN ?? new Date().toISOString().slice(0, 10);
const OUT = join(__dirname, '..', 'docs', 'sondeur-benchmark', RUN);
const MAX_EUR = Number(process.env.BENCH_MAX_EUR ?? 20);
const SCREEN_CASES = Number(process.env.BENCH_SCREEN_CASES ?? 6);
const FINAL_CASES = Number(process.env.BENCH_FINAL_CASES ?? 40);
const FINALISTS = Number(process.env.BENCH_FINALISTS ?? 4);
// Essai réduit : corpus ciblé par sujets, sans juges IA (contrôle humain).
const TOPICS = (process.env.BENCH_TOPICS ?? '').split(',').filter(Boolean);
// Couples tenus à l'écart (graines disjointes), jamais vus pendant le réglage.
const HELDOUT = (process.env.BENCH_HELDOUT_TOPICS ?? '')
  .split(',')
  .filter(Boolean);
const NO_JUDGES = process.env.BENCH_NO_JUDGES === '1';
// Relecteurs imposés (liste) : le premier d'une autre famille que le
// rédacteur relit. BENCH_ESCALATION : modèle qui réécrit un jour rejeté.
const CRITICS = (process.env.BENCH_CRITIC ?? '').split(',').filter(Boolean);
const ESCALATION = process.env.BENCH_ESCALATION ?? '';
// Plafond de couples par modèle (« modèle=n,… ») : un modèle cher sur moins de cas.
const CASES_PER_MODEL: Record<string, number> = Object.fromEntries(
  (process.env.BENCH_CASES_PER_MODEL ?? '')
    .split(',')
    .filter((x) => x.includes('='))
    .map((x) => [x.split('=')[0], Number(x.split('=')[1])]),
);
mkdirSync(OUT, { recursive: true });
const save = (name: string, data: unknown) =>
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2));
const load = <T>(name: string): T | null =>
  existsSync(join(OUT, name))
    ? (JSON.parse(readFileSync(join(OUT, name), 'utf8')) as T)
    : null;

// ─── Budget strict de l'essai ────────────────────────────────────────────────
let spentMicro = Number(
  load<{ spentMicro: number }>('budget.json')?.spentMicro ?? 0,
);
const cap = Math.round(MAX_EUR * 1_000_000);
// Dépense réelle du compte depuis le début de l'essai (dollars comptés comme
// euros, donc par excès) : les appels facturés sans réponse exploitable
// (réponse vide, JSON illisible) n'échappent pas au plafond.
let usageStart = load<{ usageStart?: number }>('budget.json')?.usageStart;
let realMicro = 0;
async function refreshRealSpend(): Promise<void> {
  try {
    const k = (await orGet('/key')) as { data?: { usage?: number } };
    const usage = Number(k.data?.usage);
    if (!Number.isFinite(usage)) return;
    if (usageStart === undefined) usageStart = usage;
    realMicro = Math.round((usage - usageStart) * 1e6);
    save('budget.json', { spentMicro, realMicro, usageStart, capMicro: cap });
  } catch {
    // Compteur injoignable : l'estimation par appel reste la limite.
  }
}
/** Vrai si l'essai doit s'arrêter (dépense réelle relue avant chaque appel). */
async function stop(): Promise<boolean> {
  await refreshRealSpend();
  return overBudget();
}
// Crédit épuisé ou authentification refusée : arrêt net, aucun résultat
// fabriqué à partir d'appels qui n'ont pas eu lieu.
const haltOnAccountError = () => {
  const err = openRouterAccountError();
  if (!err) return;
  save('halt.json', { status: err.status, message: err.message, spentMicro });
  console.error(
    `ARRÊT : erreur de compte OpenRouter (HTTP ${err.status}). Aucun modèle qualifié. ${err.message}`,
  );
  process.exit(2);
};
const lab = {
  allow: (estimate: number) => {
    haltOnAccountError();
    return Math.max(spentMicro, realMicro) + estimate <= cap;
  },
  add: (cost: number) => {
    spentMicro += cost;
    save('budget.json', { spentMicro, realMicro, usageStart, capMicro: cap });
  },
};
const overBudget = () => {
  haltOnAccountError();
  return Math.max(spentMicro, realMicro) >= cap;
};

// ─── 1. Catalogue réel ───────────────────────────────────────────────────────
/** Familles et motifs demandés (le catalogue du jour décide de ce qui existe). */
const WANTED = [
  /qwen.*(max|flash|plus|235b|3\.\d)/i,
  /deepseek/i,
  /z-ai\/glm|glm-/i,
  /moonshot|kimi/i,
  /anthropic\/claude-(sonnet|opus)/i,
  /openai\/gpt-(5|6)/i,
];

interface CatalogEntry {
  id: string;
  family: string;
  priceIn: number; // $ / M jetons
  priceOut: number;
  context: number;
  structuredOutput: boolean;
  reasoning: boolean;
  free: boolean;
  providers?: Array<{
    name: string;
    zdr?: boolean;
    dataPolicy?: unknown;
    latency?: number;
    uptime?: number;
  }>;
}

async function orGet(path: string): Promise<unknown> {
  const base =
    process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  const res = await fetch(`${base}${path}`, {
    headers: openRouterAuthHeaders(),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${path} : HTTP ${res.status}`);
  return res.json();
}

async function catalog(): Promise<CatalogEntry[]> {
  const body = (await orGet('/models')) as { data: Array<Record<string, any>> };
  const out: CatalogEntry[] = [];
  for (const m of body.data ?? []) {
    const id = String(m.id);
    if (!WANTED.some((r) => r.test(id))) continue;
    // Variantes « :batch » : refusées par chat/completions (HTTP 404).
    if (/:batch$/.test(id)) continue;
    const params: string[] = m.supported_parameters ?? [];
    const e: CatalogEntry = {
      id,
      family: modelFamily(id),
      priceIn: Number(m.pricing?.prompt ?? 0) * 1e6,
      priceOut: Number(m.pricing?.completion ?? 0) * 1e6,
      context: Number(m.context_length ?? 0),
      structuredOutput:
        params.includes('response_format') ||
        params.includes('structured_outputs'),
      reasoning:
        params.includes('reasoning') || params.includes('include_reasoning'),
      free:
        /:free$/.test(id) ||
        (Number(m.pricing?.prompt) === 0 &&
          Number(m.pricing?.completion) === 0),
    };
    // Fournisseurs : politique de données, ZDR, latence, disponibilité.
    try {
      const ep = (await orGet(`/models/${id}/endpoints`)) as {
        data?: { endpoints?: Array<Record<string, any>> };
      };
      e.providers = (ep.data?.endpoints ?? []).map((p) => ({
        name: String(p.provider_name ?? p.name),
        zdr: p.zdr ?? p.is_zdr ?? undefined,
        dataPolicy: p.data_policy ?? undefined,
        latency: p.latency_last_30m ?? undefined,
        uptime: p.uptime_last_30m ?? undefined,
      }));
    } catch {
      e.providers = undefined;
    }
    out.push(e);
  }
  save('catalog.json', out);
  writeFileSync(
    join(OUT, 'catalog.csv'),
    [
      'model_id,family,price_in,price_out,context,structured_output,reasoning,free,providers,zdr_any',
    ]
      .concat(
        out.map((e) =>
          [
            e.id,
            e.family,
            e.priceIn,
            e.priceOut,
            e.context,
            e.structuredOutput,
            e.reasoning,
            e.free,
            (e.providers ?? []).map((p) => p.name).join('|'),
            (e.providers ?? []).some((p) => p.zdr),
          ].join(','),
        ),
      )
      .join('\n'),
  );
  console.log(
    `Catalogue : ${out.length} candidats (${out.filter((e) => !e.free).length} payants)`,
  );
  return out;
}

// ─── 2. Corpus synthétique ───────────────────────────────────────────────────
type Scenario =
  | 'aucun_ecart'
  | 'petit_ecart'
  | 'ecart_important'
  | 'non_negociable'
  | 'apparent'
  | 'donnees_insuffisantes'
  | 'securite';
interface BenchCase {
  id: string;
  seed: number;
  scenario: Scenario;
  lang: 'fr' | 'en';
  a: Record<string, string>;
  b: Record<string, string>;
  topics: string[];
}

const TOPIC_PATTERNS: Array<[string, RegExp]> = [
  ['enfants', /enfant/i],
  ['mariage', /mariage|dot|mahr/i],
  ['religion', /religion|foi|spirit|prière|culte/i],
  ['éducation', /éducation|élever/i],
  ['lieu de vie', /lieu|ville|vivre|pays|déménag|mobilité|retour/i],
  ['argent', /argent|dette|compte|budget|dépens|épargn|famille.*aide|envoi/i],
  ['carrière', /carrière|travail|ambition|profession/i],
  ['temps de couple', /temps|sorties|loisir/i],
  ['famille', /famille|belle|parents|proche/i],
  ['rôles', /rôle|décid|tâche/i],
  ['intimité', /intim|sexual|pudeur|désir/i],
  ['fidélité', /fidél|jalous|ex\b|ancien partenaire/i],
  ['communication', /dispute|conflit|silence|communication|parler|colère/i],
  ['culture', /culture|tradition|langue|origine/i],
  ['mode de vie', /alcool|tabac|fête|mode de vie|alimentaire/i],
];

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
}
type Q = {
  id: string;
  input?: string;
  options: Array<{ key: string; freeText?: boolean; text: string }>;
};
const QS = V82_QUESTIONS as unknown as Q[];
function member(r: () => number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of QS) {
    if (q.input === 'ageRange') {
      out[q.id] = '27-40';
      continue;
    }
    const o = q.options.filter(
      (x) => !x.freeText && !/ne pas répondre/i.test(x.text),
    );
    if (o.length) out[q.id] = o[Math.floor(r() * o.length)].key;
  }
  return out;
}
function classify(rep: DivergenceReport, sparse: boolean): Scenario {
  if (rep.safetyHold || (rep.safetyAlerts ?? []).length) return 'securite';
  if (sparse) return 'donnees_insuffisantes';
  if (rep.divergences.some((d) => isNonNegotiable(d))) return 'non_negociable';
  if (
    rep.divergences.some(
      (d) => d.severity === 'critique' || d.severity === 'majeure',
    )
  )
    return 'ecart_important';
  if (rep.divergences.some((d) => d.undisclosed || d.neutral))
    return 'apparent';
  if (rep.divergences.length) return 'petit_ecart';
  return 'aucun_ecart';
}
/** Corpus équilibré par scénario ; graines disjointes entre dépistage et final. */
function corpus(n: number, seedBase: number): BenchCase[] {
  const want: Scenario[] = [
    'aucun_ecart',
    'petit_ecart',
    'ecart_important',
    'non_negociable',
    'apparent',
    'donnees_insuffisantes',
    'securite',
  ];
  const buckets = new Map<Scenario, BenchCase[]>();
  for (
    let s = seedBase;
    s < seedBase + 4_000 &&
    [...buckets.values()].reduce((x, b) => x + b.length, 0) < n * 3;
    s++
  ) {
    const r = rng(s);
    const a = member(r);
    // Couples proches (part de réponses changées variable), ou très proches.
    const p = [0, 0.03, 0.1, 0.25, 0.4][s % 5];
    const other = member(r);
    const b: Record<string, string> = {};
    for (const [k, v] of Object.entries(a)) b[k] = r() < p ? other[k] : v;
    const sparse = s % 11 === 0;
    if (sparse)
      for (const k of Object.keys(b))
        if (r() < 0.6) delete b[k];
        // Écart apparent : quelques sujets non renseignés par l'un des deux.
        else if (s % 7 === 0)
          for (const k of Object.keys(b).filter(() => r() < 0.04)) delete b[k];
    const rep = buildDivergenceReport(a, b);
    const sc = classify(rep, sparse);
    const list = buckets.get(sc) ?? [];
    if (list.length >= Math.ceil(n / want.length) + 2) continue;
    const labels = rep.divergences.map((d) => d.label).join(' ');
    list.push({
      id: `${seedBase === 1 ? 'S' : 'H'}${s}`,
      seed: s,
      scenario: sc,
      lang: s % 4 === 0 ? 'en' : 'fr', // FR majoritaire
      a,
      b,
      topics: TOPIC_PATTERNS.filter(([, re]) => re.test(labels)).map(
        ([t]) => t,
      ),
    });
    buckets.set(sc, list);
  }
  const out: BenchCase[] = [];
  for (let i = 0; out.length < n; i++) {
    let added = false;
    for (const sc of want) {
      const c = buckets.get(sc)?.[i];
      if (c && out.length < n) {
        out.push(c);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

/** Écart typique visé par sujet dans l'essai réduit (sinon motif du sujet). */
const TOPIC_FOCUS: Record<string, RegExp> = {
  enfants: /Désir d'enfants/,
  // V8.2 : pas de question d'ambition ni de temps passé ensemble ; écarts voisins.
  carrière: /Ambition professionnelle|perd son emploi|partage des tâches/,
  'temps de couple': /Temps passé ensemble|temps à soi dans le couple/,
  'lieu de vie': /Déménager|Lieu de vie|pays/i,
};

/**
 * Corpus ciblé (essai réduit) : un couple FR par sujet demandé. Les deux
 * membres partent des mêmes réponses ; seules une ou deux réponses liées au
 * sujet diffèrent, pour que l'écart soit net et lisible. « aucun_ecart » et
 * « securite » désignent les scénarios du même nom. Graines disjointes.
 */
function topicCorpus(topics: string[], seedBase = 50_000): BenchCase[] {
  const out: BenchCase[] = [];
  const push = (
    s: number,
    topic: string,
    a: Record<string, string>,
    b: Record<string, string>,
  ) => {
    const rep = buildDivergenceReport(a, b);
    const labels = rep.divergences.map((d) => d.label).join(' ');
    out.push({
      id: `T${s}`,
      seed: s,
      scenario: classify(rep, false),
      lang: 'fr',
      a,
      b,
      topics: [
        topic,
        ...TOPIC_PATTERNS.filter(([t, x]) => t !== topic && x.test(labels)).map(
          ([t]) => t,
        ),
      ],
    });
  };
  for (const topic of topics) {
    const re =
      TOPIC_FOCUS[topic] ?? TOPIC_PATTERNS.find(([t]) => t === topic)?.[1];
    let found = false;
    for (let s = seedBase; s < seedBase + 3_000 && !found; s++) {
      if (out.some((c) => c.seed === s)) continue;
      const r = rng(s);
      const a = member(r);
      const base = buildDivergenceReport(a, { ...a });
      const sc0 = classify(base, false);
      if (topic === 'aucun_ecart' || topic === 'securite') {
        if (sc0 === topic) {
          push(s, topic, a, { ...a });
          found = true;
        }
        continue;
      }
      if (sc0 === 'securite' || base.divergences.length > 1) continue;
      const tries = QS.flatMap((q) =>
        q.options
          .filter((o) => !o.freeText && o.key !== a[q.id] && a[q.id])
          .map((o) => [q.id, o.key] as const),
      );
      for (const [qid, key] of tries) {
        if (found) break;
        const b = { ...a, [qid]: key };
        const rep = buildDivergenceReport(a, b);
        if (classify(rep, false) === 'securite') continue;
        const hit = rep.divergences.some(
          (d) =>
            d.questionId === qid &&
            !d.neutral &&
            !d.undisclosed &&
            !!re &&
            re.test(d.label) &&
            ['moderee', 'majeure', 'critique'].includes(d.severity),
        );
        if (hit && rep.divergences.length <= base.divergences.length + 2) {
          push(s, topic, a, b);
          found = true;
        }
      }
    }
    if (!found)
      console.error(`Aucun couple trouvé pour le sujet « ${topic} ».`);
  }
  return out;
}

/** Écarts montrables d'un couple, par identifiant de preuve (fiche à l'aveugle). */
function gapsOf(c: BenchCase) {
  const rep = buildDivergenceReport(c.a, c.b);
  const byQ = new Map(rep.divergences.map((d) => [d.questionId, d]));
  return buildEvidence(rep).map((e) => {
    const d = byQ.get(e.subjects[0]);
    return {
      id: e.id,
      kind: e.kind,
      topic: e.topic,
      a: d && !d.neutral && !d.undisclosed ? d.a.text : null,
      b: d && !d.neutral && !d.undisclosed ? d.b.text : null,
    };
  });
}

// ─── 3. Rédacteur imposé, même chemin que la production ──────────────────────
class ForcedOpenRouter extends OpenRouterService {
  constructor(
    private readonly forced: Partial<Record<OpenRouterRole, string[]>>,
  ) {
    super();
  }
  async candidates(role: OpenRouterRole, avoid?: string): Promise<string[]> {
    // Charge les prix réels : sans eux, l'estimation avant appel prend le
    // prix plafond et l'enveloppe refuse à tort les appels longs.
    await this.catalogPrices();
    // Comme en production : jamais un relecteur de la famille du rédacteur.
    return (this.forced[role] ?? []).filter(
      (m) => !avoid || modelFamily(m) !== modelFamily(avoid),
    );
  }
}

interface WriterRun {
  model: string;
  caseId: string;
  scenario: Scenario;
  lang: 'fr' | 'en';
  drafted: number;
  passedGate: number;
  formRejected: number;
  evidenceRejected: number;
  criticRejected?: number;
  unreviewedDays?: number;
  duplicates?: number;
  escalatedDays?: number;
  keptByWriter?: Record<string, number>;
  refused?: Array<{
    text?: string;
    writer?: string;
    rule: number | null;
    reason?: string;
  }>;
  reasons: Record<string, number>;
  leaks: number;
  costMicro: number;
  latencyMs: number;
  questions: HarmonyQuestionPayload[];
  error?: string;
}

function coupleOf(c: BenchCase) {
  const report = buildDivergenceReport(c.a, c.b);
  const couple = describeCoupleContext([
    {
      firstName: 'Membre A',
      birthDate: new Date('1993-05-01'),
      gender: 'F',
      city: 'Ville A, Pays A',
    },
    {
      firstName: 'Membre B',
      birthDate: new Date('1990-02-01'),
      gender: 'H',
      city: c.seed % 3 ? 'Ville A, Pays A' : 'Ville B, Pays B',
    },
  ]);
  return { report, couple };
}

async function runWriter(model: string, c: BenchCase): Promise<WriterRun> {
  const { report, couple } = coupleOf(c);
  const ai = new AiService(
    new ForcedOpenRouter({
      quality: [model],
      escalation: ESCALATION ? [ESCALATION] : [],
      ...(CRITICS.length ? { critic: CRITICS } : {}),
    }),
  );
  // Rédacteur seul par défaut : la relecture est mesurée à part (étape
  // critic). BENCH_CRITIC : relecture réelle par ce modèle (autre famille).
  if (!CRITICS.length)
    (
      ai as unknown as { reviewSondeurQuestions: unknown }
    ).reviewSondeurQuestions = async () => ({
      rejected: new Set<number>(),
      preferred: new Set<number>(),
      refusals: [],
      model: 'sans-relecteur',
    });
  const before = spentMicro;
  const t0 = Date.now();
  try {
    const r = await draftReviewedSondeur(ai, {
      report,
      firstNames: ['Membre A', 'Membre B'],
      history: [],
      couple,
      scope: { journeyId: `bench-${c.id}`, lab },
    });
    const reasons: Record<string, number> = {};
    for (const e of r.trace.evidenceRejected)
      for (const x of e.reasons)
        reasons[x.split(' ')[0]] = (reasons[x.split(' ')[0]] ?? 0) + 1;
    const priv = r.evidenceIndex
      .flatMap((e) => e.privateTexts)
      .filter((p) => p && p.length >= 12)
      .map((p) => p.toLowerCase());
    const leaks = r.questions.filter((q) =>
      [q.text, q.textEn ?? ''].some((t) =>
        priv.some((p) => t.toLowerCase().includes(p)),
      ),
    ).length;
    return {
      model,
      caseId: c.id,
      scenario: c.scenario,
      lang: c.lang,
      drafted: r.trace.drafted,
      passedGate: r.questions.length,
      formRejected: r.trace.formRejected.length,
      evidenceRejected: r.trace.evidenceRejected.length,
      criticRejected: r.trace.refused.length,
      unreviewedDays: r.trace.unreviewedDays.length,
      duplicates: r.trace.duplicates.length,
      escalatedDays: r.trace.escalatedDays.length,
      keptByWriter: r.questions.reduce<Record<string, number>>(
        (acc, q) => ({
          ...acc,
          [q.writer ?? model]: (acc[q.writer ?? model] ?? 0) + 1,
        }),
        {},
      ),
      // Motifs du relecteur, pour vérifier qu'il ne rejette pas les bonnes questions.
      refused: r.trace.refused.map((x) => ({
        text: x.question?.text,
        writer: x.question?.writer,
        rule: x.rule,
        reason: x.reason,
      })),
      reasons,
      leaks,
      costMicro: spentMicro - before,
      latencyMs: Date.now() - t0,
      questions: r.questions,
    };
  } catch (e) {
    return {
      model,
      caseId: c.id,
      scenario: c.scenario,
      lang: c.lang,
      drafted: 0,
      passedGate: 0,
      formRejected: 0,
      evidenceRejected: 0,
      reasons: {},
      leaks: 0,
      costMicro: spentMicro - before,
      latencyMs: Date.now() - t0,
      questions: [],
      error: (e as Error).message,
    };
  }
}

// ─── 4. Juges aveugles ───────────────────────────────────────────────────────
const CRITERIA = [
  'gap_targeting',
  'new_information',
  'evidence_fidelity',
  'directness',
  'depth',
  'natural_french',
  'natural_english',
  'non_ai_style',
  'non_leading',
  'non_judgment',
  'actionability',
  'fr_en_equivalence',
  'safety',
] as const;
const HARD_FAILS = [
  'invented_fact',
  'answer_leak',
  'unsupported_assumption',
  'wrong_partner_position',
  'safety_misclassification',
  'diagnosis',
  'forced_conclusion',
  'privacy_leak',
  'known_fact_repetition',
] as const;

interface Judgement {
  q: number;
  scores: Record<string, number>;
  hard: string[];
}

function judgePrompt(
  analysis: string,
  evidence: string,
  items: Array<{ n: number; text: string; textEn?: string }>,
) {
  return `Tu évalues, en aveugle, des questions destinées à un couple qui se découvre (application BOLIGO). Tu ne sais pas qui les a écrites.
Ce que le moteur sait du couple (faits établis, rien d'autre) :
${analysis}

Preuves autorisées :
${evidence}

Pour CHAQUE question, note de 0 à 2 : ${CRITERIA.join(', ')}.
- gap_targeting : vise exactement un écart ou un accord établi ;
- new_information : apprend quelque chose que l'entretien n'a pas déjà dit (redemander un fait connu = 0) ;
- directness : va droit au sujet, sans détour ;
- natural_french / natural_english : un humain parlerait-il ainsi ;
- non_ai_style : aucune tournure artificielle (« dans ce souhait », « votre positionnement », « qu'est-ce que cela vous permet de protéger ») ;
- fr_en_equivalence : même sens dans les deux langues.
Puis liste les échecs graves présents parmi : ${HARD_FAILS.join(', ')}.
Retourne UNIQUEMENT ce JSON : {"verdicts": [{"q": 1, "scores": {"gap_targeting": 2, ...}, "hard": []}]}

QUESTIONS :
${items.map((i) => `${i.n}. FR : ${i.text}\n   EN : ${i.textEn ?? '(absente)'}`).join('\n')}`;
}

async function judge(
  judgeModel: string,
  prompt: string,
): Promise<Judgement[] | null> {
  const or = new ForcedOpenRouter({ critic: [judgeModel] });
  // Estimation au prix réel du juge (catalogue du jour), sinon prix élevé.
  const p = load<CatalogEntry[]>('catalog.json')?.find(
    (e) => e.id === judgeModel,
  );
  const est = Math.ceil(
    (prompt.length / 3) * (p?.priceIn ?? 20) + 4000 * (p?.priceOut ?? 80),
  );
  if (!lab.allow(est)) return null;
  try {
    const res = await or.executeAgentPrompt(
      'sondeur',
      [{ role: 'user', content: prompt }],
      { role: 'critic', maxTokens: 6000, temperature: 0 },
    );
    const cost =
      typeof res.usage?.cost === 'number'
        ? Math.ceil(res.usage.cost * 1e6)
        : est;
    lab.add(cost);
    const m = res.content.match(/\{[\s\S]*\}/);
    const parsed = m ? (JSON.parse(m[0]) as { verdicts: Judgement[] }) : null;
    return parsed?.verdicts ?? null;
  } catch {
    return null;
  }
}

interface Scored {
  model: string;
  caseId: string;
  lang: 'fr' | 'en';
  text: string;
  textEn?: string;
  quality: number;
  qualityFr: number;
  qualityEn: number;
  hard: string[];
}

/** Questions de tous les modèles d'un cas, mélangées, jugées par deux familles. */
async function judgeCase(
  c: BenchCase,
  runs: WriterRun[],
  judges: string[],
): Promise<Scored[]> {
  const { report } = coupleOf(c);
  const analysis = describeReportForAi(report, ['Membre A', 'Membre B']);
  const evidence = describeEvidenceForAi(buildEvidence(report));
  const pool = runs.flatMap((r) =>
    r.questions.map((q) => ({ model: r.model, q })),
  );
  const r = rng(c.seed + 7);
  pool.sort(() => r() - 0.5);
  const items = pool.map((p, i) => ({
    n: i + 1,
    text: p.q.text,
    textEn: p.q.textEn,
  }));
  if (!items.length) return [];
  const verdicts = await Promise.all(
    judges.map((j) => judge(j, judgePrompt(analysis, evidence, items))),
  );
  return pool.map((p, i) => {
    // Un juge ne note jamais un modèle de sa propre famille.
    const usable = verdicts
      .map((v, k) => ({ v: v?.find((x) => x.q === i + 1), j: judges[k] }))
      .filter((x) => x.v && modelFamily(x.j) !== modelFamily(p.model));
    const avg = (keys: readonly string[]) =>
      usable.length
        ? usable.reduce(
            (s, x) =>
              s +
              keys.reduce((t, k) => t + (x.v!.scores[k] ?? 0), 0) /
                (2 * keys.length),
            0,
          ) / usable.length
        : NaN;
    const all = CRITERIA.filter((k) => k !== 'natural_english');
    return {
      model: p.model,
      caseId: c.id,
      lang: c.lang,
      text: p.q.text,
      textEn: p.q.textEn,
      quality: avg(all),
      qualityFr: avg(['natural_french', 'non_ai_style', 'directness']),
      qualityEn: avg(['natural_english', 'fr_en_equivalence']),
      hard: [...new Set(usable.flatMap((x) => x.v!.hard ?? []))],
    };
  });
}

// ─── 5. Relecteur : taux de rejet des fautives, d'acceptation des valides ────
async function runCritic(critic: string, writerModel: string) {
  const dir = join(
    __dirname,
    '..',
    'docs',
    'questionnaire',
    'V8_2_FINAL',
    'sondeur_v82',
  );
  const sets = [
    'heldout-corpus.json',
    'heldout2-corpus.json',
    'heldout3-corpus.json',
  ].map(
    (f) =>
      JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
        reject: EvidencedQuestion[];
        accept: EvidencedQuestion[];
      },
  );
  const items = sets.flatMap((s) => [
    ...s.reject.map((q) => ({ q, faulty: true })),
    ...s.accept.map((q) => ({ q, faulty: false })),
  ]);
  const ai = new AiService(new ForcedOpenRouter({ critic: [critic] }));
  const evidence = describeEvidenceForAi(INDEX);
  let rejectedFaulty = 0,
    faulty = 0,
    acceptedValid = 0,
    valid = 0;
  const before = spentMicro;
  for (let i = 0; i < items.length; i += 14) {
    if (await stop()) break;
    const chunk = items.slice(i, i + 14);
    const gateOk = chunk.map((x) => validate(x.q, INDEX).ok);
    const toReview = chunk.filter((_, k) => gateOk[k]);
    const review = toReview.length
      ? await ai.reviewSondeurQuestions(
          `bench-critic-${critic}`,
          toReview.map((x) => ({
            day: x.q.day,
            themeKey: x.q.themeKey,
            text: x.q.text,
            evidence: x.q.evidence,
            claim: x.q.claim,
          })),
          [],
          writerModel,
          { evidence },
          lab,
        )
      : null;
    let r = 0;
    chunk.forEach((x, k) => {
      const kept = gateOk[k] && review ? !review.rejected.has(r) : false;
      if (gateOk[k]) r++;
      if (x.faulty) {
        faulty++;
        if (!kept) rejectedFaulty++;
      } else {
        valid++;
        if (kept) acceptedValid++;
      }
    });
  }
  return {
    critic,
    faultyRejectionRate: rejectedFaulty / Math.max(1, faulty),
    validAcceptanceRate: acceptedValid / Math.max(1, valid),
    faulty,
    valid,
    costEur: (spentMicro - before) / 1e6,
  };
}

// ─── 6. Sélection : plancher de qualité, puis coût ───────────────────────────
interface ModelSummary {
  model: string;
  family: string;
  questions: number;
  quality: number;
  qualityFr: number;
  qualityEn: number;
  hardFailRate: number;
  leaks: number;
  gatePassRate: number;
  costPerCaseEur: number;
  latencyP50: number;
  errors: number;
}

function summarize(runs: WriterRun[], scored: Scored[]): ModelSummary[] {
  const models = [...new Set(runs.map((r) => r.model))];
  return models.map((m) => {
    const rs = runs.filter((r) => r.model === m);
    const ss = scored.filter((s) => s.model === m && !Number.isNaN(s.quality));
    const mean = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    const lat = rs.map((r) => r.latencyMs).sort((a, b) => a - b);
    return {
      model: m,
      family: modelFamily(m),
      questions: ss.length,
      quality: mean(ss.map((s) => s.quality)),
      qualityFr: mean(ss.map((s) => s.qualityFr)),
      qualityEn: mean(
        ss.map((s) => s.qualityEn).filter((x) => !Number.isNaN(x)),
      ),
      hardFailRate: ss.length
        ? ss.filter((s) => s.hard.length).length / ss.length
        : 1,
      leaks: rs.reduce((a, r) => a + r.leaks, 0),
      gatePassRate:
        rs.reduce((a, r) => a + r.passedGate, 0) /
        Math.max(
          1,
          rs.reduce((a, r) => a + r.drafted, 0),
        ),
      costPerCaseEur: mean(rs.map((r) => r.costMicro / 1e6)),
      latencyP50: lat[Math.floor(lat.length / 2)] ?? 0,
      errors: rs.filter((r) => r.error).length,
    };
  });
}

const FLOOR = {
  quality: Number(process.env.BENCH_QUALITY_FLOOR ?? 0.8),
  hardFailRate: 0.02,
  leaks: 0,
  equivalence: 0.03,
};

function eligible(s: ModelSummary[]) {
  const best = Math.max(...s.map((x) => x.quality));
  return s
    .filter(
      (x) =>
        x.leaks === FLOOR.leaks &&
        x.hardFailRate <= FLOOR.hardFailRate &&
        x.quality >= FLOOR.quality &&
        x.errors === 0,
    )
    .map((x) => ({ ...x, equivalent: best - x.quality <= FLOOR.equivalence }));
}

// ─── Étapes ──────────────────────────────────────────────────────────────────
async function main() {
  // Aperçu du corpus ciblé, sans aucun appel réseau.
  if (step === 'corpus') {
    const cases = TOPICS.length
      ? [...topicCorpus(TOPICS), ...topicCorpus(HELDOUT, 70_000)]
      : corpus(SCREEN_CASES, 1);
    if (process.env.BENCH_SHOW)
      for (const c of cases.filter((x) => x.id === process.env.BENCH_SHOW)) {
        const { report } = coupleOf(c);
        console.log(describeReportForAi(report, ['Membre A', 'Membre B']));
        console.log(describeEvidenceForAi(buildEvidence(report)));
      }
    for (const c of cases)
      console.log(
        `${c.id} ${c.scenario} [${c.topics.join(', ')}] : ${gapsOf(c)
          .filter((g) => g.a)
          .map((g) => `${g.topic} (A « ${g.a} » / B « ${g.b} »)`)
          .slice(0, 3)
          .join(' ; ')}`,
      );
    return;
  }
  if (!openRouterAuthAvailable()) {
    console.error(
      'OPENROUTER_API_KEY absente (ni OPENROUTER_AUTH=proxy) : aucun appel lancé, aucun résultat inventé.',
    );
    process.exit(2);
  }
  const cat =
    step === 'catalog' || step === 'all' || !load('catalog.json')
      ? await catalog()
      : load<CatalogEntry[]>('catalog.json')!;
  if (step === 'catalog') return;
  // Essai réduit : BENCH_MODELS limite les rédacteurs (payants uniquement).
  const only = (process.env.BENCH_MODELS ?? '').split(',').filter(Boolean);
  const unknown = only.filter((m) => !cat.some((e) => e.id === m && !e.free));
  if (unknown.length) {
    console.error(
      `Modèles absents du catalogue payant : ${unknown.join(', ')}`,
    );
    process.exit(2);
  }
  const paid = cat.filter(
    (e) => !e.free && (only.length === 0 || only.includes(e.id)),
  );
  const judges = (process.env.BENCH_JUDGES ?? '').split(',').filter(Boolean);
  // BENCH_JUDGES donné : ces juges seulement (un juge d'une troisième famille suffit).
  if (judges.length === 0) {
    // Deux juges haut de gamme de familles différentes (les plus chers du catalogue retenu).
    const byFam = new Map<string, CatalogEntry>();
    for (const e of [...paid].sort((a, b) => b.priceOut - a.priceOut))
      if (!byFam.has(e.family)) byFam.set(e.family, e);
    judges.push(...[...byFam.values()].slice(0, 2).map((e) => e.id));
  }

  if (step === 'screen' || step === 'all') {
    const cases = TOPICS.length
      ? [...topicCorpus(TOPICS), ...topicCorpus(HELDOUT, 70_000)]
      : corpus(SCREEN_CASES, 1);
    save(
      'corpus-screen.json',
      cases.map(({ a, b, ...c }) => ({ ...c, gaps: gapsOf({ a, b, ...c }) })),
    );
    const runs: WriterRun[] = [];
    for (const m of paid)
      for (const c of cases) {
        if (await stop()) break;
        if (
          runs.filter((x) => x.model === m.id).length >=
          (CASES_PER_MODEL[m.id] ?? Infinity)
        )
          break;
        runs.push(await runWriter(m.id, c));
        save('screen-runs.json', runs);
      }
    const scored: Scored[] = [];
    for (const c of NO_JUDGES ? [] : cases) {
      if (await stop()) break;
      scored.push(
        ...(await judgeCase(
          c,
          runs.filter((r) => r.caseId === c.id),
          judges,
        )),
      );
    }
    const sum = summarize(runs, scored);
    save('screen-runs.json', runs);
    save('screen-scores.json', scored);
    save('screen-summary.json', sum);
    console.table(
      sum.map((s) => ({
        model: s.model,
        quality: s.quality.toFixed(3),
        hard: s.hardFailRate.toFixed(3),
        leaks: s.leaks,
        gate: s.gatePassRate.toFixed(2),
        eur: s.costPerCaseEur.toFixed(4),
      })),
    );
  }

  // Jugement à l'aveugle d'un essai déjà rédigé (mêmes couples, mêmes juges).
  if (step === 'judge') {
    const runs = load<WriterRun[]>('screen-runs.json') ?? [];
    const cases = [
      ...topicCorpus(TOPICS),
      ...topicCorpus(HELDOUT, 70_000),
    ].filter((c) => runs.some((r) => r.caseId === c.id));
    const scored: Scored[] = [];
    for (const c of cases) {
      if (await stop()) break;
      scored.push(
        ...(await judgeCase(
          c,
          runs.filter((r) => r.caseId === c.id),
          judges,
        )),
      );
      save('screen-scores.json', scored);
    }
    console.log(
      `Jugées : ${scored.length} questions, ${cases.length} couples.`,
    );
    return;
  }

  if (step === 'final' || step === 'all') {
    const screen = load<ModelSummary[]>('screen-summary.json') ?? [];
    const finalists = [...screen]
      .filter((s) => s.errors === 0 && s.leaks === 0)
      .sort((a, b) => b.quality - a.quality)
      .slice(0, FINALISTS)
      .map((s) => s.model);
    const cases = corpus(FINAL_CASES, 100_000); // graines jamais vues au dépistage
    save(
      'corpus-final.json',
      cases.map(({ a, b, ...c }) => c),
    );
    const runs: WriterRun[] = [];
    for (const m of finalists)
      for (const c of cases) {
        if (await stop()) break;
        runs.push(await runWriter(m, c));
      }
    const scored: Scored[] = [];
    for (const c of cases) {
      if (await stop()) break;
      scored.push(
        ...(await judgeCase(
          c,
          runs.filter((r) => r.caseId === c.id),
          judges,
        )),
      );
    }
    const sum = summarize(runs, scored);
    save('final-runs.json', runs);
    save('final-scores.json', scored);
    save('final-summary.json', sum);
    writeFileSync(
      join(OUT, 'final-summary.csv'),
      [
        'model,quality,quality_fr,quality_en,hard_fail_rate,leaks,gate_pass,cost_case_eur,latency_p50',
      ]
        .concat(
          sum.map((s) =>
            [
              s.model,
              s.quality,
              s.qualityFr,
              s.qualityEn,
              s.hardFailRate,
              s.leaks,
              s.gatePassRate,
              s.costPerCaseEur,
              s.latencyP50,
            ].join(','),
          ),
        )
        .join('\n'),
    );
    // Échantillon pour le contrôle humain (Steve) : 30 questions tirées au hasard, sans le modèle.
    const r = rng(42);
    const sample = [...scored].sort(() => r() - 0.5).slice(0, 30);
    save(
      'controle-humain.json',
      sample.map((s, i) => ({ n: i + 1, text: s.text, textEn: s.textEn })),
    );
    save(
      'controle-humain-cle.json',
      sample.map((s, i) => ({ n: i + 1, model: s.model })),
    );
  }

  if (step === 'critic' || step === 'all') {
    const final =
      load<ModelSummary[]>('final-summary.json') ??
      load<ModelSummary[]>('screen-summary.json') ??
      [];
    const writer =
      eligible(final).sort((a, b) => a.costPerCaseEur - b.costPerCaseEur)[0]
        ?.model ?? final[0]?.model;
    const critics = paid
      .filter((e) => e.family !== modelFamily(writer ?? ''))
      .map((e) => e.id);
    const results = [];
    for (const c of critics) {
      if (await stop()) break;
      results.push(await runCritic(c, writer));
    }
    save('critic.json', results);
    console.table(results);
  }

  if (step === 'select' || step === 'all') {
    const final = load<ModelSummary[]>('final-summary.json') ?? [];
    const critics = (
      load<
        Array<{
          critic: string;
          faultyRejectionRate: number;
          validAcceptanceRate: number;
          costEur: number;
        }>
      >('critic.json') ?? []
    )
      .filter(
        (c) => c.faultyRejectionRate >= 0.99 && c.validAcceptanceRate >= 0.9,
      )
      .sort((a, b) => a.costEur - b.costEur);
    const el = eligible(final);
    const equivalent = el
      .filter((x) => x.equivalent)
      .sort(
        (a, b) =>
          a.costPerCaseEur - b.costPerCaseEur || a.latencyP50 - b.latencyP50,
      );
    const writer = equivalent[0];
    const premium = [...el].sort((a, b) => b.quality - a.quality)[0];
    const fallback =
      equivalent.find((x) => x.family !== writer?.family) ??
      el.find((x) => x.model !== writer?.model);
    const critic = critics.find(
      (c) => modelFamily(c.critic) !== writer?.family,
    );
    const frWinner = [...el].sort((a, b) => b.qualityFr - a.qualityFr)[0];
    const enWinner = [...el].sort((a, b) => b.qualityEn - a.qualityEn)[0];
    const decision = {
      run: RUN,
      writer: writer?.model ?? null,
      critic: critic?.critic ?? null,
      escalation: premium?.model ?? null,
      fallback: fallback?.model ?? null,
      frWinner: frWinner?.model ?? null,
      enWinner: enWinner?.model ?? null,
      floor: FLOOR,
      qualified: !!(writer && critic),
      reason: !writer
        ? 'aucun rédacteur au-dessus du plancher'
        : !critic
          ? 'aucun relecteur ≥ 99 % / ≥ 90 %'
          : 'ok',
      spentEur: spentMicro / 1e6,
    };
    const criticRow = (
      load<
        Array<{
          critic: string;
          costEur: number;
          faulty: number;
          valid: number;
        }>
      >('critic.json') ?? []
    ).find((c) => c.critic === decision.critic);
    const perQ = criticRow
      ? criticRow.costEur / Math.max(1, criticRow.faulty + criticRow.valid)
      : 0;
    const finalRuns = load<WriterRun[]>('final-runs.json') ?? [];
    const costs = decision.writer
      ? journeyCosts(
          decision.writer,
          decision.critic,
          decision.escalation,
          cat,
          finalRuns,
          perQ,
        )
      : null;
    // Architectures comparées : chaque finaliste en rédacteur, même relecteur.
    const compare = [...new Set(finalRuns.map((r) => r.model))].map((w) => {
      const c = journeyCosts(
        w,
        decision.critic,
        decision.escalation,
        cat,
        finalRuns,
        perQ,
      );
      return {
        writer: w,
        p50: c.p50,
        p90: c.p90,
        p99: c.p99,
        escalationRate: c.escalationRate,
      };
    });
    save('costs.json', { selected: costs, compare });
    writeFileSync(
      join(OUT, 'costs.csv'),
      ['writer,p50_eur,p90_eur,p99_eur,escalation_rate']
        .concat(
          compare.map((c) =>
            [c.writer, c.p50, c.p90, c.p99, c.escalationRate].join(','),
          ),
        )
        .join('\n'),
    );
    Object.assign(decision, {
      costP50: costs?.p50 ?? null,
      costP90: costs?.p90 ?? null,
      costP99: costs?.p99 ?? null,
      escalationRate: costs?.escalationRate ?? null,
    });
    save('decision.json', decision);
    console.log(decision);
    if (QUALIFY && decision.qualified) {
      const enDiffers =
        enWinner &&
        writer &&
        enWinner.model !== writer.model &&
        enWinner.qualityEn - writer.qualityEn > FLOOR.equivalence;
      const file = join(__dirname, '..', 'config', 'sondeur-models.json');
      mkdirSync(join(__dirname, '..', 'config'), { recursive: true });
      writeFileSync(
        file,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            run: RUN,
            writer: [writer!.model],
            critic: [critic!.critic],
            escalation:
              premium && premium.model !== writer!.model ? [premium.model] : [],
            fallback: fallback ? [fallback.model] : [],
            escalateAboveRejectRate: 0.5,
            ...(enDiffers ? { byLanguage: { en: [enWinner!.model] } } : {}),
          },
          null,
          2,
        ),
      );
      console.log(`Qualification écrite : ${file}`);
    }
  }
  console.log(
    `Dépense de l'essai : ${(spentMicro / 1e6).toFixed(2)} € (plafond ${MAX_EUR} €)`,
  );
}

// ─── 7. Coût complet par parcours ────────────────────────────────────────────
/**
 * Coût d'un Parcours Harmonie complet, cas par cas :
 * - MESURÉ : rédaction (3 jours), relecture (coût réel par question relue) ;
 * - ESTIMÉ (prix du catalogue × taille réelle des prompts) : lectures du jour,
 *   bilan, contrôles de fidélité, approfondissements, modération des 42 réponses,
 *   escalades (taux mesuré × coût du modèle premium).
 */
function journeyCosts(
  writer: string,
  critic: string | null,
  premium: string | null,
  cat: CatalogEntry[],
  runs: WriterRun[],
  criticCostPerQuestion: number,
  escalateAbove = 0.5,
) {
  const price = (m: string | null) => cat.find((e) => e.id === m) ?? null;
  const tok = (chars: number) => Math.ceil(chars / 3);
  const call = (m: string | null, inChars: number, out = 900) => {
    const p = price(m);
    return p ? (tok(inChars) * p.priceIn + out * p.priceOut) / 1e6 : 0;
  };
  const cheapest =
    [...cat].filter((e) => !e.free).sort((a, b) => a.priceIn - b.priceIn)[0]
      ?.id ?? null;
  const items = (day: number): AnsweredItem[] =>
    Array.from({ length: 7 }, (_, i) => ({
      questionId: `q${day}-${i}`,
      day,
      theme: 'Famille',
      question:
        'Question synthétique de longueur moyenne pour le calcul du coût ?',
      answers: [
        'Réponse synthétique de longueur moyenne, environ cent caractères pour le calcul.',
        'Autre réponse synthétique de longueur moyenne, environ cent caractères également.',
      ] as [string, string],
    }));
  const members: [string, string] = ['Membre A', 'Membre B'];
  const sizes = {
    reading: [1, 2, 3].map((d) => {
      const p = dayReadingPrompt(d, items(d), members);
      return p.system.length + p.prompt.length;
    }),
    review: (() => {
      const p = reviewPrompt([1, 2, 3].flatMap(items), members);
      return p.system.length + p.prompt.length;
    })(),
    fidelity: (() => {
      const p = fidelityPrompt(items(1), members, {
        day: 1,
        source: 'ia',
        headline: 'Synthèse de la journée en une phrase de longueur moyenne.',
        together: ['Un accord de longueur moyenne.', 'Un second accord.'],
        toDiscuss: [
          {
            theme: 'Famille',
            text: 'Un point à explorer de longueur moyenne.',
          } as never,
        ],
        openers: ['Une question pour ouvrir.'],
      });
      return p.system.length + p.prompt.length;
    })(),
    followUp: (() => {
      const p = followUpPrompt(1, items(1), members, [], []);
      return p.system.length + p.prompt.length;
    })(),
  };
  const per = runs
    .filter((r) => r.model === writer && !r.error)
    .map((r) => {
      const days = 3;
      const escalationShare = r.drafted
        ? r.passedGate / r.drafted < 1 - escalateAbove
          ? 1
          : 0
        : 0;
      const premiumDay = premium
        ? (runs.find((x) => x.model === premium && x.caseId === r.caseId)
            ?.costMicro ?? 0) /
          1e6 /
          days
        : 0;
      const writerEur = r.costMicro / 1e6;
      const criticEur = critic ? criticCostPerQuestion * r.drafted : 0;
      const readingsEur =
        sizes.reading.reduce((s, c) => s + call(writer, c), 0) +
        call(writer, sizes.review, 1500);
      const fidelityEur = 4 * call(critic, sizes.fidelity, 300);
      const followEur = 2 * call(writer, sizes.followUp, 400);
      const moderationEur = 42 * call(cheapest, 2500, 50);
      const escalationEur = escalationShare * premiumDay;
      return {
        caseId: r.caseId,
        writerEur,
        criticEur,
        readingsEur,
        fidelityEur,
        followEur,
        moderationEur,
        escalationEur,
        escalated: escalationShare > 0,
        total:
          writerEur +
          criticEur +
          readingsEur +
          fidelityEur +
          followEur +
          moderationEur +
          escalationEur,
      };
    });
  const totals = per.map((p) => p.total).sort((a, b) => a - b);
  const q = (x: number) =>
    totals[Math.min(totals.length - 1, Math.floor(x * totals.length))] ?? 0;
  return {
    writer,
    critic,
    premium,
    journeys: per.length,
    p50: q(0.5),
    p90: q(0.9),
    p99: q(0.99),
    escalationRate: per.length
      ? per.filter((p) => p.escalated).length / per.length
      : 0,
    detail: per,
    measured: ['writer', 'critic'],
    estimated: [
      'readings',
      'fidelity',
      'followups',
      'moderation',
      'escalation',
    ],
  };
}

// Exports pour les tests du banc d'essai (sans réseau).
export {
  corpus,
  classify,
  summarize,
  eligible,
  judgePrompt,
  journeyCosts,
  FLOOR,
};

if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
