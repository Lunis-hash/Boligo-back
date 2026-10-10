import { NotificationService } from '../notifications/notification.service';
import { profileReadyEmail } from '../common/email-templates';
import {
  Injectable,
  Optional,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveModuleDto } from './dto/save-module.dto';
import { AiService } from '../ai/ai.service';
import {
  buildSelfPillars,
  loadSelfPortrait,
  loadSelfRelationalProfile,
} from '../portrait/self-portrait';
import { collectRawAnswers } from '../matching/divergence.engine';
import { ageFromBirthDate, pendingQuestions } from './questions.service';
import { isSensitiveQuestion, withoutSensitive } from './sensitive-questions';
import {
  FREE_TEXT_SUFFIX,
  QUESTIONS,
  answerKeys,
  cleanFreeText,
  isValidAnswer,
  mixesExclusive,
  normalizeAnswer,
  withoutSensitiveOptionAnswers,
} from './questions.data';

const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

@Injectable()
export class InterviewService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    @Optional() private notifications?: NotificationService,
  ) {}

  async getStatus(userId: string) {
    let interview = await this.prisma.interviewIA.findFirst({
      where: { userId, status: 'en_cours' },
      include: { responses: true },
    });

    if (!interview) {
      // Vérifier s'il y a un entretien déjà terminé
      const completedInterview = await this.prisma.interviewIA.findFirst({
        where: { userId, status: 'termine' },
      });
      if (completedInterview) {
        return {
          interviewId: completedInterview.id,
          status: 'termine',
          completedModules: Array.from({ length: 11 }, (_, i) => i),
          currentModule: 11,
          isCompleted: true,
        };
      }
      // Démarrer automatiquement l'entretien pour les nouveaux utilisateurs
      const newInterview = await this.startInterview(userId);
      return {
        interviewId: newInterview.id,
        status: 'en_cours',
        completedModules: [],
        currentModule: 0,
        isCompleted: false,
      };
    }

    // Un module n'est terminé que si plus aucune question applicable n'y reste à
    // poser : la réponse M0_Q02 enregistrée à l'inscription ne termine pas le module 0.
    const completedModules = await this.completedModules(
      userId,
      interview.responses,
    );
    const firstPending = [...Array(11).keys()].find(
      (m) => !completedModules.includes(m),
    );
    return {
      interviewId: interview.id,
      status: interview.status,
      completedModules,
      currentModule: firstPending ?? 11,
      isCompleted: interview.status === 'termine',
    };
  }

  /** Modules (0–10) enregistrés et sans question applicable restante. */
  private async completedModules(
    userId: string,
    responses: Array<{ moduleNumber: number; rawResponses: unknown }>,
  ): Promise<number[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { birthDate: true, gender: true, sensitiveConsent: true },
    });
    const answers = collectRawAnswers(responses);
    const age = ageFromBirthDate(user?.birthDate ?? null);
    const saved = new Set(responses.map((r) => r.moduleNumber));
    // Questions sensibles facultatives : sans accord explicite, elles ne
    // retiennent jamais le module (leurs réponses ne sont pas enregistrées).
    const skipSensitive = user?.sensitiveConsent !== true;
    return [...Array(11).keys()].filter(
      (m) =>
        saved.has(m) &&
        pendingQuestions(m, answers, age, user?.gender, skipSensitive)
          .length === 0,
    );
  }

  async startInterview(userId: string) {
    const existing = await this.prisma.interviewIA.findFirst({
      where: { userId, status: 'en_cours' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.interviewIA.create({
      data: {
        userId,
        status: 'en_cours',
      },
    });
  }

  async saveModule(userId: string, dto: SaveModuleDto) {
    // Seules les réponses prévues par ce module sont acceptées : une question
    // d'un autre module ou une option inexistante fausserait le matching.
    const answers: Record<string, string> = {};
    const freeTexts: Array<[string, unknown]> = [];
    for (const [questionId, value] of Object.entries(dto.answers ?? {})) {
      if (questionId.endsWith(FREE_TEXT_SUFFIX)) {
        freeTexts.push([questionId, value]);
        continue;
      }
      const q = QUESTION_BY_ID.get(questionId);
      // Choix multiple (langues) : « A,B » ; sinon une seule option existante.
      if (
        !q ||
        q.moduleNumber !== dto.moduleNumber ||
        !isValidAnswer(q, value)
      ) {
        throw new BadRequestException(
          `Réponse invalide pour la question ${questionId.slice(0, 20)}.`,
        );
      }
      // V7.1 : « aucun » ne se coche pas avec une autre réponse.
      if (mixesExclusive(q, value as string)) {
        throw new BadRequestException(
          `Réponse contradictoire pour la question ${questionId.slice(0, 20)} : « aucun » ne se combine pas avec une autre réponse.`,
        );
      }
      answers[questionId] = normalizeAnswer(q, value as string);
    }
    // Précision écrite (« une autre langue : bambara ») : gardée seulement si
    // l'option à préciser est cochée dans la même réponse.
    for (const [key, value] of freeTexts) {
      const q = QUESTION_BY_ID.get(key.slice(0, -FREE_TEXT_SUFFIX.length));
      const freeKey = q?.options.find((o) => o.freeText)?.key;
      if (!q || q.moduleNumber !== dto.moduleNumber || !freeKey) {
        throw new BadRequestException(
          `Réponse invalide pour la question ${key.slice(0, 20)}.`,
        );
      }
      if (!answerKeys(answers[q.id]).includes(freeKey)) continue;
      const text = cleanFreeText(value);
      if (!text) {
        throw new BadRequestException(
          'Précisez la langue en lettres (2 à 60 caractères).',
        );
      }
      answers[key] = text;
    }
    // Option à préciser décochée : l'ancienne précision est effacée.
    for (const [questionId, value] of Object.entries({ ...answers })) {
      const freeKey = QUESTION_BY_ID.get(questionId)?.options.find(
        (o) => o.freeText,
      )?.key;
      const key = `${questionId}${FREE_TEXT_SUFFIX}`;
      if (freeKey && !answerKeys(value).includes(freeKey) && !(key in answers))
        answers[key] = '';
    }

    // Données sensibles (religion, vie intime, violences subies) : jamais
    // enregistrées sans l'accord explicite du membre.
    const consent = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sensitiveConsent: true },
    });
    if (consent?.sensitiveConsent !== true) {
      for (const id of Object.keys(answers))
        if (isSensitiveQuestion(id)) delete answers[id];
      // V7.1 : options sensibles d'une question ordinaire (M8_Q12 B…).
      const kept = withoutSensitiveOptionAnswers(answers);
      for (const id of Object.keys(answers)) {
        if (id in kept) answers[id] = kept[id];
        else delete answers[id];
      }
    }

    let interview = await this.prisma.interviewIA.findFirst({
      where: { userId, status: 'en_cours' },
    });

    if (!interview) {
      // Entretien déjà terminé : rien n'est rouvert ni réécrit (le portrait et
      // les scores de compatibilité restent ceux de l'entretien validé).
      const completed = await this.prisma.interviewIA.findFirst({
        where: { userId, status: 'termine' },
        select: { id: true },
      });
      if (completed) {
        return {
          success: true,
          allModulesCompleted: true,
          alreadyCompleted: true,
        };
      }
      interview = await this.startInterview(userId);
    }

    // Save or update module response
    const existingResponse = await this.prisma.moduleResponse.findFirst({
      where: { interviewId: interview.id, moduleNumber: dto.moduleNumber },
    });

    if (existingResponse) {
      const mergedAnswers = {
        ...((existingResponse.rawResponses as Record<string, any>) || {}),
        ...answers,
      };
      await this.prisma.moduleResponse.update({
        where: { id: existingResponse.id },
        data: {
          rawResponses: mergedAnswers,
          completedAt: new Date(),
        },
      });
    } else {
      await this.prisma.moduleResponse.create({
        data: {
          interviewId: interview.id,
          moduleNumber: dto.moduleNumber,
          moduleName: dto.moduleName,
          rawResponses: answers,
        },
      });
    }

    // Entretien terminé quand les 11 modules (0-10) n'ont plus de question applicable.
    const responses = await this.prisma.moduleResponse.findMany({
      where: { interviewId: interview.id },
      select: { moduleNumber: true, rawResponses: true },
    });
    const allModulesCompleted =
      (await this.completedModules(userId, responses)).length === 11;

    if (allModulesCompleted) {
      await this.completeInterview(interview.id, userId);
    }

    return { success: true, allModulesCompleted };
  }

  /** Accord du membre pour les questions sensibles : null s'il n'a pas encore été demandé. */
  async getSensitiveConsent(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sensitiveConsent: true, sensitiveConsentAt: true },
    });
    return {
      consent: user?.sensitiveConsent ?? null,
      decidedAt: user?.sensitiveConsentAt ?? null,
    };
  }

  /**
   * Donne ou retire l'accord pour les questions sensibles. Un retrait efface
   * aussitôt les réponses sensibles déjà données, et le portrait est recalculé
   * sans elles.
   */
  async setSensitiveConsent(userId: string, accepted: boolean) {
    const decidedAt = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { sensitiveConsent: accepted, sensitiveConsentAt: decidedAt },
    });
    let removed = 0;
    if (!accepted) {
      const responses = await this.prisma.moduleResponse.findMany({
        where: { interview: { userId } },
        select: { id: true, rawResponses: true },
      });
      for (const r of responses) {
        const raw = (r.rawResponses ?? {}) as Record<string, unknown>;
        // V7.1 : les options sensibles d'une question ordinaire aussi (une
        // réponse dont une option est retirée compte comme effacée).
        const kept = withoutSensitiveOptionAnswers(withoutSensitive(raw));
        const count = Object.keys(raw).filter(
          (id) => !(id in kept) || kept[id] !== raw[id],
        ).length;
        if (count === 0) continue;
        removed += count;
        await this.prisma.moduleResponse.update({
          where: { id: r.id },
          data: { rawResponses: kept as Prisma.InputJsonObject },
        });
      }
      if (removed > 0) {
        const done = await this.prisma.interviewIA.findFirst({
          where: { userId, status: 'termine' },
          orderBy: { startDate: 'desc' },
          select: { id: true },
        });
        if (done) await this.generateMentalMap(done.id, userId);
      }
    }
    return { consent: accepted, decidedAt, removedAnswers: removed };
  }

  private async completeInterview(interviewId: string, userId: string) {
    await this.prisma.interviewIA.update({
      where: { id: interviewId },
      data: { status: 'termine', endDate: new Date() },
    });

    // Update User Status
    await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: 'actif' },
    });

    await this.notifications?.emailUser(userId, (name) =>
      profileReadyEmail(name),
    );

    // Trigger Mental Map Generation (Vraie IA)
    await this.generateMentalMap(interviewId, userId);
  }

  async getMentalMap(userId: string) {
    let mentalMap = await this.prisma.mentalMap.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            city: true,
            gender: true,
          },
        },
      },
    });

    if (!mentalMap) {
      const lastInterview = await this.prisma.interviewIA.findFirst({
        where: { userId, status: 'termine' },
        orderBy: { startDate: 'desc' },
      });
      if (lastInterview) {
        await this.generateMentalMap(lastInterview.id, userId);
        mentalMap = await this.prisma.mentalMap.findFirst({
          where: { userId },
          orderBy: { generatedAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                city: true,
                gender: true,
              },
            },
          },
        });
      }
    }

    // Bilan rédigé à partir des réponses réelles du Grand Entretien : un module
    // par carte, un pourcentage de clarté (réponses tranchées / questions
    // applicables) et les réponses clés — aucun chiffre ni texte inventé.
    const [portrait, relationalProfile] = await Promise.all([
      loadSelfPortrait(this.prisma, userId),
      loadSelfRelationalProfile(this.prisma, userId),
    ]);
    const pillars = portrait ? buildSelfPillars(portrait) : [];
    const plain = (t: string) => t.replace(/\*\*/g, '');

    return {
      firstName: mentalMap?.user?.firstName ?? 'Membre',
      synthesis: portrait?.analysis ? plain(portrait.analysis) : null,
      bio: portrait?.bio ?? null,
      headline: portrait?.headline ?? null,
      clarityScore: portrait?.clarity ?? 0,
      // Ancien champ lu par les versions précédentes de l'app pour le « score de clarté ».
      maturityScore: portrait?.clarity ?? 0,
      alchemyScore:
        mentalMap?.alchemyScore != null
          ? Math.round(mentalMap.alchemyScore * 100)
          : null,
      keyValues: portrait?.values.map((v) => v.label) ?? [],
      needsList: portrait?.expectations.map((e) => plain(e.text)) ?? [],
      redFlags: portrait?.redFlags ?? [],
      threeWords: portrait?.threeWords ?? [],
      modulesAnswered: portrait?.modules.length ?? 0,
      pillars,
      // Échelles V6 (attachement, émotions, dispute, personnalité) : pour le membre seul.
      relationalProfile,
    };
  }

  private async generateMentalMap(interviewId: string, userId: string) {
    // 1. Récupérer l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 2. Récupérer toutes les réponses de cet entretien
    const responses = await this.prisma.moduleResponse.findMany({
      where: { interviewId },
      orderBy: { moduleNumber: 'asc' },
    });

    // 3. Calcul de l'âge simplifié
    const age = user.birthDate
      ? new Date().getFullYear() - new Date(user.birthDate).getFullYear()
      : 'inconnu';

    const userContext = {
      firstName: user.firstName,
      age,
      gender: user.gender,
      city: user.city,
    };

    // 4. Appel à l'IA Gemini
    const aiResult = await this.aiService.generateProfileSynthesis(
      userContext,
      responses,
    );

    // 5. Enregistrement de la Carte Mentale
    await this.prisma.mentalMap.create({
      data: {
        userId,
        interviewId,
        synthesis: aiResult.synthesis,
        needsList: aiResult.needsList,
        keyValues: aiResult.keyValues,
        redFlags: aiResult.redFlags,
        maturityScore: aiResult.maturityScore,
        alchemyScore: aiResult.alchemyScore,
        version: 1,
      },
    });

    // 6. Mise à jour automatique de la description du profil
    await this.prisma.profile.update({
      where: { userId },
      data: {
        description: aiResult.bio,
        profileStatus: 'complet',
      },
    });
  }
}
