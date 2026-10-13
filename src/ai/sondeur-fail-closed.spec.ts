import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Rédaction IA du Sondeur : FAIL-CLOSED. Chaque scénario charge le routeur
 * avec son propre fichier de qualification (module isolé).
 */
const VALID = {
  generatedAt: 't',
  run: 'r',
  writer: ['anthropic/claude-sonnet-5.5'],
  critic: ['z-ai/glm-5.3-flash', 'openai/gpt-5.6-luna'],
  escalation: [],
  fallback: ['z-ai/glm-5.3-flash'],
  escalateAboveRejectRate: 0.5,
};
type Router = typeof import('./sondeur-router');

function routerWith(content: string | null): Router {
  const dir = mkdtempSync(join(tmpdir(), 'sondeur-fc-'));
  const file = join(dir, 'sondeur-models.json');
  if (content !== null) writeFileSync(file, content);
  let router!: Router;
  const before = process.env.SONDEUR_MODELS_FILE;
  process.env.SONDEUR_MODELS_FILE = file;
  jest.isolateModules(() => {
    router = jest.requireActual<Router>('./sondeur-router');
  });
  process.env.SONDEUR_MODELS_FILE = before;
  return router;
}

describe('Rédaction IA du Sondeur — fail-closed (fichier de qualification)', () => {
  it.each([
    ['fichier absent', null],
    ['JSON invalide', '{ "writer": ['],
    ['qualification invalide', JSON.stringify({ writer: [] })],
    ['generation absent', JSON.stringify(VALID)],
    [
      'enabled absent',
      JSON.stringify({ ...VALID, generation: { disabledThemes: [] } }),
    ],
    [
      'enabled "true" en chaîne',
      JSON.stringify({ ...VALID, generation: { enabled: 'true' } }),
    ],
    ['enabled 1', JSON.stringify({ ...VALID, generation: { enabled: 1 } })],
    [
      'enabled false',
      JSON.stringify({ ...VALID, generation: { enabled: false } }),
    ],
  ])('%s → rédaction désactivée', (_label, content) => {
    const r = routerWith(content);
    expect(r.sondeurGenerationEnabled()).toBe(false);
    expect(r.aiGenerationEnabled()).toBe(false);
  });

  it('enabled: true (booléen) avec une qualification valide → seul cas actif', () => {
    const r = routerWith(
      JSON.stringify({ ...VALID, generation: { enabled: true } }),
    );
    expect(r.sondeurGenerationEnabled()).toBe(true);
  });

  it('rôles de rédaction : jamais de modèles historiques sans qualification', () => {
    const r = routerWith(null);
    expect(r.modelsFor('writer', { strict: true }).models).toEqual([]);
    expect(r.modelsFor('critic', { strict: true }).models).toEqual([]);
    // Hors rédaction du Sondeur, le mode provisoire reste disponible.
    expect(r.modelsFor('writer').models.length).toBeGreaterThan(0);
  });
});

describe('Rédaction IA du Sondeur — fail-closed (routage et appels)', () => {
  const env = { ...process.env };
  const fetchSpy = jest
    .spyOn(global, 'fetch')
    .mockRejectedValue(new Error('réseau coupé (test)'));
  afterAll(() => {
    process.env = env;
    fetchSpy.mockRestore();
  });

  /** Services réels, chargés avec la qualification du scénario. */
  function services(content: string | null) {
    const dir = mkdtempSync(join(tmpdir(), 'sondeur-fc-'));
    const file = join(dir, 'sondeur-models.json');
    if (content !== null) writeFileSync(file, content);
    process.env.SONDEUR_MODELS_FILE = file;
    process.env.OPENROUTER_API_KEY = 'test';
    let out!: {
      or: import('./openrouter.service').OpenRouterService;
      AiService: typeof import('./ai.service').AiService;
    };
    jest.isolateModules(() => {
      const { OpenRouterService } = jest.requireActual<
        typeof import('./openrouter.service')
      >('./openrouter.service');
      const { AiService } =
        jest.requireActual<typeof import('./ai.service')>('./ai.service');
      out = { or: new OpenRouterService(), AiService };
    });
    return out;
  }
  const budget = {
    journeyEligible: jest.fn(() => Promise.resolve(true)),
    allowJourney: jest.fn(() => Promise.resolve(true)),
    recordJourney: jest.fn(() => Promise.resolve()),
    allow: jest.fn(() => Promise.resolve(true)),
    record: jest.fn(() => Promise.resolve()),
  };
  const groq = () => ({
    models: {
      list: jest.fn(() =>
        Promise.resolve({ data: [{ id: 'llama-3.3-70b-versatile' }] }),
      ),
    },
    chat: {
      completions: {
        create: jest.fn(() =>
          Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
        ),
      },
    },
  });

  it('modèle non présent dans la qualification : refusé, même imposé par variable', async () => {
    process.env.OPENROUTER_QUALITY_MODEL = 'evil/unqualified-model';
    const { or } = services(
      JSON.stringify({ ...VALID, generation: { enabled: true } }),
    );
    const models = await or.candidates('quality', undefined, {
      sondeurWriting: true,
    });
    expect(models).not.toContain('evil/unqualified-model');
    expect(models).toEqual([
      'anthropic/claude-sonnet-5.5',
      'z-ai/glm-5.3-flash',
    ]);
    // Rôle hors Sondeur (« default ») : jamais utilisable pour la rédaction.
    expect(
      await or.candidates('default', undefined, { sondeurWriting: true }),
    ).toEqual([]);
    delete process.env.OPENROUTER_QUALITY_MODEL;
  });

  it.each([
    ['fichier absent', null],
    [
      'enabled false',
      JSON.stringify({ ...VALID, generation: { enabled: false } }),
    ],
    [
      'enabled "true" en chaîne',
      JSON.stringify({ ...VALID, generation: { enabled: 'true' } }),
    ],
  ])(
    '%s : aucun appel (ni OpenRouter ni Groq) pour rédiger, relire ou relancer',
    async (_label, content) => {
      const { or, AiService } = services(content);
      const execute = jest.spyOn(or, 'executeAgentPrompt');
      const ai = new AiService(or, budget as never) as unknown as {
        groq: ReturnType<typeof groq>;
        generateTargetedHarmonyQuestions: (...a: unknown[]) => Promise<unknown>;
        reviewSondeurQuestions: (...a: unknown[]) => Promise<unknown>;
        journeyCompletion: (...a: unknown[]) => Promise<unknown>;
      };
      ai.groq = groq();
      const scope = { journeyId: 'j', paidOnly: true, sondeurWriting: true };
      expect(
        await ai.generateTargetedHarmonyQuestions(
          'analyse',
          [{ key: 'argent', label: 'Argent' }],
          [{ day: 1, label: 'L', intent: 'i' }],
          [],
          scope,
        ),
      ).toBeNull();
      expect(
        await ai.reviewSondeurQuestions('j', [{ day: 1, text: 'Q ?' }]),
      ).toBeNull();
      // Relance (question d'approfondissement) : fail-closed aussi.
      expect(
        await ai.journeyCompletion('j', 's', 'p', 100, 0.6, undefined, true),
      ).toBeNull();
      expect(execute).not.toHaveBeenCalled();
      expect(ai.groq.chat.completions.create).not.toHaveBeenCalled();
    },
  );

  it('aucun modèle autorisé (aucun qualifié disponible) : gabarits, jamais Groq', async () => {
    const { or, AiService } = services(
      JSON.stringify({ ...VALID, generation: { enabled: true } }),
    );
    jest.spyOn(or, 'candidates').mockResolvedValue([]);
    const execute = jest.spyOn(or, 'executeAgentPrompt');
    const ai = new AiService(or, budget as never) as unknown as {
      groq: ReturnType<typeof groq>;
      generateTargetedHarmonyQuestions: (...a: unknown[]) => Promise<unknown>;
    };
    ai.groq = groq();
    expect(
      await ai.generateTargetedHarmonyQuestions(
        'analyse',
        [{ key: 'argent', label: 'Argent' }],
        [{ day: 1, label: 'L', intent: 'i' }],
        [],
        { journeyId: 'j', paidOnly: true, sondeurWriting: true },
      ),
    ).toBeNull();
    expect(execute).not.toHaveBeenCalled();
    expect(ai.groq.chat.completions.create).not.toHaveBeenCalled();
  });

  it('fonctions IA hors Sondeur (lectures, bio, modération) : inchangées, même rédaction désactivée', async () => {
    const { or, AiService } = services(null);
    const ai = new AiService(or, budget as never) as unknown as {
      groq: ReturnType<typeof groq>;
      queryAiAgent: (agent: string, prompt: string) => Promise<string>;
      journeyCompletion: (...a: unknown[]) => Promise<unknown>;
    };
    ai.groq = groq();
    // Usage courant (bio, conseils…) : Groq répond.
    expect(await ai.queryAiAgent('cupidon', 'question')).toBe('ok');
    // Lecture du jour d'un parcours payé (non-rédaction) : Groq en secours.
    expect(await ai.journeyCompletion('j', 's', 'p', 100)).toMatchObject({
      content: 'ok',
    });
    expect(ai.groq.chat.completions.create).toHaveBeenCalledTimes(2);
  });
});
