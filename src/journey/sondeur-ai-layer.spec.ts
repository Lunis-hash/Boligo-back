import { buildDivergenceReport } from '../matching/divergence.engine';
import { QUESTION_INDEX } from '../interview/questions.data';
import { isSensitiveQuestion } from '../interview/sensitive-questions';
import { describeReportForAi } from './sondeur.generator';
import { renderFrame } from './sondeur-frames';
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
  evidence?: string[];
  claim?: string;
};

/** Mot inventé propre à un créneau : les questions ne se ressemblent pas. */
const word = (n: number) =>
  `zz${String.fromCharCode(97 + (n % 26))}${String.fromCharCode(97 + (Math.floor(n / 26) % 26))}q`;

/** Proposition sur l'écart d'épargne, composée dans un cadre validé. */
function framed(day: number, variant: string) {
  const id = ({ 1: 'C12', 2: 'C14', 3: 'C09' } as Record<number, string>)[day];
  const tag = [0, 1].map((k) => word(200 + day * 10 + k)).join(' ');
  return renderFrame(
    id,
    { montant: '2 000', objet: `l'épargne ${tag} proposition ${variant}` },
    { objet: `savings ${tag} option ${variant}` },
  )!;
}

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
    /**
     * Écart réel sur l'épargne (M4_Q14 A/C) : seul cas où l'IA écrit. Les
     * autres thèmes n'ont que des propositions neutres, écartées par le code.
     */
    gap?: boolean;
  } = {},
) {
  const created: Array<{
    day: number;
    questionText: string;
    meta?: Record<string, unknown>;
  }> = [];
  const prisma = {
    $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    harmonyQuestion: {
      count: jest.fn(() => Promise.resolve(0)),
      create: jest.fn(
        ({
          data,
        }: {
          data: {
            day: number;
            questionText: string;
            meta?: Record<string, unknown>;
          };
        }) => {
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
          options.interview || options.gap
            ? {
                responses: [
                  {
                    rawResponses:
                      where.userId === 'a'
                        ? {
                            M6_Q04: 'A',
                            ...(options.gap ? { M4_Q14: 'A' } : {}),
                          }
                        : {
                            M6_Q04: options.interview?.M6_Q04 ?? 'A',
                            ...(options.gap ? { M4_Q14: 'C' } : {}),
                          },
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
    generateTargetedHarmonyQuestions: jest.fn((...args: unknown[]) => {
      // Preuve de l'écart d'épargne dans l'index transmis (« E3 · argent · écart … »).
      const gapId = /^(E\d+) · argent · écart/m.exec(String(args[6]))?.[1];
      return Promise.resolve({
        // V8.2 : chaque proposition cite sa preuve (neutre, du thème), sauf
        // sur l'écart réel où elle confronte l'écart à la réalité.
        // Sondeur bilingue : chaque proposition porte sa version anglaise.
        questions: [
          ...all.map((q) => ({
            evidence: [`N-${q.themeKey}`],
            claim: 'neutre',
            textEn: `What does ${q.text.replace(/^Que veut dire | pour vous.*$/g, '')} mean to you?`,
            optionsEn: ['Other...'],
            ...q,
            writer: 'anthropic/claude-opus-5',
          })),
          ...(gapId
            ? [1, 2, 3].flatMap((day) =>
                ['A', 'B'].map((variant) => ({
                  day,
                  theme: 'Lignes rouges',
                  themeKey: 'argent',
                  emoji: '💬',
                  // V8.3 : question composée dans un cadre validé (un cadre
                  // par jour) ; mots propres au jour : pas de doublon.
                  ...framed(day, variant),
                  options: ['Autre...'],
                  method: 'chiffre',
                  evidence: [gapId],
                  claim: 'ecart',
                  optionsEn: ['Other...'],
                  writer: 'anthropic/claude-opus-5',
                })),
              )
            : []),
        ],
        model: 'anthropic/claude-opus-5',
      });
    }),
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
    // Minimisation : tranche d'âge, jamais la ville ni l'âge exact.
    expect(args[5]).toMatch(/- Inès : femme, \d+-\d+ ans/);
    expect(args[5]).toMatch(/- Karim : homme, \d+-\d+ ans/);
    expect(args[5]).not.toMatch(/Lyon/);
  });

  it('sans écart réel : aucune proposition de l’IA servie, gabarits seuls', async () => {
    const { run, created } = setup();
    await run();
    // Sondeur adaptatif : couple sans écart → 3 questions par jour.
    expect(created).toHaveLength(9);
    expect(created.some((q) => q.questionText.includes('proposition'))).toBe(
      false,
    );
  });

  it('écart réel : la meilleure proposition relue passe devant les gabarits', async () => {
    const { run, created } = setup({ gap: true });
    await run();
    const fromAi = created.filter((q) =>
      q.questionText.includes('proposition'),
    );
    expect(fromAi.length).toBeGreaterThan(0);
    // Seules les questions sur l'écart d'épargne, et la proposition préférée.
    expect(fromAi.every((q) => q.questionText.includes('proposition B'))).toBe(
      true,
    );
    expect(fromAi.every((q) => q.questionText.includes('épargne'))).toBe(true);
  });

  it('contrôle de forme par le code : une question fermée n’est jamais envoyée au relecteur', async () => {
    const closed: Draft = {
      ...drafts()[0],
      text: 'Accepteriez-vous de vivre loin de votre famille ?',
    };
    const { run, ai } = setup({ extra: [closed], gap: true });
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
    // Seules les deux propositions sur l'écart réel, chaque jour, sont relues.
    const sent = calls.flatMap(([, qs]) => qs);
    expect(sent).toHaveLength(6);
    expect(sent.every((q) => q.themeKey === 'argent')).toBe(true);
    expect(sent.some((q) => q.text.startsWith('Accepteriez'))).toBe(false);
  });

  it('relecture impossible : aucune question de l’IA servie', async () => {
    const { run, created } = setup({ reject: null, gap: true });
    await run();
    // Sondeur adaptatif : couple sans écart → 3 questions par jour.
    expect(created).toHaveLength(9);
    expect(created.some((q) => q.questionText.includes('proposition'))).toBe(
      false,
    );
  });

  it('créneaux dont les deux propositions sont refusées : complétés par les gabarits', async () => {
    // Le relecteur refuse les deux propositions de 8 créneaux sur 21 : tout
    // le jour 1 et le premier thème du jour 2.
    const { run, created } = setup({
      reject: (q) => q.day === 1,
      gap: true,
    });
    await run();
    // Jour 1 refusé en entier : gabarits ; jours 2 et 3 : questions relues.
    const fromAi = created.filter((q) =>
      q.questionText.includes('proposition'),
    );
    expect(fromAi.some((q) => q.day === 1)).toBe(false);
    expect(fromAi.length).toBeGreaterThan(0);
  });

  it('thème de sécurité (violence) : jamais une question de l’IA, toujours une question de limite', async () => {
    const { run, ai } = setup({ interview: { M6_Q04: 'C' }, gap: true });
    await run();
    const sent = (
      ai.reviewSondeurQuestions.mock.calls[0] as unknown as [string, Draft[]]
    )[1];
    expect(sent.some((q) => q.themeKey === 'communication')).toBe(false);
  });
});

describe('Sondeur — contrat de preuves (V8.2)', () => {
  const source = process.env.HARMONY_QUESTIONS_SOURCE;
  beforeAll(() => {
    process.env.HARMONY_QUESTIONS_SOURCE = 'ai';
  });
  afterAll(() => {
    process.env.HARMONY_QUESTIONS_SOURCE = source;
  });

  it('une proposition sans preuve, ou qui affirme un écart non établi, n’est jamais relue ni servie', async () => {
    const noEvidence: Draft = {
      ...drafts()[0],
      text: 'Que signifie zzsans pour vous, au quotidien ?',
      evidence: [],
    };
    const invented: Draft = {
      ...drafts()[2],
      text: 'Comment dépasser votre désaccord sur zzinvente au quotidien ?',
      evidence: [`N-${drafts()[2].themeKey}`],
      claim: 'ecart',
    };
    const fear: Draft = {
      ...drafts()[4],
      text: 'Qu’est-ce qui nourrit votre peur de zzpeur ?',
    };
    const { run, ai, created } = setup({ extra: [noEvidence, invented, fear] });
    await run();
    const sent = (
      ai.reviewSondeurQuestions.mock.calls as unknown as Array<
        [string, Draft[]]
      >
    ).flatMap(([, qs]) => qs);
    for (const t of ['zzsans', 'zzinvente', 'zzpeur']) {
      expect(sent.some((q) => q.text.includes(t))).toBe(false);
      expect(created.some((q) => q.questionText.includes(t))).toBe(false);
    }
  });

  it('l’IA reçoit l’index des preuves, jamais une réponse de membre', async () => {
    const { run, ai } = setup({ interview: { M6_Q04: 'C' } });
    await run();
    const args = ai.generateTargetedHarmonyQuestions.mock
      .calls[0] as unknown as unknown[];
    const index = String(args[6]);
    expect(index).toMatch(/^N-famille · famille · neutre$/m);
    // Les écarts de sécurité ne figurent pas dans l'index transmis.
    expect(index).not.toMatch(/communication · écart/);
    // Aucun texte d'option du Grand Entretien (M6_Q04 C/A) dans l'index.
    expect(index).not.toMatch(/dépend|limite absolue/i);
  });

  it('chaque question servie garde sa trace de preuves (identifiants et sujets, jamais une réponse)', async () => {
    const { run, created } = setup({ gap: true });
    await run();
    for (const q of created) {
      const ev = (q.meta as { evidence?: Record<string, unknown> } | undefined)
        ?.evidence;
      expect(ev).toBeDefined();
      expect(Array.isArray(ev!.evidence)).toBe(true);
      expect(['neutral', 'divergence', 'convergence', 'safety']).toContain(
        ev!.claim,
      );
      expect(JSON.stringify(ev)).not.toMatch(/privateTexts/);
    }
    const ai = created.filter((q) => q.questionText.includes('proposition'));
    expect(ai.length).toBeGreaterThan(0);
    for (const q of ai)
      expect(
        (q.meta as { evidence: { evidence: string[] } }).evidence.evidence[0],
      ).toMatch(/^E\d+$/);
  });
});

describe('Contexte du couple transmis à l’IA', () => {
  it('tranche d’âge et genre, jamais la ville ; rien quand rien n’est connu', () => {
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
    ).toBe('- Inès : femme, 25-29 ans');
  });

  it('lieux de vie : distance relative, jamais le nom d’une ville', () => {
    const m = (city: string | null) => ({
      firstName: 'X',
      birthDate: null,
      gender: 'F',
      city,
    });
    expect(
      describeCoupleContext([
        m('Paris, Île-de-France, France'),
        m('Paris, Île-de-France, France'),
      ]),
    ).toMatch(/Lieux de vie : même ville$/);
    expect(
      describeCoupleContext([m('Lyon, France'), m('Paris, France')]),
    ).toMatch(/même pays, villes différentes$/);
    expect(
      describeCoupleContext([m('Dakar, Sénégal'), m('Paris, France')]),
    ).toMatch(/pays différents$/);
    expect(
      describeCoupleContext([m('Dakar, Sénégal'), m('Paris, France')]),
    ).not.toMatch(/Dakar|Paris|Sénégal|France/);
  });
});

describe('Analyse du couple transmise à l’IA : minimisation', () => {
  it('jamais le texte d’une réponse sensible (religion, vie intime), même en accord', () => {
    const ids = ['M10_Q17', 'M1_Q16', 'M1_Q17'].filter((id) =>
      QUESTION_INDEX.get(id),
    );
    expect(ids.every((id) => isSensitiveQuestion(id))).toBe(true);
    for (const [ka, kb] of [
      ['A', 'C'],
      ['A', 'A'],
    ]) {
      const summary = describeReportForAi(
        buildDivergenceReport(
          Object.fromEntries(ids.map((id) => [id, ka])),
          Object.fromEntries(ids.map((id) => [id, kb])),
        ),
        ['Inès', 'Karim'],
      );
      for (const id of ids)
        for (const o of QUESTION_INDEX.get(id)!.options)
          expect(summary).not.toContain(`« ${o.text}`);
    }
  });
});
