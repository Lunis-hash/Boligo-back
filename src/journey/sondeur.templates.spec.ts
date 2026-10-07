import { readFileSync } from 'fs';
import { join } from 'path';
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
  DivergenceReport,
  RawAnswers,
  THEME_LIST,
  Theme,
  buildDivergenceReport,
} from '../matching/divergence.engine';
import { RED_FLAG_HABITS } from '../psychometrics/psychometrics';
import {
  BODY_HEALTH,
  COMPROMISE,
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
  RELIGIOUS_OPTION,
  SAFETY_QUESTIONS,
  SAFETY_TEMPLATES,
  SELF_DISCLOSURE_QUESTIONS,
  SondeurQuestion,
  assembleSondeur,
  describeReportForAi,
  hasNoReligiousPractice,
  neutralOptions,
  questionOpening,
  questionSignature,
  safetyThemesOf,
  validateSondeurGrid,
} from './sondeur.generator';
import {
  AGREEMENTS,
  AGREEMENT_CONTRADICTIONS,
  Agreement,
  CHILDREN_TOPICS,
  CONVERGENT,
  PoolTemplate,
  RECOMPOSED_TOPICS,
  SHARED_RISK,
  TARGETED,
  THEME_FALLBACK_PHRASES,
  THEME_POOL,
  TOPIC_DAYS,
  TOPIC_DEEP,
  TOPIC_DEEP_FOURTH,
  TOPIC_DEEP_THIRD,
  TOPIC_DEEP_VARIANTS,
  TOPIC_FAMILIES,
  TOPIC_PHRASES,
  Technique,
  TopicTemplate,
  agreementFor,
  agreementKey,
  agreementProbes,
  isNonNegotiable,
  topicDays,
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

/** Mot interrogatif qui ouvre une seconde interrogation coordonnée. */
const SECOND_QUESTION = `(?:qu['’]est-ce|qu['’]${L}+-(?:t-)?(?:vous|il|elle|on)|que\\s+${L}+-(?:t-)?(?:vous|il|elle|on)|quel(?:le)?s?(?!${L})|qui(?!${L})|quoi(?!${L})|comment(?!${L})|où(?!${L})|pourquoi(?!${L})|combien(?!${L})|lequel|laquelle)`;
/** « …, et comment ? », « …, ou que perdait-on ? », « …, et au bout de combien de temps ? » */
const COORDINATED_QUESTION = new RegExp(
  `,\\s*(?:et|ou)\\s+(?:(?:à|au bout de|dans|de|d['’]|pour|avec|par|sur|en|depuis|jusqu['’]à|selon|après|avant)\\s+)?${SECOND_QUESTION}`,
  'iu',
);
/** « … et comment… », « … et à quel moment… », sans virgule. */
const BARE_COORDINATED_QUESTION =
  /\set\s+(?:comment|pourquoi|combien|au bout de combien|à quel moment)(?!\p{L})/iu;
/** Deux verbes interrogatifs coordonnés (« que gagnait-on ou que perdait-on »). */
const INVERTED_VERB = `(?<!${L})(?!rendez-vous)${L}+-(?:t-)?(?:vous|il|elle|on)(?!${L})`;
const TWO_INVERTED_VERBS = new RegExp(
  `${INVERTED_VERB}[^?]*\\s(?:et|ou)\\s[^?]*${INVERTED_VERB}`,
  'iu',
);
/** Relance d'une échelle : une seule question avec son « pourquoi ce chiffre ». */
const SCALE_FOLLOW_UP =
  /,\s*et\s+(?:pourquoi pas un point de (?:moins|plus)|qu['’]est-ce qui vous fait choisir ce chiffre)\s*\?$/iu;

/** Deux questions en une : deux « ? », ou deux interrogations coordonnées. */
function isDoubleQuestion(text: string): boolean {
  if ((text.match(/\?/g) ?? []).length >= 2) return true;
  const t = /de 0 à 10/iu.test(text)
    ? text.replace(SCALE_FOLLOW_UP, ' ?')
    : text;
  return (
    COORDINATED_QUESTION.test(t) ||
    BARE_COORDINATED_QUESTION.test(t) ||
    TWO_INVERTED_VERBS.test(t)
  );
}

/**
 * Plan de mise en sécurité : ce que l'on ferait pour se protéger, où l'on
 * irait, comment fuir. L'autre lit la réponse : jamais demandé.
 */
const PROTECTION_PLAN =
  /(?<![\p{L}-])(?:vous|se|me) protéger|(?<!\p{L})(?:fuir|partir où|où iriez|refuge|mettre à l['’]abri)/iu;
/** Version large, pour les questions de limite (texte et grille cachée). */
const PROTECTION_PLAN_WIDE =
  /protég|fuir|partir où|où iriez|refuge|mettre à l['’]abri/iu;
const PROTECTION_OPTIONS =
  /partir|fuir|refuge|abri|association|secours|appeler/iu;
/** Récit d'une scène vécue ou vue (violence, cris) : jamais devant un inconnu. */
const LIVED_SCENE =
  /avez-vous vu|avez-vous vécu|souvenir|en grandissant[^?]*(?:violence|coups|cris)|raconte/iu;

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
  ...Object.entries(TOPIC_DEEP_THIRD).flatMap(([id, days]) =>
    Object.entries(days).map(([day, t]) => ({
      where: `TOPIC_DEEP_THIRD.${id}[${day}]`,
      ...(t as PoolTemplate),
    })),
  ),
  ...Object.entries(TOPIC_DEEP_FOURTH).flatMap(([id, days]) =>
    Object.entries(days).map(([day, t]) => ({
      where: `TOPIC_DEEP_FOURTH.${id}[${day}]`,
      ...(t as PoolTemplate),
    })),
  ),
];

/** Phrase d'accord + question (sans phrase : la question seule). */
const joinAgreement = (statement: string, text: string) =>
  statement ? `${statement} ${text}` : text;

/**
 * Relances propres d'un accord : la principale, sa variante, la troisième,
 * puis les supplémentaires.
 */
const ownProbes = (a: Agreement): PoolTemplate[] => agreementProbes(a);

/**
 * Angle du jour d'une relance d'accord, reconnu dans le texte : jour 1, ce
 * que chacun protège ou la limite de l'accord ; jour 2, d'où vient la
 * position ; jour 3, comment chacun le vivrait au quotidien, ce qu'il
 * faudrait savoir avant de s'engager.
 */
const DAY_ANGLE_TEXT: Record<number, RegExp> = {
  1: /protèg|protég|préserv|garder|gardant|garderiez|précieu|essentiel|tenez|tiendriez|ne lâcheriez|ne se (?:discute|négocie|partage)|ne pourr|non négociable|jamais|frontière|limite|jusqu['’]|où (?:commence|s['’]arrête|passe)|s['’]arrêter|à partir de quel|distingu|abîm|malgré tout|hors de question|intact|brûler|geste précis|combien de temps|cess|resterait|perdre|refus|changer d['’]avis/iu,
  2: /d['’]où vous vien|qui vous a |de qui (?:tenez|avez)|quel exemple|qui,? (?:dans|autour de) (?:votre entourage|vous)|dans votre (?:famille|histoire|entourage)|de votre (?:propre )?enfance|en grandissant|transmis|appris|qu['’]est-ce qui vous a |vous a (?:montré|donné|convaincu)|où vous avez grandi|quel couple, autour|quelle famille, autour/iu,
  3: /quotidien|ordinaire|une semaine|tous les jours|vie à deux|vie commune|une fois|futur foyer|foyer commun|vie du foyer|sous le même toit|avant (?:de |d['’]|tout |le |la |l['’]|cette )|dès le début|que l['’]autre (?:sache|fasse|entende)|le jour où|le jour d['’]|concrètement|premiers temps|au bout d|au fil d|semaine après semaine|fin du mois|à la maison|chez vous|chez-vous|famille recomposée|nouvelle ville|le lendemain|ce jour-là|années à venir|le moment venu|pendant ce temps|d['’]une rencontre|comment aimeriez-vous|comment imaginez-vous|imagin|vous aiderait|chang|construire|partagée/iu,
};

/** Questions de limite (sécurité et contrôle), avec leur grille cachée. */
const limitTemplates = (): Array<{
  where: string;
  text: string;
  options: string[];
}> => [
  ...[1, 2, 3].flatMap((day) =>
    SAFETY_TEMPLATES[day].map((t, i) => ({
      where: `SAFETY_TEMPLATES[${day}][${i}]`,
      ...t,
    })),
  ),
  ...CONTROL_LIMITS.map((t, i) => ({ where: `CONTROL_LIMITS[${i}]`, ...t })),
];

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
    for (const [key, a] of Object.entries(AGREEMENTS))
      for (const probe of ownProbes(a)) {
        all.push({
          where: `AGREEMENTS.${key}`,
          text: joinAgreement(a.statement, probe.text),
        });
        expect(optionIssues(probe.options)).toEqual([]);
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
    // Trois formulations par jour : toutes finissent par être servies.
    for (const day of [1, 2, 3]) expect(SAFETY_TEMPLATES[day]).toHaveLength(3);
    expect(texts.size).toBe(9);
    expectClean([...texts].map((text) => ({ where: 'SAFETY', text })));
    for (const day of [1, 2, 3])
      for (const t of SAFETY_TEMPLATES[day])
        expect(optionIssues([...t.options, 'Autre...'])).toEqual([]);
    // Trois angles distincts, sans quasi-doublon entre eux.
    const limits = limitTemplates();
    const close: string[] = [];
    for (let i = 0; i < limits.length; i++)
      for (let j = i + 1; j < limits.length; j++)
        if (similarQuestions(limits[i].text, limits[j].text))
          close.push(`${limits[i].where} ≈ ${limits[j].where}`);
    expect(close).toEqual([]);
  });

  it('sécurité : jamais de réconciliation, seulement la limite, sa valeur et son respect', () => {
    const all = [1, 2, 3].flatMap((day) => SAFETY_TEMPLATES[day]);
    for (const t of all)
      expect(t.text).not.toMatch(
        /réconcili|baisser les armes|reprendre plus tard|revenir vers|pardon|excuse|compromis|vivable|reparler|premier pas/i,
      );
    const day3 = SAFETY_TEMPLATES[3].map((t) => t.text).join(' | ');
    expect(day3).toMatch(/limite/);
    expect(day3).toMatch(/respectée/);
  });

  it('limites : une norme partagée ou une valeur, jamais un seuil personnel ni un point de rupture', () => {
    // L'autre lit la réponse : « à quel moment ne vous sentiriez-vous plus en
    // sécurité ? » ou « même une seule fois » lui apprendrait le seuil de
    // chacun, qu'un partenaire contrôlant pourrait approcher sans le franchir.
    const THRESHOLD =
      /à quel moment|à partir de quand|à partir de combien|combien de fois|une seule fois|plus en sécurité|ne vous sentiriez plus|point de rupture|jusqu['’]où/iu;
    const limits = limitTemplates();
    expect(limits.length).toBeGreaterThanOrEqual(12);
    expect(
      limits
        .filter(
          (t) => THRESHOLD.test(t.text) || THRESHOLD.test(t.options.join(' ')),
        )
        .map((t) => `${t.where} : ${t.text}`),
    ).toEqual([]);
    // Ni négociable ni conditionnel.
    for (const t of limits)
      expect(`${t.where} ${t.text}`).not.toMatch(
        /(?<!non )négociable|ça dépend|selon les cas|à quelles conditions|souplesse|compromis/iu,
      );
  });

  it('limite de contrôle : trois formulations, dont une valeur ou un principe', () => {
    expect(CONTROL_LIMITS).toHaveLength(3);
    expect(
      CONTROL_LIMITS.filter((t) => /valeur|principe/iu.test(t.text)).length,
    ).toBeGreaterThanOrEqual(1);
    for (const t of CONTROL_LIMITS) {
      expect(formIssues(t.text)).toEqual([]);
      expect(t.text).not.toMatch(LIVED_SCENE);
      expect(t.text).not.toMatch(PROTECTION_PLAN_WIDE);
      expect(t.options.join(' ')).not.toMatch(PROTECTION_OPTIONS);
      expect(optionIssues([...t.options, 'Autre...'])).toEqual([]);
    }
  });

  it('relances d’accord : chacune sous l’angle d’un jour, et chaque accord en a une pour chacun de ses jours', () => {
    // Angle déclaré (protège / origine / quotidien) confirmé par le texte.
    const mislabelled: string[] = [];
    const missing: string[] = [];
    for (const [key, a] of Object.entries(AGREEMENTS)) {
      const probes = ownProbes(a);
      for (const t of probes)
        if (t.angle && !DAY_ANGLE_TEXT[t.angle].test(t.text))
          mislabelled.push(`${key} [${t.angle}] ${t.text}`);
      const qid = key.split(':')[0];
      const strict = isNonNegotiable({
        questionId: qid,
        label: '',
        theme: 'famille',
      });
      for (const day of topicDays({
        questionId: qid,
        label: '',
        theme: 'famille',
      }))
        if (
          !probes.some(
            (t) => t.angle === day && !(strict && t.technique === 'limite'),
          )
        )
          missing.push(`${key} J${day}`);
    }
    expect(mislabelled).toEqual([]);
    expect(missing).toEqual([]);
    // Questions d'accord du jour : toutes sous l'angle du jour.
    for (const day of [1, 2, 3])
      for (const t of CONVERGENT[day]) {
        expect(`${day} ${t.text} ${t.angle}`).toBe(`${day} ${t.text} ${day}`);
        expect(t.text).toMatch(DAY_ANGLE_TEXT[day]);
      }
    // Au jour 2, toujours une origine.
    const origins = Object.values(AGREEMENTS)
      .flatMap((a) => ownProbes(a))
      .filter((t) => t.angle === 2);
    expect(origins.length).toBeGreaterThan(60);
    for (const t of origins) expect(t.technique).toBe('origine');
  });

  it('apostrophes : jamais droites et courbes mêlées dans une même question servie', () => {
    const mixed = (text: string) => /'/.test(text) && /’/.test(text);
    const written = [
      ...staticTemplates().map((t) => t.text),
      ...renderTopic(TARGETED, 'T').map((t) => t.text),
      ...renderTopic(SHARED_RISK, 'S').map((t) => t.text),
      ...limitTemplates().map((t) => t.text),
      ...Object.values(AGREEMENTS).flatMap((a) =>
        [...ownProbes(a), ...[1, 2, 3].flatMap((day) => CONVERGENT[day])].map(
          (t) => joinAgreement(a.statement, t.text),
        ),
      ),
    ];
    expect(written.filter(mixed)).toEqual([]);
  });

  it('sécurité : aucun gabarit ne demande ce que l’on ferait pour se protéger, où l’on irait, ni un plan de fuite', () => {
    // Questions de limite : version large, sur le texte et la grille cachée.
    const limits = limitTemplates();
    expect(
      limits
        .filter(
          (t) =>
            PROTECTION_PLAN_WIDE.test(t.text) ||
            PROTECTION_OPTIONS.test(t.options.join(' | ')),
        )
        .map((t) => `${t.where} : ${t.text} (${t.options.join(' / ')})`),
    ).toEqual([]);
    // Toutes les autres formulations écrites à l'avance.
    const written = [
      ...staticTemplates(),
      ...renderTopic(TARGETED, 'TARGETED'),
      ...renderTopic(SHARED_RISK, 'SHARED_RISK'),
      ...Object.entries(AGREEMENTS).flatMap(([key, a]) =>
        ownProbes(a).map((t) => ({
          where: `AGREEMENTS.${key}`,
          text: joinAgreement(a.statement, t.text),
        })),
      ),
      ...[1, 2, 3].flatMap((day) =>
        CONVERGENT[day].map((t, i) => ({
          where: `CONVERGENT[${day}][${i}]`,
          text: t.text,
        })),
      ),
    ];
    expect(
      written
        .filter((t) => PROTECTION_PLAN.test(t.text))
        .map((t) => `${t.where} : ${t.text}`),
    ).toEqual([]);
    // Servies face à la violence : jamais un plan de mise en sécurité.
    const violent = buildDivergenceReport({ M6_Q04: 'A' }, { M6_Q04: 'C' });
    for (let i = 0; i < 40; i++)
      for (const q of assembleSondeur({
        report: violent,
        firstNames: ['A', 'B'],
        seed: `p${i}`,
      }))
        expect(q.text).not.toMatch(PROTECTION_PLAN);
  });

  it('sécurité : aucun gabarit de limite ne fait raconter une scène vécue ; le jour 2 demande une valeur', () => {
    const limits = limitTemplates();
    expect(
      limits
        .filter((t) => LIVED_SCENE.test(t.text))
        .map((t) => `${t.where} : ${t.text}`),
    ).toEqual([]);
    // Jour 2 (« d'où viennent vos positions ») : la valeur ou le principe qui
    // rend la limite non négociable, jamais ce qui a été vécu ou vu.
    for (const t of SAFETY_TEMPLATES[2])
      expect(t.text).toMatch(/valeur|principe/);
  });

  it('les questions les plus intimes ne sont posées qu’au jour 3', () => {
    for (const theme of THEME_LIST)
      for (const day of [1, 2])
        for (const t of THEME_POOL[theme][day])
          expect(`${day} ${t.text}`).not.toMatch(INTIMATE);
    for (const [id, days] of [
      ...Object.entries(TOPIC_DEEP),
      ...Object.entries(TOPIC_DEEP_VARIANTS),
      ...Object.entries(TOPIC_DEEP_THIRD),
      ...Object.entries(TOPIC_DEEP_FOURTH),
    ])
      for (const [day, t] of Object.entries(days))
        if (day !== '3') expect(`${id} ${t!.text}`).not.toMatch(INTIMATE);
    // Les sujets intimes eux-mêmes ne sont prévus qu'au jour 3.
    for (const id of ['M6_Q06', 'M6_Q07']) expect(TOPIC_DAYS[id]).toEqual([3]);
  });

  it('aucune option cachée ne présuppose une situation (enfants, séparation, ex, migration, monnaie)', () => {
    /** Fin d'une relation, ex, relation passée, migration, monnaie d'un pays. */
    const SITUATION =
      /séparation|divorc|rupture|veuv|deuil|(?<!\p{L})ex(?!\p{L})|ex-|relation passée|ancienne relation|retour aux sources|pays d['’]origine|exil|(?<!\p{L})euros?(?!\p{L})|fcfa/iu;
    /** Sujets où des enfants sont déjà en question. */
    const CHILD_SUBJECTS = new Set([
      'M0_Q06',
      'M0_Q05',
      'M3_Q04',
      'M8_Q15',
      'M1_Q13',
    ]);
    /** Questions sur la famille où l'on a grandi : « les enfants », c'est soi. */
    const FAMILY_OF_ORIGIN = new Set([
      'Dans votre famille, qui faisait le premier pas après un conflit ?',
      'Dans chaque famille, certains sujets reviennent toujours : lequel, dans la vôtre, aimeriez-vous garder hors de votre foyer ?',
    ]);
    const all: Array<{ where: string; options: string[]; children: boolean }> =
      [
        ...THEME_LIST.flatMap((theme) =>
          [1, 2, 3].flatMap((day) =>
            THEME_POOL[theme][day].map((t, i) => ({
              where: `THEME_POOL.${theme}[${day}][${i}]`,
              options: t.options,
              children: !!t.needsChildren || FAMILY_OF_ORIGIN.has(t.text),
            })),
          ),
        ),
        ...[
          TOPIC_DEEP,
          TOPIC_DEEP_VARIANTS,
          TOPIC_DEEP_THIRD,
          TOPIC_DEEP_FOURTH,
        ].flatMap((table) =>
          Object.entries(table).flatMap(([id, days]) =>
            Object.entries(days).map(([day, t]) => ({
              where: `${id}[${day}]`,
              options: t!.options,
              children: CHILD_SUBJECTS.has(id),
            })),
          ),
        ),
        ...[TARGETED, SHARED_RISK, CONVERGENT, SAFETY_TEMPLATES].flatMap(
          (table, n) =>
            [1, 2, 3].flatMap((day) =>
              (table[day] as Array<{ options: string[] }>).map((t, i) => ({
                where: `table ${n}[${day}][${i}]`,
                options: t.options,
                children: false,
              })),
            ),
        ),
        ...CONTROL_LIMITS.map((t, i) => ({
          where: `CONTROL_LIMITS[${i}]`,
          options: t.options,
          children: false,
        })),
        ...Object.entries(AGREEMENTS).flatMap(([key, a]) =>
          ownProbes(a).map((t) => ({
            where: `AGREEMENTS.${key}`,
            options: t.options,
            children:
              !!a.needsChildren || CHILD_SUBJECTS.has(key.split(':')[0]),
          })),
        ),
      ];
    expect(all.length).toBeGreaterThan(400);
    const bad: string[] = [];
    for (const { where, options, children } of all)
      for (const o of options) {
        if (SITUATION.test(o)) bad.push(`${where} : ${o}`);
        if (/enfant/iu.test(o) && !children && o !== 'Avoir des enfants ou non')
          bad.push(`${where} : ${o}`);
      }
    expect(bad).toEqual([]);
  });

  it('aucune question double (deux « ? », ou deux interrogations coordonnées par « et » / « ou »)', () => {
    // Le détecteur reconnaît les questions doubles relevées par le contre-audit…
    for (const text of [
      'Dans une famille recomposée, qui poserait les règles, selon vous, et comment ?',
      "Après une dispute, qu'est-ce qui vous ramène à la douceur, et au bout de combien de temps ?",
      "Qu'est-ce qui, chez quelqu'un, fait naître votre attirance, et à quel moment d'une rencontre ?",
      'Dans votre famille, que gagnait-on, ou que perdait-on, à avoir raison dans une dispute ?',
      "Dans votre famille, qu'est-ce qu'on prêtait volontiers, et qu'est-ce qu'on gardait pour soi ?",
      'Que ressentez-vous ? Et que diriez-vous ?',
    ])
      expect(`${text} → ${isDoubleQuestion(text)}`).toBe(`${text} → true`);
    // … sans compter l'échelle et sa relance, ni deux noms coordonnés.
    for (const text of [
      'De 0 à 10, à quel point aimez-vous que l’avenir soit planifié, et pourquoi pas un point de moins ?',
      "De 0 à 10, quelle place aimeriez-vous laisser à vos familles dans votre vie à deux, et qu'est-ce qui vous fait choisir ce chiffre ?",
      "Au quotidien, quel geste ou quelle parole de l'autre vous montrerait que votre limite de sécurité est respectée ?",
      "Pour vous, à quel endroit ou à quel moment la cigarette n'aurait-elle jamais sa place ?",
      'Quelle part de votre culture avez-vous reçue sans la choisir, et que vous êtes fier(ère) de porter ?',
    ])
      expect(`${text} → ${isDoubleQuestion(text)}`).toBe(`${text} → false`);
    const written = [
      ...staticTemplates(),
      ...renderTopic(TARGETED, 'TARGETED'),
      ...renderTopic(SHARED_RISK, 'SHARED_RISK'),
      ...limitTemplates(),
      ...Object.entries(AGREEMENTS).flatMap(([key, a]) =>
        ownProbes(a).map((t) => ({
          where: `AGREEMENTS.${key}`,
          text: joinAgreement(a.statement, t.text),
        })),
      ),
      ...[1, 2, 3].flatMap((day) =>
        CONVERGENT[day].map((t, i) => ({
          where: `CONVERGENT[${day}][${i}]`,
          text: t.text,
        })),
      ),
    ];
    expect(written.length).toBeGreaterThan(2000);
    expect(
      written
        .filter((t) => isDoubleQuestion(t.text))
        .map((t) => `${t.where} : ${t.text}`),
    ).toEqual([]);
  });
});

describe('Gabarits du Sondeur : quasi-doublons et redites de l’entretien', () => {
  const statics = [
    ...staticTemplates(),
    ...Object.entries(AGREEMENTS).flatMap(([key, a]) =>
      ownProbes(a).map((t) => ({ where: `AGREEMENTS.${key}`, text: t.text })),
    ),
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
    // Famille : la tournure de repli dans un gabarit ciblé.
    expect(
      qs.some(
        (q) =>
          q.themeKey === 'famille' &&
          q.source === 'divergence' &&
          q.text.includes(THEME_FALLBACK_PHRASES.famille),
      ),
    ).toBe(true);
    // Intimité : jamais de gabarit générique, même pour une règle inconnue ;
    // sans formulation propre, le créneau prend une question du thème.
    const intimite = qs.filter((q) => q.themeKey === 'intimite');
    expect(intimite.filter((q) => q.source === 'divergence')).toEqual([]);
    for (const q of intimite)
      expect(THEME_POOL.intimite[q.day].map((t) => t.text)).toContain(q.text);
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

  it('échelle : toujours avec sa relance, en une seule question, jamais orientée vers le haut', () => {
    const scales = staticTemplates().filter((t) => t.technique === 'echelle');
    expect(scales.length).toBeGreaterThanOrEqual(10);
    for (const t of scales)
      expect(t.text).toMatch(
        /0 à 10.*(?:pourquoi pas un point de moins|et qu['’]est-ce qui vous fait choisir ce chiffre) \?$/,
      );
    // « Pourquoi pas un point de plus ? » pousse vers davantage (famille,
    // argent commun, foi) : la relance reste neutre.
    expect(
      staticTemplates().filter((t) => /un point de plus/.test(t.text)),
    ).toEqual([]);
    const faith = THEME_POOL.spiritualite[3].find(
      (t) => t.technique === 'echelle',
    );
    expect(faith?.text).toMatch(/la foi ou à vos convictions/);
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

  it('réponse à risque (« ça dépend », « je ne sais pas », « passer outre ») : le thème reste réservé aux limites, même pour un écart mineur', () => {
    for (const [question, a, b] of [
      ['M6_Q04', 'B', 'D'],
      ['M6_Q05', 'C', 'D'],
      ['M6_Q05', 'B', 'D'],
    ] as const) {
      const report = buildDivergenceReport(
        { [question]: a },
        { [question]: b },
      );
      const theme = safetyThemesOf(report);
      expect(theme.length).toBe(1);
      const qs = assembleSondeur({
        report,
        firstNames: ['A', 'B'],
        seed: question + a + b,
      });
      expect(
        qs
          .filter((q) => q.themeKey === theme[0])
          .every((q) => q.subject === 'securite'),
      ).toBe(true);
    }
  });

  it('aucune relance d’échelle orientée (« pourquoi pas un point de plus / de moins »), aucun « premier enfant » supposé', () => {
    const source = ['sondeur.pool.ts', 'sondeur.generator.ts']
      .map((f) => readFileSync(join(__dirname, f), 'utf8'))
      .join('\n');
    expect(source.match(/pourquoi pas un point/gi)).toBeNull();
    expect(source.match(/premier enfant/gi)).toBeNull();
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
      TOPIC_DEEP_VARIANTS,
      TOPIC_DEEP_THIRD,
      TOPIC_DEEP_FOURTH,
      AGREEMENTS,
      CONVERGENT,
      SAFETY_TEMPLATES,
      CONTROL_LIMITS,
      targeted: renderTopic(TARGETED, 'T').map((t) => t.text),
      shared: renderTopic(SHARED_RISK, 'S').map((t) => t.text),
    });
    expect(everything).not.toMatch(
      /ligne rouge pour vous|Si rien ne bougeait|mettre fin à votre relation|vivable|tendance à|un signal pour fuir|l'un de vous a répondu|cela change-t-il vos sentiments|qu'est-ce que l'autre devrait accepter/i,
    );
    // Quatrième contre-audit : plan de mise en sécurité, accommodement sur le
    // désir, présupposés, rôles, contrôle, repères culturels, langue.
    expect(everything).not.toMatch(
      /feriez-vous pour vous protéger|ne se rencontreraient pas, qu'attendriez|Proposer un moment|Écouter son besoin|à quelles conditions un déménagement|faisait passer son travail|quoi qu'en pense votre famille|voir partagée, avant même|vous engager maintenant|une ancienne histoire|vos anciennes relations|consultait votre téléphone|savoir où est l'autre|désiré\(e\)|dimanche|voie spirituelle|acceptable ou inacceptable|aux journées|qu'on verra en parlant|D'ici un engagement officiel|vous sembleraient réunies|limite est franchie|votre future vie à deux|selon vous, et comment|point de plus|Beaucoup","Un peu","Rien/i,
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
      const agreement = AGREEMENTS[`M6_Q18:${key}`];
      const { statement } = agreement;
      const tested = [1, 2].flatMap((day) =>
        CONVERGENT[day]
          .filter((t) => t.technique === 'limite')
          .map((t) => `${statement} ${t.text}`),
      );
      const first = assembleSondeur({ report, firstNames: ['A', 'B'] });
      // Une relance propre, écrite pour l'angle du jour où l'accord est posé.
      const served = first.find((q) => q.text.startsWith(statement))!;
      const own = agreementProbes(agreement).find(
        (t) => served.text === `${statement} ${t.text}`,
      );
      expect(own?.angle).toBe(served.day);
      expect(own?.technique).not.toBe('limite');
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

/** Formulations propres (principales, variantes, troisièmes) : le reste est générique. */
const DEEP_TEXTS = new Set(
  [
    TOPIC_DEEP,
    TOPIC_DEEP_VARIANTS,
    TOPIC_DEEP_THIRD,
    TOPIC_DEEP_FOURTH,
  ].flatMap((table) =>
    Object.values(table).flatMap((days) =>
      Object.values(days).map((t) => t!.text),
    ),
  ),
);

/**
 * Jour 3 : ce qu'il faudrait savoir avant de s'engager, sous l'une des
 * formules de l'angle (variées, pour ne pas répéter trois fois la même).
 */
const BEFORE_COMMITMENT =
  /avant (?:de vous engager|tout engagement|un engagement|de vivre|de partager|même|de dire oui|de vous dire oui|une vie commune|d['’]unir vos vies)|pour une vie à deux|au quotidien, à deux/iu;

/**
 * Formules d'angle qui ne doivent pas revenir trois fois dans une journée
 * (liste indépendante de celle du générateur).
 */
const ANGLE_FORMULAS: RegExp[] = [
  /avant (?:de vous engager|de s['’]engager|tout engagement|un engagement)/iu,
  /avant (?:de vivre|une vie commune|de partager un foyer)/iu,
  /avant de (?:vous )?dire oui/iu,
  /avant d['’]unir vos vies/iu,
  /pour une vie à deux/iu,
  /au quotidien, à deux/iu,
];

/** Une journée où une même formule d'angle revient trois fois ou plus. */
function repeatsFormula(questions: SondeurQuestion[]): boolean {
  return [1, 2, 3].some((day) =>
    ANGLE_FORMULAS.some(
      (re) =>
        questions.filter((q) => q.day === day && re.test(q.text)).length >= 3,
    ),
  );
}

/** Textes de la réserve étiquetés « compromis » (thème et formulations propres). */
const COMPROMISE_TEXTS = new Set([
  ...THEME_LIST.flatMap((theme) =>
    [1, 2, 3].flatMap((day) =>
      THEME_POOL[theme][day].filter((t) => t.compromise).map((t) => t.text),
    ),
  ),
  ...[
    TOPIC_DEEP,
    TOPIC_DEEP_VARIANTS,
    TOPIC_DEEP_THIRD,
    TOPIC_DEEP_FOURTH,
  ].flatMap((table) =>
    Object.values(table).flatMap((days) =>
      Object.values(days)
        .filter((t) => t!.compromise)
        .map((t) => t!.text),
    ),
  ),
]);

/**
 * Question de compromis, étiquetée ou non : gabarit étiqueté, formulation
 * de compromis d'un écart, ou tournure de compromis repérée par le code.
 */
function suggestsCompromise(
  report: DivergenceReport,
  q: SondeurQuestion,
): boolean {
  const d =
    q.source === 'divergence'
      ? report.divergences.find((x) => topicKey(x) === q.subject)
      : undefined;
  const statement =
    q.source === 'convergence'
      ? agreementFor(
          report.convergences.find((x) => x.questionId === q.subject)!,
        ).statement
      : '';
  const probe = statement ? q.text.slice(statement.length + 1) : q.text;
  return (
    COMPROMISE_TEXTS.has(q.text) ||
    (!!d && compromiseTextsFor(d).has(q.text)) ||
    COMPROMISE.test(probe)
  );
}

/** Thème intimité : rien de ce qui pousse à s'accommoder ou parle de dispute. */
const INTIMACY_PRESSURE =
  /dispute|premier pas|réconcili|passer la nuit|attendriez-vous de vous-même/iu;

/** Famille recomposée : sujet ou tournure. */
const isRecomposed = (q: SondeurQuestion) =>
  RECOMPOSED_TOPICS.has(q.subject ?? '') ||
  /famille recomposée|enfants déjà là|beau-parent|l'enfant de l'un/iu.test(
    q.text,
  );

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

  /** Accord d'une question servie (source « convergence »). */
  const agreementOf = (report: DivergenceReport, q: SondeurQuestion) =>
    report.convergences.find((x) => x.questionId === q.subject)!;

  it('relances d’accord : moins de 15 % de questions génériques, au 1er et au 2e parcours', () => {
    for (const pass of ['first', 'second'] as const) {
      let total = 0;
      let generic = 0;
      for (const { report, [pass]: questions } of runs)
        for (const q of questions) {
          if (q.source !== 'convergence') continue;
          const a = agreementFor(agreementOf(report, q));
          total++;
          const own = ownProbes(a).map((t) =>
            joinAgreement(a.statement, t.text),
          );
          if (!own.includes(q.text)) generic++;
        }
      const share = (100 * generic) / total;
      console.log(
        `Relances d'accord génériques (${pass === 'first' ? '1er' : '2e'} parcours) : ${generic}/${total} = ${share.toFixed(1)} %`,
      );
      expect(total).toBeGreaterThan(1000);
      expect(share).toBeLessThan(15);
    }
  });

  it('aucun accord démenti par la réponse de l’un des deux à un sujet voisin', () => {
    // Le cas relevé par le contre-audit : « la décision finale vous revient »
    // ou « ne regardent que le couple » quand l'un suit l'avis des siens pour
    // garder la paix (M5_Q10 A, dans questions.data.ts).
    expect(AGREEMENT_CONTRADICTIONS['M5_Q01:B'].M5_Q10).toEqual(['A']);
    expect(AGREEMENT_CONTRADICTIONS['M5_Q01:D'].M5_Q10).toEqual(['A']);
    // Vérifié sur les réponses brutes des deux entretiens, pas sur le rapport :
    // une réponse que le rapport ne laisse pas voir ferait échouer le test.
    const belied: string[] = [];
    let checked = 0;
    for (const { a, b, report, questions, where } of passes)
      for (const q of questions) {
        if (q.source !== 'convergence') continue;
        const c = agreementOf(report, q);
        const rules =
          AGREEMENT_CONTRADICTIONS[`${c.questionId}:${agreementKey(c) ?? ''}`];
        if (!rules) continue;
        checked++;
        for (const [id, keys] of Object.entries(rules))
          if (keys.includes(a[id]) || keys.includes(b[id]))
            belied.push(
              `${where} ${c.questionId} (${id} = ${a[id]} / ${b[id]}) : ${q.text}`,
            );
      }
    expect(checked).toBeGreaterThan(500);
    expect(belied).toEqual([]);
  });

  it('toute relance d’accord qui met l’accord à l’épreuve est étiquetée « limite », jamais servie sur un point non négociable', () => {
    /** Imaginer l'accord rompu, changé, poussé à bout ou à sa limite. */
    const PUT_TO_TEST =
      /changer\p{L}* d['’]avis|à l['’]épreuve|se complique|limite (?:est )?(?:franchie|atteinte)|n['’]y est plus|jusqu['’]où|faire bouger|impossible|ne lâcheriez pas|cess\p{L}*(?:-t-(?:il|elle))?(?:, pour vous,)? d['’]être/iu;
    const probes = [
      ...[1, 2, 3].flatMap((day) =>
        CONVERGENT[day].map((t, i) => ({
          where: `CONVERGENT[${day}][${i}]`,
          t,
        })),
      ),
      ...Object.entries(AGREEMENTS).flatMap(([key, a]) =>
        ownProbes(a).map((t) => ({ where: `AGREEMENTS.${key}`, t })),
      ),
    ];
    const tested = probes.filter(({ t }) => PUT_TO_TEST.test(t.text));
    expect(tested.length).toBeGreaterThanOrEqual(6);
    expect(
      tested
        .filter(({ t }) => t.technique !== 'limite')
        .map(({ where, t }) => `${where} : ${t.text}`),
    ).toEqual([]);
    const limits = new Set(
      probes.filter(({ t }) => t.technique === 'limite').map(({ t }) => t.text),
    );
    const served: string[] = [];
    let strict = 0;
    for (const { report, questions, where } of passes)
      for (const q of questions) {
        if (q.source !== 'convergence') continue;
        const c = agreementOf(report, q);
        if (!isNonNegotiable({ ...c, label: c.topic ?? c.label })) continue;
        strict++;
        const { statement } = agreementFor(c);
        const probe = statement ? q.text.slice(statement.length + 1) : q.text;
        if (limits.has(probe)) served.push(`${where} : ${q.text}`);
      }
    expect(strict).toBeGreaterThan(500);
    expect(served).toEqual([]);
  });

  it('aucun aveu nommé, ni dans une question servie ni dans une formulation écrite', () => {
    // Tournures des auto-évaluations (dernier mot, compte de ce que l'on
    // donne, silences en dispute…) : jamais dans le texte d'une question.
    const confessions = Object.entries(TOPIC_PHRASES)
      .filter(([key]) => SELF_DISCLOSURE_QUESTIONS.has(key.split(':')[0]))
      .map(([, phrase]) => phrase.toLowerCase());
    expect(confessions).toContain("le besoin d'avoir le dernier mot");
    expect(confessions).toContain("l'équilibre entre donner et recevoir");
    const names = (text: string) =>
      confessions.some((c) => text.toLowerCase().includes(c));
    const named = passes.flatMap(({ questions, where }) =>
      questions.filter((q) => names(q.text)).map((q) => `${where} : ${q.text}`),
    );
    const written = [
      ...staticTemplates(),
      ...Object.entries(AGREEMENTS).flatMap(([key, a]) =>
        ownProbes(a).map((t) => ({
          where: `AGREEMENTS.${key}`,
          text: joinAgreement(a.statement, t.text),
        })),
      ),
    ]
      .filter((t) => names(t.text))
      .map((t) => `${t.where} : ${t.text}`);
    expect([...named, ...written]).toEqual([]);
  });

  it('une journée enchaîne rarement trois questions qui s’ouvrent de la même façon', () => {
    let days = 0;
    const repeated: string[] = [];
    for (const { questions, where } of passes)
      for (const day of [1, 2, 3]) {
        days++;
        const count = new Map<string, number>();
        for (const q of questions.filter((x) => x.day === day)) {
          const o = questionOpening(q.text);
          count.set(o, (count.get(o) ?? 0) + 1);
        }
        for (const [o, n] of count)
          if (n >= 3) repeated.push(`${where} J${day} : ${n} × « ${o} »`);
      }
    const share = (100 * repeated.length) / days;
    console.log(
      `Journées avec trois fois la même ouverture : ${repeated.length}/${days} = ${share.toFixed(1)} %`,
    );
    expect(share).toBeLessThan(2);
  });

  it('langue : jamais deux « façon » dans une question, jamais « Pour vous deux… Pour vous… »', () => {
    const CLUMSY = [/façon[^?]*façon/iu, /^Pour vous deux[^.]*\. Pour vous/u];
    const clumsy = (text: string) => CLUMSY.some((re) => re.test(text));
    const served = passes.flatMap(({ questions, where }) =>
      questions
        .filter((q) => clumsy(q.text))
        .map((q) => `${where} : ${q.text}`),
    );
    // Toutes les combinaisons écrites à l'avance : sujet × gabarit, phrase
    // d'accord × relance propre ou question d'accord du jour.
    const combos = [
      ...staticTemplates().map((t) => t.text),
      ...renderTopic(TARGETED, 'T').map((t) => t.text),
      ...renderTopic(SHARED_RISK, 'S').map((t) => t.text),
      ...Object.values(AGREEMENTS).flatMap((a) =>
        [...ownProbes(a), ...[1, 2, 3].flatMap((day) => CONVERGENT[day])].map(
          (t) => joinAgreement(a.statement, t.text),
        ),
      ),
    ].filter(clumsy);
    expect([...served, ...combos]).toEqual([]);
  });

  it('intimité : aucun gabarit générique, jamais de dispute, de premier pas, de réconciliation ni de « ne pas laisser passer la nuit »', () => {
    // Écrit à l'avance : questions du thème et formulations des sujets de
    // désir, de tendresse et d'attirance, grille cachée comprise.
    const DESIRE = [
      'M6_Q06',
      'M6_Q07',
      'M9_Q07',
      'M10_Q15',
      'M10_Q16',
      'M10_Q17',
      'M10_Q18',
    ];
    const ACCOMMODATE =
      /proposer un moment|écouter son besoin|me forcer|faire un effort|céder|m'adapter/iu;
    const written = [
      ...[1, 2, 3].flatMap((day) => THEME_POOL.intimite[day]),
      ...DESIRE.flatMap((id) =>
        [1, 2, 3].flatMap((day) =>
          topicDeepAll({ questionId: id, label: '', theme: 'intimite' }, day),
        ),
      ),
    ];
    expect(written.length).toBeGreaterThan(30);
    expect(
      written
        .filter(
          (t) =>
            INTIMACY_PRESSURE.test(t.text) ||
            ACCOMMODATE.test(t.options.join(' | ')),
        )
        .map((t) => t.text),
    ).toEqual([]);
    // Servi : seulement des formulations propres au sujet, ou une question du
    // thème intimité.
    const bad: string[] = [];
    let intimacy = 0;
    for (const { report, questions, where } of passes)
      for (const q of questions) {
        if (q.themeKey !== 'intimite') continue;
        intimacy++;
        if (INTIMACY_PRESSURE.test(q.text)) bad.push(`${where} : ${q.text}`);
        if (
          q.source === 'divergence' &&
          q.subject !== 'controle' &&
          !DEEP_TEXTS.has(q.text)
        )
          bad.push(`${where} générique : ${q.text}`);
        if (q.source === 'convergence') {
          const a = agreementFor(agreementOf(report, q));
          const own = ownProbes(a).map((t) =>
            joinAgreement(a.statement, t.text),
          );
          if (!own.includes(q.text)) bad.push(`${where} accord : ${q.text}`);
        }
      }
    expect(intimacy).toBe(passes.length * 3);
    expect(bad).toEqual([]);
    // Écart de désir dont les formulations propres ont déjà été vues : une
    // question du thème intimité, jamais un gabarit de dispute.
    // Même réponse à risque des deux côtés (« c'est à l'autre de s'adapter ») :
    // le cas qui recevait les gabarits de dispute et de premier pas.
    const desire = buildDivergenceReport({ M10_Q18: 'D' }, { M10_Q18: 'D' });
    const seen = topicDeepAll(desire.divergences[0], 3).map((t) => t.text);
    expect(seen.length).toBeGreaterThanOrEqual(3);
    const again = assembleSondeur({
      report: desire,
      firstNames: ['A', 'B'],
      seed: 'desir',
      history: seen,
    });
    const slot = again.find((q) => q.day === 3 && q.themeKey === 'intimite')!;
    expect(slot.source).toBe('gabarit');
    expect(THEME_POOL.intimite[3].map((t) => t.text)).toContain(slot.text);
  });

  it('famille recomposée : jamais servie quand aucun des deux n’a d’enfant', () => {
    const noChildren = passes.filter(
      ({ a, b }) => a.M0_Q05 === 'A' && b.M0_Q05 === 'A',
    );
    expect(noChildren.length).toBeGreaterThan(100);
    expect(
      noChildren.flatMap(({ questions, where }) =>
        questions.filter(isRecomposed).map((q) => `${where} : ${q.text}`),
      ),
    ).toEqual([]);
    // Dès que l'un des deux a un enfant, le sujet reste exploré.
    expect(
      passes.some(
        ({ a, b, questions }) =>
          (a.M0_Q05 !== 'A' || b.M0_Q05 !== 'A') &&
          questions.some((q) => RECOMPOSED_TOPICS.has(q.subject ?? '')),
      ),
    ).toBe(true);
    const none = buildDivergenceReport(
      { M0_Q05: 'A', M3_Q04: 'B' },
      { M0_Q05: 'A', M3_Q04: 'B' },
    );
    const withChild = buildDivergenceReport(
      { M0_Q05: 'B', M3_Q04: 'B' },
      { M0_Q05: 'A', M3_Q04: 'B' },
    );
    for (let i = 0; i < 10; i++) {
      const seed = `r${i}`;
      expect(
        assembleSondeur({ report: none, firstNames: ['A', 'B'], seed }).some(
          isRecomposed,
        ),
      ).toBe(false);
      expect(
        assembleSondeur({
          report: withChild,
          firstNames: ['A', 'B'],
          seed,
        }).some((q) => RECOMPOSED_TOPICS.has(q.subject ?? '')),
      ).toBe(true);
    }
  });

  it('aucune question de compromis, étiquetée ou non, dans un thème qui porte un écart non négociable', () => {
    // Les gabarits qui suggèrent un arrangement sont étiquetés.
    for (const text of [
      'Imaginez un endroit où vous vous sentiriez chez vous tous les deux : quel serait le premier détail qui vous le dirait ?',
      'Si vos familles vivaient dans deux pays différents, comment aimeriez-vous partager les fêtes et les vacances ?',
      "Le jour où l'un de vous aurait le mal du pays, comment aimeriez-vous que l'autre réagisse ?",
      'Si un travail rêvé vous attendait loin, de quoi auriez-vous besoin pour en décider à deux ?',
      'Si un doute traversait un jour vos convictions, à qui en parleriez-vous en premier ?',
      "Si vos convictions évoluaient avec le temps, comment aimeriez-vous en parler à l'autre ?",
    ])
      expect(COMPROMISE_TEXTS.has(text)).toBe(true);
    expect(TOPIC_DEEP.M0_Q03[1]!.text).not.toMatch(/à quelles conditions/);
    const served: string[] = [];
    let strictServed = 0;
    for (const { report, questions, where } of passes) {
      const strictThemes = new Set(
        report.divergences
          .filter((d) => isNonNegotiable(d))
          .map((d) => d.theme),
      );
      for (const q of questions) {
        if (!strictThemes.has(q.themeKey)) continue;
        strictServed++;
        if (suggestsCompromise(report, q))
          served.push(`${where} [${q.themeKey}] ${q.text}`);
      }
    }
    expect(strictServed).toBeGreaterThan(10000);
    expect(served).toEqual([]);
  });

  it('aucune question double ni plan de mise en sécurité servi', () => {
    const served = passes.flatMap(({ questions, where }) =>
      questions
        .filter((q) => isDoubleQuestion(q.text) || PROTECTION_PLAN.test(q.text))
        .map((q) => `${where} : ${q.text}`),
    );
    expect(served).toEqual([]);
  });

  it('une même formule d’angle revient trois fois dans une journée dans moins de 1 % des Sondeurs', () => {
    const repeated = passes.filter(({ questions }) =>
      repeatsFormula(questions),
    );
    const share = (100 * repeated.length) / passes.length;
    console.log(
      `Sondeurs avec une formule d'angle répétée trois fois dans une journée : ${repeated.length}/${passes.length} = ${share.toFixed(2)} %`,
    );
    expect(share).toBeLessThan(1);
  });
});

// ─── Trois parcours d'un même membre, trois partenaires ──────────────────────

describe('Simulation réaliste : un membre garde ses réponses et change de partenaire', () => {
  const rand = rng(20261009);
  /** Partenaire : une part de réponses identiques à celles du membre. */
  const partnerOf = (a: RawAnswers, same: number): RawAnswers => {
    const b: RawAnswers = {};
    for (const q of QUESTIONS)
      b[q.id] = rand() < same ? a[q.id] : randomAnswer(rand, q);
    return b;
  };
  const passes = Array.from({ length: 300 }, (_, i) => {
    const a: RawAnswers = {};
    for (const q of QUESTIONS) a[q.id] = randomAnswer(rand, q);
    const same = [0, 0.6, 0.8][i % 3];
    // L'historique reprend toutes les questions déjà vues par le membre.
    const history: string[] = [];
    return [1, 2, 3].map((pass) => {
      const b = partnerOf(a, same);
      const report = buildDivergenceReport(a, b);
      const questions = assembleSondeur({
        report,
        firstNames: ['A', 'B'],
        seed: `m${i}-${pass}`,
        history: [...history],
      });
      history.push(...questions.map((q) => q.text));
      return { a, b, report, questions, pass, where: `membre ${i} P${pass}` };
    });
  }).flat();
  const ofPass = (pass: number) => passes.filter((p) => p.pass === pass);

  it('au 3e parcours : moins de 3 % d’écarts et moins de 5 % d’accords en question générique, sans dégrader les deux premiers', () => {
    for (const pass of [1, 2, 3]) {
      let div = 0;
      let divGeneric = 0;
      let conv = 0;
      let convGeneric = 0;
      for (const { report, questions } of ofPass(pass))
        for (const q of questions) {
          if (
            q.source === 'divergence' &&
            q.subject !== 'securite' &&
            q.subject !== 'controle'
          ) {
            div++;
            if (!DEEP_TEXTS.has(q.text)) divGeneric++;
          }
          if (q.source === 'convergence') {
            const c = report.convergences.find(
              (x) => x.questionId === q.subject,
            )!;
            const a = agreementFor(c);
            conv++;
            if (
              !ownProbes(a)
                .map((t) => joinAgreement(a.statement, t.text))
                .includes(q.text)
            )
              convGeneric++;
          }
        }
      const divShare = (100 * divGeneric) / div;
      const convShare = (100 * convGeneric) / conv;
      console.log(
        `Parcours ${pass} (réaliste, 300 membres) : écarts génériques ${divGeneric}/${div} = ${divShare.toFixed(1)} %, accords génériques ${convGeneric}/${conv} = ${convShare.toFixed(1)} %`,
      );
      expect(div).toBeGreaterThan(2000);
      expect(conv).toBeGreaterThan(900);
      expect(divShare).toBeLessThan(pass === 3 ? 3 : 1);
      expect(convShare).toBeLessThan(pass === 3 ? 5 : 1);
    }
  });

  it('relances d’accord sous l’angle du jour : au moins 70 % chaque jour, à chaque parcours', () => {
    for (const pass of [1, 2, 3])
      for (const day of [1, 2, 3]) {
        let total = 0;
        let inAngle = 0;
        for (const { report, questions } of ofPass(pass))
          for (const q of questions) {
            if (q.source !== 'convergence' || q.day !== day) continue;
            const c = report.convergences.find(
              (x) => x.questionId === q.subject,
            )!;
            const a = agreementFor(c);
            const probe = [...ownProbes(a), ...CONVERGENT[day]].find(
              (t) => joinAgreement(a.statement, t.text) === q.text,
            );
            total++;
            if (probe?.angle === day && DAY_ANGLE_TEXT[day].test(probe.text))
              inAngle++;
          }
        const share = (100 * inAngle) / total;
        console.log(
          `Parcours ${pass}, jour ${day} (réaliste) : relances d'accord dans l'angle du jour ${inAngle}/${total} = ${share.toFixed(1)} %`,
        );
        expect(total).toBeGreaterThan(100);
        expect(share).toBeGreaterThanOrEqual(70);
      }
  });

  it('aucun plan de mise en sécurité, aucune question double, aucun compromis dans un thème non négociable', () => {
    const bad: string[] = [];
    for (const { report, questions, where } of passes) {
      const strictThemes = new Set(
        report.divergences
          .filter((d) => isNonNegotiable(d))
          .map((d) => d.theme),
      );
      for (const q of questions) {
        if (PROTECTION_PLAN.test(q.text)) bad.push(`${where} plan : ${q.text}`);
        if (isDoubleQuestion(q.text)) bad.push(`${where} double : ${q.text}`);
        if (strictThemes.has(q.themeKey) && suggestsCompromise(report, q))
          bad.push(`${where} compromis : ${q.text}`);
        if (q.themeKey === 'intimite' && INTIMACY_PRESSURE.test(q.text))
          bad.push(`${where} intimité : ${q.text}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('famille recomposée jamais servie sans enfant ; formule d’angle répétée trois fois dans moins de 1 % des Sondeurs', () => {
    expect(
      passes
        .filter(({ a, b }) => a.M0_Q05 === 'A' && b.M0_Q05 === 'A')
        .flatMap(({ questions, where }) =>
          questions.filter(isRecomposed).map((q) => `${where} : ${q.text}`),
        ),
    ).toEqual([]);
    const repeated = passes.filter(({ questions }) =>
      repeatsFormula(questions),
    );
    expect((100 * repeated.length) / passes.length).toBeLessThan(1);
  });
});

describe('Accords démentis : exemple du contre-audit', () => {
  it('« la décision finale vous revient » n’est jamais nommé quand l’un suit l’avis des siens pour garder la paix', () => {
    for (const key of ['B', 'D']) {
      const { statement } = AGREEMENTS[`M5_Q01:${key}`];
      const belied = buildDivergenceReport(
        { M5_Q01: key, M5_Q10: 'A' },
        { M5_Q01: key, M5_Q10: 'B' },
      );
      for (let i = 0; i < 10; i++)
        expect(
          assembleSondeur({
            report: belied,
            firstNames: ['A', 'B'],
            seed: `d${i}`,
          }).some((q) => q.text.startsWith(statement)),
        ).toBe(false);
      // Sans la réponse qui le dément, l'accord reste exploré.
      const free = buildDivergenceReport(
        { M5_Q01: key, M5_Q10: 'B' },
        { M5_Q01: key, M5_Q10: 'B' },
      );
      expect(
        assembleSondeur({ report: free, firstNames: ['A', 'B'] }).some((q) =>
          q.text.startsWith(statement),
        ),
      ).toBe(true);
    }
  });
});

describe('Deux membres sans pratique religieuse : options cachées neutres', () => {
  it('reconnaît, d’après le rapport, deux membres sans pratique religieuse', () => {
    const report = (a: RawAnswers, b: RawAnswers) =>
      hasNoReligiousPractice(buildDivergenceReport(a, b));
    // Sans religion, ou spiritualité personnelle sans religion (V7, V6).
    expect(report({ M1_Q16: 'I' }, { M1_Q16: 'I' })).toBe(true);
    expect(report({ M1_Q16: 'H' }, { M1_Q16: 'I' })).toBe(true);
    expect(report({ M1_Q05: 'E' }, { M1_Q16: 'I' })).toBe(true);
    // Une religion déclarée, pratiquée « rarement ou jamais » des deux côtés.
    expect(
      report({ M1_Q16: 'A', M1_Q17: 'D' }, { M1_Q16: 'A', M1_Q17: 'D' }),
    ).toBe(true);
    // Une pratique chez l'un des deux, ou une pratique que le rapport ne dit
    // pas : les options restent celles du gabarit.
    expect(
      report({ M1_Q16: 'A', M1_Q17: 'C' }, { M1_Q16: 'A', M1_Q17: 'D' }),
    ).toBe(false);
    expect(report({ M1_Q16: 'D', M1_Q17: 'A' }, { M1_Q16: 'I' })).toBe(false);
    expect(report({ M1_Q16: 'D' }, { M1_Q16: 'I' })).toBe(false);
    expect(report({}, {})).toBe(false);
  });

  it('remplace une option religieuse par une valeur, une conviction ou une tradition familiale, sans doublon', () => {
    expect(
      neutralOptions(['Ma foi', 'Mes valeurs', 'Une prière', 'Autre...']),
    ).toEqual([
      'Mes convictions',
      'Mes valeurs',
      'Une tradition familiale',
      'Autre...',
    ]);
    const fetes = neutralOptions([
      'Une fête religieuse',
      'Une fête familiale',
      'Une fête du pays',
      'Autre...',
    ]);
    expect(new Set(fetes).size).toBe(4);
    expect(fetes.some((o) => RELIGIOUS_OPTION.test(o))).toBe(false);
    // Une option sans foi ni pratique reste telle quelle.
    expect(
      neutralOptions(['Un lien pratique', 'Le respect', 'Autre...']),
    ).toEqual(['Un lien pratique', 'Le respect', 'Autre...']);
  });

  it('300 couples sans religion : aucune option cachée religieuse ; des croyants pratiquants les gardent', () => {
    const rand = rng(20261011);
    const answers = (faith: string, practice?: string): RawAnswers => {
      const a: RawAnswers = {};
      for (const q of QUESTIONS) a[q.id] = randomAnswer(rand, q);
      a.M1_Q16 = faith;
      if (practice) a.M1_Q17 = practice;
      else delete a.M1_Q17;
      return a;
    };
    const served = (faith: [string, string], practice?: string) =>
      Array.from({ length: 150 }, (_, i) =>
        assembleSondeur({
          report: buildDivergenceReport(
            answers(faith[0], practice),
            answers(faith[1], practice),
          ),
          firstNames: ['A', 'B'],
          seed: `r${faith.join('')}${i}`,
        }),
      ).flat();
    const unbelievers = [...served(['I', 'I']), ...served(['H', 'I'])];
    expect(unbelievers.length).toBe(300 * 21);
    expect(
      unbelievers
        .filter((q) => q.options.some((o) => RELIGIOUS_OPTION.test(o)))
        .map((q) => `${q.text} [${q.options.join(' | ')}]`),
    ).toEqual([]);
    for (const q of unbelievers) {
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options[q.options.length - 1]).toMatch(/^Autre/);
    }
    // Deux croyants qui pratiquent chaque jour : la grille reste celle du
    // gabarit.
    const believers = served(['D', 'D'], 'A');
    expect(
      believers.some((q) => q.options.some((o) => RELIGIOUS_OPTION.test(o))),
    ).toBe(true);
  });
});
