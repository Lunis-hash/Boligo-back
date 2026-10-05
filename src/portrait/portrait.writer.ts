/**
 * Moteur de rédaction des fiches BOLIGO — déterministe, sans IA, coût nul.
 *
 * À partir des réponses structurées du Grand Entretien (clé d'option par
 * question), il rédige :
 *  - l'en-tête (« Oli, 38 ans, pilote de ligne à Écouis ») ;
 *  - l'analyse BOLIGO à la 3e personne (fiche Découverte) ;
 *  - une bio à la 1re personne quand la bio enregistrée est absente ou abîmée ;
 *  - trois mots, les valeurs, les attentes et les détails du profil ;
 *  - le bilan personnel par module (phrase « vous », réponses clés, clarté).
 *
 * Les textes sont recalculés à chaque lecture : les fiches déjà générées
 * (y compris les anciennes, tronquées) s'affichent correctement sans
 * modifier les données des membres.
 */
import { QUESTIONS, Question } from '../interview/questions.data';
import { RawAnswers } from '../matching/divergence.engine';
import {
  APPROACH_BY_DIVERGENCE,
  APPROACH_BY_GOAL,
  BIO_BRINGS,
  BIO_GOAL,
  BIO_HUMOUR,
  BIO_LOVE,
  BIO_OFFERS,
  BIO_SEEK,
  BIO_TEMPERAMENT,
  BRINGS,
  CHILDREN_NOW,
  CHILDREN_WISH,
  CHILDREN_WISH_PARENT,
  CONFLICT,
  DETAIL_CHILDREN,
  DETAIL_CHILDREN_WISH,
  DETAIL_EDUCATION,
  DETAIL_LIFESTYLE,
  DETAIL_SMOKING,
  DETAIL_RELIGION,
  DETAIL_SITUATION,
  EXPECT_ENERGY,
  EXPECT_LOVE,
  EXPECT_NEVER,
  EXPECT_TIMING,
  FAITH,
  FAITH_IMPACT,
  FAMILY,
  GOAL,
  MODULES,
  MODULE0_SELF_PARENT,
  MODULE_KEY_QUESTIONS,
  MODULE_SELF_SENTENCE,
  MONEY,
  NEED,
  NO_FAITH,
  NO_FAITH_IMPACT,
  OFFERS,
  Phrases,
  QUESTION_SHORT_LABEL,
  TIMING,
  TRADITIONS,
  TRAITS,
  UNDECIDED,
  VALUE_CHIPS,
} from './portrait.phrases';
import {
  Gender,
  agree,
  atCity,
  cleanText,
  lowerFirstWord,
  sentence,
  shortCity,
  usableProfession,
} from './portrait.text';
import { moderateMessageLocally } from '../moderation/chat-moderation';

export interface PortraitInput {
  firstName: string;
  gender: Gender;
  age?: number | null;
  profession?: string | null;
  city?: string | null;
  answers: RawAnswers;
  /** Bio enregistrée (profil ou carte mentale), réutilisée si elle est saine. */
  storedBio?: string | null;
  /** Synthèse IA enregistrée, utilisée seulement si les réponses manquent. */
  storedSynthesis?: string | null;
}

export interface ValueChip {
  id: string;
  label: string;
}

export interface Expectation {
  icon: string;
  text: string;
}

export interface ModuleSelfView {
  id: string;
  module: number;
  label: string;
  emoji: string;
  tagline: string;
  /** Part des questions du module tranchées clairement (0–100). */
  clarity: number;
  description: string;
  keyAnswers: Array<{ label: string; answer: string }>;
}

export interface Portrait {
  headline: string;
  pronoun: 'il' | 'elle';
  analysis: string;
  bio: string;
  threeWords: string[];
  values: ValueChip[];
  expectations: Expectation[];
  details: Record<string, string>;
  redFlags: string[];
  modules: ModuleSelfView[];
  /** Clarté globale du profil (0–100). */
  clarity: number;
  answeredCount: number;
}

const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

function pick(
  phrases: Phrases,
  answers: RawAnswers,
  questionId: string,
  gender: Gender,
): string | null {
  const key = answers[questionId];
  const template = key ? phrases[key] : undefined;
  return template ? agree(template, gender) : null;
}

function optionText(questionId: string, key: string): string | null {
  return (
    QUESTION_BY_ID.get(questionId)?.options.find((o) => o.key === key)?.text ??
    null
  );
}

/** Prénom saisi tout en minuscules (« yannick ») → « Yannick » ; sinon inchangé. */
export function displayName(firstName: string): string {
  const t = firstName.trim();
  if (t !== t.toLowerCase()) return t;
  return t.replace(
    /(^|[\s-])(\p{Ll})/gu,
    (_m, sep: string, c: string) => sep + c.toUpperCase(),
  );
}

/** Un membre déjà parent (enfants à charge ou autonomes). */
function isParent(a: RawAnswers): boolean {
  return a.M0_Q05 === 'B' || a.M0_Q05 === 'C' || a.M0_Q05 === 'D';
}

/** « Oli, 38 ans, pilote de ligne à Écouis ». */
export function buildHeadline(input: PortraitInput): string {
  const parts: string[] = [displayName(input.firstName)];
  if (typeof input.age === 'number' && input.age >= 18 && input.age < 120) {
    parts.push(`${input.age} ans`);
  }
  const profession = usableProfession(input.profession);
  const city = shortCity(input.city);
  if (profession && city)
    parts.push(`${lowerFirstWord(profession)} ${atCity(city)}`);
  else if (profession) parts.push(lowerFirstWord(profession));
  else if (city)
    parts.push(agree(`install{é|ée} ${atCity(city)}`, input.gender));
  return cleanText(parts.join(', '));
}

/** Sujet de la phrase d'ouverture : « Oli, 38 ans, …, » ou simplement « Oli ». */
function subjectOf(input: PortraitInput): string {
  const headline = buildHeadline(input);
  return headline === displayName(input.firstName) ? headline : `${headline},`;
}

function analysisSentences(input: PortraitInput): string[] {
  const { answers: a, gender: g } = input;
  const out: string[] = [];

  // 1. Ouverture : qui, et dans quel état d'esprit.
  const approach =
    pick(APPROACH_BY_DIVERGENCE, a, 'M8_Q09', g) ??
    pick(APPROACH_BY_GOAL, a, 'M8_Q01', g);
  const subject = subjectOf(input);
  out.push(
    approach
      ? `${subject} aborde sa recherche avec **${approach}**`
      : `${subject} a complété son Grand Entretien BOLIGO`,
  );

  // 2. Projet de couple et délai.
  const goal = pick(GOAL, a, 'M8_Q01', g);
  if (goal) {
    const timing =
      a.M8_Q01 === 'A' || a.M8_Q01 === 'B'
        ? pick(TIMING, a, 'M8_Q02', g)
        : null;
    out.push(timing ? `${goal}, ${timing}` : goal);
  }

  // 3. Enfants (désir et situation actuelle).
  // Un parent ne « ne souhaite pas d'enfants » : il ne souhaite pas d'AUTRES enfants.
  const wish = pick(
    isParent(a) ? CHILDREN_WISH_PARENT : CHILDREN_WISH,
    a,
    'M0_Q06',
    g,
  );
  const now = pick(CHILDREN_NOW, a, 'M0_Q05', g);
  if (wish && now) out.push(`${agree(`{Il} est ${now}`, g)}. ${wish}`);
  else if (wish) out.push(wish);
  else if (now) out.push(agree(`{Il} est ${now}`, g));

  // 4. Attachement et gestion des désaccords.
  const need = pick(NEED, a, 'M2_Q03', g);
  const conflict = pick(CONFLICT, a, 'M6_Q01', g);
  if (need && conflict)
    out.push(agree(`En couple, {il} ${need} et ${conflict}`, g));
  else if (need || conflict)
    out.push(agree(`En couple, {il} ${need ?? conflict}`, g));

  // 5. Foi et traditions.
  const faith = pick(FAITH, a, 'M1_Q05', g);
  if (faith) {
    const impact = pick(FAITH_IMPACT, a, 'M1_Q06', g);
    out.push(impact ? `${faith} ${impact}` : `${faith} fait partie de sa vie`);
  } else {
    const noFaith = pick(NO_FAITH, a, 'M1_Q05', g);
    if (noFaith) {
      const impact = pick(NO_FAITH_IMPACT, a, 'M1_Q06', g);
      out.push(impact ? `${noFaith} ${impact}` : noFaith);
    }
  }
  const traditions = pick(TRADITIONS, a, 'M1_Q03', g);
  if (traditions) out.push(traditions);

  // 6. Foyer : argent et famille.
  const money = pick(MONEY, a, 'M4_Q01', g);
  const family = pick(FAMILY, a, 'M5_Q01', g);
  if (money && family) {
    out.push(agree(`Côté foyer, {il} privilégie ${money} ; {il} ${family}`, g));
  } else if (money) {
    out.push(agree(`Côté foyer, {il} privilégie ${money}`, g));
  } else if (family) {
    out.push(agree(`Côté famille, {il} ${family}`, g));
  }

  // 7. Ce qu'il ou elle apporte.
  const brings = pick(BRINGS, a, 'M10_Q09', g);
  const offers = pick(OFFERS, a, 'M10_Q10', g);
  if (brings && offers) {
    out.push(
      agree(
        `Ce qu’{il} apporte de plus précieux : **${brings}**, avec l’envie d’offrir ${offers} à la personne qui partagera sa vie`,
        g,
      ),
    );
  } else if (brings) {
    out.push(agree(`Ce qu’{il} apporte de plus précieux : **${brings}**`, g));
  }

  return out.map(sentence).filter(Boolean);
}

/** Une bio enregistrée est réutilisée seulement si elle est propre et complète. */
export function isUsableBio(bio: string | null | undefined): boolean {
  if (!bio) return false;
  const t = bio.trim();
  if (t.length < 40) return false;
  if (/\b(undefined|null)\b/.test(t)) return false;
  if (/,\s*,|\s,\s*[.,]|\s,$/.test(t)) return false;
  // Gabarit de secours de l'ancienne génération (réponses recopiées et coupées).
  if (/démarche sur Harmonie/i.test(t)) return false;
  if (/c'est (oui|non)[ ,]|à (oui|non)[ ,]/i.test(t)) return false;
  if (/\b(?:\p{L}+)\s*,\s*$/u.test(t)) return false;
  // Coordonnées (téléphone, e-mail, réseaux, liens) : réservées à l'étape « contacts ».
  if (
    /(?:\d[\s.-]?){8,}|@\w|\b[\w.+-]+@[\w-]+\.\w+|https?:\/\/|www\.|\b(?:insta(?:gram)?|snap(?:chat)?|whats?app|telegram|tiktok|facebook)\b/i.test(
      t,
    )
  )
    return false;
  // Insultes ou contenu explicite : même règle que la messagerie.
  if (!moderateMessageLocally(t).allowed) return false;
  return true;
}

/** Remplace l'ancien nom de l'application par BOLIGO (le « Parcours Harmonie » reste). */
export function brandBoligo(text: string): string {
  return text
    .replace(/\b(sur|avec|chez|via) Harmonie\b/g, '$1 BOLIGO')
    .replace(/\bd['’]Harmonie\b/g, 'de BOLIGO');
}

function generatedBio(input: PortraitInput): string {
  const { answers: a, gender: g } = input;
  // Tempérament + humour, langage de l'amour et énergie recherchée : les réponses
  // qui distinguent le plus deux membres au même projet de couple.
  const temperament = pick(BIO_TEMPERAMENT, a, 'M7_Q03', g);
  const humour = pick(BIO_HUMOUR, a, 'M10_Q04', g);
  const personality = temperament ? `${temperament}${humour ?? ''}` : null;
  const love = pick(BIO_LOVE, a, 'M8_Q04', g);
  const seek = pick(BIO_SEEK, a, 'M10_Q03', g);
  const parts = [
    pick(BIO_GOAL, a, 'M8_Q01', g),
    personality,
    pick(BIO_BRINGS, a, 'M10_Q09', g),
    love,
    // Sans recherche connue, la phrase « ce que j'aimerais offrir » prend sa place.
    seek ?? pick(BIO_OFFERS, a, 'M10_Q10', g),
  ].filter((p): p is string => !!p);
  if (parts.length === 0) {
    return 'Je suis ici pour une rencontre sincère, construite avec le temps.';
  }
  return parts.map(sentence).join(' ');
}

function threeWords(a: RawAnswers, g: Gender): string[] {
  const words: string[] = [];
  for (const [questionId, phrases] of TRAITS) {
    const w = pick(phrases, a, questionId, g);
    if (w && !words.includes(w)) words.push(w);
    if (words.length === 3) break;
  }
  return words;
}

export const MAX_VALUE_CHIPS = 8;

export function valueChips(a: RawAnswers): ValueChip[] {
  return VALUE_CHIPS.filter((chip) =>
    Object.entries(chip.when).some(([qid, keys]) =>
      keys.includes(a[qid] ?? ''),
    ),
  )
    .slice(0, MAX_VALUE_CHIPS)
    .map(({ id, label }) => ({ id, label }));
}

function expectations(a: RawAnswers, g: Gender): Expectation[] {
  const out: Expectation[] = [];
  if (a.M8_Q01 === 'A' || a.M8_Q01 === 'B') {
    const t = pick(EXPECT_TIMING, a, 'M8_Q02', g);
    if (t) out.push({ icon: '⏱️', text: t });
  }
  const energy = pick(EXPECT_ENERGY, a, 'M10_Q03', g);
  if (energy) out.push({ icon: '✨', text: energy });
  const love = pick(EXPECT_LOVE, a, 'M8_Q04', g);
  if (love) out.push({ icon: '💞', text: love });
  const never = pick(EXPECT_NEVER, a, 'M8_Q08', g);
  if (never) out.push({ icon: '🛡️', text: never });
  return out.map((e) => ({ ...e, text: cleanText(e.text) }));
}

function details(input: PortraitInput): Record<string, string> {
  const { answers: a, gender: g } = input;
  const entries: Array<[string, string | null]> = [
    ['situation', pick(DETAIL_SITUATION, a, 'M0_Q04', g)],
    ['children', pick(DETAIL_CHILDREN, a, 'M0_Q05', g)],
    ['childrenWish', pick(DETAIL_CHILDREN_WISH, a, 'M0_Q06', g)],
    ['religion', pick(DETAIL_RELIGION, a, 'M1_Q05', g)],
    ['education', pick(DETAIL_EDUCATION, a, 'M0_Q07', g)],
    ['lifestyle', pick(DETAIL_LIFESTYLE, a, 'M7_Q01', g)],
    ['smoking', pick(DETAIL_SMOKING, a, 'M0_Q09', g)],
    ['city', shortCity(input.city)],
  ];
  return Object.fromEntries(
    entries.filter((e): e is [string, string] => !!e[1]),
  );
}

function redFlags(a: RawAnswers): string[] {
  const flags: string[] = [];
  for (const qid of ['M8_Q05', 'M8_Q08']) {
    const text = a[qid] ? optionText(qid, a[qid]) : null;
    if (text && !flags.includes(text)) flags.push(text);
  }
  return flags;
}

/** Une question s'applique-t-elle à ce membre (âge, genre, dépendances) ? */
function applies(q: Question, input: PortraitInput): boolean {
  const r = q.rules;
  if (!r) return true;
  const age = typeof input.age === 'number' ? input.age : null;
  // Même règle que questions.service.ts (pendingQuestions) : non posée à partir de maxAge.
  if (r.maxAge !== undefined && age !== null && age >= r.maxAge) return false;
  if (r.minAge !== undefined && age !== null && age < r.minAge) return false;
  if (r.gender && input.gender && r.gender !== input.gender) return false;
  if (r.dependsOn) {
    const v = input.answers[r.dependsOn.questionId];
    if (!v || !r.dependsOn.values.includes(v)) return false;
  }
  return true;
}

function moduleSelfViews(input: PortraitInput): ModuleSelfView[] {
  const { answers: a, gender: g } = input;
  const out: ModuleSelfView[] = [];
  for (const info of MODULES) {
    const questions = QUESTIONS.filter(
      (q) => q.moduleNumber === info.number && applies(q, input),
    );
    const answered = questions.filter((q) => a[q.id]);
    if (answered.length === 0) continue;
    const decided = answered.filter(
      (q) => !(UNDECIDED[q.id] ?? []).includes(a[q.id]),
    );
    const clarity = Math.round((decided.length / questions.length) * 100);

    const [anchor, basePhrases] = MODULE_SELF_SENTENCE[info.number];
    const phrases =
      info.number === 0 && isParent(a) ? MODULE0_SELF_PARENT : basePhrases;
    const description =
      pick(phrases, a, anchor, g) ??
      `Vos réponses sur ${info.focus} sont prises en compte dans vos rencontres.`;

    const keyAnswers = (MODULE_KEY_QUESTIONS[info.number] ?? [])
      .filter((qid) => a[qid])
      .map((qid) => ({
        label: QUESTION_SHORT_LABEL[qid] ?? qid,
        answer: optionText(qid, a[qid]) ?? '',
      }))
      .filter((k) => k.answer.length > 0);

    out.push({
      id: info.id,
      module: info.number,
      label: info.label,
      emoji: info.emoji,
      tagline: info.tagline,
      clarity,
      description: sentence(description),
      keyAnswers,
    });
  }
  return out;
}

export function buildPortrait(input: PortraitInput): Portrait {
  const g = input.gender;
  const answeredCount = Object.keys(input.answers).length;
  const modules = moduleSelfViews(input);

  const applicable = QUESTIONS.filter((q) => applies(q, input));
  const decided = applicable.filter(
    (q) =>
      input.answers[q.id] &&
      !(UNDECIDED[q.id] ?? []).includes(input.answers[q.id]),
  );
  const clarity = applicable.length
    ? Math.round((decided.length / applicable.length) * 100)
    : 0;

  let analysis = analysisSentences(input).join(' ');
  if (answeredCount < 5) {
    const synthesis = input.storedSynthesis
      ? brandBoligo(input.storedSynthesis.trim())
      : '';
    analysis = isUsableBio(synthesis)
      ? synthesis
      : sentence(
          `${subjectOf(input)} n'a pas encore terminé son Grand Entretien BOLIGO`,
        );
  }

  const stored = input.storedBio ? brandBoligo(input.storedBio.trim()) : null;
  const bio = stored && isUsableBio(stored) ? stored : generatedBio(input);

  return {
    headline: buildHeadline(input),
    pronoun: g === 'F' ? 'elle' : 'il',
    analysis,
    bio,
    threeWords: threeWords(input.answers, g),
    values: valueChips(input.answers),
    expectations: expectations(input.answers, g),
    details: details(input),
    redFlags: redFlags(input.answers),
    modules,
    clarity,
    answeredCount,
  };
}
