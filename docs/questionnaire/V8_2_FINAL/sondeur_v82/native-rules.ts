/**
 * Règles natives V8.2 (stratégie A) — PROTOTYPE, hors application.
 *
 * Chaque règle lit directement une question V8.2, avec ses propres codes et
 * leur sens. Aucune réponse V8.2 n'est convertie en réponse V7. Les règles
 * produisent des écarts et des accords au format du moteur en service
 * (`Divergence`, `Convergence`), et leurs gabarits sont des ENTRÉES DE DONNÉES
 * pour les tables existantes du Sondeur (TOPIC_DEEP, TOPIC_PHRASES,
 * AGREEMENTS) : la logique du Sondeur n'est pas modifiée.
 *
 * 11 règles couvrent les 13 sujets perdus (M1_Q02 et M1_Q13 → une règle ;
 * M4_Q03 et M4_Q04 → une règle).
 */
import type {
  AnswerView,
  Convergence,
  Divergence,
  RawAnswers,
  Severity,
  Theme,
} from '../../../../src/matching/divergence.engine';

type Pair = string; // deux codes triés, « AD »
export interface NativeRule {
  id: string;
  questionId: string;
  /** Sujets V7 perdus que la règle remplace (traçabilité, aucune conversion). */
  replaces: string[];
  theme: Theme;
  label: string;
  /** Gravité par paire de codes différents ; absente = compatible. */
  pairs: Record<Pair, Severity>;
  /** Codes qui ne sont pas une position (indécision, « ne pas répondre ») : aucune comparaison. */
  neutralCodes: string[];
  /** Échelle d'accord : écart de 3 points ou plus = divergence. */
  scale?: boolean;
  /** Accords qui valent une question (codes). */
  agreeOn: string[];
  /** Règle croisée (deux questions différentes) : seul le sujet est montré. */
  cross?: (x: RawAnswers, y: RawAnswers) => Severity | null;
}

export const NATIVE_RULES: NativeRule[] = [
  { id: 'N1', questionId: 'V82_M1_03', replaces: ['M1_Q02', 'M1_Q13'], theme: 'famille', label: 'Les traditions dans le futur foyer',
    pairs: { AC: 'majeure', AB: 'mineure', BC: 'mineure', AD: 'moderee', CD: 'mineure', BD: 'mineure' }, neutralCodes: ['E'], agreeOn: ['A', 'B', 'C'] },
  { id: 'N2', questionId: 'V82_M1_04', replaces: ['M1_Q15'], theme: 'famille', label: 'Décider face à une famille qui désapprouve',
    pairs: { AD: 'majeure', AC: 'moderee', BD: 'moderee', AB: 'mineure', BC: 'mineure', CD: 'mineure' }, neutralCodes: [], agreeOn: ['A', 'C', 'D'] },
  { id: 'N3', questionId: 'V82_M3_02', replaces: ['M3_Q13'], theme: 'intimite', label: 'La place d’un ex dans la vie de chacun',
    pairs: {}, neutralCodes: ['E'], agreeOn: [],
    // Croisée : l'un garde une amitié ou une vraie proximité avec un ex (D) ;
    // l'autre compte « revoir un ex sans me le dire » comme une infidélité (M6_Q19 D).
    cross: (x, y) => (x.V82_M3_02 === 'D' && (y.M6_Q19 ?? '').split(',').includes('D') ? 'moderee' : null) },
  { id: 'N4', questionId: 'V82_M4_05', replaces: ['M4_Q03', 'M4_Q04'], theme: 'famille', label: 'Le partage des tâches et des rôles',
    pairs: { AD: 'majeure', BD: 'majeure', CD: 'moderee', DE: 'moderee', AB: 'mineure', BC: 'mineure', AC: 'mineure' }, neutralCodes: [], agreeOn: ['A', 'B', 'D', 'E'] },
  { id: 'N5', questionId: 'V82_M4_02', replaces: ['M4_Q11'], theme: 'argent', label: 'Le soutien quand l’autre perd son emploi',
    pairs: { AD: 'majeure', BD: 'moderee', AC: 'moderee', CD: 'mineure', AB: 'mineure', BC: 'mineure' }, neutralCodes: [], agreeOn: ['A', 'B'] },
  { id: 'N6', questionId: 'V82_M4_06', replaces: ['M4_Q12'], theme: 'argent', label: 'Le niveau de vie face à un projet commun',
    pairs: { AD: 'majeure', AC: 'moderee', BD: 'moderee', CD: 'mineure', AB: 'mineure', BC: 'mineure' }, neutralCodes: [], agreeOn: ['A', 'B'] },
  { id: 'N7', questionId: 'V82_M5_01', replaces: ['M5_Q02'], theme: 'famille', label: 'Protéger l’autre face à un proche',
    pairs: { AD: 'majeure', BD: 'moderee', CD: 'mineure', AC: 'mineure', AB: 'mineure', BC: 'mineure' }, neutralCodes: [], agreeOn: ['A', 'B'] },
  { id: 'N8', questionId: 'V82_M5_03', replaces: ['M5_Q03'], theme: 'famille', label: 'Accueillir un proche à la maison',
    pairs: { AD: 'majeure', AC: 'moderee', BD: 'moderee', CD: 'mineure', AB: 'mineure', BC: 'mineure' }, neutralCodes: [], agreeOn: ['B', 'D'] },
  { id: 'N9', questionId: 'V82_M5_04', replaces: ['M5_Q10'], theme: 'famille', label: 'Choisir entre famille et couple',
    pairs: { AC: 'majeure', AB: 'moderee', AD: 'moderee', BC: 'mineure', CD: 'mineure', BD: 'mineure' }, neutralCodes: [], agreeOn: ['B', 'C'] },
  { id: 'N10', questionId: 'V82_M9_03', replaces: ['M7_Q08'], theme: 'projet', label: 'Le temps à soi dans le couple',
    pairs: {}, neutralCodes: [], scale: true, agreeOn: [] },
  { id: 'N11', questionId: 'V82_M8_05', replaces: ['M7_Q36'], theme: 'lieu', label: 'Vivre un jour dans un autre pays',
    pairs: { AC: 'moderee', BC: 'mineure', AB: 'mineure' }, neutralCodes: ['D'], agreeOn: ['A', 'C'] },
];

const SCALE: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };

export type V82Items = Record<string, { type: string; options: Record<string, string> }>;

function view(items: V82Items, qid: string, key: string): AnswerView {
  return { key, text: items[qid]?.options[key] ?? key };
}

/** Écarts et accords natifs d'un couple (réponses V8.2 brutes). */
export function nativeReport(
  a: RawAnswers,
  b: RawAnswers,
  items: V82Items,
): { divergences: Divergence[]; convergences: Convergence[]; evidence: string[] } {
  const divergences: Divergence[] = [];
  const convergences: Convergence[] = [];
  const evidence: string[] = [];
  for (const r of NATIVE_RULES) {
    const qid = r.questionId;
    if (r.cross) {
      const s = r.cross(a, b) ?? r.cross(b, a);
      if (s) {
        // Sujet seul : aucune réponse montrée (neutral), comme les tendances V7.1.
        const t = { key: 'tendance', text: 'Point à explorer tiré des entretiens' };
        divergences.push({ questionId: qid, theme: r.theme, severity: s, label: r.label, question: r.label, a: t, b: t, neutral: true });
        evidence.push(`${r.id}:${qid}+M6_Q19`);
      }
      continue;
    }
    const ka = a[qid];
    const kb = b[qid];
    if (!ka || !kb || r.neutralCodes.includes(ka) || r.neutralCodes.includes(kb)) continue;
    if (ka === kb) {
      if (r.agreeOn.includes(ka)) {
        convergences.push({ questionId: qid, theme: r.theme, label: r.label, answer: items[qid].options[ka], topic: r.label });
        evidence.push(`${r.id}:${qid}=${ka}`);
      }
      continue;
    }
    let sev: Severity | undefined;
    if (r.scale) {
      const gap = Math.abs((SCALE[ka] ?? 0) - (SCALE[kb] ?? 0));
      sev = gap >= 3 ? 'moderee' : gap === 2 ? 'mineure' : undefined;
    } else sev = r.pairs[[ka, kb].sort().join('')];
    if (!sev) continue;
    divergences.push({ questionId: qid, theme: r.theme, severity: sev, label: r.label, question: r.label, a: view(items, qid, ka), b: view(items, qid, kb) });
    evidence.push(`${r.id}:${qid}:${ka}/${kb}`);
  }
  return { divergences, convergences, evidence };
}

// ─── Gabarits (données pour les tables existantes du Sondeur) ──────────────
type T = { text: string; options: string[]; technique: string };
const t = (text: string, technique: string, options: [string, string, string]): T => ({ text, technique, options: [...options, 'Autre...'] });

/** Trois jours par sujet : origine/sens (1), besoin/limite (2), projection (3). Aucun scénario présupposé. */
export const NATIVE_DEEP: Record<string, Record<number, T>> = {
  V82_M1_03: {
    1: t('Quelle tradition de votre enfance aimeriez-vous retrouver un jour dans votre propre foyer ?', 'origine', ['Une fête', 'Un repas', 'Une langue']),
    2: t('Dans un couple qui réunit deux cultures, qu’est-ce qui vous ferait sentir que la vôtre garde sa place ?', 'besoin', ['Les fêtes célébrées', 'La langue parlée', 'Le respect des aînés']),
    3: t('Comment aimeriez-vous que des enfants découvrent un jour les cultures de leurs deux parents ?', 'projection', ['Par la langue', 'Par les voyages', 'Par les fêtes']),
  },
  V82_M1_04: {
    1: t('Dans votre famille, comment accueillait-on autrefois un choix amoureux qui surprenait les parents ?', 'origine', ['Avec du temps', 'Avec des discussions', 'Avec de la méfiance']),
    2: t('De quoi auriez-vous besoin de la part de l’autre si vos familles hésitaient sur votre union ?', 'besoin', ['De la patience', 'Une décision commune', 'Du soutien affiché']),
    3: t('Quelle place aimeriez-vous donner à l’avis de vos familles dans les grandes décisions d’un couple ?', 'projection', ['Une voix consultée', 'Une voix décisive', 'Une information']),
  },
  V82_M3_02: {
    1: t('Qu’est-ce qui, pour vous, distingue un lien apaisé avec un ancien partenaire d’un lien qui prend trop de place ?', 'sens', ['La transparence', 'La fréquence', 'Les sentiments']),
    2: t('Qu’est-ce qui vous aiderait à vous sentir en confiance face aux liens que l’autre garde avec son passé ?', 'besoin', ['En parler simplement', 'Les connaître', 'Du temps']),
    3: t('Comment aimeriez-vous parler, à deux, des personnes qui ont compté avant la rencontre ?', 'projection', ['Librement', 'Avec tact', 'Le moins possible']),
  },
  V82_M4_05: {
    1: t('Dans la maison où vous avez grandi, comment se répartissaient les tâches, et qu’en avez-vous gardé ?', 'origine', ['Je reproduis', 'Je change', 'Je garde une partie']),
    2: t('Qu’est-ce qui vous ferait sentir que la charge de la maison est juste entre vous ?', 'besoin', ['Le temps de chacun', 'Les goûts de chacun', 'La reconnaissance']),
    3: t('Comment aimeriez-vous décider à deux qui fait quoi à la maison quand vos emplois du temps changent ?', 'projection', ['En parler chaque mois', 'Au cas par cas', 'Avec des rôles stables']),
  },
  V82_M4_02: {
    1: t('Dans votre famille, comment traversait-on une période sans travail ?', 'origine', ['Ensemble', 'Chacun pour soi', 'Avec l’aide des proches']),
    2: t('Qu’attendriez-vous avant tout de l’autre pendant une période difficile au travail ?', 'besoin', ['De la transparence', 'Des efforts visibles', 'Du moral']),
    3: t('Quels repères aimeriez-vous fixer à deux pour traverser un coup dur financier ?', 'projection', ['Un budget', 'Un calendrier', 'Des points réguliers']),
  },
  V82_M4_06: {
    1: t('Quel projet vous semblerait valoir quelques sacrifices sur votre confort pendant un temps ?', 'sens', ['Un logement', 'Une formation', 'Une famille']),
    2: t('Qu’est-ce qui vous rendrait un effort sur votre niveau de vie supportable ?', 'besoin', ['Un but clair', 'Une date de fin', 'Le faire à deux']),
    3: t('Comment aimeriez-vous décider à deux de ce qui compte le plus entre confort et projets ?', 'projection', ['Par étapes', 'Selon les priorités', 'Au cas par cas']),
  },
  V82_M5_01: {
    1: t('Quand vous étiez enfant, comment réagissait-on chez vous quand quelqu’un critiquait un membre de la famille ?', 'origine', ['On le défendait', 'On écoutait', 'On se taisait']),
    2: t('Qu’est-ce qui vous ferait sentir soutenu(e) par l’autre devant sa propre famille ?', 'besoin', ['Un mot pour moi', 'Une discussion après', 'Une limite posée']),
    3: t('Comment aimeriez-vous réagir à deux face à une remarque blessante d’un proche ?', 'projection', ['Sur le moment', 'En privé ensuite', 'Selon la situation']),
  },
  V82_M5_03: {
    1: t('Dans votre famille, que signifiait accueillir un proche chez soi pendant longtemps ?', 'origine', ['Un devoir', 'Une joie', 'Une exception']),
    2: t('À quelles conditions l’accueil d’un proche vous semblerait-il possible dans votre foyer ?', 'limite', ['Une durée convenue', 'Un espace à nous', 'Notre accord à deux']),
    3: t('Comment aimeriez-vous décider à deux de la porte que votre foyer ouvre aux familles ?', 'projection', ['Au cas par cas', 'Avec des règles', 'Selon les besoins']),
  },
  V82_M5_04: {
    1: t('Qu’avez-vous appris dans votre famille sur la place du couple par rapport aux parents ?', 'origine', ['Les parents d’abord', 'Le couple d’abord', 'Un équilibre']),
    2: t('Qu’est-ce qui vous aiderait à comprendre une obligation familiale de l’autre qui vous dérange ?', 'besoin', ['Être prévenu(e)', 'En connaître la raison', 'Une compensation']),
    3: t('Comment aimeriez-vous trancher à deux quand la famille et la vie à deux demandent la même soirée ?', 'projection', ['À tour de rôle', 'Selon l’urgence', 'Ensemble chez la famille']),
  },
  V82_M9_03: {
    1: t('Quelle activité ou quelle amitié tenez-vous à garder, même très amoureux ou amoureuse ?', 'sens', ['Un sport', 'Des amis', 'Un temps seul(e)']),
    2: t('Qu’est-ce qui vous aide à vous sentir proche de l’autre quand chacun a sa soirée de son côté ?', 'besoin', ['Un message', 'Se raconter après', 'La confiance']),
    3: t('Comment aimeriez-vous équilibrer, dans une semaine ordinaire, le temps à deux et le temps à soi ?', 'projection', ['Des soirées fixes', 'Au feeling', 'En en parlant']),
  },
  V82_M8_05: {
    1: t('Quel lieu, en dehors de votre ville actuelle, compte pour vous, et pourquoi ?', 'origine', ['Le pays de ma famille', 'Un lieu de vacances', 'Aucun en particulier']),
    2: t('Qu’est-ce qui vous rendrait un grand déménagement envisageable, ou au contraire impossible ?', 'limite', ['Le travail', 'La famille', 'Les enfants']),
    3: t('Comment aimeriez-vous décider à deux du lieu où vous vivrez dans dix ans ?', 'projection', ['Selon nos carrières', 'Selon nos familles', 'Selon nos envies']),
  },
};

export const NATIVE_PHRASES: Record<string, string> = Object.fromEntries(NATIVE_RULES.map((r) => [r.questionId, r.label.charAt(0).toLowerCase() + r.label.slice(1)]));

/** Phrases d'accord : une par réponse partagée, sans rien exposer d'un aveu (aucune de ces questions n'est sensible). */
export const NATIVE_AGREEMENTS: Record<string, { statement: string; probe: T }> = {
  'V82_M1_03:A': { statement: 'Vous souhaitez tous les deux un foyer qui partage les mêmes traditions.', probe: t('Laquelle de ces traditions partagées aimeriez-vous vivre en premier ensemble ?', 'sens', ['Une fête', 'Un repas', 'Une prière']) },
  'V82_M1_03:B': { statement: 'Vous imaginez tous les deux un équilibre entre deux cultures.', probe: t('Quel moment de l’année montrerait le mieux cet équilibre entre vos deux cultures ?', 'sens', ['Une fête de chacun', 'Les vacances', 'Les repas']) },
  'V82_M1_03:C': { statement: 'Vous laisseriez tous les deux chacun garder ses propres pratiques.', probe: t('Comment montreriez-vous de l’intérêt pour une pratique de l’autre sans la faire vôtre ?', 'sens', ['En y assistant', 'En posant des questions', 'En la respectant']) },
  'V82_M1_04:A': { statement: 'L’accord de vos familles compte pour vous deux.', probe: t('Comment aimeriez-vous, le moment venu, présenter la personne aimée à vos familles ?', 'projection', ['Ensemble', 'Chacun à la sienne', 'Par étapes']) },
  'V82_M1_04:C': { statement: 'Vous écouteriez tous les deux vos familles avant de décider à deux.', probe: t('Qu’est-ce qui vous aiderait à écouter vos familles sans vous sentir dépossédé(e) de votre choix ?', 'besoin', ['Du temps', 'Un dialogue', 'Le soutien de l’autre']) },
  'V82_M1_04:D': { statement: 'Le choix du couple passerait d’abord pour vous deux.', probe: t('Comment aimeriez-vous garder le lien avec vos familles si elles ne comprenaient pas votre choix ?', 'projection', ['Par le temps', 'Par la parole', 'Par les petits gestes']) },
  'V82_M4_05:A': { statement: 'Vous partageriez tous les deux les tâches selon le temps et la charge de chacun.', probe: t('Qu’est-ce qui vous ferait remarquer que l’autre en fait trop sans le dire ?', 'besoin', ['Sa fatigue', 'Son humeur', 'Le temps qui manque']) },
  'V82_M4_05:B': { statement: 'Vous tenez tous les deux à un partage égal des tâches.', probe: t('Comment aimeriez-vous vérifier ensemble que ce partage reste égal au fil du temps ?', 'projection', ['En parler', 'Un tableau', 'Au ressenti']) },
  'V82_M4_05:D': { statement: 'Vous envisagez tous les deux des rôles définis à l’avance pour l’homme et la femme.', probe: t('Dans les rôles que vous imaginez, qu’est-ce qui vous semble le plus important à respecter ?', 'sens', ['La reconnaissance', 'La souplesse', 'La tradition']) },
  'V82_M4_05:E': { statement: 'Vous aimeriez tous les deux en reparler régulièrement.', probe: t('À quel moment de l’année aimeriez-vous faire le point sur l’organisation de la maison ?', 'projection', ['À la rentrée', 'Après un changement', 'Chaque mois']) },
  'V82_M4_02:A': { statement: 'Vous soutiendriez tous les deux l’autre sans fixer d’échéance.', probe: t('Comment aimeriez-vous que l’autre vous montre son soutien sans vous faire sentir redevable ?', 'besoin', ['Par des mots', 'Par des actes', 'Par la discrétion']) },
  'V82_M4_02:B': { statement: 'Vous établiriez tous les deux un plan et des limites ensemble.', probe: t('Qu’est-ce qui rendrait ce plan rassurant pour vous deux ?', 'besoin', ['Des étapes claires', 'Des points réguliers', 'Un budget']) },
  'V82_M4_06:A': { statement: 'Vous réduiriez tous les deux volontiers votre train de vie pour un projet commun.', probe: t('Quel projet commun mériterait selon vous ce genre d’effort ?', 'projection', ['Un logement', 'Une famille', 'Un voyage']) },
  'V82_M4_06:B': { statement: 'Vous accepteriez tous les deux un effort avec un budget et une date pour refaire le point.', probe: t('Comment aimeriez-vous faire ce point à deux, le moment venu ?', 'projection', ['Autour d’un repas', 'Avec des chiffres', 'Simplement en parlant']) },
  'V82_M5_01:A': { statement: 'Vous poseriez tous les deux une limite tout de suite face à une critique injuste.', probe: t('Comment aimeriez-vous que cette limite soit posée pour qu’elle reste respectueuse ?', 'besoin', ['Avec calme', 'Avec fermeté', 'Avec humour']) },
  'V82_M5_01:B': { statement: 'Vous soutiendriez tous les deux l’autre, puis parleriez au proche en privé.', probe: t('Qu’est-ce qui vous ferait sentir soutenu(e) sur le moment, avant la discussion en privé ?', 'besoin', ['Un regard', 'Un mot', 'Une main tendue']) },
  'V82_M5_03:B': { statement: 'Vous voudriez tous les deux fixer à deux une durée et des règles avant d’accueillir un proche.', probe: t('Quelle règle vous semblerait la plus importante à convenir en premier ?', 'limite', ['La durée', 'L’espace', 'Les dépenses']) },
  'V82_M5_03:D': { statement: 'Vous ne souhaitez ni l’un ni l’autre de cohabitation prolongée avec un proche.', probe: t('Comment aimeriez-vous aider un proche en difficulté tout en gardant votre foyer à vous ?', 'projection', ['Un soutien financier', 'Un hébergement court', 'Une aide pratique']) },
  'V82_M5_04:B': { statement: 'Vous chercheriez tous les deux une solution équilibrée entre famille et couple.', probe: t('Qu’est-ce qui vous aiderait à sentir que cet équilibre est juste pour vous deux ?', 'besoin', ['Être consulté(e)', 'Une alternance', 'De la reconnaissance']) },
  'V82_M5_04:C': { statement: 'Vous tiendriez tous les deux d’abord l’engagement pris envers l’autre.', probe: t('Comment aimeriez-vous l’expliquer à vos familles quand cela les déçoit ?', 'projection', ['Simplement', 'Ensemble', 'Avec une compensation']) },
  'V82_M8_05:A': { statement: 'Vous êtes tous les deux ouverts à construire un projet dans un autre pays.', probe: t('Qu’est-ce qui ferait d’un nouveau pays un vrai chez-vous ?', 'projection', ['La langue', 'Des amis', 'Un travail']) },
  'V82_M8_05:C': { statement: 'Vous souhaitez tous les deux rester durablement dans votre pays actuel.', probe: t('Qu’est-ce qui vous attache le plus à votre pays actuel ?', 'sens', ['La famille', 'Le travail', 'Les amis']) },
};

/**
 * Stratégie B : questions neutres du Sondeur pour les sujets non réintégrés.
 * Elles ne supposent aucun écart, ne citent aucune réponse et ne s'appuient
 * que sur le thème (preuve « neutre »).
 */
export const NEUTRAL_B: Array<{ theme: Theme; day: number; replaces: string; tpl: T }> = [
  { theme: 'intimite', day: 3, replaces: 'M6_Q18', tpl: t('Que signifie pour vous le pardon dans un couple qui traverse une épreuve ?', 'sens', ['Un nouveau départ', 'Un long chemin', 'Une décision']) },
  { theme: 'intimite', day: 2, replaces: 'M5_Q09', tpl: t('Comment aimeriez-vous que les amitiés de chacun trouvent leur place dans la vie à deux ?', 'projection', ['En les présentant', 'En faisant confiance', 'Avec des repères']) },
  { theme: 'projet', day: 3, replaces: 'M8_Q11', tpl: t('Que représente pour vous le fait de prendre soin de l’autre dans les moments difficiles ?', 'sens', ['Une évidence', 'Un engagement', 'Un apprentissage']) },
  { theme: 'projet', day: 2, replaces: 'M7_Q02', tpl: t('Quelle place aimeriez-vous donner au travail dans votre vie de couple ?', 'projection', ['Une grande place', 'Une place équilibrée', 'Une place limitée']) },
];
