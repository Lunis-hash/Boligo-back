import {
  buildDivergenceReport,
  RawAnswers,
} from '../matching/divergence.engine';
import { QUESTIONS } from '../interview/questions.data';
import {
  attachmentStyle,
  buildPsychProfile,
  buildRelationalProfile,
  psychometricSimilarities,
  scaleResult,
  scaleScore,
  ATTACHMENT_ANXIETY,
  SCALES,
  SINCERITY,
} from './psychometrics';

/** Réponses aux échelles : `scores` par identifiant (A = 1 … E = 5). */
const likert = (scores: Record<string, number>): RawAnswers =>
  Object.fromEntries(
    Object.entries(scores).map(([id, v]) => [id, 'ABCDE'[v - 1]]),
  );

/** Attachement V7 : inquiétude et inconfort (1 = pas du tout, 5 = tout à fait). */
const attach = (anx: number, avo: number): RawAnswers =>
  likert({
    M2_Q23: anx,
    M2_Q25: anx,
    M2_Q27: 6 - anx,
    M2_Q29: anx,
    M2_Q31: 6 - anx,
    M2_Q33: anx,
    M2_Q24: avo,
    M2_Q26: 6 - avo,
    M2_Q28: avo,
    M2_Q30: avo,
    M2_Q32: 6 - avo,
    M2_Q34: avo,
  });

/** Attachement V6 (trois affirmations par dimension), pour un entretien V6. */
const attachV6 = (anx: number, avo: number): RawAnswers =>
  likert({
    M2_Q11: anx,
    M2_Q12: anx,
    M2_Q13: 6 - anx,
    M2_Q14: avo,
    M2_Q15: avo,
    M2_Q16: 6 - avo,
  });

/** Les quatre cavaliers V7 : le comportement et son antidote (inversé). */
const fights = (c: number, m: number, d: number, s: number): RawAnswers =>
  likert({
    M6_Q12: c,
    M6_Q20: 6 - c,
    M6_Q13: m,
    M6_Q21: 6 - m,
    M6_Q14: d,
    M6_Q22: 6 - d,
    M6_Q15: s,
    M6_Q23: 6 - s,
  });

describe('Échelles V7 : formulations BOLIGO, items inversés', () => {
  it('note de 0 à 100 avec les affirmations inversées', () => {
    expect(scaleScore(attach(5, 1), ATTACHMENT_ANXIETY)).toBe(100);
    expect(scaleScore(attach(1, 1), ATTACHMENT_ANXIETY)).toBe(0);
    expect(scaleScore(attach(3, 1), ATTACHMENT_ANXIETY)).toBe(50);
    // Une affirmation inversée : « tout à fait d'accord » avec « je reste
    // serein(e) » compte comme « pas du tout inquiet ».
    expect(
      scaleScore(
        likert({ M2_Q23: 1, M2_Q25: 1, M2_Q27: 5 }),
        ATTACHMENT_ANXIETY,
      ),
    ).toBe(0);
    // Moins de la moitié des affirmations : pas de score.
    expect(scaleScore(likert({ M2_Q23: 5 }), ATTACHMENT_ANXIETY)).toBeNull();
  });

  it('allonge les échelles décisives, chacune avec ses items inversés', () => {
    const shape = (name: keyof typeof SCALES) => {
      const items = SCALES[name].items;
      return [items.length, items.filter((i) => i.reverse).length];
    };
    expect(shape('anxiety')).toEqual([6, 2]);
    expect(shape('avoidance')).toEqual([6, 2]);
    expect(shape('reappraisal')).toEqual([3, 1]);
    expect(shape('suppression')).toEqual([3, 1]);
    for (const trait of [
      'extraversion',
      'agreeableness',
      'conscientiousness',
      'openness',
    ] as const) {
      expect(shape(trait)[0]).toBeGreaterThanOrEqual(3);
      expect(shape(trait)[1]).toBeGreaterThanOrEqual(1);
    }
    expect(shape('emotionalStability')).toEqual([4, 2]);
    for (const horseman of [
      'criticism',
      'contempt',
      'defensiveness',
      'stonewalling',
    ] as const)
      expect(shape(horseman)).toEqual([2, 1]);
    expect(SINCERITY).toHaveLength(5);
    expect(SINCERITY.filter((i) => i.reverse)).toHaveLength(3);
  });

  it('ne référence que des affirmations posées, notées sur une échelle', () => {
    const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
    for (const def of Object.values(SCALES))
      for (const item of def.items)
        expect(byId.get(item.id)?.scale).toBeDefined();
  });

  it('lit les échelles V6 d’un entretien V6, et préfère la V7 quand elle existe', () => {
    expect(scaleResult(attachV6(5, 1), SCALES.anxiety)).toEqual({
      score: 100,
      n: 3,
    });
    const v6 = buildPsychProfile(attachV6(5, 1));
    expect(v6.attachment.source).toBe('echelles');
    expect(v6.attachment.style).toBe('anxious');
    const both = buildPsychProfile({ ...attachV6(5, 1), ...attach(1, 1) });
    expect(both.attachment.anxiety).toBe(0);
    expect(both.items.anxiety).toBe(6);
  });

  it('classe le style d’attachement, sans style dans la zone intermédiaire', () => {
    expect(attachmentStyle(20, 20)).toBe('secure');
    expect(attachmentStyle(80, 20)).toBe('anxious');
    expect(attachmentStyle(20, 80)).toBe('avoidant');
    expect(attachmentStyle(80, 80)).toBe('fearful');
    // 50 = « ni d'accord ni pas d'accord » : aucun style affiché.
    expect(attachmentStyle(50, 20)).toBeNull();
    expect(attachmentStyle(55, 45)).toBeNull();
    expect(attachmentStyle(null, 20)).toBeNull();
    expect(buildPsychProfile(attach(3, 3)).attachment.style).toBeNull();
  });

  it('estime l’attachement depuis les scénarios pour un entretien antérieur à la V6', () => {
    const legacy = buildPsychProfile({ M2_Q01: 'D', M2_Q02: 'A', M2_Q03: 'A' });
    expect(legacy.attachment.source).toBe('scenarios');
    expect(legacy.attachment.style).toBe('anxious');
    const secure = buildPsychProfile({ M2_Q01: 'A', M2_Q02: 'B', M2_Q03: 'C' });
    expect(secure.attachment.style).toBe('secure');
  });
});

describe('Sincérité : elle module la confiance, jamais la note', () => {
  const idealizing = likert({
    M9_Q08: 5,
    M9_Q21: 5,
    M9_Q20: 1,
    M9_Q22: 1,
    M9_Q23: 1,
  });
  const candid = likert({
    M9_Q08: 2,
    M9_Q21: 1,
    M9_Q20: 4,
    M9_Q22: 4,
    M9_Q23: 5,
  });

  it('repère un portrait idéalisé avec les affirmations inversées', () => {
    expect(buildPsychProfile(idealizing).idealized).toBe(true);
    expect(buildPsychProfile(idealizing).confidence).toBe(0.5);
    expect(buildPsychProfile(candid).idealized).toBe(false);
    expect(buildPsychProfile(candid).confidence).toBe(1);
    // V6 : d'accord avec les deux affirmations M9_Q08 et M9_Q09.
    expect(buildPsychProfile({ M9_Q08: 'E', M9_Q09: 'D' }).idealized).toBe(
      true,
    );
  });

  it('ne change aucun score, seulement le poids des échelles dans l’affinité', () => {
    const a = { ...attach(4, 1), ...fights(2, 1, 2, 1) };
    const ideal = buildPsychProfile({ ...a, ...idealizing });
    const honest = buildPsychProfile({ ...a, ...candid });
    expect(ideal.attachment).toEqual(honest.attachment);
    expect(ideal.conflict).toEqual(honest.conflict);
    const weights = (x: RawAnswers) =>
      psychometricSimilarities(x, x).map((s) => s.weight);
    expect(weights({ ...a, ...idealizing })).toEqual(
      weights({ ...a, ...candid }).map((w) => w / 2),
    );
  });

  it('repère des réponses contradictoires (d’accord avec une affirmation et son contraire)', () => {
    const yes = Object.fromEntries(
      [
        ...Object.keys(attach(3, 3)),
        ...SCALES.reappraisal.items.map((i) => i.id),
      ].map((id) => [id, 'E']),
    );
    const p = buildPsychProfile(yes);
    expect(p.acquiescent).toBe(true);
    expect(p.confidence).toBe(0.5);
  });

  it('V7.1 : faire souvent un reproche et souvent son antidote n’est pas une contradiction (échelle de fréquence)', () => {
    // Trois cavaliers et leurs antidotes « très souvent », plus l'attachement
    // au point neutre : ni acquiescement ni confiance réduite.
    const both = Object.fromEntries(
      Object.keys(fights(3, 3, 3, 3)).map((id) => [id, 'E']),
    );
    const p = buildPsychProfile({ ...attach(3, 3), ...both });
    expect(p.acquiescent).toBe(false);
    expect(p.confidence).toBe(1);
  });

  it('lit les questions miroir à choix multiple', () => {
    const p = buildPsychProfile({
      ...attach(1, 1),
      ...fights(1, 1, 1, 1),
      M2_Q05: 'A,C', // on lui a reproché de trop s'inquiéter
      M6_Q02: 'B,C', // … de couper la communication et d'être sarcastique
    });
    expect(p.mirrorGaps).toEqual(['anxiete', 'mepris', 'repli']);
  });
});

describe('Lecture croisée de deux membres', () => {
  it('signale le piège « besoin d’être rassuré » face à « besoin d’espace »', () => {
    const report = buildDivergenceReport(attach(5, 1), attach(1, 5));
    const d = report.divergences.find((x) => x.label.startsWith('Proximité'));
    expect(d?.severity).toBe('majeure');
    expect(d?.questionId).toBe('M2_Q11');
    expect(d?.a.text).toMatch(/rassuré/);
    expect(d?.b.text).toMatch(/espace/);
    // Deux membres sereins : rien.
    const calm = buildDivergenceReport(attach(1, 1), attach(2, 1));
    expect(calm.divergences.some((x) => x.label.startsWith('Proximité'))).toBe(
      false,
    );
  });

  it('mesure directement « l’un relance, l’autre se ferme » ; une majeure exige deux sources de chaque côté', () => {
    const chaser = { M6_Q17: 'D', ...fights(4, 1, 2, 1) };
    const wall = { M6_Q16: 'D', ...fights(1, 1, 2, 4) };
    const both = buildDivergenceReport(chaser, wall).divergences.find(
      (x) => x.label === 'Relance et repli en dispute',
    );
    expect(both).toMatchObject({ severity: 'majeure', questionId: 'M6_Q15' });
    // Le scénario seul, de chaque côté : à explorer.
    expect(
      buildDivergenceReport({ M6_Q17: 'D' }, { M6_Q16: 'D' }).divergences.find(
        (x) => x.label === 'Relance et repli en dispute',
      )?.severity,
    ).toBe('moderee');
    // V6 : une seule affirmation « très souvent » de chaque côté ne suffit plus.
    expect(
      buildDivergenceReport(likert({ M6_Q12: 5 }), likert({ M6_Q15: 5 }))
        .divergences[0].severity,
    ).toBe('moderee');
  });

  it('signale le repli partagé', () => {
    const wall = { M6_Q16: 'D', ...fights(1, 1, 2, 4) };
    const r = buildDivergenceReport(wall, {
      M6_Q16: 'D',
      ...fights(2, 1, 2, 5),
    });
    const shared = r.divergences.find((x) => x.label.startsWith('Silence'));
    expect(shared?.shared).toBe(true);
    expect(shared?.severity).toBe('majeure');
    expect(shared?.a.text).toBe(shared?.b.text);
  });

  it('ne pénalise pas une réponse franche sur soi : seules les combinaisons à risque comptent', () => {
    const frank = { ...attach(5, 1), ...fights(3, 1, 3, 1) };
    const secure = { ...attach(1, 1), ...fights(1, 1, 1, 1) };
    for (const s of psychometricSimilarities(frank, secure))
      if (s.module !== 7) expect(s.value).toBe(1);
    const avoidant = { ...attach(1, 5), ...fights(1, 1, 1, 1) };
    const trap = psychometricSimilarities(frank, avoidant).find(
      (s) => s.module === 2 && s.weight === 3,
    )!;
    expect(trap.value).toBeLessThan(0.5);
  });

  it('valorise deux profils sereins plus que deux profils tendus', () => {
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
      {
        ...attach(1, 5),
        ...likert({
          M2_Q35: 5,
          M2_Q37: 5,
          M2_Q39: 1,
          M2_Q36: 1,
          M2_Q38: 1,
          M2_Q40: 5,
        }),
      },
      'F',
    );
    expect(p?.attachment?.title).toBe('Attachée à votre indépendance');
    expect(p?.regulation?.title).toMatch(/recul/);
    expect(p?.disclaimer).toMatch(/pas un diagnostic/);
  });

  it('n’affiche aucun style dans la zone intermédiaire, et parle des peurs avec douceur', () => {
    const p = buildRelationalProfile({ ...attach(3, 3), M2_Q04: 'A,F' }, 'H');
    expect(p?.attachment).toBeNull();
    expect(p?.observations.join(' ')).toMatch(/abandonné/);
    expect(p?.observations.join(' ')).toMatch(/vos besoins comptent/);
  });

  it('n’affiche rien sans réponses', () => {
    expect(buildRelationalProfile({}, 'H')).toBeNull();
  });
});
