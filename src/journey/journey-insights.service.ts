import { Injectable, Logger, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import {
  buildDivergenceReport,
  collectRawAnswers,
  THEMES,
} from '../matching/divergence.engine';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { COMPROMISE, similarQuestions } from './clinical-lens';
import { SAFETY_QUESTIONS, describeReportForAi } from './sondeur.generator';
import {
  AlertCategory,
  AnsweredItem,
  DangerCategory,
  FollowUpProposal,
  REVIEW_DAY,
  ReadingAlert,
  SondeurReading,
  answeredItems,
  dayComplete,
  dayReadingPrompt,
  dangerCategories,
  fidelityPrompt,
  followUpPrompt,
  itemsBlock,
  parseAlert,
  parseDayReading,
  parseFidelity,
  parseFollowUps,
  parseReview,
  reviewPrompt,
  ruleDayReading,
  ruleReview,
  safetyReading,
} from './sondeur-insights';

/** Début de la description d'un signalement automatique du Sondeur. */
export function sondeurReportPrefix(journeyId: string): string {
  return `Signal automatique BOLIGO · Sondeur · parcours ${journeyId}`;
}

/** Libellés des catégories, pour la modération. */
const CATEGORY_LABEL: Record<DangerCategory | AlertCategory, string> = {
  violence: 'violence (subie ou exercée)',
  violence_subie: 'violence subie',
  violence_exercee: 'violence exercée',
  menace: 'menace',
  controle: 'contrôle (téléphone, argent, proches)',
  detresse: 'détresse ou idées de mort',
  argent: "demande d'argent",
  mineur: 'âge de moins de 18 ans',
  autre: 'signal à vérifier',
};

/**
 * Message privé à l'auteur d'une réponse qui évoque une détresse ou des
 * violences : des ressources d'aide, sans rien commenter. Numéros français
 * (gratuits, 24 h/24) ; ailleurs, les urgences du pays.
 */
const VIOLENCE_SUPPORT =
  "Vous avez évoqué des violences, une menace ou un contrôle. Si vous en vivez ou en avez vécu, vous pouvez en parler : en France, le 3919 répond gratuitement et anonymement, 24 h/24. Ailleurs, appelez les urgences de votre pays. L'équipe BOLIGO reste joignable depuis votre profil.";
const SUPPORT_MESSAGE: Partial<Record<DangerCategory | AlertCategory, string>> =
  {
    detresse:
      "Vous avez écrit quelque chose qui nous fait penser que vous traversez un moment difficile. Vous n'êtes pas seul(e) : en France, le 3114 répond 24 h/24, gratuitement. Ailleurs, appelez les urgences de votre pays. L'équipe BOLIGO reste joignable depuis votre profil.",
    violence_subie: VIOLENCE_SUPPORT,
    violence: VIOLENCE_SUPPORT,
    menace: VIOLENCE_SUPPORT,
    controle: VIOLENCE_SUPPORT,
    violence_exercee:
      "Une de vos réponses évoque des gestes violents. Si vous craignez vos propres réactions, parlez-en à un professionnel de santé ou à une association d'aide ; en cas de danger, appelez les urgences de votre pays. L'équipe BOLIGO reste joignable depuis votre profil.",
  };

/** Catégories d'un signalement, lisibles par le code (« catégories=[a,b] »). */
function categoriesOf(description: string | null): string[] {
  const m = /catégories=\[([^\]]*)\]/.exec(description ?? '');
  return m ? m[1].split(',').filter(Boolean) : [];
}

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
    @Optional() private readonly notifications?: NotificationService,
  ) {}

  /**
   * Messagerie retenue : une réponse du Sondeur évoque un danger et la
   * modération n'a pas encore tranché. Les signalements manquants sont créés
   * au passage. Une confidence de violence subie (classée par l'IA) ne
   * retient pas la messagerie : le membre n'est pas mis en cause.
   */
  async holdsChat(journeyId: string): Promise<boolean> {
    const journey = await this.load(journeyId);
    if (!journey) return false;
    const { userAId, userBId, harmonyQuestions: qs } = journey;
    for (const day of [1, 2, 3]) {
      if (!dayComplete(qs, day, userAId, userBId)) continue;
      const items = answeredItems(
        qs.filter((q) => q.day === day),
        userAId,
        userBId,
      );
      await this.handleDanger(journeyId, day, items, [userAId, userBId]);
    }
    // Lecture de l'IA attendue (parcours payé) : elle peut lever une alerte
    // que le code ne voit pas. La messagerie attend qu'elle soit écrite (ou
    // qu'elle ait échoué trois fois) ; la visite suivante la rouvrira.
    if (await this.ai.journeyAiEligible(journeyId)) {
      const written = new Set(journey.insights.map((i) => i.day));
      const awaited = [1, 2, 3]
        .filter((d) => dayComplete(qs, d, userAId, userBId))
        .concat(
          [1, 2, 3].every((d) => dayComplete(qs, d, userAId, userBId))
            ? [REVIEW_DAY]
            : [],
        )
        .filter((d) => !written.has(d) && !this.gaveUp(journeyId, d));
      if (awaited.length) {
        void this.refresh(journeyId);
        return true;
      }
    }
    const pending = await this.prisma.report.findMany({
      where: {
        status: 'en_attente',
        description: { startsWith: sondeurReportPrefix(journeyId) },
      },
      select: { description: true },
    });
    // Une confidence de violence subie seule ne retient pas la messagerie.
    return pending.some((r) => {
      const categories = categoriesOf(r.description);
      return (
        categories.length === 0 ||
        categories.some((c) => c !== 'violence_subie')
      );
    });
  }

  /**
   * Réponse qui évoque un danger, signalée dès qu'elle est écrite : un membre
   * qui n'achève pas sa journée n'échappe pas à la modération.
   */
  async reportAnswer(
    journeyId: string,
    day: number,
    authorId: string,
    question: string,
    answer: string,
    categories: DangerCategory[],
  ): Promise<void> {
    if (!categories.length) return;
    await this.fileReport(
      journeyId,
      day,
      authorId,
      categories,
      'Une réponse évoque peut-être un danger (signalée dès son envoi). À vérifier par la modération.',
      [`« ${question} » → ${answer.slice(0, 500)}`],
      `réponse ${createHash('sha256').update(`${question}|${answer}`).digest('hex').slice(0, 10)}`,
    );
  }

  /** Signalements du Sondeur encore en attente de la modération, pour ce parcours. */
  async pendingSafetyReview(journeyId: string): Promise<boolean> {
    const pending = await this.prisma.report.findMany({
      where: {
        status: 'en_attente',
        description: { startsWith: sondeurReportPrefix(journeyId) },
      },
      select: { description: true },
    });
    return pending.length > 0;
  }

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
      // Version des règles : jamais de « nuance à aborder » après un signal
      // de sécurité.
      const danger = (d?: number) =>
        answeredItems(
          qs.filter((q) => d === undefined || q.day === d),
          userAId,
          userBId,
        ).some((it) => it.answers.some((a) => dangerCategories(a).length > 0));
      days.push(
        reading ?? (danger(day) ? safetyReading(day) : ruleDayReading(day)),
      );
    }

    let review: SondeurReading | null = null;
    if (days.length === 3) {
      review = stored.get(REVIEW_DAY) ?? null;
      if (!review) {
        pending.push(REVIEW_DAY);
        const flagged = answeredItems(qs, userAId, userBId).some((it) =>
          it.answers.some((a) => dangerCategories(a).length > 0),
        );
        review = flagged
          ? safetyReading(REVIEW_DAY)
          : ruleReview(await this.interviewReport(userAId, userBId));
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
      // Signal de danger (violence, menace, contrôle, détresse, demande
      // d'argent, minorité) : l'IA ne commente pas cette journée, la
      // modération est prévenue.
      if (await this.handleDanger(journeyId, day, items, [userAId, userBId])) {
        await this.save(journeyId, safetyReading(day));
        continue;
      }
      const { system, prompt } = dayReadingPrompt(
        day,
        items,
        names,
        await this.analysisFor(userAId, userBId, names),
      );
      const written = await this.ai.journeyCompletion(
        journeyId,
        system,
        prompt,
        1800,
      );
      // Seconde ligne de défense : le modèle lève une alerte.
      const alert = parseAlert(written?.content ?? null);
      if (alert) {
        await this.reportAlert(journeyId, day, alert, items, [
          userAId,
          userBId,
        ]);
        await this.save(journeyId, safetyReading(day));
        continue;
      }
      const reading = written
        ? parseDayReading(written.content, day, items, names)
        : null;
      // Garde-fou anti-invention : chaque point cite les réponses (vérifié par
      // le code), puis le relecteur confirme que rien n'est inventé.
      const verdict = reading
        ? await this.fidelity(journeyId, items, names, reading, written?.model)
        : null;
      if (verdict?.alert) {
        await this.reportAlert(journeyId, day, verdict.alert, items, [
          userAId,
          userBId,
        ]);
        await this.save(journeyId, safetyReading(day));
        continue;
      }
      if (!reading || !verdict?.faithful) {
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
    if (
      await this.handleDanger(journeyId, REVIEW_DAY, all, [userAId, userBId])
    ) {
      await this.save(journeyId, safetyReading(REVIEW_DAY));
      return;
    }
    const { system, prompt } = reviewPrompt(
      all,
      names,
      await this.analysisFor(userAId, userBId, names),
    );
    const written = await this.ai.journeyCompletion(
      journeyId,
      system,
      prompt,
      2500,
    );
    const alert = parseAlert(written?.content ?? null);
    if (alert) {
      await this.reportAlert(journeyId, REVIEW_DAY, alert, all, [
        userAId,
        userBId,
      ]);
      await this.save(journeyId, safetyReading(REVIEW_DAY));
      return;
    }
    const review = written ? parseReview(written.content, all, names) : null;
    const verdict = review
      ? await this.fidelity(journeyId, all, names, review, written?.model)
      : null;
    if (verdict?.alert) {
      await this.reportAlert(journeyId, REVIEW_DAY, verdict.alert, all, [
        userAId,
        userBId,
      ]);
      await this.save(journeyId, safetyReading(REVIEW_DAY));
      return;
    }
    if (!review || !verdict?.faithful) {
      this.markFailure(journeyId, REVIEW_DAY);
      return;
    }
    await this.save(journeyId, review);
  }

  /**
   * Réponse qui évoque un danger (violence, menace, contrôle, détresse,
   * demande d'argent, minorité) : un signalement est adressé à la modération
   * (une fois par journée et par membre), avec ses catégories. Renvoie true
   * si la journée doit rester sans IA.
   */
  private async handleDanger(
    journeyId: string,
    day: number,
    items: AnsweredItem[],
    members: [string, string],
  ): Promise<boolean> {
    let found = false;
    for (const [k, authorId] of members.entries()) {
      const flagged = items
        .map((it) => ({ it, categories: dangerCategories(it.answers[k]) }))
        .filter((f) => f.categories.length > 0);
      if (flagged.length === 0) continue;
      found = true;
      const categories = [...new Set(flagged.flatMap((f) => f.categories))];
      await this.fileReport(
        journeyId,
        day,
        authorId,
        categories,
        'Une réponse évoque peut-être un danger. À vérifier par la modération.',
        flagged.map(
          ({ it }) => `« ${it.question} » → ${it.answers[k].slice(0, 500)}`,
        ),
      );
    }
    return found;
  }

  /** Alerte levée par le modèle : signalement, comme un signal du code. */
  private async reportAlert(
    journeyId: string,
    day: number,
    alert: ReadingAlert,
    items: AnsweredItem[],
    members: [string, string],
  ) {
    const targets = alert.member === null ? [0, 1] : [alert.member];
    for (const k of targets) {
      await this.fileReport(
        journeyId,
        day,
        members[k],
        [alert.category],
        alert.category === 'violence_subie'
          ? "Confidence possible d'une violence subie : le membre n'est pas mis en cause. Alerte levée par l'IA, à vérifier."
          : "Alerte levée par l'IA à la lecture des réponses. À vérifier par la modération.",
        items.map(
          (it) => `« ${it.question} » → ${it.answers[k].slice(0, 500)}`,
        ),
      );
    }
  }

  /**
   * Signalement (une fois par journée et par membre) et, pour une détresse
   * ou des violences, un message privé de ressources d'aide à l'auteur.
   */
  private async fileReport(
    journeyId: string,
    day: number,
    authorId: string,
    categories: Array<DangerCategory | AlertCategory>,
    summary: string,
    excerpts: string[],
    /** Précision du signalement (une réponse) : sinon un par journée et par membre. */
    detail?: string,
  ) {
    const tag = `${sondeurReportPrefix(journeyId)} · ${day === REVIEW_DAY ? 'bilan' : `jour ${day}`}${detail ? ` · ${detail}` : ''}`;
    const already = await this.prisma.report.findFirst({
      where: { reportedId: authorId, description: { startsWith: tag } },
      select: { id: true },
    });
    if (already) return;
    const labels = categories.map((c) => CATEGORY_LABEL[c]).join(', ');
    await this.prisma.report.create({
      data: {
        reporterId: authorId,
        reportedId: authorId,
        reason: 'autre',
        description: `${tag} · catégorie : ${labels} · catégories=[${[...new Set(categories)].join(',')}]\n${summary}\n${excerpts.join('\n')}`,
      },
    });
    this.logger.warn(
      `Parcours ${journeyId} : signal de sécurité (${labels}), modération prévenue.`,
    );
    const support = categories
      .map((c) => SUPPORT_MESSAGE[c])
      .find((m): m is string => !!m);
    if (support) {
      // Écran verrouillé : rien de sensible dans la notification (un
      // agresseur peut la voir) ; le message complet est dans l'app.
      await this.notifications
        ?.sendPushNotification(
          authorId,
          'systeme',
          'BOLIGO',
          support,
          'Un message de l’équipe BOLIGO vous attend dans l’application.',
        )
        .catch(() => undefined);
    }
  }

  /**
   * Le relecteur indépendant confirme-t-il que la lecture n'invente rien ?
   * Il peut aussi lever une alerte de sécurité.
   */
  private async fidelity(
    journeyId: string,
    items: Parameters<typeof fidelityPrompt>[0],
    names: [string, string],
    reading: SondeurReading,
    writerModel?: string,
  ): Promise<{ faithful: boolean; alert: ReadingAlert | null }> {
    const { system, prompt } = fidelityPrompt(items, names, reading);
    const raw = await this.ai.journeyCritique(
      journeyId,
      system,
      prompt,
      writerModel,
    );
    const verdict = parseFidelity(raw);
    const alert = parseAlert(raw);
    if (verdict !== true) {
      this.logger.warn(
        `Parcours ${journeyId} : lecture ${reading.day === REVIEW_DAY ? 'du bilan' : `du jour ${reading.day}`} ${verdict === false ? 'refusée (fidélité)' : 'non vérifiée'}, version des règles.`,
      );
    }
    return { faithful: verdict === true && !alert, alert };
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
    // Les écarts et les non-négociables des entretiens guident la question.
    const report = await this.interviewReport(...members);
    const analysis = report ? describeReportForAi(report, names) : undefined;
    const { system, prompt } = followUpPrompt(
      day,
      items,
      names,
      reading.toDiscuss,
      askedTexts,
      analysis,
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
    const safety = new Set(
      (report?.divergences ?? [])
        .filter((d) => SAFETY_QUESTIONS.has(d.questionId))
        .map((d) => d.theme),
    );
    const candidates = parseFollowUps(written.content).filter(
      (c) => !safety.has(c.themeKey) && !COMPROMISE.test(c.text),
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
      {
        analysis: `${analysis ? `${analysis}\n\n` : ''}RÉPONSES DU JOUR :\n${itemsBlock(items, names)}`,
        days: `jour ${day + 1}, question d'approfondissement`,
      },
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
      const placed = await this.placeFollowUp(journeyId, day + 1, {
        ...c,
        writer: written.model,
        reviewer: review.model,
      });
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
    proposal: FollowUpProposal & { writer?: string; reviewer?: string },
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
        // Traçabilité (jamais montrée aux membres).
        meta: Object.fromEntries(
          Object.entries({
            source: 'suivi',
            method: proposal.method,
            target: proposal.target,
            writer: proposal.writer,
            reviewer: proposal.reviewer,
          }).filter(([, v]) => typeof v === 'string' && v.length > 0),
        ),
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

  /** L'IA a échoué trois fois sur cette lecture : on n'attend plus. */
  private gaveUp(journeyId: string, day: number): boolean {
    const f = JourneyInsightsService.failures.get(`${journeyId}:${day}`);
    return !!f && f.count >= MAX_ATTEMPTS;
  }

  /** Analyse des deux entretiens pour les consignes de lecture (non-négociables, contrôle). */
  private async analysisFor(
    userAId: string,
    userBId: string,
    names: [string, string],
  ): Promise<string | undefined> {
    const report = await this.interviewReport(userAId, userBId);
    return report ? describeReportForAi(report, names) : undefined;
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
