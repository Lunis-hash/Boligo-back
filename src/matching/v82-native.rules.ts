/**
 * Grand Entretien V8.2 — lecture par le moteur de compatibilité.
 *
 * 1. Vue moteur (`v82EngineView`) : les questions V7 reprises telles quelles
 *    en V8.2 sont lues directement. Une réponse qui n'existe pas en V7.1
 *    (« je préfère ne pas répondre », « non applicable », option ajoutée) est
 *    retirée : le moteur ignore une règle dont une réponse manque, donc
 *    l'absence ne crée ni écart ni exclusion. Quelques questions V8.2 qui
 *    précisent une question V7 ne fournissent la réponse V7 que lorsque le
 *    sens est identique (couche de compatibilité du modèle validé,
 *    `model.py` → COMPAT) ; sinon rien.
 * 2. Règles natives (`v82NativeReport`) : les questions propres à la V8.2
 *    sont lues avec leurs propres codes, sans conversion (stratégie A : N1 à
 *    N11), plus les règles du modèle V8.2 que la vue ne peut pas porter
 *    (N12 enfants de l'autre, N13 Mahr, N14 cadre d'exclusivité) et la
 *    reformulation de M8_Q13 (N15).
 *
 * Aucune règle native n'est une alerte de sécurité ; aucune n'est critique,
 * sauf deux exclusions déclarées du modèle validé (N12 : « je ne pourrais pas
 * l'accepter » face à des enfants mineurs ; N13 : « indispensable » face à
 * « je n'y adhère pas »).
 */
import type {
  AnswerView,
  Convergence,
  Divergence,
  RawAnswers,
  Severity,
  Theme,
} from './divergence.engine';
import {
  QUESTION_INDEX,
  answerKeys,
  FREE_TEXT_SUFFIX,
} from '../interview/questions.data';
import { V82_INDEX, isV82Answers } from '../interview/questions.v82';

type Pair = string; // deux codes triés : « AD »

export interface NativeRule {
  id: string;
  questionId: string;
  /** Sujets V7 que la règle remplace (traçabilité ; aucune conversion). */
  replaces: string[];
  theme: Theme;
  label: string;
  /** Gravité par paire de codes différents ; une paire absente est compatible. */
  pairs: Record<Pair, Severity>;
  /** Codes qui ne sont pas une position (« je ne sais pas », « ne pas répondre ») : aucune comparaison. */
  neutralCodes: string[];
  /** Échelle d'accord : écart de 3 points = à explorer, 2 points = nuance. */
  scale?: boolean;
  /** Réponses partagées qui valent un accord. */
  agreeOn: string[];
  /** Règle croisée (deux questions) : remplace la comparaison par paires. */
  cross?: (x: RawAnswers, y: RawAnswers) => CrossResult | null;
}

interface CrossResult {
  severity: Severity;
  /** Réponse de x (question de la règle) et réponse de y (autre question). */
  x: AnswerView;
  y: AnswerView;
}

const PNR = 'Je préfère ne pas répondre';

function optionText(id: string, key: string): string {
  const q = V82_INDEX.get(id) ?? QUESTION_INDEX.get(id);
  return q?.options.find((o) => o.key === key)?.text ?? key;
}

function keysOf(value: string | undefined): string[] {
  return answerKeys(value);
}

const MINOR = ['B', 'C', 'D'];

export const NATIVE_RULES: NativeRule[] = [
  {
    id: 'N1',
    questionId: 'V82_M1_03',
    replaces: ['M1_Q02', 'M1_Q13'],
    theme: 'famille',
    label: 'Les traditions dans le futur foyer',
    pairs: {
      AC: 'majeure',
      AB: 'mineure',
      BC: 'mineure',
      AD: 'moderee',
      CD: 'mineure',
      BD: 'mineure',
    },
    neutralCodes: ['E'],
    agreeOn: ['A', 'B', 'C'],
  },
  {
    id: 'N2',
    questionId: 'V82_M1_04',
    replaces: ['M1_Q15'],
    theme: 'famille',
    label: 'Décider face à une famille qui désapprouve',
    pairs: {
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    },
    neutralCodes: [],
    agreeOn: ['A', 'C', 'D'],
  },
  {
    // Corrigée : la règle croisait autrefois le lien avec l'ex (V82_M3_02 D)
    // et « revoir un ex sans me le dire » (M6_Q19 D). Ce second item parle du
    // secret, pas de l'amitié : le croisement prêtait à l'un une crainte qu'il
    // n'a pas déclarée. La règle compare désormais la même question, posée aux
    // seuls membres qui ont vécu une relation sérieuse (V82_M3_01 = B, C, D).
    // Aucun accord n'est affiché : « aucun contact » partagé est un fait
    // personnel, pas une vision commune.
    id: 'N3',
    questionId: 'V82_M3_02',
    replaces: ['M3_Q13'],
    theme: 'intimite',
    label: 'La place d’un ancien partenaire dans la vie de chacun',
    pairs: {
      AD: 'moderee',
      AC: 'mineure',
      BD: 'mineure',
      CD: 'mineure',
    },
    neutralCodes: ['E'],
    agreeOn: [],
  },
  {
    id: 'N4',
    questionId: 'V82_M4_05',
    replaces: ['M4_Q03', 'M4_Q04'],
    theme: 'famille',
    label: 'Le partage des tâches et des rôles',
    pairs: {
      AD: 'majeure',
      BD: 'majeure',
      CD: 'moderee',
      DE: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      AC: 'mineure',
    },
    neutralCodes: [],
    agreeOn: ['A', 'B', 'D', 'E'],
  },
  {
    id: 'N5',
    questionId: 'V82_M4_02',
    replaces: ['M4_Q11'],
    theme: 'argent',
    label: 'Le soutien quand l’autre perd son emploi',
    pairs: {
      AD: 'majeure',
      BD: 'moderee',
      AC: 'moderee',
      CD: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
    },
    neutralCodes: [],
    agreeOn: ['A', 'B'],
  },
  {
    id: 'N6',
    questionId: 'V82_M4_06',
    replaces: ['M4_Q12'],
    theme: 'argent',
    label: 'Le niveau de vie face à un projet commun',
    pairs: {
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      CD: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
    },
    neutralCodes: [],
    agreeOn: ['A', 'B'],
  },
  {
    id: 'N7',
    questionId: 'V82_M5_01',
    replaces: ['M5_Q02'],
    theme: 'famille',
    label: 'Protéger l’autre face à un proche',
    pairs: {
      AD: 'majeure',
      BD: 'moderee',
      CD: 'mineure',
      AC: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
    },
    neutralCodes: [],
    agreeOn: ['A', 'B'],
  },
  {
    id: 'N8',
    questionId: 'V82_M5_03',
    replaces: ['M5_Q03'],
    theme: 'famille',
    label: 'Accueillir un proche à la maison',
    pairs: {
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      CD: 'mineure',
      AB: 'mineure',
      BC: 'mineure',
    },
    neutralCodes: [],
    agreeOn: ['B', 'D'],
  },
  {
    id: 'N9',
    questionId: 'V82_M5_04',
    replaces: ['M5_Q10'],
    theme: 'famille',
    label: 'Choisir entre famille et couple',
    pairs: {
      AC: 'majeure',
      AB: 'moderee',
      AD: 'moderee',
      BC: 'mineure',
      CD: 'mineure',
      BD: 'mineure',
    },
    neutralCodes: [],
    agreeOn: ['B', 'C'],
  },
  {
    id: 'N10',
    questionId: 'V82_M9_03',
    replaces: ['M7_Q08'],
    theme: 'projet',
    label: 'Le temps à soi dans le couple',
    pairs: {},
    neutralCodes: [],
    scale: true,
    agreeOn: [],
  },
  {
    id: 'N11',
    questionId: 'V82_M8_05',
    replaces: ['M7_Q36'],
    theme: 'lieu',
    label: 'Vivre un jour dans un autre pays',
    pairs: { AC: 'moderee', BC: 'mineure', AB: 'mineure' },
    neutralCodes: ['D'],
    agreeOn: ['A', 'C'],
  },
  {
    // Modèle V8.2 (r_stepchildren) : M0_Q14 de l'un face à la situation réelle
    // de l'autre (V82_M0_03). La vue moteur ne la porte pas (enfants à charge :
    // nombre inconnu), d'où une règle native.
    id: 'N12',
    questionId: 'M0_Q14',
    replaces: [],
    theme: 'famille',
    label: 'Accueillir les enfants de l’autre',
    pairs: {},
    neutralCodes: [],
    agreeOn: [],
    cross: (x, y) => {
      const t = x.M0_Q14;
      const kids = keysOf(y.V82_M0_03);
      if (!t || !kids.length || kids.includes('A')) return null;
      const minor = kids.some((k) => MINOR.includes(k));
      let severity: Severity | null = null;
      if (t === 'D' && minor) severity = 'critique';
      else if (t === 'D' && kids.includes('E')) severity = 'majeure';
      else if (t === 'B' && kids.includes('B')) severity = 'majeure';
      else if (t === 'C' && minor) severity = 'moderee';
      if (!severity) return null;
      return {
        severity,
        x: { key: t, text: optionText('M0_Q14', t) },
        y: {
          key: y.V82_M0_03,
          text: kids.map((k) => optionText('V82_M0_03', k)).join(', '),
        },
      };
    },
  },
  {
    // Modèle V8.2 (r_mahr) : « indispensable » face à « je n'y adhère pas,
    // même si mon/ma partenaire y tient » = incompatibilité déclarée.
    id: 'N13',
    questionId: 'V82_M4_08',
    replaces: [],
    theme: 'spiritualite',
    label: 'Le Mahr',
    pairs: {
      AD: 'critique',
      BD: 'majeure',
      AB: 'moderee',
      BC: 'moderee',
      CD: 'moderee',
    },
    neutralCodes: ['E'],
    agreeOn: [],
  },
  {
    // Modèle V8.2 (r_exclusivity) : « ouvert(e) à d'autres formes » n'est pas
    // un refus de l'exclusivité ; face à l'exclusivité réciproque, écart majeur.
    id: 'N14',
    questionId: 'V82_M8_03',
    replaces: [],
    theme: 'intimite',
    label: 'Le cadre d’exclusivité',
    pairs: {
      AC: 'majeure',
      AB: 'moderee',
      AD: 'moderee',
      BC: 'moderee',
      BD: 'moderee',
      CD: 'moderee',
    },
    neutralCodes: ['E'],
    agreeOn: [],
  },
  {
    // Stratégie B : M8_Q13 reformulée (nouvel identifiant).
    id: 'N15',
    questionId: 'V82_M8_06',
    replaces: ['M8_Q13'],
    theme: 'projet',
    label: 'L’engagement dans une période difficile',
    pairs: {
      AD: 'majeure',
      AC: 'moderee',
      BD: 'moderee',
      AB: 'mineure',
      BC: 'mineure',
      CD: 'mineure',
    },
    neutralCodes: ['E'],
    agreeOn: ['A', 'B'],
  },
];

export const NATIVE_RULE_IDS: ReadonlySet<string> = new Set(
  NATIVE_RULES.map((r) => r.questionId),
);

/** Accords natifs affichables (phrase factuelle sur une réponse commune). */
export const NATIVE_CONVERGENCE_LABELS: Record<string, string> = {
  'V82_M1_03:A':
    'Vous souhaitez tous les deux un foyer qui partage les mêmes traditions',
  'V82_M1_03:B': 'Vous imaginez tous les deux un équilibre entre deux cultures',
  'V82_M1_03:C':
    'Vous laisseriez tous les deux chacun garder ses propres pratiques',
  'V82_M1_04:A': 'L’accord de vos familles compte pour vous deux',
  'V82_M1_04:C':
    'Vous écouteriez tous les deux vos familles avant de décider à deux',
  'V82_M1_04:D': 'Le choix du couple passerait d’abord pour vous deux',
  'V82_M4_05:A':
    'Vous partageriez tous les deux les tâches selon le temps et la charge de chacun',
  'V82_M4_05:B': 'Vous tenez tous les deux à un partage égal des tâches',
  'V82_M4_05:D':
    'Vous envisagez tous les deux des rôles définis à l’avance pour l’homme et la femme',
  'V82_M4_05:E':
    'Vous aimeriez tous les deux reparler régulièrement de l’organisation du foyer',
  'V82_M4_02:A':
    'Vous soutiendriez tous les deux l’autre sans fixer d’échéance',
  'V82_M4_02:B':
    'Vous établiriez tous les deux un plan et des limites ensemble',
  'V82_M4_06:A':
    'Vous réduiriez tous les deux volontiers votre train de vie pour un projet commun',
  'V82_M4_06:B':
    'Vous accepteriez tous les deux un effort, avec un budget et une date pour refaire le point',
  'V82_M5_01:A':
    'Face à un proche injuste, vous poseriez tous les deux une limite tout de suite',
  'V82_M5_01:B':
    'Vous soutiendriez tous les deux l’autre, puis vous reparleriez au proche en privé',
  'V82_M5_03:B':
    'Pour accueillir un proche, vous voudriez tous les deux fixer à deux une durée et des règles',
  'V82_M5_03:D':
    'Ni l’un ni l’autre ne souhaite de cohabitation prolongée avec un proche',
  'V82_M5_04:B':
    'Vous chercheriez tous les deux une solution équilibrée entre famille et couple',
  'V82_M5_04:C':
    'Vous privilégieriez tous les deux l’engagement pris envers l’autre',
  'V82_M8_05:A':
    'Vous êtes tous les deux ouverts à construire un projet dans un autre pays',
  'V82_M8_05:C':
    'Vous souhaitez tous les deux rester durablement dans votre pays actuel',
  'V82_M8_06:A':
    'Pour vous deux, réparer passe d’abord dans une période difficile',
  'V82_M8_06:B': 'Pour vous deux, la séparation resterait un dernier recours',
};

const SCALE_VALUE: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };

function nativeView(id: string, key: string): AnswerView {
  return { key, text: optionText(id, key) };
}

function isPosition(rule: NativeRule, id: string, key: string): boolean {
  return (
    !!key &&
    !rule.neutralCodes.includes(key) &&
    key !== 'NA' &&
    optionText(id, key) !== PNR
  );
}

export interface NativeReport {
  divergences: Divergence[];
  convergences: Convergence[];
  /** Règles natives réellement comparées (les deux réponses présentes). */
  compared: number;
  /** Points de comparaison (affinités par module). */
  points: Array<{ questionId: string; severity?: Severity; same: boolean }>;
  /** Traçabilité : règle, question, codes. */
  evidence: string[];
}

/** Écarts et accords natifs d'un couple, sur les réponses V8.2 brutes. */
export function v82NativeReport(a: RawAnswers, b: RawAnswers): NativeReport {
  const out: NativeReport = {
    divergences: [],
    convergences: [],
    compared: 0,
    points: [],
    evidence: [],
  };
  for (const r of NATIVE_RULES) {
    const qid = r.questionId;
    if (r.cross) {
      const ab = r.cross(a, b);
      const ba = r.cross(b, a);
      if (a[qid] || b[qid]) out.compared++;
      const rank = { critique: 3, majeure: 2, moderee: 1, mineure: 0 };
      const pick =
        ab && (!ba || rank[ab.severity] >= rank[ba.severity])
          ? { res: ab, aIsX: true }
          : ba
            ? { res: ba, aIsX: false }
            : null;
      if (!pick) continue;
      const { res, aIsX } = pick;
      out.points.push({ questionId: qid, severity: res.severity, same: false });
      out.divergences.push({
        questionId: qid,
        theme: r.theme,
        severity: res.severity,
        label: r.label,
        question: r.label,
        a: aIsX ? res.x : res.y,
        b: aIsX ? res.y : res.x,
      });
      out.evidence.push(`${r.id}:${qid}+V82_M0_03`);
      continue;
    }
    const ka = a[qid];
    const kb = b[qid];
    if (!isPosition(r, qid, ka) || !isPosition(r, qid, kb)) continue;
    out.compared++;
    if (ka === kb) {
      out.points.push({ questionId: qid, same: true });
      const label = NATIVE_CONVERGENCE_LABELS[`${qid}:${ka}`];
      if (r.agreeOn.includes(ka) && label) {
        out.convergences.push({
          questionId: qid,
          theme: r.theme,
          label,
          answer: optionText(qid, ka),
          topic: r.label,
        });
        out.evidence.push(`${r.id}:${qid}=${ka}`);
      }
      continue;
    }
    let severity: Severity | undefined;
    if (r.scale) {
      const gap = Math.abs((SCALE_VALUE[ka] ?? 0) - (SCALE_VALUE[kb] ?? 0));
      severity = gap >= 3 ? 'moderee' : gap === 2 ? 'mineure' : undefined;
    } else severity = r.pairs[[ka, kb].sort().join('')];
    out.points.push({ questionId: qid, severity, same: false });
    if (!severity) continue;
    out.divergences.push({
      questionId: qid,
      theme: r.theme,
      severity,
      label: r.label,
      question: optionTextQuestion(qid) ?? r.label,
      a: nativeView(qid, ka),
      b: nativeView(qid, kb),
    });
    out.evidence.push(`${r.id}:${qid}:${ka}/${kb}`);
  }
  return out;
}

function optionTextQuestion(id: string): string | undefined {
  return V82_INDEX.get(id)?.text;
}

// ─── Vue moteur ─────────────────────────────────────────────────────────────

/** Réponse V8.2 → réponse V7 (seulement quand le sens est identique). */
const COMPAT: Array<[string, string, Record<string, string>]> = [
  // [question V7, question V8.2, codes V8.2 → codes V7]
  ['M3_Q11', 'V82_M3_01', { A: 'E', B: 'A', C: 'B' }],
  ['M4_Q01', 'V82_M4_01', { A: 'A', B: 'B', C: 'C', D: 'D' }],
  ['M4_Q15', 'V82_M4_05', { A: 'C' }],
  ['M4_Q09', 'V82_M4_04', { A: 'A', C: 'C' }],
  ['M5_Q01', 'V82_M5_02', { B: 'B', D: 'D' }],
  ['M6_Q17', 'V82_M6_09', { A: 'A', D: 'C' }],
  ['M7_Q07', 'V82_M8_05', { A: 'D' }],
  ['M8_Q01', 'V82_M8_01', { A: 'A', B: 'B', D: 'D' }],
  ['M8_Q17', 'V82_M8_02', { A: 'A', B: 'B' }],
  ['M8_Q15', 'V82_M8_04', { A: 'B', B: 'C' }],
  ['M9_Q01', 'V82_M9_01', { A: 'A' }],
  ['M10_Q16', 'V82_M10_04', { A: 'A', B: 'B', C: 'C' }],
];

/** Religion V8.2 : agnostique et athée appartiennent à la famille « sans religion » (I). */
const FAITH_FAMILY: Record<string, string> = { L: 'I', M: 'I' };

/**
 * Réponses lues par le moteur V7.1 pour un entretien V8.2. Un entretien V7
 * (ou V6) est rendu tel quel.
 */
export function v82EngineView(raw: RawAnswers): RawAnswers {
  if (!isV82Answers(raw)) return raw;
  const out: RawAnswers = {};
  for (const [id, value] of Object.entries(raw)) {
    if (id.endsWith(FREE_TEXT_SUFFIX)) {
      if (QUESTION_INDEX.has(id.slice(0, -FREE_TEXT_SUFFIX.length)))
        out[id] = value;
      continue;
    }
    const v71 = QUESTION_INDEX.get(id);
    if (!v71 || V82_INDEX.get(id) === undefined) continue;
    const mapped =
      id === 'M1_Q16' ? (FAITH_FAMILY[value] ?? value) : (value ?? '');
    const keys = answerKeys(mapped);
    if (keys.length && keys.every((k) => v71.options.some((o) => o.key === k)))
      out[id] = mapped;
  }
  // Enfants : « je n'ai pas d'enfant » seulement (le nombre d'enfants à charge
  // est inconnu en V8.2 ; la règle N12 lit la situation réelle).
  if (keysOf(raw.V82_M0_03).join(',') === 'A') out.M0_Q05 = 'A';
  for (const [v7, v82, map] of COMPAT) {
    const v = map[raw[v82]];
    if (v) out[v7] = v;
  }
  return out;
}
