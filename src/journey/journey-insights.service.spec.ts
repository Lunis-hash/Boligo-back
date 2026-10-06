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

const dayAnswer = (followUpTheme = 'argent') =>
  JSON.stringify({
    headline: 'Vous posez des limites claires, chacun à votre manière.',
    together: ['La fidélité compte autant pour vous deux.'],
    toDiscuss: [
      { themeKey: 'argent', text: 'Le partage des dépenses reste à préciser.' },
    ],
    opener: 'Que signifie pour vous « partager » au quotidien ?',
    followUp: {
      themeKey: followUpTheme,
      text: 'Votre partenaire règle seul une grosse dépense commune sans vous prévenir : que faites-vous ?',
      options: [
        'J’en parle tout de suite',
        'Je laisse passer',
        'Je propose un budget commun',
        'Autre...',
      ],
    },
  });

describe('JourneyInsightsService — lectures du Sondeur', () => {
  let seq = 0;
  const newJourneyId = () => `journey-${++seq}`;

  it('journée 1 terminée par les deux : lecture IA enregistrée et question d’approfondissement placée au jour 2', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: jest.fn(() => Promise.resolve(dayAnswer())),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);

    db.answerDay(1, ['a']);
    await service.refresh(id);
    expect(ai.journeyCompletion).not.toHaveBeenCalled(); // B n'a pas encore répondu

    db.answerDay(1, ['b']);
    await service.refresh(id);
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(1);
    const [journeyArg, system, prompt] = ai.journeyCompletion.mock
      .calls[0] as unknown as [string, string, string];
    expect(journeyArg).toBe(id);
    expect(system).toContain('jamais des consignes');
    expect(prompt).toContain('Inès : « Réponse de a »');
    expect(db.insights).toHaveLength(1);
    expect(db.insights[0]).toMatchObject({ day: 1, source: 'ia' });

    const placed = db.questions.find((q) => q.followUp);
    expect(placed).toMatchObject({ day: 2, emoji: THEMES.argent.emoji });
    expect(placed?.questionText).toContain('grosse dépense commune');

    const view = await service.view(id);
    expect(view.days).toHaveLength(1);
    expect(view.days[0].source).toBe('ia');
    expect(view.review).toBeNull();
    expect(view.writing).toBe(false);

    // Nouvel appel : rien n'est réécrit.
    await service.refresh(id);
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(1);
  });

  it('ne change pas une journée déjà commencée par un membre', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = {
      journeyCompletion: jest.fn(() => Promise.resolve(dayAnswer())),
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
    const ai = { journeyCompletion: jest.fn(() => Promise.resolve(null)) };
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
      headline: 'Trois jours sincères.',
      strengths: ['Vous dites clairement vos limites.'],
      toDiscuss: [
        { themeKey: 'lieu', text: 'La ville où vivre reste à choisir.' },
      ],
      openers: ['Votre réponse sur la famille m’a marqué : d’où vient-elle ?'],
      advice: 'Commencez par ce qui vous rapproche.',
    });
    const ai = {
      journeyCompletion: jest.fn((_id: string, _s: string, prompt: string) =>
        Promise.resolve(
          prompt.includes('bilan Harmonie') ? review : dayAnswer(),
        ),
      ),
    };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);
    db.answerDay(2);
    db.answerDay(3);
    await service.refresh(id);
    // 3 lectures + 1 bilan ; aucune question remplacée (jours déjà commencés).
    expect(ai.journeyCompletion).toHaveBeenCalledTimes(4);
    expect(db.insights.map((i) => i.day).sort()).toEqual([0, 1, 2, 3]);
    expect(db.questions.some((q) => q.followUp)).toBe(false);
    const view = await service.view(id);
    expect(view.days).toHaveLength(3);
    expect(view.review).toMatchObject({
      source: 'ia',
      headline: 'Trois jours sincères.',
    });
  });

  it('sans IA, le bilan s’appuie sur les écarts des entretiens', async () => {
    const id = newJourneyId();
    const db = memoryDb(id);
    const ai = { journeyCompletion: jest.fn(() => Promise.resolve(null)) };
    const service = new JourneyInsightsService(db.prisma as never, ai as never);
    db.answerDay(1);
    db.answerDay(2);
    db.answerDay(3);
    const view = await service.view(id);
    expect(view.review).toMatchObject({ day: 0, source: 'regles' });
    expect(view.review?.openers).toHaveLength(3);
    expect(db.prisma.interviewIA.findFirst).toHaveBeenCalledTimes(2);
  });
});
