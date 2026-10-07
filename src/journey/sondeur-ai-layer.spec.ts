import { THEME_LIST } from '../matching/divergence.engine';
import { JourneyService, describeCoupleContext } from './journey.service';

type Draft = {
  day: number;
  theme: string;
  themeKey: string;
  emoji: string;
  text: string;
  options: string[];
  method?: string;
};

/** Mot inventé propre à un créneau : les questions ne se ressemblent pas. */
const word = (n: number) =>
  `zz${String.fromCharCode(97 + (n % 26))}${String.fromCharCode(97 + (Math.floor(n / 26) % 26))}q`;

/** Deux propositions par créneau : la première « A », la seconde « B ». */
function drafts(): Draft[] {
  const out: Draft[] = [];
  let slot = 0;
  for (const day of [1, 2, 3])
    for (const themeKey of THEME_LIST) {
      const words = [0, 1, 2].map((k) => word(slot * 3 + k)).join(' ');
      slot++;
      for (const variant of ['A', 'B'])
        out.push({
          day,
          theme: 'Lignes rouges',
          themeKey,
          emoji: '💬',
          text: `Que veut dire ${words} pour vous, proposition ${variant} ?`,
          options: ['Autre...'],
          method: 'besoin caché',
        });
    }
  return out;
}

function setup(
  options: {
    interview?: Record<string, string>;
    /** Questions refusées par le relecteur ; null : relecture impossible. */
    reject?: ((q: Draft) => boolean) | null;
    extra?: Draft[];
  } = {},
) {
  const created: Array<{ day: number; questionText: string }> = [];
  const prisma = {
    harmonyQuestion: {
      count: jest.fn(() => Promise.resolve(0)),
      create: jest.fn(
        ({ data }: { data: { day: number; questionText: string } }) => {
          created.push(data);
          return Promise.resolve(data);
        },
      ),
    },
    journey: {
      findUnique: jest.fn(() =>
        Promise.resolve({
          id: 'j1',
          userAId: 'a',
          userBId: 'b',
          userA: {
            id: 'a',
            firstName: 'Inès',
            birthDate: new Date('1996-03-01'),
            gender: 'F',
            city: 'Lyon',
          },
          userB: {
            id: 'b',
            firstName: 'Karim',
            birthDate: new Date('1992-11-20'),
            gender: 'H',
            city: null,
          },
        }),
      ),
      findMany: jest.fn(() => Promise.resolve([])),
    },
    interviewIA: {
      findFirst: jest.fn(({ where }: { where: { userId: string } }) =>
        Promise.resolve(
          options.interview
            ? {
                responses: [
                  {
                    rawResponses:
                      where.userId === 'a'
                        ? { M6_Q04: 'A' }
                        : { M6_Q04: options.interview.M6_Q04 },
                  },
                ],
              }
            : null,
        ),
      ),
    },
  };
  const all = [...drafts(), ...(options.extra ?? [])];
  const ai = {
    generateTargetedHarmonyQuestions: jest.fn(() =>
      Promise.resolve({
        questions: all.map((q) => ({
          ...q,
          writer: 'anthropic/claude-opus-5',
        })),
        model: 'anthropic/claude-opus-5',
      }),
    ),
    reviewSondeurQuestions: jest.fn((_j: string, questions: Draft[]) =>
      Promise.resolve(
        options.reject === null
          ? null
          : {
              rejected: new Set(
                questions
                  .map((q, i) => (options.reject?.(q) ? i : -1))
                  .filter((i) => i >= 0),
              ),
              // Le relecteur préfère la proposition « B ».
              preferred: new Set(
                questions
                  .map((q, i) => (q.text.includes('proposition B') ? i : -1))
                  .filter((i) => i >= 0),
              ),
              refusals: [],
              model: 'openai/gpt-5.5',
            },
      ),
    ),
  };
  const service = new JourneyService(
    prisma as never,
    ai as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const run = () =>
    (
      service as unknown as {
        generateHarmonyQuestions: (id: string) => Promise<void>;
      }
    ).generateHarmonyQuestions('j1');
  return { run, ai, created };
}

describe('Sondeur — couche IA des parcours payés', () => {
  const source = process.env.HARMONY_QUESTIONS_SOURCE;
  beforeAll(() => {
    process.env.HARMONY_QUESTIONS_SOURCE = 'ai';
  });
  afterAll(() => {
    process.env.HARMONY_QUESTIONS_SOURCE = source;
  });

  it('parcours payé seulement, contexte du couple sans coordonnées', async () => {
    const { run, ai } = setup();
    await run();
    const args = ai.generateTargetedHarmonyQuestions.mock
      .calls[0] as unknown as unknown[];
    expect(args[4]).toEqual({ journeyId: 'j1', paidOnly: true });
    expect(args[5]).toMatch(/- Inès : femme, \d+ ans, vit à Lyon/);
    expect(args[5]).toMatch(/- Karim : homme, \d+ ans$/);
  });

  it('la meilleure proposition relue passe devant les gabarits', async () => {
    const { run, created } = setup();
    await run();
    expect(created).toHaveLength(21);
    expect(created.every((q) => q.questionText.includes('proposition B'))).toBe(
      true,
    );
  });

  it('contrôle de forme par le code : une question fermée n’est jamais envoyée au relecteur', async () => {
    const closed: Draft = {
      ...drafts()[0],
      text: 'Accepteriez-vous de vivre loin de votre famille ?',
    };
    const { run, ai } = setup({ extra: [closed] });
    await run();
    const calls = ai.reviewSondeurQuestions.mock.calls as unknown as Array<
      [string, Draft[], string[], string]
    >;
    // Une relecture par jour, par un modèle d'une autre famille que le rédacteur.
    expect(calls).toHaveLength(3);
    expect(calls.map(([, qs]) => new Set(qs.map((q) => q.day)).size)).toEqual([
      1, 1, 1,
    ]);
    expect(
      calls.every(([, , , writer]) => writer === 'anthropic/claude-opus-5'),
    ).toBe(true);
    const sent = calls.flatMap(([, qs]) => qs);
    expect(sent).toHaveLength(42);
    expect(sent.some((q) => q.text.startsWith('Accepteriez'))).toBe(false);
  });

  it('relecture impossible : aucune question de l’IA servie', async () => {
    const { run, created } = setup({ reject: null });
    await run();
    expect(created).toHaveLength(21);
    expect(created.some((q) => q.questionText.includes('proposition'))).toBe(
      false,
    );
  });

  it('créneaux dont les deux propositions sont refusées : complétés par les gabarits', async () => {
    // Le relecteur refuse les deux propositions de 8 créneaux sur 21 : tout
    // le jour 1 et le premier thème du jour 2.
    const { run, created } = setup({
      reject: (q) =>
        q.day === 1 || (q.day === 2 && q.themeKey === THEME_LIST[0]),
    });
    await run();
    expect(created).toHaveLength(21);
    expect(
      created.filter((q) => q.questionText.includes('proposition')),
    ).toHaveLength(13);
  });

  it('thème de sécurité (violence) : jamais une question de l’IA, toujours une question de limite', async () => {
    const { run, ai } = setup({ interview: { M6_Q04: 'C' } });
    await run();
    const sent = (
      ai.reviewSondeurQuestions.mock.calls[0] as unknown as [string, Draft[]]
    )[1];
    expect(sent.some((q) => q.themeKey === 'communication')).toBe(false);
  });
});

describe('Contexte du couple transmis à l’IA', () => {
  it('âge révolu, genre et ville ; rien quand rien n’est connu', () => {
    const now = new Date('2026-10-06');
    expect(
      describeCoupleContext(
        [
          {
            firstName: 'Inès',
            birthDate: new Date('1996-10-07'),
            gender: 'F',
            city: ' Lyon ',
          },
          { firstName: 'Karim', birthDate: null, gender: 'AUTRE', city: null },
        ],
        now,
      ),
    ).toBe('- Inès : femme, 29 ans, vit à Lyon');
  });
});
