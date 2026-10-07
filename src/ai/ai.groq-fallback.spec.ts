import { AiService } from './ai.service';

/** Groq simulé : la liste des modèles et des réponses de chat programmées. */
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
            try {
              return Promise.resolve({
                choices: [{ message: { content: behaviour(model) } }],
              });
            } catch (error) {
              return Promise.reject(error as Error);
            }
          }),
        },
      },
    },
  };
}

const notFound = (model: string) =>
  Object.assign(
    new Error(
      `404 {"error":{"message":"The model \`${model}\` does not exist or you do not have access to it.","code":"model_not_found"}}`,
    ),
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

  type Internals = {
    groq: unknown;
    queryAiAgent: (agent: string, prompt: string) => Promise<string>;
  };

  /** Service réel dont le client Groq est remplacé par le double de test. */
  function serviceWith(groq: unknown): Internals {
    const service = new AiService() as unknown as Internals;
    service.groq = groq;
    return service;
  }

  it('choisit un modèle réellement ouvert au compte au lieu du nom figé', async () => {
    const g = fakeGroq(['whisper-large-v3', 'openai/gpt-oss-20b'], () => 'ok');
    const out = await serviceWith(g.client).queryAiAgent('sondeur', 'question');
    expect(out).toBe('ok');
    expect(g.calls).toEqual(['openai/gpt-oss-20b']);
  });

  it('change de modèle une fois si Groq répond « model_not_found »', async () => {
    const g = fakeGroq(
      ['llama-3.3-70b-versatile', 'openai/gpt-oss-20b'],
      (model) => {
        if (model === 'llama-3.3-70b-versatile') throw notFound(model);
        return 'réponse';
      },
    );
    const out = await serviceWith(g.client).queryAiAgent('sondeur', 'question');
    expect(out).toBe('réponse');
    expect(g.calls).toEqual(['llama-3.3-70b-versatile', 'openai/gpt-oss-20b']);
  });

  it('respecte GROQ_MODEL quand ce modèle existe', async () => {
    process.env.GROQ_MODEL = 'qwen/qwen3-32b';
    const g = fakeGroq(
      ['llama-3.3-70b-versatile', 'qwen/qwen3-32b'],
      () => 'ok',
    );
    await serviceWith(g.client).queryAiAgent('sondeur', 'question');
    expect(g.calls).toEqual(['qwen/qwen3-32b']);
  });

  it('remonte les autres erreurs sans boucler', async () => {
    const g = fakeGroq(['openai/gpt-oss-20b'], () => {
      throw new Error('timeout');
    });
    await expect(
      serviceWith(g.client).queryAiAgent('sondeur', 'question'),
    ).rejects.toThrow('timeout');
    expect(g.calls).toHaveLength(1);
  });

  it('limite la réflexion des modèles à raisonnement pour ne pas tronquer le JSON', async () => {
    const g = fakeGroq(['openai/gpt-oss-20b'], () => '[]');
    await serviceWith(g.client).queryAiAgent('sondeur', 'question');
    const create = (g.client.chat.completions.create as jest.Mock).mock
      .calls as Array<[Record<string, unknown>]>;
    expect(create[0][0]).toMatchObject({
      model: 'openai/gpt-oss-20b',
      reasoning_effort: 'low',
      include_reasoning: false,
      max_completion_tokens: 4096,
    });
    const llama = fakeGroq(['llama-3.3-70b-versatile'], () => '[]');
    await serviceWith(llama.client).queryAiAgent('sondeur', 'question');
    const plain = (llama.client.chat.completions.create as jest.Mock).mock
      .calls as Array<[Record<string, unknown>]>;
    expect(plain[0][0]).not.toHaveProperty('reasoning_effort');
  });

  describe('suivi des parcours payés', () => {
    type JourneyInternals = {
      groq: unknown;
      journeyCompletion: (
        journeyId: string,
        system: string,
        prompt: string,
        maxTokens: number,
      ) => Promise<{ content: string; model: string } | null>;
      generateTargetedHarmonyQuestions: (...args: unknown[]) => Promise<{
        questions: Array<{ text: string }>;
        model: string;
      } | null>;
      reviewSondeurQuestions: (
        journeyId: string,
        questions: Array<{
          day: number;
          themeKey?: string;
          text: string;
          options: string[];
        }>,
        alreadyAsked?: string[],
        writerModel?: string,
      ) => Promise<{ rejected: Set<number> } | null>;
    };
    function budgetFor(paid: boolean) {
      return {
        journeyEligible: jest.fn(() => Promise.resolve(paid)),
        allowJourney: jest.fn(() => Promise.resolve(true)),
        recordJourney: jest.fn(() => Promise.resolve()),
        allow: jest.fn(() => Promise.resolve(true)),
        record: jest.fn(() => Promise.resolve()),
      };
    }
    function journeyService(groq: unknown, budget: unknown): JourneyInternals {
      const service = new AiService(
        undefined,
        budget as never,
      ) as unknown as JourneyInternals;
      service.groq = groq;
      return service;
    }
    const models = [
      'llama-3.1-8b-instant',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
    ];

    beforeEach(() => delete process.env.GROQ_QUALITY_MODEL);

    it('parcours payé : modèle « qualité » et budget du parcours, hors plafond mensuel', async () => {
      const g = fakeGroq(models, () => '{"ok": true}');
      const budget = budgetFor(true);
      const out = await journeyService(g.client, budget).journeyCompletion(
        'j1',
        'sys',
        'lecture',
        1500,
      );
      expect(out).toEqual({
        content: '{"ok": true}',
        model: 'openai/gpt-oss-120b',
      });
      expect(g.calls).toEqual(['openai/gpt-oss-120b']);
      expect(budget.allowJourney).toHaveBeenCalledWith(
        'j1',
        expect.any(Number),
      );
      expect(budget.allow).not.toHaveBeenCalled();
      await new Promise((r) => setImmediate(r));
      // Groq ne donne pas de coût facturé : il est calculé sur ses tarifs.
      expect(budget.recordJourney).toHaveBeenCalledWith(
        'j1',
        'openai/gpt-oss-120b',
        expect.any(Number),
        expect.any(Number),
        undefined,
      );
      expect(budget.record).not.toHaveBeenCalled();
    });

    it('parcours sans paiement : aucune lecture par l’IA', async () => {
      const g = fakeGroq(models, () => 'ne doit pas servir');
      const out = await journeyService(
        g.client,
        budgetFor(false),
      ).journeyCompletion('j2', 'sys', 'lecture', 1500);
      expect(out).toBeNull();
      expect(g.calls).toEqual([]);
    });

    it('questions du Sondeur d’un parcours sans paiement : modèle économique et plafond du mois', async () => {
      const g = fakeGroq(models, () => '[]');
      const budget = budgetFor(false);
      await journeyService(g.client, budget).generateTargetedHarmonyQuestions(
        'rapport',
        [{ key: 'famille', label: 'Famille' }],
        [{ day: 1, label: 'Lignes rouges', intent: 'limites' }],
        [],
        { journeyId: 'j3' },
      );
      expect(g.calls).toEqual(['llama-3.1-8b-instant']);
      expect(budget.allow).toHaveBeenCalled();
      expect(budget.allowJourney).not.toHaveBeenCalled();
    });

    it('GROQ_QUALITY_MODEL choisit le modèle des parcours payés', async () => {
      process.env.GROQ_QUALITY_MODEL = 'openai/gpt-oss-20b';
      const g = fakeGroq(models, () => 'ok');
      await journeyService(g.client, budgetFor(true)).journeyCompletion(
        'j4',
        'sys',
        'lecture',
        1500,
      );
      expect(g.calls).toEqual(['openai/gpt-oss-20b']);
      delete process.env.GROQ_QUALITY_MODEL;
    });

    const draft = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        day: 1 + Math.floor(i / 7),
        theme: 'Lignes rouges',
        themeKey: 'famille',
        text: `Question clinique numéro ${i + 1} sur la famille, assez longue ?`,
        options: ['Oui', 'Non', 'Ça dépend', 'Autre...'],
      }));

    it('rédige avec le regard clinique et renvoie le modèle rédacteur', async () => {
      const g = fakeGroq(models, () =>
        JSON.stringify({
          analyse: ['Hypothèse : besoin de sécurité.'],
          questions: draft(4),
        }),
      );
      const out = await journeyService(
        g.client,
        budgetFor(true),
      ).generateTargetedHarmonyQuestions(
        'rapport',
        [{ key: 'famille', label: 'Famille' }],
        [{ day: 1, label: 'Lignes rouges', intent: 'limites' }],
        [],
        { journeyId: 'j5' },
      );
      expect(out?.model).toBe('openai/gpt-oss-120b');
      // Deux propositions par thème et par jour, au plus.
      expect(out?.questions).toHaveLength(2);
      const create = (g.client.chat.completions.create as jest.Mock).mock
        .calls as Array<[{ messages: Array<{ content: string }> }]>;
      const [system, user] = create[0][0].messages;
      expect(system.content).toContain('Gottman');
      expect(system.content).toContain('aucun diagnostic');
      expect(system.content).toContain('CHOIX DE LA TECHNIQUE SELON LE SIGNAL');
      expect(user.content).toContain('ÉTAPE 1');
      expect(user.content).toContain('DEUX propositions');
      expect(user.content).toContain('"methode"');
    });

    it('un appel par jour, en parallèle : un jour en échec n’empêche pas les autres', async () => {
      let n = 0;
      const g = fakeGroq(models, () => {
        n++;
        if (n === 2) throw new Error('HTTP 500');
        return JSON.stringify({
          questions: [1, 2].flatMap((day) =>
            ['famille', 'argent'].map((themeKey) => ({
              day,
              theme: 'Lignes rouges',
              themeKey,
              text: `Jour ${day}, ${themeKey} : qu'est-ce qui vous apaise vraiment ?`,
              methode: 'besoin caché',
              cible: 'ce qui apaise chacun',
            })),
          ),
        });
      });
      const out = await journeyService(
        g.client,
        budgetFor(true),
      ).generateTargetedHarmonyQuestions(
        'rapport',
        [
          { key: 'famille', label: 'Famille' },
          { key: 'argent', label: 'Argent' },
        ],
        [
          { day: 1, label: 'Lignes rouges', intent: 'limites' },
          { day: 2, label: 'Valeurs profondes', intent: 'origine' },
        ],
        [],
        { journeyId: 'j5b', paidOnly: true },
        '- Inès : femme, 29 ans, vit à Lyon',
      );
      expect(g.calls).toHaveLength(2);
      // Le jour 1 répond ; chaque appel ne garde que les questions de son jour.
      expect(out?.questions.map((q) => q.text)).toEqual([
        "Jour 1, famille : qu'est-ce qui vous apaise vraiment ?",
        "Jour 1, argent : qu'est-ce qui vous apaise vraiment ?",
      ]);
      expect(out?.questions[0]).toMatchObject({
        method: 'besoin caché',
        target: 'ce qui apaise chacun',
      });
      const create = (g.client.chat.completions.create as jest.Mock).mock
        .calls as Array<[{ messages: Array<{ content: string }> }]>;
      expect(create[0][0].messages[1].content).toContain(
        '- Inès : femme, 29 ans, vit à Lyon',
      );
    });

    it('relecture par une autre famille de modèle que le rédacteur, à température 0', async () => {
      const g = fakeGroq(
        models.concat('llama-3.3-70b-versatile'),
        () =>
          'Verdict : {"verdicts": [{"n": 1, "ok": true}, {"n": 2, "ok": false, "regle": 1, "raison": "orientée"}, {"n": 3, "ok": true}, {"n": 9, "ok": false}]}',
      );
      const budget = budgetFor(true);
      const review = await journeyService(
        g.client,
        budget,
      ).reviewSondeurQuestions(
        'j6',
        draft(3),
        ['Une question déjà posée ?'],
        'openai/gpt-oss-120b',
      );
      expect([...(review?.rejected ?? [])]).toEqual([1]);
      expect(g.calls).toEqual(['llama-3.3-70b-versatile']);
      const create = (g.client.chat.completions.create as jest.Mock).mock
        .calls as Array<
        [{ temperature: number; messages: Array<{ content: string }> }]
      >;
      // Le relecteur voit la méthode et la cible de chaque question.
      expect(create[0][0].messages[1].content).toContain(
        'Méthode : — · Cible : —',
      );
      expect(create[0][0].temperature).toBe(0);
      expect(create[0][0].messages[1].content).toContain(
        'Une question déjà posée ?',
      );
      expect(budget.allowJourney).toHaveBeenCalledWith(
        'j6',
        expect.any(Number),
      );
    });

    it('le relecteur départage deux propositions acceptées', async () => {
      const g = fakeGroq(
        models.concat('llama-3.3-70b-versatile'),
        () =>
          '{"verdicts": [{"n": 1, "ok": false, "regle": 8, "raison": "fermée"}, {"n": 2, "ok": true}, {"n": 3, "ok": true}], "meilleures": [1, 3, 7]}',
      );
      const review = await journeyService(
        g.client,
        budgetFor(true),
      ).reviewSondeurQuestions('j6b', draft(3), [], 'openai/gpt-oss-120b');
      // Une question refusée n'est jamais « meilleure » ; numéro hors liste ignoré.
      expect([...(review?.rejected ?? [])]).toEqual([0]);
      expect([
        ...((review as { preferred?: Set<number> })?.preferred ?? []),
      ]).toEqual([2]);
    });

    it('un refus l’emporte sur une acceptation du même numéro ; JSON entouré de texte lu', async () => {
      const g = fakeGroq(
        models.concat('llama-3.3-70b-versatile'),
        () =>
          'Mon avis {bref} : {"verdicts": [{"n": 1, "ok": false, "regle": 12, "raison": "réconciliation"}, {"n": 1, "ok": true}, {"n": 2, "ok": true},], "meilleures": [1, 2]} (fin)',
      );
      const review = await journeyService(
        g.client,
        budgetFor(true),
      ).reviewSondeurQuestions('j6c', draft(2), [], 'openai/gpt-oss-120b');
      expect([...(review?.rejected ?? [])]).toEqual([0]);
      expect([
        ...((review as { preferred?: Set<number> })?.preferred ?? []),
      ]).toEqual([1]);
    });

    it('si le rédacteur est Llama, le relecteur en change', async () => {
      const g = fakeGroq(
        models.concat('llama-3.3-70b-versatile'),
        () => '{"verdicts": [{"n": 1, "ok": true}]}',
      );
      await journeyService(g.client, budgetFor(true)).reviewSondeurQuestions(
        'j7',
        draft(1),
        [],
        'llama-3.3-70b-versatile',
      );
      expect(g.calls).toEqual(['openai/gpt-oss-120b']);
    });

    it('relecture impossible (parcours non payé, réponse illisible) : null', async () => {
      const unpaid = fakeGroq(models, () => '{"rejets": []}');
      expect(
        await journeyService(
          unpaid.client,
          budgetFor(false),
        ).reviewSondeurQuestions('j8', draft(2)),
      ).toBeNull();
      expect(unpaid.calls).toEqual([]);
      const garbled = fakeGroq(models, () => 'je ne sais pas');
      expect(
        await journeyService(
          garbled.client,
          budgetFor(true),
        ).reviewSondeurQuestions('j9', draft(2)),
      ).toBeNull();
    });

    it('relecteur qui ne juge pas toutes les questions : rien n’est servi par défaut', async () => {
      for (const answer of [
        '{"rejets": []}',
        '{"verdicts": [{"n": 1, "ok": true}]}',
      ]) {
        const g = fakeGroq(
          models.concat('llama-3.3-70b-versatile'),
          () => answer,
        );
        expect(
          await journeyService(
            g.client,
            budgetFor(true),
          ).reviewSondeurQuestions('j10', draft(3), [], 'openai/gpt-oss-120b'),
        ).toBeNull();
      }
    });
  });
});
