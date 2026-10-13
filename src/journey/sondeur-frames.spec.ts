import { buildDivergenceReport } from '../matching/divergence.engine';
import { gateSondeurQuestion } from './sondeur-ai';
import { buildEvidence, memberAnswerTexts } from './sondeur-evidence';
import {
  CLOSED,
  FRAMES,
  composeFramedQuestions,
  frameIssues,
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

/** Un remplissage correct de chaque cadre, sur l'écart d'épargne. */
const FILLS: Record<string, [Record<string, string>, Record<string, string>]> =
  {
    C01: [
      { unite: 'fois', periode: 'mois', objet: 'des dépenses imprévues' },
      { objet: 'unplanned spending' },
    ],
    C02: [{ objet: "la façon d'épargner" }, { objet: 'the way of saving' }],
    C03: [
      { infinitif: 'épargner pour un projet commun' },
      { infinitif: 'save for a shared project' },
    ],
    C04: [
      { objet: "la gestion de l'épargne" },
      { objet: 'the way savings are managed' },
    ],
    C05: [
      { action: 'ne mettait rien de côté', duree: 'mois' },
      { action: 'saved nothing' },
    ],
    C06: [
      { action: 'dépensait presque tout en loisirs' },
      { action: 'spent nearly everything on leisure' },
    ],
    C07: [
      { duree: 'mois', objet: "la question de l'épargne" },
      { objet: 'the question of savings' },
    ],
    C08: [
      { objet: 'les achats plaisir', unite: 'fois', periode: 'mois' },
      { objet: 'treat purchases' },
    ],
    C09: [{ objet: "la gestion de l'argent" }, { objet: 'managing money' }],
    C10: [{ objet: "l'épargne" }, { objet: 'savings' }],
    C11: [{ objet: 'les dépenses de loisirs' }, { objet: 'leisure spending' }],
    C12: [{ montant: '2 000', objet: "l'épargne" }, { objet: 'savings' }],
    C13: [{ action: 'ne mettait rien de côté' }, { action: 'saved nothing' }],
    C14: [{ objet: 'les dépenses imprévues' }, { objet: 'unplanned spending' }],
    C15: [
      { duree: 'années', objet: 'un budget très serré' },
      { objet: 'a very tight budget' },
    ],
    C16: [
      { objet: "la gestion de l'argent", duree: 'mois' },
      { objet: 'how money is managed' },
    ],
    C17: [{ objet: "l'argent" }, { objet: 'money' }],
    C18: [{ objet: 'le budget commun' }, { objet: 'the shared budget' }],
    C19: [
      { unite: 'sorties', periode: 'mois', objet: 'un budget de loisirs' },
      { objet: 'a leisure budget' },
    ],
    C20: [
      { objet: "le rapport à l'épargne" },
      { objet: 'the approach to saving' },
    ],
  };

describe('Sondeur — cadres de questions validés (V8.3)', () => {
  it('15 à 25 cadres, identifiants uniques, mêmes cases en français et en anglais', () => {
    expect(FRAMES.length).toBeGreaterThanOrEqual(15);
    expect(FRAMES.length).toBeLessThanOrEqual(25);
    expect(new Set(FRAMES.map((f) => f.id)).size).toBe(FRAMES.length);
    const slots = (t: string) =>
      [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const f of FRAMES) expect(slots(f.en)).toEqual(slots(f.fr));
    // Aucun cadre ne prête une position à « votre partenaire » ni ne retourne
    // une hypothèse (« si l'autre…, qu'est-ce que vous ne pourriez pas… »).
    for (const f of FRAMES) {
      expect(f.fr).not.toMatch(/partenaire|si l'autre/i);
      expect(f.en).not.toMatch(/your partner|if the other/i);
    }
  });

  it.each(FRAMES.map((f) => [f.id]))(
    '%s : remplissage correct → composé, reconnu, admis par tout le contrôle',
    (id) => {
      const [fr, en] = FILLS[id];
      const q = renderFrame(id, fr, en)!;
      expect(q).not.toBeNull();
      expect(matchFrame(q.text, 'fr')?.id).toBe(id);
      expect(matchFrame(q.textEn, 'en')?.id).toBe(id);
      expect(gate(q.text, q.textEn)).toMatchObject({ ok: true, reasons: [] });
    },
  );

  it('élision et apostrophes typographiques : même cadre', () => {
    const q = renderFrame('C15', ...FILLS.C15)!;
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
    const a = renderFrame('C10', ...FILLS.C10)!;
    const b = renderFrame('C17', ...FILLS.C17)!;
    expect(gate(a.text, b.textEn).reasons.join(' ')).toMatch(/F2/);
    const c = renderFrame('C12', ...FILLS.C12)!;
    expect(
      gate(c.text, c.textEn.replace('2,000', '3,000')).reasons.join(' '),
    ).toMatch(/F3/);
  });

  it.each([
    ['C10', { objet: "l'épargne de votre partenaire" }, { objet: 'savings' }],
    ['C06', { action: 'dépensait toujours tout' }, { action: 'spent it all' }],
    ['C02', { objet: "l'épargne" }, { objet: "your partner's savings" }],
    ['C02', { objet: "l'épargne" }, { objet: 'her savings' }],
    ['C04', { objet: "la peur de manquer d'argent" }, { objet: 'money' }],
  ])('case qui attribue ou présuppose : refusée (F5) — %s %j', (id, fr, en) => {
    const q = renderFrame(id, fr, en)!;
    expect(gate(q.text, q.textEn).reasons.join(' ')).toMatch(/F5/);
  });

  it.each([
    ['C04', { objet: 'les disputes violentes' }, { objet: 'violent rows' }],
    ['C09', { objet: 'votre salaire' }, { objet: 'money' }],
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
      'C11',
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
      { cadre: 'C10', cases: FILLS.C10[0], cases_en: FILLS.C10[1], day: 1 },
      { cadre: 'C99', cases: {}, day: 1 },
      { text: 'libre ?', day: 1 },
    ]) as Array<{ text: string; text_en?: string }>;
    expect(out).toHaveLength(2);
    expect(out[0].text).toBe(renderFrame('C10', ...FILLS.C10)!.text);
    expect(out[0].text_en).toBe(renderFrame('C10', ...FILLS.C10)!.textEn);
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
