import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import {
  QUESTIONS,
  QUESTION_INDEX,
  mixesExclusive,
  presentOptions,
} from './questions.data';
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
  it('liste : origine, religion, vie intime (V7 et V6 retirées), santé, violences subies, et leurs précisions écrites', () => {
    for (const id of [
      'M1_Q01',
      'M1_Q02',
      'M1_Q16',
      'M1_Q17',
      'M6_Q08',
      'M6_Q19',
      'M10_Q17',
      'M1_Q05',
      'M6_Q07',
      'M2_Q10',
      'M3_Q08',
    ])
      expect(isSensitiveQuestion(id)).toBe(true);
    expect(isSensitiveQuestion('M1_Q16_AUTRE')).toBe(true);
    expect(isSensitiveQuestion('M6_Q04')).toBe(false);
    // V7.1 : sensibles option par option seulement, la question reste posée.
    for (const id of ['M8_Q12', 'M7_Q19', 'M8_Q16'])
      expect(isSensitiveQuestion(id)).toBe(false);
    expect(withoutSensitive({ M6_Q02: 'A', M6_Q08: 'B' })).toEqual({
      M6_Q02: 'A',
    });
  });

  it('refus : les questions sensibles ne sont plus posées', () => {
    const asked = pendingQuestions(6, {}, 30, 'F').map((q) => q.id);
    const skipped = pendingQuestions(6, {}, 30, 'F', true).map((q) => q.id);
    const sensitive = asked.filter(isSensitiveQuestion);
    // V7.1 : M6_Q08 n'est plus posée (remplacée par M10_Q19, module 10).
    expect(sensitive).toEqual(expect.arrayContaining(['M6_Q19']));
    expect(skipped.some(isSensitiveQuestion)).toBe(false);
    expect(skipped.length).toBe(asked.length - sensitive.length);
  });

  it('sans accord explicite, une réponse sensible n’est jamais enregistrée', async () => {
    for (const consent of [null, false]) {
      const { service, responses } = memoryDb(consent);
      await service.saveModule('u1', {
        moduleNumber: 6,
        moduleName: 'Module 6',
        answers: { M6_Q02: 'A', M6_Q19: 'B' },
      });
      const saved = responses.find((r) => r.moduleNumber === 6)!;
      expect(saved.rawResponses).toEqual({ M6_Q02: 'A' });
    }
  });

  it('avec accord, la réponse est enregistrée', async () => {
    const { service, responses } = memoryDb(true);
    await service.saveModule('u1', {
      moduleNumber: 6,
      moduleName: 'Module 6',
      answers: { M6_Q02: 'A', M6_Q19: 'B' },
    });
    expect(responses.find((r) => r.moduleNumber === 6)!.rawResponses).toEqual({
      M6_Q02: 'A',
      M6_Q19: 'B',
    });
  });

  it('retrait de l’accord : les réponses sensibles déjà données sont effacées', async () => {
    const { service, user, responses } = memoryDb(true);
    responses.push({
      id: 'r8',
      interviewId: 'i1',
      moduleNumber: 8,
      rawResponses: { M8_Q01: 'A', M8_Q12: 'B,D', M8_Q16: 'B' },
    });
    const out = await service.setSensitiveConsent('u1', false);
    // Origine, religion (V6) et pratique ; puis deux réponses du module 8
    // dont les options sensibles sont retirées.
    expect(out).toMatchObject({ consent: false, removedAnswers: 5 });
    expect(user.sensitiveConsent).toBe(false);
    expect(user.sensitiveConsentAt).toBeInstanceOf(Date);
    expect(responses[0].rawResponses).toEqual({});
    expect(responses[1].rawResponses).toEqual({ M8_Q01: 'A', M8_Q12: 'D' });
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

describe('V7.1 — options sensibles et options « aucun »', () => {
  const save = (
    service: InterviewService,
    moduleNumber: number,
    answers: Record<string, string>,
  ) =>
    service.saveModule('u1', {
      moduleNumber,
      moduleName: `Module ${moduleNumber}`,
      answers,
    });

  it('sans accord, la question reste posée sans ses options sensibles', async () => {
    const controller = new InterviewController(
      {
        getSensitiveConsent: () => Promise.resolve({ consent: false }),
      } as never,
      {
        getQuestionsForUser: () =>
          Promise.resolve([QUESTION_INDEX.get('M8_Q12')!]),
      } as never,
    );
    const [q] = await controller.getQuestions({ user: { id: 'u1' } }, '8');
    expect(q.options.map((o) => o.key)).toEqual([
      'A',
      'C',
      'D',
      'E',
      'F',
      'I',
      'J',
      'K',
    ]);
    expect(q.options.find((o) => o.key === 'K')?.exclusive).toBe(true);
    const all = presentOptions(QUESTION_INDEX.get('M8_Q12')!, true);
    expect(all.options).toHaveLength(11);
  });

  it('sans accord, une option sensible n’est jamais enregistrée ; avec accord, si', async () => {
    for (const consent of [null, false]) {
      const { service, responses } = memoryDb(consent);
      await save(service, 8, { M8_Q12: 'B,D', M8_Q16: 'B' });
      expect(responses.find((r) => r.moduleNumber === 8)!.rawResponses).toEqual(
        { M8_Q12: 'D' },
      );
    }
    const { service, responses } = memoryDb(true);
    await save(service, 8, { M8_Q12: 'B,D', M8_Q16: 'B' });
    expect(responses.find((r) => r.moduleNumber === 8)!.rawResponses).toEqual({
      M8_Q12: 'B,D',
      M8_Q16: 'B',
    });
  });

  it('« aucun » ne se combine avec aucune autre réponse', async () => {
    const { service } = memoryDb(true);
    for (const [moduleNumber, id, value] of [
      [8, 'M8_Q12', 'A,K'],
      [2, 'M2_Q04', 'A,G'],
      [2, 'M2_Q05', 'A,D'],
      [6, 'M6_Q02', 'B,D'],
      [6, 'M6_Q19', 'A,G'],
      [8, 'M8_Q16', 'A,D'],
    ] as const)
      await expect(
        save(service, moduleNumber, { [id]: value }),
      ).rejects.toThrow(/aucun/);
    await expect(save(service, 8, { M8_Q12: 'K' })).resolves.toMatchObject({
      success: true,
    });
    expect(
      QUESTIONS.filter((q) => q.options.some((o) => o.exclusive)).every(
        (q) => q.multiple,
      ),
    ).toBe(true);
    expect(mixesExclusive(QUESTION_INDEX.get('M8_Q12')!, 'A,C')).toBe(false);
  });
});
