import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveModuleDto } from './dto/save-module.dto';
import { AiService } from '../ai/ai.service';

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

    const completedModules = interview.responses.map(r => r.moduleNumber);
    const maxCompleted = completedModules.length > 0 ? Math.max(...completedModules) : -1;
    return {
      interviewId: interview.id,
      status: interview.status,
      completedModules,
      currentModule: maxCompleted + 1,
      isCompleted: interview.status === 'termine',
    };
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
    let interview = await this.prisma.interviewIA.findFirst({
      where: { userId, status: 'en_cours' },
    });

    if (!interview) {
      interview = await this.startInterview(userId);
    }

    // Save or update module response
    const existingResponse = await this.prisma.moduleResponse.findFirst({
      where: { interviewId: interview.id, moduleNumber: dto.moduleNumber },
    });

    if (existingResponse) {
      await this.prisma.moduleResponse.update({
        where: { id: existingResponse.id },
        data: {
          rawResponses: dto.answers,
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

    // Check if interview is complete (0-10)
    const responsesCount = await this.prisma.moduleResponse.count({
      where: { interviewId: interview.id },
    });

    if (responsesCount === 11) {
      await this.completeInterview(interview.id, userId);
    }

    return { success: true, allModulesCompleted: responsesCount === 11 };
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
