import { buildDivergenceReport } from '../matching/divergence.engine';
import { draftReviewedSondeur, sameGapSameAngle } from './sondeur-ai';
import { buildEvidence } from './sondeur-evidence';

/** Couple avec un écart réel sur l'épargne (M4_Q14 A/C). */
const report = buildDivergenceReport({ M4_Q14: 'A' }, { M4_Q14: 'C' });
const gapId = buildEvidence(report).find(
  (e) => e.kind === 'divergence' && e.theme === 'argent',
)!.id;

const draft = (day: number, text: string) => ({
  day,
  theme: 'Lignes rouges',
  themeKey: 'argent',
  emoji: '💬',
  text,
  options: ['Autre...'],
  evidence: [gapId],
  claim: 'ecart',
  textEn: 'Out of 3,000 earned together, how much would you put into savings?',
  optionsEn: ['Other...'],
  writer: 'z-ai/glm-5.3-flash',
});

describe('Sondeur — doublons dans un même parcours', () => {
  it('questions identiques ou quasi identiques : une seule gardée, les autres tracées', async () => {
    const same =
      "Sur 3 000 € gagnés à deux, combien mettriez-vous dans l'épargne ?";
    const close =
      "Sur 3 000 € gagnés à deux, combien mettriez-vous dans l'épargne commune ?";
    const other =
      "Si l'un de vous dépensait presque tout en loisirs chaque mois, pourriez-vous l'accepter ?";
    const ai = {
      generateTargetedHarmonyQuestions: jest.fn(() =>
        Promise.resolve({
          questions: [
            draft(1, same),
            draft(2, same),
            draft(3, close),
            draft(3, other),
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
