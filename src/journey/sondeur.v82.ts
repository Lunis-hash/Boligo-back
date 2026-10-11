/**
 * Sondeur — données de la V8.2 (questions natives, stratégie A ; questions
 * neutres de la stratégie B). Uniquement des ENTRÉES DE DONNÉES pour les tables
 * existantes (TOPIC_DEEP, TOPIC_PHRASES, AGREEMENTS, THEME_POOL) : la logique
 * du Sondeur n'est pas modifiée.
 *
 * Aucun gabarit ne suppose une émotion, un comportement, un passé ou un
 * désaccord : trois jours par sujet, origine ou sens (1), besoin ou limite
 * (2), projection (3). Chaque texte passe le validateur de preuves en mode
 * strict (sondeur-evidence.spec.ts).
 */
import type { Theme } from '../matching/divergence.engine';
import type { Agreement, PoolTemplate, Technique } from './sondeur.pool';

const t = (
  text: string,
  technique: Technique,
  options: [string, string, string],
): PoolTemplate => ({
  text,
  technique,
  options: [...options, 'Autre...'],
});

/**
 * Jours des sujets natifs : projection (3) puis origine (2), comme les sujets
 * voisins de la V7 (M0_Q14, M8_Q18). Chaque accord a une relance pour chacun.
 */
export const V82_TOPIC_DAYS: Record<string, number[]> = Object.fromEntries(
  [
    'V82_M1_03',
    'V82_M1_04',
    'V82_M3_02',
    'V82_M4_05',
    'V82_M4_02',
    'V82_M4_06',
    'V82_M5_01',
    'V82_M5_03',
    'V82_M5_04',
    'V82_M9_03',
    'V82_M8_05',
    'V82_M8_06',
  ].map((id) => [id, [3, 2]]),
);

/** Tournure naturelle des sujets natifs (avec article). */
export const V82_TOPIC_PHRASES: Record<string, string> = {
  V82_M1_03: 'les traditions dans le futur foyer',
  V82_M1_04: 'la décision face à une famille qui désapprouve',
  V82_M3_02: 'la place des anciennes relations',
  V82_M4_05: 'le partage des tâches et des rôles',
  V82_M4_02: "le soutien quand l'autre perd son emploi",
  V82_M4_06: 'le niveau de vie face à un projet commun',
  V82_M5_01: "la protection de l'autre face à un proche",
  V82_M5_03: "l'accueil d'un proche à la maison",
  V82_M5_04: 'le choix entre famille et couple',
  V82_M9_03: 'le temps à soi dans le couple',
  V82_M8_05: "l'idée de vivre un jour dans un autre pays",
  V82_M4_08: 'le Mahr',
  V82_M8_03: "le cadre d'exclusivité",
  V82_M8_06: "l'engagement dans une période difficile",
};

export const V82_TOPIC_DEEP: Record<string, Record<number, PoolTemplate>> = {
  V82_M1_03: {
    1: t(
      'Parmi les fêtes et les coutumes de votre enfance, laquelle compte le plus pour vous aujourd’hui ?',
      'origine',
      ['Une fête', 'Un repas', 'Une langue'],
    ),
    2: t(
      'Dans un couple qui réunit deux cultures, qu’est-ce qui vous ferait sentir que la vôtre garde sa place ?',
      'besoin',
      ['Les fêtes célébrées', 'La langue parlée', 'Le respect des aînés'],
    ),
    3: t(
      'Comment aimeriez-vous que des enfants découvrent un jour les cultures de leurs deux parents ?',
      'projection',
      ['Par la langue', 'Par les voyages', 'Par les fêtes'],
    ),
  },
  V82_M1_04: {
    1: t(
      'Dans votre famille, comment accueillait-on autrefois un choix amoureux qui surprenait les parents ?',
      'origine',
      ['Avec du temps', 'Avec des discussions', 'Avec de la méfiance'],
    ),
    2: t(
      'De quoi auriez-vous besoin de la part de l’autre si vos familles hésitaient sur un projet de couple ?',
      'besoin',
      ['De la patience', 'Une décision commune', 'Du soutien affiché'],
    ),
    3: t(
      'Quelle place aimeriez-vous donner à l’avis de vos familles dans les grandes décisions d’un couple ?',
      'projection',
      ['Une voix consultée', 'Une voix décisive', 'Une information'],
    ),
  },
  V82_M3_02: {
    1: t(
      'Qu’est-ce qui, pour vous, distingue un lien apaisé avec un ancien partenaire d’un lien qui prend trop de place ?',
      'sens',
      ['La transparence', 'La fréquence', 'Les sentiments'],
    ),
    2: t(
      'De quoi auriez-vous besoin pour vous sentir en confiance si un ancien partenaire faisait encore partie de la vie de l’un de vous ?',
      'besoin',
      ['En parler simplement', 'Le connaître', 'Du temps'],
    ),
    3: t(
      'Comment aimeriez-vous convenir, à deux, de la place que peuvent garder les anciennes relations ?',
      'projection',
      ['En toute transparence', 'Au cas par cas', 'Avec des repères clairs'],
    ),
  },
  V82_M4_05: {
    1: t(
      'Dans la maison où vous avez grandi, comment se répartissaient les tâches, et qu’en avez-vous gardé ?',
      'origine',
      ['Je reproduis', 'Je change', 'Je garde une partie'],
    ),
    2: t(
      'Qu’est-ce qui vous ferait sentir que la charge de la maison est juste entre vous ?',
      'besoin',
      ['Le temps de chacun', 'Les goûts de chacun', 'La reconnaissance'],
    ),
    3: t(
      'Comment aimeriez-vous décider à deux qui fait quoi à la maison si les emplois du temps de chacun changeaient ?',
      'projection',
      ['En parler chaque mois', 'Au cas par cas', 'Avec des rôles stables'],
    ),
  },
  V82_M4_02: {
    1: t(
      'Dans votre famille, comment traversait-on une période sans travail ?',
      'origine',
      ['Ensemble', 'Chacun pour soi', 'Avec l’aide des proches'],
    ),
    2: t(
      'Qu’attendriez-vous avant tout de l’autre pendant une période difficile au travail ?',
      'besoin',
      ['De la transparence', 'Des efforts visibles', 'Du moral'],
    ),
    3: t(
      'Quels repères aimeriez-vous fixer à deux pour traverser une période de manque d’argent ?',
      'projection',
      ['Un budget', 'Un calendrier', 'Des points réguliers'],
    ),
  },
  V82_M4_06: {
    1: t(
      'Quel projet vous semblerait valoir, pendant un temps, de vivre avec moins de confort ?',
      'sens',
      ['Un logement', 'Une formation', 'Une famille'],
    ),
    2: t(
      'Qu’est-ce qui rendrait supportable, pour vous, un effort sur le niveau de vie ?',
      'besoin',
      ['Un but clair', 'Une date de fin', 'Le faire à deux'],
    ),
    3: t(
      'Comment aimeriez-vous décider à deux de ce qui compte le plus entre confort et projets ?',
      'projection',
      ['Par étapes', 'Selon les priorités', 'Au cas par cas'],
    ),
  },
  V82_M5_01: {
    1: t(
      'Dans votre famille, comment réagissait-on lorsqu’un proche était critiqué ?',
      'origine',
      ['On le défendait', 'On écoutait', 'On se taisait'],
    ),
    2: t(
      'Qu’est-ce qui vous ferait sentir soutenu(e) par l’autre devant sa propre famille ?',
      'besoin',
      ['Un mot pour moi', 'Une discussion après', 'Une limite posée'],
    ),
    3: t(
      'Comment aimeriez-vous réagir à deux face à une remarque blessante d’un proche ?',
      'projection',
      ['Sur le moment', 'En privé ensuite', 'Selon la situation'],
    ),
  },
  V82_M5_03: {
    1: t(
      'Dans votre famille, que signifiait accueillir un proche chez soi pendant longtemps ?',
      'origine',
      ['Un devoir', 'Une joie', 'Une exception'],
    ),
    2: t(
      'À quelles conditions l’accueil d’un proche vous semblerait-il possible dans votre foyer ?',
      'limite',
      ['Une durée convenue', 'Un espace à nous', 'Notre accord à deux'],
    ),
    3: t(
      'Comment aimeriez-vous décider à deux de la porte que votre foyer ouvre aux familles ?',
      'projection',
      ['Au cas par cas', 'Avec des règles', 'Selon les besoins'],
    ),
  },
  V82_M5_04: {
    1: t(
      'Dans votre famille, comment arbitrait-on entre les obligations envers les parents et la vie de couple ?',
      'origine',
      ['Les parents d’abord', 'Le couple d’abord', 'Un équilibre'],
    ),
    2: t(
      'Qu’est-ce qui vous aiderait à comprendre une obligation familiale de l’autre ?',
      'besoin',
      ['Être prévenu(e)', 'En connaître la raison', 'Une compensation'],
    ),
    3: t(
      'Comment aimeriez-vous trancher à deux quand la famille et la vie à deux demandent la même soirée ?',
      'projection',
      ['À tour de rôle', 'Selon l’urgence', 'Ensemble chez la famille'],
    ),
  },
  V82_M9_03: {
    1: t(
      'Quelle activité ou quelle amitié tenez-vous à garder, même très amoureux ou amoureuse ?',
      'sens',
      ['Un sport', 'Des amis', 'Un temps seul(e)'],
    ),
    2: t(
      'Qu’est-ce qui vous aide à vous sentir proche de l’autre quand chacun a sa soirée de son côté ?',
      'besoin',
      ['Un message', 'Se raconter après', 'La confiance'],
    ),
    3: t(
      'Comment aimeriez-vous équilibrer, dans une semaine ordinaire, le temps à deux et le temps à soi ?',
      'projection',
      ['Des soirées fixes', 'Au feeling', 'En en parlant'],
    ),
  },
  V82_M8_05: {
    1: t(
      'Quel lieu, en dehors de votre ville actuelle, compte particulièrement pour vous ?',
      'origine',
      ['Le pays de ma famille', 'Un lieu de vacances', 'Aucun en particulier'],
    ),
    2: t(
      'Qu’est-ce qui vous rendrait un grand déménagement envisageable, ou au contraire impossible ?',
      'limite',
      ['Le travail', 'La famille', 'La vie de famille'],
    ),
    3: t(
      'Comment aimeriez-vous décider à deux du lieu où vous vivrez dans dix ans ?',
      'projection',
      ['Selon nos carrières', 'Selon nos familles', 'Selon nos envies'],
    ),
  },
  V82_M8_06: {
    1: t(
      'Qu’avez-vous appris, autour de vous, sur la façon dont un couple traverse une longue période difficile ?',
      'origine',
      ['En se parlant', 'En se faisant aider', 'En prenant du recul'],
    ),
    2: t(
      'Dans une période difficile sans danger pour personne, qu’est-ce qui vous donnerait l’envie de réparer plutôt que de partir ?',
      'besoin',
      [
        'Des efforts des deux côtés',
        'Une aide extérieure',
        'Des signes de changement',
      ],
    ),
    3: t(
      'Quelle limite personnelle aimeriez-vous que l’autre connaisse dès le début, même dans un engagement fort ?',
      'limite',
      ['Le respect', 'La sécurité', 'La sincérité'],
    ),
  },
};

export const V82_AGREEMENTS: Record<string, Agreement> = {
  'V82_M1_03:A': {
    statement:
      'Vous souhaitez tous les deux un foyer qui partage les mêmes traditions.',
    probe: {
      ...t(
        'Au quotidien, quelle tradition partagée aimeriez-vous faire vivre en premier dans votre foyer ?',
        'sens',
        ['Une fête', 'Un repas', 'Une prière'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'Qui vous a transmis les traditions que vous aimeriez retrouver dans votre foyer ?',
          'origine',
          ['Mes parents', 'Mes grands-parents', 'Ma communauté'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M1_03:B': {
    statement: 'Vous imaginez tous les deux un équilibre entre deux cultures.',
    probe: {
      ...t(
        'Comment aimeriez-vous faire vivre cet équilibre entre deux cultures au quotidien ?',
        'projection',
        ['Les fêtes de chacun', 'Les langues', 'Les repas'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "En grandissant, qu'avez-vous vu de deux cultures qui se rencontrent ?",
          'origine',
          ['Dans ma famille', 'Autour de moi', 'Pas grand-chose'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M1_03:C': {
    statement:
      'Vous laisseriez tous les deux chacun garder ses propres pratiques.',
    probe: {
      ...t(
        'Au quotidien, comment aimeriez-vous vivre côte à côte avec des habitudes différentes ?',
        'sens',
        ['En y assistant', 'En posant des questions', 'En la respectant'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'Qui, dans votre histoire, vous a fait découvrir des façons de vivre différentes de la vôtre ?',
          'origine',
          ['Ma famille', 'Des amitiés', 'Des voyages'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M1_04:A': {
    statement: "L'accord de vos familles compte pour vous deux.",
    probe: {
      ...t(
        'Comment aimeriez-vous, le moment venu, présenter la personne aimée à vos familles ?',
        'projection',
        ['Ensemble', 'Chacun à la sienne', 'Par étapes'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'Dans votre famille, comment accueillait-on la personne choisie par un enfant devenu adulte ?',
          'origine',
          ['Avec cérémonie', 'Simplement', 'Avec prudence'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M1_04:C': {
    statement:
      'Vous écouteriez tous les deux vos familles avant de décider à deux.',
    probe: {
      ...t(
        'Comment aimeriez-vous écouter vos familles sans vous sentir dépossédé(e) de votre choix dans la vie à deux ?',
        'besoin',
        ['Du temps', 'Un dialogue', "Le soutien de l'autre"],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'Qui, dans votre entourage, vous a montré comment écouter sa famille tout en décidant soi-même ?',
          'origine',
          ['Un parent', 'Un aîné', 'Un ami'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M1_04:D': {
    statement: "Le choix du couple passerait d'abord pour vous deux.",
    probe: {
      ...t(
        'Comment aimeriez-vous garder le lien avec vos familles si elles ne comprenaient pas un choix de couple ?',
        'projection',
        ['Par le temps', 'Par la parole', 'Par les petits gestes'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qu'est-ce qui, dans votre histoire, vous a convaincu(e) que le couple décide d'abord ?",
          'origine',
          ['Un exemple vécu', 'Une conviction', 'Un conseil'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M4_05:A': {
    statement:
      'Vous partageriez tous les deux les tâches selon le temps et la charge de chacun.',
    probe: {
      ...t(
        'Au quotidien, à quoi verriez-vous que la charge de la maison reste juste entre vous ?',
        'besoin',
        ['Le temps de chacun', 'La fatigue', 'La reconnaissance'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'En grandissant, comment voyiez-vous les tâches se partager à la maison ?',
          'origine',
          ['Équitablement', 'Surtout une personne', 'Selon les disponibilités'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M4_05:B': {
    statement: 'Vous tenez tous les deux à un partage égal des tâches.',
    probe: {
      ...t(
        'Comment aimeriez-vous vérifier ensemble, au fil des mois, que ce partage reste égal ?',
        'projection',
        ['En parler', 'Un tableau', 'Au ressenti'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "D'où vous vient l'envie d'un partage égal des tâches ?",
          'origine',
          ['De ma famille', 'De mon expérience', 'De mes convictions'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M4_05:D': {
    statement:
      "Vous envisagez tous les deux des rôles définis à l'avance pour l'homme et la femme.",
    probe: {
      ...t(
        "Au quotidien, qu'est-ce qui vous semble le plus important à respecter dans ces rôles ?",
        'sens',
        ['La reconnaissance', 'La souplesse', 'La tradition'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'Qui vous a transmis cette façon de voir les rôles dans un foyer ?',
          'origine',
          ['Mes parents', 'Ma communauté', 'Ma foi'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M4_05:E': {
    statement:
      "Vous aimeriez tous les deux reparler régulièrement de l'organisation du foyer.",
    probe: {
      ...t(
        "Comment aimeriez-vous faire le point, à deux, sur l'organisation de la maison ?",
        'projection',
        ['À la rentrée', 'Après un changement', 'Chaque mois'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qu'est-ce qui vous a appris l'intérêt de reparler régulièrement de l'organisation d'un foyer ?",
          'origine',
          ['Ma famille', 'Une colocation', 'Mon travail'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M4_02:A': {
    statement: "Vous soutiendriez tous les deux l'autre sans fixer d'échéance.",
    probe: {
      ...t(
        "Comment aimeriez-vous que l'autre vous montre son soutien sans vous faire sentir redevable ?",
        'besoin',
        ['Par des mots', 'Par des actes', 'Par la discrétion'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'Qui, autour de vous, vous a montré ce que soutenir sans compter veut dire ?',
          'origine',
          ['Sans compter', 'Avec des règles', "Avec l'aide de tous"],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M4_02:B': {
    statement: 'Vous établiriez tous les deux un plan et des limites ensemble.',
    probe: {
      ...t(
        'Concrètement, quels repères rendraient un tel plan rassurant pour vous deux ?',
        'besoin',
        ['Des étapes claires', 'Des points réguliers', 'Un budget'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qu'est-ce qui vous a appris l'intérêt d'un plan à deux dans une période difficile ?",
          'origine',
          ['Un exemple familial', 'Une expérience', 'Un conseil'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M4_06:A': {
    statement:
      'Vous réduiriez tous les deux volontiers votre train de vie pour un projet commun.',
    probe: {
      ...t(
        "Quel projet commun aimeriez-vous construire, au point de mériter ce genre d'effort ?",
        'projection',
        ['Un logement', 'Une famille', 'Un voyage'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qui, autour de vous, vous a montré qu'un effort de quelques mois peut valoir la peine ?",
          'origine',
          ['Mes parents', 'Des amis', 'Personne en particulier'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M4_06:B': {
    statement:
      'Vous accepteriez tous les deux un effort, avec un budget et une date pour refaire le point.',
    probe: {
      ...t(
        'Comment aimeriez-vous faire ce point à deux, le moment venu ?',
        'projection',
        ["Autour d'un repas", 'Avec des chiffres', 'Simplement en parlant'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "D'où vous vient l'habitude de fixer un budget et une échéance à un effort ?",
          'origine',
          ['De ma famille', 'De mon travail', "D'une expérience"],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M5_01:A': {
    statement:
      'Vous poseriez tous les deux une limite tout de suite face à un proche injuste.',
    probe: {
      ...t(
        'Comment aimeriez-vous poser cette limite à deux, avec respect ?',
        'besoin',
        ['Avec calme', 'Avec fermeté', 'Avec humour'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'Qui vous a appris à défendre les personnes qui comptent pour vous ?',
          'origine',
          ['Un parent', 'Un aîné', 'Ma propre expérience'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M5_01:B': {
    statement:
      "Vous soutiendriez tous les deux l'autre, puis vous reparleriez au proche en privé.",
    probe: {
      ...t(
        "Sur le moment, comment aimeriez-vous montrer à l'autre qu'il ou elle peut compter sur vous ?",
        'besoin',
        ['Un regard', 'Un mot', 'Une main tendue'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'Dans votre famille, comment réglait-on une critique injuste envers un proche ?',
          'origine',
          ['Sur le moment', 'En privé', 'Rarement'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M5_03:B': {
    statement:
      'Pour accueillir un proche, vous voudriez tous les deux fixer à deux une durée et des règles.',
    probe: {
      ...t(
        "Avant d'accueillir un proche, quelle règle conviendriez-vous en premier ?",
        'limite',
        ['La durée', "L'espace", 'Les dépenses'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "En grandissant, comment se passait l'accueil d'un proche à la maison ?",
          'origine',
          ['Très naturellement', 'Avec des règles', 'Rarement'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M5_03:D': {
    statement:
      "Vous ne souhaitez ni l'un ni l'autre de cohabitation prolongée avec un proche.",
    probe: {
      ...t(
        'Comment aimeriez-vous aider un proche en difficulté tout en gardant votre foyer à vous ?',
        'projection',
        ['Un soutien financier', 'Un hébergement court', 'Une aide pratique'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qu'est-ce qui, dans votre histoire, vous a fait tenir à un foyer à vous ?",
          'origine',
          ['Une expérience', 'Un besoin de calme', 'Une conviction'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M5_04:B': {
    statement:
      'Vous chercheriez tous les deux une solution équilibrée entre famille et couple.',
    probe: {
      ...t(
        "Au quotidien, qu'est-ce qui vous aiderait à sentir que cet équilibre est juste pour vous deux ?",
        'besoin',
        ['Être consulté(e)', 'Une alternance', 'De la reconnaissance'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          'En grandissant, comment voyiez-vous les adultes concilier famille et vie de couple ?',
          'origine',
          ['Mes parents', 'Un couple ami', 'Personne encore'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M5_04:C': {
    statement:
      "Vous privilégieriez tous les deux l'engagement pris envers l'autre.",
    probe: {
      ...t(
        "Comment aimeriez-vous l'expliquer à vos familles, le moment venu, quand cela les déçoit ?",
        'projection',
        ['Simplement', 'Ensemble', 'Avec une compensation'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qu'est-ce qui vous a appris à tenir d'abord un engagement pris envers la personne aimée ?",
          'origine',
          ['Un exemple familial', 'Une expérience', 'Une conviction'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M8_05:A': {
    statement:
      'Vous êtes tous les deux ouverts à construire un projet dans un autre pays.',
    probe: {
      ...t(
        "Imaginez un projet de vie dans un autre pays : qu'aimeriez-vous construire en premier là-bas ?",
        'projection',
        ["Un réseau d'amis", 'Une carrière', 'Un foyer'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qu'est-ce qui, en grandissant, vous a donné le goût des horizons lointains ?",
          'origine',
          ['Des voyages', 'Ma famille', 'Des rencontres'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M8_05:C': {
    statement:
      'Vous souhaitez tous les deux rester durablement dans votre pays actuel.',
    probe: {
      ...t(
        "Au quotidien, qu'est-ce qui vous attache le plus à votre pays actuel ?",
        'sens',
        ['La famille', 'Le travail', 'Les amis'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qu'est-ce qui, en grandissant, vous a attaché(e) à votre pays ?",
          'origine',
          ['La famille', 'La langue', 'Les paysages'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M8_06:A': {
    statement:
      "Pour vous deux, réparer passe d'abord quand le couple traverse une période difficile.",
    probe: {
      ...t(
        'Comment aimeriez-vous vous faire aider, à deux, si une période difficile durait ?',
        'projection',
        ['Un proche de confiance', 'Un professionnel', 'Un guide spirituel'],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qui, autour de vous, vous a montré qu'un couple peut se réparer ?",
          'origine',
          ['Mes parents', 'Un couple ami', 'Personne encore'],
        ),
        angle: 2,
      },
    ],
  },
  'V82_M8_06:B': {
    statement: 'Pour vous deux, la séparation resterait un dernier recours.',
    probe: {
      ...t(
        'Comment imaginez-vous reconnaître que des efforts pour réparer portent leurs fruits ?',
        'projection',
        [
          'Des disputes plus calmes',
          'Plus de tendresse',
          'Des projets retrouvés',
        ],
      ),
      angle: 3,
    },
    extraProbes: [
      {
        ...t(
          "Qu'est-ce qui, dans votre histoire, vous a fait voir la séparation comme un dernier recours ?",
          'origine',
          ['Ma famille', 'Ma foi', 'Mon expérience'],
        ),
        angle: 2,
      },
    ],
  },
};

/**
 * Stratégie B : questions neutres pour les sujets non réintégrés. Elles ne
 * supposent aucun écart et ne citent aucune réponse ; servies seulement à un
 * couple dont les deux entretiens sont en V8.2.
 */
export const V82_NEUTRAL: Array<{
  theme: Theme;
  day: number;
  replaces: string;
  tpl: PoolTemplate;
}> = [
  {
    theme: 'intimite',
    day: 3,
    replaces: 'M6_Q18',
    tpl: t(
      'Que signifie pour vous le pardon dans un couple qui traverse une épreuve ?',
      'sens',
      ['Un nouveau départ', 'Un long chemin', 'Une décision'],
    ),
  },
  {
    theme: 'intimite',
    day: 2,
    replaces: 'M5_Q09',
    tpl: t(
      'Comment aimeriez-vous que les amitiés de chacun trouvent leur place dans la vie à deux ?',
      'projection',
      ['En les présentant', 'En faisant confiance', 'Avec des repères'],
    ),
  },
  {
    theme: 'projet',
    day: 3,
    replaces: 'M8_Q11',
    tpl: t(
      'Que représente pour vous le fait de prendre soin de l’autre dans les moments difficiles ?',
      'sens',
      ['Une évidence', 'Un engagement', 'Un apprentissage'],
    ),
  },
  {
    theme: 'projet',
    day: 2,
    replaces: 'M7_Q02',
    tpl: t(
      'Comment aimeriez-vous que le travail de chacun s’accorde avec la vie à deux ?',
      'projection',
      ['Une grande place', 'Une place équilibrée', 'Une place limitée'],
    ),
  },
];
