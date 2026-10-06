import { THEMES } from '../matching/divergence.engine';
import { JourneyInsightsService } from './journey-insights.service';

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
  };
  const answerDay = (day: number, who: Array<'a' | 'b'> = ['a', 'b']) => {
    for (const q of questions.filter((x) => x.day === day)) {
      for (const userId of who) {
        q.responses.push({
          id: `${q.id}-${userId}`,
          userId,
          responseText: `Réponse de ${userId}`,
        });
      }
    }
  };
  return { prisma, questions, insights, answerDay };
}

/** Lecture du jour : chaque point cite la question et les deux réponses. */
const dayAnswer = () =>
  JSON.stringify({
    headline: 'Vous avez parlé de vos limites, chacun à votre manière.',
    together: [
      {
        n: 1,
        a: 'Réponse de a',
        b: 'Réponse de b',
        text: 'Vous répondez tous deux sur la famille.',
      },
    ],
    toDiscuss: [
      {
        n: 2,
        a: 'réponse de a',
        b: 'réponse de b',
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
    expect(prompt).toContain('Inès : « Réponse de a »');
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
      },
    ]);

    // Le relecteur voit la méthode, la cible et les réponses du jour.
    const [, candidates, , writerModel, context] = ai.reviewSondeurQuestions
      .mock.calls[0] as unknown as [
      string,
      Array<{ method?: string; target?: string }>,
      string[],
      string,
      string,
    ];
    expect(candidates[0]).toMatchObject({ method: 'besoin caché' });
    expect(writerModel).toBe('anthropic/claude-sonnet-5');
    expect(context).toContain('Karim : « Réponse de b »');

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
          a: 'Réponse de a',
          b: 'Réponse de b',
          text: 'Vous avez répondu tous les deux sur la famille.',
        },
      ],
      toDiscuss: [
        {
          n: 7,
          a: 'Réponse de a',
          b: 'Réponse de b',
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
      expect(prompt).toContain('Inès : « Réponse de a »');
      expect(db.insights).toHaveLength(0);
      // Pas de lecture vérifiée : pas de question d'approfondissement non plus.
      expect(db.questions.some((q) => q.followUp)).toBe(false);
      const view = await service.view(id);
      expect(view.days[0].source).toBe('regles');
    }
  });
});
