import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QUESTIONS, Question } from './questions.data';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async getQuestionsForUser(userId: string, moduleNumber: number): Promise<Question[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return [];

    const age = this.calculateAge(user.birthDate);
    const gender = user.gender;

    // Récupérer toutes les réponses précédentes pour gérer les dépendances (dependsOn)
    const interview = await this.prisma.interviewIA.findFirst({
      where: { userId, status: 'en_cours' },
      include: { responses: true },
    });

    const allRawResponses: Record<string, string> = {};
    if (interview) {
      interview.responses.forEach(r => {
        const answers = r.rawResponses as Record<string, string>;
        Object.assign(allRawResponses, answers);
      });
    }

    // Filtrage dynamique
    return QUESTIONS.filter(q => {
      // 1. Vérifier le module
      if (q.moduleNumber !== moduleNumber) return false;

      // 2. Vérifier les règles (Age, Genre, etc.)
      if (q.rules) {
        if (q.rules.maxAge && age >= q.rules.maxAge) return false;
        if (q.rules.minAge && age < q.rules.minAge) return false;
        if (q.rules.gender && gender !== q.rules.gender) return false;

        // 3. Vérifier les dépendances (dependsOn)
        if (q.rules.dependsOn) {
          const { questionId, values } = q.rules.dependsOn;
          const userResponse = allRawResponses[questionId];
          if (!userResponse || !values.includes(userResponse)) {
            return false; // La question dépend d'une réponse spécifique qui n'est pas présente
          }
        }
      }

      return true;
    });
  }

  private calculateAge(birthDate: Date): number {
    if (!birthDate) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
