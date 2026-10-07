import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUESTIONS,
  Question,
  QuestionDependency,
  dependencyMet,
} from './questions.data';
import { InterviewLanguage, localizeQuestion } from './questions.en';
import { languageChoices } from './country-languages';
import { isSensitiveQuestion } from './sensitive-questions';

/** Question applicable à ce membre, hors dépendances (âge, genre, accord). */
function applicable(
  q: Question,
  moduleNumber: number,
  answers: Record<string, string>,
  age: number,
  gender: string | null | undefined,
  skipSensitive: boolean,
): boolean {
  if (q.moduleNumber !== moduleNumber) return false;
  if (skipSensitive && isSensitiveQuestion(q.id)) return false;
  // Déjà répondue (ex. pré-remplie lors de l'onboarding) : jamais reposée.
  if (answers[q.id]) return false;
  // Périmètre géographique : déjà défini à l'inscription (onboarding étape 3).
  if (q.id === 'M0_Q02') return false;
  if (q.rules?.maxAge && age >= q.rules.maxAge) return false;
  if (q.rules?.minAge && age < q.rules.minAge) return false;
  if (q.rules?.gender && gender !== q.rules.gender) return false;
  return true;
}

/**
 * Questions d'un module encore à poser à ce membre : non répondues et
 * applicables (âge, genre, dépendances).
 */
export function pendingQuestions(
  moduleNumber: number,
  answers: Record<string, string>,
  age: number,
  gender: string | null | undefined,
  /** Le membre a refusé les questions sensibles : elles ne sont plus posées. */
  skipSensitive = false,
): Question[] {
  return QUESTIONS.filter(
    (q) =>
      applicable(q, moduleNumber, answers, age, gender, skipSensitive) &&
      // Dépendances (dependsOn) : l'une au moins doit être remplie.
      dependencyMet(q.rules, answers),
  );
}

/** Question présentée par l'app, avec sa condition éventuelle. */
export type ModuleQuestion = Question & {
  /**
   * Question de suite : posée seulement si l'une de ces réponses, données
   * plus tôt dans le même module, l'ouvre (ex. M3_Q11 → la dernière rupture).
   */
  askIf?: QuestionDependency[];
};

/**
 * Questions d'un module à présenter, dans l'ordre. En plus des questions en
 * attente, une question qui dépend d'une question du MÊME module, posée
 * avant elle et pas encore répondue, est jointe avec sa condition (`askIf`) :
 * l'app la pose seulement si la réponse donnée l'ouvre. Sans cela, la suite
 * ne serait jamais posée et le module ne serait jamais terminé.
 */
export function moduleQuestions(
  moduleNumber: number,
  answers: Record<string, string>,
  age: number,
  gender: string | null | undefined,
  skipSensitive = false,
): ModuleQuestion[] {
  const out: ModuleQuestion[] = [];
  const askable = new Set<string>();
  for (const q of QUESTIONS) {
    if (!applicable(q, moduleNumber, answers, age, gender, skipSensitive))
      continue;
    if (dependencyMet(q.rules, answers)) {
      out.push(q);
      askable.add(q.id);
      continue;
    }
    const deps = q.rules?.dependsOn;
    const askIf = (Array.isArray(deps) ? deps : deps ? [deps] : []).filter(
      (d) => askable.has(d.questionId),
    );
    if (askIf.length) {
      out.push({ ...q, askIf });
      askable.add(q.id);
    }
  }
  return out;
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
  ): Promise<Array<ModuleQuestion & { sensitive?: boolean }>> {
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
    // Une question sensible est signalée : l'app demande l'accord avant de la poser.
    // Les questions de suite du même module arrivent avec leur condition (askIf).
    return moduleQuestions(
      moduleNumber,
      allRawResponses,
      ageFromBirthDate(user.birthDate),
      user.gender,
      user.sensitiveConsent === false,
    )
      .map((q) => ({
        ...withSuggestion(localizeQuestion(q, lang), user.city, lang),
        ...(q.askIf ? { askIf: q.askIf } : {}),
      }))
      .map((q) => (isSensitiveQuestion(q.id) ? { ...q, sensitive: true } : q));
  }
}

/**
 * M0_Q10 : quatre propositions (langue du pays, anglais, espagnol, autre
 * langue à écrire), les langues du pays de résidence étant pré-cochées. Le
 * pays est celui choisi ou détecté par géolocalisation à l'inscription.
 */
export function withSuggestion(
  q: Question,
  city: string | null | undefined,
  lang: InterviewLanguage,
): Question {
  if (q.id !== 'M0_Q10') return q;
  const choices = languageChoices(city, lang);
  const options = choices.optionKeys
    .map((k) => q.options.find((o) => o.key === k))
    .filter((o): o is NonNullable<typeof o> => !!o);
  return {
    ...q,
    options,
    ...(choices.suggested.length ? { suggested: choices.suggested } : {}),
    ...(choices.other ? { suggestedOther: choices.other } : {}),
  };
}
