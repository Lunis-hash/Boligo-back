import { AiService } from './ai.service';
import { aiBioContradicts } from './ai-bio-guard';

describe('Garde-fou de la bio rédigée par l’IA', () => {
  const previousMode = process.env.AI_PROFILE_MODE;
  beforeAll(() => {
    process.env.AI_PROFILE_MODE = 'ai';
  });
  afterAll(() => {
    if (previousMode === undefined) delete process.env.AI_PROFILE_MODE;
    else process.env.AI_PROFILE_MODE = previousMode;
  });

  it('repère une bio qui contredit le désir d’enfants ou la religion déclarés', () => {
    expect(
      aiBioContradicts('Je rêve de fonder une famille nombreuse.', {
        M0_Q06: 'D',
      }),
    ).toBeTruthy();
    expect(
      aiBioContradicts('Je ne souhaite pas d’enfants.', { M0_Q06: 'A' }),
    ).toBeTruthy();
    expect(
      aiBioContradicts('Ma foi guide chacun de mes pas.', { M1_Q05: 'E' }),
    ).toBeTruthy();
    expect(
      aiBioContradicts('Chrétienne pratiquante, je vais à l’église.', {
        M1_Q05: 'B',
      }),
    ).toBeTruthy();
    expect(
      aiBioContradicts('Le vendredi, je vais à la mosquée.', { M1_Q05: 'A' }),
    ).toBe('religion erronée');
    expect(
      aiBioContradicts('Je vais à l’église chaque dimanche.', { M1_Q05: 'E' }),
    ).toBe('foi inventée');
    expect(
      aiBioContradicts('Je prie Dieu chaque jour.', { M1_Q05: 'A' }),
    ).toBeNull();
    expect(
      aiBioContradicts('Je cherche une relation sincère et durable.', {
        M0_Q06: 'D',
        M1_Q05: 'E',
      }),
    ).toBeNull();
  });

  it('publie la bio déterministe quand la bio IA contredit les réponses', async () => {
    process.env.OPENROUTER_API_KEY = 'mock-key';
    const openRouter = {
      candidates: jest.fn(() => Promise.resolve(['openai/gpt-oss-120b'])),
      priceOf: jest.fn(() => null),
      executeAgentPrompt: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          synthesis: 'Synthèse.',
          bio: 'Je rêve de fonder une famille et de devenir papa très vite, entouré de beaucoup d’enfants.',
        }),
        modelUsed: 'mock',
      }),
    };
    const service = new AiService(openRouter as any);
    const responses = [
      { moduleNumber: 0, rawResponses: { M0_Q05: 'C', M0_Q06: 'D' } },
      { moduleNumber: 8, rawResponses: { M8_Q01: 'B' } },
    ];
    const result = await service.generateProfileSynthesis(
      { firstName: 'Bernard', age: 52, gender: 'H', city: 'Lyon' },
      responses,
    );
    expect(result.bio).not.toContain('fonder une famille');
    expect(result.bio).toContain('relation sérieuse');
    const calls = openRouter.executeAgentPrompt.mock.calls as Array<
      [string, Array<{ content: string }>]
    >;
    const prompt = calls[0][1][0].content;
    expect(prompt).toContain('Genre: homme');
    delete process.env.OPENROUTER_API_KEY;
  });
});
