import { buildDivergenceReport } from '../matching/divergence.engine';
import { gateSondeurQuestion } from './sondeur-ai';
import { buildEvidence, memberAnswerTexts } from './sondeur-evidence';
import {
  CLOSED,
  FRAMES,
  composeFramedQuestions,
  frameIssues,
  framesForPrompt,
  leakedAnswer,
  matchFrame,
  renderFrame,
} from './sondeur-frames';
import { topicCorpus } from '../../scripts/sondeur-benchmark';

/** Couple avec un écart réel sur l'épargne (M4_Q14 A/C). */
const report = buildDivergenceReport({ M4_Q14: 'A' }, { M4_Q14: 'C' });
const evidenceIndex = buildEvidence(report);
const gapId = evidenceIndex.find(
  (e) => e.kind === 'divergence' && e.theme === 'argent',
)!.id;
const answers = memberAnswerTexts(report);

const gate = (text: string, textEn: string, themeKey = 'argent') =>
  gateSondeurQuestion(
    {
      day: 1,
      theme: 'Lignes rouges',
      themeKey,
      emoji: '💬',
      options: ['Autre...'],
      text,
      textEn,
      evidence: [gapId],
      claim: 'ecart',
    },
    { evidenceIndex, safetyThemes: [], strict: new Set(), answers },
  );

/** Couples synthétiques du banc d'essai : écarts sur plusieurs thèmes. */
const T =
  'enfants,argent,religion,lieu de vie,carrière,temps de couple,famille,intimité'.split(
    ',',
  );
const COUPLES = topicCorpus(T);
/** Question d'un cadre sur l'écart `ev` d'un couple du banc. */
function gateOn(caseId: string, ev: string, text: string, textEn: string) {
  const c = COUPLES.find((x) => x.id === caseId)!;
  const rep = buildDivergenceReport(c.a, c.b);
  const idx = buildEvidence(rep);
  return gateSondeurQuestion(
    {
      day: 1,
      theme: 'Lignes rouges',
      themeKey: idx.find((e) => e.id === ev)!.theme,
      emoji: '💬',
      options: ['Autre...'],
      text,
      textEn,
      evidence: [ev],
      claim: 'ecart',
    },
    {
      evidenceIndex: idx,
      safetyThemes: [],
      strict: new Set(),
      answers: memberAnswerTexts(rep),
    },
  );
}

/**
 * Un remplissage correct de chaque cadre, sur un écart de l'un de ses thèmes
 * (T50602 : déménager E1, alcool E2 ; T50603 : soutien emploi E1, tabac E2 ;
 * T50402 : épargne E1 ; T50643 : temps à soi E2).
 */
const FILLS: Record<
  string,
  [string, string, Record<string, string>, Record<string, string>]
> = {
  C01: [
    'T50602',
    'E2',
    { unite: 'verres', periode: 'semaine', objet: "de l'alcool à la maison" },
    { objet: 'alcohol at home' },
  ],
  C02: [
    'T50602',
    'E2',
    { objet: "la place de l'alcool" },
    { objet: 'the place of alcohol' },
  ],
  C03: [
    'T50602',
    'E1',
    { infinitif: 'vivre dans une autre ville à deux' },
    { infinitif: 'live in another city together' },
  ],
  C04: [
    'T50602',
    'E2',
    { objet: "l'alcool à la maison" },
    { objet: 'alcohol at home' },
  ],
  C05: [
    'T50603',
    'E1',
    { action: 'perdait son emploi', duree: 'mois' },
    { action: 'lost their job' },
  ],
  C07: [
    'T50602',
    'E1',
    { duree: 'mois', objet: 'la question du déménagement' },
    { objet: 'the question of moving' },
  ],
  C08: [
    'T50603',
    'E2',
    { objet: 'le tabac à la maison', unite: 'cigarettes', periode: 'jour' },
    { objet: 'smoking at home' },
  ],
  C10: ['T50602', 'E1', { objet: 'le déménagement' }, { objet: 'moving' }],
  C12: [
    'T50402',
    'E1',
    { montant: '2 000', objet: "l'épargne" },
    { objet: 'savings' },
  ],
  C13: [
    'T50603',
    'E1',
    { action: 'perdait son emploi' },
    { action: 'lost their job' },
  ],
  C14: ['T50602', 'E2', { objet: "l'alcool" }, { objet: 'alcohol' }],
  C15: [
    'T50602',
    'E1',
    { duree: 'années', objet: 'une relation à distance' },
    { objet: 'a long-distance relationship' },
  ],
  C16: [
    'T50602',
    'E1',
    { objet: 'le lieu de vie', duree: 'mois' },
    { objet: 'where to live' },
  ],
  C19: [
    'T50602',
    'E2',
    { unite: 'verres', periode: 'semaine', objet: "l'alcool en couple" },
    { objet: 'drinking as a couple' },
  ],
  C21: [
    'T50603',
    'E1',
    {
      duree: 'mois',
      objet: 'les dépenses courantes du foyer',
      action: 'perdait son emploi',
    },
    { objet: 'the household running costs', action: 'lost their job' },
  ],
  C22: ['T50643', 'E2', { objet: 'le temps à soi' }, { objet: 'time alone' }],
  C23: [
    'T50603',
    'E2',
    { objet: 'le tabac', duree: 'mois' },
    { objet: 'smoking' },
  ],
  C24: ['T50402', 'E1', { objet: 'les loisirs' }, { objet: 'leisure' }],
};
const fill = (id: string) => [FILLS[id][2], FILLS[id][3]] as const;

describe('Sondeur — cadres de questions validés (V8.3)', () => {
  it('15 à 25 cadres, identifiants uniques, mêmes cases en français et en anglais', () => {
    expect(FRAMES.length).toBeGreaterThanOrEqual(15);
    expect(FRAMES.length).toBeLessThanOrEqual(25);
    expect(new Set(FRAMES.map((f) => f.id)).size).toBe(FRAMES.length);
    const slots = (t: string) =>
      [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const f of FRAMES) expect(slots(f.en)).toEqual(slots(f.fr));
    // Aucun cadre ne prête une position à « votre partenaire » ni ne retourne
    // une hypothèse (« si l'autre…, qu'est-ce que vous ne pourriez pas… ») ;
    // « si votre partenaire {action} » n'admet qu'un événement (C21).
    for (const f of FRAMES) {
      expect(f.fr).not.toMatch(/si l'autre|partenaire (?!\{action\})/i);
      expect(f.en).not.toMatch(/if the other|your partner (?!\{action\})/i);
    }
    // Profondeur : aucun cadre vague.
    for (const f of FRAMES)
      expect(f.fr).not.toMatch(
        /comment le vivriez-vous|qu'auriez-vous besoin de savoir|quelle vie à deux imagineriez|aurait besoin de savoir/i,
      );
  });

  it.each(FRAMES.map((f) => [f.id]))(
    '%s : remplissage correct → composé, reconnu, admis par tout le contrôle',
    (id) => {
      const [caseId, ev, fr, en] = FILLS[id];
      const q = renderFrame(id, fr, en)!;
      expect(q).not.toBeNull();
      expect(matchFrame(q.text, 'fr')?.id).toBe(id);
      expect(matchFrame(q.textEn, 'en')?.id).toBe(id);
      expect(gateOn(caseId, ev, q.text, q.textEn)).toMatchObject({
        ok: true,
        reasons: [],
      });
    },
  );

  it('élision et apostrophes typographiques : même cadre', () => {
    const q = renderFrame('C15', ...fill('C15'))!;
    expect(q.text).toContain("d'années");
    expect(matchFrame(q.text.replace(/'/g, '’'), 'fr')?.id).toBe('C15');
  });

  it('hors cadre : question libre, même bien écrite, refusée (F1)', () => {
    const v = gate(
      "Sur 3 000 € gagnés à deux, combien mettriez-vous dans l'épargne ?",
      'Out of 3,000 earned together, how much would you save?',
    );
    expect(v.ok).toBe(false);
    expect(v.reasons.join(' ')).toMatch(/F1/);
  });

  it('version anglaise d’un autre cadre (F2) ou case fermée différente (F3)', () => {
    const a = renderFrame('C10', ...fill('C10'))!;
    const b = renderFrame('C14', ...fill('C14'))!;
    expect(gate(a.text, b.textEn).reasons.join(' ')).toMatch(/F2/);
    const c = renderFrame('C12', ...fill('C12'))!;
    expect(
      gate(c.text, c.textEn.replace('2,000', '3,000')).reasons.join(' '),
    ).toMatch(/F3/);
  });

  it.each([
    ['C10', { objet: "l'épargne de votre partenaire" }, { objet: 'savings' }],
    ['C13', { action: 'dépensait toujours tout' }, { action: 'spent it all' }],
    ['C02', { objet: "l'épargne" }, { objet: "your partner's savings" }],
    ['C02', { objet: "l'épargne" }, { objet: 'her savings' }],
    ['C04', { objet: "la peur de manquer d'argent" }, { objet: 'money' }],
  ])('case qui attribue ou présuppose : refusée (F5) — %s %j', (id, fr, en) => {
    const q = renderFrame(id, fr, en)!;
    expect(gate(q.text, q.textEn).reasons.join(' ')).toMatch(/F5/);
  });

  it.each([
    ['C04', { objet: 'les disputes violentes' }, { objet: 'violent rows' }],
    ['C24', { objet: 'votre salaire' }, { objet: 'money' }],
    ['C14', { objet: 'le tabac ou le jeu' }, { objet: 'smoking or gambling' }],
  ])(
    'case interdite (sécurité, intrusion, deux idées) — %s %j',
    (id, fr, en) => {
      const q = renderFrame(id, fr, en)!;
      expect(gate(q.text, q.textEn).ok).toBe(false);
    },
  );

  it('case sans lien avec l’écart cité : refusée (F8)', () => {
    const q = renderFrame(
      'C14',
      { objet: 'les vacances à la montagne' },
      { objet: 'mountain holidays' },
    )!;
    expect(gate(q.text, q.textEn).reasons.join(' ')).toMatch(/F8/);
  });

  it('cadre inconnu ou case manquante : aucune question composée', () => {
    expect(renderFrame('C99', { objet: 'x y' }, { objet: 'x y' })).toBeNull();
    expect(renderFrame('C12', { objet: "l'épargne" }, {})).toBeNull();
    expect(
      renderFrame(
        'C12',
        { montant: '1 500', objet: "l'épargne" },
        { objet: 'savings' },
      ),
    ).toBeNull();
    const out = composeFramedQuestions([
      { cadre: 'C10', cases: fill('C10')[0], cases_en: fill('C10')[1], day: 1 },
      { cadre: 'C99', cases: {}, day: 1 },
      { text: 'libre ?', day: 1 },
    ]) as Array<{ text: string; text_en?: string }>;
    expect(out).toHaveLength(2);
    expect(out[0].text).toBe(renderFrame('C10', ...fill('C10'))!.text);
    expect(out[0].text_en).toBe(renderFrame('C10', ...fill('C10'))!.textEn);
  });

  /** Les causes générales des défauts du dernier lot final : une règle chacune. */
  const fault = (
    caseId: string,
    ev: string,
    id: string,
    fr: Record<string, string>,
    en: Record<string, string>,
  ) => {
    const q = renderFrame(id, fr, en)!;
    return gateOn(caseId, ev, q.text, q.textEn).reasons.join(' ');
  };

  it.each([
    [
      'C03',
      { infinitif: "vous effacer dans l'éducation des enfants" },
      { infinitif: 'step back in raising the children' },
    ],
    [
      'C13',
      { action: 'abandonnait ses loisirs en solo' },
      { action: 'gave up their solo hobbies' },
    ],
    [
      'C03',
      { infinitif: 'renoncer à une soirée par semaine' },
      { infinitif: 'give up one evening a week' },
    ],
    [
      'C05',
      { action: 'sacrifiait ses week-ends', duree: 'mois' },
      { action: 'sacrificed their weekends' },
    ],
    [
      'C03',
      { infinitif: 'vous adapter au rythme de quelqu’un' },
      { infinitif: "adapt to someone's pace" },
    ],
  ])('CAUSE 1 effort à sens unique (F10) — %s %j', (id, fr, en) => {
    expect(fault('T50643', 'E2', id, fr, en)).toMatch(/F10/);
  });

  it('CAUSE 1 : le même effort, explicitement partagé, est admis', () => {
    const q = renderFrame(
      'C03',
      { infinitif: 'réduire les sorties à deux pour épargner' },
      { infinitif: 'cut down on outings together to save' },
    )!;
    expect(
      gateOn('T50402', 'E1', q.text, q.textEn).reasons.join(' '),
    ).not.toMatch(/F10/);
  });

  it.each([
    [
      'T50603',
      'E1',
      'C15',
      { duree: 'mois', objet: 'le chômage qui dure depuis un an' },
      { objet: 'unemployment that has lasted a year' },
    ],
    [
      'T50602',
      'E1',
      'C16',
      { objet: "l'offre d'emploi à l'étranger", duree: 'mois' },
      { objet: 'the job offer abroad' },
    ],
    [
      'T50602',
      'E2',
      'C14',
      { objet: "l'alcool habituel du week-end" },
      { objet: 'the usual weekend drinking' },
    ],
    [
      'T50402',
      'E1',
      'C24',
      { objet: 'le crédit actuel' },
      { objet: 'the current loan' },
    ],
  ])(
    'CAUSE 2 fait personnel inventé (F12) — %s %s %s',
    (caseId, ev, id, fr, en) => {
      expect(fault(caseId, ev, id, fr, en)).toMatch(/F12/);
    },
  );

  it.each([
    [
      'T50602',
      'E2',
      'C14',
      { objet: 'le lieu de culte de la famille' },
      { objet: "the family's place of worship" },
    ],
    [
      'T50602',
      'E2',
      'C14',
      { objet: "l'alcool chez Paul" },
      { objet: "alcohol at Paul's" },
    ],
    [
      'T50602',
      'E1',
      'C10',
      { objet: 'le quartier de résidence' },
      { objet: 'the neighbourhood you live in' },
    ],
    [
      'T50402',
      'E1',
      'C24',
      { objet: 'les soins médicaux' },
      { objet: 'medical care' },
    ],
  ])(
    'CAUSE 3 question intrusive (F14) — %s %s %s',
    (caseId, ev, id, fr, en) => {
      expect(fault(caseId, ev, id, fr, en)).toMatch(/F14/);
    },
  );

  it.each([
    [
      'T50643',
      'E2',
      'C22',
      { objet: 'les moments en solo' },
      { objet: 'shared evenings' },
    ],
    [
      'T50603',
      'E1',
      'C05',
      { action: 'perdait son emploi', duree: 'mois' },
      { action: 'changed jobs' },
    ],
    ['T50402', 'E1', 'C24', { objet: 'les loisirs' }, { objet: 'savings' }],
  ])(
    'CAUSE 4 divergence de sens FR/EN (F3) — %s %s %s',
    (caseId, ev, id, fr, en) => {
      expect(fault(caseId, ev, id, fr, en)).toMatch(/F3/);
    },
  );

  it('C21 « si votre partenaire… » : un événement seulement, jamais une position prêtée', () => {
    expect(
      fault(
        'T50603',
        'E1',
        'C21',
        {
          duree: 'mois',
          objet: 'les dépenses courantes du foyer',
          action: 'refusait toute aide',
        },
        { objet: 'the household running costs', action: 'refused any help' },
      ),
    ).toMatch(/F15/);
  });

  it('cadre hors des thèmes de l’écart (F13) ; consigne filtrée par thème', () => {
    expect(
      fault(
        'T50602',
        'E2',
        'C12',
        { montant: '2 000', objet: "l'alcool" },
        { objet: 'alcohol' },
      ),
    ).toMatch(/F13/);
    const list = framesForPrompt(['lieu']);
    expect(list).not.toMatch(/^C12 /m);
    expect(list).toMatch(/^C10 /m);
  });

  it('valeurs fermées : traduction fixe', () => {
    for (const [, en] of Object.values(CLOSED).flat()) expect(en).toBeTruthy();
  });
});

describe('Sondeur — fuite impossible par construction', () => {
  it('n-gramme de 3 mots d’une réponse, ou libellé d’option entier : fuite', () => {
    expect(
      leakedAnswer('Combien de soirs avec mes envies du moment ?', [
        'Je la dépense surtout pour mes envies du moment',
      ]),
    ).not.toBeNull();
    expect(
      leakedAnswer('Si cela arrivait chaque semaine ?', ['Chaque semaine']),
    ).not.toBeNull();
    // Mots isolés, mots-outils, texte du cadre : pas une fuite.
    expect(
      leakedAnswer("Quelle limite fixeriez-vous pour l'épargne ?", [
        "J'en mets presque tout de côté",
      ]),
    ).toBeNull();
    expect(
      leakedAnswer(
        'Si le tabac ne changeait jamais chez l’un de vous ?',
        ['Je ne changerais jamais rien'],
        "Si {objet} ne changeait jamais chez l'un de vous ?",
      ),
    ).toBeNull();
  });

  /**
   * Test exhaustif : pour chaque couple des corpus étiquetés et chaque réponse
   * d'entretien de l'un ou l'autre (français et anglais), chaque fenêtre de
   * trois mots glissée dans chaque case libre de chaque cadre est refusée.
   */
  it('corpus : toute reprise de réponse dans une case est refusée (F9)', () => {
    const T =
      'enfants,argent,religion,lieu de vie,carrière,temps de couple,famille,intimité'.split(
        ',',
      );
    const H = 'enfants,argent,lieu de vie,famille,intimité,religion'.split(',');
    const couples = [
      ...topicCorpus(T),
      ...topicCorpus(H, 70_000),
      ...topicCorpus(T, 90_000),
    ];
    let checked = 0;
    const missed: string[] = [];
    const word = /[\p{L}\p{N}'’]+/gu;
    for (const c of couples) {
      const rep = buildDivergenceReport(c.a, c.b);
      const idx = buildEvidence(rep);
      const ans = memberAnswerTexts(rep);
      const gaps = idx.filter((e) => e.kind === 'divergence' && !e.shared);
      if (!gaps.length) continue;
      for (const a of ans) {
        const ws = a.match(word) ?? [];
        for (let i = 0; i + 3 <= ws.length; i++) {
          const win = ws.slice(i, i + 3).join(' ');
          // Fenêtre porteuse de sens (un mot plein de cinq lettres ou plus) ;
          // « je ne suis » seul n'est pas une réponse.
          if (!/\p{L}{5,}/u.test(win)) continue;
          for (const f of FRAMES) {
            const free = [...f.fr.matchAll(/\{(objet|action|infinitif)\}/g)];
            if (!free.length) continue;
            const kind = free[0][1];
            const closed = {
              unite: 'fois',
              periode: 'mois',
              duree: 'mois',
              montant: '1 000',
            };
            const q = renderFrame(
              f.id,
              { ...closed, [kind]: `${win} de l'argent` },
              { [kind]: `${win} money` },
            );
            if (!q) continue;
            const r = frameIssues(q.text, q.textEn, {
              gaps,
              answers: ans,
              relatesToGap: () => true,
            });
            checked++;
            if (!r.some((x) => x.startsWith('F9')))
              missed.push(`${c.id} ${f.id} « ${win} »`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(missed).toEqual([]);
  });
});
