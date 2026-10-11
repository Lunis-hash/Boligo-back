/**
 * Sondeur V8.2 : assemblage réel (moteur + générateur en service) sur des
 * couples tirés au hasard, V8.2 et V7.1. Chaque question servie doit avoir
 * une preuve valide ; les questions neutres B ne sont servies qu'à deux
 * entretiens V8.2 ; la V7.1 ne reçoit aucun contenu V8.2.
 */
import {
  RawAnswers,
  buildDivergenceReport,
} from '../matching/divergence.engine';
import { QUESTIONS, Question } from '../interview/questions.data';
import { V82_QUESTIONS } from '../interview/questions.v82';
import { assembleSondeur } from './sondeur.generator';
import { buildEvidence, servedTrace, validate } from './sondeur-evidence';
import { V82_NEUTRAL } from './sondeur.v82';

/** Générateur reproductible (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function interview(questions: Question[], r: () => number): RawAnswers {
  const out: RawAnswers = {};
  for (const q of questions) {
    if (!q.options.length) {
      const lo = 20 + Math.floor(r() * 20);
      out[q.id] = `${lo}-${lo + 10}`;
      continue;
    }
    const pool = q.options.filter((o) => !o.freeText);
    const pick = pool[Math.floor(r() * pool.length)];
    if (q.multiple && !pick.exclusive && r() < 0.4) {
      const other = pool.find((o) => o !== pick && !o.exclusive);
      out[q.id] = other
        ? q.options
            .filter((o) => o === pick || o === other)
            .map((o) => o.key)
            .join(',')
        : pick.key;
    } else out[q.id] = pick.key;
  }
  return out;
}

const NEUTRAL_TEXTS = new Set(V82_NEUTRAL.map((n) => n.tpl.text));

function run(questionsA: Question[], questionsB: Question[], n: number) {
  const r = rng(82);
  const stats = {
    couples: 0,
    not21: 0,
    evidenceFail: [] as string[],
    unfaithful: [] as string[],
    neutralB: 0,
    native: 0,
  };
  for (let i = 0; i < n; i++) {
    const report = buildDivergenceReport(
      interview(questionsA, r),
      interview(questionsB, r),
    );
    const qs = assembleSondeur({
      report,
      firstNames: ['Alex', 'Sam'],
      seed: `t-${i}`,
    });
    stats.couples++;
    if (qs.length !== 21) stats.not21++;
    const index = buildEvidence(report);
    for (const q of qs) {
      if (NEUTRAL_TEXTS.has(q.text)) stats.neutralB++;
      const subject = (q.subject ?? '').split(':')[0];
      if (subject.startsWith('V82_')) stats.native++;
      const trace = servedTrace(q, index);
      if (trace.claim === 'safety') continue;
      // Fidélité : le sujet cité existe dans le rapport avec la bonne nature.
      if (q.source === 'divergence' && subject)
        if (!report.divergences.some((d) => d.questionId === subject))
          stats.unfaithful.push(`${subject} | ${q.text}`);
      if (q.source === 'convergence' && subject)
        if (!report.convergences.some((c) => c.questionId === subject))
          stats.unfaithful.push(`${subject} | ${q.text}`);
      const v = validate(
        {
          day: q.day,
          themeKey: q.themeKey,
          text: q.text,
          evidence: trace.evidence.length ? trace.evidence : ['?'],
          claim: trace.claim === 'safety' ? 'neutral' : trace.claim,
        },
        index,
        { deterministic: true },
      );
      if (!v.ok) stats.evidenceFail.push(`${v.reasons.join(', ')} | ${q.text}`);
    }
  }
  return stats;
}

describe('Sondeur V8.2 — assemblage réel et preuves', () => {
  it('couples V8.2 : 21 questions, chacune avec une preuve valide et fidèle au rapport', () => {
    const s = run(V82_QUESTIONS, V82_QUESTIONS, 120);
    expect(s.not21).toBe(0);
    expect(s.unfaithful).toEqual([]);
    expect(s.evidenceFail).toEqual([]);
    // Les sujets natifs et les questions neutres B sont réellement servis.
    expect(s.native).toBeGreaterThan(0);
    expect(s.neutralB).toBeGreaterThan(0);
  });

  it('couples V7.1 : aucune question neutre B ni aucun sujet propre à la V8.2', () => {
    const s = run(QUESTIONS, QUESTIONS, 120);
    expect(s.not21).toBe(0);
    expect(s.neutralB).toBe(0);
    expect(s.native).toBe(0);
    expect(s.unfaithful).toEqual([]);
  });

  it('couple mixte (V7.1 et V8.2) : aucune question neutre B, assemblage complet', () => {
    const s = run(QUESTIONS, V82_QUESTIONS, 60);
    expect(s.not21).toBe(0);
    expect(s.neutralB).toBe(0);
  });

  it('la langue de l’entretien ne change rien : mêmes codes, même Sondeur', () => {
    // Les réponses sont des codes (« A », « B ») identiques en FR et en EN :
    // un entretien passé en anglais produit exactement le même Sondeur.
    const r1 = rng(7);
    const a = interview(V82_QUESTIONS, r1);
    const b = interview(V82_QUESTIONS, r1);
    const fr = assembleSondeur({
      report: buildDivergenceReport(a, b),
      firstNames: ['Alex', 'Sam'],
      seed: 'x',
    });
    const en = assembleSondeur({
      report: buildDivergenceReport({ ...a }, { ...b }),
      firstNames: ['Alex', 'Sam'],
      seed: 'x',
    });
    expect(en.map((q) => q.text)).toEqual(fr.map((q) => q.text));
  });

  it('sécurité : une réponse à risque (gifle) donne une question de limite, jamais une incompatibilité', () => {
    const r = rng(11);
    const a = { ...interview(V82_QUESTIONS, r), M6_Q24: 'A', M6_Q04: 'A' };
    const b = { ...interview(V82_QUESTIONS, r), M6_Q24: 'E', M6_Q04: 'C' };
    const report = buildDivergenceReport(a, b);
    expect(report.safetyAlerts!.length).toBeGreaterThan(0);
    const qs = assembleSondeur({
      report,
      firstNames: ['Alex', 'Sam'],
      seed: 's',
    });
    const index = buildEvidence(report);
    const safety = qs.filter((q) => servedTrace(q, index).claim === 'safety');
    expect(safety.length).toBeGreaterThan(0);
    for (const q of qs.filter((x) => x.themeKey === 'communication'))
      expect(q.text).not.toMatch(/compromis|terrain d['’]entente/i);
  });
});
