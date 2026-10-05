import { QUESTIONS, V6_ADDED } from '../interview/questions.data';
import { buildDivergenceReport, RawAnswers } from './divergence.engine';
import { computeAnswerCompatibility } from '../portrait/module-affinity';
import { buildMatchView, compatibilityLabel } from './match-view';

/** Réponses complètes et cohérentes : option n° `shift` partout. */
function answersWith(shift: number): RawAnswers {
  const out: RawAnswers = {};
  // Questions d'origine (avant « fumez-vous ? » et la V6) : réponses inchangées ; non-fumeur.
  QUESTIONS.filter((q) => q.id !== 'M0_Q09' && !V6_ADDED.has(q.id)).forEach(
    (q, i) => {
      out[q.id] = q.options[(i + shift) % q.options.length].key;
    },
  );
  out.M0_Q09 = 'A';
  return out;
}

const BASE: RawAnswers = {
  ...answersWith(1),
  M0_Q06: 'A',
  M0_Q08: 'A', // tabac : rédhibitoire
  M1_Q05: 'B',
  M1_Q06: 'A', // même foi obligatoire
  M1_Q11: 'A',
  M6_Q10: 'A',
  M10_Q03: 'C',
  M10_Q09: 'C',
  // Pas de réponse identique à risque (risques partagés V6).
  M2_Q08: 'A',
  M6_Q01: 'B',
  M9_Q03: 'A',
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
    const three = { ...BASE, M0_Q06: 'D', M1_Q11: 'C', M6_Q10: 'C' };
    expect(pct(BASE, three)).toBeLessThan(pct(BASE, one));
  });

  it('ne laisse jamais une divergence majeure en « Très forte compatibilité »', () => {
    const abroad = { ...BASE, M7_Q07: 'C', M0_Q03: 'D' }; // ailleurs dans 5 ans + ne déménage pas
    const view = buildMatchView(
      { answers: { ...BASE, M7_Q07: 'A', M0_Q03: 'B' }, mentalMap: null },
      candidate(abroad),
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
    const a = {
      ...BASE,
      M8_Q01: 'A',
      M7_Q01: 'A',
      M7_Q07: 'A',
      M0_Q03: 'B',
      M4_Q01: 'A',
    };
    const b = {
      ...BASE,
      M8_Q01: 'C',
      M7_Q01: 'C',
      M7_Q07: 'C',
      M0_Q03: 'D',
      M4_Q01: 'D',
    };
    const view = buildMatchView({ answers: a, mentalMap: null }, candidate(b));
    expect(view.hardStop).toBe(false);
    expect(view.compatibility).toBeLessThan(55);
    expect(view.compatibilityLabel).toBe('Divergences importantes');
  });
});
