import { buildDivergenceReport } from '../matching/divergence.engine';
import { draftReviewedSondeur, sameGapSameAngle } from './sondeur-ai';
import { buildEvidence } from './sondeur-evidence';
import { renderFrame } from './sondeur-frames';

/** Couple avec un écart réel sur l'épargne (M4_Q14 A/C). */
const report = buildDivergenceReport({ M4_Q14: 'A' }, { M4_Q14: 'C' });
const gapId = buildEvidence(report).find(
  (e) => e.kind === 'divergence' && e.theme === 'argent',
)!.id;

/** Question composée dans un cadre validé (V8.3). */
const framed = (
  id: string,
  cases: Record<string, string>,
  casesEn: Record<string, string>,
) => renderFrame(id, cases, casesEn)!;

const draft = (day: number, q: { text: string; textEn: string }) => ({
  day,
  theme: 'Lignes rouges',
  themeKey: 'argent',
  emoji: '💬',
  text: q.text,
  options: ['Autre...'],
  evidence: [gapId],
  claim: 'ecart',
  textEn: q.textEn,
  optionsEn: ['Other...'],
  writer: 'z-ai/glm-5.3-flash',
});

describe('Sondeur — doublons dans un même parcours', () => {
  it('questions identiques ou quasi identiques : une seule gardée, les autres tracées', async () => {
    const sameQ = framed(
      'C12',
      { montant: '3 000', objet: "l'épargne" },
      { objet: 'savings' },
    );
    const closeQ = framed(
      'C12',
      { montant: '3 000', objet: "l'épargne commune" },
      { objet: 'shared savings' },
    );
    const otherQ = framed(
      'C13',
      { action: 'dépensait presque tout en loisirs' },
      { action: 'spent nearly everything on leisure' },
    );
    const [same, close, other] = [sameQ, closeQ, otherQ].map((q) => q.text);
    const ai = {
      generateTargetedHarmonyQuestions: jest.fn(() =>
        Promise.resolve({
          questions: [
            draft(1, sameQ),
            draft(2, sameQ),
            draft(3, closeQ),
            draft(3, otherQ),
          ],
          model: 'z-ai/glm-5.3-flash',
        }),
      ),
      reviewSondeurQuestions: jest.fn((_j: string, qs: unknown[]) =>
        Promise.resolve({
          rejected: new Set<number>(),
          preferred: new Set<number>(),
          refusals: [],
          model: 'anthropic/claude-sonnet-5.5',
          size: qs.length,
        }),
      ),
    };
    const r = await draftReviewedSondeur(ai as never, {
      report,
      firstNames: ['Membre A', 'Membre B'],
      history: [],
      couple: '',
      scope: { journeyId: 'j1' },
    });
    expect(r.questions.map((q) => q.text)).toEqual([same, other]);
    expect(r.trace.duplicates.map((q) => q.text)).toEqual([same, close]);
  });

  it('même couple, même écart, même tournure : quasi-doublon (seuil plus strict)', () => {
    const q = (text: string, evidence = ['E1']) => ({ text, evidence });
    expect(
      sameGapSameAngle(
        q(
          'Sur sept jours, combien de jours avec des enfants à la maison pourriez-vous vivre ?',
        ),
        q(
          "Jusqu'à combien de jours par semaine des enfants à la maison resteraient-ils vivables ?",
        ),
      ),
    ).toBe(true);
    // Autre tournure sur le même écart : gardée.
    expect(
      sameGapSameAngle(
        q('Combien de soirées seul(e) par semaine vous semblent nécessaires ?'),
        q(
          "Si l'un de vous gardait chaque semaine un moment à soi, pourriez-vous vivre ainsi ?",
        ),
      ),
    ).toBe(false);
    // Autre écart : gardée.
    expect(
      sameGapSameAngle(
        q('Combien de soirées seul(e) par semaine vous semblent nécessaires ?'),
        q('Combien de verres par semaine vous sembleraient trop ?', ['E2']),
      ),
    ).toBe(false);
  });
});
