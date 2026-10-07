import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AiLabBudget, AiService } from '../ai/ai.service';
import { THEMES, buildDivergenceReport } from '../matching/divergence.engine';
import { passesFormRules } from '../journey/clinical-lens';
import { draftReviewedSondeur } from '../journey/sondeur-ai';
import {
  AiSondeurQuestion,
  assembleSondeur,
  describeReportForAi,
} from '../journey/sondeur.generator';
import {
  AnsweredItem,
  SondeurReading,
  dayReadingPrompt,
  fidelityPrompt,
  dangerCategories,
  followUpPrompt,
  itemsBlock,
  parseAlert,
  parseDayReading,
  parseFidelity,
  parseFollowUps,
} from '../journey/sondeur-insights';
import {
  DEFAULT_DAY_ONE,
  LAB_SCENARIOS,
  LabScenario,
  scenarioInterviews,
} from './ai-lab.scenarios';

/** Enveloppe d'un couple évalué : au-delà, les appels suivants sont refusés. */
const MAX_EUR_PER_COUPLE = 1.5;
/** Nombre d'évaluations gardées en mémoire. */
const KEPT_RUNS = 5;

export interface LabCoupleResult {
  id: string;
  name: string;
  checks: string;
  divergences: string[];
  safetyThemes: string[];
  questions: Array<{
    day: number;
    theme: string;
    text: string;
    source: string;
  }>;
  ai: {
    drafted: number;
    kept: number;
    /** Créneaux couverts par l'IA sur ceux qui lui sont ouverts. */
    coverage: string;
    formRejected: string[];
    refused: Array<{ text: string; rule: number | null; reason?: string }>;
    unreviewedDays: number[];
  };
  /** Questions servies qui enfreindraient une règle de forme (doit rester 0). */
  servedDefects: string[];
  reading: SondeurReading | null;
  readingStatus: string;
  /**
   * Danger : la référence du scénario, ce que le code a repéré (catégories),
   * l'alerte levée par l'IA, et le verdict (ok, manqué, faux signal).
   */
  danger: {
    expected: boolean;
    code: string[];
    ai: string | null;
    verdict: 'ok' | 'manqué' | 'faux signal';
  };
  followUp: string | null;
  costEur: number;
  durationMs: number;
  error?: string;
}

export interface LabRun {
  id: string;
  status: 'en_cours' | 'termine' | 'echec';
  startedAt: string;
  finishedAt?: string;
  couples: number;
  results: LabCoupleResult[];
  summary?: {
    costEur: number;
    averageCostEur: number;
    aiQuestionsServed: number;
    servedDefects: number;
    readingsPublished: number;
    readingsRefused: number;
    dangerBlocked: number;
    /** Signaux attendus mais non repérés (doit rester 0). */
    dangerMissed: number;
    /** Signaux levés sans danger réel (doit rester 0). */
    dangerFalse: number;
  };
}

/**
 * Laboratoire IA (administrateur) : rejoue le Sondeur avec les vrais modèles
 * sur des couples types, pour mesurer la qualité réelle avant ou après un
 * changement de consigne. Aucune donnée de membre n'est utilisée ; les coûts
 * sont comptés dans la dépense IA du mois.
 */
@Injectable()
export class AiLabService {
  private readonly logger = new Logger('Laboratoire IA');
  private readonly runs = new Map<string, LabRun>();

  constructor(private readonly ai: AiService) {}

  scenarios() {
    return LAB_SCENARIOS.map(({ id, name, checks }) => ({ id, name, checks }));
  }

  list(): LabRun[] {
    return [...this.runs.values()]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .map((r) => ({ ...r, results: [] }));
  }

  get(id: string): LabRun {
    const run = this.runs.get(id);
    if (!run) throw new NotFoundException('Évaluation introuvable');
    return run;
  }

  /** Lance une évaluation sur les `count` premiers couples types (1 à 18). */
  start(count: number): LabRun {
    if (!process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY) {
      throw new BadRequestException(
        'Aucune clé d’IA configurée : ajoutez OPENROUTER_API_KEY sur Render.',
      );
    }
    if ([...this.runs.values()].some((r) => r.status === 'en_cours')) {
      throw new BadRequestException('Une évaluation est déjà en cours.');
    }
    const n = Math.min(LAB_SCENARIOS.length, Math.max(1, Math.floor(count)));
    const run: LabRun = {
      id: randomUUID(),
      status: 'en_cours',
      startedAt: new Date().toISOString(),
      couples: n,
      results: [],
    };
    this.runs.set(run.id, run);
    // Mémoire bornée : les évaluations les plus anciennes sont oubliées.
    for (const old of this.list().slice(KEPT_RUNS)) this.runs.delete(old.id);
    void this.execute(run, LAB_SCENARIOS.slice(0, n));
    return run;
  }

  private async execute(run: LabRun, scenarios: LabScenario[]) {
    try {
      // Deux couples à la fois : chaque couple lance déjà 3 rédactions et
      // 3 relectures en parallèle.
      const queue = [...scenarios];
      const worker = async () => {
        for (let s = queue.shift(); s; s = queue.shift()) {
          run.results.push(await this.evaluate(run.id, s));
        }
      };
      await Promise.all([worker(), worker()]);
      run.results.sort(
        (a, b) =>
          scenarios.findIndex((s) => s.id === a.id) -
          scenarios.findIndex((s) => s.id === b.id),
      );
      const cost = run.results.reduce((t, r) => t + r.costEur, 0);
      run.summary = {
        costEur: round(cost),
        averageCostEur: round(cost / Math.max(1, run.results.length)),
        aiQuestionsServed: run.results.reduce(
          (t, r) => t + r.questions.filter((q) => q.source === 'ia').length,
          0,
        ),
        servedDefects: run.results.reduce(
          (t, r) => t + r.servedDefects.length,
          0,
        ),
        readingsPublished: run.results.filter(
          (r) => r.readingStatus === 'publiée',
        ).length,
        readingsRefused: run.results.filter((r) =>
          r.readingStatus.startsWith('refusée'),
        ).length,
        dangerBlocked: run.results.filter((r) =>
          r.readingStatus.startsWith('bloquée'),
        ).length,
        dangerMissed: run.results.filter((r) => r.danger.verdict === 'manqué')
          .length,
        dangerFalse: run.results.filter(
          (r) => r.danger.verdict === 'faux signal',
        ).length,
      };
      run.status = 'termine';
    } catch (error) {
      this.logger.error(`Évaluation ${run.id} : ${(error as Error).message}`);
      run.status = 'echec';
    } finally {
      run.finishedAt = new Date().toISOString();
    }
  }

  /** Rejoue un couple type de bout en bout, avec les vrais modèles. */
  async evaluate(runId: string, s: LabScenario): Promise<LabCoupleResult> {
    const started = Date.now();
    let spent = 0;
    const lab: AiLabBudget = {
      allow: (estimate) => spent + estimate <= MAX_EUR_PER_COUPLE * 1e6,
      add: (cost) => {
        spent += cost;
      },
    };
    const journeyId = `lab-${runId}-${s.id}`;
    const base: LabCoupleResult = {
      id: s.id,
      name: s.name,
      checks: s.checks,
      divergences: [],
      safetyThemes: [],
      questions: [],
      ai: {
        drafted: 0,
        kept: 0,
        coverage: '0/21',
        formRejected: [],
        refused: [],
        unreviewedDays: [],
      },
      servedDefects: [],
      reading: null,
      readingStatus: 'non écrite',
      danger: {
        expected: s.expectDanger ?? false,
        code: [],
        ai: null,
        verdict: 'ok',
      },
      followUp: null,
      costEur: 0,
      durationMs: 0,
    };
    try {
      const [a, b] = scenarioInterviews(s);
      const report = buildDivergenceReport(a, b);
      base.divergences = report.divergences
        .slice(0, 10)
        .map((d) => `${THEMES[d.theme].label} — ${d.label} (${d.severity})`);

      // 1. Questions : rédaction, contrôle de forme, relecture, assemblage.
      const drafted = await draftReviewedSondeur(this.ai, {
        report,
        firstNames: s.names,
        history: [],
        couple: `- ${s.names[0]} : femme, 29 ans, vit à Lyon\n- ${s.names[1]} : homme, 33 ans, vit à Paris`,
        scope: { journeyId, paidOnly: true, lab },
      });
      const questions = assembleSondeur({
        report,
        firstNames: s.names,
        aiQuestions: drafted.questions as AiSondeurQuestion[],
        history: [],
        seed: s.id,
        preferAi: drafted.preferAi,
      });
      const open = 3 * (7 - drafted.trace.safetyThemes.length);
      const covered = new Set(
        drafted.questions.map((q) => `${q.day}|${q.themeKey}`),
      ).size;
      base.safetyThemes = drafted.trace.safetyThemes.map(
        (t) => THEMES[t].label,
      );
      base.ai = {
        drafted: drafted.trace.drafted,
        kept: drafted.questions.length,
        coverage: `${covered}/${open}`,
        formRejected: drafted.trace.formRejected.map((q) => q.text),
        refused: drafted.trace.refused.map((r) => ({
          text: r.question.text,
          rule: r.rule,
          reason: r.reason,
        })),
        unreviewedDays: drafted.trace.unreviewedDays,
      };
      base.questions = questions.map((q) => ({
        day: q.day,
        theme: THEMES[q.themeKey].label,
        text: q.text,
        source: q.source,
      }));
      // Même grille que la production (gabarits et questions de l'IA).
      base.servedDefects = questions
        .filter((q) => !passesFormRules(q.text))
        .map((q) => q.text);

      // 2. Lecture du jour 1 sur des réponses types, puis vérification.
      const items: AnsweredItem[] = questions
        .filter((q) => q.day === 1)
        .map((q) => ({
          questionId: `${s.id}-${q.themeKey}`,
          day: 1,
          theme: THEMES[q.themeKey].label,
          question: q.text,
          answers: s.dayOne?.[q.themeKey] ?? DEFAULT_DAY_ONE[q.themeKey],
        }));
      base.danger.code = [
        ...new Set(
          items.flatMap((it) => it.answers.flatMap((a) => dangerCategories(a))),
        ),
      ];
      if (base.danger.code.length) {
        base.readingStatus = `bloquée : signal de danger (${base.danger.code.join(', ')}) — lecture de sécurité, modération prévenue`;
      } else {
        const { system, prompt } = dayReadingPrompt(1, items, s.names);
        const written = await this.ai.journeyCompletion(
          journeyId,
          system,
          prompt,
          1800,
          0.3,
          lab,
        );
        const alert = parseAlert(written?.content ?? null);
        const reading =
          written && !alert
            ? parseDayReading(written.content, 1, items, s.names)
            : null;
        if (!written) base.readingStatus = 'IA indisponible';
        else if (alert) {
          base.danger.ai = alert.category;
          base.readingStatus = `bloquée : alerte de l'IA (${alert.category}) — lecture de sécurité, modération prévenue`;
        } else if (!reading)
          base.readingStatus = 'illisible ou sans point vérifiable';
        else {
          const check = fidelityPrompt(items, s.names, reading);
          const raw = await this.ai.journeyCritique(
            journeyId,
            check.system,
            check.prompt,
            written.model,
            lab,
          );
          const verdict = parseFidelity(raw);
          const fidelityAlert = parseAlert(raw);
          base.reading = reading;
          if (fidelityAlert) {
            base.danger.ai = fidelityAlert.category;
            base.readingStatus = `bloquée : alerte du relecteur (${fidelityAlert.category})`;
          } else
            base.readingStatus =
              verdict === true
                ? 'publiée'
                : verdict === false
                  ? 'refusée (fidélité)'
                  : 'refusée (vérification impossible)';
          if (verdict === true && !fidelityAlert) {
            base.followUp = await this.followUp(
              journeyId,
              items,
              s,
              reading,
              questions.map((q) => q.text),
              lab,
              describeReportForAi(report, s.names),
            );
          }
        }
      }
      // Verdict de sécurité contre la référence du scénario, indépendante des filtres.
      const detected = base.danger.code.length > 0 || base.danger.ai !== null;
      base.danger.verdict =
        detected === base.danger.expected
          ? 'ok'
          : base.danger.expected
            ? 'manqué'
            : 'faux signal';
    } catch (error) {
      base.error = (error as Error).message;
    }
    base.costEur = round(spent / 1e6);
    base.durationMs = Date.now() - started;
    this.logger.log(
      `${s.id} : ${base.ai.coverage} créneaux IA, lecture ${base.readingStatus}, ${base.costEur} €`,
    );
    return base;
  }

  private async followUp(
    journeyId: string,
    items: AnsweredItem[],
    s: LabScenario,
    reading: SondeurReading,
    asked: string[],
    lab: AiLabBudget,
    analysis?: string,
  ): Promise<string | null> {
    const { system, prompt } = followUpPrompt(
      1,
      items,
      s.names,
      reading.toDiscuss,
      asked,
      analysis,
    );
    const written = await this.ai.journeyCompletion(
      journeyId,
      system,
      prompt,
      1200,
      0.6,
      lab,
    );
    if (!written) return null;
    const candidates = parseFollowUps(written.content);
    if (!candidates.length) return null;
    const review = await this.ai.reviewSondeurQuestions(
      journeyId,
      candidates.map((c) => ({
        day: 2,
        themeKey: c.themeKey,
        text: c.text,
        method: c.method,
        target: c.target,
      })),
      asked,
      written.model,
      {
        analysis: `${analysis ? `${analysis}\n\n` : ''}RÉPONSES DU JOUR :\n${itemsBlock(items, s.names)}`,
        days: "jour 2, question d'approfondissement",
      },
      lab,
    );
    if (!review) return null;
    const kept = candidates
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => !review.rejected.has(i))
      .sort(
        (x, y) =>
          Number(review.preferred.has(y.i)) - Number(review.preferred.has(x.i)),
      );
    return kept[0]?.c.text ?? null;
  }
}

function round(eur: number): number {
  return Math.round(eur * 1000) / 1000;
}
