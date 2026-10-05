/**
 * Réserve de questions supplémentaires du Sondeur.
 *
 * Avec les deux gabarits historiques de `sondeur.generator.ts`, chaque créneau
 * (thème × jour) dispose de cinq formulations : un membre peut enchaîner
 * plusieurs parcours sans retrouver les mêmes questions. S'y ajoutent des
 * gabarits ciblés (divergence réelle) et des gabarits d'accord (convergence
 * réelle), instanciés avec les réponses du couple.
 */
import type { Convergence, Divergence, Theme } from '../matching/divergence.engine';

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
        text: "Dans cinq ans, quel projet financier aimeriez-vous avoir réalisé ensemble ?",
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
        text: "Si vos enfants choisissaient une autre voie spirituelle que la vôtre, comment réagiriez-vous ?",
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
        text: "Faut-il, selon vous, attendre un engagement officiel avant toute intimité physique ?",
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
