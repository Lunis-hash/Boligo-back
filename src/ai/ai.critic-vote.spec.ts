import { AiService, SondeurReview, supportedRefusal } from './ai.service';
import { sameFamily } from './groq-model';
import {
  modelsFor,
  resetQualificationCache,
  setQualificationForTests,
} from './sondeur-router';

/**
 * OpenRouter de test, limité aux modèles qualifiés du relecteur (fail-closed :
 * la relecture de rédaction du Sondeur ne passe jamais par Groq). Le contenu
 * rendu dépend du modèle appelé.
 */
function fakeOpenRouter(
  critics: string[],
  behaviour: (model: string) => string,
) {
  const calls: string[] = [];
  const prompts: Array<{
    model: string;
    temperature?: number;
    messages: Array<{ role: string; content: string }>;
  }> = [];
  const candidates = (
    role: string,
    avoid?: string | readonly string[],
  ): Promise<string[]> =>
    Promise.resolve(
      role === 'critic' ? critics.filter((m) => !sameFamily(m, avoid)) : [],
    );
  const executeAgentPrompt = async (
    _agent: string,
    messages: Array<{ role: string; content: string }>,
    options: {
      role?: string;
      avoidModel?: string | readonly string[];
      temperature?: number;
    },
  ) => {
    const [model] = await candidates(
      options.role ?? 'default',
      options.avoidModel,
    );
    if (!model) throw new Error('aucun modèle');
    calls.push(model);
    prompts.push({ model, temperature: options.temperature, messages });
    return { content: behaviour(model), modelUsed: model, usage: {} };
  };
  const service = {
    candidates: jest.fn(candidates),
    priceOf: () => null,
    executeAgentPrompt: jest.fn(executeAgentPrompt),
  };
  return { calls, prompts, service };
}

type Review = (
  journeyId: string,
  questions: Array<{
    day: number;
    text: string;
    textEn?: string;
    themeKey?: string;
  }>,
  alreadyAsked: string[],
  writerModel?: string,
  context?: { secondOpinion?: boolean },
) => Promise<SondeurReview | null>;

function budgetFor(paid = true) {
  return {
    journeyEligible: jest.fn(() => Promise.resolve(paid)),
    allowJourney: jest.fn(() => Promise.resolve(true)),
    recordJourney: jest.fn(() => Promise.resolve()),
    allow: jest.fn(() => Promise.resolve(true)),
    record: jest.fn(() => Promise.resolve()),
  };
}

function service(
  or: unknown,
  budget = budgetFor(),
): { reviewSondeurQuestions: Review } {
  return new AiService(or as never, budget as never) as unknown as {
    reviewSondeurQuestions: Review;
  };
}

const questions = [
  {
    day: 1,
    text: 'Combien de soirs par semaine sans écran vous sembleraient idéals ?',
  },
  {
    day: 1,
    text: "L'un de vous refuse tout écran le soir : qu'en pensez-vous ?",
  },
  {
    day: 1,
    text: 'Si vos positions ne bougeaient jamais, comment le vivriez-vous ?',
  },
];
const CRITICS = [
  'qwen/qwen3-max',
  'meta-llama/llama-4-maverick',
  'openai/gpt-oss-120b',
];
const WRITER = 'openai/gpt-oss-120b';

describe('Relecture — refus étayé et second avis (modèles qualifiés)', () => {
  const env = { ...process.env };
  beforeAll(() => {
    process.env.OPENROUTER_API_KEY = 'test';
    // Rédaction du Sondeur activée explicitement (fail-closed sinon).
    setQualificationForTests({
      generatedAt: 't',
      run: 'r',
      writer: [WRITER],
      critic: CRITICS,
      escalation: [],
      fallback: [],
      escalateAboveRejectRate: 0.5,
      generation: { enabled: true },
    });
  });
  afterAll(() => {
    process.env = env;
    resetQualificationCache();
  });

  it('refus étayé : règle de fond et extrait cité mot pour mot', () => {
    const q = {
      text: questions[1].text,
      textEn: 'One of you refuses screens?',
    };
    expect(supportedRefusal(q, 7, "L'un de vous refuse tout écran")).toBe(true);
    expect(supportedRefusal(q, 7, 'One of you refuses')).toBe(true);
    expect(supportedRefusal(q, 7, '« L’un de vous refuse »')).toBe(true);
    expect(supportedRefusal(q, 7, 'votre partenaire refuse')).toBe(false);
    expect(supportedRefusal(q, 7, 'de')).toBe(false);
    expect(supportedRefusal(q, 7, undefined)).toBe(false);
    expect(supportedRefusal(q, 3, "L'un de vous refuse")).toBe(false);
    expect(supportedRefusal(q, 15, "L'un de vous refuse")).toBe(false);
    expect(supportedRefusal(q, null, "L'un de vous refuse")).toBe(false);
  });

  it('relecture par une autre famille que le rédacteur, à température 0, avec le contexte', async () => {
    const f = fakeOpenRouter(
      CRITICS,
      () =>
        'Verdict : {"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": false, "regle": 1, "raison": "orientée"}, {"n": 3, "ok": true}, {"n": 9, "ok": false}]}',
    );
    const budget = budgetFor(true);
    const review = await service(f.service, budget).reviewSondeurQuestions(
      'j6',
      questions,
      ['Une question déjà posée ?'],
      WRITER,
    );
    expect([...(review?.rejected ?? [])]).toEqual([1]);
    expect(f.calls).toEqual(['qwen/qwen3-max']);
    expect(f.prompts[0].temperature).toBe(0);
    const user = f.prompts[0].messages.find((m) => m.role === 'user')!.content;
    expect(user).toContain('Méthode : — · Cible : —');
    expect(user).toContain('Une question déjà posée ?');
    expect(budget.allowJourney).toHaveBeenCalledWith('j6', expect.any(Number));
  });

  it('le relecteur départage deux propositions acceptées ; jamais une refusée', async () => {
    const f = fakeOpenRouter(
      CRITICS,
      () =>
        '{"verdicts": [{"n": 1, "ok": false, "regle": 8, "raison": "fermée"}, {"n": 2, "ok": true}, {"n": 3, "ok": true}], "meilleures": [1, 3, 7]}',
    );
    const review = await service(f.service).reviewSondeurQuestions(
      'j6b',
      questions,
      [],
      WRITER,
    );
    expect([...(review?.rejected ?? [])]).toEqual([0]);
    expect([...(review?.preferred ?? [])]).toEqual([2]);
  });

  it('un refus l’emporte sur une acceptation du même numéro ; JSON entouré de texte lu', async () => {
    const f = fakeOpenRouter(
      CRITICS,
      () =>
        'Mon avis {bref} : {"verdicts": [{"n": 1, "ok": false, "regle": 12, "raison": "réconciliation"}, {"n": 1, "ok": true}, {"n": 2, "ok": true},], "meilleures": [1, 2]} (fin)',
    );
    const review = await service(f.service).reviewSondeurQuestions(
      'j6c',
      questions.slice(0, 2),
      [],
      WRITER,
    );
    expect([...(review?.rejected ?? [])]).toEqual([0]);
    expect([...(review?.preferred ?? [])]).toEqual([1]);
  });

  it('si le rédacteur est d’une autre famille, le relecteur en change', async () => {
    const f = fakeOpenRouter(
      CRITICS,
      () => '{"verdicts": [{"n": 1, "ok": true}]}',
    );
    await service(f.service).reviewSondeurQuestions(
      'j7',
      questions.slice(0, 1),
      [],
      'qwen/qwen3-max',
    );
    expect(f.calls).toEqual(['meta-llama/llama-4-maverick']);
  });

  it('le second avis, d’une troisième famille, tranche chaque refus du premier', async () => {
    const f = fakeOpenRouter(CRITICS, (model) =>
      model === 'qwen/qwen3-max'
        ? '{"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": false, "regle": 7, "extrait": "L\'un de vous refuse tout écran"}, {"n": 3, "ok": false, "regle": 3, "raison": "théorique"}]}'
        : '{"verdicts": [{"n": 1, "ok": false, "regle": 7, "extrait": "L\'un de vous refuse"}, {"n": 2, "ok": false, "regle": 17}]}',
    );
    const review = await service(f.service).reviewSondeurQuestions(
      'vote1',
      questions,
      [],
      WRITER,
      { secondOpinion: true },
    );
    expect(f.calls).toEqual(['qwen/qwen3-max', 'meta-llama/llama-4-maverick']);
    expect([...(review?.rejected ?? [])]).toEqual([1]);
    expect(review?.overturned).toEqual([2]);
    expect(review?.secondModel).toBe('meta-llama/llama-4-maverick');
    expect(review?.refusals.map((r) => r.n)).toEqual([1]);
    expect(review?.refusals[0].excerpt).toBe("L'un de vous refuse tout écran");
  });

  it('second avis indisponible (aucune troisième famille) : les refus du premier tiennent', async () => {
    const f = fakeOpenRouter(
      ['qwen/qwen3-max', 'openai/gpt-oss-120b'],
      () =>
        '{"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": false, "regle": 7, "extrait": "L\'un de vous"}, {"n": 3, "ok": false, "regle": 3}]}',
    );
    const review = await service(f.service).reviewSondeurQuestions(
      'vote2',
      questions,
      [],
      WRITER,
      { secondOpinion: true },
    );
    expect(f.calls).toEqual(['qwen/qwen3-max']);
    expect([...(review?.rejected ?? [])]).toEqual([1, 2]);
    expect(review?.overturned).toBeUndefined();
  });

  it('sans second avis demandé : un seul relecteur, comportement inchangé', async () => {
    const f = fakeOpenRouter(
      CRITICS,
      () =>
        '{"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": false, "regle": 7}, {"n": 3, "ok": false, "regle": 3}]}',
    );
    const review = await service(f.service).reviewSondeurQuestions(
      'vote3',
      questions,
      [],
      WRITER,
    );
    expect(f.calls).toEqual(['qwen/qwen3-max']);
    expect([...(review?.rejected ?? [])]).toEqual([1, 2]);
  });

  it('la consigne du relecteur exige un extrait et donne des exemples', async () => {
    const f = fakeOpenRouter(
      CRITICS,
      () =>
        '{"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": true}, {"n": 3, "ok": true}]}',
    );
    await service(f.service).reviewSondeurQuestions(
      'vote4',
      questions,
      [],
      WRITER,
    );
    const [system, user] = f.prompts[0].messages.map((m) => m.content);
    expect(system).toMatch(/FAUTE NETTE/);
    expect(user).toMatch(/À ACCEPTER/);
    expect(user).toMatch(/À REFUSER/);
    expect(user).toContain('"extrait"');
  });

  it('familles à écarter : un ou plusieurs modèles', () => {
    expect(sameFamily('openai/gpt-5.6-luna', 'openai/gpt-oss-120b')).toBe(true);
    expect(
      sameFamily('openai/gpt-5.6-luna', [
        'z-ai/glm-5.3-flash',
        'anthropic/claude-sonnet-5.5',
      ]),
    ).toBe(false);
    expect(
      sameFamily('z-ai/glm-5.3-flash', [
        'anthropic/claude-sonnet-5.5',
        'z-ai/glm-5.3-flash',
      ]),
    ).toBe(true);
    expect(sameFamily('z-ai/glm-5.3-flash', undefined)).toBe(false);
    const q = {
      generatedAt: 't',
      run: 'r',
      writer: ['anthropic/claude-sonnet-5.5'],
      critic: [
        'z-ai/glm-5.3-flash',
        'openai/gpt-5.6-luna',
        'anthropic/claude-sonnet-5.5',
      ],
      escalation: [],
      fallback: [],
      escalateAboveRejectRate: 0.5,
    };
    expect(
      modelsFor('critic', {
        q,
        avoid: ['anthropic/claude-sonnet-5.5', 'z-ai/glm-5.3-flash'],
      }).models,
    ).toEqual(['openai/gpt-5.6-luna']);
  });
});
