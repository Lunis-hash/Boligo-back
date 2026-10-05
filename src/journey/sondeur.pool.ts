/**
 * Réserve de questions supplémentaires du Sondeur.
 *
 * Avec les deux gabarits historiques de `sondeur.generator.ts`, chaque créneau
 * (thème × jour) dispose de cinq formulations : un membre peut enchaîner
 * plusieurs parcours sans retrouver les mêmes questions. S'y ajoutent des
 * gabarits ciblés (divergence réelle) et des gabarits d'accord (convergence
 * réelle), instanciés avec les réponses du couple.
 */
import type {
  Convergence,
  Divergence,
  Theme,
} from '../matching/divergence.engine';

export interface PoolTemplate {
  text: string;
  options: string[];
}

export interface PairTemplate<T> {
  text: (x: T) => string;
  options: string[];
}

const opts = (a: string, b: string, c: string) => [a, b, c, 'Autre...'];

/** Trois formulations de plus par thème et par jour (1 lignes rouges, 2 valeurs, 3 futur). */
export const EXTRA_GENERIC: Record<Theme, Record<number, PoolTemplate[]>> = {
  famille: {
    1: [
      {
        text: "Votre partenaire souhaite qu'un de ses parents vienne vivre avec vous durablement. Quelle est votre position ?",
        options: opts(
          "J'accepte, c'est un devoir familial",
          'Seulement pour une période définie',
          'Non, je tiens à notre intimité de couple',
        ),
      },
      {
        text: "Vos deux familles ne s'entendent pas du tout. Jusqu'où êtes-vous prêt(e) à aller pour préserver la paix ?",
        options: opts(
          'Je garde le lien avec les deux, quoi qu’il arrive',
          'Je limite les rencontres communes',
          'Je choisis mon couple sans hésiter',
        ),
      },
      {
        text: "Votre partenaire a un enfant d'une précédente union. Qu'est-ce qui serait non négociable pour vous ?",
        options: opts(
          'Avoir une place claire dans le foyer',
          'Une relation apaisée avec l’autre parent',
          'Rien : je m’adapterai',
        ),
      },
    ],
    2: [
      {
        text: "Qui, dans votre entourage, vous a le plus appris ce qu'est un couple solide ?",
        options: opts(
          'Mes parents ou mes grands-parents',
          'Un proche dont j’admire le couple',
          'Personne : j’ai appris par contraste',
        ),
      },
      {
        text: 'Que représente pour vous le fait de prendre soin de vos parents lorsqu’ils vieilliront ?',
        options: opts(
          'Un devoir qui va de soi',
          'Une responsabilité partagée avec la fratrie',
          'Une aide, sans tout sacrifier',
        ),
      },
      {
        text: 'Les traditions familiales (fêtes, repas, rites) : à quel point comptent-elles pour vous ?',
        options: opts(
          'Énormément : elles me relient aux miens',
          'Je garde celles qui ont du sens',
          'Peu : je préfère créer les nôtres',
        ),
      },
    ],
    3: [
      {
        text: "Combien d'enfants imaginez-vous, et à quel rythme ?",
        options: opts(
          'Un ou deux, sans trop attendre',
          'Une grande famille',
          'Nous en déciderons à deux le moment venu',
        ),
      },
      {
        text: 'Dans cinq ans, à quelle fréquence voyez-vous vos familles respectives ?',
        options: opts(
          'Chaque semaine, c’est essentiel',
          'Quelques fois par mois',
          'Surtout aux grandes occasions',
        ),
      },
      {
        text: "Comment imaginez-vous l'éducation de vos enfants au quotidien ?",
        options: opts(
          'Un cadre clair et des règles',
          'Beaucoup de liberté et de dialogue',
          'Un équilibre que nous construirons ensemble',
        ),
      },
    ],
  },
  argent: {
    1: [
      {
        text: 'Votre partenaire fait un gros achat sans vous consulter. Où placez-vous la limite ?',
        options: opts(
          'Au-delà d’un montant fixé ensemble',
          'Dès que cela touche nos économies communes',
          'Aucune limite : chacun gère son argent',
        ),
      },
      {
        text: 'Votre partenaire veut se porter garant(e) pour un proche en difficulté. Quelle est votre position ?',
        options: opts(
          'Non : on ne met pas le foyer en danger',
          'Oui, si nous en décidons ensemble',
          'C’est son choix, je le respecte',
        ),
      },
      {
        text: "Quel mensonge sur l'argent serait impardonnable pour vous ?",
        options: opts(
          'Une dette cachée',
          'Des dépenses dissimulées',
          'Un revenu passé sous silence',
        ),
      },
    ],
    2: [
      {
        text: "Comment l'argent était-il vécu dans la famille où vous avez grandi ?",
        options: opts(
          'Avec prudence : on épargnait',
          'Avec générosité : on partageait',
          'Avec tension : on en parlait peu',
        ),
      },
      {
        text: 'Pour vous, épargner, c’est avant tout…',
        options: opts(
          'Une sécurité indispensable',
          'Un moyen de réaliser des projets',
          'Secondaire : la vie est faite pour être vécue',
        ),
      },
      {
        text: 'Qui doit, selon vous, assurer les dépenses du foyer ?',
        options: opts(
          'Les deux, à parts égales',
          'Chacun selon ses moyens',
          'Celui ou celle qui gagne le plus',
        ),
      },
    ],
    3: [
      {
        text: 'Dans cinq ans, quel projet financier aimeriez-vous avoir réalisé ensemble ?',
        options: opts(
          'Devenir propriétaires',
          'Une épargne de sécurité solide',
          'Lancer un projet ou une entreprise',
        ),
      },
      {
        text: "Si l'un de vous perd son emploi, comment vous organisez-vous ?",
        options: opts(
          'L’autre assume, sans compter',
          'Nous réduisons nos dépenses ensemble',
          'Nous fixons une durée et un plan',
        ),
      },
      {
        text: "Comment parlerez-vous d'argent au quotidien sans que cela devienne une source de tension ?",
        options: opts(
          'Un point budget régulier',
          'Des règles simples fixées une fois pour toutes',
          'Le moins possible, par confiance',
        ),
      },
    ],
  },
  spiritualite: {
    1: [
      {
        text: 'Votre partenaire ne souhaite pas de mariage religieux. Est-ce un obstacle pour vous ?',
        options: opts(
          'Oui, c’est essentiel pour moi',
          'Nous trouverons une forme qui convient aux deux',
          'Non, la cérémonie m’importe peu',
        ),
      },
      {
        text: 'Votre partenaire doit-il ou doit-elle partager votre religion ou vos convictions ?',
        options: opts(
          'Oui, c’est indispensable',
          'Pas forcément, s’il ou elle les respecte',
          'Non, cela ne compte pas',
        ),
      },
      {
        text: "Une pratique de votre partenaire (jeûne, prière, interdits alimentaires) change votre quotidien. Jusqu'où l'acceptez-vous ?",
        options: opts(
          'Entièrement : je m’y associe',
          'Je la respecte sans la partager',
          'Elle ne doit pas s’imposer au foyer',
        ),
      },
    ],
    2: [
      {
        text: "D'où vous viennent vos convictions : de votre éducation, d'un cheminement personnel, d'une rencontre ?",
        options: opts(
          'De mon éducation',
          'D’un cheminement personnel',
          'D’une expérience qui m’a marqué(e)',
        ),
      },
      {
        text: 'Dans les moments difficiles, sur quoi vous appuyez-vous ?',
        options: opts(
          'Ma foi ou ma spiritualité',
          'Mes proches',
          'Ma propre force intérieure',
        ),
      },
      {
        text: 'Quelles valeurs tenez-vous pour sacrées, avec ou sans religion ?',
        options: opts(
          'La loyauté et la parole donnée',
          'Le respect de la famille',
          'La justice et l’honnêteté',
        ),
      },
    ],
    3: [
      {
        text: 'Dans cinq ans, quelle place la spiritualité prend-elle dans votre foyer ?',
        options: opts(
          'Une pratique commune et régulière',
          'Chacun à sa manière, dans le respect',
          'Une place discrète',
        ),
      },
      {
        text: 'Si vos enfants choisissaient une autre voie spirituelle que la vôtre, comment réagiriez-vous ?',
        options: opts(
          'Ce serait une vraie peine',
          'Je l’accepterais en gardant le dialogue',
          'C’est leur liberté',
        ),
      },
      {
        text: 'Quels rituels aimeriez-vous partager à deux (prière, méditation, temps de silence, fêtes) ?',
        options: opts(
          'Des rituels religieux communs',
          'Des moments de calme et de recul',
          'Aucun en particulier',
        ),
      },
    ],
  },
  intimite: {
    1: [
      {
        text: "Votre partenaire échange des messages intimes avec quelqu'un d'autre, sans jamais le rencontrer. Est-ce une infidélité pour vous ?",
        options: opts(
          'Oui, sans aucun doute',
          'Cela dépend du contenu',
          'Non, tant qu’il n’y a rien de physique',
        ),
      },
      {
        text: 'Faut-il, selon vous, attendre un engagement officiel avant toute intimité physique ?',
        options: opts(
          'Oui, c’est une conviction',
          'Je préfère prendre le temps',
          'Non, ce n’est pas une condition',
        ),
      },
      {
        text: 'Votre partenaire refuse de parler de sexualité. Est-ce un problème pour vous ?',
        options: opts(
          'Oui, le dialogue est indispensable',
          'Avec le temps, cela viendra',
          'Non, cela doit rester pudique',
        ),
      },
    ],
    2: [
      {
        text: 'Comment exprimez-vous le plus naturellement votre affection ?',
        options: opts(
          'Par le toucher et les gestes',
          'Par les mots',
          'Par des actes et des attentions concrètes',
        ),
      },
      {
        text: "Qu'avez-vous appris de vos relations passées sur votre façon d'aimer ?",
        options: opts(
          'Que j’ai besoin d’être rassuré(e)',
          'Que je dois mieux exprimer mes besoins',
          'Que je donne parfois trop',
        ),
      },
      {
        text: 'Que signifie pour vous la pudeur dans un couple ?',
        options: opts(
          'Une valeur à préserver',
          'Une question de confiance, qui évolue',
          'Pas grand-chose : tout peut se dire',
        ),
      },
    ],
    3: [
      {
        text: 'Après l’arrivée d’enfants, comment préserverez-vous votre vie de couple ?',
        options: opts(
          'Des soirées à deux sanctuarisées',
          'Des week-ends sans les enfants',
          'Nous nous adapterons au fil du temps',
        ),
      },
      {
        text: 'Si la routine s’installe, qui en parle en premier, et comment ?',
        options: opts(
          'Moi, sans attendre',
          'Nous fixons un moment pour en parler',
          'Nous laissons passer, ça revient toujours',
        ),
      },
      {
        text: "Dans cinq ans, qu'est-ce qui prouvera que votre complicité est toujours vivante ?",
        options: opts(
          'Le désir et la tendresse au quotidien',
          'Les rires et les projets partagés',
          'Une confiance totale l’un en l’autre',
        ),
      },
    ],
  },
  communication: {
    1: [
      {
        text: 'Votre partenaire consulte votre téléphone sans vous le dire. Comment réagissez-vous ?',
        options: opts(
          'C’est une limite franchie',
          'J’en parle calmement pour comprendre',
          'Je n’ai rien à cacher, peu importe',
        ),
      },
      {
        text: 'Votre partenaire se moque de vous devant des amis. Que faites-vous ?',
        options: opts(
          'Je le lui dis sur le moment',
          'J’en parle en privé ensuite',
          'Je laisse passer si c’est rare',
        ),
      },
      {
        text: 'Quelle parole, même prononcée sous la colère, serait impardonnable pour vous ?',
        options: opts(
          'Une insulte',
          'Une menace de rupture',
          'Un mot blessant sur ma famille',
        ),
      },
    ],
    2: [
      {
        text: 'Dans votre famille, comment réglait-on les conflits ?',
        options: opts(
          'Par le dialogue',
          'Par le silence',
          'Par des éclats, puis on passait à autre chose',
        ),
      },
      {
        text: 'Quand quelque chose vous contrarie, le dites-vous tout de suite ?',
        options: opts(
          'Oui, immédiatement',
          'Après avoir pris du recul',
          'Rarement, je garde pour moi',
        ),
      },
      {
        text: "Qu'est-ce qui vous donne le sentiment d'être vraiment écouté(e) ?",
        options: opts(
          'Qu’on me regarde et qu’on me pose des questions',
          'Qu’on se souvienne de ce que j’ai dit',
          'Qu’on agisse après m’avoir entendu(e)',
        ),
      },
    ],
    3: [
      {
        text: 'Dans cinq ans, comment prenez-vous les grandes décisions à deux ?',
        options: opts(
          'Toujours ensemble, après discussion',
          'Chacun décide dans son domaine',
          'Celui ou celle qui est le plus concerné(e) tranche',
        ),
      },
      {
        text: "Si l'un de vous traverse une période difficile (deuil, stress, épuisement), comment souhaitez-vous être soutenu(e) ?",
        options: opts(
          'Par une présence constante',
          'Par de l’espace et de la patience',
          'Par une aide concrète au quotidien',
        ),
      },
      {
        text: 'Comment aimeriez-vous vous dire les choses importantes ?',
        options: opts(
          'En face, sans attendre',
          'Par écrit d’abord, pour bien formuler',
          'Lors d’un moment calme prévu pour cela',
        ),
      },
    ],
  },
  projet: {
    1: [
      {
        text: "Si votre partenaire ne voulait finalement pas d'enfants, que feriez-vous ?",
        options: opts(
          'Je partirais : c’est non négociable',
          'J’en parlerais longuement avant de décider',
          'Je pourrais y renoncer',
        ),
      },
      {
        text: 'Votre partenaire veut reprendre de longues études et réduire ses revenus. Quelle est votre position ?',
        options: opts(
          'Je le ou la soutiens pleinement',
          'Oui, avec un plan clair',
          'Pas si cela met le foyer en difficulté',
        ),
      },
      {
        text: "Qu'est-ce qui vous ferait dire qu'une relation n'est pas sérieuse ?",
        options: opts(
          'L’absence de projet commun',
          'Le refus de présenter ses proches',
          'Le manque de disponibilité',
        ),
      },
    ],
    2: [
      {
        text: "Qu'est-ce qui vous donne envie de vous engager maintenant, à ce moment de votre vie ?",
        options: opts(
          'Je me sens prêt(e) et stable',
          'J’ai envie de fonder une famille',
          'J’ai compris ce que je cherche vraiment',
        ),
      },
      {
        text: 'Pour vous, réussir sa vie, c’est d’abord…',
        options: opts(
          'Une famille unie',
          'Un travail qui a du sens',
          'La liberté de choisir sa vie',
        ),
      },
      {
        text: 'Quel couple autour de vous vous inspire, et pourquoi ?',
        options: opts(
          'Celui de mes parents',
          'Celui d’amis proches',
          'Aucun : nous inventerons le nôtre',
        ),
      },
    ],
    3: [
      {
        text: 'Dans cinq ans, quel équilibre souhaitez-vous entre carrière et vie de famille ?',
        options: opts(
          'La famille avant tout',
          'Un équilibre à parts égales',
          'Ma carrière reste une priorité',
        ),
      },
      {
        text: 'Quel serait votre premier grand projet commun ?',
        options: opts(
          'Nous installer ensemble',
          'Nous marier',
          'Vivre une expérience forte, un voyage',
        ),
      },
      {
        text: 'Comment imaginez-vous votre vie à deux une fois à la retraite ?',
        options: opts(
          'Près de nos enfants et petits-enfants',
          'Dans un lieu qui nous fait rêver',
          'Actifs, avec de nouveaux projets',
        ),
      },
    ],
  },
  lieu: {
    1: [
      {
        text: 'Votre partenaire refuse catégoriquement de quitter sa ville. Est-ce un problème pour vous ?',
        options: opts(
          'Oui, si cela bloque mes projets',
          'Non, je peux m’installer chez lui ou elle',
          'Nous chercherons un compromis',
        ),
      },
      {
        text: "Vivre dans le pays d'origine de votre partenaire : est-ce envisageable ?",
        options: opts(
          'Oui, avec plaisir',
          'Pour un temps seulement',
          'Non, je veux rester où je suis',
        ),
      },
      {
        text: "On vous propose l'emploi de vos rêves à 500 km, et votre partenaire ne peut pas déménager. Que faites-vous ?",
        options: opts(
          'Je refuse : le couple d’abord',
          'J’accepte et nous organisons la distance',
          'Nous décidons ensemble, sans tabou',
        ),
      },
    ],
    2: [
      {
        text: 'Où vous sentez-vous vraiment chez vous ?',
        options: opts(
          'Là où j’ai grandi',
          'Là où vivent mes proches',
          'Partout où je construis ma vie',
        ),
      },
      {
        text: "Ville ou campagne : qu'est-ce qui vous ressource ?",
        options: opts(
          'L’énergie de la ville',
          'Le calme de la campagne',
          'Un peu des deux',
        ),
      },
      {
        text: "Avez-vous déjà déménagé pour quelqu'un ou pour un projet ? Qu'en avez-vous retenu ?",
        options: opts(
          'Oui, et je le referais',
          'Oui, mais c’était difficile',
          'Non, jamais',
        ),
      },
    ],
    3: [
      {
        text: 'Dans cinq ans, êtes-vous propriétaires, locataires ou encore en mouvement ?',
        options: opts(
          'Propriétaires d’un lieu à nous',
          'Locataires, pour rester libres',
          'Entre deux villes ou deux pays',
        ),
      },
      {
        text: "Comment choisirez-vous l'endroit où élever vos enfants ?",
        options: opts(
          'Selon les écoles et la sécurité',
          'Près de nos familles',
          'Selon nos carrières',
        ),
      },
      {
        text: 'Si vos familles vivent dans deux pays différents, comment partagerez-vous vos vacances ?',
        options: opts(
          'En alternance, une année chacun',
          'Moitié chez l’un, moitié chez l’autre',
          'Nous privilégierons nos propres voyages',
        ),
      },
    ],
  },
};

const lower = (s: string) => s.toLowerCase();

/** Deux formulations ciblées de plus par jour, sur une divergence réelle. */
export const EXTRA_TARGETED: Record<number, PairTemplate<Divergence>[]> = {
  1: [
    {
      text: (d) =>
        `« ${d.label} » : vous avez répondu différemment (« ${d.a.text} » / « ${d.b.text} »). Qu'est-ce que l'autre devrait accepter pour que ce point ne vous sépare pas ?`,
      options: opts(
        'Que ma position ne changera pas',
        'Un compromis clair, posé à deux',
        'Du temps pour en reparler',
      ),
    },
    {
      text: (d) =>
        `Sur « ${lower(d.label)} », l'un de vous a répondu « ${d.a.text} », l'autre « ${d.b.text} ». Cet écart pourrait-il mettre fin à votre relation ?`,
      options: opts(
        'Oui, c’est essentiel pour moi',
        'Non, si nous en parlons franchement',
        'Je ne sais pas encore',
      ),
    },
  ],
  2: [
    {
      text: (d) =>
        `Vos réponses sur « ${lower(d.label)} » ne se rejoignent pas (« ${d.a.text} » / « ${d.b.text} »). Quelle expérience de vie explique la vôtre ?`,
      options: opts(
        'L’exemple de mes parents',
        'Une relation passée',
        'Ma foi ou mes convictions',
      ),
    },
    {
      text: (d) =>
        `« ${d.label} » : « ${d.a.text} » d'un côté, « ${d.b.text} » de l'autre. Qu'est-ce qui vous aiderait à comprendre la position de l'autre ?`,
      options: opts(
        'Qu’il ou elle me raconte d’où elle vient',
        'En parler avec une personne de confiance',
        'Vivre la situation concrètement',
      ),
    },
  ],
  3: [
    {
      text: (d) =>
        `Imaginez votre vie à deux avec votre différence sur « ${lower(d.label)} » (« ${d.a.text} » / « ${d.b.text} »). Qu'est-ce qui la rendrait vivable au quotidien ?`,
      options: opts(
        'Une règle claire fixée ensemble',
        'Chacun garde sa liberté sur ce point',
        'En reparler chaque année',
      ),
    },
    {
      text: (d) =>
        `Dans un an, qu'est-ce qui vous dira que votre différence sur « ${lower(d.label)} » (« ${d.a.text} » / « ${d.b.text} ») est bien vécue ?`,
      options: opts(
        'Nous en parlons sans tension',
        'Nous avons trouvé un accord clair',
        'Chacun a fait un pas vers l’autre',
      ),
    },
  ],
};

/** Gabarits d'accord : le couple a répondu la même chose, on creuse ce point commun. */
/**
 * Risque partagé (même réponse des deux côtés, et c'est elle qui pose
 * problème : deux silences, deux réparations lentes) : on ne parle pas de
 * « différence », on prépare le moment où cela arrivera.
 */
export const SHARED_RISK: Record<number, PairTemplate<Divergence>[]> = {
  1: [
    {
      text: (d) =>
        `Sur « ${lower(d.label)} », vous avez répondu tous les deux « ${d.a.text} ». Le jour où cela arrivera entre vous, qui fera le premier pas ?`,
      options: opts(
        'Moi, même si ça me coûte',
        'Celui ou celle qui se calme en premier',
        'On se fixe une règle à l’avance',
      ),
    },
    {
      text: (d) =>
        `« ${d.label} » : vous fonctionnez de la même façon (« ${d.a.text} »). Qu’est-ce qui vous a déjà aidé à sortir de cette situation dans le passé ?`,
      options: opts(
        'Un message ou un geste de l’autre',
        'Du temps seul(e), puis une vraie discussion',
        'Rien encore — c’est à construire',
      ),
    },
  ],
  2: [
    {
      text: (d) =>
        `Vous avez tous les deux répondu « ${d.a.text} » sur « ${lower(d.label)} ». Quel signal discret pourriez-vous convenir pour dire « je suis prêt(e) à en reparler » ?`,
      options: opts(
        'Un mot ou un message convenu',
        'Un geste tendre',
        'Proposer un moment précis pour en parler',
      ),
    },
    {
      text: (d) =>
        `« ${d.label} » : quand vous réagissez tous les deux ainsi (« ${d.a.text} »), qu’est-ce que vous ressentez à l’intérieur ?`,
      options: opts(
        'De la colère que je n’arrive pas à dire',
        'De la peur de blesser ou d’être blessé(e)',
        'Le besoin de me protéger',
      ),
    },
  ],
  3: [
    {
      text: (d) =>
        `Dans un an, qu’est-ce qui vous montrera que « ${lower(d.label)} » (« ${d.a.text} ») ne vous éloigne plus ?`,
      options: opts(
        'Nos disputes durent moins longtemps',
        'L’un de nous relance toujours le dialogue',
        'Nous en parlons avant que ça s’envenime',
      ),
    },
    {
      text: (d) =>
        `Vous partagez la même réaction sur « ${lower(d.label)} » (« ${d.a.text} »). Quelle règle de couple poseriez-vous dès maintenant pour vous en protéger ?`,
      options: opts(
        'Ne jamais se coucher fâchés',
        'Reparler de toute dispute sous 24 heures',
        'Demander de l’aide si ça se répète',
      ),
    },
  ],
};

export const CONVERGENT: Record<number, PairTemplate<Convergence>[]> = {
  1: [
    {
      text: (c) =>
        `Vous avez tous deux répondu « ${c.answer} » sur « ${lower(c.label)} ». Qu'est-ce qui pourrait, malgré tout, vous faire changer d'avis ?`,
      options: opts(
        'Rien : c’est une conviction',
        'Un événement de vie majeur',
        'Une discussion sincère avec l’autre',
      ),
    },
    {
      text: (c) =>
        `Vous êtes d'accord sur « ${lower(c.label)} » (« ${c.answer} »). À quel point cette position est-elle non négociable pour vous ?`,
      options: opts(
        'Totalement non négociable',
        'Importante, mais je reste ouvert(e)',
        'Une préférence, pas une règle',
      ),
    },
    {
      text: (c) =>
        `« ${c.label} » : vous partagez la même réponse (« ${c.answer} »). Qu'attendez-vous de l'autre pour la respecter au quotidien ?`,
      options: opts(
        'De la constance dans les actes',
        'Qu’il ou elle m’en parle si cela change',
        'Rien de plus : nous sommes alignés',
      ),
    },
  ],
  2: [
    {
      text: (c) =>
        `Vous avez la même position sur « ${lower(c.label)} » (« ${c.answer} »). D'où vient-elle, chez vous ?`,
      options: opts(
        'De mon éducation',
        'De mon expérience',
        'De mes convictions',
      ),
    },
    {
      text: (c) =>
        `Sur « ${lower(c.label)} », vous êtes alignés (« ${c.answer} »). Qu'est-ce que cette position protège en vous ?`,
      options: opts('Ma sécurité', 'Ma liberté', 'Mes valeurs familiales'),
    },
    {
      text: (c) =>
        `« ${c.answer} » : c'est votre réponse commune sur « ${lower(c.label)} ». Avez-vous toujours pensé ainsi ?`,
      options: opts(
        'Oui, depuis toujours',
        'Non, j’ai changé avec le temps',
        'Je me pose encore des questions',
      ),
    },
  ],
  3: [
    {
      text: (c) =>
        `Vous partagez la même vision de « ${lower(c.label)} » (« ${c.answer} »). Comment cela se traduira-t-il concrètement dans votre vie commune ?`,
      options: opts(
        'Par des décisions prises ensemble',
        'Par un projet précis',
        'Par notre façon de vivre au quotidien',
      ),
    },
    {
      text: (c) =>
        `Votre accord sur « ${lower(c.label)} » (« ${c.answer} ») vous inspire-t-il un premier projet à deux ?`,
      options: opts(
        'Oui, et j’ai déjà une idée précise',
        'Oui, à construire ensemble',
        'Pas encore, c’est trop tôt',
      ),
    },
    {
      text: (c) =>
        `Dans cinq ans, comment ferez-vous vivre votre accord sur « ${lower(c.label)} » (« ${c.answer} ») ?`,
      options: opts(
        'En le rappelant dans nos choix',
        'En le transmettant à nos enfants',
        'En le faisant évoluer ensemble',
      ),
    },
  ],
};

/**
 * V6.1 — Formulations de fond propres à un sujet (argent pendant la
 * fréquentation, signaux d'alerte, caprices, timidité, maladie, attirance).
 * Elles passent avant les formulations ciblées génériques : une scène
 * concrète fait parler plus vrai qu'une question abstraite.
 */
export const TOPIC_DEEP: Record<
  string,
  Record<number, PairTemplate<Divergence>>
> = {
  M4_Q10: {
    1: {
      text: (d) =>
        `Premier rendez-vous : l'un de vous pense « ${d.a.text} », l'autre « ${d.b.text} ». Le serveur pose l'addition sur la table : que se passe-t-il concrètement ?`,
      options: opts(
        'Je paie, sans en faire un sujet',
        'Je propose de partager',
        'J’attends de voir ce que fait l’autre',
      ),
    },
    2: {
      text: (d) =>
        `Qui paie au premier rendez-vous (« ${d.a.text} » / « ${d.b.text} ») : d'où vous vient votre règle ?`,
      options: opts(
        'De mon éducation et de ma culture',
        'D’une expérience où je me suis senti(e) mal à l’aise',
        'De ma conception de l’égalité',
      ),
    },
    3: {
      text: (d) =>
        `Après le premier rendez-vous, comment partagerez-vous les sorties au quotidien, vu vos réponses (« ${d.a.text} » / « ${d.b.text} ») ?`,
      options: opts(
        'Chacun son tour',
        'Au prorata de nos revenus',
        'Celui ou celle qui gagne le plus paie davantage',
      ),
    },
  },
  M4_Q11: {
    1: {
      text: (d) =>
        `Votre partenaire perd son emploi et ne retrouve rien depuis six mois. Vos réponses : « ${d.a.text} » / « ${d.b.text} ». Jusqu'où va votre soutien ?`,
      options: opts(
        'Je paie tout, aussi longtemps qu’il le faut',
        'Je soutiens, si je le ou la vois chercher activement',
        'Au-delà d’un an, je ne sais pas si je resterais',
      ),
    },
    2: {
      text: (d) =>
        `Avez-vous déjà vu une relation se briser à cause du manque d'argent ? Sur ce point, vos réponses diffèrent (« ${d.a.text} » / « ${d.b.text} »).`,
      options: opts(
        'Oui, dans ma famille',
        'Oui, dans une de mes relations',
        'Non, mais c’est ma plus grande crainte',
      ),
    },
    3: {
      text: (d) =>
        `Vu vos réponses (« ${d.a.text} » / « ${d.b.text} »), quel filet de sécurité voulez-vous construire pour qu'un coup dur financier ne vous sépare pas ?`,
      options: opts(
        'Une épargne de précaution commune',
        'Une règle écrite : qui paie quoi en cas de coup dur',
        'L’aide de nos familles',
      ),
    },
  },
  M4_Q12: {
    1: {
      text: (d) =>
        `Votre partenaire gagne bien moins que ce que vous espériez. Vos réponses sur la place de l'argent : « ${d.a.text} » / « ${d.b.text} ». Est-ce que cela change vos sentiments ?`,
      options: opts(
        'Oui, honnêtement',
        'Non, si son projet est sérieux',
        'Non, l’argent n’entre pas en compte',
      ),
    },
    2: {
      text: (d) =>
        `Pour vous, que représente un « bon niveau de vie » ? Vos réponses ne se rejoignent pas (« ${d.a.text} » / « ${d.b.text} »).`,
      options: opts(
        'La sécurité de notre famille',
        'Le confort et le plaisir',
        'Ne dépendre de personne',
      ),
    },
    3: {
      text: (d) =>
        `Dans cinq ans, quel train de vie vous rendrait fier(ère) de votre couple, vu vos réponses (« ${d.a.text} » / « ${d.b.text} ») ?`,
      options: opts(
        'Un logement à nous et des projets',
        'Voyager et profiter',
        'Aider nos familles sans nous priver',
      ),
    },
  },
  M4_Q13: {
    1: {
      text: (d) =>
        `Votre partenaire prend votre voiture sans demander et la ramène le réservoir vide. Vos réponses : « ${d.a.text} » / « ${d.b.text} ». Comment réagissez-vous ?`,
      options: opts(
        'Ça ne me dérange pas',
        'Je lui demande de me prévenir la prochaine fois',
        'Je suis vraiment contrarié(e)',
      ),
    },
    2: {
      text: (d) =>
        `Dans votre famille, les affaires de chacun étaient-elles partagées ? Vos réponses diffèrent (« ${d.a.text} » / « ${d.b.text} »).`,
      options: opts(
        'Tout était à tout le monde',
        'Chacun avait ses affaires, et on demandait',
        'On ne touchait pas aux affaires des autres',
      ),
    },
    3: {
      text: (d) =>
        `Une fois ensemble, qu'est-ce qui restera à chacun (voiture, téléphone, espace à soi) ? Vos réponses : « ${d.a.text} » / « ${d.b.text} ».`,
      options: opts(
        'Rien : tout sera commun',
        'Le téléphone et quelques objets personnels',
        'Chacun garde ses affaires et son espace',
      ),
    },
  },
  M8_Q10: {
    1: {
      text: (d) =>
        `« ${d.label} » : pour l'un de vous c'est un signal pour fuir, pour l'autre une habitude (« ${d.a.text} » / « ${d.b.text} »). Que faudrait-il pour que ce point ne vous sépare pas ?`,
      options: opts(
        'Que l’habitude cesse complètement',
        'Qu’on s’explique à chaque fois',
        'Que la confiance s’installe d’abord',
      ),
    },
    2: {
      text: (d) =>
        `D'où vient votre sensibilité sur ce point (« ${lower(d.label)} ») ?`,
      options: opts(
        'Une relation passée qui m’a blessé(e)',
        'Ce que j’ai vu dans ma famille',
        'Mes valeurs, tout simplement',
      ),
    },
    3: {
      text: (d) =>
        `Dans six mois, à quoi verrez-vous que « ${lower(d.label)} » n'est plus un sujet entre vous ?`,
      options: opts(
        'Je n’y pense plus',
        'Nous en avons parlé franchement',
        'Les habitudes ont vraiment changé',
      ),
    },
  },
  M9_Q19: {
    1: {
      text: (d) =>
        `Votre partenaire boude parce que vous refusez une sortie. Vos réponses : « ${d.a.text} » / « ${d.b.text} ». Que faites-vous ?`,
      options: opts(
        'Je cède pour retrouver la paix',
        'J’explique mon refus et j’attends',
        'Je le ou la laisse bouder : je ne céderai pas',
      ),
    },
    2: {
      text: () =>
        "Quand vous étiez enfant, que se passait-il quand vous n'obteniez pas ce que vous vouliez ?",
      options: opts(
        'On me cédait souvent',
        'On m’expliquait, puis on tenait bon',
        'Je devais m’en contenter sans rien dire',
      ),
    },
    3: {
      text: () =>
        "Quelle règle poseriez-vous pour qu'une envie non satisfaite ne gâche pas votre journée à deux ?",
      options: opts(
        'Dire clairement ce qu’on veut, sans bouder',
        'Accepter un « non » sans le prendre mal',
        'Chercher un compromis le jour même',
      ),
    },
  },
  M9_Q16: {
    1: {
      text: () =>
        'Vous avez tous les deux tendance à faire sentir une frustration. Le jour où vous voudrez deux choses opposées en même temps, qui cédera ?',
      options: opts(
        'Celui ou celle pour qui c’est le plus important',
        'Chacun son tour',
        'On cherchera une troisième option',
      ),
    },
    2: {
      text: () => "Qu'est-ce qui se cache, chez vous, derrière une bouderie ?",
      options: opts(
        'Le sentiment de ne pas compter',
        'La fatigue ou le stress',
        'L’envie qu’on devine ce que je veux',
      ),
    },
    3: {
      text: () =>
        "Quelle règle poseriez-vous pour qu'une envie non satisfaite ne gâche pas votre journée à deux ?",
      options: opts(
        'Dire clairement ce qu’on veut, sans bouder',
        'Accepter un « non » sans le prendre mal',
        'Chercher un compromis le jour même',
      ),
    },
  },
  M2_Q19: {
    1: {
      text: (d) =>
        d.shared
          ? 'Vous avez tous les deux besoin de temps pour vous livrer. Lors de votre premier appel vidéo, qui brisera la glace, et comment ?'
          : `L'un de vous a besoin de temps pour se livrer, l'autre aime tout se dire (« ${d.a.text} » / « ${d.b.text} »). Lors de votre premier appel vidéo, comment trouverez-vous votre rythme ?`,
      options: opts(
        'Je commencerai par une question préparée',
        'On commence par un sujet léger',
        'On s’appuie sur nos réponses au Sondeur',
      ),
    },
    2: {
      text: () =>
        "Qu'est-ce qui vous aide à vous ouvrir à quelqu'un de nouveau ?",
      options: opts(
        'Écrire avant de parler',
        'Un cadre calme, sans pression',
        'Sentir que l’autre s’ouvre aussi',
      ),
    },
    3: {
      text: () =>
        'Quel signe vous montrera que vous êtes vraiment à l’aise l’un avec l’autre ?',
      options: opts(
        'Les silences ne sont plus gênants',
        'Je peux parler de mes doutes',
        'On rit facilement ensemble',
      ),
    },
  },
  M8_Q11: {
    1: {
      text: (d) =>
        `Si l'un de vous tombait gravement malade ou devenait handicapé, que seriez-vous prêt(e) à changer dans votre vie ? Vos réponses : « ${d.a.text} » / « ${d.b.text} ».`,
      options: opts(
        'Mon travail et mon rythme de vie',
        'Mon logement, pour l’adapter',
        'Je ne sais pas encore, et c’est honnête',
      ),
    },
    2: {
      text: () => "Avez-vous déjà pris soin d'un proche malade ou dépendant ?",
      options: opts(
        'Oui, et cela m’a transformé(e)',
        'Oui, et cela m’a épuisé(e)',
        'Non, jamais',
      ),
    },
    3: {
      text: () =>
        'Pour tenir dans la durée face à la maladie, sur qui compteriez-vous ?',
      options: opts(
        'Sur nous deux avant tout',
        'Sur nos familles',
        'Sur des professionnels et des aides',
      ),
    },
  },
  M10_Q15: {
    1: {
      text: (d) =>
        `L'un de vous a besoin d'un coup de cœur immédiat, l'autre d'une attirance qui se construit (« ${d.a.text} » / « ${d.b.text} »). Si l'étincelle n'est pas là au premier appel vidéo, que faites-vous ?`,
      options: opts(
        'J’arrête, c’est plus honnête',
        'Je me donne encore un ou deux échanges',
        'Je laisse le Sondeur parler pour nous',
      ),
    },
    2: {
      text: () =>
        "Avez-vous déjà été attiré(e) par quelqu'un que vous n'aviez pas remarqué au début ?",
      options: opts(
        'Oui, et c’était une belle histoire',
        'Oui, mais ça n’a pas duré',
        'Non : chez moi, c’est tout de suite ou jamais',
      ),
    },
    3: {
      text: () =>
        "Dans dix ans, qu'est-ce qui entretiendra votre désir l'un pour l'autre ?",
      options: opts(
        'Prendre soin de soi et de son allure',
        'Se surprendre et sortir de la routine',
        'La complicité et la tendresse au quotidien',
      ),
    },
  },
};

/**
 * V6.1 — Questions de fond ajoutées aux réserves des thèmes : elles peuvent
 * être posées à tout couple, même sans divergence sur le sujet.
 */
export const DEEP_GENERIC: Partial<
  Record<Theme, Record<number, PoolTemplate[]>>
> = {
  argent: {
    1: [
      {
        text: "Premier rendez-vous : le serveur pose l'addition entre vous deux. Qui paie ?",
        options: opts(
          'L’homme : c’est une marque de respect',
          'Celui ou celle qui a invité',
          'Moitié-moitié',
        ),
      },
    ],
    2: [
      {
        text: 'Dans votre culture ou votre entourage, qui paie quand un couple sort ensemble ?',
        options: opts(
          'L’homme : c’est la norme',
          'Ça dépend des revenus de chacun',
          'Chacun paie sa part',
        ),
      },
    ],
    3: [
      {
        text: "Si l'argent venait à manquer durablement, qu'est-ce qui vous retiendrait dans la relation ?",
        options: opts(
          'L’amour et le projet commun',
          'Le plan pour nous en sortir',
          'Je ne suis pas sûr(e) de rester',
        ),
      },
    ],
  },
  lieu: {
    1: [
      {
        text: 'Votre partenaire emprunte votre voiture sans demander. Où est votre limite ?',
        options: opts(
          'Aucune : ce qui est à moi est à toi',
          'Il ou elle doit me prévenir',
          'Ma voiture, c’est non',
        ),
      },
    ],
    3: [
      {
        text: "Quand vous vivrez ensemble, qu'est-ce qui restera à chacun ?",
        options: opts(
          'Rien : tout sera commun',
          'Le téléphone et quelques objets personnels',
          'Chacun garde ses affaires et un espace à soi',
        ),
      },
    ],
  },
  communication: {
    1: [
      {
        text: 'Disparaître sans explication, fouiller le téléphone, dire « je t’aime » trop vite : lequel de ces signaux vous ferait partir sans attendre ?',
        options: opts(
          'Disparaître sans explication',
          'Fouiller mon téléphone',
          'Me dire « je t’aime » trop vite',
        ),
      },
    ],
    2: [
      {
        text: "Quand vous n'obtenez pas ce que vous voulez, comment le montrez-vous ?",
        options: opts(
          'Je le dis clairement',
          'Je boude un peu, puis ça passe',
          'Je garde ça pour moi',
        ),
      },
    ],
    3: [
      {
        text: "Si l'un de vous est timide, comment ferez-vous pour que chacun ose dire ce qu'il ressent ?",
        options: opts(
          'Écrire quand c’est difficile à dire',
          'Prendre un moment calme chaque semaine',
          'Poser des questions sans brusquer',
        ),
      },
    ],
  },
  intimite: {
    1: [
      {
        text: 'Sans étincelle physique au premier appel vidéo, continuez-vous ?',
        options: opts(
          'Non, l’attirance doit être là',
          'Oui, elle peut venir avec le temps',
          'Je laisse une deuxième chance',
        ),
      },
    ],
    2: [
      {
        text: "Les personnes qui vous ont fait chavirer : qu'est-ce qui vous a touché(e) en premier ?",
        options: opts(
          'Le regard et le sourire',
          'La voix et la façon de parler',
          'L’assurance et l’allure',
        ),
      },
    ],
    3: [
      {
        text: "Dans dix ans, comment entretiendrez-vous votre attirance l'un pour l'autre ?",
        options: opts(
          'Prendre soin de soi et de son allure',
          'Se surprendre et sortir de la routine',
          'La complicité et la tendresse au quotidien',
        ),
      },
    ],
  },
  famille: {
    3: [
      {
        text: "Si l'un de vous tombait malade durablement ou vivait avec un handicap, comment organiseriez-vous votre vie ?",
        options: opts(
          'On s’adapte ensemble, quoi qu’il arrive',
          'On s’appuie sur nos familles',
          'On fait appel à des aides extérieures',
        ),
      },
    ],
  },
  projet: {
    1: [
      {
        text: 'Après trois mois, votre partenaire répond « on verra » quand vous parlez d’avenir. Que faites-vous ?',
        options: opts(
          'Je pose la question franchement',
          'Je lui laisse encore du temps',
          'Je mets fin à la relation',
        ),
      },
    ],
  },
};
