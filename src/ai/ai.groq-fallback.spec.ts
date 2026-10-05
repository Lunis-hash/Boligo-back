import { AiService } from './ai.service';

/** Groq simulé : la liste des modèles et des réponses de chat programmées. */
function fakeGroq(models: string[], behaviour: (model: string) => string) {
  const calls: string[] = [];
  return {
    calls,
    client: {
      models: { list: jest.fn(async () => ({ data: models.map((id) => ({ id })) })) },
      chat: {
        completions: {
          create: jest.fn(async ({ model }: { model: string }) => {
            calls.push(model);
            return { choices: [{ message: { content: behaviour(model) } }] };
          }),
        },
      },
    },
  };
}

const notFound = (model: string) =>
  Object.assign(
    new Error(`404 {"error":{"message":"The model \`${model}\` does not exist or you do not have access to it.","code":"model_not_found"}}`),
    { status: 404 },
  );

describe('AiService — modèle Groq retiré', () => {
  const env = { ...process.env };
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GROQ_MODEL;
  });
  afterAll(() => {
    process.env = env;
  });

  function serviceWith(groq: unknown) {
    const service = new AiService();
    (service as any).groq = groq;
    return service;
  }

  it('choisit un modèle réellement ouvert au compte au lieu du nom figé', async () => {
    const g = fakeGroq(['whisper-large-v3', 'openai/gpt-oss-20b'], () => 'ok');
    const out = await (serviceWith(g.client) as any).queryAiAgent('sondeur', 'question');
    expect(out).toBe('ok');
    expect(g.calls).toEqual(['openai/gpt-oss-20b']);
  });

  it('change de modèle une fois si Groq répond « model_not_found »', async () => {
    const g = fakeGroq(['llama-3.3-70b-versatile', 'openai/gpt-oss-20b'], (model) => {
      if (model === 'llama-3.3-70b-versatile') throw notFound(model);
      return 'réponse';
    });
    const out = await (serviceWith(g.client) as any).queryAiAgent('sondeur', 'question');
    expect(out).toBe('réponse');
    expect(g.calls).toEqual(['llama-3.3-70b-versatile', 'openai/gpt-oss-20b']);
  });

  it('respecte GROQ_MODEL quand ce modèle existe', async () => {
    process.env.GROQ_MODEL = 'qwen/qwen3-32b';
    const g = fakeGroq(['llama-3.3-70b-versatile', 'qwen/qwen3-32b'], () => 'ok');
    await (serviceWith(g.client) as any).queryAiAgent('sondeur', 'question');
    expect(g.calls).toEqual(['qwen/qwen3-32b']);
  });

  it('remonte les autres erreurs sans boucler', async () => {
    const g = fakeGroq(['openai/gpt-oss-20b'], () => {
      throw new Error('timeout');
    });
    await expect((serviceWith(g.client) as any).queryAiAgent('sondeur', 'question')).rejects.toThrow('timeout');
    expect(g.calls).toHaveLength(1);
  });
});
