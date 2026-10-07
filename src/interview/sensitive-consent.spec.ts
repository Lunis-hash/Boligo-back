import { InterviewService } from './interview.service';
import { pendingQuestions } from './questions.service';
import { isSensitiveQuestion, withoutSensitive } from './sensitive-questions';

/** Base en mémoire : un membre, un entretien en cours, des réponses enregistrées. */
function memoryDb(consent: boolean | null) {
  const user = {
    id: 'u1',
    birthDate: new Date('1994-03-02'),
    gender: 'F',
    sensitiveConsent: consent,
    sensitiveConsentAt: null as Date | null,
  };
  const responses = [
    {
      id: 'r1',
      interviewId: 'i1',
      moduleNumber: 1,
      rawResponses: { M1_Q01: 'A', M1_Q05: 'B', M1_Q06: 'A' } as Record<
        string,
        string
      >,
    },
  ];
  const prisma = {
    user: {
      findUnique: jest.fn(() => Promise.resolve(user)),
      update: jest.fn(({ data }: { data: Partial<typeof user> }) => {
        Object.assign(user, data);
        return Promise.resolve(user);
      }),
    },
    interviewIA: {
      findFirst: jest.fn(({ where }: { where: { status: string } }) =>
        Promise.resolve(
          where.status === 'en_cours' ? { id: 'i1', userId: 'u1' } : null,
        ),
      ),
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
  return { service, user, responses };
}

describe('Données sensibles (RGPD, article 9)', () => {
  it('liste : religion, vie intime, violences subies, et leurs précisions écrites', () => {
    for (const id of [
      'M1_Q05',
      'M1_Q06',
      'M3_Q08',
      'M6_Q06',
      'M6_Q07',
      'M6_Q08',
    ])
      expect(isSensitiveQuestion(id)).toBe(true);
    expect(isSensitiveQuestion('M1_Q05_AUTRE')).toBe(true);
    expect(isSensitiveQuestion('M6_Q04')).toBe(false);
    expect(withoutSensitive({ M1_Q01: 'A', M6_Q07: 'B' })).toEqual({
      M1_Q01: 'A',
    });
  });

  it('refus : les questions sensibles ne sont plus posées', () => {
    const asked = pendingQuestions(6, {}, 30, 'F').map((q) => q.id);
    const skipped = pendingQuestions(6, {}, 30, 'F', true).map((q) => q.id);
    expect(asked).toEqual(expect.arrayContaining(['M6_Q06', 'M6_Q07']));
    expect(skipped.some(isSensitiveQuestion)).toBe(false);
    expect(skipped.length).toBe(asked.length - 3);
  });

  it('sans accord explicite, une réponse sensible n’est jamais enregistrée', async () => {
    for (const consent of [null, false]) {
      const { service, responses } = memoryDb(consent);
      await service.saveModule('u1', {
        moduleNumber: 6,
        moduleName: 'Module 6',
        answers: { M6_Q01: 'A', M6_Q07: 'B' },
      });
      const saved = responses.find((r) => r.moduleNumber === 6)!;
      expect(saved.rawResponses).toEqual({ M6_Q01: 'A' });
    }
  });

  it('avec accord, la réponse est enregistrée', async () => {
    const { service, responses } = memoryDb(true);
    await service.saveModule('u1', {
      moduleNumber: 6,
      moduleName: 'Module 6',
      answers: { M6_Q01: 'A', M6_Q07: 'B' },
    });
    expect(responses.find((r) => r.moduleNumber === 6)!.rawResponses).toEqual({
      M6_Q01: 'A',
      M6_Q07: 'B',
    });
  });

  it('retrait de l’accord : les réponses sensibles déjà données sont effacées', async () => {
    const { service, user, responses } = memoryDb(true);
    const out = await service.setSensitiveConsent('u1', false);
    expect(out).toMatchObject({ consent: false, removedAnswers: 2 });
    expect(user.sensitiveConsent).toBe(false);
    expect(user.sensitiveConsentAt).toBeInstanceOf(Date);
    expect(responses[0].rawResponses).toEqual({ M1_Q01: 'A' });
    expect(await service.getSensitiveConsent('u1')).toMatchObject({
      consent: false,
    });
  });

  it('sans accord, les questions sensibles ne retiennent jamais le module (pas de boucle)', async () => {
    const { service } = memoryDb(null);
    const out = await service.saveModule('u1', {
      moduleNumber: 6,
      moduleName: 'Module 6',
      answers: Object.fromEntries(
        pendingQuestions(6, {}, 32, 'F')
          .filter((q) => !isSensitiveQuestion(q.id))
          .map((q) => [q.id, q.options[0].key]),
      ),
    });
    expect(out.success).toBe(true);
    const status = await (
      service as unknown as {
        completedModules: (
          id: string,
          r: Array<{ moduleNumber: number; rawResponses: unknown }>,
        ) => Promise<number[]>;
      }
    ).completedModules('u1', [
      {
        moduleNumber: 6,
        rawResponses: Object.fromEntries(
          pendingQuestions(6, {}, 32, 'F')
            .filter((q) => !isSensitiveQuestion(q.id))
            .map((q) => [q.id, q.options[0].key]),
        ),
      },
    ]);
    expect(status).toContain(6);
  });
});
