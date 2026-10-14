import { InterviewService } from './interview.service';
import { moduleQuestions } from './questions.service';
import { unmetConditionalAnswers, widenAcceptedAges } from './questions.v82';

/**
 * Retour à une question précédente du Grand Entretien : une réponse modifiée
 * remplace l'ancienne (une ligne par module, jamais de doublon), les réponses
 * de suite devenues sans objet sont effacées, la version ne change pas et un
 * entretien terminé n'est jamais rouvert.
 */
function memoryDb(opts: { status?: 'en_cours' | 'termine' } = {}) {
  const user = {
    id: 'u1',
    birthDate: new Date('1994-03-02'),
    gender: 'F',
    sensitiveConsent: true as boolean | null,
    sensitiveConsentAt: null as Date | null,
    city: 'Bezons, France',
  };
  const interview = {
    id: 'i1',
    userId: 'u1',
    status: opts.status ?? 'en_cours',
    questionnaireVersion: '8.2',
  };
  const responses: Array<{
    id: string;
    interviewId: string;
    moduleNumber: number;
    moduleName?: string;
    rawResponses: Record<string, string>;
    completedAt?: Date;
  }> = [];
  const withResponses = () => ({
    ...interview,
    responses: responses.map((r) => ({ ...r })),
  });
  const prisma = {
    user: {
      findUnique: jest.fn(() => Promise.resolve(user)),
      update: jest.fn(() => Promise.resolve(user)),
    },
    interviewIA: {
      findFirst: jest.fn(({ where }: { where: { status: string } }) =>
        Promise.resolve(
          where.status === interview.status ? withResponses() : null,
        ),
      ),
      create: jest.fn(),
      update: jest.fn(({ data }: { data: { status: 'termine' } }) => {
        Object.assign(interview, data);
        return Promise.resolve(interview);
      }),
    },
    moduleResponse: {
      findFirst: jest.fn(({ where }: { where: { moduleNumber: number } }) =>
        Promise.resolve(
          responses.find((r) => r.moduleNumber === where.moduleNumber) ?? null,
        ),
      ),
      findMany: jest.fn(() =>
        Promise.resolve(responses.map((r) => ({ ...r }))),
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: { rawResponses: Record<string, string> };
        }) => {
          const r = responses.find((x) => x.id === where.id)!;
          r.rawResponses = data.rawResponses;
          return Promise.resolve(r);
        },
      ),
      create: jest.fn(
        ({
          data,
        }: {
          data: { moduleNumber: number; rawResponses: Record<string, string> };
        }) => {
          const r = {
            id: `r${responses.length + 1}`,
            interviewId: 'i1',
            ...data,
          };
          responses.push(r);
          return Promise.resolve(r);
        },
      ),
    },
  };
  const service = new InterviewService(prisma as never, {} as never);
  return { service, prisma, responses, interview };
}

describe('Grand Entretien — retour à une question précédente', () => {
  it('une réponse modifiée remplace l’ancienne : une seule ligne par module', async () => {
    const { service, responses } = memoryDb();
    await service.saveAnswer('u1', { questionId: 'M0_Q03', value: 'A' });
    await service.saveAnswer('u1', { questionId: 'M0_Q04', value: 'A' });
    await service.saveAnswer('u1', { questionId: 'M0_Q03', value: 'C' });
    expect(responses.filter((r) => r.moduleNumber === 0)).toHaveLength(1);
    expect(responses[0].rawResponses).toEqual({ M0_Q03: 'C', M0_Q04: 'A' });
  });

  it('la question de suite devenue sans objet est effacée (même module)', async () => {
    const { service, responses } = memoryDb();
    await service.saveAnswer('u1', { questionId: 'V82_M8_01', value: 'A' });
    await service.saveAnswer('u1', { questionId: 'V82_M8_02', value: 'B' });
    const res = await service.saveAnswer('u1', {
      questionId: 'V82_M8_01',
      value: 'D',
    });
    expect(res.removed).toEqual(['V82_M8_02']);
    expect(responses[0].rawResponses).toEqual({ V82_M8_01: 'D' });
  });

  it('… et dans un autre module (V82_M3_01 → V82_M9_06)', async () => {
    const { service, responses } = memoryDb();
    await service.saveAnswer('u1', { questionId: 'V82_M3_01', value: 'C' });
    await service.saveAnswer('u1', { questionId: 'V82_M9_06', value: 'A' });
    await service.saveAnswer('u1', { questionId: 'V82_M3_01', value: 'A' });
    const m9 = responses.find((r) => r.moduleNumber === 9)!;
    expect(m9.rawResponses).toEqual({});
  });

  it('âges : la plage acceptée est élargie, jamais de blocage', async () => {
    const { service, responses } = memoryDb();
    await service.saveAnswer('u1', { questionId: 'V82_M0_01', value: '28-34' });
    await service.saveAnswer('u1', { questionId: 'V82_M0_02', value: '25-40' });
    // Retour en arrière : la tranche idéale déborde la plage acceptée.
    const res = await service.saveAnswer('u1', {
      questionId: 'V82_M0_01',
      value: '22-45',
    });
    expect(res.success).toBe(true);
    expect(res.adjusted).toEqual({ V82_M0_02: '22-45' });
    expect(responses[0].rawResponses.V82_M0_02).toBe('22-45');
  });

  it('réponse invalide : refusée, rien n’est écrit', async () => {
    const { service, responses } = memoryDb();
    await expect(
      service.saveAnswer('u1', { questionId: 'M0_Q03', value: 'Z' }),
    ).rejects.toThrow();
    await expect(
      service.saveAnswer('u1', { questionId: 'INCONNUE', value: 'A' }),
    ).rejects.toThrow();
    expect(responses).toHaveLength(0);
  });

  it('entretien terminé : jamais rouvert ni réécrit', async () => {
    const { service, responses } = memoryDb({ status: 'termine' });
    const res = await service.saveAnswer('u1', {
      questionId: 'M0_Q03',
      value: 'A',
    });
    expect(res.alreadyCompleted).toBe(true);
    expect(responses).toHaveLength(0);
  });

  it('relecture d’un module : réponses du module seulement, entretien en cours', async () => {
    const { service } = memoryDb();
    await service.saveAnswer('u1', { questionId: 'M0_Q03', value: 'B' });
    await service.saveAnswer('u1', { questionId: 'V82_M8_01', value: 'A' });
    expect(await service.moduleAnswers('u1', 0)).toEqual({
      answers: { M0_Q03: 'B' },
      editable: true,
    });
  });

  it('la version enregistrée de l’entretien ne change jamais', async () => {
    const { service, interview } = memoryDb();
    process.env.INTERVIEW_VERSION = '7.1';
    try {
      await service.saveAnswer('u1', { questionId: 'V82_M0_03', value: 'A' });
    } finally {
      delete process.env.INTERVIEW_VERSION;
    }
    expect(interview.questionnaireVersion).toBe('8.2');
  });
});

describe('Grand Entretien — relecture d’un module (questions répondues comprises)', () => {
  it('les questions déjà répondues reviennent, la suite garde sa condition', () => {
    const answers = { V82_M8_01: 'A', V82_M8_02: 'B' };
    const normal = moduleQuestions(8, answers, 30, 'F', false, '8.2');
    expect(normal.some((q) => q.id === 'V82_M8_01')).toBe(false);
    const review = moduleQuestions(8, answers, 30, 'F', false, '8.2', true);
    expect(review[0].id).toBe('V82_M8_01');
    expect(review.find((q) => q.id === 'V82_M8_02')?.askIf).toEqual([
      { questionId: 'V82_M8_01', values: ['A', 'B', 'C'] },
    ]);
  });

  it('dépendance hors module remplie : question ouverte sans condition', () => {
    const review = moduleQuestions(
      9,
      { V82_M3_01: 'C' },
      30,
      'F',
      false,
      '8.2',
      true,
    );
    const q = review.find((x) => x.id === 'V82_M9_06');
    expect(q).toBeDefined();
    expect(q?.askIf).toBeUndefined();
  });
});

describe('Grand Entretien — règles pures', () => {
  it('widenAcceptedAges', () => {
    expect(widenAcceptedAges({ V82_M0_01: '28-34', V82_M0_02: '25-40' })).toBe(
      null,
    );
    expect(widenAcceptedAges({ V82_M0_01: '28-34', V82_M0_02: '30-40' })).toBe(
      '28-40',
    );
    expect(widenAcceptedAges({ V82_M0_01: '28-34' })).toBe(null);
  });

  it('unmetConditionalAnswers : en cascade, jamais une réponse sans condition', () => {
    expect(
      unmetConditionalAnswers(
        { V82_M8_01: 'D', V82_M8_02: 'A', M0_Q03: 'A' },
        '8.2',
      ),
    ).toEqual(['V82_M8_02']);
    expect(
      unmetConditionalAnswers({ V82_M8_01: 'A', V82_M8_02: 'A' }, '8.2'),
    ).toEqual([]);
  });
});
