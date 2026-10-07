/**
 * Gabarits du Sondeur : règles de forme sur chaque variante, couverture des
 * sujets, techniques cliniques, et simulation de 300 couples avec le vrai
 * moteur de divergences et le vrai assemblage.
 */
import { QUESTIONS } from '../interview/questions.data';
import {
  Convergence,
  DIVERGENCE_RULES,
  Divergence,
  RawAnswers,
  THEME_LIST,
  Theme,
  buildDivergenceReport,
} from '../matching/divergence.engine';
import { RED_FLAG_HABITS } from '../psychometrics/psychometrics';
import {
  BODY_HEALTH,
  MORALE,
  MORALE_PREFIX,
  PAINFUL_STORY,
  SEXUAL_DETAIL,
  SHARED_PAST,
  TUTOIEMENT,
  ULTIMATUM,
  VOUVOIEMENT,
  hasClinicalJargon,
  passesFormRules,
  similarQuestions,
} from './clinical-lens';
import {
  CONTROL_LIMITS,
  DAY_ANGLES,
  SAFETY_QUESTIONS,
  SAFETY_TEMPLATES,
  SondeurQuestion,
  assembleSondeur,
  describeReportForAi,
  questionSignature,
  safetyThemesOf,
  validateSondeurGrid,
} from './sondeur.generator';
import {
  AGREEMENTS,
  CHILDREN_TOPICS,
  CONVERGENT,
  PoolTemplate,
  SHARED_RISK,
  TARGETED,
  THEME_FALLBACK_PHRASES,
  THEME_POOL,
  TOPIC_DAYS,
  TOPIC_DEEP,
  TOPIC_DEEP_VARIANTS,
  TOPIC_FAMILIES,
  TOPIC_PHRASES,
  Technique,
  TopicTemplate,
  agreementFor,
  isNonNegotiable,
  topicDeepAll,
  topicKey,
  topicPhrase,
  topicWords,
} from './sondeur.pool';

/** Question de limite sur le contrôle (l'une des formulations). */
const isControlLimit = (text: string) =>
  CONTROL_LIMITS.some((l) => l.text === text);

// ─── Règles de forme ──────────────────────────────────────────────────────────

const L = '\\p{L}';
const word = (alternatives: string) =>
  new RegExp(`(?<!${L})(?:${alternatives})(?!${L})`, 'iu');
const prefix = (alternatives: string) =>
  new RegExp(`(?<!${L})(?:${alternatives})`, 'iu');

/** Débuts de question fermée (oui ou non). */
const CLOSED_START = new RegExp(
  '^(?:est-ce|faut-il|avez-vous|pourriez-vous|seriez-vous|êtes-vous|etes-vous|aimeriez-vous|accepteriez-vous|feriez-vous|partiriez-vous|resteriez-vous|pensez-vous|croyez-vous|voulez-vous|souhaitez-vous|y a-t-il|peut-on|doit-on|sauriez-vous|voudriez-vous|préférez-vous|préféreriez-vous)',
  'iu',
);
/** Verbe inversé en tête de proposition (« accepteriez-vous », « change-t-il »). */
const INVERTED = new RegExp(
  `^${L}+-(?:t-)?(?:vous|il|elle|on|ils|elles)(?!${L})`,
  'iu',
);
/** Proposition qui commence par un mot interrogatif ouvert. */
const OPEN = new RegExp(
  `^(?:(?:et|mais) )?(?:(?:à partir de|jusqu'à|à|de|d'|dans|sur|avec|par|pour|en|chez|vers|entre|depuis|au|aux|du|des|parmi|selon|sous|après|avant) )?(?:qu['’]|que(?!${L})|quel(?:le)?s?(?!${L})|qui(?!${L})|quoi(?!${L})|comment(?!${L})|où(?!${L})|pourquoi(?!${L})|combien(?!${L})|lequel|laquelle|lesquel(?:le)?s|d['’]où|jusqu['’]où)`,
  'iu',
);

const BRANDS = word(
  'tinder|meetic|bumble|hinge|happn|badoo|okcupid|whatsapp|zoom|facetime|skype|instagram|facebook|snapchat|tiktok|google|apple|netflix|uber|airbnb|groq|openrouter|claude|chatgpt|openai|gpt',
);
/** Jargon au-delà du filtre du code (audit, section 4.2). */
const EXTRA_JARGON = prefix(
  'attachement|schéma|abandon|inconscien|projection|transfert|loyauté invisible|triangul|enfant intérieur|red flag|love bombing|gaslighting|emprise|refoul|codépend|manipul|dépendance affective|insécur|blessure|thérap|psychi|psycho|clinique|diagnos|trouble|cavalier|gottman|bowlby|sternberg|perel|résilien|ambivalen|pervers',
);
/** Sujets réservés au jour 3 (pudeur graduée). */
const INTIMATE = new RegExp(
  `(?<!${L})(?:désir(?! d'enfants)|désiré|intimité|attirance)`,
  'iu',
);

/** La dernière proposition interrogative est-elle ouverte ? */
function isOpenQuestion(text: string): boolean {
  const sentences = text
    .trim()
    .replace(/\?$/, '')
    .split(/[.:;!]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.some((s) => CLOSED_START.test(s) || INVERTED.test(s)))
    return false;
  // Dans la dernière phrase, la première proposition décisive doit être ouverte.
  for (const chunk of sentences[sentences.length - 1].split(/,\s*/)) {
    if (OPEN.test(chunk)) return true;
    if (INVERTED.test(chunk) || CLOSED_START.test(chunk)) return false;
  }
  return false;
}

/** Tous les manquements d'une question servie aux règles de forme. */
function formIssues(text: string): string[] {
  const issues: string[] = [];
  if (text.length > 180) issues.push(`${text.length} caractères`);
  if (!text.trim().endsWith('?')) issues.push('ne finit pas par ?');
  if ((text.match(/\?/g) ?? []).length !== 1) issues.push('plusieurs ?');
  if (/\n/.test(text)) issues.push('retour à la ligne');
  if (/[«»"“”]/.test(text)) issues.push('guillemets');
  if (!isOpenQuestion(text)) issues.push('question fermée');
  if (ULTIMATUM.test(text)) issues.push('ultimatum');
  if (MORALE.test(text) || MORALE_PREFIX.test(text)) issues.push('morale');
  if (SHARED_PAST.test(text)) issues.push('passé commun supposé');
  if (BRANDS.test(text)) issues.push('marque');
  const caps = (text.match(/(?<!\p{L})\p{Lu}{3,}(?!\p{L})/gu) ?? []).filter(
    (w) => w !== 'BOLIGO',
  );
  if (caps.length) issues.push(`sigle ${caps.join(',')}`);
  if (BODY_HEALTH.test(text)) issues.push('corps, apparence ou santé');
  if (SEXUAL_DETAIL.test(text)) issues.push('détail sexuel');
  if (PAINFUL_STORY.test(text)) issues.push('récit douloureux');
  if (hasClinicalJargon(text) || EXTRA_JARGON.test(text)) issues.push('jargon');
  if (!passesFormRules(text)) issues.push('contrôle de forme du code');
  if (TUTOIEMENT.test(text)) issues.push('tutoiement');
  if (!VOUVOIEMENT.test(text)) issues.push('pas de vouvoiement');
  return issues;
}

function optionIssues(options: string[]): string[] {
  const issues: string[] = [];
  if (options.length !== 4) issues.push(`${options.length} options`);
  if (!/^Autre/.test(options[options.length - 1])) issues.push('sans Autre');
  for (const o of options) {
    if (o.length > 50) issues.push(`option longue : ${o}`);
    if (/[«»]/.test(o)) issues.push(`guillemets : ${o}`);
    if (hasClinicalJargon(o) || EXTRA_JARGON.test(o))
      issues.push(`jargon : ${o}`);
  }
  return issues;
}

function expectClean(texts: Array<{ where: string; text: string }>) {
  const bad = texts
    .map((t) => ({ ...t, issues: formIssues(t.text) }))
    .filter((t) => t.issues.length);
  expect(
    bad.map((b) => `${b.where} [${b.issues.join(', ')}] ${b.text}`),
  ).toEqual([]);
}

// ─── Variantes de remplissage ─────────────────────────────────────────────────

const ALL_PHRASES = [
  ...Object.values(TOPIC_PHRASES),
  ...Object.values(THEME_FALLBACK_PHRASES),
];

function renderTopic(
  pool: Record<number, TopicTemplate[]>,
  name: string,
): Array<{ where: string; text: string; options: string[] }> {
  const out: Array<{ where: string; text: string; options: string[] }> = [];
  for (const [day, templates] of Object.entries(pool))
    templates.forEach((t, i) => {
      for (const phrase of ALL_PHRASES)
        out.push({
          where: `${name}[${day}][${i}] « ${phrase} »`,
          text: t.text(topicWords(phrase)),
          options: t.options,
        });
    });
  return out;
}

const staticTemplates = (): Array<{
  where: string;
  text: string;
  options: string[];
  technique?: Technique;
}> => [
  ...THEME_LIST.flatMap((theme) =>
    [1, 2, 3].flatMap((day) =>
      THEME_POOL[theme][day].map((t, i) => ({
        where: `THEME_POOL.${theme}[${day}][${i}]`,
        ...t,
      })),
    ),
  ),
  ...Object.entries(TOPIC_DEEP).flatMap(([id, days]) =>
    Object.entries(days).map(([day, t]) => ({
      where: `TOPIC_DEEP.${id}[${day}]`,
      ...(t as PoolTemplate),
    })),
  ),
  ...Object.entries(TOPIC_DEEP_VARIANTS).flatMap(([id, days]) =>
    Object.entries(days).map(([day, t]) => ({
      where: `TOPIC_DEEP_VARIANTS.${id}[${day}]`,
      ...(t as PoolTemplate),
    })),
  ),
];

/** Phrase d'accord + question (sans phrase : la question seule). */
const joinAgreement = (statement: string, text: string) =>
  statement ? `${statement} ${text}` : text;

function agreementStatements(): string[] {
  return [
    ...Object.values(AGREEMENTS)
      .map((a) => a.statement)
      .filter(Boolean),
  ];
}

describe('Gabarits du Sondeur : règles de forme sur toutes les variantes', () => {
  it('questions de thème et formulations propres à un sujet', () => {
    const all = staticTemplates();
    expect(all.length).toBeGreaterThan(200);
    expectClean(all);
    for (const t of all) expect(optionIssues(t.options)).toEqual([]);
  });

  it('gabarits ciblés et de risque partagé, avec chaque tournure de sujet', () => {
    const all = [
      ...renderTopic(TARGETED, 'TARGETED'),
      ...renderTopic(SHARED_RISK, 'SHARED_RISK'),
    ];
    expectClean(all);
    for (const t of all) expect(optionIssues(t.options)).toEqual([]);
  });

  it("gabarits d'accord : chaque phrase d'accord avec chaque question", () => {
    const all: Array<{ where: string; text: string }> = [];
    for (const [key, a] of Object.entries(AGREEMENTS)) {
      if (a.probe) {
        all.push({
          where: `AGREEMENTS.${key}`,
          text: joinAgreement(a.statement, a.probe.text),
        });
        expect(optionIssues(a.probe.options)).toEqual([]);
      }
    }
    for (const statement of agreementStatements())
      for (const [day, questions] of Object.entries(CONVERGENT))
        questions.forEach((q, i) => {
          all.push({
            where: `CONVERGENT[${day}][${i}]`,
            text: `${statement} ${q.text}`,
          });
          expect(optionIssues(q.options)).toEqual([]);
        });
    expectClean(all);
  });

  it('questions de limite (sécurité) : même règles', () => {
    const violent = buildDivergenceReport({ M6_Q04: 'A' }, { M6_Q04: 'C' });
    const texts = new Set<string>();
    for (let i = 0; i < 40; i++)
      for (const q of assembleSondeur({
        report: violent,
        firstNames: ['A', 'B'],
        seed: `s${i}`,
      }))
        if (q.subject === 'securite') texts.add(q.text);
    expect(texts.size).toBe(6);
    expectClean([...texts].map((text) => ({ where: 'SAFETY', text })));
    for (const day of [1, 2, 3])
      for (const t of SAFETY_TEMPLATES[day])
        expect(optionIssues([...t.options, 'Autre...'])).toEqual([]);
  });

  it('sécurité : jamais de réconciliation, seulement la limite et la protection', () => {
    const all = [1, 2, 3].flatMap((day) => SAFETY_TEMPLATES[day]);
    for (const t of all)
      expect(t.text).not.toMatch(
        /réconcili|baisser les armes|reprendre plus tard|revenir vers|pardon|excuse|compromis|vivable|reparler|premier pas/i,
      );
    const day3 = SAFETY_TEMPLATES[3].map((t) => t.text).join(' | ');
    expect(day3).toMatch(/limite/);
    expect(day3).toMatch(/vous protéger/);
  });

  it('les questions les plus intimes ne sont posées qu’au jour 3', () => {
    for (const theme of THEME_LIST)
      for (const day of [1, 2])
        for (const t of THEME_POOL[theme][day])
          expect(`${day} ${t.text}`).not.toMatch(INTIMATE);
    for (const [id, days] of [
      ...Object.entries(TOPIC_DEEP),
      ...Object.entries(TOPIC_DEEP_VARIANTS),
    ])
      for (const [day, t] of Object.entries(days))
        if (day !== '3') expect(`${id} ${t!.text}`).not.toMatch(INTIMATE);
    // Les sujets intimes eux-mêmes ne sont prévus qu'au jour 3.
    for (const id of ['M6_Q06', 'M6_Q07']) expect(TOPIC_DAYS[id]).toEqual([3]);
  });
});

describe('Gabarits du Sondeur : quasi-doublons et redites de l’entretien', () => {
  const statics = [
    ...staticTemplates(),
    ...Object.entries(AGREEMENTS)
      .filter(([, a]) => a.probe)
      .map(([key, a]) => ({ where: `AGREEMENTS.${key}`, text: a.probe!.text })),
  ];

  it('aucune paire de formulations trop proches (même sens, presque les mêmes mots)', () => {
    const pairs: string[] = [];
    for (let i = 0; i < statics.length; i++)
      for (let j = i + 1; j < statics.length; j++)
        if (similarQuestions(statics[i].text, statics[j].text))
          pairs.push(`${statics[i].where} ≈ ${statics[j].where}`);
    expect(pairs).toEqual([]);
  });

  it('aucun texte en double, aucune signature en double dans un même créneau', () => {
    const texts = statics.map((s) => s.text);
    expect(new Set(texts).size).toBe(texts.length);
    for (const theme of THEME_LIST)
      for (const day of [1, 2, 3]) {
        const sigs = THEME_POOL[theme][day].map((t) =>
          questionSignature(t.text),
        );
        expect(new Set(sigs).size).toBe(sigs.length);
      }
  });

  it('ne repose aucune question du Grand Entretien', () => {
    const redites: string[] = [];
    for (const s of statics)
      for (const q of QUESTIONS)
        if (similarQuestions(s.text, q.text))
          redites.push(`${s.where} ≈ ${q.id}`);
    expect(redites).toEqual([]);
  });
});

describe('Tournures de sujet (TOPIC_PHRASES)', () => {
  /** Écarts du moteur et des échelles au 6 octobre 2026. */
  const KNOWN = [
    ...DIVERGENCE_RULES.map((r) => r.questionId),
    'M1_Q05',
    'M1_Q02',
    'M0_Q09',
    'M2_Q11',
    'M6_Q15',
    'M6_Q13',
    'M8_Q10',
    'M9_Q16',
    'M9_Q19',
    'M2_Q19',
  ];

  it('couvrent toutes les règles du moteur et tous les écarts tirés des échelles', () => {
    expect(KNOWN.length).toBeGreaterThanOrEqual(70);
    expect(KNOWN.filter((id) => !(id in TOPIC_PHRASES))).toEqual([]);
    expect(KNOWN.filter((id) => !(id in TOPIC_DAYS))).toEqual([]);
    // Chaque signal d'alerte croisé avec une habitude a sa propre tournure.
    for (const flag of Object.keys(RED_FLAG_HABITS))
      expect(TOPIC_PHRASES[`M8_Q10:${flag}`]).toBeDefined();
  });

  it('reconnaissent un signal d’alerte et un risque partagé', () => {
    const flag = (label: string) =>
      topicKey({
        questionId: 'M8_Q10',
        label: `Signal d’alerte : ${label.toLowerCase()}`,
        theme: 'communication',
      });
    expect(flag('Jalousie et contrôle')).toBe('M8_Q10:B');
    expect(flag('Le téléphone pendant les moments à deux')).toBe('M8_Q10:J');
    expect(
      topicPhrase({
        questionId: 'M6_Q15',
        label: 'Silence des deux côtés en dispute',
        theme: 'communication',
        shared: true,
      }),
    ).toBe('les silences pendant une dispute');
  });

  it('règle inconnue (V7) : tournure de repli propre, jamais le libellé brut', () => {
    const unknown = (theme: Theme, questionId = 'M12_Q99'): Divergence => ({
      questionId,
      theme,
      severity: 'majeure',
      label: 'Hiérarchie des valeurs : « liberté » ou « sécurité »',
      question: 'Question V7',
      a: { key: 'A', text: 'La liberté avant tout' },
      b: { key: 'D', text: 'La sécurité avant tout' },
    });
    for (const theme of THEME_LIST) {
      const phrase = topicPhrase(unknown(theme));
      expect(phrase).toBe(THEME_FALLBACK_PHRASES[theme]);
      expect(phrase).not.toMatch(/[«»:]/);
    }
    // Servie dans un vrai Sondeur, elle respecte les mêmes règles.
    const report = buildDivergenceReport({}, {});
    report.divergences.push(unknown('famille'), unknown('intimite', 'M12_Q98'));
    const qs = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 'v7' });
    expect(validateSondeurGrid(qs)).toBe(true);
    expectClean(qs.map((q) => ({ where: q.themeKey, text: q.text })));
    const intimite = qs.filter(
      (q) => q.themeKey === 'intimite' && q.source === 'divergence',
    );
    expect(intimite.map((q) => q.day)).toEqual([3]);
  });

  it('accord sans phrase écrite : aucune question d’accord générique', () => {
    const c: Convergence = {
      questionId: 'M7_Q08',
      theme: 'projet',
      label: 'Même réponse sur « temps passé ensemble »',
      answer: 'Le plus possible — on partage presque tout',
      topic: 'Temps passé ensemble',
    };
    expect(agreementFor(c)).toEqual({ statement: '' });
  });
});

describe('Techniques cliniques adaptées à deux inconnus', () => {
  const MISSING: Technique[] = [
    'circulaire',
    'echelle',
    'exception',
    'miracle',
    'besoin',
    'reparation',
    'perpetuel',
    'origine',
    'scene',
  ];

  it('au moins 60 formulations, sur les 7 thèmes et les 3 jours, d’abord Lieu et Famille', () => {
    const all = THEME_LIST.flatMap((theme) =>
      [1, 2, 3].flatMap((day) =>
        THEME_POOL[theme][day]
          .filter((t) => t.technique && MISSING.includes(t.technique))
          .map((t) => ({ theme, day, technique: t.technique! })),
      ),
    );
    expect(all.length).toBeGreaterThanOrEqual(60);
    for (const technique of MISSING)
      expect(all.some((t) => t.technique === technique)).toBe(true);
    const byTheme = (theme: Theme) =>
      all.filter((t) => t.theme === theme).length;
    for (const theme of THEME_LIST)
      expect(byTheme(theme)).toBeGreaterThanOrEqual(5);
    for (const day of [1, 2, 3])
      expect(all.filter((t) => t.day === day).length).toBeGreaterThanOrEqual(
        15,
      );
    const others = THEME_LIST.filter((t) => t !== 'lieu' && t !== 'famille');
    const average =
      others.reduce((sum, t) => sum + byTheme(t), 0) / others.length;
    expect(byTheme('lieu')).toBeGreaterThan(average);
    expect(byTheme('famille')).toBeGreaterThan(average);
  });

  it('question circulaire : toujours par un proche, jamais par le partenaire', () => {
    const circular = staticTemplates().filter(
      (t) => t.technique === 'circulaire',
    );
    expect(circular.length).toBeGreaterThanOrEqual(10);
    for (const t of circular)
      expect(t.text).toMatch(/proche|amis|entourage|famille/i);
  });

  it('échelle : toujours avec sa relance, en une seule question', () => {
    const scales = staticTemplates().filter((t) => t.technique === 'echelle');
    expect(scales.length).toBeGreaterThanOrEqual(10);
    for (const t of scales)
      expect(t.text).toMatch(
        /0 à 10.*pourquoi pas un point de (moins|plus) \?$/,
      );
  });
});

describe('Sécurité, couche IA et résumé pour l’IA', () => {
  const violenceShared = (): ReturnType<typeof buildDivergenceReport> => {
    const report = buildDivergenceReport({}, {});
    report.divergences.push({
      questionId: 'M6_Q04',
      theme: 'communication',
      severity: 'critique',
      label: 'Limite face à la violence physique',
      question: 'La violence physique dans une relation :',
      a: { key: 'C', text: 'Ça dépend des circonstances' },
      b: { key: 'C', text: 'Ça dépend des circonstances' },
      shared: true,
    });
    return report;
  };
  const aiFor = (day: number, themeKey: Theme, text: string) => ({
    day,
    theme: 'x',
    emoji: '💬',
    text,
    options: ['A', 'B', 'C'],
    themeKey,
  });

  it('écart de sécurité partagé (« ça dépend » des deux côtés) : questions de limite, jamais l’IA', () => {
    const report = violenceShared();
    const ai = [
      aiFor(
        1,
        'communication',
        'Qu’est-ce qui vous aide à retrouver le calme après une dispute vive ?',
      ),
    ];
    const safetyTexts = [1, 2, 3].flatMap((day) =>
      SAFETY_TEMPLATES[day].map((t) => t.text),
    );
    for (const history of [[], safetyTexts]) {
      const qs = assembleSondeur({
        report,
        firstNames: ['A', 'B'],
        seed: 'partage',
        aiQuestions: ai,
        preferAi: true,
        history,
      });
      expect(validateSondeurGrid(qs)).toBe(true);
      const comm = qs.filter((q) => q.themeKey === 'communication');
      expect(comm.map((q) => q.subject)).toEqual([
        'securite',
        'securite',
        'securite',
      ]);
      comm.forEach((q) =>
        expect(SAFETY_TEMPLATES[q.day].map((t) => t.text)).toContain(q.text),
      );
    }
    const summary = describeReportForAi(report, ['A', 'B']);
    expect(summary).toMatch(/LIMITE DE SÉCURITÉ/);
    expect(summary).not.toMatch(/Ça dépend/);
  });

  it('même réponse « ça dépend » sur la violence, vue comme un accord : questions de limite aussi', () => {
    const report = buildDivergenceReport({ M6_Q04: 'C' }, { M6_Q04: 'C' });
    const qs = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 'c' });
    expect(
      qs.filter((q) => q.themeKey === 'communication').map((q) => q.subject),
    ).toEqual(['securite', 'securite', 'securite']);
    // Limite absolue des deux côtés : rien à protéger, pas de question de limite imposée.
    const safe = buildDivergenceReport({ M6_Q04: 'A' }, { M6_Q04: 'A' });
    const calm = assembleSondeur({ report: safe, firstNames: ['A', 'B'] });
    expect(calm.some((q) => q.subject === 'securite')).toBe(false);
    expect(calm.some((q) => /violence/i.test(q.text))).toBe(false);
  });

  it('une question de l’IA (toujours relue) passe avant un gabarit ciblé, même sans preferAi', () => {
    const report = buildDivergenceReport({ M0_Q06: 'A' }, { M0_Q06: 'D' });
    const ai = [
      aiFor(
        1,
        'famille',
        'Dans votre famille, qui parlait le plus volontiers des enfants à venir ?',
      ),
    ];
    const qs = assembleSondeur({
      report,
      firstNames: ['A', 'B'],
      aiQuestions: ai,
    });
    expect(
      qs.find((q) => q.day === 1 && q.themeKey === 'famille')?.source,
    ).toBe('ia');
    expect(validateSondeurGrid(qs)).toBe(true);
  });

  it('jour 1 : « Lignes rouges », sous l’angle de ce que chacun protège', () => {
    expect(DAY_ANGLES[1].label).toBe('Lignes rouges');
    expect(DAY_ANGLES[1].intent).toBe('ce que chacun protège');
  });

  it('résumé pour l’IA : chaque accord avec son sujet et la réponse commune', () => {
    const report = buildDivergenceReport(
      { M0_Q05: 'A', M6_Q04: 'A', M1_Q11: 'D' },
      { M0_Q05: 'A', M6_Q04: 'A', M1_Q11: 'D' },
    );
    report.convergences.push({
      questionId: 'M6_Q15',
      theme: 'communication',
      label: 'Même tendance',
      answer: 'Se fermer en dispute : très marqué',
      topic: 'Silence en dispute',
    });
    const summary = describeReportForAi(report, ['A', 'B']);
    expect(summary).toContain(
      "La présence d'enfants : même réponse des deux, « Non, pas d'enfants »",
    );
    expect(summary).toMatch(
      /La limite face à la violence physique : même réponse « Rupture immédiate[^»]*» — LIMITE DE SÉCURITÉ : uniquement des questions de limite/,
    );
    expect(summary).toMatch(
      /La polygamie : les deux préfèrent en parler en personne/,
    );
    expect(summary).toContain(
      'Silence en dispute : même tendance, à explorer sans la citer.',
    );
    expect(summary).not.toMatch(/très marqué/);
    expect(SAFETY_QUESTIONS.has('M6_Q04')).toBe(true);
  });

  it('les gabarits les plus faibles ont disparu', () => {
    const everything = JSON.stringify({
      THEME_POOL,
      TOPIC_DEEP,
      AGREEMENTS,
      CONVERGENT,
      SAFETY_TEMPLATES,
      targeted: renderTopic(TARGETED, 'T').map((t) => t.text),
      shared: renderTopic(SHARED_RISK, 'S').map((t) => t.text),
    });
    expect(everything).not.toMatch(
      /ligne rouge pour vous|Si rien ne bougeait|mettre fin à votre relation|vivable|tendance à|un signal pour fuir|l'un de vous a répondu|cela change-t-il vos sentiments|qu'est-ce que l'autre devrait accepter/i,
    );
  });
});

// ─── Simulation : 300 couples, vrai moteur, vrai assemblage ──────────────────

/** Tirage reproductible (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomAnswer(
  rand: () => number,
  q: (typeof QUESTIONS)[number],
): string {
  const keys = q.options.map((o) => o.key);
  if (!q.multiple) return keys[Math.floor(rand() * keys.length)];
  const n = 1 + Math.floor(rand() * Math.min(q.maxChoices ?? 2, keys.length));
  const picked = new Set<string>();
  while (picked.size < n) picked.add(keys[Math.floor(rand() * keys.length)]);
  return keys.filter((k) => picked.has(k)).join(',');
}

/** Deux entretiens ; `same` : part des réponses identiques chez le second. */
function couple(rand: () => number, same: number): [RawAnswers, RawAnswers] {
  const a: RawAnswers = {};
  const b: RawAnswers = {};
  for (const q of QUESTIONS) {
    a[q.id] = randomAnswer(rand, q);
    b[q.id] = rand() < same ? a[q.id] : randomAnswer(rand, q);
  }
  return [a, b];
}

describe('Simulation : 300 couples aux réponses aléatoires', () => {
  const rand = rng(20261006);
  const runs = Array.from({ length: 300 }, (_, i) => {
    // Un tiers au hasard, un tiers à 60 % puis à 80 % de réponses identiques.
    const [a, b] = couple(rand, [0, 0.6, 0.8][i % 3]);
    const report = buildDivergenceReport(a, b);
    const questions = assembleSondeur({
      report,
      firstNames: ['A', 'B'],
      seed: `parcours-${i}`,
    });
    return { report, questions };
  });

  it('respecte toujours la grille de 21 questions (3 jours × 7 thèmes)', () => {
    for (const { questions } of runs) {
      expect(validateSondeurGrid(questions)).toBe(true);
      for (const day of [1, 2, 3])
        expect(
          questions.filter((q) => q.day === day).map((q) => q.themeKey),
        ).toEqual(THEME_LIST);
      expect(new Set(questions.map((q) => q.text)).size).toBe(21);
    }
  });

  it('0 question hors règles sur 6 300', () => {
    const all = runs.flatMap(({ questions }, i) =>
      questions.map((q) => ({
        where: `couple ${i} J${q.day} ${q.themeKey}`,
        text: q.text,
      })),
    );
    expect(all).toHaveLength(6300);
    expectClean(all);
    for (const { questions } of runs)
      for (const q of questions) {
        expect(optionIssues(q.options)).toEqual([]);
        if (q.day < 3) expect(q.text).not.toMatch(INTIMATE);
      }
  });

  it('ne cite jamais une réponse, un score ou un aveu', () => {
    const cited: string[] = [];
    for (const { report, questions } of runs) {
      const answers = [
        ...report.divergences.flatMap((d) => [d.a.text, d.b.text]),
        ...report.convergences.map((c) => c.answer),
      ].filter((t) => t.length >= 15);
      for (const q of questions) {
        for (const answer of answers)
          if (q.text.includes(answer)) cited.push(`${answer} → ${q.text}`);
        if (
          /très marqué|marqué|Il m’arrive|Ce qui me ferait fuir/i.test(q.text)
        )
          cited.push(q.text);
      }
    }
    expect(cited).toEqual([]);
  });

  it('ne repose aucun sujet d’écart ou d’accord un autre jour, ni un sujet voisin', () => {
    const repeats: string[] = [];
    /** Un sujet, ou sa famille de sujets voisins. */
    const family = (subject: string) => {
      const f = TOPIC_FAMILIES.findIndex((members) =>
        members.includes(subject),
      );
      return f >= 0 ? `famille ${f}` : subject;
    };
    for (const [i, { questions }] of runs.entries()) {
      const days = new Map<string, SondeurQuestion[]>();
      for (const q of questions)
        if (q.subject) {
          const key = q.subject === 'securite' ? q.subject : family(q.subject);
          days.set(key, [...(days.get(key) ?? []), q]);
        }
      for (const [subject, qs] of days) {
        // Sécurité : trois angles distincts (limite, origine, signal d'arrêt).
        if (subject === 'securite') {
          expect(new Set(qs.map((q) => q.day)).size).toBe(qs.length);
          continue;
        }
        if (qs.length > 1)
          repeats.push(
            `couple ${i} : ${subject} (${qs.map((q) => q.day).join(', ')})`,
          );
      }
    }
    expect(repeats).toEqual([]);
  });

  it('cible les écarts réels et explore les accords', () => {
    const sources = runs
      .flatMap(({ questions }) => questions)
      .reduce<
        Record<string, number>
      >((acc, q) => ({ ...acc, [q.source]: (acc[q.source] ?? 0) + 1 }), {});
    expect(sources.divergence).toBeGreaterThan(2000);
    expect(sources.convergence).toBeGreaterThan(100);
    expect(sources.gabarit).toBeGreaterThan(100);
  });

  it('écart sur un point non négociable : jamais « vivre avec » la différence', () => {
    for (const { report, questions } of runs) {
      const strict = new Set(
        report.divergences
          .filter((d) =>
            ['M0_Q06', 'M1_Q11', 'M1_Q05', 'M1_Q06', 'M6_Q10'].includes(
              d.questionId,
            ),
          )
          .map((d) => d.questionId),
      );
      for (const q of questions)
        if (q.subject && strict.has(q.subject))
          expect(q.text).not.toMatch(
            /vivre avec|devenue simple|vous opposerait|samedi ordinaire, dans trois ans, où/,
          );
    }
  });
});

// ─── Contrôle, sécurité, fidélité ────────────────────────────────────────────

describe('Contrôle, sécurité mineure et accords de fidélité', () => {
  /** Signal d'alerte « jalousie et contrôle » de l'un face à l'habitude de l'autre. */
  const jealousy = (): Divergence => ({
    questionId: 'M8_Q10',
    theme: 'communication',
    severity: 'majeure',
    label: 'Signal d’alerte : jalousie et contrôle',
    question: 'Un signal d’alerte de l’un correspond à une habitude de l’autre',
    a: { key: 'B', text: 'Ce qui me ferait fuir : jalousie et contrôle' },
    b: {
      key: 'E',
      text: 'Il m’arrive très souvent que je regarde le téléphone de l’autre',
    },
  });
  const limitsOf = (qs: SondeurQuestion[]) =>
    qs
      .filter((q) => isControlLimit(q.text))
      .map((q) => [q.day, q.themeKey, q.subject]);

  it('jalousie qui surveille (M8_Q10:B majeure) : limite de contrôle au jour 2, avant l’IA', () => {
    const report = buildDivergenceReport({}, {});
    report.divergences.push(jealousy());
    expect(topicKey(report.divergences[0])).toBe('M8_Q10:B');
    const qs = assembleSondeur({
      report,
      firstNames: ['A', 'B'],
      seed: 'controle',
      aiQuestions: [
        {
          day: 2,
          theme: 'x',
          emoji: '💬',
          text: "Qu'est-ce qui vous rassure quand quelqu'un tarde à vous répondre ?",
          options: ['A', 'B', 'C'],
          themeKey: 'communication',
        },
      ],
    });
    expect(validateSondeurGrid(qs)).toBe(true);
    expect(limitsOf(qs)).toEqual([[2, 'communication', 'controle']]);
    // Le signal lui-même reste exploré, un autre jour.
    expect(qs.some((q) => q.subject === 'M8_Q10:B' && q.day === 1)).toBe(true);
  });

  it('accès total au téléphone voulu par l’un (M5_Q08 A) : limite de contrôle au jour 2', () => {
    const report = buildDivergenceReport({ M5_Q08: 'A' }, { M5_Q08: 'B' });
    const qs = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 'tel' });
    expect(limitsOf(qs)).toEqual([[2, 'intimite', 'controle']]);
  });

  it('deux signaux de contrôle : une seule limite de contrôle', () => {
    const report = buildDivergenceReport({ M5_Q08: 'A' }, { M5_Q08: 'B' });
    report.divergences.push(jealousy());
    const qs = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 'x' });
    expect(limitsOf(qs)).toEqual([[2, 'communication', 'controle']]);
    expect(new Set(qs.map((q) => q.text)).size).toBe(21);
  });

  it('contrôle et violence sur le même thème : la limite de contrôle prend le jour 2', () => {
    const report = buildDivergenceReport({ M6_Q04: 'A' }, { M6_Q04: 'C' });
    report.divergences.push(jealousy());
    const qs = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 'v' });
    expect(
      qs.filter((q) => q.themeKey === 'communication').map((q) => q.subject),
    ).toEqual(['securite', 'controle', 'securite']);
  });

  it('thème de sécurité : aucun écart n’y est prévu, et ses voisins restent posés', () => {
    // La jalousie (communication) tombe sur un thème de sécurité : elle ne
    // doit pas bloquer son voisin, l'accès au téléphone (intimité).
    const report = buildDivergenceReport(
      { M6_Q04: 'A', M5_Q08: 'A' },
      { M6_Q04: 'C', M5_Q08: 'B' },
    );
    report.divergences.push(jealousy());
    expect(safetyThemesOf(report)).toEqual(['communication']);
    const qs = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 'w' });
    expect(qs.some((q) => q.subject === 'M5_Q08')).toBe(true);
  });

  it('écart critique sans jour libre : posé un autre jour, sans compromis', () => {
    const critical = (questionId: string): Divergence => ({
      questionId,
      theme: 'spiritualite',
      severity: 'critique',
      label: questionId,
      question: 'Question',
      a: { key: 'A', text: 'Première réponse' },
      b: { key: 'B', text: 'Seconde réponse' },
    });
    const report = buildDivergenceReport({}, {});
    // La polygamie prend le jour 1, les règles alimentaires le jour 2 : la
    // religion de chacun (jours 1 et 2) passe au jour 3.
    report.divergences.push(
      critical('M1_Q11'),
      critical('M1_Q19'),
      critical('M1_Q16'),
    );
    const qs = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 'c' });
    const spi = qs.filter((q) => q.themeKey === 'spiritualite');
    expect(spi.map((q) => q.subject)).toEqual(['M1_Q11', 'M1_Q19', 'M1_Q16']);
    expect(compromiseTextsFor(critical('M1_Q16')).has(spi[2].text)).toBe(false);
  });

  it('écart de sécurité mineur (deux refus de la violence) : le thème reste libre', () => {
    const report = buildDivergenceReport({ M6_Q04: 'A' }, { M6_Q04: 'B' });
    expect(
      report.divergences.find((d) => d.questionId === 'M6_Q04')?.severity,
    ).toBe('mineure');
    expect(safetyThemesOf(report)).toEqual([]);
    const qs = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 'm' });
    expect(qs.some((q) => q.subject === 'securite')).toBe(false);
  });

  it('accord de fidélité (V7) : précisé, jamais mis à l’épreuve', () => {
    for (const key of ['A', 'C']) {
      const report = buildDivergenceReport({ M6_Q18: key }, { M6_Q18: key });
      const { statement, probe } = AGREEMENTS[`M6_Q18:${key}`];
      const tested = [1, 2].flatMap((day) =>
        CONVERGENT[day]
          .filter((t) => t.technique === 'limite')
          .map((t) => `${statement} ${t.text}`),
      );
      const first = assembleSondeur({ report, firstNames: ['A', 'B'] });
      expect(first.map((q) => q.text)).toContain(`${statement} ${probe!.text}`);
      // Question propre déjà vue : la question générique n'éprouve pas l'accord.
      for (let i = 0; i < 10; i++) {
        const qs = assembleSondeur({
          report,
          firstNames: ['A', 'B'],
          seed: `f${i}`,
          history: first.map((q) => q.text),
        });
        const conv = qs.filter((q) => q.text.startsWith(statement));
        expect(conv).toHaveLength(1);
        expect(tested).not.toContain(conv[0].text);
      }
    }
  });
});

// ─── Premier et second parcours : 600 couples ────────────────────────────────

/** Formulations propres (principales et variantes) : le reste est générique. */
const DEEP_TEXTS = new Set(
  [TOPIC_DEEP, TOPIC_DEEP_VARIANTS].flatMap((table) =>
    Object.values(table).flatMap((days) =>
      Object.values(days).map((t) => t!.text),
    ),
  ),
);

/** Jour 3 : ce qu'il faudrait savoir avant de s'engager. */
const BEFORE_COMMITMENT =
  /avant (?:de vous engager|tout engagement|un engagement|de vivre|de partager|même un premier projet)/iu;

/** Formulations de compromis possibles pour un écart (propres et ciblées). */
function compromiseTextsFor(d: Divergence): Set<string> {
  const words = topicWords(topicPhrase(d));
  return new Set(
    [1, 2, 3].flatMap((day) => [
      ...topicDeepAll(d, day)
        .filter((t) => t.compromise)
        .map((t) => t.text),
      ...[...TARGETED[day], ...SHARED_RISK[day]]
        .filter((t) => t.compromise)
        .map((t) => t.text(words)),
    ]),
  );
}

/** Questions de thème et phrases d'accord qui supposent des enfants à venir. */
const CHILDREN_TEXTS = [
  ...THEME_LIST.flatMap((theme) =>
    [1, 2, 3].flatMap((day) =>
      THEME_POOL[theme][day].filter((t) => t.needsChildren).map((t) => t.text),
    ),
  ),
  ...Object.values(AGREEMENTS)
    .filter((a) => a.needsChildren)
    .map((a) => a.statement),
];

describe('Simulation : 600 couples, premier et second parcours', () => {
  const rand = rng(20261007);
  const runs = Array.from({ length: 600 }, (_, i) => {
    const [a, b] = couple(rand, [0, 0.6, 0.8][i % 3]);
    const report = buildDivergenceReport(a, b);
    const first = assembleSondeur({
      report,
      firstNames: ['A', 'B'],
      seed: `p${i}`,
    });
    // Même rapport, toutes les formulations du premier parcours déjà vues :
    // le cas le plus exigeant pour la réserve.
    const second = assembleSondeur({
      report,
      firstNames: ['A', 'B'],
      seed: `q${i}`,
      history: first.map((q) => q.text),
    });
    return { a, b, report, first, second };
  });
  const passes = runs.flatMap((r, i) => [
    { ...r, where: `couple ${i}, 1er parcours`, questions: r.first },
    { ...r, where: `couple ${i}, 2e parcours`, questions: r.second },
  ]);

  it('0 gabarit de compromis servi sur un écart non négociable, au 1er et au 2e parcours', () => {
    const served: string[] = [];
    let strictServed = 0;
    for (const { report, questions, where } of passes) {
      const strictThemes = new Set(
        report.divergences
          .filter((d) => isNonNegotiable(d))
          .map((d) => d.theme),
      );
      for (const q of questions) {
        const d =
          q.source === 'divergence'
            ? report.divergences.find((x) => topicKey(x) === q.subject)
            : undefined;
        if (d && isNonNegotiable(d)) {
          strictServed++;
          if (compromiseTextsFor(d).has(q.text))
            served.push(`${where} ${d.questionId} : ${q.text}`);
        }
        if (
          q.source === 'gabarit' &&
          strictThemes.has(q.themeKey) &&
          THEME_POOL[q.themeKey][q.day].some(
            (t) => t.compromise && t.text === q.text,
          )
        )
          served.push(`${where} [${q.themeKey}] ${q.text}`);
      }
    }
    expect(strictServed).toBeGreaterThan(1000);
    expect(served).toEqual([]);
  });

  it('0 question qui suppose des enfants quand l’un a répondu M0_Q06 = D', () => {
    const presupposes = (q: SondeurQuestion) =>
      CHILDREN_TOPICS.has(q.subject ?? '') ||
      CHILDREN_TEXTS.some((t) => q.text.includes(t));
    const childFree = passes.filter(
      ({ a, b }) => a.M0_Q06 === 'D' || b.M0_Q06 === 'D',
    );
    expect(childFree.length).toBeGreaterThan(100);
    expect(
      childFree.flatMap(({ questions, where }) =>
        questions.filter(presupposes).map((q) => `${where} : ${q.text}`),
      ),
    ).toEqual([]);
    // Les autres couples peuvent toujours les recevoir.
    expect(
      passes.some(
        ({ a, b, questions }) =>
          a.M0_Q06 !== 'D' && b.M0_Q06 !== 'D' && questions.some(presupposes),
      ),
    ).toBe(true);
  });

  it('0 tournure répétée dans un même Sondeur, historique compris', () => {
    const repeated: string[] = [];
    for (const { questions, where } of passes) {
      expect(validateSondeurGrid(questions)).toBe(true);
      expect(new Set(questions.map((q) => q.text)).size).toBe(21);
      const sigs = questions.map((q) => questionSignature(q.text));
      if (new Set(sigs).size !== sigs.length) repeated.push(where);
    }
    expect(repeated).toEqual([]);
  });

  it('signal de contrôle (M8_Q10:B ou M5_Q08 A) : limite de contrôle servie au jour 2', () => {
    const control = passes.filter(({ report }) =>
      report.divergences.some(
        (d) =>
          topicKey(d) === 'M8_Q10:B' ||
          (d.questionId === 'M5_Q08' && (d.a.key === 'A' || d.b.key === 'A')),
      ),
    );
    expect(control.length).toBeGreaterThan(50);
    for (const { questions } of control)
      expect(
        questions.filter((q) => isControlLimit(q.text)).map((q) => q.day),
      ).toEqual([2]);
    // Sans signal de contrôle, jamais.
    expect(
      passes
        .filter((p) => !control.includes(p))
        .some(({ questions }) => questions.some((q) => isControlLimit(q.text))),
    ).toBe(false);
  });

  it('toutes les questions servies passent la grille de forme', () => {
    const all = passes.flatMap(({ questions, where }) =>
      questions.map((q) => ({ where, text: q.text })),
    );
    expect(all).toHaveLength(25200);
    expect(
      all
        .filter((q) => !passesFormRules(q.text))
        .map((q) => `${q.where} : ${q.text}`),
    ).toEqual([]);
  });

  it('moins de 15 % de questions d’écart génériques au 1er parcours', () => {
    const div = runs.flatMap(({ first }) =>
      first.filter(
        (q) =>
          q.source === 'divergence' &&
          q.subject !== 'securite' &&
          q.subject !== 'controle',
      ),
    );
    const generic = div.filter((q) => !DEEP_TEXTS.has(q.text));
    const share = (100 * generic.length) / div.length;
    console.log(
      `Questions d'écart génériques au 1er parcours (600 couples) : ${generic.length}/${div.length} = ${share.toFixed(1)} %`,
    );
    expect(div.length).toBeGreaterThan(3000);
    expect(share).toBeLessThan(15);
  });

  it('moins de 15 % de questions d’écart génériques au 2e parcours', () => {
    // Toutes les questions du 1er parcours déjà vues : chaque sujet servi en
    // formulation propre au même jour doit en avoir une seconde.
    const div = runs.flatMap(({ second }) =>
      second.filter(
        (q) =>
          q.source === 'divergence' &&
          q.subject !== 'securite' &&
          q.subject !== 'controle',
      ),
    );
    const generic = div.filter((q) => !DEEP_TEXTS.has(q.text));
    const share = (100 * generic.length) / div.length;
    console.log(
      `Questions d'écart génériques au 2e parcours (600 couples) : ${generic.length}/${div.length} = ${share.toFixed(1)} %`,
    );
    expect(div.length).toBeGreaterThan(3000);
    expect(share).toBeLessThan(15);
  });

  it('jour 3 : gabarits ciblés sans « la question de… », sous l’angle « avant de s’engager »', () => {
    const strict = TARGETED[3].filter((t) => !t.compromise);
    expect(strict.length).toBeGreaterThanOrEqual(8);
    for (const phrase of ALL_PHRASES)
      for (const t of TARGETED[3]) {
        const text = t.text(topicWords(phrase));
        expect(text).not.toMatch(
          /la question d|devenue simple|vous opposerait/,
        );
        if (!t.compromise) expect(text).toMatch(BEFORE_COMMITMENT);
      }
  });

  it('jour 3 sur un sujet non négociable : au moins 90 % sous l’angle « avant de s’engager »', () => {
    for (const pass of ['first', 'second'] as const) {
      const day3 = runs.flatMap(({ report, [pass]: questions }) =>
        questions.filter((q) => {
          if (q.day !== 3 || q.source !== 'divergence') return false;
          const d = report.divergences.find((x) => topicKey(x) === q.subject);
          return !!d && isNonNegotiable(d);
        }),
      );
      const inAngle = day3.filter((q) => BEFORE_COMMITMENT.test(q.text));
      const share = (100 * inAngle.length) / day3.length;
      console.log(
        `Jour 3 sur un sujet non négociable, angle « avant de s'engager » (${pass === 'first' ? '1er' : '2e'} parcours) : ${inAngle.length}/${day3.length} = ${share.toFixed(1)} %`,
      );
      expect(day3.length).toBeGreaterThan(300);
      expect(share).toBeGreaterThanOrEqual(90);
    }
  });

  it('aucun compromis servi dans un thème non négociable, même sur un sujet voisin', () => {
    const served: string[] = [];
    let neighbours = 0;
    for (const { report, questions, where } of passes) {
      const strictThemes = new Set(
        report.divergences
          .filter((d) => isNonNegotiable(d))
          .map((d) => d.theme),
      );
      for (const q of questions) {
        if (q.source !== 'divergence' || !strictThemes.has(q.themeKey))
          continue;
        const d = report.divergences.find((x) => topicKey(x) === q.subject);
        if (!d || isNonNegotiable(d)) continue;
        neighbours++;
        if (compromiseTextsFor(d).has(q.text))
          served.push(`${where} ${d.questionId} : ${q.text}`);
      }
    }
    expect(neighbours).toBeGreaterThan(500);
    expect(served).toEqual([]);
  });
});
