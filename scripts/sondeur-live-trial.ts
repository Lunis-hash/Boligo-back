/**
 * Banc d'essai du Sondeur IA sur des couples FICTIFS (aucune donnée réelle).
 *
 * Trois modes, tous sur le chemin de production (draftReviewedSondeur :
 * prompt réel, contrôle de forme, contrat de preuves FR + EN, relecture) :
 *
 *   prepare  — écrit le prompt exact du rédacteur pour chaque couple
 *              (aucun appel) : trial/prompts/<couple>.txt
 *   evaluate — lit la réponse brute d'un modèle (trial/responses/<couple>.txt)
 *              et mesure ce que le code accepte, rejette, et toute fuite.
 *              Sans relecteur (GPT) : seuls les contrôles du code sont mesurés.
 *   live     — appels réels OpenRouter (rédacteur + relecteur), plafond strict :
 *              TRIAL_MAX_EUR (défaut 2 €) pour tout l'essai, refus au-delà.
 *              Exige OPENROUTER_API_KEY ; jamais de base de données.
 *
 *   npx ts-node --skipProject --transpile-only -O '{"module":"commonjs","esModuleInterop":true}' \
 *     scripts/sondeur-live-trial.ts prepare|evaluate|live [dossier]
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AiService } from '../src/ai/ai.service';
import { OpenRouterService } from '../src/ai/openrouter.service';
import { buildDivergenceReport } from '../src/matching/divergence.engine';
import { V82_QUESTIONS } from '../src/interview/questions.v82';
import { draftReviewedSondeur } from '../src/journey/sondeur-ai';
import { describeCoupleContext } from '../src/journey/couple-context';

const mode = process.argv[2] ?? 'prepare';
const dir = process.argv[3] ?? join(__dirname, '..', 'docs', 'ia-essais');
const MAX_EUR = Number(process.env.TRIAL_MAX_EUR ?? 2);

/** Couples fictifs : prénoms inventés, réponses tirées d'une graine fixe. */
const COUPLES: Array<{
  id: string;
  names: [string, string];
  seed: number;
  cities: [string, string];
}> = [
  {
    id: 'c1-fr',
    names: ['Awa', 'Lucas'],
    seed: 11,
    cities: ['Paris, France', 'Lyon, France'],
  },
  {
    id: 'c2-fr',
    names: ['Mariam', 'Hugo'],
    seed: 23,
    cities: ['Abidjan, Côte d’Ivoire', 'Paris, France'],
  },
  {
    id: 'c3-en',
    names: ['Emily', 'James'],
    seed: 37,
    cities: ['London, United Kingdom', 'London, United Kingdom'],
  },
  {
    id: 'c4-mixte',
    names: ['Fatou', 'Daniel'],
    seed: 41,
    cities: ['Dakar, Sénégal', 'Toronto, Canada'],
  },
  {
    id: 'c5-proche',
    names: ['Inès', 'Karim'],
    seed: 53,
    cities: ['Marseille, France', 'Marseille, France'],
  },
];

function answers(seed: number, shift: number): Record<string, string> {
  let a = seed * 7919 + shift;
  const r = () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
  const out: Record<string, string> = {};
  for (const q of V82_QUESTIONS as Array<{
    id: string;
    input?: string;
    options: Array<{ key: string; freeText?: boolean; text: string }>;
  }>) {
    if (q.input === 'ageRange') {
      out[q.id] = '27-40';
      continue;
    }
    const opts = q.options.filter(
      (o) => !o.freeText && !/ne pas répondre/i.test(o.text),
    );
    if (opts.length) out[q.id] = opts[Math.floor(r() * opts.length)].key;
  }
  return out;
}

function coupleInput(c: (typeof COUPLES)[number]) {
  const a = answers(c.seed, 1);
  // Couple « proche » : 80 % de réponses identiques.
  const b = c.id.endsWith('proche')
    ? Object.fromEntries(
        Object.entries(answers(c.seed, 2)).map(([k, v], i) => [
          k,
          i % 5 === 0 ? v : (a[k] ?? v),
        ]),
      )
    : answers(c.seed, 2);
  const report = buildDivergenceReport(a, b);
  const couple = describeCoupleContext([
    {
      firstName: c.names[0],
      birthDate: new Date('1993-05-01'),
      gender: 'F',
      city: c.cities[0],
    },
    {
      firstName: c.names[1],
      birthDate: new Date('1990-02-01'),
      gender: 'H',
      city: c.cities[1],
    },
  ]);
  return { report, couple };
}

/** IA de production dont le transport est remplacé (capture ou réponse fournie). */
function patchedAi(
  onCall: (
    prompt: string,
    agent: string,
  ) => Promise<{ content: string; model: string }>,
) {
  const ai = new AiService();
  (ai as unknown as { queryAiAgentDetailed: unknown }).queryAiAgentDetailed = (
    agent: string,
    prompt: string,
    system?: string,
  ) => onCall(`${system ? system + '\n\n' : ''}${prompt}`, agent);
  // Pas de relecteur hors mode live : toutes les questions qui passent le code sont gardées.
  (
    ai as unknown as { reviewSondeurQuestions: unknown }
  ).reviewSondeurQuestions = async () => ({
    rejected: new Set<number>(),
    preferred: new Set<number>(),
    refusals: [],
    model: 'sans-relecteur',
  });
  return ai;
}

/** Jour du Sondeur que prépare un prompt du rédacteur. */
const dayOf = (prompt: string) =>
  Number(/JOUR (\d) du Sondeur/.exec(prompt)?.[1] ?? 0);

async function prepare() {
  mkdirSync(join(dir, 'prompts'), { recursive: true });
  for (const c of COUPLES) {
    const { report, couple } = coupleInput(c);
    const ai = patchedAi(async (prompt) => {
      writeFileSync(
        join(dir, 'prompts', `${c.id}.j${dayOf(prompt)}.txt`),
        prompt,
      );
      throw new Error('capture');
    });
    await draftReviewedSondeur(ai, {
      report,
      firstNames: c.names,
      history: [],
      couple,
      scope: { journeyId: `essai-${c.id}` },
    }).catch(() => undefined);
    console.log(`${c.id} : 3 prompts du rédacteur écrits`);
  }
}

interface Metrics {
  couple: string;
  drafted: number;
  accepted: number;
  formRejected: number;
  evidenceRejected: number;
  reasons: Record<string, number>;
  leaks: string[];
  englishMissing: number;
  outputChars: number;
  inputChars: number;
  refusedByReviewer?: number;
  costEur?: number;
}

function measure(
  id: string,
  result: Awaited<ReturnType<typeof draftReviewedSondeur>>,
  inputChars: number,
  outputChars: number,
): Metrics {
  const reasons: Record<string, number> = {};
  for (const r of result.trace.evidenceRejected)
    for (const reason of r.reasons) {
      const code = reason.split(' ')[0];
      reasons[code] = (reasons[code] ?? 0) + 1;
    }
  // Fuite : une question acceptée qui reprend une réponse (FR ou EN) d'un membre.
  const privateTexts = result.evidenceIndex
    .flatMap((e) => e.privateTexts)
    .filter((p) => p && p.length >= 12);
  const leaks = result.questions
    .flatMap((q) => [q.text, q.textEn ?? ''])
    .filter((t) =>
      privateTexts.some((p) => t.toLowerCase().includes(p.toLowerCase())),
    );
  return {
    couple: id,
    drafted: result.trace.drafted,
    accepted: result.questions.length,
    formRejected: result.trace.formRejected.length,
    evidenceRejected: result.trace.evidenceRejected.length,
    reasons,
    leaks,
    englishMissing: result.questions.filter((q) => !q.textEn).length,
    outputChars,
    inputChars,
    refusedByReviewer: result.trace.refused.length,
  };
}

async function evaluate() {
  const all: Metrics[] = [];
  for (const c of COUPLES) {
    const files = [1, 2, 3].map((d) =>
      join(dir, 'responses', `${c.id}.j${d}.txt`),
    );
    if (!files.every((f) => existsSync(f))) {
      console.log(`${c.id} : réponses incomplètes, couple ignoré`);
      continue;
    }
    const responses = files.map((f) => readFileSync(f, 'utf8'));
    const prompts = [1, 2, 3].map((d) =>
      readFileSync(join(dir, 'prompts', `${c.id}.j${d}.txt`), 'utf8'),
    );
    const content = responses.join('\n');
    const prompt = prompts.join('\n');
    const { report, couple } = coupleInput(c);
    const ai = patchedAi(async (p) => ({
      content: responses[dayOf(p) - 1] ?? '',
      model: 'essai/redacteur',
    }));
    const result = await draftReviewedSondeur(ai, {
      report,
      firstNames: c.names,
      history: [],
      couple,
      scope: { journeyId: `essai-${c.id}` },
    });
    const m = measure(c.id, result, prompt.length, content.length);
    all.push(m);
    writeFileSync(
      join(dir, 'responses', `${c.id}.evaluation.json`),
      JSON.stringify(
        {
          metrics: m,
          accepted: result.questions.map((q) => ({
            day: q.day,
            theme: q.themeKey,
            text: q.text,
            textEn: q.textEn,
            evidence: q.evidence,
            claim: q.claim,
          })),
          rejected: result.trace.evidenceRejected.map((r) => ({
            text: r.question.text,
            textEn: r.question.textEn,
            reasons: r.reasons,
          })),
          formRejected: result.trace.formRejected.map((q) => q.text),
        },
        null,
        2,
      ),
    );
  }
  report(all);
}

async function live() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error(
      'OPENROUTER_API_KEY absente : essai réel impossible (aucun appel lancé).',
    );
    process.exit(2);
  }
  if (process.env.DATABASE_URL) delete process.env.DATABASE_URL; // jamais de base
  let spent = 0;
  const cap = Math.round(MAX_EUR * 1_000_000);
  const lab = {
    allow: (estimate: number) => spent + estimate <= cap,
    add: (cost: number) => {
      spent += cost;
    },
  };
  const ai = new AiService(new OpenRouterService());
  const all: Metrics[] = [];
  mkdirSync(join(dir, 'live'), { recursive: true });
  for (const c of COUPLES) {
    if (spent >= cap) {
      console.log(`Plafond de ${MAX_EUR} € atteint : arrêt avant ${c.id}.`);
      break;
    }
    const { report, couple } = coupleInput(c);
    const before = spent;
    const result = await draftReviewedSondeur(ai, {
      report,
      firstNames: c.names,
      history: [],
      couple,
      scope: { journeyId: `essai-${c.id}`, lab },
    });
    const m = measure(c.id, result, 0, 0);
    m.costEur = (spent - before) / 1_000_000;
    all.push(m);
    writeFileSync(
      join(dir, 'live', `${c.id}.json`),
      JSON.stringify(
        { metrics: m, questions: result.questions, trace: result.trace },
        null,
        2,
      ),
    );
  }
  report(all);
  console.log(
    `Dépense totale : ${(spent / 1_000_000).toFixed(3)} € (plafond ${MAX_EUR} €)`,
  );
}

function report(all: Metrics[]) {
  const sum = (k: keyof Metrics) =>
    all.reduce((n, m) => n + (Number(m[k]) || 0), 0);
  const reasons: Record<string, number> = {};
  for (const m of all)
    for (const [k, v] of Object.entries(m.reasons))
      reasons[k] = (reasons[k] ?? 0) + v;
  console.log(
    JSON.stringify(
      {
        couples: all.length,
        drafted: sum('drafted'),
        accepted: sum('accepted'),
        formRejected: sum('formRejected'),
        evidenceRejected: sum('evidenceRejected'),
        leaks: all.flatMap((m) => m.leaks),
        englishMissing: sum('englishMissing'),
        reasons,
      },
      null,
      2,
    ),
  );
  for (const m of all)
    console.log(
      `${m.couple} : ${m.accepted}/${m.drafted} acceptées, forme ${m.formRejected}, preuves ${m.evidenceRejected}, fuites ${m.leaks.length}`,
    );
}

(({ prepare, evaluate, live }) as Record<string, () => Promise<void>>)
  [mode]?.()
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  });
