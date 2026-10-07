import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { chatOpen } from './chat-access';
import { sondeurReportPrefix } from './journey-insights.service';
import { JourneyService } from './journey.service';

/** Fichiers TypeScript du dossier src, hors specs. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('Circuit de sécurité du Sondeur', () => {
  it('un seul chemin vers la messagerie : JourneyService.openChatIfReady', () => {
    const writers = sources(join(__dirname, '..')).flatMap((file) =>
      [
        ...readFileSync(file, 'utf8').matchAll(
          /data:\s*\{[^}]*currentStep:\s*'chat_libre'/g,
        ),
      ].map(() => file.replace(/.*src\//, '')),
    );
    expect(writers).toEqual(['journey/journey.service.ts']);
  });

  it('sans le service des lectures, la messagerie reste fermée', async () => {
    const prisma = {
      journey: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'j1',
            userAId: 'a',
            userBId: 'b',
            currentStep: 'phase_harmonie',
            result: 'en_cours',
            userA: { firstName: 'Inès' },
            userB: { firstName: 'Karim' },
            harmonyQuestions: [
              { responses: [{ userId: 'a' }, { userId: 'b' }] },
            ],
          }),
        ),
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
    };
    const service = new JourneyService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    expect(await service.openChatIfReady('j1')).toBe(false);
    expect(prisma.journey.updateMany).not.toHaveBeenCalled();
  });

  it('un parcours arrêté ne laisse passer aucun message', () => {
    expect(chatOpen({ currentStep: 'chat_libre', result: 'en_cours' })).toBe(
      true,
    );
    expect(chatOpen({ currentStep: 'termine', result: 'reussi' })).toBe(true);
    expect(chatOpen({ currentStep: 'termine', result: 'abandonne' })).toBe(
      false,
    );
    expect(
      chatOpen({ currentStep: 'phase_harmonie', result: 'en_cours' }),
    ).toBe(false);
  });
});

describe('Réponse au Sondeur : relue à l’envoi', () => {
  const setup = (moderation: {
    allowed: boolean;
    reason?: string;
    category?: string;
    danger?: string[];
  }) => {
    const prisma = {
      harmonyQuestion: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'q1',
            day: 1,
            questionText: 'Que feriez-vous si… ?',
            journeyId: 'j1',
            journey: {
              id: 'j1',
              userAId: 'a',
              userBId: 'b',
              currentStep: 'phase_harmonie',
              stepStartDate: new Date(),
            },
            responses: [],
          }),
        ),
      },
      harmonyResponse: {
        create: jest.fn(() => Promise.resolve({ id: 'r1' })),
      },
      journey: { findUnique: jest.fn(() => Promise.resolve(null)) },
    };
    const ai = {
      journeyAiEligible: jest.fn(() => Promise.resolve(true)),
      moderateSondeurAnswer: jest.fn(() => Promise.resolve(moderation)),
    };
    const insights = {
      reportAnswer: jest.fn(() => Promise.resolve()),
      refresh: jest.fn(() => Promise.resolve()),
      holdsChat: jest.fn(() => Promise.resolve(true)),
    };
    const service = new JourneyService(
      prisma as never,
      ai as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      insights as never,
    );
    return { service, prisma, ai, insights };
  };

  it('parcours payé : chaque réponse est relue, un danger vu par l’IA seule est signalé avant l’enregistrement', async () => {
    const { service, prisma, ai, insights } = setup({
      allowed: true,
      danger: ['menace'],
    });
    const text = 'Elle saura ce qu’il en coûte de me faire honte.';
    await service.respondToQuestion('q1', 'b', text);
    expect(ai.moderateSondeurAnswer).toHaveBeenCalledWith(text, 'j1');
    expect(insights.reportAnswer).toHaveBeenCalledWith(
      'j1',
      1,
      'b',
      'Que feriez-vous si… ?',
      text,
      ['menace'],
    );
    expect(insights.reportAnswer.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.harmonyResponse.create.mock.invocationCallOrder[0],
    );
  });

  it('réponse refusée par la modération IA : signalée (« autre ») avant d’être refusée, jamais perdue', async () => {
    const { service, prisma, insights } = setup({
      allowed: false,
      reason: 'Harcèlement',
      category: 'harassment',
      danger: [],
    });
    await expect(
      service.respondToQuestion(
        'q1',
        'b',
        'Les gens comme toi devraient rester à leur place.',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    const [, , , , , categories, summary] = insights.reportAnswer.mock
      .calls[0] as unknown as [
      string,
      number,
      string,
      string,
      string,
      string[],
      string,
    ];
    expect(categories).toEqual(['autre']);
    expect(summary).toMatch(/Harcèlement/);
    expect(prisma.harmonyResponse.create).not.toHaveBeenCalled();
  });

  it('danger repéré par le code : signalé sans attendre l’IA, jamais refusé', async () => {
    const { service, ai, insights, prisma } = setup({ allowed: false });
    await service.respondToQuestion(
      'q1',
      'a',
      'Je veux me pendre depuis que je suis seule.',
    );
    expect(ai.moderateSondeurAnswer).not.toHaveBeenCalled();
    const [, , , , , categories] = insights.reportAnswer.mock
      .calls[0] as unknown as [
      string,
      number,
      string,
      string,
      string,
      string[],
    ];
    expect(categories).toContain('detresse');
    expect(prisma.harmonyResponse.create).toHaveBeenCalled();
  });
});

describe('Signal du Sondeur confirmé par la modération', () => {
  const setup = (categories: string) => {
    const description = `${sondeurReportPrefix('j1')} · jour 1 · réponse 0123456789 · catégorie : x · catégories=[${categories}]\nRésumé`;
    const prisma = {
      report: {
        update: jest.fn(({ data }: { data: { status: string } }) =>
          Promise.resolve({
            id: 'r1',
            reportedId: 'b',
            status: data.status,
            description,
          }),
        ),
      },
      journey: {
        findUnique: jest.fn(() =>
          Promise.resolve({ userAId: 'a', userBId: 'b' }),
        ),
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
    };
    const notifications = {
      sendPushNotification: jest.fn(() => Promise.resolve()),
    };
    const credits = { refundJourneyOnce: jest.fn(() => Promise.resolve(1)) };
    const service = new AdminService(
      prisma as never,
      {} as never,
      notifications as never,
      {} as never,
      credits as never,
    );
    return { service, prisma, notifications, credits };
  };

  it('menace confirmée : parcours clos, crédit rendu au membre mis en danger, les deux prévenus sans motif', async () => {
    const { service, prisma, credits, notifications } = setup('menace');
    await service.updateReport('r1', 'traite');
    const [closing] = prisma.journey.updateMany.mock.calls[0] as unknown as [
      { where: unknown; data: { currentStep: string; result: string } },
    ];
    expect(closing.where).toEqual({ id: 'j1', result: 'en_cours' });
    expect(closing.data).toMatchObject({
      currentStep: 'termine',
      result: 'abandonne',
    });
    expect(credits.refundJourneyOnce).toHaveBeenCalledTimes(1);
    expect(credits.refundJourneyOnce.mock.calls[0]).toContain('a');
    expect(notifications.sendPushNotification).toHaveBeenCalledTimes(2);
    for (const call of notifications.sendPushNotification.mock
      .calls as unknown as string[][])
      expect(call[3]).not.toMatch(/menace|signal/i);
  });

  it('détresse confirmée : personne n’est en faute, les deux crédits sont rendus', async () => {
    const { service, credits } = setup('detresse');
    await service.updateReport('r1', 'traite');
    expect(credits.refundJourneyOnce).toHaveBeenCalledTimes(2);
  });

  it('confidence de violence subie, ou fausse alerte : rien n’est clos', async () => {
    const victim = setup('violence_subie');
    await victim.service.updateReport('r1', 'traite');
    expect(victim.prisma.journey.updateMany).not.toHaveBeenCalled();
    const rejected = setup('menace');
    await rejected.service.updateReport('r1', 'rejete');
    expect(rejected.prisma.journey.updateMany).not.toHaveBeenCalled();
  });
});
