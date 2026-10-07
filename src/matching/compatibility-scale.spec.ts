import { QUESTIONS } from '../interview/questions.data';
import { buildDivergenceReport, RawAnswers } from './divergence.engine';
import { computeAnswerCompatibility } from '../portrait/module-affinity';
import { buildMatchView, compatibilityLabel } from './match-view';

/**
 * Réponses V7 complètes et cohérentes : option n° `shift` partout, échelles
 * au point neutre, et aucune même réponse à risque (deux silences, deux
 * tolérances à la violence…) ni relation encore en cours.
 */
function answersWith(shift: number): RawAnswers {
  const out: RawAnswers = {};
  QUESTIONS.forEach((q, i) => {
    out[q.id] = q.scale ? 'C' : q.options[(i + shift) % q.options.length].key;
  });
  return {
    ...out,
    M0_Q04: 'A',
    M0_Q09: 'A',
    M0_Q12: 'A',
    M1_Q16: 'D',
    M1_Q19: 'A',
    M2_Q07: 'A',
    M2_Q22: 'A',
    M3_Q11: 'D',
    M3_Q12: 'A',
    M6_Q03: 'A',
    M6_Q04: 'A',
    M6_Q05: 'A',
    M6_Q11: 'A',
    M6_Q16: 'A',
    M6_Q17: 'A',
    M8_Q10: 'A',
    M8_Q14: 'A',
    M9_Q01: 'A',
    M9_Q03: 'A',
    M9_Q25: 'A',
    M10_Q02: 'C',
    M10_Q03: 'C',
    M10_Q09: 'C',
    M10_Q11: 'A',
    M10_Q12: 'A',
    M10_Q13: 'A',
    M10_Q14: 'A',
    M10_Q18: 'A',
  };
}

const BASE: RawAnswers = {
  ...answersWith(1),
  M0_Q06: 'A',
  M0_Q11: 'A', // tabac : « je ne pourrais pas vivre avec »
  M1_Q18: 'A', // même religion indispensable
  M1_Q11: 'A',
  M6_Q18: 'A',
  M8_Q12: 'A', // non négociable : les enfants
};

const pct = (a: RawAnswers, b: RawAnswers) => {
  const r = computeAnswerCompatibility(a, b, buildDivergenceReport(a, b));
  return Math.round((r.score ?? 0) * 100);
};

const candidate = (answers: RawAnswers) => ({
  id: 'c',
  firstName: 'Karim',
  gender: 'H',
  birthDate: null,
  city: 'Paris, France',
  profile: null,
  mentalMap: null,
  answers,
});

describe('Échelle de compatibilité', () => {
  it('garde 98 % et « Très forte compatibilité » pour deux réponses identiques', () => {
    expect(pct(BASE, BASE)).toBe(98);
    const view = buildMatchView(
      { answers: BASE, mentalMap: null },
      candidate(BASE),
    );
    expect(view.compatibilityLabel).toBe('Très forte compatibilité');
  });

  it('affiche une incompatibilité déclarée sous 55 %, avec son libellé', () => {
    const noKids = { ...BASE, M0_Q06: 'D' };
    expect(pct(BASE, noKids)).toBeLessThan(55);
    const view = buildMatchView(
      { answers: BASE, mentalMap: null },
      candidate(noKids),
    );
    expect(view.hardStop).toBe(true);
    expect(view.compatibilityLabel).toBe('Incompatibilité déclarée');
  });

  it('classe plus bas un profil qui cumule les incompatibilités déclarées', () => {
    const one = { ...BASE, M0_Q06: 'D' };
    const three = { ...BASE, M0_Q06: 'D', M1_Q11: 'C', M6_Q04: 'C' };
    expect(pct(BASE, three)).toBeLessThan(pct(BASE, one));
  });

  it('ne laisse jamais une divergence majeure en « Très forte compatibilité »', () => {
    // « Le plus possible ensemble » face à « quelques rendez-vous, chacun sa vie ».
    const apart = { ...BASE, M7_Q08: 'C' };
    const view = buildMatchView(
      { answers: { ...BASE, M7_Q08: 'A' }, mentalMap: null },
      candidate(apart),
    );
    expect(view.hardStop).toBe(false);
    expect(view.compatibility).toBeLessThan(80);
    expect(compatibilityLabel(view.compatibility)).not.toBe(
      'Très forte compatibilité',
    );
  });

  it('applique aussi le plafond quand le score retombe sur la carte mentale', () => {
    const a = { M0_Q06: 'A', M8_Q01: 'A' };
    const b = { M0_Q06: 'D', M8_Q01: 'A' };
    const view = buildMatchView({ answers: a, mentalMap: null }, candidate(b));
    expect(view.compatibility).toBeLessThan(55);
    expect(view.compatibilityLabel).toBe('Incompatibilité déclarée');
  });

  it('classe en « Divergences importantes » un profil qui cumule quatre divergences majeures', () => {
    // Quatre divergences majeures sur des sujets qui ne relèvent d'aucune
    // déclaration de non-négociable (objectif, temps à deux, engagement,
    // tendresse).
    const a = {
      ...BASE,
      M8_Q01: 'A',
      M7_Q08: 'A',
      M8_Q13: 'A',
      M9_Q07: 'A',
    };
    const b = {
      ...BASE,
      M8_Q01: 'C',
      M7_Q08: 'C',
      M8_Q13: 'D',
      M9_Q07: 'D',
    };
    const view = buildMatchView({ answers: a, mentalMap: null }, candidate(b));
    expect(view.hardStop).toBe(false);
    expect(view.compatibility).toBeLessThan(55);
    expect(view.compatibilityLabel).toBe('Divergences importantes');
  });
});
