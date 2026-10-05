import {
  QUESTIONS,
  V6_CHANGES,
  answerText,
  isValidAnswer,
  normalizeAnswer,
} from './questions.data';
import { QUESTIONS_EN, localizeQuestion, parseLanguage } from './questions.en';

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
const languages = byId.get('M0_Q10')!;

describe('Questionnaire V6', () => {
  it('a des identifiants uniques et 11 modules', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(QUESTIONS.map((q) => q.moduleNumber)).size).toBe(11);
  });

  it('ne référence que des questions existantes dans le suivi des évolutions', () => {
    for (const id of Object.keys(V6_CHANGES)) expect(byId.has(id)).toBe(true);
  });

  it('dépend uniquement de questions posées avant (même module ou module antérieur)', () => {
    const order = new Map(QUESTIONS.map((q, i) => [q.id, i]));
    for (const q of QUESTIONS) {
      const deps = q.rules?.dependsOn;
      if (!deps) continue;
      for (const d of Array.isArray(deps) ? deps : [deps]) {
        expect(order.get(d.questionId)).toBeLessThan(order.get(q.id)!);
      }
    }
  });

  it('accepte plusieurs langues mais une seule option ailleurs', () => {
    expect(isValidAnswer(languages, 'A')).toBe(true);
    expect(isValidAnswer(languages, 'B,A')).toBe(true);
    expect(isValidAnswer(languages, 'A,A')).toBe(false);
    expect(isValidAnswer(languages, 'A,Z')).toBe(false);
    expect(isValidAnswer(languages, '')).toBe(false);
    const religion = byId.get('M1_Q05')!;
    expect(isValidAnswer(religion, 'A')).toBe(true);
    expect(isValidAnswer(religion, 'A,B')).toBe(false);
    expect(isValidAnswer(religion, 42)).toBe(false);
  });

  it('range les langues dans l’ordre des options et les rend lisibles', () => {
    expect(normalizeAnswer(languages, 'G, B,A')).toBe('A,B,G');
    expect(answerText(languages, 'A,B')).toBe('Français, English');
  });

  it('ne parle plus d’antécédents de suivi psychologique (RGPD art. 9)', () => {
    const helpSeeking = byId.get('M2_Q10')!;
    expect(helpSeeking.text).not.toMatch(/avez-vous suivi/i);
    expect(byId.get('M3_Q10')!.options[0].text).not.toMatch(/thérapie/i);
  });
});

describe('Traduction anglaise', () => {
  it('couvre toutes les questions avec le même nombre d’options', () => {
    for (const q of QUESTIONS) {
      const t = QUESTIONS_EN[q.id];
      expect(t).toBeDefined();
      if (q.scale) {
        expect(t.options).toBeUndefined();
      } else {
        expect(t.options?.length).toBe(q.options.length);
      }
    }
    expect(Object.keys(QUESTIONS_EN).sort()).toEqual(
      QUESTIONS.map((q) => q.id).sort(),
    );
  });

  it('garde les clés de réponse et traduit les échelles', () => {
    const q = localizeQuestion(byId.get('M2_Q11')!, 'en');
    expect(q.text).toMatch(/I often worry/);
    expect(q.options.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(q.options[4].text).toBe('Strongly agree');
    const freq = localizeQuestion(byId.get('M6_Q13')!, 'en');
    expect(freq.options[0].text).toBe('Never');
    const lang = localizeQuestion(languages, 'en');
    expect(lang.multiple).toBe(true);
    expect(lang.options[0]).toEqual({ key: 'A', text: 'Français (French)' });
  });

  it('reste en français par défaut', () => {
    expect(parseLanguage(undefined)).toBe('fr');
    expect(parseLanguage('de')).toBe('fr');
    expect(parseLanguage('EN-gb')).toBe('en');
    const q = byId.get('M0_Q01')!;
    expect(localizeQuestion(q, 'fr')).toBe(q);
  });
});
