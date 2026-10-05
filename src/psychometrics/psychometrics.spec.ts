import {
  buildDivergenceReport,
  RawAnswers,
} from '../matching/divergence.engine';
import {
  attachmentStyle,
  buildPsychProfile,
  buildRelationalProfile,
  psychometricSimilarities,
  scaleScore,
  ATTACHMENT_ANXIETY,
} from './psychometrics';

/** Réponses aux échelles : `scores` par identifiant (A = 1 … E = 5). */
const likert = (scores: Record<string, number>): RawAnswers =>
  Object.fromEntries(
    Object.entries(scores).map(([id, v]) => [id, 'ABCDE'[v - 1]]),
  );

/** Attachement : anxiété et évitement (1 = pas du tout, 5 = tout à fait). */
const attach = (anx: number, avo: number): RawAnswers =>
  likert({
    M2_Q11: anx,
    M2_Q12: anx,
    M2_Q13: 6 - anx,
    M2_Q14: avo,
    M2_Q15: avo,
    M2_Q16: 6 - avo,
  });

const fights = (c: number, m: number, d: number, s: number): RawAnswers =>
  likert({ M6_Q12: c, M6_Q13: m, M6_Q14: d, M6_Q15: s });

describe('Échelles psychométriques', () => {
  it('note de 0 à 100 avec les affirmations inversées', () => {
    expect(scaleScore(attach(5, 1), ATTACHMENT_ANXIETY)).toBe(100);
    expect(scaleScore(attach(1, 1), ATTACHMENT_ANXIETY)).toBe(0);
    expect(scaleScore(attach(3, 1), ATTACHMENT_ANXIETY)).toBe(50);
    // Moins de la moitié des affirmations : pas de score.
    expect(scaleScore(likert({ M2_Q11: 5 }), ATTACHMENT_ANXIETY)).toBeNull();
  });

  it('classe le style d’attachement', () => {
    expect(attachmentStyle(20, 20)).toBe('secure');
    expect(attachmentStyle(80, 20)).toBe('anxious');
    expect(attachmentStyle(20, 80)).toBe('avoidant');
    expect(attachmentStyle(80, 80)).toBe('fearful');
    expect(attachmentStyle(null, 20)).toBeNull();
  });

  it('estime l’attachement depuis les scénarios pour un entretien antérieur à la V6', () => {
    const legacy = buildPsychProfile({ M2_Q01: 'D', M2_Q02: 'A', M2_Q03: 'A' });
    expect(legacy.attachment.source).toBe('scenarios');
    expect(legacy.attachment.style).toBe('anxious');
    const secure = buildPsychProfile({ M2_Q01: 'A', M2_Q02: 'B', M2_Q03: 'C' });
    expect(secure.attachment.style).toBe('secure');
  });

  it('repère un portrait idéalisé et les écarts miroir', () => {
    const p = buildPsychProfile({
      ...attach(1, 1),
      ...fights(1, 1, 1, 1),
      M9_Q08: 'E',
      M9_Q09: 'D',
      M2_Q05: 'A', // on lui a reproché de trop s'inquiéter
      M6_Q02: 'C', // … et d'être sarcastique
    });
    expect(p.idealized).toBe(true);
    expect(p.mirrorGaps).toEqual(['anxiete', 'mepris']);
  });
});

describe('Lecture croisée de deux membres', () => {
  it('signale le piège anxieux–évitant', () => {
    const anxious = attach(5, 1);
    const avoidant = attach(1, 5);
    const report = buildDivergenceReport(anxious, avoidant);
    const d = report.divergences.find((x) => x.label.startsWith('Proximité'));
    expect(d?.severity).toBe('majeure');
    expect(d?.a.text).toMatch(/rassuré/);
    expect(d?.b.text).toMatch(/espace/);
    // Deux membres sécures : rien.
    const calm = buildDivergenceReport(attach(1, 1), attach(2, 1));
    expect(calm.divergences.some((x) => x.label.startsWith('Proximité'))).toBe(
      false,
    );
  });

  it('signale reproches d’un côté et repli de l’autre, et le repli partagé', () => {
    const critic = fights(5, 1, 2, 1);
    const wall = fights(1, 1, 2, 5);
    const r1 = buildDivergenceReport(critic, wall);
    expect(
      r1.divergences.find((x) => x.label === 'Reproches et repli en dispute')
        ?.severity,
    ).toBe('majeure');
    const r2 = buildDivergenceReport(wall, fights(2, 1, 2, 4));
    const shared = r2.divergences.find((x) => x.label.startsWith('Silence'));
    expect(shared?.shared).toBe(true);
    expect(shared?.a.text).toBe(shared?.b.text);
  });

  it('valorise deux profils sécures et sereins plus que deux profils insécures', () => {
    const calm = { ...attach(1, 1), ...fights(1, 1, 1, 1) };
    const tense = { ...attach(4, 4), ...fights(4, 4, 4, 4) };
    const mean = (xs: Array<{ value: number }>) =>
      xs.reduce((s, x) => s + x.value, 0) / xs.length;
    expect(mean(psychometricSimilarities(calm, calm))).toBeGreaterThan(
      mean(psychometricSimilarities(tense, tense)) + 0.3,
    );
  });
});

describe('Votre profil relationnel', () => {
  it('rédige une lecture bienveillante, accordée au genre', () => {
    const p = buildRelationalProfile(
      { ...attach(1, 5), ...likert({ M2_Q17: 5, M2_Q18: 1 }) },
      'F',
    );
    expect(p?.attachment?.title).toBe('Attachée à votre indépendance');
    expect(p?.regulation?.title).toMatch(/recul/);
    expect(p?.disclaimer).toMatch(/pas un diagnostic/);
  });

  it('n’affiche rien sans réponses', () => {
    expect(buildRelationalProfile({}, 'H')).toBeNull();
  });
});
