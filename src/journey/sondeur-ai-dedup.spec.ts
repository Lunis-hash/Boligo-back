import { buildDivergenceReport } from '../matching/divergence.engine';
import { draftReviewedSondeur } from './sondeur-ai';
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
      'Sur 3 000 € gagnés à deux, combien garderiez-vous pour les loisirs ?';
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
});
