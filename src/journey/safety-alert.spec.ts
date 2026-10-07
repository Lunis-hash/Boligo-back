import { JourneyInsightsService } from './journey-insights.service';

/** Alerte de l'équipe, 24 h/24, pour un signalement urgent du Sondeur. */
describe('Alerte immédiate de l’équipe de modération', () => {
  const setup = () => {
    const prisma = {
      report: {
        findMany: jest.fn(() => Promise.resolve([])),
        create: jest.fn(() => Promise.resolve({ id: 'r1' })),
      },
      journey: { findUnique: jest.fn(() => Promise.resolve(null)) },
    };
    const email = { sendSimpleEmail: jest.fn(() => Promise.resolve()) };
    const service = new JourneyInsightsService(
      prisma as never,
      {} as never,
      undefined,
      email as never,
    );
    return { service, email };
  };
  const previous = process.env.SAFETY_ALERT_EMAILS;
  beforeEach(() => {
    process.env.SAFETY_ALERT_EMAILS =
      'moderation@boligo.test, astreinte@boligo.test';
  });
  afterAll(() => {
    process.env.SAFETY_ALERT_EMAILS = previous;
  });

  it('détresse : chaque adresse reçoit une alerte, sans nom ni réponse', async () => {
    const { service, email } = setup();
    await service.reportAnswer(
      'j1',
      1,
      'a',
      'Que feriez-vous si… ?',
      'Je n’ai plus envie de vivre en ce moment.',
      ['detresse'],
    );
    expect(email.sendSimpleEmail).toHaveBeenCalledTimes(2);
    const [to, subject, , paragraphs] = email.sendSimpleEmail.mock
      .calls[0] as unknown as [string, string, string, string[]];
    expect(to).toBe('moderation@boligo.test');
    expect(subject).toMatch(/urgent/);
    expect(paragraphs.join(' ')).not.toMatch(/plus envie de vivre/);
  });

  it('confidence de violence subie seule : pas d’alerte urgente', async () => {
    const { service, email } = setup();
    await service.reportAnswer(
      'j1',
      1,
      'a',
      'Que feriez-vous si… ?',
      'Mon ex me frappait.',
      ['violence_subie'],
    );
    expect(email.sendSimpleEmail).not.toHaveBeenCalled();
  });
});
