/**
 * Comparaison finale de deux configurations du Sondeur (même corpus, mêmes
 * juges), à partir des essais du banc (scripts/sondeur-benchmark.ts) :
 *
 *   npx ts-node --skipProject --transpile-only scripts/sondeur-compare.ts <runA> <runB> <sortie>
 *
 * Lit screen-runs.json, screen-scores.json et corpus-screen.json de chaque
 * essai ; écrit <sortie>/comparison.json et comparison.csv. Aucun appel réseau.
 *
 * Coût d'un parcours complet (3 jours) : Sondeur MESURÉ (rédaction, relecture,
 * escalade, par couple) + lectures, bilan, contrôle de fidélité, relances et
 * modération ESTIMÉS à partir de la taille réelle des consignes et des prix
 * du catalogue du jour.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  AnsweredItem,
  dayReadingPrompt,
  fidelityPrompt,
  followUpPrompt,
  reviewPrompt,
} from '../src/journey/sondeur-insights';

interface Run {
  model: string;
  caseId: string;
  drafted: number;
  passedGate: number;
  formRejected: number;
  evidenceRejected: number;
  criticRejected?: number;
  duplicates?: number;
  escalatedDays?: number;
  keptByWriter?: Record<string, number>;
  leaks: number;
  costMicro: number;
  latencyMs: number;
  questions: Array<{ text: string; writer?: string }>;
  error?: string;
}
interface Scored {
  model: string;
  caseId: string;
  text: string;
  quality: number;
  qualityFr: number;
  qualityEn: number;
  hard: string[];
}
interface Entry {
  id: string;
  priceIn: number;
  priceOut: number;
  free: boolean;
}

const base = join(__dirname, '..', 'docs', 'sondeur-benchmark');
const read = <T>(run: string, f: string): T =>
  JSON.parse(readFileSync(join(base, run, f), 'utf8')) as T;
const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN;
};

/** Coût estimé, hors Sondeur, d'un parcours de 3 jours (euros ≈ dollars). */
function journeyExtras(cat: Entry[], writer: string, critic: string) {
  const price = (m: string) => cat.find((e) => e.id === m);
  const call = (m: string, chars: number, out: number) => {
    const p = price(m);
    return p ? (Math.ceil(chars / 3) * p.priceIn + out * p.priceOut) / 1e6 : 0;
  };
  const cheapest = [...cat]
    .filter((e) => !e.free)
    .sort((a, b) => a.priceIn - b.priceIn)[0]?.id;
  const items = (day: number): AnsweredItem[] =>
    Array.from({ length: 7 }, (_, i) => ({
      questionId: `q${day}-${i}`,
      day,
      theme: 'Famille',
      question: 'Question de longueur moyenne pour estimer le coût ?',
      answers: [
        'Réponse de longueur moyenne, environ cent caractères, pour estimer le coût.',
        'Autre réponse de longueur moyenne, environ cent caractères, pour le coût.',
      ] as [string, string],
    }));
  const m: [string, string] = ['Membre A', 'Membre B'];
  const size = (p: { system: string; prompt: string }) =>
    p.system.length + p.prompt.length;
  const readings = [1, 2, 3].reduce(
    (s, d) => s + call(writer, size(dayReadingPrompt(d, items(d), m)), 900),
    0,
  );
  const bilan = call(
    writer,
    size(reviewPrompt([1, 2, 3].flatMap(items), m)),
    1500,
  );
  const fidelity =
    4 *
    call(
      critic,
      size(
        fidelityPrompt(items(1), m, {
          day: 1,
          source: 'ia',
          headline: 'Synthèse de la journée en une phrase.',
          together: ['Un accord.'],
          toDiscuss: [{ theme: 'Famille', text: 'Un point.' } as never],
          openers: ['Une question.'],
        }),
      ),
      300,
    );
  const followUps =
    2 * call(writer, size(followUpPrompt(1, items(1), m, [], [])), 400);
  const moderation = cheapest ? 42 * call(cheapest, 2500, 50) : 0;
  return { readings, bilan, fidelity, followUps, moderation };
}

function summarize(
  label: string,
  run: string,
  config: { writer: string; critic: string; escalation: string | null },
  cat: Entry[],
) {
  const runs = read<Run[]>(run, 'screen-runs.json');
  let scores: Scored[] = [];
  try {
    scores = read<Scored[]>(run, 'screen-scores.json');
  } catch {
    scores = [];
  }
  const corpus = read<Array<{ id: string; scenario: string }>>(
    run,
    'corpus-screen.json',
  );
  const extras = journeyExtras(cat, config.writer, config.critic);
  const extrasTotal = Object.values(extras).reduce((a, b) => a + b, 0);
  const perCase = corpus.map((c) => {
    const r = runs.find((x) => x.caseId === c.id);
    const s = scores.filter((x) => x.caseId === c.id);
    const byWriter = r?.keptByWriter ?? {};
    const premium = config.escalation ? (byWriter[config.escalation] ?? 0) : 0;
    const sondeurEur = (r?.costMicro ?? 0) / 1e6;
    return {
      caseId: c.id,
      scenario: c.scenario,
      heldOut: c.id.startsWith('T7'),
      treated: !!r,
      kept: r?.passedGate ?? 0,
      keptByWriter: byWriter,
      premiumShare: r?.passedGate ? premium / r.passedGate : 0,
      escalatedDays: r?.escalatedDays ?? 0,
      drafted: r?.drafted ?? 0,
      formRejected: r?.formRejected ?? 0,
      evidenceRejected: r?.evidenceRejected ?? 0,
      criticRejected: r?.criticRejected ?? 0,
      duplicates: r?.duplicates ?? 0,
      leaks: r?.leaks ?? 0,
      quality: mean(s.map((x) => x.quality).filter(Number.isFinite)),
      unsupported: s.filter((x) => x.hard.includes('unsupported_assumption'))
        .length,
      answerLeaksJudged: s.filter(
        (x) =>
          x.hard.includes('answer_leak') || x.hard.includes('privacy_leak'),
      ).length,
      knownFactRepetitions: s.filter((x) =>
        x.hard.includes('known_fact_repetition'),
      ).length,
      hardFails: s.filter((x) => x.hard.length).length,
      sondeurEur,
      journeyEur: r ? sondeurEur + extrasTotal : NaN,
      latencyS: (r?.latencyMs ?? 0) / 1000,
    };
  });
  const treated = perCase.filter((c) => c.treated);
  const keptTotal = treated.reduce((a, c) => a + c.kept, 0);
  const draftedTotal = treated.reduce((a, c) => a + c.drafted, 0);
  const premiumKept = treated.reduce(
    (a, c) =>
      a + (config.escalation ? (c.keptByWriter[config.escalation] ?? 0) : 0),
    0,
  );
  const journeys = treated.map((c) => c.journeyEur);
  return {
    label,
    run,
    config,
    couples: corpus.length,
    treated: treated.length,
    keptTotal,
    keptPerCouple: treated.length ? keptTotal / treated.length : 0,
    couplesWithoutQuestion: treated.filter((c) => c.kept === 0).length,
    rejectionRate: draftedTotal ? 1 - keptTotal / draftedTotal : NaN,
    leaks: treated.reduce((a, c) => a + c.leaks + c.answerLeaksJudged, 0),
    unsupportedAssumptions: treated.reduce((a, c) => a + c.unsupported, 0),
    knownFactRepetitions: treated.reduce(
      (a, c) => a + c.knownFactRepetitions,
      0,
    ),
    quality: mean(scores.map((x) => x.quality).filter(Number.isFinite)),
    qualityFr: mean(scores.map((x) => x.qualityFr).filter(Number.isFinite)),
    qualityEn: mean(scores.map((x) => x.qualityEn).filter(Number.isFinite)),
    judged: scores.length,
    premiumEscalationRate: keptTotal ? premiumKept / keptTotal : 0,
    sondeurEurPerCouple: mean(treated.map((c) => c.sondeurEur)),
    journeyEurP50: quantile(journeys, 0.5),
    journeyEurP90: quantile(journeys, 0.9),
    journeyExtras: extras,
    latencyP50s: quantile(
      treated.map((c) => c.latencyS),
      0.5,
    ),
    perCase,
  };
}

if (require.main === module) {
  const [runA, runB, out] = process.argv.slice(2);
  if (!runA || !runB || !out) {
    console.error('Usage : sondeur-compare.ts <runA> <runB> <sortie>');
    process.exit(2);
  }
  const cat = read<Entry[]>(runA, 'catalog.json');
  const A = summarize(
    'A',
    runA,
    {
      writer: 'anthropic/claude-sonnet-5.5',
      critic: 'z-ai/glm-5.3-flash',
      escalation: null,
    },
    cat,
  );
  const B = summarize(
    'B',
    runB,
    {
      writer: 'z-ai/glm-5.3-flash',
      critic: 'anthropic/claude-sonnet-5.5',
      escalation: 'anthropic/claude-sonnet-5.5',
    },
    cat,
  );
  const dir = join(base, out);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'comparison.json'),
    JSON.stringify({ A, B }, null, 2),
  );
  const cols = [
    'option',
    'caseId',
    'scenario',
    'heldOut',
    'treated',
    'kept',
    'premiumShare',
    'escalatedDays',
    'drafted',
    'formRejected',
    'evidenceRejected',
    'criticRejected',
    'duplicates',
    'leaks',
    'quality',
    'unsupported',
    'knownFactRepetitions',
    'sondeurEur',
    'journeyEur',
    'latencyS',
  ];
  const rows = [A, B].flatMap((o) =>
    o.perCase.map((c) =>
      cols
        .map((k) =>
          k === 'option'
            ? o.label
            : String((c as Record<string, unknown>)[k] ?? ''),
        )
        .join(','),
    ),
  );
  writeFileSync(
    join(dir, 'comparison.csv'),
    [cols.join(','), ...rows].join('\n'),
  );
  for (const o of [A, B])
    console.log(
      `${o.label} : ${o.treated}/${o.couples} couples, ${o.keptTotal} retenues (${o.keptPerCouple.toFixed(1)}/couple), ${o.couplesWithoutQuestion} sans question, rejet ${(o.rejectionRate * 100).toFixed(0)} %, qualité ${o.quality.toFixed(3)} (${o.judged} jugées), fuites ${o.leaks}, hypothèses ${o.unsupportedAssumptions}, répétitions ${o.knownFactRepetitions}, escalade ${(o.premiumEscalationRate * 100).toFixed(0)} %, Sondeur ${o.sondeurEurPerCouple.toFixed(3)} €/couple, parcours P50 ${o.journeyEurP50.toFixed(3)} € P90 ${o.journeyEurP90.toFixed(3)} €, latence P50 ${o.latencyP50s.toFixed(0)} s`,
    );
}
