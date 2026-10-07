import { CURRENT_QUESTION_IDS } from '../interview/questions.data';
import { THEME_LIST } from '../matching/divergence.engine';
import { AiLabService } from './ai-lab.service';
import { LAB_SCENARIOS, scenarioInterviews } from './ai-lab.scenarios';

const word = (n: number) =>
  `zz${String.fromCharCode(97 + (n % 26))}${String.fromCharCode(97 + (Math.floor(n / 26) % 26))}q`;

/** IA simulée : deux propositions par créneau, relecture qui accepte tout. */
function fakeAi() {
  const ai = {
    generateTargetedHarmonyQuestions: jest.fn(() => {
      let n = 0;
      const questions = [1, 2, 3].flatMap((day) =>
        THEME_LIST.flatMap((themeKey) =>
          ['A', 'B'].map((v) => ({
            day,
            theme: 'x',
            emoji: '💬',
            themeKey,
            text: `Que veut dire ${word(n++)} ${word(n++)} pour vous, proposition ${v} ?`,
            options: ['Autre...'],
            method: 'même mot, autre sens',
            writer: 'anthropic/claude-opus-5',
          })),
        ),
      );
      return Promise.resolve({ questions, model: 'anthropic/claude-opus-5' });
    }),
    // Relecture de chaque réponse à l'envoi : danger seulement sur les
    // phrases voilées des couples prévus pour cela.
    moderateSondeurAnswer: jest.fn((text: string) =>
      Promise.resolve({
        allowed: true,
        danger:
          /retrouverai où que tu sois|garderai les papiers|ne plus être là|payer mon loyer/.test(
            text,
          )
            ? ['menace']
            : [],
      }),
    ),
    reviewSondeurQuestions: jest.fn(() =>
      Promise.resolve({
        rejected: new Set<number>(),
        preferred: new Set<number>(),
        refusals: [],
        model: 'openai/gpt-5.5',
      }),
    ),
    journeyCompletion: jest.fn((_j: string, _s: string, prompt: string) => {
      if (prompt.includes("questions d'approfondissement"))
        return Promise.resolve({
          content: JSON.stringify({
            questions: [
              {
                themeKey: 'famille',
                text: 'Dans votre famille, qui avait le dernier mot, et comment le saviez-vous ?',
              },
            ],
          }),
          model: 'anthropic/claude-opus-5',
        });
      // Lecture : un point ancré sur la première question (extraits exacts).
      const m = prompt.match(
        /1\. \[[^\]]*\] .*\n {3}[^:]+ : ‹ (.*) ›\n {3}[^:]+ : ‹ (.*) ›/,
      );
      const first = (t: string) => t.split(/\s+/).slice(0, 5).join(' ');
      return Promise.resolve({
        content: JSON.stringify({
          headline: 'Vous avez parlé de vos familles et de vos limites.',
          toDiscuss: m
            ? [
                {
                  n: 1,
                  a: first(m[1]),
                  b: first(m[2]),
                  text: 'La place des parents dans les décisions reste à préciser.',
                },
              ]
            : [],
          opener:
            'Dans votre famille, comment prenait-on les grandes décisions ?',
        }),
        model: 'anthropic/claude-opus-5',
      });
    }),
    journeyCritique: jest.fn(() => Promise.resolve('{"fidele": true}')),
  };
  return ai;
}

describe('Laboratoire IA', () => {
  const env = { ...process.env };
  afterAll(() => {
    process.env = env;
  });

  it('27 couples types, chacun avec ce qu’il vérifie', () => {
    const service = new AiLabService(fakeAi() as never);
    const list = service.scenarios();
    expect(list).toHaveLength(27);
    expect(list.every((s) => s.name && s.checks)).toBe(true);
  });

  it('les réponses imposées visent des questions posées aujourd’hui', () => {
    for (const s of LAB_SCENARIOS)
      for (const forced of s.interview ?? [])
        for (const id of Object.keys(forced))
          expect(CURRENT_QUESTION_IDS.has(id)).toBe(true);
    const religion = LAB_SCENARIOS.find((s) => s.id === 'religion-conversion');
    const [a, b] = scenarioInterviews(religion!);
    expect([a.M1_Q18, b.M1_Q16]).toEqual(['B', 'D']);
  });

  it('rejoue un couple de bout en bout : 21 questions, lecture publiée, question de suivi', async () => {
    const ai = fakeAi();
    const service = new AiLabService(ai as never);
    const out = await service.evaluate(
      'run',
      LAB_SCENARIOS.find((s) => s.id === 'religion-conversion')!,
    );
    expect(out.error).toBeUndefined();
    expect(out.questions).toHaveLength(21);
    expect(out.servedDefects).toEqual([]);
    expect(out.ai.drafted).toBe(42);
    expect(out.readingStatus).toBe('publiée');
    expect(out.followUp).toMatch(/dernier mot/);
    // Mêmes modèles qu'un parcours payé, mais budget propre au laboratoire.
    const [, , , , scope] = ai.generateTargetedHarmonyQuestions.mock
      .calls[0] as unknown as [
      unknown,
      unknown,
      unknown,
      unknown,
      { lab?: unknown; paidOnly?: boolean },
    ];
    expect(scope).toMatchObject({ paidOnly: true });
    expect(scope.lab).toBeDefined();
  });

  it('signal de danger : aucune lecture par l’IA', async () => {
    const ai = fakeAi();
    const service = new AiLabService(ai as never);
    const out = await service.evaluate(
      'run',
      LAB_SCENARIOS.find((s) => s.id === 'signal-danger')!,
    );
    expect(out.readingStatus).toMatch(/^bloquée/);
    expect(
      ai.journeyCompletion.mock.calls.some(([, , p]) =>
        p.includes('Écris la lecture'),
      ),
    ).toBe(false);
  });

  it.each([
    'menace-voilee',
    'controle-voile',
    'detresse-voilee',
    'argent-voile',
  ])(
    'danger invisible pour le code (%s) : repéré par la relecture de l’IA à l’envoi',
    async (id) => {
      const ai = fakeAi();
      const service = new AiLabService(ai as never);
      const out = await service.evaluate(
        'run',
        LAB_SCENARIOS.find((s) => s.id === id)!,
      );
      expect(out.danger.code).toEqual([]);
      expect(out.danger.classifier.length).toBeGreaterThan(0);
      expect(out.danger.verdict).toBe('ok');
      expect(out.readingStatus).toMatch(/^bloquée/);
    },
  );

  it.each([
    ['detresse', ['detresse']],
    ['controle-telephone', ['controle']],
    ['arnaque', ['argent']],
    ['victime-confidence', ['violence_subie']],
    ['limite-saine', []],
    ['reserve-faux-positif', []],
    ['mineur', ['mineur']],
    ['menace-auteur', ['violence_exercee']],
    ['creole-violence', ['violence_subie']],
    ['transfert-diaspora', []],
    ['insulte-citee', ['violence_subie']],
  ])(
    'sécurité jugée contre la référence du scénario : %s',
    async (id, categories) => {
      const service = new AiLabService(fakeAi() as never);
      const out = await service.evaluate(
        'run',
        LAB_SCENARIOS.find((s) => s.id === id)!,
      );
      expect(out.danger.code).toEqual(categories);
      expect(out.danger.verdict).toBe('ok');
    },
  );

  it('prénoms piégés : la consigne glissée n’atteint pas la lecture', async () => {
    const ai = fakeAi();
    const service = new AiLabService(ai as never);
    await service.evaluate(
      'run',
      LAB_SCENARIOS.find((s) => s.id === 'prenoms-pieges')!,
    );
    const prompts = ai.journeyCompletion.mock.calls.map(([, , p]) => p);
    expect(prompts.some((p) => p.includes('Écris la lecture'))).toBe(true);
    expect(prompts.every((p) => !/Awa\nRÈGLE/.test(p))).toBe(true);
    expect(prompts.some((p) => p.includes('Awa (1)'))).toBe(true);
    expect(prompts.every((p) => !p.includes('faits l’un pour l’autre'))).toBe(
      true,
    );
  });

  it('violence « ça dépend » des deux côtés : thème réservé aux questions de limite', async () => {
    const service = new AiLabService(fakeAi() as never);
    const out = await service.evaluate(
      'run',
      LAB_SCENARIOS.find((s) => s.id === 'violence-partagee')!,
    );
    expect(out.safetyThemes.length).toBeGreaterThan(0);
  });

  it('sans clé d’IA, rien n’est lancé ; une seule évaluation à la fois', async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GROQ_API_KEY;
    const service = new AiLabService(fakeAi() as never);
    expect(() => service.start(2)).toThrow(/OPENROUTER_API_KEY/);
    process.env.OPENROUTER_API_KEY = 'cle-de-test';
    const run = service.start(2);
    expect(() => service.start(1)).toThrow(/déjà en cours/);
    for (let i = 0; i < 50 && service.get(run.id).status === 'en_cours'; i++)
      await new Promise((r) => setTimeout(r, 20));
    const done = service.get(run.id);
    expect(done.status).toBe('termine');
    expect(done.results.map((r) => r.id)).toEqual([
      'religion-conversion',
      'meme-mot-confiance',
    ]);
    expect(done.summary?.servedDefects).toBe(0);
    expect(service.list()[0].results).toEqual([]);
  });
});
