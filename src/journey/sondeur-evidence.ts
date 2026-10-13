/**
 * Contrat de preuves du Sondeur (V8.2).
 *
 * Principe : le moteur établit les faits (écarts, accords, sujets de sécurité),
 * l'IA formule, et ce validateur déterministe vérifie que chaque question
 * s'appuie sur des preuves autorisées. Il s'ajoute aux protections existantes
 * (règles de forme `isWellFormedQuestion`, relecteur d'une autre famille avec
 * ses 24 règles) sans les remplacer.
 */
import { QUESTION_INDEX } from '../interview/questions.data';
import { QUESTIONS_EN } from '../interview/questions.en';
import { V82_EN, V82_INDEX } from '../interview/questions.v82';
import {
  DivergenceReport,
  THEME_LIST,
  Theme,
  isSafetyDivergence,
} from '../matching/divergence.engine';
import {
  ORIGIN_DETOUR,
  gapQuestionIssues,
  isWellFormedQuestion,
  passesFormRules,
} from './clinical-lens';

export type EvidenceKind = 'divergence' | 'convergence' | 'neutral' | 'safety';

/** Preuve transmise à l'IA : un identifiant opaque, jamais la réponse d'un membre. */
export interface EvidenceItem {
  id: string; // « E3 »
  theme: Theme;
  kind: EvidenceKind;
  /** Identifiants des questions d'entretien sur lesquelles repose la preuve. */
  subjects: string[];
  /** Sujet en clair (« Accueillir un proche à la maison »), montrable. */
  topic: string;
  severity?: string;
  /** Risque partagé : même réponse des deux, qui pose problème (pas un écart). */
  shared?: boolean;
  /** Textes de réponses des membres : servent au contrôle de non-divulgation, jamais envoyés à l'IA. */
  privateTexts: string[];
}

/** Ce que l'IA doit renvoyer pour chaque question (en plus du texte). */
export interface EvidencedQuestion {
  day: number;
  themeKey: Theme;
  text: string;
  /** Identifiants de preuves (au moins un). */
  evidence: string[];
  /** Ce que la question affirme ou suppose : un écart, un accord, ou rien. */
  claim: 'divergence' | 'convergence' | 'neutral';
}

/** Index des preuves d'un couple, construit par le code à partir du rapport du moteur. */
export function buildEvidence(report: DivergenceReport): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  let n = 0;
  for (const d of report.divergences) {
    const safety = isSafetyDivergence(d) || d.questionId === 'securite';
    // Tendance ou sujet non renseigné : aucune réponse à protéger (rien n'est cité).
    const hidden = d.neutral || d.undisclosed;
    out.push({
      id: `E${++n}`,
      theme: d.theme,
      kind: safety ? 'safety' : 'divergence',
      subjects: [d.questionId],
      topic: d.label,
      severity: d.severity,
      // Risque partagé : les deux ont donné la même réponse (pas un écart).
      ...(d.shared ? { shared: true } : {}),
      privateTexts: hidden
        ? []
        : [
            d.a.text,
            d.b.text,
            ...answerTextsEn(d.questionId, [d.a.key, d.b.key]),
          ],
    });
  }
  for (const c of report.convergences)
    out.push({
      id: `E${++n}`,
      theme: c.theme,
      kind: 'convergence',
      subjects: [c.questionId],
      topic: c.topic ?? c.label,
      privateTexts: [c.answer, ...convergenceTextEn(c.questionId, c.answer)],
    });
  for (const t of THEME_LIST)
    out.push({
      id: `N-${t}`,
      theme: t,
      kind: 'neutral',
      subjects: [],
      topic: t,
      privateTexts: [],
    });
  return out;
}

/** Version transmise à l'IA : sans aucun texte de réponse. */
export function evidenceForAi(items: EvidenceItem[]) {
  return items
    .filter((e) => e.kind !== 'safety')
    .map(({ id, theme, kind, topic, severity, shared }) => ({
      id,
      theme,
      kind,
      topic,
      severity,
      ...(shared ? { shared } : {}),
    }));
}

// ─── Détecteurs ──────────────────────────────────────────────────────────────
const W = (s: string) => new RegExp(`(?<!\\p{L})(?:${s})(?!\\p{L})`, 'iu');

/** Affirme une différence entre les deux membres. */
const DIFF_CLAIM = W(
  [
    'vot(?:re|res) (?:désaccord|divergence)s?',
    'ce (?:point de )?désaccord',
    'vos désaccords',
    'cette divergence',
    'ne (?:voyez|pensez|vivez|partagez|souhaitez|imaginez) pas (?:les choses )?(?:de la même façon|pareil|la même chose)',
    'pas (?:du même avis|sur la même longueur)',
    "vos (?:visions|avis|points de vue|positions|attentes) (?:diffèrent|divergent|s[’']opposent|sont différent(?:e)?s)",
    "(?<!(?:si|ni|de|à) )l[’']un(?!e)(?: (?:de vous|d[’']entre vous))? [^?]{0,60}(?:,| et| alors que| tandis que| mais| quand) l[’']autre",
    'vos (?:visions|positions|avis|attentes|points de vue|conceptions|approches) (?:opposé|différent|divergent|contradictoire|incompatible)\\p{L}*',
    'chacun de son côté pense',
    'vous vous opposez',
    'votre différence',
    'cette différence',
    'vos différences',
  ].join('|'),
);
/** Affirme un accord entre les deux membres. */
const AGREE_CLAIM = W(
  [
    'vous partagez',
    'vous avez en commun',
    'votre point commun',
    'votre vision commune',
    'vous vous rejoignez',
    "vous êtes (?:tous )?(?:les )?deux d[’']accord",
    'vous pensez (?:tous (?:les )?deux )?(?:la même chose|pareil)',
    '(?:la )?même vision',
    "tous (?:les )?deux (?:attachés|d[’']accord|convaincus|ouverts|prêts)",
    'comme vous le souhaitez tous',
    '(?:foi|vision|valeurs?|projet|culture|religion|convictions?|attentes|envies?) communes?',
    'vous \\p{L}+(?<!riez)(?<!iez)ez [^?]{0,40}de la même (?:manière|façon)',
    'cette entente',
    'votre entente',
  ].join('|'),
);
/**
 * Attribution d'un état intérieur, d'une intention, d'un comportement ou d'un
 * passé : interdite partout sous forme possessive ou présupposée.
 */
const ATTRIBUTION = W(
  [
    'vos? (?:peurs?|craintes?|angoisses?|inquiétudes?|méfiance|jalousie|blessures?|rancune|colère|souffrance|doutes?|hésitations?|réticences?|intentions?|résistances?|difficultés?|manques?|regrets?|traumatismes?)',
    'votre (?:peur|crainte|angoisse|inquiétude|intention|blessure|réticence|hésitation|difficulté|résistance|souffrance|rancune|colère|jalousie|méfiance)',
    '(?:puisque|comme|vu que|étant donné que|depuis que|maintenant que|alors que|parce que) vous',
    'vous qui',
    'pourquoi (?:avez|êtes|ne)[- ]?',
    'pourquoi vous (?:avez|êtes|ne|refusez|craignez)',
    'vos? (?:ex|anciens? partenaires?|ancienne relation|dernière relation|divorce|séparation|passé amoureux|rupture)',
    '(?<!si )vous avez (?:déjà )?(?:vécu|souffert|été (?:trompé|blessé|déçu|quitté)|connu)',
    '(?<!si )vous aviez',
    'par le passé',
    'quand vous vous disputez',
    'lors de vos disputes',
    'vos disputes',
  ].join('|'),
);
/** État intérieur affirmé dans une phrase déclarative (avant la question). */
const STATE_DECLARED = W(
  "vous (?:craignez|redoutez|avez peur|n[’']osez pas|refusez|voulez|souhaitez|comptez|préférez|tenez à|ne supportez pas|avez du mal|hésitez|doutez)",
);

function sentences(text: string): { lead: string; question: string } {
  const parts = text.trim().split(/(?<=[.!:;])\s+/);
  return {
    lead: parts.slice(0, -1).join(' '),
    question: parts[parts.length - 1] ?? '',
  };
}
const norm = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

/** Quatre mots consécutifs communs (hors mots outils) : reprise reformulée d'une réponse. */
const STOP = new Set([
  'le',
  'la',
  'les',
  'de',
  'des',
  'du',
  'un',
  'une',
  'et',
  'à',
  'au',
  'aux',
  'en',
  'je',
  'vous',
  'nous',
  'que',
  'qui',
  'pour',
  'dans',
  'sur',
  'avec',
  'ce',
  'cette',
  'il',
  'elle',
  "l'",
  "d'",
  'ne',
  'pas',
]);
function words(s: string): string[] {
  return s
    .replace(/[^\p{L}' ]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
}
/** Paire de mots rares de la réponse privée, absente du sujet public (« cohabitation prolongée »). */
function rareBigramLeak(text: string, answer: string, topic: string): boolean {
  const rare = (x: string) => words(x).filter((w) => w.length >= 5);
  const a = rare(answer);
  const pub = ` ${rare(topic).join(' ')} `;
  const tw = ` ${rare(text).join(' ')} `;
  for (let i = 0; i + 1 < a.length; i++) {
    const bg = ` ${a[i]} ${a[i + 1]} `;
    if (tw.includes(bg) && !pub.includes(bg)) return true;
  }
  return false;
}
function sharesFourWords(text: string, answer: string): boolean {
  const a = words(answer);
  if (a.length < 3) return false;
  const tw = ` ${words(text).join(' ')} `;
  const n = Math.min(4, a.length);
  for (let i = 0; i + n <= a.length; i++)
    if (tw.includes(` ${a.slice(i, i + n).join(' ')} `)) return true;
  return false;
}

// ─── Contrôles réservés aux questions de l'IA (les gabarits sont relus par l'équipe) ───
const EMOTION_NOUNS =
  '(?:peurs?|craintes?|angoisses?|appréhensions?|inquiétudes?|anxiété|stress|hontes?|culpabilité|colères?|rancunes?|jalousies?|méfiance|tristesses?|blessures?|hésitations?|réticences?|doutes?|frustrations?|déceptions?|lassitude|résistances?|regrets?|nostalgie|solitude)';
/**
 * Émotion présupposée : attribuée aux membres (« votre appréhension », « cette angoisse »,
 * « la crainte que vous ressentez »). Une émotion citée comme sujet général
 * (« comment exprimait-on la colère ? ») reste permise.
 */
const EMOTION_PRESUPPOSED = new RegExp(
  `(?<!\\p{L})(?:(?:cette|votre|vos|ces|toute cette)\\s+(?:\\p{L}+\\s+)?${EMOTION_NOUNS}|(?:la|le|les|l['’])\\s*${EMOTION_NOUNS}(?:\\s+\\p{L}+)?\\s+(?:que|qui|dont) vous)(?!\\p{L})`,
  'iu',
);
/** Verbe d'émotion à l'indicatif qui présuppose l'état (« vous effraie », « vous inquiète-t-il »). */
const EMOTION_VERB = W(
  "(?:vous|l['’]un de vous) (?:effraie|inquiète|angoisse|préoccupe|tourmente|pèse|hante|freine|bloque|retient|agace|blesse|dérange|attriste)|(?:effraie|inquiète|angoisse|préoccupe|tourmente|pèse|hante|freine|bloque|retient|agace|blesse|dérange|attriste)-t-(?:il|elle)",
);
/** Habitude présupposée : subordonnée temporelle au présent, adverbes de répétition ou de persistance. */
const HABIT = new RegExp(
  "(?<!\\p{L})(?:lorsque|quand|chaque fois que|à chaque fois que|dès que|pendant que) vous (?!avez besoin|vous sentez)(?:ne )?\\p{L}+(?<!riez)(?<!iez)ez(?!\\p{L})|(?<!\\p{L})(?:si souvent|encore autant|toujours autant|depuis (?:longtemps|toujours|des années)|désormais|à nouveau|de nouveau|une fois de plus|habituel\\p{L}*|hebdomadaires?|vous arrive-t-il|continuez-vous|encore aujourd['’]hui)(?!\\p{L})",
  'iu',
);
/** Passé ou intention présupposés : relative sur un vécu ou un projet des membres. */
const PAST = new RegExp(
  "(?<!\\p{L})(?:que|qu['’]|dont) vous (?:avez|êtes|aviez|étiez) (?!(?:pu|grandi|hérité|appris|reçu|vu|entendu)(?!\\p{L}))\\p{L}+|(?<!\\p{L})(?:que|qu['’]|dont) vous (?:envisagez|prévoyez|comptez|projetez|préparez|attendez|organisez|planifiez)(?!\\p{L})|(?<!\\p{L})vos? \\p{L}+ (?:vécu|passé|traversé|connu|subi)\\p{L}*|(?<!\\p{L})(?:depuis|après|avant) (?:votre|vos) (?!rencontre|rencontres)\\p{L}+",
  'iu',
);
/** Possessifs autorisés : ce que tout membre a (famille, valeurs…), jamais un attribut ou un événement supposé. */
const POSSESSIVE_OK = new Set([
  'famille',
  'familles',
  'parents',
  'proches',
  'entourage',
  'culture',
  'cultures',
  'enfance',
  'vie',
  'quotidien',
  'foyer',
  'semaine',
  'journée',
  'journées',
  'avis',
  'besoin',
  'besoins',
  'valeur',
  'valeurs',
  'priorité',
  'priorités',
  'limite',
  'limites',
  'choix',
  'temps',
  'pays',
  'ville',
  'langue',
  'langues',
  'foyer',
  'façon',
  'manière',
  'yeux',
  'sens',
  'idée',
  'idées',
  'envie',
  'envies',
  'attentes',
  'regard',
  'place',
  'propre',
  'avenir',
  'histoire',
  'origines',
  'racines',
  'amis',
  'amitiés',
  'année',
  'années',
  'décision',
  'décisions',
  'vieux',
  'deux',
  'position',
  'positions',
  'réponse',
  'réponses',
  'rapport',
  'vôtres',
  'goûts',
  'caractère',
  'humeur',
]);
const OWN_SPIRIT = new Set([
  'pratiques',
  'foi',
  'convictions',
  'croyances',
  'religion',
  'pratique',
  'spiritualité',
  'traditions',
  'tradition',
]);
function possessiveIssue(text: string, theme: string): string | null {
  for (const m of text.matchAll(
    /(?<!\p{L})(?:votre|vos)\s+(?:(?:futur|future|futurs|futures|propre|propres|prochain|prochaine|ancien|ancienne|nouveau|nouvelle)\s+)?(\p{L}+)/giu,
  )) {
    const n = m[1].toLowerCase();
    if (POSSESSIVE_OK.has(n)) continue;
    // En hypothèse (« Si vous perdiez votre emploi… », « Si votre
    // partenaire… ») : une situation envisagée, pas un fait présupposé.
    if (/^si\s/iu.test(text.trim())) continue;
    if (OWN_SPIRIT.has(n) && (theme === 'spiritualite' || theme === 'famille'))
      continue;
    return m[0];
  }
  return null;
}
const SHARED_STATE = new RegExp(
  '(?<!\\p{L})vous (?:\\p{L}+(?<!riez)(?<!iez)ez|avez|êtes) (?:\\p{L}+ )?tous (?:les )?deux(?!\\p{L})',
  'iu',
);

/** Réponse individuelle révélée : « l'un d'entre vous juge… », « l'un de vous préfère… ». */
const WHO_ANSWERED = W(
  "l['’]un (?:de vous|d['’]entre vous) (?:juge|pense|trouve|estime|considère|préfère|veut|souhaite|refuse|accepte|rêve|tient|n['’]accepte|ne souhaite|a répondu|aimerait)",
);
/**
 * Règle structurelle de modalité : un verbe conjugué avec « vous » (sujet) doit
 * être un verbe d'opinion, de préférence ou de sens, au conditionnel ou à
 * l'imparfait d'enfance. Tout autre verbe au présent ou au passé composé
 * présuppose un fait de la vie des membres.
 */
const OPINION_VERBS = new Set([
  'pensez',
  'imaginez',
  'voyez',
  'trouvez',
  'estimez',
  'considérez',
  'préférez',
  'attendez',
  'souhaitez',
  'accordez',
  'donnez',
  'définissez',
  'mettez',
  'entendez',
  'appelez',
  'associez',
  'retenez',
  'jugez',
  'croyez',
  'savez',
  'dites',
  'percevez',
  'sentez',
  'appuyez',
  'tenez',
  'reconnaissez',
]);
const ALLOWED_PAST = new Set([
  'appris',
  'hérité',
  'reçu',
  'grandi',
  'vu',
  'entendu',
  'compris',
]);
function modalityIssue(text: string): string | null {
  const t = text.toLowerCase().replace(/’/g, "'");
  const hits: string[] = [];
  for (const m of t.matchAll(/(?<!\p{L})(\p{L}+)-vous(?!\p{L})/gu))
    hits.push(m[1]); // inversion : « vivez-vous »
  for (const m of t.matchAll(
    /(?<!\p{L})vous (?:ne |n'|vous |y |en |le |la |les |l')?(\p{L}+)(?!\p{L})/gu,
  ))
    hits.push(m[1]); // sujet : « vous vivez »
  for (const v of hits) {
    if (!v.endsWith('ez')) {
      continue; // pas un verbe conjugué à « vous » (ou forme non concernée)
    }
    if (v.endsWith('riez') || v.endsWith('iez')) continue; // conditionnel, imparfait (enfance), subjonctif
    if (/(?:erez|irez|rrez|urez|drez|vrez)$/.test(v)) continue; // futur : aucun fait passé ou présent supposé
    if (OPINION_VERBS.has(v)) continue;
    if (v === 'avez' || v === 'êtes') {
      const after = t
        .slice(t.indexOf(v) + v.length)
        .trim()
        .split(/\s+/)
        .slice(0, 3);
      if (
        after.some((w) => ALLOWED_PAST.has(w.replace(/[^\p{L}]/gu, ''))) ||
        after[0] === 'besoin' ||
        after.join(' ').startsWith('-vous besoin')
      )
        continue;
    }
    return v;
  }
  return null;
}

export function aiOnlyIssues(text: string, theme: string): string[] {
  const r: string[] = [];
  const mv = modalityIssue(text);
  if (mv) r.push(`P14 fait de vie présupposé (verbe « ${mv} »)`);
  if (WHO_ANSWERED.test(text)) r.push('P7 révèle la réponse de l’un des deux');
  if (EMOTION_PRESUPPOSED.test(text) || EMOTION_VERB.test(text))
    r.push('P10 émotion présupposée');
  if (HABIT.test(text)) r.push('P11 habitude présupposée');
  if (PAST.test(text)) r.push('P12 passé présupposé');
  const p = possessiveIssue(text, theme);
  if (p) r.push(`P13 possessif non autorisé (« ${p} »)`);
  if (SHARED_STATE.test(text)) r.push('P9 état partagé affirmé');
  return r;
}

/**
 * Mots qui rattachent une question à l'écart d'un thème, en plus des mots du
 * sujet de la preuve (« Désir d'enfants » → « enfant »).
 */
const THEME_WORDS: Record<string, RegExp> = {
  famille:
    /(?<!\p{L})(?:enfant|garde|beau|belle|parent|famil|visite|aîné|dot|mariage|foyer|chez vous|vivaient|habit)/iu,
  argent:
    /(?<!\p{L})(?:argent|jeu|mise|pari|casino|€|euro|épargn|dépens|budget|payer|pai|compte|fin de mois|salaire|somme|dette|envoy|aide financ|achat|achet|économ|emploi|chômage|professionn|revenu|soutenu|de côté)/iu,
  spiritualite:
    /(?<!\p{L})(?:foi|relig|pri|croy|culte|église|mosquée|spiritu|convers|enfant)/iu,
  intimite:
    /(?<!\p{L})(?:intim|désir|tendresse|mariage|attirance|pudeur|fidél)/iu,
  communication:
    /(?<!\p{L})(?:disput|désaccord|tension|pause|parler|silence|calm|colère|écout|réconcil)/iu,
  projet:
    /(?<!\p{L})(?:travail|carrière|emploi|profession|soir|heure|semaine|temps|week|rentr|ambition|tâche|rôle|enfant|projet|année)/iu,
  lieu: /(?<!\p{L})(?:pays|ville|déménag|vivre|habiter|lieu|rester|partir|loin|kilomètre|km|emploi|mutation|distance)/iu,
};

const deaccent = (x: string) =>
  x.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/**
 * La question parle-t-elle de l'écart cité ? Un mot de son sujet (5 lettres
 * au moins, racine de 5 lettres) ou un mot du thème doit y figurer.
 */
export function relatesToGap(text: string, gaps: EvidenceItem[]): boolean {
  const t = deaccent(text);
  return gaps.some((g) => {
    const stems = deaccent(g.topic)
      .split(/[^\p{L}]+/u)
      .filter((w) => w.length >= 5 && !GAP_STOPWORDS.has(w))
      .map((w) => w.slice(0, 5));
    return (
      stems.some((st) => t.includes(st)) || !!THEME_WORDS[g.theme]?.test(text)
    );
  });
}
const GAP_STOPWORDS = new Set([
  'quand',
  'autre',
  'entre',
  'place',
  'choisir',
  'faire',
  'avant',
  'apres',
]);

export interface Verdict {
  ok: boolean;
  reasons: string[];
}

/**
 * Vérifie une question de l'IA. `deterministic` : gabarit écrit par l'équipe
 * (la règle des exemples de consigne ne s'applique pas).
 */
export function validate(
  q: EvidencedQuestion,
  index: EvidenceItem[],
  opts: {
    safetyThemes?: Theme[];
    deterministic?: boolean;
    /**
     * Rédacteur du Sondeur : une question de l'IA porte uniquement sur un
     * écart réel, sans détour par l'enfance, la famille d'origine ou un proche.
     */
    gapOnly?: boolean;
    /**
     * V8.3 — question composée dans un cadre validé : les règles du rédacteur
     * s'appliquent aux cases remplies par l'IA, pas au texte fixe du cadre.
     */
    framedSlots?: string[];
  } = {},
): Verdict {
  const reasons: string[] = [];
  const byId = new Map(index.map((e) => [e.id, e]));
  const ev = q.evidence.map((id) => byId.get(id));
  if (!q.evidence.length) reasons.push('P1 aucune preuve');
  if (ev.some((e) => !e)) reasons.push('P1 preuve inconnue');
  const known = ev.filter((e): e is EvidenceItem => !!e);
  if (known.some((e) => e.theme !== q.themeKey))
    reasons.push('P2 preuve d’un autre thème');
  if (
    known.some((e) => e.kind === 'safety') ||
    (opts.safetyThemes ?? []).includes(q.themeKey)
  )
    reasons.push('P3 thème de sécurité réservé aux questions de limite');
  const kinds = new Set(known.map((e) => e.kind));
  if (q.claim === 'divergence' && !kinds.has('divergence'))
    reasons.push('P4 écart déclaré sans preuve d’écart');
  if (q.claim === 'convergence' && !kinds.has('convergence'))
    reasons.push('P4 accord déclaré sans preuve d’accord');
  const { lead } = sentences(q.text);
  if (DIFF_CLAIM.test(q.text) && !kinds.has('divergence'))
    reasons.push('P5 affirme un désaccord non établi');
  if (AGREE_CLAIM.test(q.text) && !kinds.has('convergence'))
    reasons.push('P5 affirme un accord non établi');
  if (DIFF_CLAIM.test(q.text) && q.claim !== 'divergence')
    reasons.push('P5 affirme un désaccord mais déclare une autre nature');
  if (ATTRIBUTION.test(q.text))
    reasons.push(
      'P6 attribue une peur, une intention, un comportement ou un passé',
    );
  const agreementLead =
    !/^(?:imaginez|pensez|repensez|figurez|supposons|si )/i.test(lead.trim()) &&
    /(?<!\p{L})(?:tous (?:les )?deux|pour vous deux|ni l[’']un ni l[’']autre|l[’']un comme l[’']autre)(?!\p{L})/iu.test(
      lead,
    );
  if (STATE_DECLARED.test(lead) && !(agreementLead && kinds.has('convergence')))
    reasons.push('P6 état intérieur affirmé avant la question');
  if (agreementLead && !kinds.has('convergence'))
    reasons.push('P5 phrase d’accord sans preuve d’accord');
  if (agreementLead && !opts.deterministic)
    reasons.push(
      'P9 phrase d’accord réservée aux gabarits écrits par l’équipe',
    );
  const t = norm(q.text);
  for (const e of known.filter(
    (x) => !(opts.deterministic && x.kind === 'convergence'),
  ))
    for (const p of e.privateTexts)
      if (
        p &&
        (t.includes(norm(p)) ||
          sharesFourWords(t, norm(p)) ||
          (!opts.deterministic && rareBigramLeak(t, norm(p), norm(e.topic))))
      )
        reasons.push('P7 reprend la réponse d’un membre');
  if (
    !(opts.deterministic
      ? passesFormRules(q.text)
      : isWellFormedQuestion(q.text))
  )
    reasons.push('P8 règles de forme existantes');
  if (!opts.deterministic) reasons.push(...aiOnlyIssues(q.text, q.themeKey));
  if (opts.gapOnly && !opts.deterministic) {
    if (ORIGIN_DETOUR.test(q.text))
      reasons.push(
        'P15 détour par l’enfance, la famille d’origine ou un proche',
      );
    reasons.push(
      ...(opts.framedSlots
        ? opts.framedSlots.flatMap((s) => gapQuestionIssues(s))
        : gapQuestionIssues(q.text)),
    );
    // Accords et sujets neutres restent aux gabarits écrits par l'équipe.
    const gaps = known.filter((e) => e.kind === 'divergence');
    if (gaps.length && gaps.every((e) => e.shared))
      reasons.push('P18 risque partagé (mêmes réponses), pas un écart');
    if (q.claim !== 'divergence' || !kinds.has('divergence'))
      reasons.push('P16 question de l’IA hors écart (accord ou neutre)');
    else if (
      !relatesToGap(
        q.text,
        known.filter((e) => e.kind === 'divergence'),
      )
    )
      reasons.push('P17 sans lien avec l’écart cité');
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}

/** Repli : question rejetée → gabarit déterministe du créneau, sinon question neutre du thème. */
export const FALLBACK_ORDER = [
  'gabarit déterministe du même sujet',
  'question neutre du thème (THEME_POOL)',
];

/** Index transmis à l'IA, en lignes lisibles (aucune réponse de membre). */
export function describeEvidenceForAi(items: EvidenceItem[]): string {
  const kind = {
    divergence: 'écart',
    convergence: 'accord',
    neutral: 'neutre',
  } as const;
  return evidenceForAi(items)
    .map(
      (e) =>
        `${e.id} · ${e.theme} · ${e.shared ? 'risque partagé (mêmes réponses, aucune question)' : (kind[e.kind as keyof typeof kind] ?? e.kind)}${
          e.kind === 'neutral' ? '' : ` · ${e.topic}`
        }${e.severity ? ` (${e.severity})` : ''}`,
    )
    .join('\n');
}

/** Nature déclarée par l'IA (« ecart », « accord », « neutre ») → nature du contrat. */
export function parseClaim(value: unknown): EvidencedQuestion['claim'] | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (v === 'ecart' || v === 'divergence') return 'divergence';
  if (v === 'accord' || v === 'convergence') return 'convergence';
  if (v === 'neutre' || v === 'neutral') return 'neutral';
  return null;
}

/**
 * Trace enregistrée avec une question servie (HarmonyQuestion.meta) : les
 * identifiants de preuves et les sujets d'entretien, jamais une réponse.
 */
export interface EvidenceTrace {
  claim: EvidencedQuestion['claim'] | 'safety';
  evidence: string[];
  subjects: string[];
  topics: string[];
}

export function traceOf(
  ids: string[],
  index: EvidenceItem[],
  claim: EvidenceTrace['claim'],
): EvidenceTrace {
  const items = ids
    .map((id) => index.find((e) => e.id === id))
    .filter((e): e is EvidenceItem => !!e);
  return {
    claim,
    evidence: items.map((e) => e.id),
    subjects: [...new Set(items.flatMap((e) => e.subjects))],
    topics: [
      ...new Set(items.filter((e) => e.kind !== 'neutral').map((e) => e.topic)),
    ],
  };
}

/**
 * Trace d'une question servie par le Sondeur : gabarit d'écart ou d'accord
 * (le sujet du moteur), question de l'IA (ses preuves validées), gabarit du
 * thème (preuve neutre), question de limite (sécurité).
 */
export function servedTrace(
  q: {
    source?: string;
    subject?: string;
    themeKey?: string;
    evidence?: string[];
    claim?: string;
  },
  index: EvidenceItem[],
): EvidenceTrace {
  const theme = q.themeKey ?? '';
  if (q.source === 'ia')
    return traceOf(q.evidence ?? [], index, parseClaim(q.claim) ?? 'neutral');
  const subject = (q.subject ?? '').split(':')[0];
  if (
    (q.source === 'divergence' || q.source === 'convergence') &&
    subject &&
    subject !== 'securite' &&
    subject !== 'controle'
  ) {
    const kind = q.source;
    // Un écart de protection (M8_Q20) est indexé comme sécurité : sa
    // question écrite à l'avance garde cette nature dans la trace.
    const items = index.filter(
      (e) =>
        (e.kind === kind || (kind === 'divergence' && e.kind === 'safety')) &&
        e.theme === theme &&
        e.subjects.includes(subject),
    );
    const claim = items.some((e) => e.kind === 'safety') ? 'safety' : kind;
    return {
      ...traceOf(
        items.map((e) => e.id),
        index,
        claim,
      ),
      subjects: [subject],
    };
  }
  if (q.source === 'divergence')
    // Question de limite : sujet de sécurité, aucune réponse citée.
    return { claim: 'safety', evidence: [], subjects: [subject], topics: [] };
  return traceOf([`N-${theme}`], index, 'neutral');
}

/**
 * Réponses d'entretien des deux membres sur leurs écarts (libellés d'option,
 * en français et en anglais), y compris celles qui ne sont jamais citées
 * (sujet sensible, tendance) : servent au filtre anti-fuite, jamais à l'IA.
 */
export function memberAnswerTexts(report: DivergenceReport): string[] {
  const out = new Set<string>();
  for (const d of report.divergences)
    for (const v of [d.a, d.b]) {
      if (!v?.text) continue;
      out.add(v.text);
      for (const en of answerTextsEn(d.questionId, [v.key])) out.add(en);
    }
  return [...out];
}

// ─── Version anglaise (Sondeur bilingue) ───────────────────────────────────

/** Texte anglais d'une réponse d'entretien (pour repérer sa reprise dans une question). */
function answerTextsEn(questionId: string, keys: string[]): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const v82 = V82_EN[questionId]?.options[key];
    if (v82) {
      out.push(v82);
      continue;
    }
    const q = QUESTION_INDEX.get(questionId);
    const i = q?.options.findIndex((o) => o.key === key) ?? -1;
    const en = i >= 0 ? QUESTIONS_EN[questionId]?.options?.[i] : undefined;
    if (en) out.push(en);
  }
  return out;
}

function convergenceTextEn(questionId: string, answer: string): string[] {
  const q = V82_INDEX.get(questionId) ?? QUESTION_INDEX.get(questionId);
  const key = q?.options.find((o) => o.text === answer)?.key;
  return key ? answerTextsEn(questionId, [key]) : [];
}

const WE = (s: string) => new RegExp(`(?<![a-z])(?:${s})(?![a-z])`, 'i');
/** Désaccord affirmé (anglais). */
const DIFF_CLAIM_EN = WE(
  [
    'your (?:disagreement|differences?|difference of opinion|conflict)',
    "you (?:don't|do not|never) (?:see eye to eye|agree|share the same)",
    'you(?: two)? (?:disagree|differ|see things differently|have different views)',
    'one of you [^?]{0,60}(?:while|whereas|but) the other',
  ].join('|'),
);
/** Accord affirmé (anglais). */
const AGREE_CLAIM_EN = WE(
  [
    'you both',
    'both of you',
    'you share',
    'your shared',
    'your common',
    'you (?:agree|are on the same page)',
    "you're both",
  ].join('|'),
);
/** État intérieur, comportement ou passé attribués (anglais). */
const ATTRIBUTION_EN = WE(
  [
    'your (?:fears?|anxiety|anxieties|worries|worry|jealousy|distrust|mistrust|insecurit(?:y|ies)|resentment|anger|hurt|wounds?|trauma|doubts?|hesitations?|reluctance|reservations|regrets?|intentions?|struggles?)',
    "(?:since|as|now that|because) you(?:'re| are| have| feel| fear| want| plan)",
    "why (?:do|did|are|don't|won't) you",
    'your (?:ex|former partner|last relationship|divorce|separation|break-?up|past relationships?)',
    'you (?:have|have been|were) (?:hurt|cheated on|betrayed|left)',
    'when you (?:argue|fight|disagree)',
    'your (?:arguments|fights|quarrels)',
    'what (?:scares|frightens|worries|bothers|hurts) you',
  ].join('|'),
);
/** Habitude présupposée (anglais). */
const HABIT_EN = WE(
  '(?:whenever|every time) you|do you (?:still|always|usually)|you (?:always|usually|keep(?! up)|tend to)|once again|any more|anymore|these days',
);
/** Réponse individuelle révélée (anglais). */
const WHO_ANSWERED_EN = WE(
  [
    'one of you (?:thinks|believes|wants|said|says|answered|answer|prefers|refuses|feels|would rather|chose|picked)',
    '(?:did|does|would) one of you',
    'which (?:one )?of you (?:said|answered|chose|picked|thinks|wants)',
    'your partner (?:said|says|answered|chose|picked|thinks|believes|wants|prefers|refuses)',
  ].join('|'),
);
/** Reste de français dans un texte anglais (mots fréquents, accents). */
const FRENCH_RESIDUE =
  /(?:\b(?:vous|votre|vos|est-ce|qu'|l'autre|avec|pour|dans|quel(?:le)?s?|comment)\b|[àâçéèêëîïôûùœ])/i;

/**
 * Contrôles de la version anglaise d'une question de l'IA : forme, accord ou
 * désaccord affirmés sans preuve, attribution, habitude, réponse révélée,
 * reprise d'une réponse (dans sa version anglaise), reste de français.
 */
export function validateEn(
  textEn: string | undefined,
  q: EvidencedQuestion,
  index: EvidenceItem[],
): Verdict {
  const reasons: string[] = [];
  const t = (textEn ?? '').trim();
  if (!t) return { ok: false, reasons: ['EN1 version anglaise absente'] };
  // Échelle avec relance (« From 0 to 10…? Why…? ») : deux « ? » admis, comme en français.
  if (!t.endsWith('?') || (t.match(/\?/g) ?? []).length > 2)
    reasons.push('EN2 une seule question, terminée par « ? »');
  if (t.length > 180) reasons.push('EN2 plus de 180 caractères');
  if (FRENCH_RESIDUE.test(t)) reasons.push('EN3 reste de français');
  const byId = new Map(index.map((e) => [e.id, e]));
  const kinds = new Set(
    q.evidence.map((id) => byId.get(id)?.kind).filter(Boolean),
  );
  if (DIFF_CLAIM_EN.test(t) && !kinds.has('divergence'))
    reasons.push('EN4 affirme un désaccord non établi');
  if (AGREE_CLAIM_EN.test(t))
    reasons.push('EN4 affirme un accord (réservé aux gabarits)');
  if (ATTRIBUTION_EN.test(t))
    reasons.push(
      'EN5 attribue une peur, une intention, un comportement ou un passé',
    );
  if (HABIT_EN.test(t)) reasons.push('EN5 habitude présupposée');
  if (WHO_ANSWERED_EN.test(t))
    reasons.push('EN6 révèle la réponse de l’un des deux');
  const low = t.toLowerCase();
  for (const id of q.evidence)
    for (const p of byId.get(id)?.privateTexts ?? [])
      if (p && p.length >= 12 && low.includes(p.toLowerCase()))
        reasons.push('EN7 reprend la réponse d’un membre');
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}
