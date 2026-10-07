/**
 * Passerelle entre les entretiens V6 et V7 du Grand Entretien.
 *
 * Les 14 membres actuels ont répondu à la V6 ; les nouveaux répondent à la
 * V7. Pour que deux membres de versions différentes restent comparables, une
 * réponse V6 est lue dans les termes de la V7 quand, et seulement quand, le
 * sens des clés est le même. Rien n'est réécrit en base : la lecture se fait
 * à chaque calcul.
 *
 * Les thèmes que la V7 mesure autrement (religion, alimentation, ce qui est
 * non négociable) ont ici leur propre lecture, qui accepte l'une ou l'autre
 * version.
 */
import { answerKeys } from '../interview/questions.data';
import type { RawAnswers } from './divergence.engine';

/**
 * Réponse V7 déduite d'une réponse V6 de même sens (clé V6 → clé V7). Une clé
 * V6 absente de la table n'a pas d'équivalent sûr : la question V7 reste sans
 * réponse, et le moteur l'ignore.
 */
export const LEGACY_UPGRADES: Array<{
  to: string;
  from: string;
  map: Record<string, string>;
}> = [
  // Doublon V6 retiré : mêmes quatre options, mot pour mot.
  { to: 'M5_Q01', from: 'M1_Q10', map: { A: 'A', B: 'B', C: 'C', D: 'D' } },
  // V7.1 : « rédhibitoire » portait sur le tabac, l'alcool OU d'autres
  // substances : ce n'est pas un refus du tabac (il reste lu, à explorer,
  // par la règle de l'alcool). « Acceptable avec modération » ne dit pas non
  // plus ce que l'on accepte du tabac ; seul « sans importance » est sûr.
  { to: 'M0_Q11', from: 'M0_Q08', map: { D: 'C' } },
  // Place de l'intimité : « pilier », « important sans être déterminant »,
  // « se construit avec le temps ». La réponse refuge (D) n'a pas d'équivalent.
  { to: 'M10_Q16', from: 'M6_Q06', map: { A: 'A', B: 'B', C: 'D' } },
  // S'excuser en premier : seules les deux réponses nettes ont un équivalent.
  { to: 'M2_Q22', from: 'M2_Q08', map: { A: 'A', D: 'D' } },
  // V7.1 — dire non à l'intimité : « alternative tendre », « j'accepte
  // pour faire plaisir » et « non sans culpabilité » gardent leur sens ;
  // « j'ai du mal à refuser » n'a pas d'équivalent sûr.
  { to: 'M10_Q19', from: 'M6_Q08', map: { A: 'A', B: 'B', C: 'D' } },
  // V7.1 — polygamie : « inacceptable », « pas pour mon couple » et
  // « envisageable » gardent leur sens ; « en parler en personne » n'est pas
  // « pas de position arrêtée ».
  { to: 'M1_Q20', from: 'M1_Q11', map: { A: 'A', B: 'B', C: 'C' } },
  // V7.1 — dot : « obligation » → indispensable ; « tradition symbolique »
  // et « modernisée » → importante sous une forme symbolique ou modernisée.
  // « Pas dans ma culture, ou je n'y adhère pas » mêlait deux réponses.
  { to: 'M4_Q17', from: 'M4_Q07', map: { A: 'A', B: 'B', C: 'B' } },
  // V7.1 — délai d'engagement : « dans les 12 mois » → dans l'année ;
  // « dans 2 à 3 ans » → deux à trois ans ; « sans pression » et « quand les
  // conditions seront mûres » → sans échéance précise.
  { to: 'M8_Q17', from: 'M8_Q02', map: { A: 'A', B: 'C', C: 'D', D: 'D' } },
  // V7.1 — cérémonies (choix multiple) : religieux, civil, les deux,
  // optionnel, coutumier.
  {
    to: 'M8_Q16',
    from: 'M8_Q03',
    map: { A: 'B', B: 'A', C: 'A,B', D: 'D', E: 'C' },
  },
];

/** Réponses lues dans les termes de la V7 (copie ; la réponse V7 prime toujours). */
export function upgradeAnswers(raw: RawAnswers): RawAnswers {
  const out: RawAnswers = { ...raw };
  for (const { to, from, map } of LEGACY_UPGRADES) {
    if (out[to] || !raw[from]) continue;
    const key = map[raw[from]];
    if (key) out[to] = key;
  }
  return out;
}

/** Retire une option « aucun » cochée avec d'autres (les autres priment). */
export function keysWithout(value: string | undefined, none: string): string[] {
  const keys = answerKeys(value);
  return keys.length > 1 ? keys.filter((k) => k !== none) : keys;
}

// ─── Religion ────────────────────────────────────────────────────────────────

export type FaithFamily =
  | 'chretien'
  | 'musulman'
  | 'juif'
  | 'bouddhiste_hindou'
  | 'traditionnel'
  | 'spirituel'
  | 'sans'
  | 'autre';

/**
 * V7.1 : bouddhiste (F) et hindoue (K) sont deux options ; elles restent dans
 * la même famille (« bouddhiste_hindou ») pour les lectures qui ne
 * distinguent pas (bio, réponse V6 « bouddhiste / hindouiste »), et le moteur
 * les compare par leur clé.
 */
const V7_FAMILY: Record<string, FaithFamily> = {
  A: 'chretien',
  B: 'chretien',
  C: 'chretien',
  D: 'musulman',
  E: 'juif',
  F: 'bouddhiste_hindou',
  K: 'bouddhiste_hindou',
  G: 'traditionnel',
  H: 'spirituel',
  I: 'sans',
  J: 'autre',
};
const V6_FAMILY: Record<string, FaithFamily> = {
  A: 'chretien',
  B: 'musulman',
  C: 'juif',
  D: 'bouddhiste_hindou',
  E: 'sans',
  F: 'spirituel',
};

export interface Faith {
  family: FaithFamily;
  /** Question lue : M1_Q16 (V7) ou M1_Q05 (V6). */
  questionId: 'M1_Q16' | 'M1_Q05';
  key: string;
}

/** Religion ou conviction (V7 d'abord, V6 sinon). */
export function faithOf(x: RawAnswers): Faith | null {
  if (x.M1_Q16 && V7_FAMILY[x.M1_Q16])
    return { family: V7_FAMILY[x.M1_Q16], questionId: 'M1_Q16', key: x.M1_Q16 };
  if (x.M1_Q05 && V6_FAMILY[x.M1_Q05])
    return { family: V6_FAMILY[x.M1_Q05], questionId: 'M1_Q05', key: x.M1_Q05 };
  return null;
}

/** Une famille religieuse au sens strict (ni « sans religion », ni spiritualité personnelle). */
export function isReligious(f: FaithFamily): boolean {
  return f !== 'sans' && f !== 'spirituel';
}

/**
 * Attente envers un partenaire d'une autre religion :
 *  - 'exclusive' : même religion indispensable (V7 M1_Q18 A ; V6 M1_Q06 A) ;
 *  - 'conversion' : conversion souhaitée avant le mariage, comme condition ;
 *  - 'souhait' : conversion souhaitée sans condition (V6 : « devra respecter
 *    mes pratiques ») ;
 *  - 'souple' : chacun garde la sienne (V6 : ouvert, ou affaire personnelle) ;
 *  - 'ouvert' : pourrait adopter celle de l'autre.
 */
export type FaithRequirement =
  | 'exclusive'
  | 'conversion'
  | 'souhait'
  | 'souple'
  | 'ouvert';

export function faithRequirement(x: RawAnswers): FaithRequirement | null {
  const v7: Record<string, FaithRequirement> = {
    A: 'exclusive',
    B: 'conversion',
    C: 'souhait',
    D: 'souple',
    E: 'ouvert',
  };
  const v6: Record<string, FaithRequirement> = {
    A: 'exclusive',
    B: 'souhait',
    C: 'souple',
    D: 'souple',
  };
  if (x.M1_Q18) return v7[x.M1_Q18] ?? null;
  if (x.M1_Q06) return v6[x.M1_Q06] ?? null;
  return null;
}

// ─── Alimentation ────────────────────────────────────────────────────────────

/**
 * Habitudes alimentaires : règle stricte (et laquelle, quand on la connaît),
 * règles adaptées au contexte, ou aucune règle. V6 (M1_Q09) : « stricts »
 * sans préciser lesquels.
 */
export type FoodRule =
  | { kind: 'strict'; rule: 'halal' | 'casher' | 'vegetarien' | 'autre' | null }
  | { kind: 'souple' }
  | { kind: 'aucune' };

export function foodRuleOf(
  x: RawAnswers,
): { food: FoodRule; questionId: 'M1_Q19' | 'M1_Q09'; key: string } | null {
  const v7: Record<string, FoodRule> = {
    A: { kind: 'strict', rule: 'halal' },
    B: { kind: 'strict', rule: 'casher' },
    C: { kind: 'strict', rule: 'vegetarien' },
    D: { kind: 'strict', rule: 'autre' },
    E: { kind: 'souple' },
    F: { kind: 'aucune' },
  };
  const v6: Record<string, FoodRule> = {
    A: { kind: 'strict', rule: null },
    B: { kind: 'souple' },
    C: { kind: 'aucune' },
  };
  if (x.M1_Q19 && v7[x.M1_Q19])
    return { food: v7[x.M1_Q19], questionId: 'M1_Q19', key: x.M1_Q19 };
  if (x.M1_Q09 && v6[x.M1_Q09])
    return { food: v6[x.M1_Q09], questionId: 'M1_Q09', key: x.M1_Q09 };
  return null;
}

// ─── Ce qui est non négociable (P2) ──────────────────────────────────────────

/**
 * Thèmes de M8_Q12 (clé → questions dont une divergence relève du thème).
 * K (« Aucun : pour moi, tout se discute ») n'a pas de question.
 */
export const NON_NEGOTIABLE_QUESTIONS: Record<string, string[]> = {
  A: ['M0_Q06', 'M0_Q14', 'M8_Q18'],
  B: [
    'M1_Q16',
    'M1_Q05',
    'M1_Q17',
    'M1_Q06',
    'M1_Q19',
    'M1_Q09',
    'M1_Q13',
    'M8_Q03',
    'M8_Q16',
    'M8_Q18',
  ],
  // V7.1 : la réaction à une infidélité (M6_Q18) n'est pas la fidélité.
  C: ['M6_Q19', 'M6_Q10'],
  D: [
    'M4_Q01',
    'M4_Q14',
    'M4_Q05',
    'M4_Q16',
    'M4_Q09',
    'M4_Q11',
    'M4_Q12',
    'M4_Q08',
    'M0_Q15',
  ],
  E: ['M0_Q03', 'M7_Q07', 'M7_Q36'],
  // V7.1 : l'aide à la famille relève aussi de « la place de la famille ».
  F: [
    'M5_Q01',
    'M5_Q02',
    'M5_Q03',
    'M5_Q07',
    'M5_Q10',
    'M1_Q15',
    'M1_Q10',
    'M4_Q16',
    'M4_Q17',
    'M4_Q07',
  ],
  G: ['M10_Q17'],
  H: ['M1_Q20', 'M1_Q11'],
  I: ['M0_Q09', 'M0_Q12', 'M0_Q08'],
  J: ['M4_Q03', 'M4_Q04', 'M4_Q15'],
};

/** Thèmes non négociables dont relève une question (un sujet peut en toucher deux). */
export function nonNegotiableThemesOf(questionId: string): string[] {
  return Object.entries(NON_NEGOTIABLE_QUESTIONS)
    .filter(([, ids]) => ids.includes(questionId))
    .map(([key]) => key);
}

/** Premier thème non négociable dont relève une question (ou null). */
export function nonNegotiableThemeOf(questionId: string): string | null {
  return nonNegotiableThemesOf(questionId)[0] ?? null;
}

export interface NonNegotiables {
  keys: Set<string>;
  /**
   * Déclaration V7 (M8_Q12) d'au moins un sujet : un sujet non coché peut
   * alors être lu comme négociable (sauf projet de vie, voir le moteur).
   */
  explicit: boolean;
}

/**
 * Ce que le membre déclare non négociable. V7 : M8_Q12 (« Aucun » coché avec
 * d'autres thèmes est ignoré). V7.1 : « Aucun : tout se discute » seul est la
 * réponse socialement attendue ; elle ne prouve pas que chaque sujet se
 * négocie (explicit: false). V6 : la rupture sans discussion (M8_Q05 :
 * infidélité → fidélité ; « enfants ou religion » → les deux) et ce qui ne
 * sera jamais accepté (M8_Q08 : infidélité → fidélité). null : rien déclaré.
 */
export function nonNegotiablesOf(x: RawAnswers): NonNegotiables | null {
  if (x.M8_Q12) {
    const keys = keysWithout(x.M8_Q12, 'K').filter((k) => k !== 'K');
    return { keys: new Set(keys), explicit: keys.length > 0 };
  }
  const keys = new Set<string>();
  if (x.M8_Q05 === 'A') keys.add('C');
  if (x.M8_Q05 === 'C') ['A', 'B'].forEach((k) => keys.add(k));
  if (x.M8_Q08 === 'B') keys.add('C');
  if (!x.M8_Q05 && !x.M8_Q08) return null;
  return { keys, explicit: false };
}

// ─── Disponibilité ───────────────────────────────────────────────────────────

/**
 * Relation précédente pas tout à fait terminée (séparation en cours, ou
 * « en transition » en M0_Q04), ou rupture de moins de six mois dont on se
 * remet encore.
 */
export function stillAttached(x: RawAnswers): boolean {
  if (x.M3_Q11 === 'A' || x.M0_Q04 === 'D') return true;
  return x.M3_Q11 === 'B' && x.M3_Q03 === 'A';
}
