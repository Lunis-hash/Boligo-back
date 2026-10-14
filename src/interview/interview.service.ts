import { NotificationService } from '../notifications/notification.service';
import { profileReadyEmail } from '../common/email-templates';
import { Injectable, Optional, BadRequestException } from '@nestjs/common';
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
  answerKeys,
  cleanFreeText,
  isValidAnswer,
  mixesExclusive,
  normalizeAnswer,
  withoutSensitiveOptionAnswers,
} from './questions.data';

import {
  InterviewVersion,
  widenAcceptedAges,
  unmetConditionalAnswers,
  configuredInterviewVersion,
  interviewVersionOf,
  isValidRangeAnswer,
  questionOf,
} from './questions.v82';

/** Résultat d'un enregistrement (module entier ou réponse seule). */
export interface SaveModuleResult {
  success: boolean;
  allModulesCompleted: boolean;
  /** Entretien déjà terminé : rien n'a été écrit. */
  alreadyCompleted?: boolean;
  /** Réponses de suite effacées (la réponse qui les ouvrait a changé). */
  removed?: string[];
  /** Réponses ajustées (plage d'âges acceptée élargie). */
  adjusted?: Record<string, string>;
}

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
      interview.questionnaireVersion,
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
    storedVersion: string | null,
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
        pendingQuestions(
          m,
          answers,
          age,
          user?.gender,
          skipSensitive,
          interviewVersionOf(answers, storedVersion),
        ).length === 0,
    );
  }

  /**
   * Entretien en cours, ou nouvel entretien. Sa version est fixée ici, une
   * fois pour toutes (V8.2 : immuable, garanti aussi par la base).
   */
  async startInterview(
    userId: string,
    version: InterviewVersion = configuredInterviewVersion(userId),
  ) {
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
        questionnaireVersion: version,
      },
    });
  }

  async saveModule(
    userId: string,
    dto: SaveModuleDto,
  ): Promise<SaveModuleResult> {
    // Seules les réponses prévues par ce module sont acceptées : une question
    // d'un autre module ou une option inexistante fausserait le matching.
    const answers: Record<string, string> = {};
    const freeTexts: Array<[string, unknown]> = [];
    // V8.2 : un entretien commencé garde la version enregistrée à sa
    // création ; un nouvel entretien reçoit la version configurée.
    const current = await this.currentInterview(userId);
    const previous = current?.answers ?? {};
    const version = current
      ? interviewVersionOf(previous, current.questionnaireVersion)
      : configuredInterviewVersion(userId);
    const QUESTION_BY_ID = { get: (id: string) => questionOf(version, id) };
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
        !(q.input ? isValidRangeAnswer(q, value) : isValidAnswer(q, value))
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
      answers[questionId] = q.input
        ? (value as string).trim()
        : normalizeAnswer(q, value as string);
    }
    // V8.2 : la plage d'âges acceptée englobe la tranche idéale. Jamais
    // bloquant : si la tranche idéale déborde (par exemple après un retour en
    // arrière), la plage acceptée est élargie juste ce qu'il faut.
    const adjusted: Record<string, string> = {};
    const widened = widenAcceptedAges({ ...previous, ...answers });
    if (widened && dto.moduleNumber === 0) {
      answers.V82_M0_02 = widened;
      adjusted.V82_M0_02 = widened;
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
      interview = await this.startInterview(userId, version);
    }

    // Une seule ligne par module (mise à jour, jamais de doublon) : une
    // réponse modifiée remplace l'ancienne.
    const existingResponse = await this.prisma.moduleResponse.findFirst({
      where: { interviewId: interview.id, moduleNumber: dto.moduleNumber },
      orderBy: { completedAt: 'asc' },
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

    // Réponses conditionnelles devenues sans objet (la réponse qui ouvrait la
    // question a changé) : effacées, dans tous les modules de l'entretien.
    const removed = await this.purgeUnmetAnswers(interview.id, version);

    // Entretien terminé quand les 11 modules (0-10) n'ont plus de question applicable.
    const responses = await this.prisma.moduleResponse.findMany({
      where: { interviewId: interview.id },
      select: { moduleNumber: true, rawResponses: true },
    });
    const allModulesCompleted =
      (await this.completedModules(userId, responses, version)).length === 11;

    if (allModulesCompleted) {
      await this.completeInterview(interview.id, userId);
    }

    return {
      success: true,
      allModulesCompleted,
      ...(removed.length ? { removed } : {}),
      ...(Object.keys(adjusted).length ? { adjusted } : {}),
    };
  }

  /**
   * Efface les réponses dont la condition d'affichage n'est plus remplie
   * (et leur précision écrite). Renvoie les identifiants effacés.
   */
  private async purgeUnmetAnswers(
    interviewId: string,
    version: InterviewVersion,
  ): Promise<string[]> {
    const rows = await this.prisma.moduleResponse.findMany({
      where: { interviewId },
      select: { id: true, rawResponses: true },
    });
    const removed = unmetConditionalAnswers(collectRawAnswers(rows), version);
    if (!removed.length) return [];
    const drop = new Set(
      removed.flatMap((id) => [id, `${id}${FREE_TEXT_SUFFIX}`]),
    );
    for (const r of rows) {
      const raw = (r.rawResponses ?? {}) as Record<string, unknown>;
      if (!Object.keys(raw).some((k) => drop.has(k))) continue;
      const kept = Object.fromEntries(
        Object.entries(raw).filter(([k]) => !drop.has(k)),
      );
      await this.prisma.moduleResponse.update({
        where: { id: r.id },
        data: { rawResponses: kept as Prisma.InputJsonObject },
      });
    }
    return removed;
  }

  /**
   * Retour en arrière : enregistre (ou remplace) UNE réponse, aussitôt. Même
   * validation que l'enregistrement d'un module ; un entretien terminé n'est
   * jamais rouvert.
   */
  async saveAnswer(
    userId: string,
    dto: {
      questionId: string;
      value: string;
      freeText?: string;
      moduleName?: string;
    },
  ) {
    const current = await this.currentInterview(userId);
    const version = current
      ? interviewVersionOf(current.answers, current.questionnaireVersion)
      : configuredInterviewVersion(userId);
    const q = questionOf(version, dto.questionId);
    if (!q) {
      throw new BadRequestException(
        `Question inconnue : ${String(dto.questionId).slice(0, 20)}.`,
      );
    }
    const answers: Record<string, string> = { [q.id]: dto.value };
    if (dto.freeText !== undefined)
      answers[`${q.id}${FREE_TEXT_SUFFIX}`] = dto.freeText;
    return this.saveModule(userId, {
      moduleNumber: q.moduleNumber,
      moduleName: dto.moduleName || `Module ${q.moduleNumber}`,
      answers,
    });
  }

  /**
   * Réponses déjà enregistrées d'un module de l'entretien en cours (relecture,
   * reprise après interruption). Un entretien terminé n'est plus relu ici.
   */
  async moduleAnswers(
    userId: string,
    moduleNumber: number,
  ): Promise<{ answers: Record<string, string>; editable: boolean }> {
    const interview = await this.prisma.interviewIA.findFirst({
      where: { userId, status: 'en_cours' },
      select: {
        questionnaireVersion: true,
        responses: { select: { rawResponses: true } },
      },
    });
    if (!interview) return { answers: {}, editable: false };
    const all = collectRawAnswers(interview.responses);
    const version = interviewVersionOf(all, interview.questionnaireVersion);
    const answers: Record<string, string> = {};
    for (const [id, value] of Object.entries(all)) {
      const base = id.endsWith(FREE_TEXT_SUFFIX)
        ? id.slice(0, -FREE_TEXT_SUFFIX.length)
        : id;
      if (questionOf(version, base)?.moduleNumber === moduleNumber)
        answers[id] = value;
    }
    return { answers, editable: true };
  }

  /** Entretien en cours (ou dernier terminé) : ses réponses et sa version enregistrée (null s'il n'y en a pas). */
  private async currentInterview(userId: string): Promise<{
    answers: Record<string, string>;
    questionnaireVersion: string | null;
  } | null> {
    // Entretien en cours, sinon le dernier terminé : sa version reste celle de
    // référence (un membre V7.1 ne reçoit jamais de questions V8.2 après coup).
    const select = {
      questionnaireVersion: true,
      responses: { select: { rawResponses: true } },
    } as const;
    const interview =
      (await this.prisma.interviewIA.findFirst({
        where: { userId, status: 'en_cours' },
        select,
      })) ??
      (await this.prisma.interviewIA.findFirst({
        where: { userId, status: 'termine' },
        orderBy: { startDate: 'desc' },
        select,
      }));
    return interview
      ? {
          answers: collectRawAnswers(interview.responses),
          questionnaireVersion: interview.questionnaireVersion ?? null,
        }
      : null;
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
    // Une seule clôture, même si deux enregistrements arrivent en même temps
    // (sinon : deux e-mails « profil prêt » et deux générations du portrait).
    const closed = await this.prisma.interviewIA.updateMany({
      where: { id: interviewId, status: 'en_cours' },
      data: { status: 'termine', endDate: new Date() },
    });
    if (closed.count === 0) return;

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
