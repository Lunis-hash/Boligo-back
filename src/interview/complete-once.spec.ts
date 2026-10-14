import { InterviewService } from './interview.service';

/**
 * Fin du Grand Entretien : une seule clôture, donc un seul e-mail « profil
 * prêt », même si deux enregistrements du dernier module arrivent ensemble.
 */
describe('Clôture du Grand Entretien une seule fois', () => {
  function setup(updatedCount: number) {
    const prisma = {
      interviewIA: {
        updateMany: jest.fn(() => Promise.resolve({ count: updatedCount })),
      },
      user: { update: jest.fn(() => Promise.resolve({})) },
    };
    const notifications = { emailUser: jest.fn(() => Promise.resolve()) };
    const service = new InterviewService(
      prisma as never,
      {} as never,
      notifications as never,
    );
    const internals = service as unknown as {
      completeInterview: (i: string, u: string) => Promise<void>;
      generateMentalMap: jest.Mock;
    };
    const generate: jest.Mock = jest.fn(() => Promise.resolve());
    internals.generateMentalMap = generate;
    const complete = (i: string, u: string) =>
      internals.completeInterview(i, u);
    return { prisma, notifications, generate, complete };
  }

  it('première clôture : e-mail et portrait', async () => {
    const { prisma, notifications, generate, complete } = setup(1);
    await complete('i1', 'u1');
    expect(prisma.interviewIA.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i1', status: 'en_cours' } }),
    );
    expect(notifications.emailUser).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('entretien déjà clos (appel concurrent) : aucun e-mail ni portrait', async () => {
    const { prisma, notifications, generate, complete } = setup(0);
    await complete('i1', 'u1');
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(notifications.emailUser).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });
});
