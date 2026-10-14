import { QUESTION_INDEX } from './questions.data';
import { QUESTIONS_EN } from './questions.en';
import {
  V82_EN,
  V82_INDEX,
  V82_M8_06,
  V82_QUESTIONS,
  V82_REINTEGRATED,
  localizeV82Question,
} from './questions.v82';
import {
  V82_CLARITY_EN,
  V82_CLARITY_FR,
  V82Correction,
} from './questions.v82.clarity';
import { V82_BASE, V82_BASE_EN } from './questions.v82.generated';

/** Question source avant relecture (modèle généré, V7 reprise ou M8_Q13 reformulée). */
const source = (id: string) =>
  V82_BASE.find((q) => q.id === id) ??
  (V82_REINTEGRATED.includes(id) ? QUESTION_INDEX.get(id) : undefined) ??
  (id === V82_M8_06.id ? V82_M8_06 : undefined);

const keys = (o: { key: string }[]) => o.map((x) => x.key);

/** Échelles psychométriques : leurs libellés ne sont jamais corrigés. */
const SCALE_FR = [
  'Pas du tout d’accord',
  'Plutôt pas d’accord',
  'Ni d’accord ni pas d’accord',
  'Plutôt d’accord',
  'Tout à fait d’accord',
  'Jamais',
  'Rarement',
  'Parfois',
  'Souvent',
  'Très souvent',
  'Non applicable',
  'Très inexact',
  'Plutôt inexact',
  'Ni exact ni inexact',
  'Plutôt exact',
  'Très exact',
];

describe('Grand Entretien V8.2 — relecture éditoriale', () => {
  it('identifiants, ordre, clés et nombre d’options inchangés', () => {
    expect(V82_QUESTIONS).toHaveLength(118);
    // L'ordre du modèle généré est conservé.
    const baseIds = new Set(V82_BASE.map((q) => q.id));
    expect(
      V82_QUESTIONS.map((q) => q.id).filter((id) => baseIds.has(id)),
    ).toEqual(V82_BASE.map((q) => q.id));
    for (const q of V82_QUESTIONS) {
      const src = source(q.id);
      expect(src).toBeDefined();
      expect(keys(q.options)).toEqual(keys(src!.options));
      expect(q.moduleNumber).toBe(src!.moduleNumber);
      // Anglais : mêmes clés que le français.
      expect(Object.keys(V82_EN[q.id].options)).toEqual(keys(q.options));
    }
    for (const [id, t] of Object.entries(V82_BASE_EN))
      expect(Object.keys(V82_EN[id].options)).toEqual(Object.keys(t.options));
  });

  const check = (
    lang: 'fr' | 'en',
    table: Record<string, V82Correction>,
    current: (id: string) => {
      text: string;
      options: Record<string, string>;
      assistance?: string;
    },
  ) => {
    for (const [id, c] of Object.entries(table)) {
      expect(V82_INDEX.has(id)).toBe(true);
      const q = V82_INDEX.get(id)!;
      expect(c.text || c.options || c.assistance).toBeTruthy();
      const now = current(id);
      if (c.text) expect(now.text).toBe(c.text);
      if (c.assistance) {
        expect(q.assistance).toBeDefined();
        expect(now.assistance).toBe(c.assistance);
      }
      for (const [k, v] of Object.entries(c.options ?? {})) {
        expect(keys(q.options)).toContain(k);
        expect(now.options[k]).toBe(v);
      }
      // Instruments psychométriques : Mini-IPIP et échelles intacts.
      expect(id.startsWith('V82_M7_')).toBe(false);
      if (lang === 'fr')
        for (const k of Object.keys(c.options ?? {}))
          expect(SCALE_FR).not.toContain(
            source(id)!.options.find((o) => o.key === k)!.text,
          );
    }
  };

  it('chaque correction française vise une question et des clés existantes, et s’applique', () => {
    check('fr', V82_CLARITY_FR, (id) => {
      const q = V82_INDEX.get(id)!;
      return {
        text: q.text,
        assistance: q.assistance,
        options: Object.fromEntries(q.options.map((o) => [o.key, o.text])),
      };
    });
  });

  it('chaque correction anglaise vise une question et des clés existantes, et s’applique', () => {
    check('en', V82_CLARITY_EN, (id) => V82_EN[id]);
    // La page anglaise sert bien les libellés corrigés.
    const q = localizeV82Question(V82_INDEX.get('M10_Q15')!, 'en');
    expect(q.text).toBe(V82_CLARITY_EN.M10_Q15.text);
  });

  it('chaque correction change réellement un libellé', () => {
    for (const [id, c] of Object.entries(V82_CLARITY_FR)) {
      const src = source(id)!;
      if (c.text) expect(c.text).not.toBe(src.text);
      for (const [k, v] of Object.entries(c.options ?? {}))
        expect(v).not.toBe(src.options.find((o) => o.key === k)!.text);
    }
  });

  it('aucune question ne contient « habill » (« vous attire »)', () => {
    const all = V82_QUESTIONS.flatMap((q) => [
      q.text,
      q.assistance ?? '',
      ...q.options.map((o) => o.text),
      V82_EN[q.id].text,
      ...Object.values(V82_EN[q.id].options),
    ]);
    for (const s of all) expect(s).not.toMatch(/habill/i);
    expect(V82_INDEX.get('V82_M0_01')!.text).toMatch(/vous attire le plus/);
  });

  it('V82_M1_04 : ce que l’on décide est dit, en français et en anglais', () => {
    const q = V82_INDEX.get('V82_M1_04')!;
    expect(q.text).toBe(
      'Si vos familles s’opposaient à votre union pour des raisons culturelles ou religieuses, quelle place donneriez-vous à leur avis dans votre décision ?',
    );
    expect(V82_EN.V82_M1_04.text).toBe(
      'If your families opposed your relationship for cultural or religious reasons, how much weight would you give their opinion in your decision?',
    );
    expect(keys(q.options)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('correspondances FR/EN complètes', () => {
    const fr = new Set(V82_QUESTIONS.map((q) => q.id));
    expect(new Set(Object.keys(V82_EN))).toEqual(fr);
    for (const q of V82_QUESTIONS) {
      const t = V82_EN[q.id];
      expect(t.text.trim().length).toBeGreaterThan(5);
      for (const o of q.options) expect(t.options[o.key]?.trim()).toBeTruthy();
      if (q.assistance) expect(t.assistance).toBeTruthy();
      // Même forme de libellé : question (« ? ») ou amorce (« : »).
      const end = (s: string) => (/\?\s*(\([^)]*\))?$/.test(s) ? '?' : ':');
      expect(`${q.id} ${end(t.text)}`).toBe(`${q.id} ${end(q.text)}`);
    }
  });

  it('la V7.1 reste inchangée (corrections portées par la seule table V8.2)', () => {
    expect(QUESTION_INDEX.get('M9_Q07')!.options[0].text).toBe(
      "Essentielles — c'est mon langage principal d'amour",
    );
    expect(QUESTIONS_EN.M10_Q15.text).toBe(
      'For a story to begin, physical attraction has to be:',
    );
    expect(QUESTION_INDEX.get('M8_Q16')!.text).toMatch(/accompli/);
  });
});
