import { QUESTIONS } from '../interview/questions.data';
import { RawAnswers } from '../matching/divergence.engine';
import { buildHeadline, buildPortrait, isUsableBio } from './portrait.writer';

/**
 * Réponses V7 déterministes couvrant toutes les questions (option n° `shift`,
 * échelles au point neutre), sans même réponse à risque ni relation en cours.
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
    M10_Q18: 'A',
  };
}

/** Même projet, même apport, même offre : seuls le tempérament, l'humour et le langage de l'amour changent. */
const SHARED: RawAnswers = {
  ...answersWith(0),
  M8_Q01: 'A',
  M8_Q02: 'A',
  M10_Q09: 'C',
  M10_Q10: 'A',
  M10_Q03: 'C',
};
const AMINA = { ...SHARED, M7_Q03: 'B', M10_Q04: 'C', M8_Q04: 'D' };
const MARC = { ...SHARED, M7_Q03: 'C', M10_Q04: 'A', M8_Q04: 'B' };
const KARIM = { ...SHARED, M7_Q03: 'C', M10_Q04: 'A', M8_Q04: 'E' };

describe('Qualité des fiches', () => {
  it('ne donne pas la même bio à trois membres au même projet de couple', () => {
    const bios = [AMINA, MARC, KARIM].map(
      (answers) => buildPortrait({ firstName: 'X', gender: 'H', answers }).bio,
    );
    expect(new Set(bios).size).toBe(3);
    for (const bio of bios) {
      const words = bio.split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(30);
      expect(words).toBeLessThanOrEqual(90);
    }
  });

  it('écrit « pas d’autres enfants » pour un parent qui n’en veut plus', () => {
    const p = buildPortrait({
      firstName: 'Bernard',
      gender: 'H',
      age: 52,
      answers: { ...answersWith(1), M0_Q05: 'C', M0_Q06: 'D' },
    });
    expect(p.analysis).toContain('Il ne souhaite pas d’autres enfants');
    expect(p.analysis).not.toMatch(/ne souhaite pas d.enfants/);
    expect(p.modules.find((m) => m.module === 0)!.description).toContain(
      'd’autres enfants',
    );
  });

  it('remplace une bio saisie qui contient des coordonnées ou des insultes', () => {
    expect(
      isUsableBio(
        'Appelez-moi au 06 12 34 56 78 ou sur insta @yann_abj pour faire connaissance',
      ),
    ).toBe(false);
    expect(
      isUsableBio(
        'Écris-moi sur WhatsApp, je réponds vite, on verra bien ce que ça donne entre nous',
      ),
    ).toBe(false);
    expect(
      isUsableBio(
        'Je cherche une relation sincère, pas de plan cul ni de perte de temps svp merci',
      ),
    ).toBe(false);
    expect(
      isUsableBio(
        'Je suis une personne posée, attachée à ma famille et à ma foi, et je cherche une relation durable.',
      ),
    ).toBe(true);
  });

  it('affiche un prénom saisi en minuscules avec sa majuscule', () => {
    expect(
      buildHeadline({
        firstName: 'yannick',
        gender: 'H',
        age: 29,
        answers: {},
      }),
    ).toBe('Yannick, 29 ans');
    expect(
      buildHeadline({ firstName: 'jean-marc', gender: 'H', answers: {} }),
    ).toBe('Jean-Marc');
    expect(
      buildHeadline({ firstName: 'DeAndre', gender: 'H', answers: {} }),
    ).toBe('DeAndre');
  });

  it('ne compte pas une question non posée à 55 ans dans la clarté', () => {
    const { M0_Q06, ...answers } = answersWith(1);
    void M0_Q06;
    const p = buildPortrait({
      firstName: 'Bernard',
      gender: 'H',
      age: 55,
      answers: { ...answers, M0_Q05: 'C', M0_Q10: 'A' },
    });
    expect(p.modules.find((m) => m.module === 0)!.clarity).toBe(100);
  });
});

describe('Métier en milieu de phrase', () => {
  it('passe le métier en minuscules sans toucher aux sigles', () => {
    const headline = (profession: string) =>
      buildHeadline({
        firstName: 'Steve',
        gender: 'H',
        age: 24,
        profession,
        answers: {},
      });
    expect(headline('Product Manager')).toBe('Steve, 24 ans, product manager');
    expect(headline('Data Scientist / IA')).toBe(
      'Steve, 24 ans, data scientist / IA',
    );
    expect(headline('DevOps / Ingénieur Cloud')).toBe(
      'Steve, 24 ans, DevOps / ingénieur cloud',
    );
    expect(headline('DRH')).toBe('Steve, 24 ans, DRH');
  });
});

describe('Tabac sur la fiche', () => {
  it('affiche « Non-fumeuse » ou « Fumeur occasionnel » selon la réponse', () => {
    const f = buildPortrait({
      firstName: 'Amina',
      gender: 'F',
      answers: { M0_Q09: 'A' },
    });
    expect(f.details.smoking).toBe('Non-fumeuse');
    const h = buildPortrait({
      firstName: 'Marc',
      gender: 'H',
      answers: { M0_Q09: 'B' },
    });
    expect(h.details.smoking).toBe('Fumeur occasionnel');
  });
});
