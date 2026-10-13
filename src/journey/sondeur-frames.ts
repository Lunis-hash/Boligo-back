/**
 * Cadres de questions du Sondeur (V8.3).
 *
 * L'IA ne rédige plus librement : elle choisit un CADRE dans une liste fermée
 * de formes réciproques (chacun répond depuis sa propre position) et en
 * remplit les cases (sujet, quantité, durée, situation concrète). Le code
 * compose le texte français et anglais, puis le contrôle vérifie que la
 * question correspond EXACTEMENT à un cadre, que chaque case est liée à
 * l'écart cité et ne reprend aucune réponse d'un membre.
 *
 * Réciprocité et hypothèse retournée sont garanties par construction : aucun
 * cadre ne prête une position à « votre partenaire » ni ne demande ce que
 * l'on n'accepterait pas de l'autre.
 *
 * Point non négociable de mode de vie (tabac, jeu, alcool, enfants…) : les
 * cadres de TOLÉRANCE (« pourriez-vous vivre avec… », « combien… pourriez-vous
 * réellement vivre ») mesurent la marge de chacun sans pousser au compromis.
 * Sécurité, violence et contrôle restent hors de portée de l'IA.
 */
import {
  BODY_HEALTH,
  COMPROMISE,
  MORALE,
  ORIGIN_DETOUR,
  SAFETY_TOPIC,
  SEXUAL_DETAIL,
  STAGED_HARM,
  hasClinicalJargon,
  hasInterpretation,
  isIntrusiveQuestion,
} from './clinical-lens';
import type { EvidenceItem } from './sondeur-evidence';

export type SlotKind =
  | 'objet'
  | 'action'
  | 'infinitif'
  | 'unite'
  | 'periode'
  | 'duree'
  | 'montant';

export interface Frame {
  id: string;
  /** Gabarit français ; cases entre accolades (« {objet} »). */
  fr: string;
  /** Même question en anglais ; mêmes cases. */
  en: string;
  /** Intention, pour le rédacteur. */
  use: string;
}

/** Valeurs fermées : français → anglais. */
export const CLOSED: Record<
  'unite' | 'periode' | 'duree' | 'montant',
  Array<[string, string]>
> = {
  unite: [
    ['jours', 'days'],
    ['soirs', 'evenings'],
    ['soirées', 'evenings out'],
    ['week-ends', 'weekends'],
    ['heures', 'hours'],
    ['fois', 'times'],
    ['verres', 'drinks'],
    ['cigarettes', 'cigarettes'],
    ['nuits', 'nights'],
    ['paris', 'bets'],
    ['sorties', 'outings'],
    ['visites', 'visits'],
  ],
  periode: [
    ['jour', 'day'],
    ['semaine', 'week'],
    ['mois', 'month'],
    ['an', 'year'],
  ],
  duree: [
    ['semaines', 'weeks'],
    ['mois', 'months'],
    ['années', 'years'],
  ],
  montant: [
    ['1 000', '1,000'],
    ['2 000', '2,000'],
    ['3 000', '3,000'],
    ['5 000', '5,000'],
  ],
};

/**
 * Cadres validés (formes réciproques). Cases libres : {objet} (groupe
 * nominal), {action} (verbe à l'imparfait, 3e personne : « perdait son
 * emploi »), {infinitif} (« accueillir des enfants d'une autre union »).
 */
export const FRAMES: Frame[] = [
  {
    id: 'C01',
    fr: 'Combien de {unite} par {periode} pourriez-vous réellement vivre avec {objet} ?',
    en: 'How many {unite} a {periode} of {objet} could you really live with?',
    use: 'tolérance chiffrée',
  },
  {
    id: 'C02',
    fr: "Si {objet} ne changeait jamais chez l'un de vous, pourriez-vous le vivre pendant des années ?",
    en: 'If {objet} never changed for one of you, could you live with it for years?',
    use: 'si cela ne changeait jamais',
  },
  {
    id: 'C03',
    fr: "Jusqu'où iriez-vous pour {infinitif} ?",
    en: 'How far would you go to {infinitif}?',
    use: "jusqu'où",
  },
  {
    id: 'C04',
    fr: "Qu'est-ce que vous ne pourriez pas accepter [dans|au sujet de|au sujet du|au sujet des|concernant] {objet} ?",
    en: 'What could you not accept [about|in|regarding] {objet}?',
    use: 'limite personnelle',
  },
  {
    id: 'C05',
    fr: "Si l'un de vous {action}, pendant combien de {duree} pourriez-vous tenir ainsi ?",
    en: 'If one of you {action}, for how many {duree} could you carry on like that?',
    use: 'durée tenable',
  },
  {
    id: 'C06',
    fr: "Si l'un de vous {action}, comment le vivriez-vous au quotidien ?",
    en: 'If one of you {action}, how would you live with it day to day?',
    use: 'confrontation au quotidien',
  },
  {
    id: 'C07',
    fr: 'Combien de {duree} pourriez-vous attendre avant de trancher {objet} ?',
    en: 'How many {duree} could you wait before settling {objet}?',
    use: 'attente tenable',
  },
  {
    id: 'C08',
    fr: 'Pour {objet}, à partir de combien de {unite} par {periode} ce serait trop pour vous ?',
    en: 'For {objet}, how many {unite} a {periode} would be too much for you?',
    use: 'seuil',
  },
  {
    id: 'C09',
    fr: "Qu'auriez-vous besoin de savoir sur {objet} avant de vous engager ?",
    en: 'What would you need to know about {objet} before committing?',
    use: "avant de s'engager",
  },
  {
    id: 'C10',
    fr: 'Si vos positions sur {objet} ne bougeaient jamais, pourriez-vous vous engager quand même ?',
    en: 'If your positions on {objet} never moved, could you still commit?',
    use: 'si cela ne changeait jamais',
  },
  {
    id: 'C11',
    fr: 'Quelle place laisseriez-vous à {objet} dans une semaine ordinaire à deux ?',
    en: 'How much room would you leave for {objet} in an ordinary week together?',
    use: 'place concrète',
  },
  {
    id: 'C12',
    fr: 'Sur {montant} € par mois à deux, quelle part consacreriez-vous à {objet} ?',
    en: 'Out of €{montant} a month for the two of you, what share would you put toward {objet}?',
    use: 'somme ronde en hypothèse',
  },
  {
    id: 'C13',
    fr: "Si l'un de vous {action}, qu'est-ce qui vous permettrait de rester ?",
    en: 'If one of you {action}, what would allow you to stay?',
    use: 'condition pour rester',
  },
  {
    id: 'C14',
    fr: 'Quelle limite fixeriez-vous pour {objet} dans une vie à deux ?',
    en: 'What limit would you set for {objet} in a life together?',
    use: 'limite personnelle',
  },
  {
    id: 'C15',
    fr: 'Pendant combien de {duree} pourriez-vous vivre sereinement avec {objet} ?',
    en: 'For how many {duree} could you live calmly with {objet}?',
    use: 'durée tenable',
  },
  {
    id: 'C16',
    fr: 'Si {objet} restait une question ouverte entre vous, combien de {duree} pourriez-vous l’accepter ?',
    en: 'If {objet} remained an open question between you, for how many {duree} could you accept it?',
    use: 'attente tenable',
  },
  {
    id: 'C17',
    fr: "Qu'est-ce que l'autre aurait besoin de savoir de vous sur {objet} ?",
    en: 'What would the other person need to know about you regarding {objet}?',
    use: 'se dire',
  },
  {
    id: 'C18',
    fr: 'Concrètement, comment organiseriez-vous {objet} au quotidien ?',
    en: 'In practical terms, how would you organise {objet} day to day?',
    use: 'organisation concrète',
  },
  {
    id: 'C19',
    fr: 'Combien de {unite} par {periode} vous sembleraient un maximum pour {objet} ?',
    en: 'How many {unite} a {periode} would feel like the most you could accept for {objet}?',
    use: 'tolérance chiffrée',
  },
  {
    id: 'C20',
    fr: 'Si {objet} ne changeait jamais, quelle vie à deux imagineriez-vous dans cinq ans ?',
    en: 'If {objet} never changed, what life together would you picture in five years?',
    use: 'projection',
  },
];

const FREE: SlotKind[] = ['objet', 'action', 'infinitif'];
const slotsOf = (template: string) =>
  [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as SlotKind);

/** Forme comparable : apostrophes droites, espaces simples, sans espace avant « ? ». */
export function canon(text: string): string {
  return (
    text
      .replace(/[’`]/g, "'")
      // Élision (« d'années », « d'heures ») : comparée sous sa forme pleine.
      .replace(/(?<!\p{L})d'(années|heures)(?!\p{L})/giu, 'de $1')
      .replace(/ | /g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s+\?/g, '?')
      .trim()
  );
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Variantes admises dans le texte fixe : « [a|b] » (la première au rendu). */
const literal = (s: string) =>
  s
    .split(/(\[[^\]]+\])/)
    .map((part) =>
      /^\[.*\]$/.test(part)
        ? `(?:${part.slice(1, -1).split('|').map(esc).join('|')})`
        : esc(part),
    )
    .join('');
const firstVariant = (s: string) =>
  s.replace(/\[([^\]|]+)(?:\|[^\]]*)?\]/g, '$1');

function frameRegex(template: string, lang: 'fr' | 'en'): RegExp {
  let src = '';
  let last = 0;
  for (const m of canon(template).matchAll(/\{(\w+)\}/g)) {
    let lit = literal(canon(template).slice(last, m.index));
    const kind = m[1] as SlotKind;
    // Français : « à » et « de » devant une case libre se contractent
    // (« aux paris sportifs », « au sujet du soutien »).
    if (lang === 'fr' && FREE.includes(kind))
      lit = lit
        .replace(/(^|[^\p{L}])à $/u, '$1(?:à |au |aux )')
        .replace(/(^|[^\p{L}])de $/u, "$1(?:de |du |des |d')");
    src += lit;
    if (kind in CLOSED) {
      const values = CLOSED[kind as keyof typeof CLOSED].map(([fr, en]) =>
        lang === 'fr' ? fr : en,
      );
      src += `(?<${kind}>${[...new Set(values)].map(esc).join('|')})`;
    } else src += `(?<${kind}>[^?]{3,100}?)`;
    last = (m.index ?? 0) + m[0].length;
  }
  src += literal(canon(template).slice(last));
  return new RegExp(`^${src}$`, 'iu');
}

const COMPILED = FRAMES.map((f) => ({
  frame: f,
  fr: frameRegex(f.fr, 'fr'),
  en: frameRegex(f.en, 'en'),
}));

export interface FrameMatch {
  id: string;
  slots: Partial<Record<SlotKind, string>>;
}

/** Cadre reconnu (correspondance exacte du texte entier), sinon null. */
export function matchFrame(
  text: string,
  lang: 'fr' | 'en',
  id?: string,
): FrameMatch | null {
  const t = canon(text);
  for (const c of COMPILED) {
    if (id && c.frame.id !== id) continue;
    const m = (lang === 'fr' ? c.fr : c.en).exec(t);
    if (m?.groups)
      return {
        id: c.frame.id,
        slots: Object.fromEntries(
          Object.entries(m.groups).map(([k, v]) => [k, v.trim()]),
        ),
      };
  }
  return null;
}

/** Compose la question française et anglaise d'un cadre, sinon null. */
export function renderFrame(
  id: string,
  slots: Record<string, unknown>,
  slotsEn: Record<string, unknown>,
): { text: string; textEn: string } | null {
  const f = FRAMES.find((x) => x.id === id);
  if (!f) return null;
  const fill = (template: string, lang: 'fr' | 'en') => {
    let ok = true;
    const out = firstVariant(template).replace(/\{(\w+)\}/g, (_, k: string) => {
      const kind = k as SlotKind;
      if (kind in CLOSED) {
        // Case fermée : la valeur française décide, l'anglais suit.
        const fr = String(slots[k] ?? '').trim();
        const pair = CLOSED[kind as keyof typeof CLOSED].find(
          ([a]) => a.toLowerCase() === fr.toLowerCase(),
        );
        if (!pair) ok = false;
        return pair ? (lang === 'fr' ? pair[0] : pair[1]) : '';
      }
      const v = String((lang === 'fr' ? slots : slotsEn)[k] ?? '')
        .replace(/[?\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!v) ok = false;
      return v;
    });
    if (!ok) return null;
    const t = canon(out).replace(/\?$/, lang === 'fr' ? ' ?' : '?');
    return lang === 'fr'
      ? t
          .replace(/(?<!\p{L})de (années|heures)(?!\p{L})/giu, "d'$1")
          .replace(/(?<!\p{L})à les(?!\p{L})/giu, 'aux')
          .replace(/(?<!\p{L})à le(?!\p{L})/giu, 'au')
          .replace(/(?<!\p{L})de les(?!\p{L})/giu, 'des')
          .replace(/(?<!\p{L})de le(?!\p{L})/giu, 'du')
      : t;
  };
  const text = fill(f.fr, 'fr');
  const textEn = fill(f.en, 'en');
  return text && textEn ? { text, textEn } : null;
}

// ─── Cases libres ────────────────────────────────────────────────────────────

/** Mots interdits dans une case libre (français) : attribution, présupposé. */
const SLOT_BANNED_FR =
  /(?<!\p{L})(?:votre|vos|partenaire|conjointe?|l['’]autre|l['’]un|l['’]une|il|elle|ils|elles|lui|leur|tant|toujours|encore|enfin|déjà|trop|vraiment|habitude\p{L}*|problème\p{L}*|peur\p{L}*|angoiss\p{L}*|souffr\p{L}*|addict\p{L}*|dépendance)(?!\p{L})/iu;
/** Même chose en anglais. */
const SLOT_BANNED_EN =
  /\b(?:your|partner|spouse|the other|one of you|each of you|he|she|him|her|his|hers|still|always|again|finally|already|too|really|habit\w*|problem\w*|fear\w*|anxi\w*|suffer\w*|addict\w*|dependen\w*)\b/i;

/**
 * Familles de contenus refusés dans une case libre, avec leur motif : deux
 * idées, effort à sens unique, jugement, jargon, intrusion, sécurité, fait
 * inventé, difficulté présupposée. [français, anglais].
 */
const SLOT_RULES: Array<[string, RegExp, RegExp]> = [
  [
    'F4 deux idées dans la case (« et »)',
    /\p{L}{3,}\s+et\s+(?:le|la|les|l['’]|un|une|des|du|de la|aux?|son|sa|ses)(?!\p{L})/iu,
    /\b\w{3,} and \w+/i,
  ],
  [
    'F10 effort à sens unique (ne vaut que pour l’un des deux)',
    /(?<!\p{L})(?:renon\p{L}*|sacrifi\p{L}*|effort\p{L}*|moins (?:acheter|dépenser|boire|fumer|jouer|sortir)|celui qui|celle qui|ceux qui|suivre quelqu['’]un|céder)(?!\p{L})|^(?:accepter|supporter|tolérer|(?:se|vous) résoudre|(?:se|vous) résigner)(?!\p{L})/iu,
    /\b(?:give up|gave up|giving up|sacrific\w*|effort\w*|whoever|the one who|follow someone|(?:buy|spend|drink|smoke|gamble) less)\b|^(?:accept|put up with|tolerate|resign)\b/i,
  ],
  [
    'F11 jugement moral dans la case',
    /(?<!\p{L})(?:excès|vice\p{L}*|corvée\p{L}*|laiss\p{L}* aller|respecte rien|abus\p{L}*|dérive\p{L}*|laxis\p{L}*|irrespons\p{L}*|égoïs\p{L}*|paress\p{L}*|capric\p{L}*|immatur\p{L}*|mauvais\p{L}*|honte\p{L}*|gâchis)(?!\p{L})/iu,
    /\b(?:excess\w*|vice\w*|chore\w*|let (?:themselves|oneself|himself|herself) go|respects nothing|abus\w*|irresponsib\w*|selfish\w*|lazy|laziness|immatur\w*|shame\w*|bad habits?|waste\w*)\b/i,
  ],
  [
    'F7 jargon ou diagnostic dans la case',
    /(?<!\p{L})(?:compulsi\p{L}*|à risque|loyauté|trouble\p{L}*|syndrome|dysfonction\p{L}*|emprise|narciss\p{L}*|toxique\p{L}*|parentification|codépendan\p{L}*|pathologi\p{L}*|déni)(?!\p{L})/iu,
    /\b(?:compulsiv\w*|at-risk|loyalty conflict|disorder|syndrome|dysfunction\w*|narciss\w*|toxic|codependen\w*|patholog\w*|denial)\b/i,
  ],
  [
    'F7 case intrusive (revenu, banque, patrimoine)',
    /(?<!\p{L})(?:bancaire\p{L}*|comptes? en banque|patrimoine|héritage|fortune|salaire\p{L}*|revenus?|propriét\p{L}*)(?!\p{L})/iu,
    /\b(?:bank\w*|wealth|inheritance|fortune|salar\w*|income|property|assets)\b/i,
  ],
  [
    'F7 case sur la sécurité (cris, coups, menace, contrôle)',
    /(?<!\p{L})(?:hauss\p{L}* le ton|lev\p{L}* le ton|cri\p{L}*|hurl\p{L}*|gifl\p{L}*|frapp\p{L}*|menac\p{L}*|insult\p{L}*|contrôl\p{L}*|surveill\p{L}*)(?!\p{L})/iu,
    /\b(?:shout\w*|yell\w*|scream\w*|hit|hits|hitting|slap\w*|threat\w*|insult\w*|control\w*|monitor\w*)\b/i,
  ],
  [
    'F12 fait supposé (nombre, événement ou personne absents des données)',
    /(?<!\p{L})(?:trois|quatre|cinq|six|sept|huit|neuf|dix|dettes?|récent\p{L}*|dernier|dernière|arrêté\p{L}*|prévu\p{L}*|actuel\p{L}*|ex-\p{L}+|brouille\p{L}*|belle-mère|beau-père)(?!\p{L})|\d/iu,
    /\b(?:three|four|five|six|seven|eight|nine|ten|debts?|recent\w*|last year|given up|quit|planned|current|former|ex-\w+|falling-out|mother-in-law|father-in-law)\b|\d/i,
  ],
  [
    'F5 difficulté présupposée',
    /(?<!\p{L})(?:difficult\p{L}*|mal à|manque de|incapacit\p{L}*|faiblesse\p{L}*|échec\p{L}*)(?!\p{L})/iu,
    /\b(?:difficult\w*|struggl\w*|inabilit\w*|failure\w*|lack of|weakness\w*)\b/i,
  ],
];

/**
 * Sujet de l'écart → mots qui s'y rattachent (français, anglais) : une case
 * qui nomme le sujet par un synonyme (« fumait », « poker ») lui est liée.
 */
const TOPIC_LINKS: Array<[RegExp, RegExp, RegExp]> = [
  [/tabac/i, /fum|cigarett|tabac|clope/iu, /smok|cigarette|tobacco/i],
  [
    /alcool/i,
    /alcool|boire|buv|verres?(?!\p{L})|apéri|apéro|bière|vin(?!\p{L})/iu,
    /drink|alcohol|beer|wine|booze/i,
  ],
  [
    /jeux? d.argent/i,
    /pari|jeu|jeux|mise|casino|poker|loterie|grattage|turf/iu,
    /bet|gambl|casino|poker|lotter|wager|scratch/i,
  ],
  [
    /temps à soi/i,
    /solo|seul|soi(?!\p{L})|personnel|espace|indépendan|autonom/iu,
    /alone|solo|own time|personal|space|independen/i,
  ],
  [
    /déménager|lieu de vie/i,
    /déménag|ville|lieu|installer|région|pays|distance|quartier|logement/iu,
    /mov|city|town|place|settl|region|country|distance|relocat|home/i,
  ],
  [
    /emploi/i,
    /emploi|travail|chômage|licenci|poste(?!\p{L})/iu,
    /job|work|unemploy|laid off|redundan|income/i,
  ],
  [/désir d.enfants/i, /enfant|parent|bébé/iu, /child|kid|parent|baby|babies/i],
  [
    /relig|foi/i,
    /foi(?!\p{L})|relig|culte|prière|baptême|spirit|croyan|église|mosquée|messe/iu,
    /faith|relig|worship|pray|baptism|spiritual|belief|church|mosque/i,
  ],
  [
    /recomposée|beau-parent|enfants de l.autre/i,
    /enfant|beau-parent|belle-famille|recompos|union|parent|autorité|éduc/iu,
    /child|kid|step|blended|parent|authority/i,
  ],
  [
    /famille/i,
    /famill|avis|approb|désappro|proches|parents/iu,
    /famil|approv|opinion|relatives|parents/i,
  ],
  [
    /épargne|dépense/i,
    /épargn|dépens|économ|budget|argent|achat|réserve|côté|plaisir|sortie/iu,
    /sav|spen[dt]|budget|money|purchase|reserve|treat|outing/i,
  ],
];

/**
 * Concepts qui doivent figurer à la fois dans la case française et dans la
 * case anglaise (ou dans aucune) : l'anglais dit la même chose.
 */
const CONCEPTS: Array<[RegExp, RegExp]> = [
  [/enfant|bébé/iu, /\b(?:child\w*|kids?|bab(?:y|ies))\b/i],
  [/fum|cigarett|tabac/iu, /\b(?:smok\w*|cigarettes?|tobacco)\b/i],
  [
    /alcool|boire|buv|bière|apéri|apéro|verres?(?!\p{L})/iu,
    /\b(?:drink\w*|alcohol|beers?)\b/i,
  ],
  [
    /pari|casino|poker|loterie|jeux? d.argent/iu,
    /\b(?:bet|bets|betting|casinos?|poker|lotter\w*|gambl\w*)\b/i,
  ],
  [
    /épargn|économ|de côté/iu,
    /\b(?:sav(?:e|es|ed|ing|ings))\b|(?:put|set) aside/i,
  ],
  [/achat|achet/iu, /\b(?:purchas\w*|buy\w*|bought|shopping)\b/i],
  [
    /déménag|changer de ville|(?:s['’]|vous )?install/iu,
    /\b(?:mov\w*|relocat\w*)\b|\bsettl\w* (?:in|down|somewhere|elsewhere)\b/i,
  ],
  [
    /chômage|sans (?:emploi|travail)|perd\p{L}* (?:son|un) (?:emploi|travail)/iu,
    /\b(?:unemploy\w*|jobless)\b|out of work|without (?:a )?(?:job|work)|los[et]\w* (?:their|a|the) job/i,
  ],
  [/famil/iu, /\bfamil\w*/i],
  [/désappro/iu, /\bdisapprov\w*/i],
  [/(?<!\p{L})foi(?!\p{L})|relig/iu, /\b(?:faith|relig\w*)\b/i],
  [
    /union|recompos/iu,
    /\b(?:union|blended|(?:previous|first|another|other|earlier|former) (?:relationship|marriage|union))\b/i,
  ],
  [/ville/iu, /\b(?:city|cities|town\w*)\b/i],
];

/** Verbe à l'imparfait, 3e personne (« perdait », « ne voulait »). */
const IMPARFAIT = /^(?:ne |n['’])?(?:se |s['’])?\p{L}+(?:ait|aient)(?!\p{L})/iu;
/** Infinitif en tête (« accueillir », « vous installer »). */
const INFINITIF =
  /^(?:vous |v)?\p{L}+(?:er|ir|re|oir)(?!\p{L})|^(?:ne pas |ne plus )/iu;

/** Mots-clés anglais par thème : la case anglaise doit viser le même écart. */
const THEME_WORDS_EN: Record<string, RegExp> = {
  argent:
    /\b(?:money|spen[dt]\w*|sav\w*|leisure|budget\w*|bet\w*|gambl\w*|casino\w*|debt\w*|job\w*|income|support\w*|purchase\w*|buy\w*|financ\w*|account\w*|lottery|stake\w*|work)\b/i,
  projet:
    /\b(?:smok\w*|cigarette\w*|tobacco|drink\w*|alcohol|time alone|own time|alone|me[- ]time|work\w*|career\w*|job\w*|evening\w*|weekend\w*|hobb\w*|child\w*|kid\w*|project\w*|ambition\w*|time)\b/i,
  famille:
    /\b(?:child\w*|kid\w*|famil\w*|parent\w*|step\w*|household\w*|home|visit\w*|in-law\w*|baby|babies|custody|relatives?|decid\w*|approv\w*|disapprov\w*)\b/i,
  spiritualite:
    /\b(?:faith|relig\w*|church\w*|mosque\w*|pray\w*|worship\w*|belie\w*|spiritual\w*|child\w*|god)\b/i,
  lieu: /\b(?:mov\w*|city|cities|town\w*|country|countr\w*|liv\w*|relocat\w*|place\w*|distance|km|miles?|job\w*|home)\b/i,
  communication:
    /\b(?:argu\w*|disagree\w*|tension\w*|talk\w*|silence\w*|calm\w*|anger|listen\w*|conflict\w*)\b/i,
  intimite: /\b(?:intima\w*|desire|tenderness|fidelit\w*|faithful\w*)\b/i,
};

/** Unités qui portent elles-mêmes le sujet de l'écart. */
const UNIT_TOPIC: Record<string, RegExp> = {
  verres: /alcool|boire|boisson/i,
  cigarettes: /tabac|fum|cigarette/i,
  paris: /jeu|jeux|pari|mise|casino/i,
  visites: /famil|visite|enfant/i,
};

const words = (t: string) =>
  canon(t)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean);

const STOP = new Set(
  "a au aux avec ce ces cet cette d' de des du en et je j' l' la le les ma mes mon ne n' ni ou par pas pour qu' que qui s' sa se ses si son sur ta te tes ton tu un une vous y est suis the a an and of to in on for at is it i my me be or not no with by as".split(
    ' ',
  ),
);
const ngrams = (ws: string[], n: number) =>
  ws.length < n
    ? []
    : ws.slice(0, ws.length - n + 1).map((_, i) => ws.slice(i, i + n));

/**
 * Fuite : la question reprend un n-gramme de 3 mots (au moins un mot plein)
 * tiré d'une réponse de l'un ou l'autre, ou un libellé d'option entier de
 * deux mots pleins ou plus. Les n-grammes du cadre lui-même sont ignorés.
 */
export function leakedAnswer(
  text: string,
  answers: string[],
  frameText = '',
): string | null {
  const q = words(text);
  const qs = ` ${q.join(' ')} `;
  const boiler = ` ${words(frameText.replace(/\{\w+\}/g, ' | ')).join(' ')} `;
  for (const a of answers) {
    const aw = words(a);
    // Adverbe distinctif d'une réponse (« absolument », « régulièrement »,
    // « regularly ») : il suffit à reconnaître la réponse.
    for (const w of aw)
      if (
        w.length >= 7 &&
        /(?:ment|ly)$/.test(w) &&
        qs.includes(` ${w} `) &&
        !boiler.includes(` ${w} `)
      )
        return a;
    const full = aw.filter((w) => !STOP.has(w) && w.length > 2);
    if (full.length >= 2 && aw.length <= 3 && qs.includes(` ${aw.join(' ')} `))
      return a;
    for (const g of ngrams(aw, 3)) {
      if (!g.some((w) => !STOP.has(w) && w.length > 2)) continue;
      const s = ` ${g.join(' ')} `;
      if (qs.includes(s) && !boiler.includes(s)) return a;
    }
  }
  return null;
}

export interface FrameContext {
  /** Écarts cités par la question (preuves de nature « écart »). */
  gaps: EvidenceItem[];
  /** Réponses des deux membres (libellés d'option FR/EN, réponses libres). */
  answers: string[];
  /** Lien d'une case française avec l'écart (relatesToGap). */
  relatesToGap: (text: string, gaps: EvidenceItem[]) => boolean;
}

/**
 * Contrôle d'une question du rédacteur : cadre exact en français et en
 * anglais (le même), cases cohérentes et liées à l'écart, aucune fuite.
 * Renvoie la liste des motifs de refus (vide si la question est admise).
 */
export function frameIssues(
  text: string,
  textEn: string | undefined,
  ctx: FrameContext,
): string[] {
  const fr = matchFrame(text, 'fr');
  if (!fr) return ['F1 hors cadre (aucun cadre validé ne correspond)'];
  const en = textEn ? matchFrame(textEn, 'en', fr.id) : null;
  if (!en) return [`F2 version anglaise hors du cadre ${fr.id}`];
  const frame = FRAMES.find((f) => f.id === fr.id)!;
  const r: string[] = [];
  for (const kind of slotsOf(frame.fr)) {
    const v = fr.slots[kind] ?? '';
    const e = en.slots[kind] ?? '';
    if (kind in CLOSED) {
      const pair = CLOSED[kind as keyof typeof CLOSED].find(
        ([a]) => a.toLowerCase() === v.toLowerCase(),
      );
      if (
        !pair ||
        !CLOSED[kind as keyof typeof CLOSED].some(
          ([a, b]) =>
            a.toLowerCase() === v.toLowerCase() &&
            b.toLowerCase() === e.toLowerCase(),
        )
      )
        r.push(`F3 case « ${kind} » différente entre le français et l'anglais`);
      continue;
    }
    if (!FREE.includes(kind)) continue;
    const n = v.split(/\s+/).length;
    const nEn = e.split(/\s+/).length;
    if (n < (kind === 'objet' ? 1 : 2) || n > 12 || nEn < 1 || nEn > 14)
      r.push(`F4 case « ${kind} » trop courte ou trop longue`);
    if (/[«»"“”:;!,()]/.test(v) || /[«»"“”:;!,()]/.test(e))
      r.push(`F4 ponctuation dans la case « ${kind} »`);
    if (/(?<!\p{L})ou(?!\p{L})/iu.test(v) || /\bor\b/i.test(e))
      r.push(`F4 deux idées dans la case « ${kind} » (« ou »)`);
    // « votre », « vos » : admis dans un infinitif (« accueillir sous votre
    // toit ») où ils désignent celui qui répond, jamais ailleurs.
    const bannedFr =
      kind === 'infinitif'
        ? v.replace(/(?<!\p{L})(?:votre|vos)(?!\p{L})/giu, 'son')
        : v;
    const bannedEn = kind === 'infinitif' ? e.replace(/\byour\b/gi, 'own') : e;
    if (SLOT_BANNED_FR.test(bannedFr))
      r.push(
        `F5 case « ${kind} » : attribution ou présupposé (« ${bannedFr.match(SLOT_BANNED_FR)![0]} »)`,
      );
    if (SLOT_BANNED_EN.test(bannedEn))
      r.push(
        `F5 case anglaise « ${kind} » : attribution ou présupposé (« ${bannedEn.match(SLOT_BANNED_EN)![0]} »)`,
      );
    if (kind === 'action' && !IMPARFAIT.test(v))
      r.push('F6 case « action » : verbe à l’imparfait attendu');
    if (kind === 'infinitif' && !INFINITIF.test(v))
      r.push('F6 case « infinitif » : verbe à l’infinitif attendu');
    for (const [why, reFr, reEn] of SLOT_RULES)
      if (reFr.test(v) || reEn.test(e)) r.push(`${why} — « ${kind} »`);
    if (kind !== 'infinitif' && /(?<!\p{L})vous(?!\p{L})/iu.test(v))
      r.push(`F5 case « ${kind} » : « vous » réservé au cadre`);
    if (
      hasClinicalJargon(v) ||
      hasInterpretation(v) ||
      MORALE.test(v) ||
      ORIGIN_DETOUR.test(v) ||
      BODY_HEALTH.test(v.replace(/(?<!\p{L})poids d/giu, 'place d')) ||
      SEXUAL_DETAIL.test(v) ||
      SAFETY_TOPIC.test(v) ||
      STAGED_HARM.test(v) ||
      // Compromis : refusé seulement près de la violence et du contrôle ;
      // la tolérance sur un mode de vie est admise.
      (COMPROMISE.test(v) &&
        ctx.gaps.some((g) => g.theme === 'communication')) ||
      isIntrusiveQuestion(
        ctx.gaps.some((g) => g.theme === 'communication')
          ? v
          : v
              .replace(COMPROMISE, ' ')
              .replace(/terrain (?:d['’]entente|commun)/giu, ' '),
      )
    )
      r.push(
        `F7 case « ${kind} » : contenu interdit (jargon, morale, sécurité, intime ou intrusif)`,
      );
    for (const [cFr, cEn] of CONCEPTS)
      if (cFr.test(v) !== cEn.test(e))
        r.push(
          `F3 case « ${kind} » : l'anglais ne dit pas la même chose que le français`,
        );
    // Nombres : identiques dans les deux langues.
    const nums = (s: string) => (s.match(/\d+/g) ?? []).sort().join(',');
    if (nums(v) !== nums(e))
      r.push(
        `F3 case « ${kind} » : nombres différents entre le français et l'anglais`,
      );
  }
  // Lien à l'écart : cases libres (et unité porteuse) en français, en anglais.
  const freeFr = FREE.map((k) => fr.slots[k] ?? '').join(' ');
  const freeEn = FREE.map((k) => en.slots[k] ?? '').join(' ');
  const unit = fr.slots.unite ?? '';
  const unitLinked = ctx.gaps.some((g) =>
    UNIT_TOPIC[unit]?.test(`${g.topic} ${g.theme}`),
  );
  if (!ctx.gaps.length) r.push('F8 aucun écart cité');
  else {
    const linked = (lang: 1 | 2, t: string) =>
      ctx.gaps.some((g) =>
        TOPIC_LINKS.some(
          ([topic, ...re]) => topic.test(g.topic) && re[lang - 1].test(t),
        ),
      );
    if (
      !unitLinked &&
      !ctx.relatesToGap(freeFr, ctx.gaps) &&
      !linked(1, freeFr)
    )
      r.push('F8 cases sans lien avec l’écart cité');
    if (
      !unitLinked &&
      !ctx.gaps.some((g) => THEME_WORDS_EN[g.theme]?.test(freeEn)) &&
      !linked(2, freeEn)
    )
      r.push('F8 cases anglaises sans lien avec l’écart cité');
  }
  const leak =
    leakedAnswer(text, ctx.answers, frame.fr) ??
    leakedAnswer(textEn ?? '', ctx.answers, frame.en);
  if (leak) r.push('F9 reprend la réponse d’un membre (fuite)');
  return [...new Set(r)];
}

/**
 * Propositions du rédacteur → questions composées par le code : chaque
 * proposition qui nomme un cadre et ses cases reçoit son texte français et
 * anglais ; un cadre inconnu ou une case manquante l'écarte. Une proposition
 * sans cadre reste telle quelle (le contrôle la refusera).
 */
export function composeFramedQuestions(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const o = item as Record<string, unknown>;
    const id = typeof o.cadre === 'string' ? o.cadre.trim().toUpperCase() : '';
    if (!id) return [item];
    const cases =
      o.cases && typeof o.cases === 'object'
        ? (o.cases as Record<string, unknown>)
        : {};
    const casesEn =
      o.cases_en && typeof o.cases_en === 'object'
        ? (o.cases_en as Record<string, unknown>)
        : {};
    const out = renderFrame(id, cases, casesEn);
    return out
      ? [{ ...o, text: out.text, text_en: out.textEn, cadre: id }]
      : [];
  });
}

/** Liste des cadres pour la consigne du rédacteur. */
export function framesForPrompt(): string {
  const closed = (k: keyof typeof CLOSED) =>
    CLOSED[k].map(([fr]) => fr).join(' | ');
  return [
    ...FRAMES.map((f) => `${f.id} (${f.use}) : ${f.fr}  ‖  EN : ${f.en}`),
    '',
    `Cases fermées (valeur française exacte ; l'anglais est déduit) : {unite} = ${closed('unite')} ; {periode} = ${closed('periode')} ; {duree} = ${closed('duree')} ; {montant} = ${closed('montant')}.`,
    "Cases libres (en français ET en anglais) : {objet} = groupe nominal de 1 à 12 mots (« le tabac à la maison ») ; {action} = verbe à l'imparfait, 3e personne (« perdait son emploi ») ; {infinitif} = verbe à l'infinitif (« accueillir des enfants d'une autre union »).",
    "Dans une case : jamais « votre », « vos » (sauf dans {infinitif}, pour celui qui répond), « partenaire », « l'autre », « il », « elle », « toujours », « encore », « déjà », « trop » ; jamais un mot d'une réponse d'un membre ; seulement le sujet concret de l'écart.",
  ].join('\n');
}
