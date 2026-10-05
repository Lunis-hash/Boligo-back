import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QUESTIONS, Question, dependencyMet } from './questions.data';
import { InterviewLanguage, localizeQuestion } from './questions.en';

/**
 * Questions d'un module encore à poser à ce membre : non répondues et
 * applicables (âge, genre, dépendances).
 */
export function pendingQuestions(
  moduleNumber: number,
  answers: Record<string, string>,
  age: number,
  gender: string | null | undefined,
): Question[] {
  return QUESTIONS.filter((q) => {
    // 1. Vérifier le module
    if (q.moduleNumber !== moduleNumber) return false;

    // 1b. Si la question a déjà été répondue (ex: pré-remplie lors de l'onboarding), ne pas la reposer
    if (answers[q.id]) return false;

    // 1c. Périmètre géographique : déjà défini à l'inscription (onboarding étape 3)
    if (q.id === 'M0_Q02') return false;

    // 2. Vérifier les règles (Age, Genre, etc.)
    if (q.rules) {
      if (q.rules.maxAge && age >= q.rules.maxAge) return false;
      if (q.rules.minAge && age < q.rules.minAge) return false;
      if (q.rules.gender && gender !== q.rules.gender) return false;

      // 3. Vérifier les dépendances (dependsOn) : l'une au moins doit être remplie.
      if (!dependencyMet(q.rules, answers)) return false;
    }

    return true;
  });
}

export function ageFromBirthDate(birthDate: Date | null | undefined): number {
  if (!birthDate) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async getQuestionsForUser(
    userId: string,
    moduleNumber: number,
    lang: InterviewLanguage = 'fr',
  ): Promise<Question[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return [];

    // Récupérer toutes les réponses précédentes pour gérer les dépendances (dependsOn)
    const interview = await this.prisma.interviewIA.findFirst({
      where: { userId, status: 'en_cours' },
      include: { responses: true },
    });

    const allRawResponses: Record<string, string> = {};
    if (interview) {
      interview.responses.forEach((r) => {
        const answers = r.rawResponses as Record<string, string>;
        Object.assign(allRawResponses, answers);
      });
    }

    // Filtrage dynamique, puis langue d'affichage (les clés de réponse ne changent pas).
    return pendingQuestions(
      moduleNumber,
      allRawResponses,
      ageFromBirthDate(user.birthDate),
      user.gender,
    ).map((q) => localizeQuestion(q, lang));
  }
}
