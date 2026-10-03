import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveModuleDto } from './dto/save-module.dto';
import { AiService } from '../ai/ai.service';
import { buildSelfPillars, loadSelfPortrait } from '../portrait/self-portrait';
import { collectRawAnswers } from '../matching/divergence.engine';
import { ageFromBirthDate, pendingQuestions } from './questions.service';
import { QUESTIONS } from './questions.data';

const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

@Injectable()
export class InterviewService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
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
    const completedModules = await this.completedModules(userId, interview.responses);
    const firstPending = [...Array(11).keys()].find((m) => !completedModules.includes(m));
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
      select: { birthDate: true, gender: true },
    });
    const answers = collectRawAnswers(responses);
    const age = ageFromBirthDate(user?.birthDate ?? null);
    const saved = new Set(responses.map((r) => r.moduleNumber));
    return [...Array(11).keys()].filter(
      (m) => saved.has(m) && pendingQuestions(m, answers, age, user?.gender).length === 0,
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
    for (const [questionId, value] of Object.entries(dto.answers ?? {})) {
      const q = QUESTION_BY_ID.get(questionId);
      if (
        !q ||
        q.moduleNumber !== dto.moduleNumber ||
        !q.options.some((o) => o.key === value)
      ) {
        throw new BadRequestException(
          `Réponse invalide pour la question ${questionId.slice(0, 20)}.`,
        );
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
        return { success: true, allModulesCompleted: true, alreadyCompleted: true };
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
        ...dto.answers,
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
          rawResponses: dto.answers,
        },
      });
    }

    // Entretien terminé quand les 11 modules (0-10) n'ont plus de question applicable.
    const responses = await this.prisma.moduleResponse.findMany({
      where: { interviewId: interview.id },
      select: { moduleNumber: true, rawResponses: true },
    });
    const allModulesCompleted = (await this.completedModules(userId, responses)).length === 11;

    if (allModulesCompleted) {
      await this.completeInterview(interview.id, userId);
    }

    return { success: true, allModulesCompleted };
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
    const portrait = await loadSelfPortrait(this.prisma, userId);
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
      alchemyScore: mentalMap?.alchemyScore != null ? Math.round(mentalMap.alchemyScore * 100) : null,
      keyValues: portrait?.values.map((v) => v.label) ?? [],
      needsList: portrait?.expectations.map((e) => plain(e.text)) ?? [],
      redFlags: portrait?.redFlags ?? [],
      threeWords: portrait?.threeWords ?? [],
      modulesAnswered: portrait?.modules.length ?? 0,
      pillars,
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
    const aiResult = await this.aiService.generateProfileSynthesis(userContext, responses);

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
