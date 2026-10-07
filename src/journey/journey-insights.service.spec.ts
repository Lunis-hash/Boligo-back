import { THEMES } from '../matching/divergence.engine';
import {
  JourneyInsightsService,
  UNCLASSIFIED_SUMMARY,
} from './journey-insights.service';

type Response = { id: string; userId: string; responseText: string };
type Question = {
  id: string;
  day: number;
  emoji: string;
  questionText: string;
  options: string[];
  followUp: boolean;
  sentAt: Date;
  responses: Response[];
};
type Insight = {
  journeyId: string;
  day: number;
  source: string;
  content: unknown;
};

const THEME_ORDER = [
  'famille',
  'argent',
  'spiritualite',
  'intimite',
  'communication',
  'projet',
  'lieu',
] as const;

type StoredReport = {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  description: string;
  status: string;
};
type ReportWhere = {
  reportedId?: string;
  description: { startsWith: string };
};

/** Base en mémoire : un parcours de 21 questions (3 jours × 7 thèmes). */
function memoryDb(journeyId: string) {
  let n = 0;
  const questions: Question[] = [];
  for (let day = 1; day <= 3; day++) {
    for (const theme of THEME_ORDER) {
      questions.push({
        id: `q${day}-${theme}`,
        day,
        emoji: THEMES[theme].emoji,
        questionText: `Jour ${day}, ${theme} : que feriez-vous ?`,
        options: ['A', 'B', 'C', 'Autre...'],
        followUp: false,
        sentAt: new Date(2026, 0, 1, 0, 0, n++),
        responses: [],
      });
    }
  }
  const insights: Insight[] = [];
  const reports: StoredReport[] = [];
  const journey = () => ({
    id: journeyId,
    userAId: 'a',
    userBId: 'b',
    userA: { firstName: 'Inès' },
    userB: { firstName: 'Karim' },
    harmonyQuestions: questions.map((q) => ({
      ...q,
      responses: [...q.responses],
    })),
    insights: insights.map((i) => ({ ...i })),
  });
  const prisma = {
    journey: { findUnique: jest.fn(() => Promise.resolve(journey())) },
    harmonyQuestion: {
      findMany: jest.fn(() =>
        Promise.resolve(questions.map((q) => ({ ...q }))),
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<Question>;
        }) => {
          const q = questions.find(
            (x) => x.id === where.id && !x.followUp && x.responses.length === 0,
          );
          if (q) Object.assign(q, data);
          return Promise.resolve({ count: q ? 1 : 0 });
        },
      ),
    },
    journeyInsight: {
      create: jest.fn(({ data }: { data: Insight }) => {
        if (insights.some((i) => i.day === data.day)) {
          return Promise.reject(
            Object.assign(new Error('unique'), { code: 'P2002' }),
          );
        }
        insights.push(data);
        return Promise.resolve(data);
      }),
    },
    interviewIA: { findFirst: jest.fn(() => Promise.resolve(null)) },
    report: {
      create: jest.fn(
        ({ data }: { data: Omit<StoredReport, 'status' | 'id'> }) => {
          const row = {
            ...data,
            id: `r${reports.length + 1}`,
            status: 'en_attente',
          };
          reports.push(row);
          return Promise.resolve(row);
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<StoredReport>;
        }) => {
          const row = reports.find((r) => r.id === where.id);
          if (row) Object.assign(row, data);
          return Promise.resolve(row);
        },
      ),
      findMany: jest.fn(({ where }: { where: ReportWhere }) =>
        Promise.resolve(
          reports
            .filter(
              (r) =>
                (!where.reportedId || r.reportedId === where.reportedId) &&
                r.description.startsWith(where.description.startsWith),
            )
            .map((r) => ({ ...r })),
        ),
      ),
    },
  };
  const answerDay = (
    day: number,
    who: Array<'a' | 'b'> = ['a', 'b'],
    text: (userId: string, index: number) => string = (userId) =>
      `Réponse détaillée de ${userId}`,
  ) => {
    questions
      .filter((x) => x.day === day)
      .forEach((q, i) => {
        for (const userId of who) {
          q.responses.push({
            id: `${q.id}-${userId}`,
            userId,
            responseText: text(userId, i),
          });
        }
      });
  };
  /** Décision de la modération sur les signalements qui correspondent. */
  const decide = (status: 'traite' | 'rejete', match = '') => {
    for (const r of reports)
      if (r.description.includes(match)) r.status = status;
  };
  return { prisma, questions, insights, reports, answerDay, decide };
}

/** Lecture du jour : chaque point cite la question et les deux réponses. */
const dayAnswer = () =>
  JSON.stringify({
    headline: 'Vous avez parlé de vos limites, chacun à votre manière.',
    together: [
      {
        n: 1,
        a: 'Réponse détaillée de a',
        b: 'Réponse détaillée de b',
        text: 'Vous répondez tous deux sur la famille.',
      },
    ],
    toDiscuss: [
      {
        n: 2,
        a: 'réponse détaillée de a',
        b: 'réponse détaillée de b',
        text: 'Le partage des dépenses reste à préciser.',
      },
    ],
    opener: 'Que signifie pour vous partager au quotidien ?',
  });

const FOLLOW_UP_TEXT =
  "Quand quelqu'un règle seul une grosse dépense commune, qu'est-ce que cela réveille chez vous ?";

/** Propositions de question d'approfondissement (appel séparé). */
const followUps = (themeKey = 'argent') =>
  JSON.stringify({
    questions: [
      {
        themeKey,
        text: FOLLOW_UP_TEXT,
        methode: 'besoin caché',
        cible: 'ce que l’argent commun représente',
      },
    ],
  });

/** Rédacteur simulé : lecture, question d'approfondissement ou bilan. */
const writer = (review?: string) =>
  jest.fn((_id: string, _s: string, prompt: string) =>
    written(
      prompt.includes('bilan Harmonie') && review
        ? review
        : prompt.includes("questions d'approfondissement")
          ? followUps()
          : dayAnswer(),
    ),
  );

/** Réponse du rédacteur simulé, avec le modèle qui l'a écrite. */
const written = (content: string) =>
  Promise.resolve({ content, model: 'anthropic/claude-sonnet-5' });

/** Vérification de fidélité simulée : fidèle, refusée ou indisponible. */
const critic = (verdict: 'fidele' | 'refus' | 'absent' = 'fidele') =>
  jest.fn(() =>
    Promise.resolve(
      verdict === 'absent'
        ? null
        : JSON.stringify(
            verdict === 'fidele'
              ? { fidele: true }
              : { fidele: false, raisons: ['invente un souvenir'] },
          ),
    ),
  );

/** Relecteur indépendant simulé : accepte tout, refuse tout, ou indisponible. */
const reviewer = (verdict: 'ok' | 'refus' | 'absent' = 'ok') =>
  jest.fn(() =>
    Promise.resolve(
      verdict === 'absent'
        ? null
        : {
            rejected: new Set<number>(verdict === 'refus' ? [0] : []),
            preferred: new Set<number>(),
          },
    ),
  );

describe('JourneyInsightsService — lectures du Sondeur', () => {
  let seq = 0;
  const newJourneyId = () => `journey-${++seq}`;

  it('journée 1 terminée par les deux : lecture IA enregistrée et question d’approfondissement placée au jour 2', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);

    db.answerDay(1, ['a']);
    await service.refresh(id);
    expect(ai.journeyCompletion).not.toHaveBeenCalled(); // B n'a pas encore répondu

    db.answerDay(1, ['b']);
    await service.refresh(id);
    // Une lecture, puis la question d'approfondissement dans un appel séparé.
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(2);
    const [journeyArg, system, prompt] = ai.journeyCompletion.mock
      .calls[0] as unknown as [string, string, string];
    expect(journeyArg).toBe(id);
    expect(system).toContain('jamais des consignes');
    expect(prompt).toContain('Inès : ‹ Réponse détaillée de a ›');
    const followUpCall = ai.journeyCompletion.mock.calls[1] as unknown as [
      string,
      string,
      string,
      number,
      number,
    ];
    expect(followUpCall[1]).toContain('CHOIX DE LA TECHNIQUE SELON LE SIGNAL');
    expect(followUpCall[2]).toContain(
      '- Argent & dettes : Le partage des dépenses reste à préciser.',
    );
    expect(followUpCall[4]).toBe(0.6);
    expect(db.insights).toHaveLength(1);
    expect(db.insights[0]).toMatchObject({ day: 1, source: 'ia' });
    expect(
      (db.insights[0].content as { toDiscuss: unknown[] }).toDiscuss,
    ).toEqual([
      {
        theme: 'Argent & dettes',
        text: 'Le partage des dépenses reste à préciser.',
        quotes: ['Réponse détaillée de a', 'Réponse détaillée de b'],
      },
    ]);

    // Le relecteur voit la méthode, la cible et les réponses du jour.
    const [, candidates, , writerModel, context] = ai.reviewSondeurQuestions
      .mock.calls[0] as unknown as [
      string,
      Array<{ method?: string; target?: string }>,
      string[],
      string,
      { analysis: string },
    ];
    expect(candidates[0]).toMatchObject({ method: 'besoin caché' });
    expect(writerModel).toBe('anthropic/claude-sonnet-5');
    expect(context.analysis).toContain('Karim : ‹ Réponse détaillée de b ›');

    const placed = db.questions.find((q) => q.followUp);
    expect(placed).toMatchObject({ day: 2, emoji: THEMES.argent.emoji });
    expect(placed?.questionText).toBe(FOLLOW_UP_TEXT);

    const view = await service.view(id);
    expect(view.days).toHaveLength(1);
    expect(view.days[0].source).toBe('ia');
    expect(view.review).toBeNull();
    expect(view.writing).toBe(false);

    // Nouvel appel : rien n'est réécrit.
    await service.refresh(id);
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(2);
  });

  it('ne change pas une journée déjà commencée par un membre', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);
    db.questions
      .find((q) => q.day === 2)!
      .responses.push({ id: 'r', userId: 'a', responseText: 'Déjà là' });
    await service.refresh(id);
    expect(db.insights).toHaveLength(1);
    expect(db.questions.some((q) => q.followUp)).toBe(false);
  });

  it('sans IA (parcours non payé, budget atteint) : lecture des règles, sans relance immédiate', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: jest.fn(() => Promise.resolve(null)),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);

    const first = await service.view(id);
    expect(first.days[0]).toMatchObject({ day: 1, source: 'regles' });
    expect(first.writing).toBe(true);
    await service.refresh(id); // attend l'écriture lancée par view()
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(1);
    expect(db.insights).toHaveLength(0);

    const second = await service.view(id);
    expect(second.days[0].source).toBe('regles');
    expect(second.writing).toBe(false);
    await service.refresh(id);
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(1);
  });

  it('les trois journées terminées : bilan Harmonie écrit par l’IA', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const review = JSON.stringify({
      headline: 'Trois jours sur vos limites, vos valeurs et votre avenir.',
      strengths: [
        {
          n: 1,
          a: 'Réponse détaillée de a',
          b: 'Réponse détaillée de b',
          text: 'Vous avez répondu tous les deux sur la famille.',
        },
      ],
      toDiscuss: [
        {
          n: 7,
          a: 'Réponse détaillée de a',
          b: 'Réponse détaillée de b',
          text: 'La ville où vivre reste à choisir.',
        },
      ],
      openers: ['Qu’est-ce qui compte le plus pour vous dans une ville ?'],
      advice: 'Commencez par ce qui vous rapproche.',
    });
    const ai = {
      journeyCompletion: writer(review),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);
    db.answerDay(2);
    db.answerDay(3);
    await service.refresh(id);
    // 3 lectures + 1 bilan ; pas de question d'approfondissement : les
    // journées suivantes sont déjà commencées.
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(4);
    expect(db.insights.map((i) => i.day).sort()).toEqual([0, 1, 2, 3]);
    expect(db.questions.some((q) => q.followUp)).toBe(false);
    const view = await service.view(id);
    expect(view.days).toHaveLength(3);
    expect(view.review).toMatchObject({
      source: 'ia',
      headline: 'Trois jours sur vos limites, vos valeurs et votre avenir.',
      toDiscuss: [{ theme: 'Lieu de vie & mobilité' }],
    });
  });

  it('sans IA, le bilan s’appuie sur les écarts des entretiens', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: jest.fn(() => Promise.resolve(null)),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);
    db.answerDay(2);
    db.answerDay(3);
    const view = await service.view(id);
    expect(view.review).toMatchObject({ day: 0, source: 'regles' });
    expect(view.review?.openers).toHaveLength(3);
    expect(db.prisma.interviewIA.findFirst).toHaveBeenCalledTimes(2);
  });

  it('question d’approfondissement refusée par le relecteur, ou relecture impossible : rien n’est remplacé', async () => {
    for (const verdict of ['refus', 'absent'] as const) {
      const id = newJourneyId();
      const db = memoryDb(id);
      const ai = {
        journeyCompletion: writer(),
        journeyCritique: critic(),
        reviewSondeurQuestions: reviewer(verdict),
      };
      const service = new JourneyInsightsService(
        db.prisma as never,
        ai as never,
      );
      db.answerDay(1);
      await service.refresh(id);
      expect(ai.reviewSondeurQuestions).toHaveBeenCalledTimes(1);
      // La lecture est enregistrée, la question du jour 2 reste inchangée.
      expect(db.insights).toHaveLength(1);
      expect(db.questions.some((q) => q.followUp)).toBe(false);
    }
  });

  it('écarte une question d’approfondissement de même sens qu’une question déjà posée', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    db.questions[0].questionText = FOLLOW_UP_TEXT;
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);
    await service.refresh(id);
    expect(db.questions.some((q) => q.followUp)).toBe(false);
  });

  it('anti-invention : lecture refusée ou non vérifiée par le relecteur → rien de publié, version des règles', async () => {
    for (const verdict of ['refus', 'absent'] as const) {
      const id = newJourneyId();
      const db = memoryDb(id);
      const ai = {
        journeyCompletion: writer(),
        journeyCritique: critic(verdict),
        reviewSondeurQuestions: reviewer(),
      };
      const service = new JourneyInsightsService(
        db.prisma as never,
        ai as never,
      );
      db.answerDay(1);
      await service.refresh(id);
      expect(ai.journeyCritique).toHaveBeenCalledTimes(1);
      // Le relecteur reçoit le rédacteur à éviter et les réponses à comparer.
      const [, , prompt, writerModel] = ai.journeyCritique.mock
        .calls[0] as unknown as [string, string, string, string];
      expect(writerModel).toBe('anthropic/claude-sonnet-5');
      expect(prompt).toContain('Inès : ‹ Réponse détaillée de a ›');
      expect(db.insights).toHaveLength(0);
      // Pas de lecture vérifiée : pas de question d'approfondissement non plus.
      expect(db.questions.some((q) => q.followUp)).toBe(false);
      const view = await service.view(id);
      expect(view.days[0].source).toBe('regles');
    }
  });

  it('signal de danger dans une réponse : aucune lecture par l’IA, modération prévenue une seule fois', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1, ['a', 'b'], (userId, i) =>
      userId === 'b' && i === 4
        ? 'Si on me pousse à bout, il peut m’arriver de lever la main.'
        : `Réponse détaillée de ${userId}`,
    );
    await service.refresh(id);
    expect(ai.journeyCompletion).not.toHaveBeenCalled();
    // Rien n'est enregistré : la lecture de sécurité est recalculée.
    expect(db.insights).toHaveLength(0);
    expect(db.questions.some((q) => q.followUp)).toBe(false);
    expect(db.reports).toHaveLength(1);
    expect(db.reports[0]).toMatchObject({ reporterId: 'b', reportedId: 'b' });
    expect(db.reports[0].description).toMatch(/lever la main/);
    expect(db.reports[0].description).toMatch(/jour 1 · réponse [0-9a-f]{10}/);
    expect(db.reports[0].description).toMatch(/catégorie : violence/);
    // Rien n'est relancé, aucun doublon.
    await service.refresh(id);
    expect(ai.journeyCompletion).not.toHaveBeenCalled();
    expect(db.reports).toHaveLength(1);
    const view = await service.view(id);
    expect(view.days[0].source).toBe('regles');
    expect(view.days[0].advice).toMatch(/sécurité/);
    expect(view.days[0].advice).toMatch(/avant l'ouverture de la messagerie/);
    expect(view.days[0].toDiscuss).toEqual([]);
    expect(view.days[0].openers).toEqual([]);
    expect(view.writing).toBe(false);
  });

  it('fausse alerte rejetée par la modération : la lecture de l’IA est écrite, sans nouveau signalement', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
      journeyAiEligible: jest.fn(() => Promise.resolve(true)),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1, ['a', 'b'], (userId, i) =>
      userId === 'b' && i === 4
        ? 'Je fouillerai son téléphone tous les soirs.'
        : `Réponse détaillée de ${userId}`,
    );
    await service.refresh(id);
    expect(db.reports).toHaveLength(1);
    expect(await service.holdsChat(id)).toBe(true);
    db.decide('rejete');
    await service.refresh(id);
    expect(ai.journeyCompletion).toHaveBeenCalled();
    expect(db.insights).toHaveLength(1);
    expect((await service.view(id)).days[0].source).toBe('ia');
    // Les trois journées et le bilan : jamais de signalement « bilan ».
    db.answerDay(2);
    db.answerDay(3);
    await service.refresh(id);
    expect(db.reports).toHaveLength(1);
    expect(db.reports.some((r) => r.description.includes('bilan'))).toBe(false);
  });

  it('détresse : signalement et ressources d’aide envoyées en privé à l’auteur', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const notifications = {
      sendPushNotification: jest.fn(() => Promise.resolve()),
    };
    const service = new JourneyInsightsService(
      db.prisma as never,
      ai as never,
      notifications as never,
    );
    db.answerDay(1, ['a', 'b'], (userId, i) =>
      userId === 'a' && i === 2
        ? 'Je ne vois plus de raison de vivre depuis quelque temps.'
        : `Réponse détaillée de ${userId}`,
    );
    await service.refresh(id);
    expect(ai.journeyCompletion).not.toHaveBeenCalled();
    expect(notifications.sendPushNotification).toHaveBeenCalledTimes(1);
    const [userId, , , text] = notifications.sendPushNotification.mock
      .calls[0] as unknown as [string, string, string, string];
    expect(userId).toBe('a');
    expect(text).toMatch(/3114/);
  });

  it('détresse et violence ensemble : le 3114 n’est jamais effacé, un message n’est jamais envoyé deux fois', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const notifications = {
      sendPushNotification: jest.fn(() => Promise.resolve()),
    };
    const service = new JourneyInsightsService(
      db.prisma as never,
      ai as never,
      notifications as never,
    );
    await service.reportAnswer(
      id,
      1,
      'a',
      'Question 1 ?',
      'Il me frappait et depuis je veux mourir.',
      ['violence_subie', 'detresse'],
    );
    const [, , , text] = notifications.sendPushNotification.mock
      .calls[0] as unknown as [string, string, string, string];
    expect(text).toMatch(/3114/);
    expect(text).toMatch(/3919/);
    await service.reportAnswer(
      id,
      1,
      'a',
      'Question 2 ?',
      'Je pense encore à la mort.',
      ['detresse'],
    );
    expect(notifications.sendPushNotification).toHaveBeenCalledTimes(1);
  });

  it('menace : message neutre (ni victime ni auteur présumés), jamais celui des victimes seul', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const notifications = {
      sendPushNotification: jest.fn(() => Promise.resolve()),
    };
    const service = new JourneyInsightsService(
      db.prisma as never,
      {} as never,
      notifications as never,
    );
    await service.reportAnswer(
      id,
      1,
      'b',
      'Question ?',
      'Si elle part sans rien dire, je la tue.',
      ['menace'],
    );
    const [, , , text] = notifications.sendPushNotification.mock
      .calls[0] as unknown as [string, string, string, string];
    expect(text).toMatch(/craignez vos propres réactions/);
    expect(text).not.toMatch(/^Vous avez évoqué des violences/);
  });

  it('alerte levée par l’IA : signalement du membre désigné, lecture de sécurité, pas de question de suivi', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: jest.fn(() =>
        Promise.resolve({
          content: JSON.stringify({
            alerte: 'controle',
            membre: 'b',
            headline: '',
            together: [],
            toDiscuss: [],
          }),
          model: 'anthropic/claude-opus-5',
        }),
      ),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);
    await service.refresh(id);
    expect(db.insights).toHaveLength(0);
    expect(db.questions.some((q) => q.followUp)).toBe(false);
    expect(db.reports).toHaveLength(1);
    expect(db.reports[0].reportedId).toBe('b');
    expect(db.reports[0].description).toMatch(/jour 1 · alerte/);
    expect(db.reports[0].description).toMatch(/catégorie : contrôle/);
    expect((await service.view(id)).days[0].advice).toMatch(/sécurité/);
    // Pas de nouvel appel tant que l'alerte attend la modération.
    await service.refresh(id);
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(1);
    // Alerte rejetée puis relevée de nouveau : version des règles, sans boucle.
    db.decide('rejete');
    await service.refresh(id);
    await service.refresh(id);
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(2);
    expect(db.reports).toHaveLength(1);
    expect((await service.view(id)).days[0].advice ?? '').not.toMatch(
      /sécurité/,
    );
  });

  it('alerte de l’IA sans membre désigné : signalée pour les deux, aucun message d’aide envoyé', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: jest.fn(() =>
        written(JSON.stringify({ alerte: ['menace', 'controle'] })),
      ),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const notifications = {
      sendPushNotification: jest.fn(() => Promise.resolve()),
    };
    const service = new JourneyInsightsService(
      db.prisma as never,
      ai as never,
      notifications as never,
    );
    db.answerDay(1);
    await service.refresh(id);
    expect(db.reports.map((r) => r.reportedId).sort()).toEqual(['a', 'b']);
    expect(db.reports[0].description).toMatch(/catégories=\[menace,controle\]/);
    expect(notifications.sendPushNotification).not.toHaveBeenCalled();
  });

  it('messagerie retenue tant qu’un signalement du Sondeur attend la modération (ou est confirmé)', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
      journeyAiEligible: jest.fn(() => Promise.resolve(false)),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1, ['a', 'b'], (userId, i) =>
      userId === 'b' && i === 0
        ? 'Je fouillerai son téléphone tous les soirs.'
        : `Réponse détaillée de ${userId}`,
    );
    expect(await service.holdsChat(id)).toBe(true);
    expect(db.reports).toHaveLength(1);
    // Confirmé : toujours retenue (le parcours est clos par la modération).
    db.decide('traite');
    expect(await service.holdsChat(id)).toBe(true);
    db.decide('rejete');
    expect(await service.holdsChat(id)).toBe(false);
    expect(db.reports).toHaveLength(1);
  });

  it('une confidence de violence subie seule ne retient pas la messagerie, et la lecture ne promet pas de vérification', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
      journeyAiEligible: jest.fn(() => Promise.resolve(false)),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1, ['a', 'b'], (userId, i) =>
      userId === 'a' && i === 0
        ? 'Mon ex me battait, je suis partie avec ma fille.'
        : `Réponse détaillée de ${userId}`,
    );
    expect(await service.holdsChat(id)).toBe(false);
    const advice = (await service.view(id)).days[0].advice ?? '';
    expect(advice).toMatch(/en a été informée/);
    expect(advice).not.toMatch(/avant l'ouverture/);
  });

  it('réponse non classée par l’IA : cachée, puis classée après coup (danger, ou signalement clos)', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      moderateSondeurAnswer: jest.fn(() =>
        Promise.resolve({ allowed: true, danger: [] }),
      ),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    const subtle = 'Si tu me quittes, sache que je saurai toujours où tu es.';
    await service.reportAnswer(
      id,
      1,
      'b',
      'Q ?',
      subtle,
      ['autre'],
      UNCLASSIFIED_SUMMARY,
    );
    expect((await service.safety(id)).hidden('b', 1, 'Q ?', subtle)).toBe(true);
    expect((await service.safety(id)).holds).toBe(true);
    await service.resolveClassification(id, 1, 'b', 'Q ?', subtle, ['menace']);
    expect(db.reports[0].description).toMatch(/catégories=\[menace\]/);
    expect(db.reports[0].description).not.toContain(UNCLASSIFIED_SUMMARY);
    expect((await service.safety(id)).hidden('b', 1, 'Q ?', subtle)).toBe(true);
    // Une autre réponse, relue sans danger : signalement clos, réponse visible.
    const calm = 'J’aime les dimanches calmes en famille.';
    await service.reportAnswer(
      id,
      1,
      'b',
      'Q2 ?',
      calm,
      ['autre'],
      UNCLASSIFIED_SUMMARY,
    );
    await service.resolveClassification(id, 1, 'b', 'Q2 ?', calm, []);
    expect(db.reports[1].status).toBe('rejete');
    expect((await service.safety(id)).hidden('b', 1, 'Q2 ?', calm)).toBe(false);
    // IA toujours indisponible : rien ne bouge (nouvelle tentative plus tard).
    await service.reportAnswer(
      id,
      1,
      'a',
      'Q3 ?',
      subtle,
      ['autre'],
      UNCLASSIFIED_SUMMARY,
    );
    await service.resolveClassification(id, 1, 'a', 'Q3 ?', subtle, null);
    expect(db.reports[2].status).toBe('en_attente');
  });

  it('réponse refusée par la modération : signalée pour trace, sans retenir la messagerie', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const service = new JourneyInsightsService(db.prisma as never, {} as never);
    await service.reportRefusal(
      id,
      1,
      'b',
      'Q ?',
      'Texte grossier',
      'harassment : Harcèlement',
    );
    expect(db.reports).toHaveLength(1);
    expect(db.reports[0].description).toMatch(/jour 1 · refus [0-9a-f]{10}/);
    expect((await service.safety(id)).holds).toBe(false);
  });

  it('alerte de l’IA au bilan : les réponses du membre restent cachées ; une seule alerte ouverte par membre', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: jest.fn(() =>
        written(JSON.stringify({ alerte: 'menace', membre: 'b' })),
      ),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);
    db.answerDay(2);
    db.answerDay(3);
    await service.refresh(id);
    // Jour 1 : alerte ; jours 2, 3 et bilan : pas de nouvelle alerte ouverte.
    expect(db.reports).toHaveLength(1);
    const safety = await service.safety(id);
    expect(
      safety.hidden(
        'b',
        3,
        'Jour 3, famille : que feriez-vous ?',
        'Réponse détaillée de b',
      ),
    ).toBe(true);
    expect(
      safety.hidden(
        'a',
        3,
        'Jour 3, famille : que feriez-vous ?',
        'Réponse détaillée de a',
      ),
    ).toBe(false);
  });

  it('réponse cachée à l’autre : fermé par défaut, rouvert seulement par un rejet', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const service = new JourneyInsightsService(db.prisma as never, {} as never);
    const threat = 'Si elle part sans rien dire, je la tue.';
    // Signalement absent (son écriture a échoué) : cachée quand même.
    expect((await service.safety(id)).hidden('b', 1, 'Q ?', threat)).toBe(true);
    await service.reportAnswer(id, 1, 'b', 'Q ?', threat, ['menace']);
    expect((await service.safety(id)).hidden('b', 1, 'Q ?', threat)).toBe(true);
    db.decide('rejete');
    expect((await service.safety(id)).hidden('b', 1, 'Q ?', threat)).toBe(
      false,
    );
    // Danger repéré par l'IA seule : caché tant que le signalement attend.
    await service.reportAnswer(id, 1, 'a', 'Q2 ?', 'Tu me le paieras.', [
      'menace',
    ]);
    expect(
      (await service.safety(id)).hidden('a', 1, 'Q2 ?', 'Tu me le paieras.'),
    ).toBe(true);
    // Une confidence de violence subie n'est jamais cachée.
    expect(
      (await service.safety(id)).hidden(
        'a',
        1,
        'Q3 ?',
        'Mon ex me battait, je suis partie.',
      ),
    ).toBe(false);
  });

  it('parcours payé : la messagerie attend la lecture de l’IA (seconde ligne de défense)', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: jest.fn(() => new Promise(() => undefined)),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
      journeyAiEligible: jest.fn(() => Promise.resolve(true)),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);
    expect(await service.holdsChat(id)).toBe(true);
  });

  it('réponse dangereuse : signalée dès l’envoi, avec ses catégories lisibles', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: writer(),
      journeyCritique: critic(),
      reviewSondeurQuestions: reviewer(),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    await service.reportAnswer(
      id,
      1,
      'b',
      'Question ?',
      'Envoie-moi 50 000 FCFA par Orange Money.',
      ['argent'],
    );
    const [{ data }] = db.prisma.report.create.mock.calls[0] as unknown as [
      { data: { reportedId: string; description: string } },
    ];
    expect(data.reportedId).toBe('b');
    expect(data.description).toMatch(/catégories=\[argent\]/);
    expect(data.description).toMatch(/jour 1 · réponse /);
  });
});
