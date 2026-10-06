import { OpenRouterService, maxPrice } from './openrouter.service';

/** Catalogue OpenRouter simulé : prix en dollars par jeton, comme l'API. */
const CATALOG = {
  data: [
    {
      id: 'anthropic/claude-sonnet-5',
      pricing: { prompt: '0.000002', completion: '0.00001' },
    },
    {
      id: 'anthropic/claude-sonnet-4.6',
      pricing: { prompt: '0.000003', completion: '0.000015' },
    },
    {
      id: 'openai/gpt-5',
      pricing: { prompt: '0.00000125', completion: '0.00001' },
    },
    {
      id: 'openai/gpt-5.1',
      pricing: { prompt: '0.00002', completion: '0.00008' },
    },
    {
      id: 'openai/gpt-oss-120b',
      pricing: { prompt: '0.0000001', completion: '0.0000005' },
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      pricing: { prompt: '0', completion: '0' },
    },
  ],
};

type FetchCall = [string, { body?: string } | undefined];

function mockFetch(
  chat: (model: string) => { ok: boolean; status?: number; body?: unknown },
) {
  const fn = jest.fn((url: string, init?: { body?: string }) => {
    if (url.endsWith('/models')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(CATALOG),
      });
    }
    const { model } = JSON.parse(init?.body ?? '{}') as { model: string };
    const r = chat(model);
    return Promise.resolve({
      ok: r.ok,
      status: r.status ?? 200,
      text: () => Promise.resolve('erreur'),
      json: () => Promise.resolve(r.body),
    });
  });
  (global as unknown as { fetch: unknown }).fetch = fn;
  return fn;
}

describe('OpenRouterService', () => {
  const env = { ...process.env };
  let service: OpenRouterService;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'cle-de-test';
    delete process.env.OPENROUTER_QUALITY_MODEL;
    delete process.env.OPENROUTER_CRITIC_MODEL;
    delete process.env.OPENROUTER_MAX_PRICE_PROMPT;
    delete process.env.OPENROUTER_MAX_PRICE_COMPLETION;
    service = new OpenRouterService();
  });

  afterAll(() => {
    process.env = env;
  });

  describe('extractJson', () => {
    it('lit un JSON nu, entre backticks ou au milieu du texte', () => {
      expect(service.extractJson('{"status": "ok", "value": 42}')).toEqual({
        status: 'ok',
        value: 42,
      });
      expect(service.extractJson('```json\n{"items": [1, 2]}\n```')).toEqual({
        items: [1, 2],
      });
      expect(service.extractJson('Voici :\n{"score": 95}\nMerci.')).toEqual({
        score: 95,
      });
    });
  });

  it('prix plafond par défaut : 5 $ / 25 $ par million de jetons, réglable', () => {
    expect(maxPrice()).toEqual({ prompt: 5, completion: 25 });
    process.env.OPENROUTER_MAX_PRICE_COMPLETION = '12';
    expect(maxPrice()).toEqual({ prompt: 5, completion: 12 });
  });

  it('candidats : jamais gratuits, présents au catalogue, sous le prix plafond', async () => {
    mockFetch(() => ({ ok: true }));
    expect(await service.candidates('quality')).toEqual([
      'anthropic/claude-sonnet-5',
      'anthropic/claude-sonnet-4.6',
    ]);
    // gpt-5.1 dépasse le plafond (20 $ / 80 $) : écarté.
    expect(await service.candidates('critic')).toEqual(['openai/gpt-5']);
    // Le modèle Llama n'existe qu'en version gratuite : écarté.
    expect(await service.candidates('default')).toEqual([
      'openai/gpt-oss-120b',
    ]);
    expect(service.priceOf('openai/gpt-5')).toEqual({
      prompt: 1.25,
      completion: 10,
    });
  });

  it('le relecteur n’est jamais de la même famille que le rédacteur', async () => {
    mockFetch(() => ({ ok: true }));
    expect(await service.candidates('critic', 'openai/gpt-oss-120b')).toEqual(
      [],
    );
    process.env.OPENROUTER_CRITIC_MODEL =
      'anthropic/claude-sonnet-4.6, openai/gpt-5';
    expect(
      await service.candidates('critic', 'anthropic/claude-sonnet-5'),
    ).toEqual(['openai/gpt-5']);
  });

  it('appel : données non conservées, prix plafonné, longueur bornée, coût réel renvoyé', async () => {
    const fetchFn = mockFetch(() => ({
      ok: true,
      body: {
        choices: [{ message: { content: '{"ok": true}' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 200, cost: 0.004 },
      },
    }));
    const res = await service.executeAgentPrompt(
      'sondeur',
      [{ role: 'user', content: 'Bonjour' }],
      {
        role: 'quality',
        maxTokens: 8000,
        temperature: 0.6,
      },
    );
    expect(res).toMatchObject({
      content: '{"ok": true}',
      modelUsed: 'anthropic/claude-sonnet-5',
    });
    expect(res.usage?.cost).toBe(0.004);
    const chatCall = (fetchFn.mock.calls as unknown as FetchCall[]).find(
      ([url]) => url.endsWith('/chat/completions'),
    );
    const body = JSON.parse(chatCall?.[1]?.body ?? '{}') as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      model: 'anthropic/claude-sonnet-5',
      max_tokens: 8000,
      temperature: 0.6,
      provider: {
        data_collection: 'deny',
        max_price: { prompt: 5, completion: 25 },
      },
    });
  });

  it('passe au modèle suivant en cas d’échec, puis abandonne proprement', async () => {
    mockFetch((model) =>
      model === 'anthropic/claude-sonnet-5'
        ? { ok: false, status: 503 }
        : {
            ok: true,
            body: { choices: [{ message: { content: 'secours' } }] },
          },
    );
    const res = await service.executeAgentPrompt(
      'coach',
      [{ role: 'user', content: 'x' }],
      { role: 'quality' },
    );
    expect(res.modelUsed).toBe('anthropic/claude-sonnet-4.6');

    mockFetch(() => ({ ok: false, status: 500 }));
    await expect(
      new OpenRouterService().executeAgentPrompt(
        'coach',
        [{ role: 'user', content: 'x' }],
        { role: 'quality' },
      ),
    ).rejects.toThrow(/ont échoué/);
  });

  it('sans clé : aucun appel', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const fetchFn = mockFetch(() => ({ ok: true }));
    await expect(
      service.executeAgentPrompt('coach', [{ role: 'user', content: 'x' }]),
    ).rejects.toThrow(/Clé API absente/);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
