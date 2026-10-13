import {
  buildEvidence,
  relatesToGap,
  validate,
  validateEn,
} from './sondeur-evidence';
import { gapQuestionIssuesEn } from './clinical-lens';
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
      "Sur 3 000 € gagnés à deux, combien mettriez-vous dans l'épargne ?",
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

  it.each([
    [
      "Si votre partenaire ne voulait jamais d'épargne, ou en voulait absolument, que feriez-vous ?",
      'P19',
    ],
    [
      'Pour l’épargne, où en êtes-vous : tout de côté, un peu, ou rien du tout ?',
      'P19',
    ],
    [
      "Si votre partenaire refusait toute épargne commune, pourriez-vous l'accepter ?",
      'P20',
    ],
    [
      "Si votre partenaire gardait toute son épargne pour lui, qu'est-ce que vous ne pourriez pas accepter ?",
      'P21',
    ],
    [
      "Si l'un de vous élevait la voix pour une dépense, pourriez-vous l'accepter ?",
      'P22',
    ],
    [
      'Chez vous, combien d’épargne par mois vous semblerait suffisante ?',
      'P23',
    ],
    ['Dans votre famille, combien mettait-on de côté chaque mois ?', 'P23'],
    [
      'Si l’un de vous perdait son emploi, jusqu’où et combien de temps puiseriez-vous dans l’épargne ?',
      'P24',
    ],
    ['Combien et comment mettriez-vous de côté chaque mois ?', 'P24'],
  ])('règles du rédacteur : %s → %s', (t, code) => {
    expect(ask(t).reasons.join(' ')).toContain(code);
  });

  it.each([
    ['Combien de soirs par mois pourriez-vous vous retenir de miser ?', 'P26'],
    ['Qu’est-ce qui vous aiderait à arrêter de boire pour le couple ?', 'P26'],
    [
      'De combien pourriez-vous réduire vos dépenses plaisir chaque mois ?',
      'P26',
    ],
    ['Qu’est-ce qui vous attire tant dans les paris sportifs ?', 'P27'],
    [
      'Si l’autre jouait chaque soir, que ne pourriez-vous pas accepter ?',
      'P21',
    ],
    ['Si l’autre dépensait tout son mois, où serait votre limite ?', 'P21'],
  ])('règles ajoutées : %s → %s', (t, code) => {
    expect(ask(t).reasons.join(' ')).toContain(code);
  });

  it.each([
    'Si l’un de vous voulait garder un compte à part, comment le vivriez-vous ?',
    'Combien de soirées par mois consacreriez-vous aux sorties sans l’autre ?',
    'Qu’est-ce que vous ne pourriez pas accepter au sujet des dépenses à deux ?',
  ])('formes admises, non visées par P21, P26 ou P27 : %s', (t) => {
    expect(ask(t).reasons.join(' ')).not.toMatch(/P2[1267]/);
  });

  it.each([
    ['If your partner refused any joint savings, could you stay?', 'EN-P20'],
    [
      'Your partner has ruled out saving for good; could you live with that?',
      'EN-P20',
    ],
    [
      'If the other spent their whole salary, where would you draw the line?',
      'EN-P21',
    ],
    [
      'Since one of you isn’t sure about saving, what would you need to know?',
      'EN-P25',
    ],
    ['How much would you save, and what would you do with it?', 'EN-P24'],
    ['Growing up, how did your parents handle savings?', 'EN-P15'],
    ['Wouldn’t you agree that your budgets can’t work together?', 'conclusion'],
    ['Could you meet halfway on how much to save?', 'compromis'],
    ['Do you see your spending as an addiction?', 'jargon'],
    ['Before going further, could you tell us whether you save?', 'redemande'],
    ['What would help you stop spending on impulse?', 'EN-P26'],
  ])('version anglaise : %s → %s', (t, code) => {
    expect(gapQuestionIssuesEn(t).join(' ')).toContain(code);
  });

  it.each([
    'If one of you wanted a separate account, how would you feel about it?',
    'How many months of shared savings would make you feel at ease?',
    'If your positions on saving never changed, could you still commit?',
    'How long could you keep up that pace if nothing changed?',
  ])('version anglaise admise : %s', (t) => {
    expect(gapQuestionIssuesEn(t)).toEqual([]);
  });

  it('écart d’argent : achat, emploi et revenu y sont liés ; « keep up » n’est pas une habitude', () => {
    const gap = index.filter((e) => e.id === gapId);
    expect(
      relatesToGap('À partir de quel achat imprévu en parleriez-vous ?', gap),
    ).toBe(true);
    expect(
      relatesToGap(
        'Si l’un de vous perdait son emploi, combien de temps tiendriez-vous ?',
        gap,
      ),
    ).toBe(true);
    const contract = {
      day: 1,
      themeKey: 'argent' as const,
      text: "Sur 3 000 € gagnés à deux, combien mettriez-vous dans l'épargne ?",
      evidence: [gapId],
      claim: 'divergence' as const,
    };
    expect(
      validateEn(
        'How long could you keep up that pace of saving?',
        contract,
        index,
      ).reasons,
    ).not.toContain('EN5 habitude présupposée');
    expect(
      validateEn('Do you keep spending on impulse?', contract, index).reasons,
    ).toContain('EN5 habitude présupposée');
  });

  it('P18 : risque partagé (mêmes réponses), pas un écart', () => {
    const shared = index.map((e) =>
      e.id === gapId ? { ...e, shared: true } : e,
    );
    const v = validate(
      {
        day: 1,
        themeKey: 'argent',
        text: "Sur 3 000 € gagnés à deux, combien mettriez-vous dans l'épargne ?",
        evidence: [gapId],
        claim: 'divergence',
      },
      shared,
      { gapOnly: true },
    );
    expect(v.reasons.join(' ')).toMatch(/P18/);
  });

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
