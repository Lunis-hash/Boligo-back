import { AiService, SondeurReview, supportedRefusal } from './ai.service';
import { sameFamily } from './groq-model';
import { modelsFor } from './sondeur-router';

/** Client Groq de test : la réponse dépend du modèle appelé. */
function fakeGroq(models: string[], behaviour: (model: string) => string) {
  const calls: string[] = [];
  return {
    calls,
    client: {
      models: {
        list: jest.fn(() =>
          Promise.resolve({ data: models.map((id) => ({ id })) }),
        ),
      },
      chat: {
        completions: {
          create: jest.fn(({ model }: { model: string }) => {
            calls.push(model);
            return Promise.resolve({
              choices: [{ message: { content: behaviour(model) } }],
            });
          }),
        },
      },
    },
  };
}

type Review = (
  journeyId: string,
  questions: Array<{ day: number; text: string; textEn?: string }>,
  alreadyAsked: string[],
  writerModel?: string,
  context?: { secondOpinion?: boolean },
) => Promise<SondeurReview | null>;

function service(groq: unknown): { reviewSondeurQuestions: Review } {
  const budget = {
    journeyEligible: jest.fn(() => Promise.resolve(true)),
    allowJourney: jest.fn(() => Promise.resolve(true)),
    recordJourney: jest.fn(() => Promise.resolve()),
    allow: jest.fn(() => Promise.resolve(true)),
    record: jest.fn(() => Promise.resolve()),
  };
  const s = new AiService(undefined, budget as never) as unknown as {
    groq: unknown;
    reviewSondeurQuestions: Review;
  };
  s.groq = groq;
  return s;
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

describe('Relecture — refus étayé et second avis', () => {
  const env = { ...process.env };
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_AUTH;
    process.env.GROQ_CRITIC_MODEL = 'qwen/qwen3-32b';
  });
  afterAll(() => {
    process.env = env;
  });

  it('refus étayé : règle de fond et extrait cité mot pour mot', () => {
    const q = {
      text: questions[1].text,
      textEn: 'One of you refuses screens?',
    };
    expect(supportedRefusal(q, 7, "L'un de vous refuse tout écran")).toBe(true);
    expect(supportedRefusal(q, 7, 'One of you refuses')).toBe(true);
    // Apostrophe typographique et guillemets tolérés.
    expect(supportedRefusal(q, 7, '« L’un de vous refuse »')).toBe(true);
    // Extrait absent de la question, trop court, ou règle de style.
    expect(supportedRefusal(q, 7, 'votre partenaire refuse')).toBe(false);
    expect(supportedRefusal(q, 7, 'de')).toBe(false);
    expect(supportedRefusal(q, 7, undefined)).toBe(false);
    expect(supportedRefusal(q, 3, "L'un de vous refuse")).toBe(false);
    expect(supportedRefusal(q, 15, "L'un de vous refuse")).toBe(false);
    expect(supportedRefusal(q, null, "L'un de vous refuse")).toBe(false);
  });

  it('le second avis, d’une troisième famille, tranche chaque refus du premier', async () => {
    const g = fakeGroq(
      ['qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b'],
      (model) =>
        model === 'qwen/qwen3-32b'
          ? // Premier relecteur : refuse 2 (fuite) et 3 (style).
            '{"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": false, "regle": 7, "extrait": "L\'un de vous refuse tout écran"}, {"n": 3, "ok": false, "regle": 3, "raison": "théorique"}]}'
          : // Second avis (questions 2 et 3 seulement) : confirme la fuite
            // avec un extrait, refuse la 3 sans extrait.
            '{"verdicts": [{"n": 1, "ok": false, "regle": 7, "extrait": "L\'un de vous refuse"}, {"n": 2, "ok": false, "regle": 17}]}',
    );
    const review = await service(g.client).reviewSondeurQuestions(
      'vote1',
      questions,
      [],
      'openai/gpt-oss-120b',
      { secondOpinion: true },
    );
    // Rédacteur gpt-oss, premier relecteur Qwen, second avis Llama.
    expect(g.calls).toEqual(['qwen/qwen3-32b', 'llama-3.3-70b-versatile']);
    expect([...(review?.rejected ?? [])]).toEqual([1]);
    expect(review?.overturned).toEqual([2]);
    expect(review?.secondModel).toBe('llama-3.3-70b-versatile');
    expect(review?.refusals.map((r) => r.n)).toEqual([1]);
    expect(review?.refusals[0].excerpt).toBe("L'un de vous refuse tout écran");
  });

  it('second avis indisponible (aucune troisième famille) : les refus du premier tiennent', async () => {
    const g = fakeGroq(
      ['qwen/qwen3-32b', 'openai/gpt-oss-120b'],
      () =>
        '{"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": false, "regle": 7, "extrait": "L\'un de vous"}, {"n": 3, "ok": false, "regle": 3}]}',
    );
    const review = await service(g.client).reviewSondeurQuestions(
      'vote2',
      questions,
      [],
      'openai/gpt-oss-120b',
      { secondOpinion: true },
    );
    expect(g.calls).toEqual(['qwen/qwen3-32b']);
    expect([...(review?.rejected ?? [])]).toEqual([1, 2]);
    expect(review?.overturned).toBeUndefined();
  });

  it('sans second avis demandé : un seul relecteur, comportement inchangé', async () => {
    const g = fakeGroq(
      ['qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b'],
      () =>
        '{"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": false, "regle": 7}, {"n": 3, "ok": false, "regle": 3}]}',
    );
    const review = await service(g.client).reviewSondeurQuestions(
      'vote3',
      questions,
      [],
      'openai/gpt-oss-120b',
    );
    expect(g.calls).toEqual(['qwen/qwen3-32b']);
    expect([...(review?.rejected ?? [])]).toEqual([1, 2]);
  });

  it('la consigne du relecteur exige un extrait et donne des exemples', async () => {
    const g = fakeGroq(
      ['qwen/qwen3-32b', 'openai/gpt-oss-120b'],
      () =>
        '{"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": true}, {"n": 3, "ok": true}]}',
    );
    await service(g.client).reviewSondeurQuestions(
      'vote4',
      questions,
      [],
      'openai/gpt-oss-120b',
    );
    const create = (g.client.chat.completions.create as jest.Mock).mock
      .calls as Array<[{ messages: Array<{ content: string }> }]>;
    const [system, user] = create[0][0].messages.map((m) => m.content);
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
