import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ChatGateway } from '../chat/chat.gateway';
import {
  moderateAnswerLocally,
  moderateMessageLocally,
  maskProfanityForDisplay,
  containsContactDetails,
} from '../moderation/chat-moderation';
import { shouldRunAiModeration } from '../moderation/ai-moderation.policy';
import { PrismaService } from '../prisma/prisma.service';
import { AiService, SondeurModeration } from '../ai/ai.service';
import { QUESTIONS_BANK } from './questions.bank';
import { HarmonyQuestionPayload } from './harmony-question.types';
import { buildDivergenceReport, collectRawAnswers } from '../matching/divergence.engine';
import { AiSondeurQuestion, assembleSondeur } from './sondeur.generator';
import { draftReviewedSondeur } from './sondeur-ai';
import { NotificationService } from '../notifications/notification.service';
import { CreditService } from '../credit/credit.service';
import { GhostingService } from './ghosting.service';
import { farewellText } from './farewell';
import {
  JourneyInsightsService,
  UNCLASSIFIED_SUMMARY,
} from './journey-insights.service';
import { CHAT_OPEN_WHERE, chatOpen } from './chat-access';
import {
  DangerCategory,
  dangerCategories,
  holdsSafety,
} from './sondeur-insights';

/** Champs du membre transmis à l'IA du Sondeur : jamais de coordonnées. */
const MEMBER_CONTEXT_FIELDS = {
  id: true,
  firstName: true,
  birthDate: true,
  gender: true,
  city: true,
} as const;

/**
 * Âge, genre et ville des deux membres, pour que l'IA ne suppose pas un fait
 * de leur vie qu'elle ignore (sans contact, sans photo, sans identifiant).
 */
export function describeCoupleContext(
  members: Array<{
    firstName: string;
    birthDate: Date | null;
    gender: string | null;
    city: string | null;
  }>,
  now = new Date(),
): string {
  const genders: Record<string, string> = { H: 'homme', F: 'femme' };
  return members
    .map((m) => {
      const parts: string[] = [];
      if (m.gender && genders[m.gender]) parts.push(genders[m.gender]);
      if (m.birthDate) {
        const b = new Date(m.birthDate);
        let age = now.getFullYear() - b.getFullYear();
        if (
          now.getMonth() < b.getMonth() ||
          (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
        )
          age--;
        if (age >= 18 && age < 120) parts.push(`${age} ans`);
      }
      const city = m.city
        ?.replace(/[\n\r«»‹›"]/g, ' ')
        .trim()
        .slice(0, 60);
      if (city) parts.push(`vit à ${city}`);
      const name = m.firstName
        .replace(/[\n\r«»‹›"]/g, ' ')
        .trim()
        .slice(0, 40);
      return parts.length ? `- ${name} : ${parts.join(', ')}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

@Injectable()
export class JourneyService {
  /** Évite 2 générations IA simultanées pour le même parcours. */
  private static harmonyGenLocks = new Map<string, Promise<void>>();

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    private creditService: CreditService,
    private ghostingService: GhostingService,
    @Optional() private insights?: JourneyInsightsService,
  ) {}

  // Vérifier si l'utilisateur peut accéder aux messages
  async canAccessMessages(userId: string) {
    // Auto-réparer d'abord les journeys périmés
    await this.autoAdvanceStaleJourneys(userId);

    // Un utilisateur peut accéder aux messages dès que son parcours
    // atteint l'étape chat_libre (Sondeur terminé) ou au-delà
    const journey = await this.prisma.journey.findFirst({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId },
        ],
        AND: [CHAT_OPEN_WHERE],
      },
    });

    const canAccess = !!journey;

    return {
      canAccess,
      message: canAccess
        ? 'Accès débloqué'
        : 'Terminez votre premier parcours Harmonie pour accéder aux messages',
    };
  }

  // Progression Sondeur de l'utilisateur courant
  async getSondeurProgress(userId: string) {
    // Trouver le journey actif de l'utilisateur
    const journey = await this.prisma.journey.findFirst({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId },
        ],
        currentStep: 'phase_harmonie',
      },
      include: {
        harmonyQuestions: {
          include: { responses: true },
          orderBy: [{ day: 'asc' }, { sentAt: 'asc' }],
        },
        userA: { select: { id: true, firstName: true } },
        userB: { select: { id: true, firstName: true } },
      },
    });

    if (!journey) {
      // Pas de journey en phase_harmonie → soit déjà avancé, soit pas de match
      const anyJourney = await this.prisma.journey.findFirst({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      });
      return {
        hasJourney: !!anyJourney,
        currentStep: anyJourney?.currentStep ?? null,
        sondeurCompleted: anyJourney ? anyJourney.currentStep !== 'phase_harmonie' : false,
        answeredCount: 0,
        totalQuestions: 0,
        partnerName: null,
      };
    }

    const partner = journey.userAId === userId ? journey.userB : journey.userA;
    const totalQuestions = journey.harmonyQuestions.length;
    const answeredCount = journey.harmonyQuestions.filter(q =>
      q.responses.some(r => r.userId === userId),
    ).length;

    return {
      hasJourney: true,
      currentStep: journey.currentStep,
      sondeurCompleted: false,
      answeredCount,
      totalQuestions,
      partnerName: partner.firstName,
      journeyId: journey.id,
    };
  }

  async getStatus(journeyId: string, userId: string) {
    const journeyRow = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        userA: true,
        userB: true,
        harmonyQuestions: {
          include: { responses: true },
        },
      },
    });

    const journey = this.requireMember(journeyRow, userId);

    const isUserA = journey.userAId === userId;
    const partner = isUserA ? journey.userB : journey.userA;

    // Calculer le jour actuel (1, 2 ou 3) basé sur la date de début
    const diffTime = Math.abs(new Date().getTime() - journey.stepStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentDay = Math.min(3, diffDays);

    return {
      id: journey.id,
      currentStep: journey.currentStep,
      result: journey.result,
      currentDay,
      partnerName: partner.firstName,
      isCompleted: journey.currentStep !== 'phase_harmonie',
      // Compte à rebours anti-ghosting vu par ce membre.
      ghosting: await this.ghostingService.viewFor(journey.id, userId),
    };
  }

  /**
   * Prépare le Sondeur en arrière-plan dès l'acceptation du parcours : rédigé
   * puis relu par l'IA, il prend une à trois minutes.
   */
  prepareSondeur(journeyId: string): void {
    void this.ensureHarmonyQuestions(journeyId).catch((err) =>
      console.warn(
        `⚠️ [Journey] Préparation du Sondeur ${journeyId} : ${(err as Error).message}`,
      ),
    );
  }

  /** Attente maximale d'une préparation en cours avant de répondre à l'app. */
  private static readonly SONDEUR_WAIT_MS = 25_000;
  /** Au-delà, la réponse est enregistrée et la relecture de l'IA finit en arrière-plan. */
  private static readonly MODERATION_WAIT_MS = 10_000;
  private readonly logger = new Logger('Parcours');

  /** Génère les 21 questions (3 jours × 7) une seule fois par parcours — IA par défaut. */
  async ensureHarmonyQuestions(journeyId: string) {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: { harmonyQuestions: true },
    });
    if (!journey) throw new NotFoundException('Parcours non trouvé');

    const count = journey.harmonyQuestions.length;
    if (count >= 21) {
      if (count > 21) {
        try {
          await this.trimDuplicateHarmonyQuestions(journeyId);
        } catch (err) {
          console.warn('⚠️ [Journey] Nettoyage doublons ignoré (réponses existantes):', err);
        }
      }
      return;
    }

    const existingLock = JourneyService.harmonyGenLocks.get(journeyId);
    if (existingLock) {
      await existingLock;
      return;
    }

    let releaseLock!: () => void;
    const lock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    JourneyService.harmonyGenLocks.set(journeyId, lock);

    try {
      if (count > 0 && count < 21) {
        await this.clearHarmonyQuestionsForJourney(journeyId);
      }
      await this.generateHarmonyQuestions(journeyId);
    } finally {
      JourneyService.harmonyGenLocks.delete(journeyId);
      releaseLock();
    }
  }

  /** Supprime réponses puis questions d'un parcours (ordre FK). */
  private async clearHarmonyQuestionsForJourney(journeyId: string) {
    const ids = await this.prisma.harmonyQuestion.findMany({
      where: { journeyId },
      select: { id: true },
    });
    const questionIds = ids.map((q) => q.id);
    if (questionIds.length === 0) return;
    await this.prisma.harmonyResponse.deleteMany({
      where: { questionId: { in: questionIds } },
    });
    await this.prisma.harmonyQuestion.deleteMany({ where: { journeyId } });
  }

  /** Garde 21 questions canoniques ; supprime les doublons (réponses liées d'abord). */
  private async trimDuplicateHarmonyQuestions(journeyId: string) {
    const all = await this.prisma.harmonyQuestion.findMany({
      where: { journeyId },
      orderBy: [{ day: 'asc' }, { sentAt: 'asc' }],
      include: { responses: true },
    });

    const keepIds = new Set<string>();
    const toDelete: string[] = [];
    const seenKeys = new Set<string>();

    for (const q of all) {
      const key = `${q.day}:${this.normalizeQuestionKey(q.questionText)}`;
      if (!seenKeys.has(key) && keepIds.size < 21) {
        seenKeys.add(key);
        keepIds.add(q.id);
      } else {
        toDelete.push(q.id);
      }
    }

    if (toDelete.length === 0) return;

    await this.prisma.harmonyResponse.deleteMany({
      where: { questionId: { in: toDelete } },
    });
    await this.prisma.harmonyQuestion.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log(`🧹 [Journey] ${toDelete.length} questions doublons supprimées pour ${journeyId}`);
  }

  /** Au plus 21 questions uniques renvoyées à l'app (filet si la base en contient plus). */
  private pickCanonicalHarmonyQuestions<T extends { day: number; questionText: string }>(
    questions: T[],
  ): T[] {
    const keep: T[] = [];
    const seen = new Set<string>();
    for (const q of questions) {
      const key = `${q.day}:${this.normalizeQuestionKey(q.questionText)}`;
      if (seen.has(key) || keep.length >= 21) continue;
      seen.add(key);
      keep.push(q);
    }
    return keep;
  }

  /** Vérifie que l'utilisateur fait partie du parcours (404 si absent, 403 sinon). */
  private requireMember<T extends { userAId: string; userBId: string }>(journey: T | null, userId: string): T {
    if (!journey) throw new NotFoundException('Parcours non trouvé');
    if (journey.userAId !== userId && journey.userBId !== userId) {
      throw new ForbiddenException('Vous ne faites pas partie de ce parcours');
    }
    return journey;
  }

  async getDailyQuestions(journeyId: string, userId: string) {
    this.requireMember(
      await this.prisma.journey.findUnique({ where: { id: journeyId }, select: { userAId: true, userBId: true } }),
      userId,
    );

    // Préparation en cours (IA lente) : on attend un peu, puis l'app réessaie.
    // Jamais de liste à moitié écrite : tant que la préparation tourne, rien.
    let waitTimer: NodeJS.Timeout | undefined;
    await Promise.race([
      this.ensureHarmonyQuestions(journeyId),
      new Promise<void>((resolve) => {
        waitTimer = setTimeout(resolve, JourneyService.SONDEUR_WAIT_MS);
      }),
    ]);
    clearTimeout(waitTimer);
    if (JourneyService.harmonyGenLocks.has(journeyId)) return [];

    const questions = await this.prisma.harmonyQuestion.findMany({
      where: { journeyId },
      orderBy: [{ day: 'asc' }, { sentAt: 'asc' }],
      include: { responses: true },
    });

    // Réponse qui évoque un danger pour l'autre : cachée tant que l'équipe ne
    // l'a pas rejetée (jamais une confidence de violence subie). Sans le
    // service des lectures, le code seul décide, par prudence.
    const safety = this.insights ? await this.insights.safety(journeyId) : null;
    const hidden = (
      authorId: string,
      day: number,
      question: string,
      text: string,
    ) =>
      safety
        ? safety.hidden(authorId, day, question, text)
        : holdsSafety(dangerCategories(text));
    return this.pickCanonicalHarmonyQuestions(questions).map((q) => {
      const bankQ = QUESTIONS_BANK.find((bq) => bq.text === q.questionText);
      const storedOptions = Array.isArray(q.options) ? (q.options as string[]) : null;
      // La réponse du partenaire n'est révélée qu'après la sienne : personne
      // ne peut s'aligner sur l'autre avant d'avoir répondu.
      const answered = q.responses.some((r) => r.userId === userId);
      // Mots grossiers cités dans un récit : masqués chez l'autre membre.
      const visible = answered
        ? q.responses
        : q.responses.filter((r) => r.userId === userId);
      return {
        ...q,
        responses: visible.map((r) =>
          r.userId === userId
            ? r
            : {
                ...r,
                responseText: hidden(
                  r.userId,
                  q.day,
                  q.questionText,
                  r.responseText,
                )
                  ? 'Réponse en cours de vérification par l’équipe BOLIGO.'
                  : maskProfanityForDisplay(r.responseText),
              },
        ),
        partnerAnswered: q.responses.some((r) => r.userId !== userId),
        emoji: q.emoji ?? bankQ?.emoji ?? '💬',
        options: storedOptions ?? bankQ?.options ?? null,
      };
    });
  }

  /** IA par défaut ; mettre HARMONY_QUESTIONS_SOURCE=bank pour désactiver. */
  private useAiHarmonyQuestions(): boolean {
    return process.env.HARMONY_QUESTIONS_SOURCE !== 'bank';
  }

  private normalizeQuestionKey(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /** Nombre de parcours passés pris en compte pour éviter les redites. */
  private static readonly QUESTION_HISTORY_JOURNEYS = 12;

  /**
   * Questions déjà posées à l'un ou l'autre membre lors de ses parcours
   * précédents, quel que soit le partenaire (le couple actuel inclus) :
   * le Sondeur les écarte pour ne pas resservir les mêmes questions.
   */
  private async getMembersPreviousQuestionTexts(
    userAId: string,
    userBId: string,
    excludeJourneyId?: string,
  ): Promise<string[]> {
    const members = [userAId, userBId];
    const journeys = await this.prisma.journey.findMany({
      where: {
        id: excludeJourneyId ? { not: excludeJourneyId } : undefined,
        OR: [{ userAId: { in: members } }, { userBId: { in: members } }],
      },
      orderBy: { createdAt: 'desc' },
      take: JourneyService.QUESTION_HISTORY_JOURNEYS,
      include: { harmonyQuestions: { select: { questionText: true } } },
    });

    const texts = new Set<string>();
    for (const j of journeys) {
      for (const q of j.harmonyQuestions) {
        if (q.questionText?.trim()) texts.add(q.questionText.trim());
      }
    }
    return Array.from(texts);
  }

  private async generateHarmonyQuestions(journeyId: string) {
    const existing = await this.prisma.harmonyQuestion.count({ where: { journeyId } });
    if (existing > 0) return;

    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        userA: { select: MEMBER_CONTEXT_FIELDS },
        userB: { select: MEMBER_CONTEXT_FIELDS },
      },
    });

    if (!journey) return;

    const [interviewA, interviewB] = await Promise.all(
      [journey.userAId, journey.userBId].map((userId) =>
        this.prisma.interviewIA.findFirst({
          where: { userId, status: { in: ['en_cours', 'termine'] } },
          orderBy: { startDate: 'desc' },
          include: { responses: true },
        }),
      ),
    );

    // 1. Moteur de divergences déterministe sur les réponses brutes des deux entretiens.
    const report = buildDivergenceReport(
      collectRawAnswers(interviewA?.responses),
      collectRawAnswers(interviewB?.responses),
    );
    // Prénoms écrits par les membres : courts, sur une ligne, sans guillemets
    // (ils entrent dans les consignes de l'IA).
    const firstNames = [journey.userA.firstName, journey.userB.firstName].map(
      (n) =>
        n
          .replace(/[\n\r«»‹›"]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 40),
    ) as [string, string];
    const history = await this.getMembersPreviousQuestionTexts(journey.userAId, journey.userBId, journeyId);

    // 2. Couche IA des parcours payés : deux propositions par créneau, écrites
    //    avec un regard clinique, contrôlées par le code puis relues jour par
    //    jour par un modèle d'une autre famille. Sans paiement : gabarits.
    let aiQuestions: HarmonyQuestionPayload[] = [];
    let preferAi = false;
    if (this.useAiHarmonyQuestions()) {
      const ai = await draftReviewedSondeur(this.aiService, {
        report,
        firstNames,
        history,
        couple: describeCoupleContext([journey.userA, journey.userB]),
        scope: { journeyId, paidOnly: true },
      });
      aiQuestions = ai.questions;
      preferAi = ai.preferAi;
    }

    // 3. Assemblage : toujours 21 (3 × 7). Questions de l'IA relues en premier ;
    //    sinon divergence réelle → IA conforme → gabarit du thème.
    const questions = assembleSondeur({
      report,
      firstNames,
      aiQuestions: aiQuestions as AiSondeurQuestion[],
      history,
      seed: journeyId,
      preferAi,
    });
    const sources = questions.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.source]: (acc[q.source] ?? 0) + 1 }), {});
    console.log(`🧭 [Journey] Sondeur assemblé pour ${journeyId} :`, sources, `(${report.divergences.length} divergences)`);

    await this.persistHarmonyQuestions(journeyId, questions);
  }

  private async persistHarmonyQuestions(
    journeyId: string,
    payloads: Array<HarmonyQuestionPayload & { source?: string }>,
  ) {
    const seen = new Set<string>();
    for (const q of payloads) {
      const key = this.normalizeQuestionKey(q.text);
      if (seen.has(key)) continue;
      seen.add(key);
      // Traçabilité (jamais montrée aux membres) : origine, méthode, modèles.
      const meta = Object.fromEntries(
        Object.entries({
          source: q.source,
          method: q.method,
          target: q.target,
          writer: q.writer,
          reviewer: q.reviewer,
        }).filter(([, v]) => typeof v === 'string' && v.length > 0),
      );
      await this.prisma.harmonyQuestion.create({
        data: {
          journeyId,
          day: q.day,
          theme: q.theme,
          emoji: q.emoji,
          questionText: q.text,
          options: q.options,
          ...(Object.keys(meta).length ? { meta } : {}),
        },
      });
    }
    console.log(`✅ [Journey] ${payloads.length} questions Sondeur enregistrées pour ${journeyId}`);
  }

  /** Jour calendaire courant d'un parcours (1..3), même règle que getStatus(). */
  private currentJourneyDay(stepStartDate: Date): number {
    const diffTime = Math.abs(Date.now() - stepStartDate.getTime());
    return Math.min(3, Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
  }

  async respondToQuestion(questionId: string, userId: string, text: string) {
    const question = await this.prisma.harmonyQuestion.findUnique({
      where: { id: questionId },
      include: { journey: true, responses: { where: { userId } } },
    });
    if (!question) throw new NotFoundException('Question introuvable');
    const journey = question.journey;
    if (journey.userAId !== userId && journey.userBId !== userId) {
      throw new ForbiddenException('Vous ne faites pas partie de ce parcours');
    }
    if (journey.currentStep !== 'phase_harmonie') {
      throw new BadRequestException('La phase Harmonie de ce parcours est terminée.');
    }
    if (question.responses.length > 0) {
      throw new BadRequestException('Vous avez déjà répondu à cette question.');
    }
    // Règle BOLIGO : 7 questions par jour pendant 3 jours — une journée ne
    // s'ouvre que lorsque le jour calendaire est atteint.
    const today = this.currentJourneyDay(journey.stepStartDate);
    if (question.day > today) {
      throw new BadRequestException(
        `Cette question fait partie du jour ${question.day} : elle sera disponible ${question.day - today === 1 ? 'demain' : `dans ${question.day - today} jours`}.`,
      );
    }

    const trimmed = text.trim();
    if (!trimmed) throw new BadRequestException('Réponse vide.');
    if (trimmed.length > 500) {
      throw new BadRequestException(
        'Réponse trop longue (500 caractères max).',
      );
    }
    // Coordonnées : jamais dans le Sondeur, même dans une réponse qui évoque
    // un danger (elles s'échangent à l'étape prévue du parcours).
    if (containsContactDetails(trimmed)) {
      throw new BadRequestException(
        'Pas de coordonnées dans le Sondeur : elles s’échangent à l’étape prévue.',
      );
    }
    // Une réponse qui évoque un danger (violence subie ou exercée, menace,
    // contrôle, détresse, demande d'argent, minorité) est toujours
    // enregistrée : une victime peut citer ce qu'elle a subi, et la
    // modération est prévenue dès l'envoi. Refusée, elle disparaîtrait sans
    // laisser de trace.
    const codeDanger = dangerCategories(trimmed);
    let aiDanger: DangerCategory[] = [];
    let late: Promise<SondeurModeration> | null = null;
    // Parcours payé dont la réponse n'a pas pu être relue (IA lente ou en
    // panne) : fermé par défaut, la réponse reste cachée jusqu'au classement.
    let unclassified = false;
    if (!codeDanger.length) {
      const local = moderateAnswerLocally(trimmed);
      if (!local.allowed) {
        throw new BadRequestException(local.reason);
      }
    }
    // Parcours payé : chaque réponse est relue par l'IA à l'envoi, qui
    // repère aussi un danger que le code ne voit pas (seconde ligne de
    // défense, sans attendre la fin de la journée de l'autre membre). Une
    // confidence de violence subie est relue aussi : la même réponse peut
    // contenir une menace.
    if (!holdsSafety(codeDanger)) {
      const paid = await this.aiService.journeyAiEligible(journey.id);
      if (paid || (!codeDanger.length && shouldRunAiModeration(trimmed))) {
        const pending = this.aiService.moderateSondeurAnswer(
          trimmed,
          journey.id,
        );
        const aiMod = await Promise.race([
          pending,
          new Promise<null>((resolve) => {
            const timer = setTimeout(
              () => resolve(null),
              JourneyService.MODERATION_WAIT_MS,
            );
            timer.unref();
          }),
        ]);
        if (aiMod === null) {
          // Relecture lente : la réponse est enregistrée, le classement suit.
          late = pending;
          unclassified = paid;
        } else if (aiMod.unavailable) {
          unclassified = paid;
        } else if (aiMod.danger?.length) {
          aiDanger = aiMod.danger;
        } else if (!aiMod.allowed && !codeDanger.length) {
          // Jamais montrée à l'autre : signalée sans retenir la messagerie.
          await this.insights?.reportRefusal(
            journey.id,
            question.day,
            userId,
            question.questionText,
            trimmed,
            `${aiMod.category ?? 'motif non précisé'} : ${aiMod.reason ?? 'sans détail'}`,
          );
          throw new BadRequestException(
            aiMod.reason || 'Réponse incompatible avec les règles BOLIGO.',
          );
        }
      }
    }

    // Danger : signalé dès l'envoi, avant d'enregistrer la réponse (si le
    // signalement échoue, la réponse n'est pas enregistrée non plus).
    const danger = [...new Set([...codeDanger, ...aiDanger])];
    if (danger.length || unclassified) {
      await this.insights?.reportAnswer(
        journey.id,
        question.day,
        userId,
        question.questionText,
        trimmed,
        unclassified ? [...danger, 'autre'] : danger,
        unclassified ? UNCLASSIFIED_SUMMARY : undefined,
      );
    }
    const response = await this.prisma.harmonyResponse.create({
      data: {
        questionId,
        userId,
        responseText: trimmed,
      },
    });
    if (late) {
      void late
        .then((m) =>
          this.insights?.resolveClassification(
            journey.id,
            question.day,
            userId,
            question.questionText,
            trimmed,
            m.unavailable ? null : (m.danger ?? []),
          ),
        )
        .catch((err: Error) =>
          this.logger.error(
            `Parcours ${journey.id} : classement tardif impossible (${err.message}).`,
          ),
        );
    }

    // Vérifier si toutes les questions sont répondues pour débloquer l'étape suivante
    await this.checkProgression(questionId);
    // Journée terminée par les deux : lecture de l'IA écrite en arrière-plan.
    void this.insights?.refresh(journey.id);

    return response;
  }

  /** Lectures du Sondeur (chaque journée terminée par les deux, puis le bilan). */
  async getInsights(journeyId: string, userId: string) {
    this.requireMember(
      await this.prisma.journey.findUnique({
        where: { id: journeyId },
        select: { userAId: true, userBId: true },
      }),
      userId,
    );
    if (!this.insights) return { days: [], review: null, writing: false };
    return this.insights.view(journeyId);
  }

  // Chat libre : envoyer un message (modération locale + IA)
  async sendMessage(journeyId: string, senderId: string, content: string, type: string) {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
    });

    if (!journey) {
      throw new NotFoundException('Parcours non trouvé');
    }

    if (journey.userAId !== senderId && journey.userBId !== senderId) {
      throw new ForbiddenException('Vous ne faites pas partie de ce parcours');
    }

    if (!chatOpen(journey)) {
      throw new BadRequestException(
        'Les messages sont disponibles après la phase Harmonie (chat libre).',
      );
    }

    const trimmed = content.trim();
    const local = moderateMessageLocally(trimmed);
    if (!local.allowed) {
      throw new BadRequestException(local.reason);
    }

    if (shouldRunAiModeration(trimmed)) {
      const aiMod = await this.aiService.moderateChatMessage(trimmed);
      if (!aiMod.allowed) {
        throw new BadRequestException(
          aiMod.reason ||
            'Ce message ne respecte pas les règles de respect de BOLIGO.',
        );
      }
    }

    const message = await this.prisma.message.create({
      data: {
        journeyId,
        senderId,
        content: trimmed,
        type: type as any,
        moderationStatus: 'ok',
      },
      include: {
        sender: { select: { id: true, firstName: true } },
      },
    });

    const payload = {
      ...message,
      content: maskProfanityForDisplay(message.content),
    };
    this.chatGateway.broadcastNewMessage(journeyId, payload);
    return payload;
  }

  // Chat libre : récupérer les messages
  async getMessages(journeyId: string, userId: string) {
    this.requireMember(
      await this.prisma.journey.findUnique({ where: { id: journeyId }, select: { userAId: true, userBId: true } }),
      userId,
    );
    const rows = await this.prisma.message.findMany({
      where: { journeyId, moderationStatus: 'ok' },
      orderBy: { sentAt: 'asc' },
      include: { sender: { select: { id: true, firstName: true } } },
    });

    return rows.map((m) => ({
      ...m,
      content: maskProfanityForDisplay(m.content),
    }));
  }

  private async checkProgression(questionId: string) {
    const question = await this.prisma.harmonyQuestion.findUnique({
      where: { id: questionId },
      select: { journeyId: true },
    });
    // Les DEUX doivent avoir répondu à TOUTES les questions pour débloquer.
    if (question) await this.openChatIfReady(question.journeyId);
  }

  /**
   * Seul chemin vers la messagerie : les deux membres ont répondu à tout le
   * Sondeur et rien ne la retient (signalement, lecture de l'IA attendue).
   * Sans le service des lectures, elle reste fermée. Renvoie vrai si la
   * messagerie vient de s'ouvrir.
   */
  async openChatIfReady(journeyId: string): Promise<boolean> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        userA: { select: { firstName: true } },
        userB: { select: { firstName: true } },
        harmonyQuestions: {
          include: { responses: { select: { userId: true } } },
        },
      },
    });
    if (
      !journey ||
      journey.currentStep !== 'phase_harmonie' ||
      journey.result !== 'en_cours'
    )
      return false;
    const answeredAll = (memberId: string) =>
      journey.harmonyQuestions.length > 0 &&
      journey.harmonyQuestions.every((q) =>
        q.responses.some((r) => r.userId === memberId),
      );
    if (!answeredAll(journey.userAId) || !answeredAll(journey.userBId))
      return false;
    // Une réponse évoque un danger et la modération n'a pas tranché : la
    // messagerie attend (elle s'ouvrira à la prochaine visite, après la
    // décision de l'équipe).
    if (!this.insights || (await this.insights.holdsChat(journeyId)))
      return false;
    // Le chat libre dure 3 jours à partir de maintenant, pas du début du parcours.
    const moved = await this.prisma.journey.updateMany({
      where: {
        id: journeyId,
        currentStep: 'phase_harmonie',
        result: 'en_cours',
      },
      data: { currentStep: 'chat_libre', stepStartDate: new Date() },
    });
    if (moved.count === 0) return false;
    await this.notificationService.notifyChatOpen(
      journey.userAId,
      journey.userB.firstName,
    );
    await this.notificationService.notifyChatOpen(
      journey.userBId,
      journey.userA.firstName,
    );
    return true;
  }

  // Auto-réparer les parcours et appliquer la Règle de Justice (anti-ghosting)
  private async autoAdvanceStaleJourneys(userId: string) {
    const journeys = await this.prisma.journey.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        currentStep: { in: ['phase_harmonie', 'chat_libre'] },
        result: 'en_cours',
      },
      select: { id: true, currentStep: true, stepStartDate: true },
    });

    for (const journey of journeys) {
      // phase_harmonie → chat_libre : les deux ont répondu à tout le Sondeur
      if (journey.currentStep === 'phase_harmonie')
        await this.openChatIfReady(journey.id);

      // chat_libre → video : après 3 jours
      if (journey.currentStep === 'chat_libre') {
        const daysSinceChat = (Date.now() - journey.stepStartDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceChat >= 3) {
          await this.prisma.journey.updateMany({
            where: { id: journey.id, currentStep: 'chat_libre' },
            data: { currentStep: 'video', stepStartDate: new Date() },
          });
        }
      }
    }

    // Règle de Justice : si l'un attend l'autre au-delà de l'échéance, le
    // parcours se clôt et la personne qui attendait récupère son crédit.
    await this.ghostingService.enforceForUser(userId);
  }

  // Échange de contacts : un utilisateur accepte de partager
  async exchangeContact(journeyId: string, userId: string, sharePhone: boolean, shareEmail: boolean) {
    const updated = await this.prisma.$transaction(async (tx) => {
      // Deux consentements simultanés ne doivent ni créer deux lignes ni
      // écraser le choix de l'autre membre.
      await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${'contact:' + journeyId}))) AS lock`;
      const journey = this.requireMember(
        await tx.journey.findUnique({
          where: { id: journeyId },
          include: { contactExchange: true },
        }),
        userId,
      );
      if (journey.currentStep !== 'echange_contacts' || journey.result !== 'en_cours') {
        throw new BadRequestException(
          "L'échange de coordonnées s'ouvre après l'appel vidéo du parcours.",
        );
      }

      const isUserA = journey.userAId === userId;
      const existing = journey.contactExchange;
      const alreadyConsented = isUserA ? existing?.consentA : existing?.consentB;
      if (existing && alreadyConsented) return existing;

      if (!existing) {
        return tx.contactExchange.create({
          data: {
            journeyId,
            ...(isUserA ? { consentA: true } : { consentB: true }),
            phoneShared: sharePhone === true,
            emailShared: shareEmail === true,
          },
        });
      }

      // Un canal n'est partagé que si les DEUX membres l'acceptent : le refus
      // de l'un n'est jamais levé par le consentement de l'autre.
      const partnerConsented = isUserA ? existing.consentB : existing.consentA;
      return tx.contactExchange.update({
        where: { id: existing.id },
        data: {
          ...(isUserA ? { consentA: true } : { consentB: true }),
          phoneShared: existing.phoneShared && sharePhone === true,
          emailShared: existing.emailShared && shareEmail === true,
          exchangedAt: partnerConsented ? new Date() : existing.exchangedAt,
        },
      });
    });

    const bothAccepted = updated.consentA && updated.consentB;

    if (bothAccepted) {
      await this.prisma.journey.updateMany({
        where: { id: journeyId, currentStep: 'echange_contacts' },
        data: { currentStep: 'termine', result: 'reussi', endDate: new Date() },
      });
    }

    return {
      consentA: updated.consentA,
      consentB: updated.consentB,
      phoneShared: updated.phoneShared,
      emailShared: updated.emailShared,
      exchangedAt: updated.exchangedAt,
      bothAccepted,
    };
  }

  // Récupérer le statut d'échange de contacts
  async getContactExchange(journeyId: string, userId: string) {
    const journeyRow = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        contactExchange: true,
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
      },
    });

    const journey = this.requireMember(journeyRow, userId);

    const isUserA = journey.userAId === userId;
    const partner = isUserA ? journey.userB : journey.userA;
    const myConsent = isUserA ? journey.contactExchange?.consentA : journey.contactExchange?.consentB;
    const partnerConsent = isUserA ? journey.contactExchange?.consentB : journey.contactExchange?.consentA;
    const bothAccepted = Boolean(myConsent && partnerConsent);

    // Double consentement : les coordonnées ne quittent le serveur que si les
    // DEUX membres ont accepté l'échange.
    return {
      myConsent: myConsent ?? false,
      partnerConsent: partnerConsent ?? false,
      bothAccepted,
      phoneShared: journey.contactExchange?.phoneShared ?? false,
      emailShared: journey.contactExchange?.emailShared ?? false,
      partner: {
        firstName: partner.firstName,
        telephone: bothAccepted && journey.contactExchange?.phoneShared ? partner.telephone : null,
        email: bothAccepted && journey.contactExchange?.emailShared ? partner.email : null,
        profession: partner.profile?.profession,
        displayedCity: partner.profile?.displayedCity || partner.city,
      },
    };
  }

  /**
   * Un membre met fin au parcours (malaise, signalement, ou simplement pas
   * d'envie de continuer). Le parcours se clôt pour les deux ; l'autre membre
   * reçoit le message de courtoisie choisi et récupère son crédit, une fois.
   */
  async leaveJourney(journeyId: string, userId: string, farewell?: string) {
    const journey = this.requireMember(
      await this.prisma.journey.findUnique({
        where: { id: journeyId },
        include: {
          userA: { select: { firstName: true } },
          userB: { select: { firstName: true } },
        },
      }),
      userId,
    );
    const closed = await this.prisma.journey.updateMany({
      where: { id: journeyId, result: 'en_cours' },
      data: {
        currentStep: 'termine',
        result: 'abandonne',
        endDate: new Date(),
        closingReason: 'Parcours arrêté par un membre',
      },
    });
    if (closed.count === 0) {
      throw new BadRequestException('Ce parcours est déjà terminé.');
    }

    const partnerId = journey.userAId === userId ? journey.userBId : journey.userAId;
    const leaver = journey.userAId === userId ? journey.userA : journey.userB;
    const refunded = await this.creditService.refundJourneyOnce(
      partnerId,
      journeyId,
      `Parcours arrêté par ${leaver.firstName} : crédit rendu`,
    );
    const courtesy = farewellText(farewell);
    try {
      await this.notificationService.sendPushNotification(
        partnerId,
        'systeme',
        'Parcours terminé',
        `${leaver.firstName} a mis fin à votre parcours.` +
          (courtesy ? ` Son message : « ${courtesy} »` : '') +
          (refunded ? ' Votre crédit vous a été rendu.' : ''),
      );
    } catch {
      /* notification facultative */
    }
    return { success: true };
  }

  /**
   * Avancement manuel : uniquement vidéo → échange de coordonnées, et seulement
   * si les deux membres ont rejoint l'appel. Les autres étapes avancent
   * d'elles-mêmes (Sondeur terminé, délai de chat, fin d'appel).
   */
  async advanceStep(journeyId: string, userId: string, step: string) {
    const journey = this.requireMember(
      await this.prisma.journey.findUnique({
        where: { id: journeyId },
        include: { videoSession: true },
      }),
      userId,
    );
    if (journey.result !== 'en_cours') {
      throw new BadRequestException('Ce parcours est terminé.');
    }
    if (step !== 'echange_contacts' || journey.currentStep !== 'video') {
      throw new BadRequestException(
        "Cette étape s'ouvre automatiquement : elle ne peut pas être forcée.",
      );
    }
    const call = journey.videoSession;
    if (!call?.consentA || !call?.consentB) {
      throw new BadRequestException(
        "L'échange de coordonnées s'ouvre après l'appel vidéo avec les deux membres.",
      );
    }

    await this.prisma.journey.updateMany({
      where: { id: journeyId, currentStep: 'video' },
      data: { currentStep: 'echange_contacts', stepStartDate: new Date() },
    });
    return { success: true, currentStep: 'echange_contacts' };
  }
}
