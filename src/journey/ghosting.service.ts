import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { CreditService } from '../credit/credit.service';
import {
  GhostingAction,
  GhostingAssessment,
  GhostingInput,
  GhostStep,
  GhostingView,
  INACTIVE_DAYS,
  assessGhosting,
  dueAction,
  ghostingViewFor,
} from './ghosting.rules';

/**
 * Moniteur anti-ghosting.
 *
 * GHOSTING_MONITOR :
 *  - « on » : rappels, derniers avertissements et clôtures automatiques ;
 *  - « observe » (défaut) : n'agit pas, journalise seulement ce qu'il ferait ;
 *  - « off » : désactivé.
 * Quel que soit le mode, la Règle de Justice historique (clôture + crédit rendu
 * quand l'un attend l'autre) continue de s'appliquer à l'ouverture de l'app.
 */
export type GhostingMode = 'off' | 'observe' | 'on';

const LIVE_STEPS: GhostStep[] = [
  'phase_harmonie',
  'chat_libre',
  'video',
  'echange_contacts',
];
const SWEEP_EVERY_MS = 60 * 60 * 1000;
const FIRST_SWEEP_MS = 2 * 60 * 1000;

const journeyInclude = {
  harmonyQuestions: {
    select: { responses: { select: { userId: true, respondedAt: true } } },
  },
  messages: {
    where: { moderationStatus: 'ok' },
    orderBy: { sentAt: 'desc' },
    take: 1,
    select: { senderId: true, sentAt: true },
  },
  videoSession: { select: { consentA: true, consentB: true, startDate: true } },
  contactExchange: { select: { consentA: true, consentB: true } },
  userA: { select: { id: true, firstName: true } },
  userB: { select: { id: true, firstName: true } },
} satisfies Prisma.JourneyInclude;

export type MonitoredJourney = Prisma.JourneyGetPayload<{
  include: typeof journeyInclude;
}>;

export interface SweepReport {
  mode: GhostingMode;
  checked: number;
  remind: number;
  warn: number;
  close: number;
}

/** Date lisible pour un membre en France : « jeudi 9 octobre à 14:00 ». */
export function frenchDeadline(date: Date): string {
  const day = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  });
  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  });
  return `${day} à ${time}`;
}

export function ghostingMode(
  value = process.env.GHOSTING_MONITOR,
): GhostingMode {
  const mode = (value ?? '').trim().toLowerCase();
  return mode === 'on' || mode === 'off' ? mode : 'observe';
}

/** Contenu des rappels envoyés au membre attendu. */
export function reminderMessage(
  step: GhostStep,
  stage: 'remind' | 'warn',
  partnerName: string,
  closeAt: Date | null,
  refundWaiting: boolean,
): { title: string; content: string } {
  const deadline = closeAt ? frenchDeadline(closeAt) : null;
  if (stage === 'warn' && deadline) {
    return {
      title: `Dernier rappel : votre parcours avec ${partnerName}`,
      content:
        `Sans réponse de votre part avant le ${deadline}, le parcours se terminera` +
        (refundWaiting ? ` et ${partnerName} récupérera son crédit.` : '.') +
        ' Vous pouvez aussi y mettre fin poliment depuis l’application.',
    };
  }
  const what: Record<GhostStep, string> = {
    phase_harmonie: `${partnerName} a répondu aux questions du Sondeur. À votre tour !`,
    chat_libre: `${partnerName} vous a écrit et attend votre réponse.`,
    video: `${partnerName} vous a appelé en vidéo. Rejoignez l’appel quand vous êtes prêt(e).`,
    echange_contacts: `${partnerName} a répondu à l’échange de coordonnées.`,
  };
  return {
    title: `${partnerName} attend votre réponse`,
    content:
      what[step] +
      (deadline
        ? ` Sans réponse avant le ${deadline}, le parcours se terminera.`
        : '') +
      ' Si vous ne souhaitez pas continuer, mettez-y fin poliment depuis l’application.',
  };
}

@Injectable()
export class GhostingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AntiGhosting');
  private timers: NodeJS.Timeout[] = [];
  private running = false;

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private creditService: CreditService,
  ) {}

  onModuleInit() {
    const mode = ghostingMode();
    this.logger.log(`Moniteur anti-ghosting : ${mode}`);
    if (mode === 'off' || process.env.NODE_ENV === 'test') return;
    const run = () => {
      this.sweep().catch((err: unknown) =>
        this.logger.error(
          `Passage du moniteur en échec : ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    };
    // Les minuteries ne retiennent pas le processus : le serveur HTTP s'en charge.
    const first: NodeJS.Timeout = setTimeout(run, FIRST_SWEEP_MS);
    const every: NodeJS.Timeout = setInterval(run, SWEEP_EVERY_MS);
    first.unref();
    every.unref();
    this.timers.push(first, every);
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  toInput(journey: MonitoredJourney): GhostingInput {
    const answers = journey.harmonyQuestions.flatMap((q) => q.responses);
    const answeredBy = (userId: string) => {
      const last = answers
        .filter((r) => r.userId === userId)
        .reduce<Date | null>(
          (acc, r) => (!acc || r.respondedAt > acc ? r.respondedAt : acc),
          null,
        );
      const count = journey.harmonyQuestions.filter((q) =>
        q.responses.some((r) => r.userId === userId),
      ).length;
      return { count, last };
    };
    const a = answeredBy(journey.userAId);
    const b = answeredBy(journey.userBId);
    return {
      step: journey.currentStep as GhostStep,
      stepStart: journey.stepStartDate,
      userAId: journey.userAId,
      userBId: journey.userBId,
      answeredA: a.count,
      answeredB: b.count,
      lastAnswerA: a.last,
      lastAnswerB: b.last,
      lastMessage: journey.messages[0] ?? null,
      joinedA: journey.videoSession?.consentA ?? false,
      joinedB: journey.videoSession?.consentB ?? false,
      callStartedAt: journey.videoSession?.startDate ?? null,
      contactA: journey.contactExchange?.consentA ?? false,
      contactB: journey.contactExchange?.consentB ?? false,
    };
  }

  assess(journey: MonitoredJourney, now = new Date()): GhostingAssessment {
    return assessGhosting(this.toInput(journey), now);
  }

  /** Compte à rebours vu par un membre, pour l'affichage dans l'app. */
  async viewFor(journeyId: string, userId: string): Promise<GhostingView> {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: journeyInclude,
    });
    if (
      !journey ||
      journey.result !== 'en_cours' ||
      !LIVE_STEPS.includes(journey.currentStep as GhostStep)
    ) {
      return {
        waitingOn: null,
        since: null,
        closeAt: null,
        refundOnClose: false,
      };
    }
    return ghostingViewFor(this.assess(journey), userId);
  }

  private liveJourneys(where: Prisma.JourneyWhereInput = {}) {
    return this.prisma.journey.findMany({
      where: { ...where, result: 'en_cours', currentStep: { in: LIVE_STEPS } },
      include: journeyInclude,
    });
  }

  /**
   * Règle de Justice à l'ouverture de l'app (tous modes) : clôt les parcours de
   * ce membre où l'un attend l'autre au-delà de l'échéance, crédit rendu.
   */
  async enforceForUser(userId: string, now = new Date()) {
    const journeys = await this.liveJourneys({
      OR: [{ userAId: userId }, { userBId: userId }],
    });
    for (const journey of journeys) {
      const assessment = this.assess(journey, now);
      if (
        assessment.kind === 'ghosting' &&
        assessment.refundWaiting &&
        dueAction(assessment, now) === 'close'
      ) {
        await this.close(journey, assessment);
      }
    }
  }

  /** Un passage du moniteur sur tous les parcours en cours. */
  async sweep(
    now = new Date(),
    mode: GhostingMode = ghostingMode(),
  ): Promise<SweepReport> {
    const report: SweepReport = {
      mode,
      checked: 0,
      remind: 0,
      warn: 0,
      close: 0,
    };
    if (mode === 'off' || this.running) return report;
    this.running = true;
    try {
      const journeys = await this.liveJourneys();
      report.checked = journeys.length;
      for (const journey of journeys) {
        const assessment = this.assess(journey, now);
        const action = dueAction(assessment, now);
        if (action === 'none') continue;
        try {
          const acted =
            mode === 'on' ? await this.act(journey, assessment, action) : true;
          if (acted) report[action] += 1;
        } catch (err) {
          this.logger.error(
            `Parcours ${journey.id} : ${(err as Error)?.message ?? err}`,
          );
        }
      }
      if (report.remind || report.warn || report.close) {
        this.logger.log(
          `${mode === 'on' ? 'Actions' : 'Mode observation, aucune action. Actions prévues'} : ` +
            `${report.remind} rappel(s), ${report.warn} dernier(s) avertissement(s), ${report.close} clôture(s) ` +
            `sur ${report.checked} parcours en cours.`,
        );
      }
      return report;
    } finally {
      this.running = false;
    }
  }

  private async act(
    journey: MonitoredJourney,
    assessment: GhostingAssessment,
    action: GhostingAction,
  ) {
    if (action === 'close') return this.close(journey, assessment);
    if (action === 'remind' || action === 'warn')
      return this.remind(journey, assessment, action);
    return false;
  }

  private nameOf(journey: MonitoredJourney, userId: string | null) {
    return userId === journey.userAId
      ? journey.userA.firstName
      : journey.userB.firstName;
  }

  /** Rappel au membre attendu, une seule fois par étape d'attente. */
  private async remind(
    journey: MonitoredJourney,
    assessment: GhostingAssessment,
    stage: 'remind' | 'warn',
  ) {
    if (!assessment.waitingOnId || !assessment.since) return false;
    const partnerName = this.nameOf(journey, assessment.waitingForId);
    const message = reminderMessage(
      journey.currentStep as GhostStep,
      stage,
      partnerName,
      assessment.closeAt,
      assessment.refundWaiting,
    );
    const already = await this.prisma.notification.findFirst({
      where: {
        userId: assessment.waitingOnId,
        type: 'rappel_reponse',
        title: message.title,
        sentAt: { gte: assessment.since },
      },
      select: { id: true },
    });
    if (already) return false;
    await this.notificationService.sendPushNotification(
      assessment.waitingOnId,
      'rappel_reponse',
      message.title,
      message.content,
    );
    return true;
  }

  /** Clôture du parcours ; crédit rendu à la personne qui attendait. */
  async close(journey: MonitoredJourney, assessment: GhostingAssessment) {
    const ghosting = assessment.kind === 'ghosting';
    const ghosterName = ghosting
      ? this.nameOf(journey, assessment.waitingOnId)
      : null;
    const closed = await this.prisma.journey.updateMany({
      where: {
        id: journey.id,
        result: 'en_cours',
        currentStep: journey.currentStep,
      },
      data: {
        currentStep: 'termine',
        result: 'echoue',
        endDate: new Date(),
        closingReason: ghosting
          ? `Sans réponse de ${ghosterName} dans les délais`
          : `Aucune activité des deux membres pendant ${INACTIVE_DAYS} jours`,
      },
    });
    if (closed.count === 0) return false;

    const notify = async (
      userId: string,
      type: 'credit' | 'systeme',
      title: string,
      content: string,
    ) => {
      try {
        await this.notificationService.sendPushNotification(
          userId,
          type,
          title,
          content,
        );
      } catch {
        /* notification facultative */
      }
    };

    if (!ghosting || !assessment.waitingOnId || !assessment.waitingForId) {
      for (const [me, other] of [
        [journey.userAId, journey.userB.firstName],
        [journey.userBId, journey.userA.firstName],
      ]) {
        await notify(
          me,
          'systeme',
          'Parcours terminé',
          `Votre parcours avec ${other} s’est terminé après ${INACTIVE_DAYS} jours sans activité.`,
        );
      }
      return true;
    }

    const victimName = this.nameOf(journey, assessment.waitingForId);
    const refunded = assessment.refundWaiting
      ? await this.creditService.refundJourneyOnce(
          assessment.waitingForId,
          journey.id,
          `Sans réponse de ${ghosterName} : crédit rendu`,
        )
      : 0;
    await notify(
      assessment.waitingForId,
      refunded ? 'credit' : 'systeme',
      refunded ? 'Votre crédit vous a été rendu' : 'Parcours terminé',
      refunded
        ? `${ghosterName} n’a pas répondu dans les délais : le parcours s’est terminé et votre crédit vous a été rendu.`
        : `${ghosterName} n’a pas répondu dans les délais : le parcours s’est terminé.`,
    );
    await notify(
      assessment.waitingOnId,
      'systeme',
      'Parcours terminé',
      `Faute de réponse dans les délais, votre parcours avec ${victimName} s’est terminé.`,
    );
    return true;
  }
}
