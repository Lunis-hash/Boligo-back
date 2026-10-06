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
import { SAFETY_QUESTIONS } from './sondeur.generator';
import {
  AnsweredItem,
  FollowUpProposal,
  REVIEW_DAY,
  SondeurReading,
  answeredItems,
  dayComplete,
  dayReadingPrompt,
  fidelityPrompt,
  followUpPrompt,
  itemsBlock,
  parseDayReading,
  parseFidelity,
  parseFollowUps,
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
        1800,
      );
      const reading = written
        ? parseDayReading(written.content, day, items, names)
        : null;
      // Garde-fou anti-invention : chaque point cite les réponses (vérifié par
      // le code), puis le relecteur confirme que rien n'est inventé.
      if (
        !reading ||
        !(await this.isFaithful(
          journeyId,
          items,
          names,
          reading,
          written?.model,
        ))
      ) {
        this.markFailure(journeyId, day);
        continue;
      }
      if (day < 3) {
        await this.writeFollowUp(journeyId, day, items, names, reading, qs, [
          userAId,
          userBId,
        ]);
      }
      await this.save(journeyId, reading);
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
      2500,
    );
    const review = written ? parseReview(written.content, all, names) : null;
    if (
      !review ||
      !(await this.isFaithful(journeyId, all, names, review, written?.model))
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
    writerModel?: string,
  ): Promise<boolean> {
    const { system, prompt } = fidelityPrompt(items, names, reading);
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
   * Question d'approfondissement de la journée suivante : deux propositions
   * écrites à part (elles ne voient que les réponses et les écarts décrits),
   * relues par un modèle d'une autre famille ; la meilleure acceptée est
   * placée. Refus, relecture impossible ou thème de sécurité : rien ne change.
   */
  private async writeFollowUp(
    journeyId: string,
    day: number,
    items: AnsweredItem[],
    names: [string, string],
    reading: SondeurReading,
    asked: Array<{ day: number; questionText: string; responses: unknown[] }>,
    members: [string, string],
  ): Promise<string | null> {
    // Journée suivante déjà commencée : la question ne pourrait plus changer.
    if (asked.some((q) => q.day === day + 1 && q.responses.length > 0))
      return null;
    const askedTexts = asked.map((q) => q.questionText);
    const { system, prompt } = followUpPrompt(
      day,
      items,
      names,
      reading.toDiscuss,
      askedTexts,
    );
    const written = await this.ai.journeyCompletion(
      journeyId,
      system,
      prompt,
      1200,
      0.6,
    );
    if (!written) return null;
    // Un thème qui porte un écart de sécurité garde sa question de limite.
    const report = await this.interviewReport(...members);
    const safety = new Set(
      (report?.divergences ?? [])
        .filter((d) => SAFETY_QUESTIONS.has(d.questionId))
        .map((d) => d.theme),
    );
    const candidates = parseFollowUps(written.content).filter(
      (c) => !safety.has(c.themeKey),
    );
    if (candidates.length === 0) return null;
    const review = await this.ai.reviewSondeurQuestions(
      journeyId,
      candidates.map((c) => ({
        day: day + 1,
        themeKey: c.themeKey,
        text: c.text,
        method: c.method,
        target: c.target,
      })),
      askedTexts,
      written.model,
      itemsBlock(items, names),
    );
    if (!review) return null;
    const accepted = candidates
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => !review.rejected.has(i))
      .sort(
        (x, y) =>
          Number(review.preferred.has(y.i)) - Number(review.preferred.has(x.i)),
      );
    for (const { c } of accepted) {
      const placed = await this.placeFollowUp(journeyId, day + 1, c);
      if (placed) return placed;
    }
    return null;
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
  ): Promise<string | null> {
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
