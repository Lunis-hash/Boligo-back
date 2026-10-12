import { buildEvidence, relatesToGap, validate } from './sondeur-evidence';
import { buildDivergenceReport } from '../matching/divergence.engine';

/** Couple avec un seul écart réel : l'épargne (M4_Q14 A/C), le reste identique. */
const index = buildEvidence(
  buildDivergenceReport(
    { M4_Q14: 'A', M0_Q06: 'A' },
    { M4_Q14: 'C', M0_Q06: 'A' },
  ),
);
const gapId = index.find(
  (e) => e.kind === 'divergence' && e.theme === 'argent',
)!.id;
const agreeId = index.find((e) => e.kind === 'convergence')?.id;

const ask = (
  text: string,
  over: Partial<Parameters<typeof validate>[0]> = {},
) =>
  validate(
    {
      day: 1,
      themeKey: 'argent',
      text,
      evidence: [gapId],
      claim: 'divergence',
      ...over,
    },
    index,
    { gapOnly: true },
  );

describe('Sondeur — l’IA n’écrit que sur un écart réel', () => {
  it('question qui confronte l’écart à la réalité : acceptée', () => {
    const v = ask(
      "Sur 1 000 € qui vous restent en fin de mois, combien mettriez-vous dans l'épargne commune ?",
    );
    expect(v.reasons).toEqual([]);
  });

  it('P16 : question sur un accord ou un sujet neutre, refusée', () => {
    if (agreeId)
      expect(
        ask('Comment imaginez-vous partager les dépenses du quotidien ?', {
          themeKey: index.find((e) => e.id === agreeId)!.theme,
          evidence: [agreeId],
          claim: 'convergence',
        }).reasons.join(' '),
      ).toMatch(/P16/);
    expect(
      ask('Comment imaginez-vous partager les dépenses du quotidien ?', {
        evidence: ['N-argent'],
        claim: 'neutral',
      }).reasons.join(' '),
    ).toMatch(/P16/);
  });

  it.each([
    'Dans votre famille, comment parlait-on de l’argent mis de côté ?',
    'Dans la maison où vous avez grandi, comment gérait-on l’épargne ?',
    'Comment un proche qui vous connaît bien décrirait votre rapport à l’épargne ?',
    'Chez vous, qui décidait des dépenses importantes ?',
    'Une dépense bien choisie : à quoi la reconnaît-on pour vous ?',
  ])(
    'P15 : détour par l’enfance, la famille d’origine ou un proche — %s',
    (t) => {
      expect(ask(t).reasons.join(' ')).toMatch(/P15/);
    },
  );

  it('P17 : question sans lien avec l’écart cité, refusée', () => {
    expect(
      ask('Quelle ville aimeriez-vous habiter dans dix ans ?').reasons.join(
        ' ',
      ),
    ).toMatch(/P17/);
    expect(relatesToGap('Combien mettriez-vous de côté ?', [])).toBe(false);
  });

  it('hors rédacteur du Sondeur (gabarits, suivi) : règles inchangées', () => {
    const v = validate(
      {
        day: 1,
        themeKey: 'argent',
        text: 'Comment imaginez-vous partager les dépenses du quotidien ?',
        evidence: ['N-argent'],
        claim: 'neutral',
      },
      index,
    );
    expect(v.reasons.join(' ')).not.toMatch(/P1[567]/);
  });
});
