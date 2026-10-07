import { Injectable, Logger, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import {
  buildDivergenceReport,
  collectRawAnswers,
  THEMES,
} from '../matching/divergence.engine';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { COMPROMISE, similarQuestions } from './clinical-lens';
import { SAFETY_QUESTIONS, describeReportForAi } from './sondeur.generator';
import {
  AlertCategory,
  AnsweredItem,
  DangerCategory,
  FollowUpProposal,
  REVIEW_DAY,
  ReadingAlert,
  SondeurReading,
  answeredItems,
  dayComplete,
  dayReadingPrompt,
  dangerCategories,
  fidelityPrompt,
  followUpPrompt,
  holdsSafety,
  itemsBlock,
  parseAlert,
  parseDayReading,
  parseFidelity,
  parseFollowUps,
  parseReview,
  reviewPrompt,
  ruleDayReading,
  ruleReview,
  safetyReading,
} from './sondeur-insights';

/** Début de la description d'un signalement automatique du Sondeur. */
export function sondeurReportPrefix(journeyId: string): string {
  return `Signal automatique BOLIGO · Sondeur · parcours ${journeyId}`;
}

/** Libellés des catégories, pour la modération. */
export const CATEGORY_LABEL: Record<DangerCategory | AlertCategory, string> = {
  violence: 'violence (subie ou exercée)',
  violence_subie: 'violence subie',
  violence_exercee: 'violence exercée',
  menace: 'menace',
  controle: 'contrôle (téléphone, argent, proches)',
  detresse: 'détresse ou idées de mort',
  argent: "demande d'argent",
  mineur: 'âge de moins de 18 ans',
  autre: 'signal à vérifier',
};

/**
 * Messages privés de ressources d'aide, sans rien commenter. Numéros
 * français (gratuits, 24 h/24) ; ailleurs, une association du pays (jamais
 * un renvoi vers la police seule : il n'est pas sûr partout). La liste des
 * ressources par pays reste à faire valider par l'équipe.
 */
const DISTRESS_SUPPORT =
  "Vous avez écrit quelque chose qui nous fait penser que vous traversez un moment difficile. Vous n'êtes pas seul(e) : en France, le 3114 répond 24 h/24, gratuitement. Ailleurs, une ligne d'écoute de votre pays ou les secours peuvent vous aider. L'équipe BOLIGO reste joignable depuis votre profil.";
const VICTIM_SUPPORT =
  "Vous avez évoqué des violences. Si vous en vivez ou en avez vécu, vous pouvez en parler : en France, le 3919 répond gratuitement et anonymement, 24 h/24. Ailleurs, une association d'aide aux victimes de votre pays peut vous écouter ; en cas de danger immédiat, appelez les secours. L'équipe BOLIGO reste joignable depuis votre profil.";
/** Menace, contrôle, violence sans sujet clair : ni victime ni auteur présumés. */
const FEAR_SUPPORT =
  "Une de vos réponses touche à la peur, aux menaces ou au contrôle dans un couple. Si vous le vivez ou l'avez vécu : en France, le 3919 répond gratuitement et anonymement, 24 h/24 ; ailleurs, une association d'aide aux victimes de votre pays. Si vous craignez vos propres réactions, parlez-en à un professionnel ou à une association. En cas de danger immédiat, appelez les secours. L'équipe BOLIGO reste joignable depuis votre profil.";
const AUTHOR_SUPPORT =
  "Une de vos réponses évoque des gestes violents. Si vous craignez vos propres réactions, parlez-en à un professionnel de santé ou à une association d'aide ; en cas de danger, appelez les secours de votre pays. L'équipe BOLIGO reste joignable depuis votre profil.";

/** Ordre de priorité : la détresse d'abord, l'auteur de gestes violents en dernier. */
const SUPPORT_ORDER: Array<[DangerCategory | AlertCategory, string]> = [
  ['detresse', DISTRESS_SUPPORT],
  ['violence_subie', VICTIM_SUPPORT],
  ['violence', FEAR_SUPPORT],
  ['menace', FEAR_SUPPORT],
  ['controle', FEAR_SUPPORT],
  ['violence_exercee', AUTHOR_SUPPORT],
];

/**
 * Messages d'aide pour ces catégories, du plus urgent au moins urgent : une
 * détresse n'est jamais effacée par une violence évoquée en même temps.
 */
export function supportMessages(categories: string[]): string[] {
  let messages = [
    ...new Set(
      SUPPORT_ORDER.filter(([c]) => categories.includes(c)).map(([, m]) => m),
    ),
  ];
  // Le message aux victimes couvre déjà la peur ; celui sur la peur couvre
  // déjà l'auteur qui craint ses réactions.
  if (messages.includes(VICTIM_SUPPORT))
    messages = messages.filter((m) => m !== FEAR_SUPPORT);
  if (messages.includes(FEAR_SUPPORT))
    messages = messages.filter((m) => m !== AUTHOR_SUPPORT);
  return messages;
}

/** Catégories d'un signalement, lisibles par le code (« catégories=[a,b] »). */
function categoriesOf(description: string | null): string[] {
  const m = /catégories=\[([^\]]*)\]/.exec(description ?? '');
  return m ? m[1].split(',').filter(Boolean) : [];
}

/** Empreinte d'une réponse dans son signalement (« réponse <empreinte> »). */
export function answerFingerprint(question: string, answer: string): string {
  return createHash('sha256')
    .update(`${question}|${answer}`)
    .digest('hex')
    .slice(0, 10);
}

/**
 * Catégories qui retiennent la messagerie et cachent la réponse à l'autre :
 * toutes, sauf une confidence de violence subie seule (la victime n'est pas
 * mise en cause). Sans catégorie lisible : par prudence, oui.
 */
export function holdsCategories(categories: string[]): boolean {
  return (
    categories.length === 0 || categories.some((c) => c !== 'violence_subie')
  );
}

/**
 * Une réponse refusée (jamais montrée) retient la messagerie seulement si
 * elle évoque un danger pour l'autre : une insulte ou un contact ne suffisent
 * pas, une menace oui.
 */
export function refusalHolds(categories: string[]): boolean {
  return categories.some((c) => c !== 'autre' && c !== 'violence_subie');
}

/** Signalement du Sondeur, relu depuis sa description. */
export interface SondeurReport {
  journeyId: string;
  authorId: string;
  status: 'en_attente' | 'traite' | 'rejete';
  /** 1 à 3, ou REVIEW_DAY pour le bilan. */
  day: number;
  /** Empreinte de la réponse signalée ; null pour une alerte de journée. */
  answer: string | null;
  /** Réponse refusée par la modération : jamais enregistrée ni montrée. */
  refused: boolean;
  /** Classement de l'IA encore attendu (relecture lente ou en panne). */
  unclassified: boolean;
  categories: string[];
}

const REPORT_TAG =
  /^Signal automatique BOLIGO · Sondeur · parcours ([0-9A-Za-z-]+) · (?:jour (\d)|bilan)(?: · (?:(réponse|refus) ([0-9a-f]{10})|alerte))?(?: ·|\n|$)/;

/** Réponse d'un parcours payé que l'IA n'a pas encore pu relire. */
export const UNCLASSIFIED_SUMMARY =
  "Classement de l'IA en attente (relecture lente ou indisponible) : réponse cachée à l'autre membre jusqu'à son classement.";

export function parseSondeurReport(r: {
  reportedId: string;
  status: string;
  description: string | null;
}): SondeurReport | null {
  const m = REPORT_TAG.exec(r.description ?? '');
  if (!m) return null;
  return {
    journeyId: m[1],
    authorId: r.reportedId,
    status: r.status as SondeurReport['status'],
    day: m[2] ? Number(m[2]) : REVIEW_DAY,
    answer: m[4] ?? null,
    refused: m[3] === 'refus',
    unclassified: (r.description ?? '').includes(UNCLASSIFIED_SUMMARY),
    categories: categoriesOf(r.description),
  };
}

/**
 * État de sécurité d'un parcours, d'après ses signalements : quelles réponses
 * sont signalées, cachées à l'autre, et si la messagerie attend. Une réponse
 * dont le signalement a été rejeté par la modération redevient ordinaire.
 */
export class SondeurSafety {
  /** Signalements qui comptent : une réponse refusée n'a jamais été montrée. */
  readonly reports: SondeurReport[];
  /** Réponses refusées : elles ne cachent rien, mais une menace retient la messagerie. */
  private readonly refusals: SondeurReport[];

  constructor(all: SondeurReport[]) {
    this.reports = all.filter((r) => !r.refused);
    this.refusals = all.filter((r) => r.refused);
  }

  private forAnswer(authorId: string, question: string, answer: string) {
    const fingerprint = answerFingerprint(question, answer);
    return this.reports.find(
      (r) => r.authorId === authorId && r.answer === fingerprint,
    );
  }

  /** Catégories de danger d'une réponse (code ou classement de l'IA à l'envoi). */
  flagged(authorId: string, question: string, answer: string): string[] {
    const report = this.forAnswer(authorId, question, answer);
    if (report?.status === 'rejete') return [];
    return [
      ...new Set([...dangerCategories(answer), ...(report?.categories ?? [])]),
    ];
  }

  /**
   * Réponse cachée à l'autre membre : fermé par défaut. Il suffit que le code
   * y voie un danger pour l'autre, ou qu'un signalement non rejeté la vise,
   * même si son écriture a échoué.
   */
  hidden(authorId: string, day: number, question: string, answer: string) {
    const report = this.forAnswer(authorId, question, answer);
    if (report?.status === 'rejete') return false;
    if (holdsSafety(dangerCategories(answer))) return true;
    if (report && holdsCategories(report.categories)) return true;
    // Alerte de l'IA (une journée ou le bilan) : toutes les réponses du
    // membre concerné restent cachées jusqu'à la décision de l'équipe.
    return this.reports.some(
      (r) =>
        r.answer === null &&
        r.authorId === authorId &&
        r.status !== 'rejete' &&
        holdsCategories(r.categories),
    );
  }

  /** Alerte de l'IA encore ouverte pour ce membre (journée ou bilan). */
  openAlert(authorId: string): boolean {
    return this.reports.some(
      (r) =>
        r.answer === null &&
        r.authorId === authorId &&
        r.status === 'en_attente',
    );
  }

  /**
   * Journée (ou bilan) sans lecture de l'IA : une réponse signalée, ou une
   * alerte de l'IA que la modération n'a pas rejetée.
   */
  dayFlagged(
    day: number,
    items: AnsweredItem[],
    members: [string, string],
  ): boolean {
    return (
      items.some((it) =>
        members.some(
          (m, k) => this.flagged(m, it.question, it.answers[k]).length > 0,
        ),
      ) ||
      // Une alerte de l'IA non rejetée suspend toutes les lectures : l'équipe
      // tranche d'abord.
      this.reports.some((r) => r.answer === null && r.status !== 'rejete')
    );
  }

  /** La modération a rejeté l'alerte de l'IA pour ce membre et cette journée. */
  alertRejected(day: number, authorId: string): boolean {
    return this.reports.some(
      (r) =>
        r.answer === null &&
        r.day === day &&
        r.authorId === authorId &&
        r.status === 'rejete',
    );
  }

  /**
   * La messagerie attend : un signalement en attente, ou confirmé (le
   * parcours est alors clos par la modération).
   */
  get holds(): boolean {
    return (
      this.reports.some(
        (r) => r.status !== 'rejete' && holdsCategories(r.categories),
      ) ||
      this.refusals.some(
        (r) => r.status !== 'rejete' && refusalHolds(r.categories),
      )
    );
  }
}

/** Après un échec, l'IA est relancée au plus trois fois, à dix minutes d'écart. */
const MAX_ATTEMPTS = 3;
const RETRY_AFTER_MS = 10 * 60 * 1000;

export interface SondeurInsightsView {
  days: SondeurReading[];
  review: SondeurReading | null;
  /** Une lecture de l'IA est en cours d'écriture : l'app peut recharger. */
  writing: boolean;
}

/**
 * Suivi du Sondeur par l'IA (parcours payés) : lecture de chaque journée
 * terminée par les deux membres, question d'approfondissement pour la
 * journée suivante, bilan Harmonie à la fin. Seules les lectures de l'IA sont
 * enregistrées ; la version des règles est recalculée à chaque lecture.
 */
@Injectable()
export class JourneyInsightsService {
  private readonly logger = new Logger('Suivi Sondeur');
  private static queues = new Map<string, Promise<void>>();
  private static failures = new Map<string, { count: number; at: number }>();
  /** Dernière relance des réponses « en attente de classement », par parcours. */
  private static retries = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    @Optional() private readonly notifications?: NotificationService,
  ) {}

  /**
   * Messagerie retenue : une réponse du Sondeur évoque un danger et la
   * modération n'a pas tranché (ou l'a confirmé). Les signalements manquants
   * sont créés au passage. Une confidence de violence subie seule ne retient
   * pas la messagerie : le membre n'est pas mis en cause.
   */
  async holdsChat(journeyId: string): Promise<boolean> {
    const journey = await this.load(journeyId);
    if (!journey) return true;
    const { userAId, userBId, harmonyQuestions: qs } = journey;
    const members: [string, string] = [userAId, userBId];
    const complete = [1, 2, 3].filter((d) =>
      dayComplete(qs, d, userAId, userBId),
    );
    const itemsOf = (day?: number) =>
      answeredItems(
        qs.filter((q) => day === undefined || q.day === day),
        userAId,
        userBId,
      );
    for (const day of complete)
      await this.handleDanger(journeyId, itemsOf(day), members);
    await this.retryUnclassified(journeyId, qs, await this.safety(journeyId));
    const safety = await this.safety(journeyId);
    // Lecture de l'IA attendue (parcours payé) : elle peut lever une alerte
    // que le code ne voit pas. La messagerie attend qu'elle soit écrite (ou
    // qu'elle ait échoué trois fois) ; la visite suivante la rouvrira. Une
    // journée signalée n'attend pas de lecture : l'IA ne la lit pas.
    if (await this.ai.journeyAiEligible(journeyId)) {
      const written = new Set(journey.insights.map((i) => i.day));
      const awaited = complete
        .filter((d) => !safety.dayFlagged(d, itemsOf(d), members))
        .concat(
          complete.length === 3 &&
            !safety.dayFlagged(REVIEW_DAY, itemsOf(), members)
            ? [REVIEW_DAY]
            : [],
        )
        .filter((d) => !written.has(d) && !this.gaveUp(journeyId, d));
      if (awaited.length) {
        void this.refresh(journeyId);
        return true;
      }
    }
    return safety.holds;
  }

  /**
   * Réponse qui évoque un danger, signalée dès qu'elle est écrite : un membre
   * qui n'achève pas sa journée n'échappe pas à la modération. Une réponse
   * refusée par la modération IA est signalée aussi (« autre ») : elle ne
   * disparaît pas sans trace.
   */
  async reportAnswer(
    journeyId: string,
    day: number,
    authorId: string,
    question: string,
    answer: string,
    categories: Array<DangerCategory | AlertCategory>,
    summary = 'Une réponse évoque peut-être un danger (signalée dès son envoi). À vérifier par la modération.',
  ): Promise<void> {
    if (!categories.length) return;
    await this.fileReport(
      journeyId,
      day,
      authorId,
      categories,
      summary,
      [`« ${question} » → ${answer.slice(0, 500)}`],
      `réponse ${answerFingerprint(question, answer)}`,
    );
  }

  /**
   * Réponse refusée par la modération (insulte, proposition sexuelle,
   * coordonnées) : jamais enregistrée ni montrée, mais signalée pour trace,
   * avec les dangers que le code y a vus. Sans danger, elle ne retient pas la
   * messagerie ; avec une menace ou un contrôle, si, jusqu'à la décision de
   * l'équipe, et l'auteur reçoit les ressources d'aide.
   */
  async reportRefusal(
    journeyId: string,
    day: number,
    authorId: string,
    question: string,
    answer: string,
    reason: string,
    danger: DangerCategory[] = [],
  ): Promise<void> {
    await this.fileReport(
      journeyId,
      day,
      authorId,
      danger.length ? danger : ['autre'],
      `Réponse refusée par la modération (${reason}). Elle n'a pas été enregistrée ; le membre a pu la reformuler. À vérifier.`,
      [`« ${question} » → ${answer.slice(0, 500)}`],
      `refus ${answerFingerprint(question, answer)}`,
      danger.length > 0,
    );
  }

  /**
   * Classement de l'IA arrivé après coup pour une réponse « en attente de
   * classement » : ses catégories remplacent « autre », ou le signalement est
   * clos s'il n'y a rien (la réponse redevient visible). null : l'IA est
   * toujours indisponible, une nouvelle tentative aura lieu plus tard.
   */
  async resolveClassification(
    journeyId: string,
    day: number,
    authorId: string,
    question: string,
    answer: string,
    danger: Array<DangerCategory | AlertCategory> | null,
  ): Promise<void> {
    if (danger === null) return;
    const tag = `${sondeurReportPrefix(journeyId)} · jour ${day} · réponse ${answerFingerprint(question, answer)}`;
    const [report] = await this.prisma.report.findMany({
      where: { reportedId: authorId, description: { startsWith: tag } },
      select: { id: true, status: true, description: true },
    });
    const description = report?.description ?? '';
    if (
      !report ||
      report.status !== 'en_attente' ||
      !description.includes(UNCLASSIFIED_SUMMARY)
    )
      return;
    const kept = categoriesOf(description).filter((c) => c !== 'autre');
    const next = [...new Set([...kept, ...danger])] as Array<
      DangerCategory | AlertCategory
    >;
    if (next.length === 0) {
      await this.prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'rejete',
          description: description.replace(
            UNCLASSIFIED_SUMMARY,
            "Relue par l'IA après coup : aucun danger. Signalement clos automatiquement.",
          ),
        },
      });
      return;
    }
    const labels = next.map((c) => CATEGORY_LABEL[c]).join(', ');
    await this.prisma.report.update({
      where: { id: report.id },
      data: {
        description: description
          .replace(
            / · catégorie : [^\n]*catégories=\[[^\]]*\]/,
            ` · catégorie : ${labels} · catégories=[${next.join(',')}]`,
          )
          .replace(
            UNCLASSIFIED_SUMMARY,
            "Relue par l'IA après coup : une réponse évoque peut-être un danger. À vérifier par la modération.",
          ),
      },
    });
    const earlier = await this.prisma.report.findMany({
      where: {
        reportedId: authorId,
        description: { startsWith: `${sondeurReportPrefix(journeyId)} · ` },
      },
      select: { id: true, description: true },
    });
    await this.sendSupport(journeyId, authorId, next, [
      ...kept,
      ...earlier
        .filter((r) => r.id !== report.id)
        .flatMap((r) => categoriesOf(r.description)),
    ]);
  }

  /** Les réponses encore « en attente de classement » sont relues de nouveau (au plus toutes les 10 minutes). */
  private async retryUnclassified(
    journeyId: string,
    qs: Array<{
      day: number;
      questionText: string;
      responses: Array<{ userId: string; responseText: string }>;
    }>,
    safety: SondeurSafety,
  ): Promise<void> {
    // Seules les réponses encore « en attente de classement » sont relues :
    // un refus classé « autre » attend l'équipe, pas l'IA.
    const pending = safety.reports.filter(
      (r) => r.status === 'en_attente' && r.answer && r.unclassified,
    );
    if (pending.length === 0) return;
    const last = JourneyInsightsService.retries.get(journeyId) ?? 0;
    if (Date.now() - last < RETRY_AFTER_MS) return;
    JourneyInsightsService.retries.set(journeyId, Date.now());
    for (const q of qs)
      for (const r of q.responses) {
        const target = pending.find(
          (p) =>
            p.authorId === r.userId &&
            p.answer === answerFingerprint(q.questionText, r.responseText),
        );
        if (!target) continue;
        const m = await this.ai.moderateSondeurAnswer(
          r.responseText,
          journeyId,
        );
        await this.resolveClassification(
          journeyId,
          q.day,
          r.userId,
          q.questionText,
          r.responseText,
          m.unavailable
            ? null
            : !m.allowed && !m.danger?.length
              ? ['autre']
              : (m.danger ?? []),
        );
      }
  }

  /** État de sécurité du parcours : réponses signalées, cachées, messagerie retenue. */
  async safety(journeyId: string): Promise<SondeurSafety> {
    const rows = await this.prisma.report.findMany({
      where: {
        description: { startsWith: `${sondeurReportPrefix(journeyId)} · ` },
      },
      select: { reportedId: true, status: true, description: true },
    });
    return new SondeurSafety(
      rows
        .map(parseSondeurReport)
        .filter((r): r is SondeurReport => r !== null),
    );
  }

  /**
   * Écrit les lectures qui manquent. Appelé sans attendre après chaque
   * réponse ; les appels d'un même parcours passent l'un après l'autre.
   */
  refresh(journeyId: string): Promise<void> {
    const queues = JourneyInsightsService.queues;
    const previous = queues.get(journeyId) ?? Promise.resolve();
    const next = previous
      .then(() => this.writeMissing(journeyId))
      .catch((err: Error) =>
        this.logger.warn(`Parcours ${journeyId} : ${err.message}`),
      );
    queues.set(journeyId, next);
    void next.finally(() => {
      if (queues.get(journeyId) === next) queues.delete(journeyId);
    });
    return next;
  }

  /** Lectures visibles par les deux membres (l'appartenance est vérifiée par l'appelant). */
  async view(journeyId: string): Promise<SondeurInsightsView> {
    const journey = await this.load(journeyId);
    if (!journey) return { days: [], review: null, writing: false };
    const { userAId, userBId, harmonyQuestions: qs } = journey;
    const members: [string, string] = [userAId, userBId];
    const safety = await this.safety(journeyId);
    const stored = new Map(
      journey.insights.map((i) => [
        i.day,
        i.content as unknown as SondeurReading,
      ]),
    );
    const itemsOf = (day?: number) =>
      answeredItems(
        qs.filter((q) => day === undefined || q.day === day),
        userAId,
        userBId,
      );

    // Lectures attendues mais pas encore écrites par l'IA.
    const pending: number[] = [];
    const days: SondeurReading[] = [];
    for (const day of [1, 2, 3]) {
      if (!dayComplete(qs, day, userAId, userBId)) continue;
      // Signal de sécurité : jamais de lecture ni de « nuance à aborder »,
      // même si une lecture avait été écrite avant le signalement.
      if (safety.dayFlagged(day, itemsOf(day), members)) {
        days.push(safetyReading(day, safety.holds));
        continue;
      }
      const reading = stored.get(day);
      if (!reading) pending.push(day);
      days.push(reading ?? ruleDayReading(day));
    }

    let review: SondeurReading | null = null;
    if (days.length === 3) {
      if (safety.dayFlagged(REVIEW_DAY, itemsOf(), members)) {
        review = safetyReading(REVIEW_DAY, safety.holds);
      } else {
        review = stored.get(REVIEW_DAY) ?? null;
        if (!review) {
          pending.push(REVIEW_DAY);
          review = ruleReview(await this.interviewReport(userAId, userBId));
        }
      }
    }

    const writing = pending.some((d) => !this.coolingDown(journeyId, d));
    if (writing) void this.refresh(journeyId);
    return { days, review, writing };
  }

  private load(journeyId: string) {
    return this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        userA: { select: { firstName: true } },
        userB: { select: { firstName: true } },
        harmonyQuestions: {
          orderBy: [{ day: 'asc' }, { sentAt: 'asc' }],
          include: {
            responses: { select: { userId: true, responseText: true } },
          },
        },
        insights: true,
      },
    });
  }

  private async writeMissing(journeyId: string) {
    const journey = await this.load(journeyId);
    if (!journey) return;
    const { userAId, userBId, harmonyQuestions: qs } = journey;
    const members: [string, string] = [userAId, userBId];
    const names: [string, string] = [
      journey.userA.firstName,
      journey.userB.firstName,
    ];
    const done = new Set(journey.insights.map((i) => i.day));
    await this.retryUnclassified(journeyId, qs, await this.safety(journeyId));

    for (const day of [1, 2, 3]) {
      if (done.has(day) || this.coolingDown(journeyId, day)) continue;
      if (!dayComplete(qs, day, userAId, userBId)) continue;
      const items = answeredItems(
        qs.filter((q) => q.day === day),
        userAId,
        userBId,
      );
      // Signal de danger (violence, menace, contrôle, détresse, demande
      // d'argent, minorité) : l'IA ne lit pas cette journée, la modération
      // est prévenue. Rien n'est enregistré : si la modération rejette le
      // signalement, la lecture sera écrite.
      await this.handleDanger(journeyId, items, members);
      // État relu à chaque journée : une alerte vient peut-être d'être levée.
      const safety = await this.safety(journeyId);
      if (safety.dayFlagged(day, items, members)) continue;
      const { system, prompt } = dayReadingPrompt(
        day,
        items,
        names,
        await this.analysisFor(userAId, userBId, names),
      );
      const written = await this.ai.journeyCompletion(
        journeyId,
        system,
        prompt,
        1800,
      );
      // Seconde ligne de défense : le modèle lève une alerte.
      const alert = parseAlert(written?.content ?? null);
      if (alert) {
        await this.onAlert(journeyId, day, alert, items, members, safety);
        continue;
      }
      const reading = written
        ? parseDayReading(written.content, day, items, names)
        : null;
      // Garde-fou anti-invention : chaque point cite les réponses (vérifié par
      // le code), puis le relecteur confirme que rien n'est inventé.
      const verdict = reading
        ? await this.fidelity(
            journeyId,
            items,
            names,
            reading,
            written?.model,
            await this.analysisFor(userAId, userBId, names),
          )
        : null;
      if (verdict?.alert) {
        await this.onAlert(
          journeyId,
          day,
          verdict.alert,
          items,
          members,
          safety,
        );
        continue;
      }
      if (!reading || !verdict?.faithful) {
        this.markFailure(journeyId, day);
        continue;
      }
      if (day < 3) {
        await this.writeFollowUp(journeyId, day, items, names, reading, qs, [
          userAId,
          userBId,
        ]);
      }
      await this.save(journeyId, reading);
    }

    const allDone = [1, 2, 3].every((d) =>
      dayComplete(qs, d, userAId, userBId),
    );
    if (
      !allDone ||
      done.has(REVIEW_DAY) ||
      this.coolingDown(journeyId, REVIEW_DAY)
    )
      return;
    const all = answeredItems(qs, userAId, userBId);
    // Les réponses signalées l'ont été jour par jour : aucun nouveau
    // signalement pour le bilan. L'état est relu : une alerte vient peut-être
    // d'être levée pendant les journées.
    const now = await this.safety(journeyId);
    if (now.dayFlagged(REVIEW_DAY, all, members)) return;
    const analysis = await this.analysisFor(userAId, userBId, names);
    const { system, prompt } = reviewPrompt(all, names, analysis);
    const written = await this.ai.journeyCompletion(
      journeyId,
      system,
      prompt,
      2500,
    );
    const alert = parseAlert(written?.content ?? null);
    if (alert) {
      await this.onAlert(journeyId, REVIEW_DAY, alert, all, members, now);
      return;
    }
    const review = written ? parseReview(written.content, all, names) : null;
    const verdict = review
      ? await this.fidelity(
          journeyId,
          all,
          names,
          review,
          written?.model,
          analysis,
        )
      : null;
    if (verdict?.alert) {
      await this.onAlert(
        journeyId,
        REVIEW_DAY,
        verdict.alert,
        all,
        members,
        now,
      );
      return;
    }
    if (!review || !verdict?.faithful) {
      this.markFailure(journeyId, REVIEW_DAY);
      return;
    }
    await this.save(journeyId, review);
  }

  /**
   * Réponses où le code voit un danger (violence, menace, contrôle, détresse,
   * demande d'argent, minorité) : un signalement par réponse, avec ses
   * catégories (le même que celui créé à l'envoi : jamais de doublon). Une
   * réponse déjà rejetée par la modération n'est pas signalée de nouveau.
   */
  private async handleDanger(
    journeyId: string,
    items: AnsweredItem[],
    members: [string, string],
  ): Promise<void> {
    for (const [k, authorId] of members.entries()) {
      for (const it of items) {
        const categories = dangerCategories(it.answers[k]);
        if (categories.length === 0) continue;
        await this.fileReport(
          journeyId,
          it.day,
          authorId,
          categories,
          'Une réponse évoque peut-être un danger. À vérifier par la modération.',
          [`« ${it.question} » → ${it.answers[k].slice(0, 500)}`],
          `réponse ${answerFingerprint(it.question, it.answers[k])}`,
        );
      }
    }
  }

  /**
   * Alerte levée par le modèle : signalement, comme un signal du code. Si la
   * modération a déjà rejeté cette alerte, la journée garde la version des
   * règles (l'IA n'est pas relancée en boucle).
   */
  private async onAlert(
    journeyId: string,
    day: number,
    alert: ReadingAlert,
    items: AnsweredItem[],
    members: [string, string],
    safety: SondeurSafety,
  ) {
    const targets = alert.member === null ? [0, 1] : [alert.member];
    if (targets.every((k) => safety.alertRejected(day, members[k]))) {
      this.logger.warn(
        `Parcours ${journeyId} : alerte de l'IA déjà rejetée par la modération, version des règles.`,
      );
      this.giveUp(journeyId, day);
      return;
    }
    for (const k of targets) {
      // Une seule alerte ouverte par membre : l'équipe tranche une fois.
      if (safety.openAlert(members[k])) continue;
      await this.fileReport(
        journeyId,
        day,
        members[k],
        alert.categories,
        alert.member === null
          ? "Alerte levée par l'IA sans membre désigné : les réponses des deux membres sont jointes. À vérifier par la modération."
          : alert.categories.every((c) => c === 'violence_subie')
            ? "Confidence possible d'une violence subie : le membre n'est pas mis en cause. Alerte levée par l'IA, à vérifier."
            : "Alerte levée par l'IA à la lecture des réponses. À vérifier par la modération.",
        items.map(
          (it) => `« ${it.question} » → ${it.answers[k].slice(0, 500)}`,
        ),
        'alerte',
        // Sans membre désigné, personne ne reçoit de message : aucun des deux
        // n'est présumé victime ou auteur.
        alert.member !== null,
      );
    }
  }

  /**
   * Signalement (une seule fois par réponse, ou par journée et par membre
   * pour une alerte de l'IA) et, pour une détresse ou des violences, un
   * message privé de ressources d'aide à l'auteur, jamais deux fois le même.
   */
  private async fileReport(
    journeyId: string,
    day: number,
    authorId: string,
    categories: Array<DangerCategory | AlertCategory>,
    summary: string,
    excerpts: string[],
    /** « réponse <empreinte> » ou « alerte ». */
    detail: string,
    notify = true,
  ) {
    const prefix = sondeurReportPrefix(journeyId);
    const tag = `${prefix} · ${day === REVIEW_DAY ? 'bilan' : `jour ${day}`} · ${detail}`;
    const earlier = await this.prisma.report.findMany({
      where: {
        reportedId: authorId,
        description: { startsWith: `${prefix} · ` },
      },
      select: { description: true },
    });
    if (earlier.some((r) => r.description?.startsWith(tag))) return;
    const unique = [...new Set(categories)];
    const labels = unique.map((c) => CATEGORY_LABEL[c]).join(', ');
    await this.prisma.report.create({
      data: {
        reporterId: authorId,
        reportedId: authorId,
        reason: 'autre',
        description: `${tag} · catégorie : ${labels} · catégories=[${unique.join(',')}]\n${summary}\n${excerpts.join('\n')}`,
      },
    });
    this.logger.warn(
      `Parcours ${journeyId} : signal de sécurité (${labels}), modération prévenue.`,
    );
    if (!notify) return;
    await this.sendSupport(
      journeyId,
      authorId,
      unique,
      earlier.flatMap((r) => categoriesOf(r.description)),
    );
  }

  /**
   * Message privé de ressources d'aide à l'auteur ; un message déjà envoyé
   * dans ce parcours ne l'est pas de nouveau.
   */
  private async sendSupport(
    journeyId: string,
    authorId: string,
    categories: string[],
    alreadySent: string[],
  ) {
    const sent = new Set(supportMessages(alreadySent));
    const support = supportMessages(categories).filter((m) => !sent.has(m));
    if (support.length === 0) return;
    // Écran verrouillé : rien de sensible dans la notification (un agresseur
    // peut la voir) ; le message complet est dans l'app.
    await this.notifications
      ?.sendPushNotification(
        authorId,
        'systeme',
        'BOLIGO',
        support.join('\n\n'),
        'Un message de l’équipe BOLIGO vous attend dans l’application.',
      )
      .catch((err: Error) =>
        this.logger.error(
          `Parcours ${journeyId} : message d'aide non envoyé (${err.message}).`,
        ),
      );
  }

  /**
   * Le relecteur indépendant confirme-t-il que la lecture n'invente rien ?
   * Il peut aussi lever une alerte de sécurité.
   */
  private async fidelity(
    journeyId: string,
    items: Parameters<typeof fidelityPrompt>[0],
    names: [string, string],
    reading: SondeurReading,
    writerModel?: string,
    /** Analyse des entretiens, que le rédacteur a pu utiliser. */
    analysis?: string,
  ): Promise<{ faithful: boolean; alert: ReadingAlert | null }> {
    const { system, prompt } = fidelityPrompt(items, names, reading, analysis);
    const raw = await this.ai.journeyCritique(
      journeyId,
      system,
      prompt,
      writerModel,
    );
    const verdict = parseFidelity(raw);
    const alert = parseAlert(raw);
    if (verdict !== true) {
      this.logger.warn(
        `Parcours ${journeyId} : lecture ${reading.day === REVIEW_DAY ? 'du bilan' : `du jour ${reading.day}`} ${verdict === false ? 'refusée (fidélité)' : 'non vérifiée'}, version des règles.`,
      );
    }
    return { faithful: verdict === true && !alert, alert };
  }

  /**
   * Question d'approfondissement de la journée suivante : deux propositions
   * écrites à part (elles ne voient que les réponses et les écarts décrits),
   * relues par un modèle d'une autre famille ; la meilleure acceptée est
   * placée. Refus, relecture impossible ou thème de sécurité : rien ne change.
   */
  private async writeFollowUp(
    journeyId: string,
    day: number,
    items: AnsweredItem[],
    names: [string, string],
    reading: SondeurReading,
    asked: Array<{ day: number; questionText: string; responses: unknown[] }>,
    members: [string, string],
  ): Promise<string | null> {
    // Journée suivante déjà commencée : la question ne pourrait plus changer.
    if (asked.some((q) => q.day === day + 1 && q.responses.length > 0))
      return null;
    const askedTexts = asked.map((q) => q.questionText);
    // Les écarts et les non-négociables des entretiens guident la question.
    const report = await this.interviewReport(...members);
    const analysis = report ? describeReportForAi(report, names) : undefined;
    const { system, prompt } = followUpPrompt(
      day,
      items,
      names,
      reading.toDiscuss,
      askedTexts,
      analysis,
    );
    const written = await this.ai.journeyCompletion(
      journeyId,
      system,
      prompt,
      1200,
      0.6,
    );
    if (!written) return null;
    // Un thème qui porte un écart de sécurité garde sa question de limite.
    const safety = new Set(
      (report?.divergences ?? [])
        .filter((d) => SAFETY_QUESTIONS.has(d.questionId))
        .map((d) => d.theme),
    );
    const candidates = parseFollowUps(written.content).filter(
      (c) => !safety.has(c.themeKey) && !COMPROMISE.test(c.text),
    );
    if (candidates.length === 0) return null;
    const review = await this.ai.reviewSondeurQuestions(
      journeyId,
      candidates.map((c) => ({
        day: day + 1,
        themeKey: c.themeKey,
        text: c.text,
        method: c.method,
        target: c.target,
      })),
      askedTexts,
      written.model,
      {
        analysis: `${analysis ? `${analysis}\n\n` : ''}RÉPONSES DU JOUR :\n${itemsBlock(items, names)}`,
        days: `jour ${day + 1}, question d'approfondissement`,
      },
    );
    if (!review) return null;
    const accepted = candidates
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => !review.rejected.has(i))
      .sort(
        (x, y) =>
          Number(review.preferred.has(y.i)) - Number(review.preferred.has(x.i)),
      );
    for (const { c } of accepted) {
      const placed = await this.placeFollowUp(journeyId, day + 1, {
        ...c,
        writer: written.model,
        reviewer: review.model,
      });
      if (placed) return placed;
    }
    return null;
  }

  /**
   * Remplace une question de la journée suivante, du même thème, par la
   * question d'approfondissement. Seulement si personne n'a encore commencé
   * cette journée : une question déjà affichée ne change pas sous les yeux
   * d'un membre qui y répond.
   */
  private async placeFollowUp(
    journeyId: string,
    day: number,
    proposal: FollowUpProposal & { writer?: string; reviewer?: string },
  ): Promise<string | null> {
    const all = await this.prisma.harmonyQuestion.findMany({
      where: { journeyId },
      orderBy: { sentAt: 'asc' },
      include: { responses: { select: { id: true } } },
    });
    const ofDay = all.filter((q) => q.day === day);
    if (ofDay.some((q) => q.responses.length > 0 || q.followUp)) return null;
    // Ni redite exacte, ni question de même sens déjà posée dans ce Sondeur.
    const key = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();
    if (
      all.some(
        (q) =>
          key(q.questionText) === key(proposal.text) ||
          similarQuestions(q.questionText, proposal.text),
      )
    )
      return null;
    const target = ofDay.find(
      (q) => q.emoji === THEMES[proposal.themeKey].emoji,
    );
    if (!target) return null;
    const updated = await this.prisma.harmonyQuestion.updateMany({
      where: { id: target.id, followUp: false, responses: { none: {} } },
      data: {
        questionText: proposal.text,
        options: proposal.options,
        followUp: true,
        // Traçabilité (jamais montrée aux membres).
        meta: Object.fromEntries(
          Object.entries({
            source: 'suivi',
            method: proposal.method,
            target: proposal.target,
            writer: proposal.writer,
            reviewer: proposal.reviewer,
          }).filter(([, v]) => typeof v === 'string' && v.length > 0),
        ),
      },
    });
    return updated.count === 1 ? target.id : null;
  }

  private async save(journeyId: string, reading: SondeurReading) {
    try {
      await this.prisma.journeyInsight.create({
        data: {
          journeyId,
          day: reading.day,
          source: reading.source,
          content: reading as unknown as Prisma.InputJsonValue,
        },
      });
      JourneyInsightsService.failures.delete(`${journeyId}:${reading.day}`);
    } catch (err) {
      // Déjà écrite par un autre appel : rien à faire.
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
  }

  /** Écarts des deux entretiens, pour le bilan sans IA. */
  private async interviewReport(userAId: string, userBId: string) {
    try {
      const [a, b] = await Promise.all(
        [userAId, userBId].map((userId) =>
          this.prisma.interviewIA.findFirst({
            where: { userId, status: { in: ['en_cours', 'termine'] } },
            orderBy: { startDate: 'desc' },
            include: { responses: true },
          }),
        ),
      );
      return buildDivergenceReport(
        collectRawAnswers(a?.responses),
        collectRawAnswers(b?.responses),
      );
    } catch {
      return null;
    }
  }

  /** L'IA a échoué trois fois sur cette lecture : on n'attend plus. */
  private gaveUp(journeyId: string, day: number): boolean {
    const f = JourneyInsightsService.failures.get(`${journeyId}:${day}`);
    return !!f && f.count >= MAX_ATTEMPTS;
  }

  /** Analyse des deux entretiens pour les consignes de lecture (non-négociables, contrôle). */
  private async analysisFor(
    userAId: string,
    userBId: string,
    names: [string, string],
  ): Promise<string | undefined> {
    const report = await this.interviewReport(userAId, userBId);
    return report ? describeReportForAi(report, names) : undefined;
  }

  /** Plus de nouvelle tentative pour cette lecture : la version des règles reste. */
  private giveUp(journeyId: string, day: number) {
    JourneyInsightsService.failures.set(`${journeyId}:${day}`, {
      count: MAX_ATTEMPTS,
      at: Date.now(),
    });
  }

  private coolingDown(journeyId: string, day: number): boolean {
    const f = JourneyInsightsService.failures.get(`${journeyId}:${day}`);
    if (!f) return false;
    return f.count >= MAX_ATTEMPTS || Date.now() - f.at < RETRY_AFTER_MS;
  }

  private markFailure(journeyId: string, day: number) {
    const failures = JourneyInsightsService.failures;
    const key = `${journeyId}:${day}`;
    const f = failures.get(key);
    // Mémoire bornée : les plus anciens échecs sont oubliés en premier.
    if (!f && failures.size >= 10_000) {
      const [oldest] = failures.keys();
      if (oldest !== undefined) failures.delete(oldest);
    }
    failures.set(key, {
      count: (f?.count ?? 0) + 1,
      at: Date.now(),
    });
  }
}
