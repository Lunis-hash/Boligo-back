/**
 * Contrat de preuves du Sondeur : recette du validateur sur les corpus
 * (questions à rejeter / à accepter) et contrôle strict des gabarits V8.2.
 *
 * Les seuils sont ceux MESURÉS (corpus 3, jamais vu pendant le réglage :
 * 55/60 rejets, 28/30 acceptations). Ils protègent contre une régression ;
 * ils ne prétendent pas que le validateur arrête toutes les hallucinations.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildDivergenceReport } from '../matching/divergence.engine';
import {
  EvidencedQuestion,
  aiOnlyIssues,
  buildEvidence,
  describeEvidenceForAi,
  servedTrace,
  validate,
} from './sondeur-evidence';
import { ACCEPT, INDEX, REJECT } from './sondeur-evidence.corpus';
import { V82_AGREEMENTS, V82_NEUTRAL, V82_TOPIC_DEEP } from './sondeur.v82';
import { NATIVE_RULES } from '../matching/v82-native.rules';

const CORPORA = join(
  __dirname,
  '../../docs/questionnaire/V8_2_FINAL/sondeur_v82',
);
const load = (f: string) =>
  JSON.parse(readFileSync(join(CORPORA, f), 'utf8')) as {
    reject: EvidencedQuestion[];
    accept: EvidencedQuestion[];
  };

const rejected = (qs: EvidencedQuestion[]) =>
  qs.filter((q) => !validate(q, INDEX).ok).length;
const accepted = (qs: EvidencedQuestion[]) =>
  qs.filter((q) => validate(q, INDEX).ok).length;

describe('Contrat de preuves — validateur (corpus de recette)', () => {
  it('corpus initial : 34/34 questions fautives rejetées, 17/17 légitimes acceptées', () => {
    expect(rejected(REJECT)).toBe(REJECT.length);
    expect(accepted(ACCEPT)).toBe(ACCEPT.length);
  });

  it('corpus indépendant 3 (jamais vu au réglage) : au moins 55/60 rejets et 28/30 acceptations', () => {
    const c = load('heldout3-corpus.json');
    expect(c.reject).toHaveLength(60);
    expect(c.accept).toHaveLength(30);
    expect(rejected(c.reject)).toBeGreaterThanOrEqual(55);
    expect(accepted(c.accept)).toBeGreaterThanOrEqual(28);
  });

  it('corpus indépendants 1 et 2 : résultats du réglage conservés', () => {
    const c1 = load('heldout-corpus.json');
    const c2 = load('heldout2-corpus.json');
    expect(rejected(c1.reject)).toBe(c1.reject.length);
    expect(accepted(c1.accept)).toBe(c1.accept.length);
    expect(rejected(c2.reject)).toBe(c2.reject.length);
    expect(accepted(c2.accept)).toBeGreaterThanOrEqual(22);
  });

  it('une question sans preuve, d’un autre thème ou de sécurité est toujours rejetée', () => {
    const base = {
      day: 2,
      themeKey: 'famille' as const,
      text: 'Quelle place aimeriez-vous donner aux fêtes de famille dans votre année ?',
      claim: 'neutral' as const,
    };
    expect(validate({ ...base, evidence: [] }, INDEX).ok).toBe(false);
    expect(validate({ ...base, evidence: ['E99'] }, INDEX).ok).toBe(false);
    expect(
      validate({ ...base, themeKey: 'projet', evidence: ['E1'] }, INDEX).ok,
    ).toBe(false);
    expect(
      validate({ ...base, themeKey: 'communication', evidence: ['E4'] }, INDEX)
        .ok,
    ).toBe(false);
    expect(validate({ ...base, evidence: ['N-famille'] }, INDEX).ok).toBe(true);
  });
});

describe('Contrat de preuves — gabarits V8.2 en mode strict (comme une question de l’IA)', () => {
  const themeOf = new Map(NATIVE_RULES.map((r) => [r.questionId, r.theme]));

  it('aucun gabarit natif ne présuppose une émotion, une intention, une habitude, un comportement ou un passé', () => {
    const bad: string[] = [];
    for (const [id, days] of Object.entries(V82_TOPIC_DEEP))
      for (const [day, t] of Object.entries(days)) {
        const theme = themeOf.get(id)!;
        const v = validate(
          {
            day: Number(day),
            themeKey: theme,
            text: t.text,
            evidence: [`N-${theme}`],
            claim: 'neutral',
          },
          INDEX,
        );
        if (!v.ok)
          bad.push(`${id}[${day}] ${v.reasons.join(', ')} | ${t.text}`);
      }
    expect(bad).toEqual([]);
  });

  it('N3 (anciennes relations) : aucun gabarit ne suppose que l’autre garde un lien avec son passé', () => {
    for (const t of Object.values(V82_TOPIC_DEEP.V82_M3_02)) {
      expect(t.text).not.toMatch(/liens que l[’']autre garde|son passé/iu);
      expect(aiOnlyIssues(t.text, 'intimite')).toEqual([]);
    }
  });

  it('relances d’accord et questions neutres B : aucune présupposition', () => {
    const bad: string[] = [];
    for (const [key, a] of Object.entries(V82_AGREEMENTS)) {
      const theme = themeOf.get(key.split(':')[0])!;
      for (const p of [a.probe, ...(a.extraProbes ?? [])])
        if (p) {
          const issues = aiOnlyIssues(p.text, theme);
          if (issues.length)
            bad.push(`${key} ${issues.join(', ')} | ${p.text}`);
        }
    }
    for (const n of V82_NEUTRAL) {
      const v = validate(
        {
          day: n.day,
          themeKey: n.theme,
          text: n.tpl.text,
          evidence: [`N-${n.theme}`],
          claim: 'neutral',
        },
        INDEX,
      );
      if (!v.ok) bad.push(`${n.replaces} ${v.reasons.join(', ')}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('Contrat de preuves — index et traçabilité (confidentialité)', () => {
  const a = { V82_M5_03: 'A', V82_M4_02: 'B', M6_Q04: 'A' };
  const b = { V82_M5_03: 'D', V82_M4_02: 'B', M6_Q04: 'C' };
  const report = buildDivergenceReport(a, b);
  const index = buildEvidence(report);

  it('l’index transmis à l’IA ne contient aucune réponse de membre ni les écarts de sécurité', () => {
    const text = describeEvidenceForAi(index);
    for (const e of index)
      for (const p of e.privateTexts) expect(text).not.toContain(p);
    expect(text).toMatch(/famille · écart · Accueillir un proche à la maison/);
    expect(text).not.toMatch(/communication · écart/);
  });

  it('trace d’une question servie : identifiants et sujets, jamais de texte de réponse', () => {
    const div = servedTrace(
      { source: 'divergence', subject: 'V82_M5_03', themeKey: 'famille' },
      index,
    );
    expect(div.claim).toBe('divergence');
    expect(div.subjects).toEqual(['V82_M5_03']);
    expect(div.evidence).toHaveLength(1);
    const neutral = servedTrace({ source: 'gabarit', themeKey: 'lieu' }, index);
    expect(neutral).toEqual({
      claim: 'neutral',
      evidence: ['N-lieu'],
      subjects: [],
      topics: [],
    });
    const safety = servedTrace(
      { source: 'divergence', subject: 'securite', themeKey: 'communication' },
      index,
    );
    expect(safety.claim).toBe('safety');
    const all = JSON.stringify([div, neutral, safety]);
    for (const e of index)
      for (const p of e.privateTexts) expect(all).not.toContain(p);
  });
});
