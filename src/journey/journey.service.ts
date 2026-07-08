import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { ChatGateway } from '../chat/chat.gateway';
import { moderateMessageLocally, maskProfanityForDisplay } from '../moderation/chat-moderation';
import { shouldRunAiModeration } from '../moderation/ai-moderation.policy';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { QUESTIONS_BANK, BankQuestion } from './questions.bank';
import {
  assignDaysTwoPerDay,
  bankToPayload,
  HarmonyQuestionPayload,
} from './harmony-question.types';
import { NotificationService } from '../notifications/notification.service';
import { CreditService } from '../credit/credit.service';

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
        currentStep: { in: ['chat_libre', 'video', 'echange_contacts', 'termine'] },
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
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        userA: true,
        userB: true,
        harmonyQuestions: {
          include: { responses: true },
        },
      },
    });

    if (!journey) throw new NotFoundException('Parcours non trouvé');

    const isUserA = journey.userAId === userId;
    const partner = isUserA ? journey.userB : journey.userA;

    // Calculer le jour actuel (1, 2 ou 3) basé sur la date de début
    const diffTime = Math.abs(new Date().getTime() - journey.stepStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentDay = Math.min(3, diffDays);

    return {
      id: journey.id,
      currentStep: journey.currentStep,
      currentDay,
      partnerName: partner.firstName,
      isCompleted: journey.currentStep !== 'phase_harmonie',
    };
  }

  /** Génère les 6 questions (3 jours × 2) une seule fois par parcours — IA par défaut. */
  async ensureHarmonyQuestions(journeyId: string) {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: { harmonyQuestions: true },
    });
    if (!journey) throw new NotFoundException('Parcours non trouvé');

    const count = journey.harmonyQuestions.length;
    if (count >= 6) {
      if (count > 6) {
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
      if (count > 0 && count < 6) {
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

  /** Garde 6 questions canoniques ; supprime les doublons (réponses liées d'abord). */
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
      if (!seenKeys.has(key) && keepIds.size < 6) {
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

  /** Au plus 6 questions uniques renvoyées à l'app (filet si la base en contient plus). */
  private pickCanonicalHarmonyQuestions<T extends { day: number; questionText: string }>(
    questions: T[],
  ): T[] {
    const keep: T[] = [];
    const seen = new Set<string>();
    for (const q of questions) {
      const key = `${q.day}:${this.normalizeQuestionKey(q.questionText)}`;
      if (seen.has(key) || keep.length >= 6) continue;
      seen.add(key);
      keep.push(q);
    }
    return keep;
  }

  async getDailyQuestions(journeyId: string) {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: { harmonyQuestions: true },
    });

    if (!journey) throw new NotFoundException('Parcours non trouvé');

    await this.ensureHarmonyQuestions(journeyId);

    const questions = await this.prisma.harmonyQuestion.findMany({
      where: { journeyId },
      orderBy: [{ day: 'asc' }, { sentAt: 'asc' }],
      include: { responses: true },
    });

    return this.pickCanonicalHarmonyQuestions(questions).map((q) => {
      const bankQ = QUESTIONS_BANK.find((bq) => bq.text === q.questionText);
      const storedOptions = Array.isArray(q.options) ? (q.options as string[]) : null;
      return {
        ...q,
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

  /** Questions déjà posées à ce couple (autres parcours inclus). */
  private async getCouplePreviousQuestionTexts(
    userAId: string,
    userBId: string,
    excludeJourneyId?: string,
  ): Promise<string[]> {
    const journeys = await this.prisma.journey.findMany({
      where: {
        id: excludeJourneyId ? { not: excludeJourneyId } : undefined,
        OR: [
          { userAId, userBId },
          { userAId: userBId, userBId: userAId },
        ],
      },
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

  private filterFreshPayloads(
    payloads: HarmonyQuestionPayload[],
    usedTexts: string[],
  ): HarmonyQuestionPayload[] {
    const usedKeys = new Set(usedTexts.map((t) => this.normalizeQuestionKey(t)));
    const seen = new Set<string>();
    return payloads.filter((p) => {
      const key = this.normalizeQuestionKey(p.text);
      if (usedKeys.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async buildAiPayloads(
    mapA: any,
    mapB: any,
    avoidTexts: string[],
  ): Promise<HarmonyQuestionPayload[] | null> {
    let payloads = await this.aiService.generatePersonalizedHarmonyQuestions(
      mapA,
      mapB,
      avoidTexts,
    );

    if (payloads?.length) {
      payloads = assignDaysTwoPerDay(payloads);
      payloads = this.filterFreshPayloads(payloads, avoidTexts);
    }

    if (payloads && payloads.length >= 6) {
      return payloads.slice(0, 6);
    }

    const usedKeys = new Set(avoidTexts.map((t) => this.normalizeQuestionKey(t)));
    const excludeIds = QUESTIONS_BANK.filter((q) =>
      usedKeys.has(this.normalizeQuestionKey(q.text)),
    ).map((q) => q.id);

    const selectedIds = await this.aiService.selectHarmonyQuestions(
      mapA,
      mapB,
      QUESTIONS_BANK,
      excludeIds,
    );
    const fromBank: BankQuestion[] = selectedIds
      ? selectedIds
          .map((id) => QUESTIONS_BANK.find((q) => q.id === id))
          .filter((q): q is BankQuestion => !!q)
      : [];

    const padded = this.padBankQuestions(fromBank, excludeIds);
    payloads = assignDaysTwoPerDay(
      padded.map((q, i) => bankToPayload(q, Math.floor(i / 2) + 1)),
    );
    payloads = this.filterFreshPayloads(payloads, avoidTexts);

    return payloads.length >= 6 ? payloads.slice(0, 6) : null;
  }

  private buildBankPayloads(excludeIds: string[] = []): HarmonyQuestionPayload[] {
    const pool = QUESTIONS_BANK.filter((q) => !excludeIds.includes(q.id));
    const picked = this.padBankQuestions(pool.slice(0, 12), excludeIds);
    return assignDaysTwoPerDay(
      picked.map((q, i) => bankToPayload(q, Math.floor(i / 2) + 1)),
    );
  }

  private async generateHarmonyQuestions(journeyId: string) {
    const existing = await this.prisma.harmonyQuestion.count({ where: { journeyId } });
    if (existing > 0) return;

    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        userA: { include: { mentalMaps: { orderBy: { generatedAt: 'desc' }, take: 1 } } },
        userB: { include: { mentalMaps: { orderBy: { generatedAt: 'desc' }, take: 1 } } },
      },
    });

    if (!journey) return;

    const avoidTexts = await this.getCouplePreviousQuestionTexts(
      journey.userAId,
      journey.userBId,
      journeyId,
    );

    const mapA = journey.userA.mentalMaps[0];
    const mapB = journey.userB.mentalMaps[0];
    let payloads: HarmonyQuestionPayload[] | null = null;

    if (this.useAiHarmonyQuestions() && mapA && mapB) {
      console.log('🤖 [Journey] Génération IA Sondeur (éviter répétitions:', avoidTexts.length, ')');
      payloads = await this.buildAiPayloads(mapA, mapB, avoidTexts);
    }

    if (!payloads || payloads.length < 6) {
      console.log('📋 [Journey] Complément banque (IA indisponible ou cartes manquantes)');
      const usedKeys = new Set([
        ...avoidTexts.map((t) => this.normalizeQuestionKey(t)),
        ...(payloads ?? []).map((p) => this.normalizeQuestionKey(p.text)),
      ]);
      const excludeIds = QUESTIONS_BANK.filter((q) =>
        usedKeys.has(this.normalizeQuestionKey(q.text)),
      ).map((q) => q.id);
      const bankPart = this.buildBankPayloads(excludeIds);
      const merged = this.filterFreshPayloads(
        [...(payloads ?? []), ...bankPart],
        avoidTexts,
      );
      payloads = assignDaysTwoPerDay(merged).slice(0, 6);
    }

    if (!payloads || payloads.length < 6) {
      payloads = this.buildBankPayloads();
    }

    await this.persistHarmonyQuestions(journeyId, payloads.slice(0, 6));
  }

  private padBankQuestions(selected: BankQuestion[], excludeIds: string[] = []): BankQuestion[] {
    const result = [...selected];
    const pool = QUESTIONS_BANK.filter((q) => !excludeIds.includes(q.id));
    for (const d of pool) {
      if (result.length >= 6) break;
      if (!result.find((s) => s.id === d.id)) result.push(d);
    }
    return result.slice(0, 6);
  }

  private async persistHarmonyQuestions(
    journeyId: string,
    payloads: HarmonyQuestionPayload[],
  ) {
    const seen = new Set<string>();
    for (const q of payloads) {
      const key = this.normalizeQuestionKey(q.text);
      if (seen.has(key)) continue;
      seen.add(key);
      await this.prisma.harmonyQuestion.create({
        data: {
          journeyId,
          day: q.day,
          theme: q.theme,
          emoji: q.emoji,
          questionText: q.text,
          options: q.options,
        },
      });
    }
    console.log(`✅ [Journey] ${payloads.length} questions Sondeur enregistrées pour ${journeyId}`);
  }

  private getDefaultQuestions(): BankQuestion[] {
    return QUESTIONS_BANK.filter(q =>
      ['lr_01', 'lr_02', 'val_01', 'val_02', 'fut_01', 'fut_02'].includes(q.id)
    );
  }

  private async generateFallbackQuestions(journeyId: string) {
    const payloads = assignDaysTwoPerDay(
      this.getDefaultQuestions().map((q, i) =>
        bankToPayload(q, Math.floor(i / 2) + 1),
      ),
    );
    await this.persistHarmonyQuestions(journeyId, payloads);
  }

  async respondToQuestion(questionId: string, userId: string, text: string) {
    const trimmed = text.trim();
    const local = moderateMessageLocally(trimmed);
    if (!local.allowed) {
      throw new BadRequestException(local.reason);
    }
    if (shouldRunAiModeration(trimmed)) {
      const aiMod = await this.aiService.moderateChatMessage(trimmed);
      if (!aiMod.allowed) {
        throw new BadRequestException(
          aiMod.reason || 'Réponse incompatible avec les règles BOLIGO.',
        );
      }
    }

    const response = await this.prisma.harmonyResponse.create({
      data: {
        questionId,
        userId,
        responseText: trimmed,
      },
    });

    // Vérifier si toutes les questions sont répondues pour débloquer l'étape suivante
    await this.checkProgression(questionId);

    return response;
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

    const chatSteps = ['chat_libre', 'video', 'echange_contacts', 'termine'];
    if (!chatSteps.includes(journey.currentStep)) {
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
  async getMessages(journeyId: string) {
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
      include: {
        journey: {
          include: {
            userA: true,
            userB: true,
            harmonyQuestions: { include: { responses: true } },
          },
        },
      },
    });

    if (!question) return;

    const journey = question.journey;
    const allQuestions = journey.harmonyQuestions;

    if (journey.currentStep !== 'phase_harmonie') return;

    // Vérifier si au moins un utilisateur a répondu à TOUTES les questions
    // (on ne bloque pas le parcours si l'autre n'a pas encore répondu)
    const userAHasAll = allQuestions.every(q =>
      q.responses.some(r => r.userId === journey.userAId),
    );
    const userBHasAll = allQuestions.every(q =>
      q.responses.some(r => r.userId === journey.userBId),
    );

    // Les DEUX doivent avoir répondu à TOUTES les questions pour débloquer
    const isFinished = userAHasAll && userBHasAll;

    if (isFinished) {
      await this.prisma.journey.update({
        where: { id: journey.id },
        data: {
          currentStep: 'chat_libre',
        },
      });

      // Notification des deux utilisateurs
      await this.notificationService.notifyVideoUnlock(journey.userAId, journey.userB.firstName);
      await this.notificationService.notifyVideoUnlock(journey.userBId, journey.userA.firstName);
    }
  }

  // Auto-réparer les journeys et appliquer la Règle de Justice (anti-ghosting)
  private async autoAdvanceStaleJourneys(userId: string) {
    const journeys = await this.prisma.journey.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        currentStep: { in: ['phase_harmonie', 'chat_libre', 'video'] },
        result: 'en_cours',
      },
      include: {
        harmonyQuestions: { include: { responses: true } },
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
        videoSession: true,
        userA: { select: { id: true, firstName: true } },
        userB: { select: { id: true, firstName: true } },
      },
    });

    for (const journey of journeys) {
      const hoursSinceStart = (Date.now() - journey.stepStartDate.getTime()) / (1000 * 60 * 60);
      let ghosterId: string | null = null;
      let victimId: string | null = null;

      // phase_harmonie → chat_libre
      if (journey.currentStep === 'phase_harmonie') {
        const allQuestions = journey.harmonyQuestions;
        if (allQuestions.length > 0) {
          const userAHasAll = allQuestions.every(q =>
            q.responses.some(r => r.userId === journey.userAId),
          );
          const userBHasAll = allQuestions.every(q =>
            q.responses.some(r => r.userId === journey.userBId),
          );

          if (userAHasAll && userBHasAll) {
            await this.prisma.journey.update({
              where: { id: journey.id },
              data: { currentStep: 'chat_libre', stepStartDate: new Date() },
            });
            continue;
          }

          // Règle de Justice en phase_harmonie : après 48h
          if (hoursSinceStart >= 48) {
            const responsesA = allQuestions.filter(q =>
              q.responses.some(r => r.userId === journey.userAId),
            ).length;
            const responsesB = allQuestions.filter(q =>
              q.responses.some(r => r.userId === journey.userBId),
            ).length;

            if (responsesA > responsesB) {
              ghosterId = journey.userBId;
              victimId = journey.userAId;
            } else if (responsesB > responsesA) {
              ghosterId = journey.userAId;
              victimId = journey.userBId;
            }
          }
        }
      }

      // chat_libre → video : après 3 jours
      if (journey.currentStep === 'chat_libre') {
        const chatStart = journey.stepStartDate.getTime();
        const daysSinceChat = (Date.now() - chatStart) / (1000 * 60 * 60 * 24);

        if (daysSinceChat >= 3) {
          await this.prisma.journey.update({
            where: { id: journey.id },
            data: { currentStep: 'video', stepStartDate: new Date() },
          });
          continue;
        }

        // Règle de Justice en chat_libre : après 48h d'inactivité sur le dernier message
        if (hoursSinceStart >= 48) {
          const lastMsg = journey.messages[0];
          if (lastMsg) {
            const hoursSinceLastMsg = (Date.now() - lastMsg.sentAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastMsg >= 48) {
              ghosterId = lastMsg.senderId === journey.userAId ? journey.userBId : journey.userAId;
              victimId = lastMsg.senderId;
            }
          }
        }
      }

      // video : après 48h d'inactivité sans consentement mutuel
      if (journey.currentStep === 'video') {
        if (hoursSinceStart >= 48 && journey.videoSession) {
          const session = journey.videoSession;
          if (session.consentA && !session.consentB) {
            ghosterId = journey.userBId;
            victimId = journey.userAId;
          } else if (session.consentB && !session.consentA) {
            ghosterId = journey.userAId;
            victimId = journey.userBId;
          }
        }
      }

      // Si un ghoster est identifié, on clôt le parcours et on rembourse le crédit
      if (ghosterId && victimId) {
        const ghoster = ghosterId === journey.userAId ? journey.userA : journey.userB;
        const victim = victimId === journey.userAId ? journey.userA : journey.userB;

        // 1. Clôturer le parcours en échec pour cause d'inactivité
        await this.prisma.journey.update({
          where: { id: journey.id },
          data: {
            currentStep: 'termine',
            result: 'echoue',
            endDate: new Date(),
            closingReason: `Inactivité de la part de ${ghoster.firstName}`,
          },
        });

        // 2. Trouver la transaction de consommation de crédit du match
        const victimTransaction = await this.prisma.creditTransaction.findFirst({
          where: {
            journeyId: journey.id,
            userId: victimId,
            type: 'consommation',
          },
        });

        if (victimTransaction) {
          // Vérifier si un remboursement a déjà été effectué pour éviter les doublons
          const refundExists = await this.prisma.creditTransaction.findFirst({
            where: {
              journeyId: journey.id,
              userId: victimId,
              type: 'remboursement_justice',
            },
          });

          if (!refundExists) {
            const refundAmount = Math.abs(victimTransaction.creditAmount);
            await this.creditService.refundJustice(
              victimId,
              journey.id,
              refundAmount,
              `Remboursement anti-ghosting pour le parcours avec ${ghoster.firstName}`,
            );

            // 3. Notifier l'utilisateur
            await this.notificationService.sendPushNotification(
              victimId,
              'credit',
              'Remboursement anti-ghosting 💍',
              `Votre crédit a été restitué car ${ghoster.firstName} n'a pas répondu depuis 48 heures.`,
            );
          }
        }
      }
    }
  }

  // Échange de contacts : un utilisateur accepte de partager
  async exchangeContact(journeyId: string, userId: string, sharePhone: boolean, shareEmail: boolean) {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: { contactExchange: true },
    });

    if (!journey) throw new Error('Parcours non trouvé');
    if (journey.userAId !== userId && journey.userBId !== userId) {
      throw new Error('Vous ne faites pas partie de ce parcours');
    }

    const isUserA = journey.userAId === userId;

    // Créer ou mettre à jour le ContactExchange
    const existing = journey.contactExchange;
    const data: any = {
      journeyId,
      ...(isUserA
        ? { consentA: true, phoneShared: sharePhone, emailShared: shareEmail }
        : { consentB: true, phoneShared: sharePhone, emailShared: shareEmail }),
    };

    if (existing) {
      // Si l'autre a déjà accepté, on note la date d'échange
      const bothConsent = isUserA ? existing.consentB : existing.consentA;
      if (bothConsent) data.exchangedAt = new Date();

      await this.prisma.contactExchange.update({
        where: { id: existing.id },
        data: {
          ...(isUserA
            ? { consentA: true }
            : { consentB: true }),
          phoneShared: existing.phoneShared || sharePhone,
          emailShared: existing.emailShared || shareEmail,
          exchangedAt: data.exchangedAt,
        },
      });
    } else {
      await this.prisma.contactExchange.create({ data });
    }

    // Récupérer les infos à jour
    const updated = await this.prisma.contactExchange.findUnique({
      where: { journeyId },
    });

    const bothAccepted = updated?.consentA && updated?.consentB;

    // Si les deux ont accepté, avancer le journey à termine
    if (bothAccepted) {
      await this.prisma.journey.update({
        where: { id: journeyId },
        data: { currentStep: 'termine', result: 'reussi' },
      });
    }

    return {
      consentA: updated?.consentA ?? false,
      consentB: updated?.consentB ?? false,
      phoneShared: updated?.phoneShared ?? false,
      emailShared: updated?.emailShared ?? false,
      exchangedAt: updated?.exchangedAt,
      bothAccepted,
    };
  }

  // Récupérer le statut d'échange de contacts
  async getContactExchange(journeyId: string, userId: string) {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        contactExchange: true,
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
      },
    });

    if (!journey) throw new Error('Parcours non trouvé');
    if (journey.userAId !== userId && journey.userBId !== userId) {
      throw new Error('Vous ne faites pas partie de ce parcours');
    }

    const isUserA = journey.userAId === userId;
    const partner = isUserA ? journey.userB : journey.userA;
    const myConsent = isUserA ? journey.contactExchange?.consentA : journey.contactExchange?.consentB;
    const partnerConsent = isUserA ? journey.contactExchange?.consentB : journey.contactExchange?.consentA;

    return {
      myConsent: myConsent ?? false,
      partnerConsent: partnerConsent ?? false,
      bothAccepted: (myConsent && partnerConsent) ?? false,
      phoneShared: journey.contactExchange?.phoneShared ?? false,
      emailShared: journey.contactExchange?.emailShared ?? false,
      partner: {
        firstName: partner.firstName,
        telephone: partner.telephone,
        email: partner.email,
        profession: partner.profile?.profession,
        displayedCity: partner.profile?.displayedCity || partner.city,
      },
    };
  }

  // Avancer manuellement une étape du journey (ex: video → echange_contacts)
  async advanceStep(journeyId: string, userId: string, step: string) {
    const validSteps = ['chat_libre', 'video', 'echange_contacts', 'termine'];
    if (!validSteps.includes(step)) {
      throw new Error(`Étape invalide: ${step}`);
    }

    // Vérifier que l'utilisateur fait partie du journey
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
    });

    if (!journey) {
      throw new Error('Parcours non trouvé');
    }

    if (journey.userAId !== userId && journey.userBId !== userId) {
      throw new Error('Vous ne faites pas partie de ce parcours');
    }

    const updated = await this.prisma.journey.update({
      where: { id: journeyId },
      data: {
        currentStep: step as any,
        stepStartDate: new Date(),
      },
    });

    console.log(`✅ [Journey] ${journeyId} avancé à ${step}`);
    return { success: true, currentStep: updated.currentStep };
  }
}
