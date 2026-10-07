import { AiService } from './ai.service';

/** Ordre des fournisseurs et compte de la dépense réelle. */
describe('AiService — OpenRouter (payant) et Groq', () => {
  const env = { ...process.env };
  afterAll(() => {
    process.env = env;
  });
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'cle-de-test';
    delete process.env.GROQ_MODEL;
  });

  function setup(paid: boolean) {
    const openRouter = {
      candidates: jest.fn(() => Promise.resolve(['anthropic/claude-sonnet-5'])),
      priceOf: jest.fn(() => ({ prompt: 2, completion: 10 })),
      executeAgentPrompt: jest.fn(() =>
        Promise.resolve({
          content: 'réponse OpenRouter',
          modelUsed: 'anthropic/claude-sonnet-5',
          usage: { prompt_tokens: 1000, completion_tokens: 500, cost: 0.0071 },
        }),
      ),
    };
    const budget = {
      journeyEligible: jest.fn(() => Promise.resolve(paid)),
      allowJourney: jest.fn(() => Promise.resolve(true)),
      recordJourney: jest.fn(() => Promise.resolve()),
      allow: jest.fn(() => Promise.resolve(true)),
      record: jest.fn(() => Promise.resolve()),
    };
    const groqCreate = jest.fn(() =>
      Promise.resolve({
        choices: [{ message: { content: '{"allowed": true}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 10 },
      }),
    );
    const service = new AiService(openRouter as never, budget as never);
    (service as unknown as { groq: unknown }).groq = {
      models: {
        list: () =>
          Promise.resolve({
            data: [
              { id: 'llama-3.1-8b-instant' },
              { id: 'openai/gpt-oss-120b' },
            ],
          }),
      },
      chat: { completions: { create: groqCreate } },
    };
    return { service, openRouter, budget, groqCreate };
  }

  it('parcours payé : OpenRouter d’abord, estimation au prix réel, coût facturé enregistré', async () => {
    const { service, openRouter, budget, groqCreate } = setup(true);
    const out = await service.journeyCompletion(
      'j1',
      'système',
      'lecture',
      1500,
    );
    expect(out).toEqual({
      content: 'réponse OpenRouter',
      model: 'anthropic/claude-sonnet-5',
    });
    expect(groqCreate).not.toHaveBeenCalled();
    expect(openRouter.executeAgentPrompt).toHaveBeenCalledWith(
      'coach',
      expect.any(Array),
      expect.objectContaining({
        role: 'quality',
        maxTokens: 1500,
        temperature: 0.3,
        // Délai proportionnel à la longueur demandée (30 ms par jeton).
        timeoutMs: 45_000,
      }),
    );
    // Estimation : jetons lus × 2 $ + 1 500 jetons écrits × 10 $ (par million).
    const [, estimate] = budget.allowJourney.mock.calls[0] as unknown as [
      string,
      number,
    ];
    expect(estimate).toBeGreaterThanOrEqual(15_000);
    await new Promise((r) => setImmediate(r));
    // Coût réel facturé : 0,0071 $ → 7 100 millionièmes.
    expect(budget.recordJourney).toHaveBeenCalledWith(
      'j1',
      'anthropic/claude-sonnet-5',
      1000,
      500,
      7100,
    );
  });

  it('OpenRouter en échec sur un parcours payé : Groq prend le relais', async () => {
    const { service, openRouter, groqCreate } = setup(true);
    openRouter.executeAgentPrompt.mockImplementation(() =>
      Promise.reject(new Error('HTTP 503')),
    );
    const out = await service.journeyCompletion(
      'j2',
      'système',
      'lecture',
      1500,
    );
    expect(out?.content).toBe('{"allowed": true}');
    expect(groqCreate).toHaveBeenCalledTimes(1);
    // Plancher de qualité : le secours est un grand modèle, jamais le 8B.
    expect(
      (groqCreate.mock.calls as unknown as Array<[{ model: string }]>)[0][0]
        .model,
    ).toBe('openai/gpt-oss-120b');
  });

  it('parcours payé sans modèle Groq de qualité : aucune lecture par l’IA (version des règles)', async () => {
    const { service, openRouter, groqCreate } = setup(true);
    openRouter.executeAgentPrompt.mockImplementation(() =>
      Promise.reject(new Error('HTTP 503')),
    );
    (
      service as unknown as {
        groq: { models: { list: () => Promise<unknown> } };
      }
    ).groq.models.list = () =>
      Promise.resolve({ data: [{ id: 'llama-3.1-8b-instant' }] });
    expect(
      await service.journeyCompletion('j3', 'système', 'lecture', 1500),
    ).toBeNull();
    expect(groqCreate).not.toHaveBeenCalled();
  });

  it('usages courants (modération) : Groq d’abord, OpenRouter jamais appelé s’il répond', async () => {
    const { service, openRouter, groqCreate, budget } = setup(false);
    await service.moderateChatMessage(
      'Un message assez long pour passer par la modération assistée, avec beaucoup de mots et un lien suspect www.exemple.com',
    );
    expect(groqCreate).toHaveBeenCalled();
    expect(openRouter.executeAgentPrompt).not.toHaveBeenCalled();
    expect(budget.allowJourney).not.toHaveBeenCalled();
  });
});
