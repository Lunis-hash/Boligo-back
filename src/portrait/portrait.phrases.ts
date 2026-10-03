/**
 * Tables de rédaction des fiches BOLIGO.
 *
 * Chaque entrée associe une réponse précise du Grand Entretien (identifiant de
 * question + clé d'option, voir `questions.data.ts`) à un fragment de phrase
 * rédigé à la main. Aucun texte d'option n'est recopié ni coupé : la fiche ne
 * peut donc jamais afficher « Oui si le projet de , ».
 *
 * Gabarits accordés par `agree()` : `{Il}`, `{il}`, `{e}`, `{masc|fem}`.
 */

export type Phrases = Record<string, string>;

/** Les 11 modules du Grand Entretien, dans l'ordre du questionnaire. */
export interface ModuleInfo {
  number: number;
  id: string;
  label: string;
  emoji: string;
  /** Sous-titre du bilan. */
  tagline: string;
  /** Ce sur quoi porte l'affinité (« la vision de l'engagement »). */
  focus: string;
  /** Poids du module dans le score global de compatibilité. */
  weight: number;
}

export const MODULES: ModuleInfo[] = [
  {
    number: 0,
    id: 'm0',
    label: 'Critères essentiels',
    emoji: '🧭',
    tagline: 'Enfants, mobilité, hygiène de vie',
    focus: 'les critères essentiels',
    weight: 1.5,
  },
  {
    number: 1,
    id: 'm1',
    label: 'Identité & culture',
    emoji: '🌍',
    tagline: 'Culture, traditions et foi',
    focus: 'la culture et la foi',
    weight: 1.3,
  },
  {
    number: 2,
    id: 'm2',
    label: 'Attachement & émotions',
    emoji: '🤝',
    tagline: "Votre façon d'aimer et de vivre les émotions",
    focus: "la façon d'aimer et de vivre les émotions",
    weight: 1.2,
  },
  {
    number: 3,
    id: 'm3',
    label: 'Vécu & maturité',
    emoji: '📖',
    tagline: 'Les leçons de votre histoire',
    focus: 'le vécu et la maturité affective',
    weight: 0.6,
  },
  {
    number: 4,
    id: 'm4',
    label: 'Vision économique',
    emoji: '💶',
    tagline: "L'argent, l'épargne et les projets",
    focus: "la gestion de l'argent",
    weight: 1,
  },
  {
    number: 5,
    id: 'm5',
    label: 'Famille & vie sociale',
    emoji: '👨‍👩‍👧',
    tagline: 'La place des proches et de l’entourage',
    focus: 'la place de la famille et des proches',
    weight: 1,
  },
  {
    number: 6,
    id: 'm6',
    label: 'Communication & intimité',
    emoji: '💬',
    tagline: 'Désaccords, fidélité et intimité',
    focus: "la communication et l'intimité",
    weight: 1.2,
  },
  {
    number: 7,
    id: 'm7',
    label: 'Trajectoire de vie',
    emoji: '🌱',
    tagline: 'Ambitions, rythme et lieu de vie',
    focus: 'le rythme et la trajectoire de vie',
    weight: 0.8,
  },
  {
    number: 8,
    id: 'm8',
    label: 'Projet de couple',
    emoji: '💍',
    tagline: "L'engagement que vous recherchez",
    focus: "la vision de l'engagement",
    weight: 1.5,
  },
  {
    number: 9,
    id: 'm9',
    label: 'Effort & réciprocité',
    emoji: '⚖️',
    tagline: 'Donner, recevoir et décider à deux',
    focus: "l'équilibre entre donner et recevoir",
    weight: 1,
  },
  {
    number: 10,
    id: 'm10',
    label: 'Alchimie & énergie',
    emoji: '✨',
    tagline: 'Ce que vous apportez, ce que vous recherchez',
    focus: "l'alchimie et l'énergie recherchée",
    weight: 0.8,
  },
];

/** Réponses qui expriment une hésitation (n'entrent pas dans la clarté du profil). */
export const UNDECIDED: Record<string, string[]> = {
  M0_Q06: ['C'],
  M1_Q11: ['D'],
  M2_Q03: ['D'],
  M3_Q08: ['D'],
  M3_Q10: ['C'],
  M4_Q09: ['D'],
  M5_Q08: ['D'],
};

/** Libellés courts des questions affichées dans le bilan (« vos réponses clés »). */
export const QUESTION_SHORT_LABEL: Record<string, string> = {
  M0_Q03: 'Déménager pour le couple',
  M0_Q05: 'Enfants à charge',
  M0_Q06: "Désir d'enfants",
  M0_Q08: 'Tabac, alcool',
  M1_Q03: 'Traditions de mariage',
  M1_Q05: 'Religion',
  M1_Q06: 'Foi dans le couple',
  M2_Q01: 'Silence du partenaire',
  M2_Q03: 'Besoin principal',
  M2_Q06: 'Face à la colère',
  M3_Q01: 'Leçon du passé',
  M3_Q05: "Place de l'ex",
  M3_Q10: 'Schémas répétés',
  M4_Q01: 'Argent dans le couple',
  M4_Q08: 'Épargne',
  M4_Q09: 'Dettes du partenaire',
  M5_Q01: 'Famille et décisions',
  M5_Q03: 'Vivre avec la belle-famille',
  M5_Q08: 'Téléphone du partenaire',
  M6_Q01: 'Pendant une dispute',
  M6_Q06: 'Sexualité',
  M6_Q10: 'Fidélité',
  M7_Q01: 'Votre vie dans 5 ans',
  M7_Q03: 'Tempérament',
  M7_Q07: 'Lieu de vie dans 5 ans',
  M8_Q01: 'Objectif',
  M8_Q02: "Délai d'engagement",
  M8_Q04: "Langage de l'amour",
  M9_Q01: 'Décisions',
  M9_Q02: "L'effort en amour",
  M9_Q06: 'Sacrifices',
  M10_Q03: 'Énergie recherchée',
  M10_Q09: 'Ce que vous apportez',
  M10_Q10: 'Ce que vous voulez offrir',
};

/** Questions mises en avant dans le bilan, par module (dans l'ordre d'affichage). */
export const MODULE_KEY_QUESTIONS: Record<number, string[]> = {
  0: ['M0_Q06', 'M0_Q03', 'M0_Q08'],
  1: ['M1_Q05', 'M1_Q06', 'M1_Q03'],
  2: ['M2_Q03', 'M2_Q06', 'M2_Q01'],
  3: ['M3_Q01', 'M3_Q05', 'M3_Q10'],
  4: ['M4_Q01', 'M4_Q08', 'M4_Q09'],
  5: ['M5_Q01', 'M5_Q03', 'M5_Q08'],
  6: ['M6_Q01', 'M6_Q10', 'M6_Q06'],
  7: ['M7_Q01', 'M7_Q03', 'M7_Q07'],
  8: ['M8_Q01', 'M8_Q02', 'M8_Q04'],
  9: ['M9_Q02', 'M9_Q01', 'M9_Q06'],
  10: ['M10_Q09', 'M10_Q03', 'M10_Q10'],
};

/**
 * Phrase « vous » de chaque module pour le bilan personnel :
 * [question d'ancrage, phrases par option].
 */
export const MODULE_SELF_SENTENCE: Record<number, [string, Phrases]> = {
  0: [
    'M0_Q06',
    {
      A: 'Fonder une famille fait partie de votre projet, sans hésitation.',
      B: 'Vous souhaitez des enfants si les conditions sont réunies.',
      C: 'La question des enfants reste ouverte pour vous.',
      D: "Vous ne souhaitez pas d'enfants, et c'est une décision mûrie.",
    },
  ],
  1: [
    'M1_Q06',
    {
      A: 'Votre foi est centrale : vous souhaitez partager la même foi.',
      B: '{Votre foi compte : vous attendez de votre partenaire qu’elle respecte vos pratiques.|Votre foi compte : vous attendez de votre partenaire qu’il respecte vos pratiques.}',
      C: 'Votre foi compte, tout en restant ouvert{e} à d’autres croyances.',
      D: 'Pour vous, la religion relève de l’intime.',
    },
  ],
  2: [
    'M2_Q03',
    {
      A: 'Vous avez besoin de vous sentir en sécurité et aimé{e} sans condition.',
      B: 'Vous tenez à préserver votre autonomie et votre espace personnel.',
      C: 'Vous recherchez un équilibre entre intimité et liberté.',
      D: 'Votre besoin profond en couple est encore en train de se préciser.',
    },
  ],
  3: [
    'M3_Q01',
    {
      A: 'Votre histoire vous a appris à exprimer vos besoins dès le départ.',
      B: "Votre histoire vous a appris l'importance de valeurs partagées.",
      C: 'Votre histoire vous a appris à poser vos limites sans culpabilité.',
      D: 'Votre histoire vous a appris à choisir avec la tête autant qu’avec le cœur.',
    },
  ],
  4: [
    'M4_Q01',
    {
      A: 'Vous imaginez un couple où tout l’argent est mis en commun.',
      B: 'Vous privilégiez une contribution proportionnelle aux revenus.',
      C: 'Vous préférez des charges communes, chacun gérant ses propres dépenses.',
      D: 'Pour vous, l’argent reste une affaire individuelle.',
    },
  ],
  5: [
    'M5_Q01',
    {
      A: 'Votre famille est au cœur de vos décisions de couple.',
      B: "L'avis de votre famille compte, mais la décision finale revient au couple.",
      C: 'Vous consultez vos proches par respect, sans obligation.',
      D: 'Les décisions de votre couple n’appartiennent qu’à vous deux.',
    },
  ],
  6: [
    'M6_Q01',
    {
      A: 'Dans un désaccord, vous préférez parler, même quand c’est difficile.',
      B: 'Dans un désaccord, vous prenez du recul pour revenir apaisé{e}.',
      C: 'Dans un désaccord, vous avez tendance à couper court : un point à travailler.',
      D: 'Dans un désaccord, le silence peut s’installer : un point à travailler.',
    },
  ],
  7: [
    'M7_Q01',
    {
      A: 'Dans cinq ans, vous vous voyez dans une vie stable : foyer, enfants, sécurité.',
      B: 'Dans cinq ans, vous vous voyez en pleine progression : carrière, projets, croissance.',
      C: 'Dans cinq ans, vous vous voyez dans une vie libre, faite de voyages et de découvertes.',
      D: 'Dans cinq ans, vous vous voyez dans une vie paisible et profonde.',
    },
  ],
  8: [
    'M8_Q01',
    {
      A: 'Vous cherchez un engagement officiel : le mariage.',
      B: 'Vous cherchez une relation sérieuse, avec un projet de vie commun.',
      C: 'Vous souhaitez d’abord apprendre à connaître l’autre avant tout engagement.',
      D: 'Vous restez ouvert{e} à ce que la rencontre fera naître.',
    },
  ],
  9: [
    'M9_Q02',
    {
      A: "Pour vous, l'amour vrai doit rester naturel, sans effort.",
      B: "Pour vous, l'amour se construit : l'effort en est une preuve.",
      C: 'Vous attendez un effort réciproque, sinon vous vous retirez.',
      D: 'Vous donnez beaucoup et attendez la même chose en retour.',
    },
  ],
  10: [
    'M10_Q09',
    {
      A: 'Vous apportez votre joie de vivre et votre légèreté.',
      B: 'Vous apportez votre profondeur et votre qualité d’écoute.',
      C: 'Vous apportez votre stabilité et votre fiabilité.',
      D: 'Vous apportez votre créativité et votre goût pour le beau.',
    },
  ],
};

// ─── Analyse à la 3e personne (fiche Découverte) ────────────────────────────

/** Manière d'aborder la recherche (phrase d'ouverture). */
export const APPROACH_BY_DIVERGENCE: Phrases = {
  A: 'une exigence de clarté : les sujets importants se posent tôt',
  B: 'patience, en laissant la relation grandir avant les sujets sensibles',
  C: 'un vrai sens du compromis',
  D: "une grande confiance dans la capacité de l'amour à rapprocher",
};

export const APPROACH_BY_GOAL: Phrases = {
  A: 'une intention claire : construire un mariage',
  B: "le désir sincère d'une relation sérieuse",
  C: 'le souci de bien se connaître avant de s’engager',
  D: 'une belle ouverture d’esprit',
};

export const GOAL: Phrases = {
  A: '{Il} cherche un **engagement officiel, le mariage**',
  B: '{Il} souhaite une **relation sérieuse, portée par un projet de vie commun**',
  C: "{Il} veut d'abord **apprendre à connaître l'autre** avant tout engagement",
  D: '{Il} reste **ouvert{e} à ce que la rencontre fera naître**',
};

export const TIMING: Phrases = {
  A: 'envisagé dans les douze mois si tout va bien',
  B: "à l'horizon de deux à trois ans",
  C: 'sans pression, au rythme du couple',
  D: 'lorsque les conditions seront mûres',
};

export const CHILDREN_WISH: Phrases = {
  A: 'Fonder une famille fait clairement partie de son projet',
  B: '{Il} souhaite des enfants si les conditions sont réunies',
  C: 'La question des enfants reste ouverte pour {lui|elle}',
  D: "{Il} ne souhaite pas d'enfants, une décision mûrie",
};

export const CHILDREN_NOW: Phrases = {
  B: 'déjà parent d’un enfant à charge',
  C: 'déjà parent de deux enfants ou plus',
  D: 'parent d’enfants aujourd’hui autonomes',
};

export const NEED: Phrases = {
  A: 'a besoin de se sentir en sécurité et aimé{e} sans condition',
  B: 'tient à préserver son autonomie et son espace personnel',
  C: 'recherche un équilibre entre intimité et liberté',
};

export const CONFLICT: Phrases = {
  A: 'aborde les désaccords de front, même quand c’est difficile',
  B: 'préfère prendre du recul lors d’un désaccord, puis en reparler au calme',
  C: 'a tendance à couper court quand la tension monte',
  D: 'peut se refermer dans le silence lors d’un conflit',
};

export const FAITH: Phrases = {
  A: 'Sa foi chrétienne',
  B: 'Sa foi musulmane',
  C: 'Sa foi juive',
  D: 'Sa spiritualité bouddhiste ou hindouiste',
};

export const FAITH_IMPACT: Phrases = {
  A: 'occupe une place centrale : {il} souhaite partager la même foi',
  B: '{compte beaucoup : il attend de sa partenaire qu’elle respecte ses pratiques|compte beaucoup : elle attend de son partenaire qu’il respecte ses pratiques}',
  C: 'compte, et {il} reste ouvert{e} à d’autres croyances',
  D: 'relève de l’intime : la religion reste pour {lui|elle} une affaire personnelle',
};

export const NO_FAITH: Phrases = {
  E: '{Il} se dit agnostique ou athée',
  F: '{Il} vit une spiritualité personnelle, sans religion définie',
};

export const NO_FAITH_IMPACT: Phrases = {
  C: 'et reste ouvert{e} aux croyances de l’autre',
  D: 'et considère la religion comme une affaire personnelle',
};

export const TRADITIONS: Phrases = {
  A: 'Les traditions de mariage de sa culture comptent énormément pour {lui|elle}',
  B: '{Il} tient à conserver les principales traditions de mariage de sa culture',
};

export const MONEY: Phrases = {
  A: 'la mise en commun de tout l’argent du couple',
  B: 'une contribution proportionnelle aux revenus',
  C: 'des charges communes partagées, chacun gérant ses dépenses',
  D: "l'indépendance financière de chacun",
};

export const FAMILY: Phrases = {
  A: 'ne prend pas de décision importante sans l’avis de sa famille',
  B: 'écoute sa famille tout en laissant la décision finale au couple',
  C: 'consulte ses proches par respect, sans obligation',
  D: 'considère que les décisions du couple n’appartiennent qu’au couple',
};

export const BRINGS: Phrases = {
  A: 'sa joie de vivre et sa légèreté',
  B: 'sa profondeur et sa qualité d’écoute',
  C: 'sa stabilité et sa fiabilité',
  D: 'sa créativité et son goût pour le beau',
};

export const OFFERS: Phrases = {
  A: 'la sécurité',
  B: "l'aventure",
  C: 'la profondeur',
  D: 'la joie',
};

// ─── Bio à la 1re personne (citation sous le prénom) ────────────────────────

export const BIO_GOAL: Phrases = {
  A: 'Je cherche un engagement sincère, de ceux qui mènent au mariage.',
  B: 'Je cherche une relation sérieuse, avec un vrai projet de vie à deux.',
  C: 'Je souhaite rencontrer quelqu’un en prenant le temps de bien nous connaître.',
  D: 'Je suis ouvert{e} à une belle rencontre, sans scénario écrit d’avance.',
};

export const BIO_BRINGS: Phrases = {
  A: 'Ce que j’apporte : ma joie de vivre et ma légèreté.',
  B: 'Ce que j’apporte : ma profondeur et mon écoute.',
  C: 'Ce que j’apporte : ma stabilité et ma fiabilité.',
  D: 'Ce que j’apporte : ma créativité et mon goût pour le beau.',
};

export const BIO_OFFERS: Phrases = {
  A: 'J’aimerais offrir de la sécurité à la personne qui partagera ma vie.',
  B: "J'aimerais vivre une belle aventure avec la personne qui partagera ma vie.",
  C: 'J’aimerais construire une relation profonde, qui ait du sens.',
  D: "J'aimerais offrir de la joie à la personne qui partagera ma vie.",
};

// ─── Trois mots, valeurs, attentes, détails ────────────────────────────────

/** Ordre de priorité des traits pour « Ce profil en 3 mots ». */
export const TRAITS: Array<[string, Phrases]> = [
  [
    'M10_Q09',
    { A: 'Solaire', B: 'À l’écoute', C: 'Fiable', D: 'Créati{f|ve}' },
  ],
  [
    'M8_Q01',
    {
      A: 'Engagé{e}',
      B: '{Sérieux|Sérieuse}',
      C: 'Réfléchi{e}',
      D: 'Ouvert{e}',
    },
  ],
  [
    'M7_Q03',
    { A: 'Réservé{e}', B: 'Équilibré{e}', C: 'Sociable', D: 'Adaptable' },
  ],
  ['M6_Q10', { A: 'Fidèle' }],
  ['M2_Q08', { A: 'Conciliant{e}', B: 'Juste' }],
  ['M7_Q05', { A: '{Audacieux|Audacieuse}', B: 'Flexible', D: 'Posé{e}' }],
  ['M10_Q04', { A: 'Drôle', B: 'Plein{e} d’humour' }],
  ['M7_Q02', { A: '{Ambitieux|Ambitieuse}' }],
];

/** Valeurs et centres d'intérêt : [id, libellé, réponses qui l'activent]. */
export const VALUE_CHIPS: Array<{
  id: string;
  label: string;
  when: Record<string, string[]>;
}> = [
  { id: 'mariage', label: 'Mariage', when: { M8_Q01: ['A'] } },
  { id: 'serieux', label: 'Relation sérieuse', when: { M8_Q01: ['B'] } },
  { id: 'enfants', label: "Désir d'enfants", when: { M0_Q06: ['A', 'B'] } },
  {
    id: 'foi',
    label: 'Foi & spiritualité',
    when: { M1_Q06: ['A', 'B', 'C'] },
  },
  { id: 'traditions', label: 'Traditions', when: { M1_Q03: ['A', 'B'] } },
  { id: 'famille', label: 'Famille', when: { M5_Q01: ['A', 'B'] } },
  { id: 'fidelite', label: 'Fidélité absolue', when: { M6_Q10: ['A'] } },
  {
    id: 'transparence',
    label: 'Transparence',
    when: { M5_Q08: ['A'], M4_Q09: ['A'] },
  },
  {
    id: 'egalite',
    label: 'Égalité dans le couple',
    when: { M9_Q01: ['A'], M4_Q03: ['C'] },
  },
  {
    id: 'dialogue',
    label: 'Dialogue',
    when: { M6_Q11: ['A'] },
  },
  {
    id: 'stabilite',
    label: 'Stabilité',
    when: { M7_Q01: ['A'], M10_Q10: ['A'] },
  },
  {
    id: 'aventure',
    label: 'Voyages & découvertes',
    when: { M7_Q01: ['C'], M10_Q10: ['B'] },
  },
  {
    id: 'ambition',
    label: 'Ambition professionnelle',
    when: { M7_Q02: ['A'], M7_Q01: ['B'] },
  },
  { id: 'humour', label: 'Humour', when: { M10_Q04: ['A', 'B'] } },
  {
    id: 'tendresse',
    label: 'Tendresse',
    when: { M9_Q07: ['A'], M8_Q04: ['E'] },
  },
  {
    id: 'temps',
    label: 'Temps à deux',
    when: { M8_Q04: ['D'], M7_Q08: ['A'] },
  },
  { id: 'discretion', label: 'Discrétion', when: { M5_Q05: ['B', 'D'] } },
  { id: 'intimite', label: 'Intimité', when: { M6_Q06: ['A'] } },
];

export const EXPECT_TIMING: Phrases = {
  A: 'Un engagement officiel envisagé **dans les douze mois**, si tout va bien.',
  B: "Un engagement officiel **d'ici deux à trois ans**.",
  C: 'Un engagement **sans pression**, au rythme naturel du couple.',
  D: 'Un engagement **quand les conditions seront mûres**.',
};

export const EXPECT_ENERGY: Phrases = {
  A: 'Quelqu’un de **léger et drôle**, qui {le|la} fait rire.',
  B: 'Quelqu’un d’**intense et profond**, qui {le|la} stimule intellectuellement.',
  C: 'Quelqu’un de **chaleureux, stable et rassurant**.',
  D: 'Quelqu’un de **calme et posé**, qui équilibre son énergie.',
};

export const EXPECT_LOVE: Phrases = {
  A: 'Des **mots d’affection** : {il} a besoin d’entendre qu’{il} est aimé{e}.',
  B: 'Des **gestes concrets** : pour {lui|elle}, aimer, c’est aussi rendre service.',
  C: 'Des **attentions** : offrir et recevoir comptent pour {lui|elle}.',
  D: 'Du **temps de qualité**, pleinement présent.',
  E: 'De la **tendresse** : câlins et gestes doux sont son langage.',
};

export const EXPECT_NEVER: Phrases = {
  A: 'Jamais de **mensonge répété**.',
  B: 'Aucune **infidélité**, sous quelque forme que ce soit.',
  C: 'Le **respect de sa famille**, sans exception.',
  D: 'Un **projet commun** : l’absence d’avenir partagé est rédhibitoire.',
};

export const DETAIL_SITUATION: Phrases = {
  A: 'Célibataire',
  B: 'Séparé{e} ou divorcé{e}',
  C: '{Veuf|Veuve}',
  D: 'En transition',
};

export const DETAIL_CHILDREN: Phrases = {
  A: 'Sans enfant',
  B: 'Un enfant à charge',
  C: 'Deux enfants ou plus',
  D: 'Enfants autonomes',
};

export const DETAIL_CHILDREN_WISH: Phrases = {
  A: 'Oui, absolument',
  B: 'Oui, si les conditions sont réunies',
  C: 'Pas encore certain{e}',
  D: 'Non, c’est définitif',
};

export const DETAIL_RELIGION: Phrases = {
  A: 'Chrétien{|ne} pratiquant{e}',
  B: 'Musulman{|e} pratiquant{e}',
  C: '{Juif|Juive} pratiquant{e}',
  D: 'Bouddhiste ou hindouiste',
  E: 'Agnostique ou athée',
  F: 'Spirituel{|le}, sans religion',
};

export const DETAIL_EDUCATION: Phrases = {
  A: 'CAP-BEP ou sans diplôme',
  B: 'Baccalauréat',
  C: 'Bac +2 à Bac +4',
  D: 'Bac +5 et plus',
};

export const DETAIL_LIFESTYLE: Phrases = {
  A: 'Stable et établi{e}',
  B: 'En pleine progression',
  C: '{Aventureux|Aventureuse} et libre',
  D: 'Paisible et profond{e}',
};
