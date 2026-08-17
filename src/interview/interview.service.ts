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

    const keyValues = Array.isArray(mentalMap?.keyValues) ? (mentalMap.keyValues as string[]) : ['Authenticité', 'Sincérité', 'Engagement'];
    const needsList = Array.isArray(mentalMap?.needsList) ? (mentalMap.needsList as string[]) : ['Écoute mutuelle', 'Projet de foyer', 'Transparence'];
    const redFlags = Array.isArray(mentalMap?.redFlags) ? (mentalMap.redFlags as string[]) : ['Manque de communication'];
    const maturityScore = Math.round((mentalMap?.maturityScore ?? 0.88) * 100);
    const alchemyScore = Math.round((mentalMap?.alchemyScore ?? 0.85) * 100);

    const dynamicPillars = [
      {
        id: 'valeurs',
        emoji: '💎',
        label: 'Vos valeurs & principes',
        tagline: 'Ce qui guide vos décisions au quotidien',
        percentage: Math.min(99, Math.max(75, maturityScore + 4)),
        color: '#E8403A',
        pastel: 'rgba(232, 64, 58, 0.08)',
        description: `Votre profil accorde une importance majeure à ${keyValues.slice(0, 2).join(' et ')}. Cette clarté morale est le socle d\'une alliance stable.`,
        metrics: keyValues.slice(0, 3).map((val: any) => ({ label: String(val), value: Math.floor(88 + Math.random() * 10) })),
      },
      {
        id: 'projet',
        emoji: '🌱',
        label: 'Projet de vie & Famille',
        tagline: 'Votre vision du foyer et de l\'avenir',
        percentage: Math.min(99, Math.max(70, alchemyScore + 3)),
        color: '#10B981',
        pastel: 'rgba(16, 185, 129, 0.08)',
        description: `Vos attentes majeures sont orientées vers : ${needsList.slice(0, 2).join(', ')}. Vous recherchez un engagement concret.`,
        metrics: needsList.slice(0, 3).map((need: any) => ({ label: String(need), value: Math.floor(85 + Math.random() * 12) })),
      },
      {
        id: 'communication',
        emoji: '💬',
        label: 'Communication & Conflits',
        tagline: 'Votre manière de dialoguer et désamorcer les tensions',
        percentage: Math.min(99, Math.max(72, maturityScore - 2)),
        color: '#7C5CE8',
        pastel: 'rgba(124, 92, 232, 0.08)',
        description: 'Vous privilégiez l\'écoute constructive et le dialogue direct, en évitant les non-dits et le silence destructeur.',
        metrics: [
          { label: 'Écoute active', value: 92 },
          { label: 'Transparence', value: 95 },
          { label: 'Résolution calme', value: 88 },
        ],
      },
      {
        id: 'finances',
        emoji: '💰',
        label: 'Économie & Gestion du foyer',
        tagline: 'Votre rapport à l\'argent et aux responsabilités',
        percentage: Math.min(99, Math.max(70, alchemyScore - 4)),
        color: '#D9AE3C',
        pastel: 'rgba(217, 174, 60, 0.08)',
        description: 'Vous envisagez la gestion financière du foyer avec réalisme, équité et responsabilité partagée.',
        metrics: [
          { label: 'Transparence budget', value: 90 },
          { label: 'Équité & soutien', value: 89 },
          { label: 'Projets communs', value: 93 },
        ],
      },
      {
        id: 'intimite',
        emoji: '🔥',
        label: 'Tendresse & Intimité',
        tagline: 'Votre vision de l\'affection et du lien affectif',
        percentage: Math.min(99, Math.max(75, alchemyScore + 2)),
        color: '#F97316',
        pastel: 'rgba(249, 115, 22, 0.08)',
        description: 'L\'expression de l\'affection et la complicité émotionnelle sont fondamentales pour nourrir la flamme de votre couple.',
        metrics: [
          { label: 'Complicité', value: 94 },
          { label: 'Disponibilité', value: 90 },
          { label: 'Affection', value: 92 },
        ],
      },
      {
        id: 'limites',
        emoji: '🛡️',
        label: 'Limites & Points de vigilance',
        tagline: 'Ce qui constitue pour vous un deal-breaker',
        percentage: Math.min(99, Math.max(80, maturityScore + 6)),
        color: '#E8403A',
        pastel: 'rgba(232, 64, 58, 0.08)',
        description: `Vous avez identifié clairement vos limites : ${redFlags.slice(0, 2).join(', ') || 'manque de respect et trahison'}. Cela vous protège des relations toxiques.`,
        metrics: [
          { label: 'Tolérance zéro toxicité', value: 98 },
          { label: 'Clarté des limites', value: 96 },
          { label: 'Respect mutuel', value: 100 },
        ],
      },
    ];

    return {
      firstName: mentalMap?.user?.firstName ?? 'Membre',
      synthesis: mentalMap?.synthesis ?? 'Votre profil révèle une grande maturité relationnelle et un profond désir d\'engagement sérieux.',
      bio: mentalMap?.bio ?? 'En quête d\'une relation sincère et durable.',
      maturityScore,
      alchemyScore,
      keyValues,
      needsList,
      redFlags,
      pillars: dynamicPillars,
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
