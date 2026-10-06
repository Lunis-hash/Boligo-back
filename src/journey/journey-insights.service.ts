import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import {
  buildDivergenceReport,
  collectRawAnswers,
  THEMES,
} from '../matching/divergence.engine';
import { PrismaService } from '../prisma/prisma.service';
import { similarQuestions } from './clinical-lens';
import {
  FollowUpProposal,
  REVIEW_DAY,
  SondeurReading,
  answeredItems,
  dayComplete,
  dayReadingPrompt,
  fidelityPrompt,
  parseDayReading,
  parseFidelity,
  parseReview,
  reviewPrompt,
  ruleDayReading,
  ruleReview,
} from './sondeur-insights';

/** Après un échec, l'IA est relancée au plus trois fois, à dix minutes d'écart. */
const MAX_ATTEMPTS = 3;
const RETRY_AFTER_MS = 10 * 60 * 1000;

export interface SondeurInsightsView {
  days: SondeurReading[];
  review: SondeurReading | null;
  /** Une lecture de l'IA est en cours d'écriture : l'app peut recharger. */
  writing: boolean;
}

/**
 * Suivi du Sondeur par l'IA (parcours payés) : lecture de chaque journée
 * terminée par les deux membres, question d'approfondissement pour la
 * journée suivante, bilan Harmonie à la fin. Seules les lectures de l'IA sont
 * enregistrées ; la version des règles est recalculée à chaque lecture.
 */
@Injectable()
export class JourneyInsightsService {
  private readonly logger = new Logger('Suivi Sondeur');
  private static queues = new Map<string, Promise<void>>();
  private static failures = new Map<string, { count: number; at: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  /**
   * Écrit les lectures qui manquent. Appelé sans attendre après chaque
   * réponse ; les appels d'un même parcours passent l'un après l'autre.
   */
  refresh(journeyId: string): Promise<void> {
    const queues = JourneyInsightsService.queues;
    const previous = queues.get(journeyId) ?? Promise.resolve();
    const next = previous
      .then(() => this.writeMissing(journeyId))
      .catch((err: Error) =>
        this.logger.warn(`Parcours ${journeyId} : ${err.message}`),
      );
    queues.set(journeyId, next);
    void next.finally(() => {
      if (queues.get(journeyId) === next) queues.delete(journeyId);
    });
    return next;
  }

  /** Lectures visibles par les deux membres (l'appartenance est vérifiée par l'appelant). */
  async view(journeyId: string): Promise<SondeurInsightsView> {
    const journey = await this.load(journeyId);
    if (!journey) return { days: [], review: null, writing: false };
    const { userAId, userBId, harmonyQuestions: qs } = journey;
    const stored = new Map(
      journey.insights.map((i) => [
        i.day,
        i.content as unknown as SondeurReading,
      ]),
    );

    // Lectures attendues mais pas encore écrites par l'IA.
    const pending: number[] = [];
    const days: SondeurReading[] = [];
    for (const day of [1, 2, 3]) {
      if (!dayComplete(qs, day, userAId, userBId)) continue;
      const reading = stored.get(day);
      if (!reading) pending.push(day);
      days.push(reading ?? ruleDayReading(day));
    }

    let review: SondeurReading | null = null;
    if (days.length === 3) {
      review = stored.get(REVIEW_DAY) ?? null;
      if (!review) {
        pending.push(REVIEW_DAY);
        review = ruleReview(await this.interviewReport(userAId, userBId));
      }
    }

    const writing = pending.some((d) => !this.coolingDown(journeyId, d));
    if (writing) void this.refresh(journeyId);
    return { days, review, writing };
  }

  private load(journeyId: string) {
    return this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        userA: { select: { firstName: true } },
        userB: { select: { firstName: true } },
        harmonyQuestions: {
          orderBy: [{ day: 'asc' }, { sentAt: 'asc' }],
          include: {
            responses: { select: { userId: true, responseText: true } },
          },
        },
        insights: true,
      },
    });
  }

  private async writeMissing(journeyId: string) {
    const journey = await this.load(journeyId);
    if (!journey) return;
    const { userAId, userBId, harmonyQuestions: qs } = journey;
    const names: [string, string] = [
      journey.userA.firstName,
      journey.userB.firstName,
    ];
    const done = new Set(journey.insights.map((i) => i.day));

    for (const day of [1, 2, 3]) {
      if (done.has(day) || this.coolingDown(journeyId, day)) continue;
      if (!dayComplete(qs, day, userAId, userBId)) continue;
      const items = answeredItems(
        qs.filter((q) => q.day === day),
        userAId,
        userBId,
      );
      const { system, prompt } = dayReadingPrompt(day, items, names);
      const written = await this.ai.journeyCompletion(
        journeyId,
        system,
        prompt,
        1500,
      );
      const parsed = written ? parseDayReading(written.content, day) : null;
      // Garde-fou anti-invention : publiée seulement si le relecteur confirme
      // que chaque phrase s'appuie sur les réponses. Sinon, version des règles.
      if (
        !parsed ||
        !(await this.isFaithful(
          journeyId,
          items,
          names,
          parsed.reading,
          parsed.followUp,
          written?.model,
        ))
      ) {
        this.markFailure(journeyId, day);
        continue;
      }
      if (parsed.followUp) {
        await this.placeFollowUp(
          journeyId,
          day + 1,
          parsed.followUp,
          qs,
          written?.model,
        );
      }
      await this.save(journeyId, parsed.reading);
    }

    const allDone = [1, 2, 3].every((d) =>
      dayComplete(qs, d, userAId, userBId),
    );
    if (
      !allDone ||
      done.has(REVIEW_DAY) ||
      this.coolingDown(journeyId, REVIEW_DAY)
    )
      return;
    const all = answeredItems(qs, userAId, userBId);
    const { system, prompt } = reviewPrompt(all, names);
    const written = await this.ai.journeyCompletion(
      journeyId,
      system,
      prompt,
      2000,
    );
    const review = written ? parseReview(written.content) : null;
    if (
      !review ||
      !(await this.isFaithful(
        journeyId,
        all,
        names,
        review,
        null,
        written?.model,
      ))
    ) {
      this.markFailure(journeyId, REVIEW_DAY);
      return;
    }
    await this.save(journeyId, review);
  }

  /** Le relecteur indépendant confirme-t-il que la lecture n'invente rien ? */
  private async isFaithful(
    journeyId: string,
    items: Parameters<typeof fidelityPrompt>[0],
    names: [string, string],
    reading: SondeurReading,
    followUp: FollowUpProposal | null,
    writerModel?: string,
  ): Promise<boolean> {
    const { system, prompt } = fidelityPrompt(items, names, reading, followUp);
    const verdict = parseFidelity(
      await this.ai.journeyCritique(journeyId, system, prompt, writerModel),
    );
    if (verdict !== true) {
      this.logger.warn(
        `Parcours ${journeyId} : lecture ${reading.day === REVIEW_DAY ? 'du bilan' : `du jour ${reading.day}`} ${verdict === false ? 'refusée (fidélité)' : 'non vérifiée'}, version des règles.`,
      );
    }
    return verdict === true;
  }

  /**
   * Remplace une question de la journée suivante, du même thème, par la
   * question d'approfondissement. Seulement si personne n'a encore commencé
   * cette journée : une question déjà affichée ne change pas sous les yeux
   * d'un membre qui y répond.
   */
  private async placeFollowUp(
    journeyId: string,
    day: number,
    proposal: FollowUpProposal,
    asked: Array<{ questionText: string }>,
    writerModel?: string,
  ): Promise<string | null> {
    // Garde-fou : la question est relue par un second modèle, d'une autre
    // famille. Refusée, ou relecture impossible : rien n'est remplacé.
    const review = await this.ai.reviewSondeurQuestions(
      journeyId,
      [
        {
          day,
          themeKey: proposal.themeKey,
          text: proposal.text,
          options: proposal.options,
        },
      ],
      asked.map((q) => q.questionText),
      writerModel,
    );
    if (!review || review.rejected.size > 0) return null;
    const all = await this.prisma.harmonyQuestion.findMany({
      where: { journeyId },
      orderBy: { sentAt: 'asc' },
      include: { responses: { select: { id: true } } },
    });
    const ofDay = all.filter((q) => q.day === day);
    if (ofDay.some((q) => q.responses.length > 0 || q.followUp)) return null;
    // Ni redite exacte, ni question de même sens déjà posée dans ce Sondeur.
    const key = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();
    if (
      all.some(
        (q) =>
          key(q.questionText) === key(proposal.text) ||
          similarQuestions(q.questionText, proposal.text),
      )
    )
      return null;
    const target = ofDay.find(
      (q) => q.emoji === THEMES[proposal.themeKey].emoji,
    );
    if (!target) return null;
    const updated = await this.prisma.harmonyQuestion.updateMany({
      where: { id: target.id, followUp: false, responses: { none: {} } },
      data: {
        questionText: proposal.text,
        options: proposal.options,
        followUp: true,
      },
    });
    return updated.count === 1 ? target.id : null;
  }

  private async save(journeyId: string, reading: SondeurReading) {
    try {
      await this.prisma.journeyInsight.create({
        data: {
          journeyId,
          day: reading.day,
          source: reading.source,
          content: reading as unknown as Prisma.InputJsonValue,
        },
      });
      JourneyInsightsService.failures.delete(`${journeyId}:${reading.day}`);
    } catch (err) {
      // Déjà écrite par un autre appel : rien à faire.
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
  }

  /** Écarts des deux entretiens, pour le bilan sans IA. */
  private async interviewReport(userAId: string, userBId: string) {
    try {
      const [a, b] = await Promise.all(
        [userAId, userBId].map((userId) =>
          this.prisma.interviewIA.findFirst({
            where: { userId, status: { in: ['en_cours', 'termine'] } },
            orderBy: { startDate: 'desc' },
            include: { responses: true },
          }),
        ),
      );
      return buildDivergenceReport(
        collectRawAnswers(a?.responses),
        collectRawAnswers(b?.responses),
      );
    } catch {
      return null;
    }
  }

  private coolingDown(journeyId: string, day: number): boolean {
    const f = JourneyInsightsService.failures.get(`${journeyId}:${day}`);
    if (!f) return false;
    return f.count >= MAX_ATTEMPTS || Date.now() - f.at < RETRY_AFTER_MS;
  }

  private markFailure(journeyId: string, day: number) {
    const failures = JourneyInsightsService.failures;
    const key = `${journeyId}:${day}`;
    const f = failures.get(key);
    // Mémoire bornée : les plus anciens échecs sont oubliés en premier.
    if (!f && failures.size >= 10_000) {
      const [oldest] = failures.keys();
      if (oldest !== undefined) failures.delete(oldest);
    }
    failures.set(key, {
      count: (f?.count ?? 0) + 1,
      at: Date.now(),
    });
  }
}
