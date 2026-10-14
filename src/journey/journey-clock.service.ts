import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HOUR_MS } from './ghosting.rules';
import { JourneyInsightsService } from './journey-insights.service';

/**
 * Accélérateur de test du Parcours Harmonie : « comme si N heures étaient
 * passées ». Toutes les dates d'un parcours en cours reculent de N heures,
 * ensemble, pour garder leur ordre :
 * - parcours : début de l'étape (jour du Sondeur, chat libre 72 h → vidéo,
 *   échéances de l'étape vidéo et de l'échange de coordonnées) et création ;
 * - Sondeur : envoi des questions, réponses (compte à rebours anti-ghosting),
 *   lectures enregistrées et délais de relance de l'IA (en mémoire) ;
 * - chat libre : messages (délai de réponse anti-ghosting, inactivité) ;
 * - vidéo : date prévue, début (durée de l'appel, délai pour rejoindre) et fin ;
 * - échange de coordonnées : date de l'échange.
 *
 * Actif seulement avec JOURNEY_TEST_ADVANCE=true (sinon 403). Les étapes
 * avancent ensuite par leurs règles habituelles, à la visite suivante d'un
 * membre : l'accélérateur ne saute aucune règle.
 */
export const TEST_ADVANCE_DEFAULT_HOURS = 24;
export const TEST_ADVANCE_MAX_HOURS = 72;

export function testAdvanceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.JOURNEY_TEST_ADVANCE?.trim().toLowerCase() === 'true';
}

/** Nombre d'heures demandé : 24 par défaut, entre 1 et 72. */
export function advanceHours(value: unknown): number {
  if (value === undefined || value === null) return TEST_ADVANCE_DEFAULT_HOURS;
  const hours = typeof value === 'number' ? value : NaN;
  if (
    !Number.isInteger(hours) ||
    hours < 1 ||
    hours > TEST_ADVANCE_MAX_HOURS
  ) {
    throw new BadRequestException(
      `Nombre d'heures invalide : entier de 1 à ${TEST_ADVANCE_MAX_HOURS}.`,
    );
  }
  return hours;
}

const back = (d: Date, ms: number) => new Date(d.getTime() - ms);
const backOrNull = (d: Date | null, ms: number) => (d ? back(d, ms) : null);

@Injectable()
export class JourneyClockService {
  private readonly logger = new Logger('Accélérateur de test');

  constructor(private readonly prisma: PrismaService) {}

  status() {
    return {
      enabled: testAdvanceEnabled(),
      defaultHours: TEST_ADVANCE_DEFAULT_HOURS,
      maxHours: TEST_ADVANCE_MAX_HOURS,
    };
  }

  async advance(
    journeyId: string,
    rawHours: unknown,
    admin: { id: string; email?: string },
  ) {
    if (!testAdvanceEnabled()) {
      throw new ForbiddenException(
        'Accélérateur de test désactivé (JOURNEY_TEST_ADVANCE).',
      );
    }
    const hours = advanceHours(rawHours);
    const ms = hours * HOUR_MS;

    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        harmonyQuestions: {
          select: {
            id: true,
            sentAt: true,
            responses: { select: { id: true, respondedAt: true } },
          },
        },
        insights: { select: { id: true, createdAt: true } },
        messages: { select: { id: true, sentAt: true } },
        videoSession: true,
        contactExchange: true,
      },
    });
    if (!journey) throw new NotFoundException('Parcours introuvable');
    if (journey.result !== 'en_cours' || journey.currentStep === 'termine') {
      throw new BadRequestException(
        'Ce parcours est terminé : rien à avancer.',
      );
    }

    const responses = journey.harmonyQuestions.flatMap((q) => q.responses);
    const video = journey.videoSession;
    const contact = journey.contactExchange;
    const stepStartDate = back(journey.stepStartDate, ms);

    await this.prisma.$transaction([
      this.prisma.journey.update({
        where: { id: journey.id },
        data: { stepStartDate, createdAt: back(journey.createdAt, ms) },
      }),
      ...journey.harmonyQuestions.map((q) =>
        this.prisma.harmonyQuestion.update({
          where: { id: q.id },
          data: { sentAt: back(q.sentAt, ms) },
        }),
      ),
      ...responses.map((r) =>
        this.prisma.harmonyResponse.update({
          where: { id: r.id },
          data: { respondedAt: back(r.respondedAt, ms) },
        }),
      ),
      ...journey.insights.map((i) =>
        this.prisma.journeyInsight.update({
          where: { id: i.id },
          data: { createdAt: back(i.createdAt, ms) },
        }),
      ),
      ...journey.messages.map((m) =>
        this.prisma.message.update({
          where: { id: m.id },
          data: { sentAt: back(m.sentAt, ms) },
        }),
      ),
      ...(video
        ? [
            this.prisma.videoSession.update({
              where: { id: video.id },
              data: {
                plannedDate: backOrNull(video.plannedDate, ms),
                startDate: backOrNull(video.startDate, ms),
                endDate: backOrNull(video.endDate, ms),
              },
            }),
          ]
        : []),
      ...(contact?.exchangedAt
        ? [
            this.prisma.contactExchange.update({
              where: { id: contact.id },
              data: { exchangedAt: back(contact.exchangedAt, ms) },
            }),
          ]
        : []),
    ]);
    JourneyInsightsService.advanceClock(journey.id, ms);

    const shifted = {
      questions: journey.harmonyQuestions.length,
      responses: responses.length,
      insights: journey.insights.length,
      messages: journey.messages.length,
      video: video ? 1 : 0,
      contact: contact?.exchangedAt ? 1 : 0,
    };
    const note =
      `Test : parcours avancé de ${hours} h le ${new Date().toISOString()} ` +
      `par ${admin.email ?? admin.id} (étape ${journey.currentStep}).`;
    this.logger.warn(
      `${note} Parcours ${journey.id} ; dates reculées : ` +
        `${shifted.questions} question(s), ${shifted.responses} réponse(s), ` +
        `${shifted.insights} lecture(s), ${shifted.messages} message(s), ` +
        `vidéo ${shifted.video}, coordonnées ${shifted.contact}.`,
    );
    return {
      journeyId: journey.id,
      hours,
      currentStep: journey.currentStep,
      stepStartDate: stepStartDate.toISOString(),
      shifted,
      note,
    };
  }
}
