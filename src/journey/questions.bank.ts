export interface BankQuestion {
  id: string;
  theme: string;
  emoji: string;
  text: string;
  options?: string[];
}

export const QUESTIONS_BANK: BankQuestion[] = [
  // --- JOUR 1 : LIGNES ROUGES (7 questions) ---
  {
    id: 'lr_01',
    theme: 'Lignes rouges',
    emoji: '🚩',
    text: "L'infidélité est-elle un point de non-retour pour toi ?",
    options: ['Jamais pardonnable, c\'est terminé', 'Une seule erreur peut être comprise', 'Ça dépend du contexte et de la sincérité', 'Autre...'],
  },
  {
    id: 'lr_02',
    theme: 'Lignes rouges',
    emoji: '💸',
    text: "Quel mensonge financier ne pardonnerais-tu jamais dans le couple ?",
    options: ['Cacher de grosses dettes', 'Mentir sur son salaire réel', 'Faire des achats très coûteux en cachette', 'Autre...'],
  },
  {
    id: 'lr_03',
    theme: 'Lignes rouges',
    emoji: '🕵️',
    text: "Ton partenaire t'a caché un élément lourd de son passé (ex: un enfant, un mariage). Ta réaction ?",
    options: ['C\'est impardonnable de mentir là-dessus', 'Je peux pardonner si c\'est du passé lointain', 'J\'essaie de comprendre pourquoi il/elle a eu peur de me le dire', 'Autre...'],
  },
  {
    id: 'lr_04',
    theme: 'Lignes rouges',
    emoji: '🍷',
    text: "Comment réagis-tu face à une addiction (alcool, jeux, drogues) chez ton partenaire ?",
    options: ['Je le quitte immédiatement, c\'est non négociable', 'Je l\'aide s\'il/elle veut vraiment s\'en sortir', 'C\'est trop lourd, ça dépend de l\'impact sur notre vie', 'Autre...'],
  },
  {
    id: 'lr_05',
    theme: 'Lignes rouges',
    emoji: '🛑',
    text: "Où se situe la limite du manque de respect pour toi dans une dispute ?",
    options: ['Dès qu\'on élève la voix et qu\'on crie', 'Dès qu\'il y a des insultes ou rabaisser l\'autre', 'Tant qu\'il n\'y a pas de violence physique, le reste peut se réparer', 'Autre...'],
  },
  {
    id: 'lr_06',
    theme: 'Lignes rouges',
    emoji: '👀',
    text: "Ton partenaire est très jaloux et fouille ton téléphone. Que fais-tu ?",
    options: ['C\'est inacceptable, la confiance est primordiale', 'Je le laisse faire s\'il a besoin d\'être rassuré', 'On en discute sérieusement pour fixer des limites', 'Autre...'],
  },
  {
    id: 'lr_07',
    theme: 'Lignes rouges',
    emoji: '🤬',
    text: "Face à de la violence verbale répétée, comment réagis-tu ?",
    options: ['Je pars dès la première fois', 'Je tente la thérapie de couple en urgence', 'Je donne une seconde chance mais avec un ultimatum', 'Autre...'],
  },

  // --- JOUR 2 : VALEURS PROFONDES (7 questions) ---
  {
    id: 'val_01',
    theme: 'Valeurs profondes',
    emoji: '🕊️',
    text: "Si ton partenaire change de religion ou devient athée, tu fais quoi ?",
    options: ['Ça ne change rien, je l\'aime pour qui il/elle est', 'C\'est difficile mais on peut discuter', 'C\'est un problème grave pour notre avenir', 'Autre...'],
  },
  {
    id: 'val_02',
    theme: 'Valeurs profondes',
    emoji: '🏦',
    text: "Comment envisages-tu la gestion financière du couple ?",
    options: ['Tout en commun (compte joint unique)', 'Chacun son compte et on partage les dépenses à 50/50', 'Au prorata des revenus de chacun', 'Autre...'],
  },
  {
    id: 'val_03',
    theme: 'Valeurs profondes',
    emoji: '👨‍👩‍👦',
    text: "Si tes beaux-parents s'immiscent constamment dans vos choix de vie, comment gères-tu ?",
    options: ['C\'est à mon partenaire de mettre des limites', 'Je confronte la belle-famille directement', 'Je m\'éloigne d\'eux pour protéger notre couple', 'Autre...'],
  },
  {
    id: 'val_04',
    theme: 'Valeurs profondes',
    emoji: '🎓',
    text: "Sur l'éducation des enfants, si vous avez des visions diamétralement opposées ?",
    options: ['C\'est un motif de rupture', 'On cherche un compromis quitte à faire appel à un tiers', 'Celui qui passe le plus de temps avec les enfants décide', 'Autre...'],
  },
  {
    id: 'val_05',
    theme: 'Valeurs profondes',
    emoji: '⚖️',
    text: "Comment imagines-tu la répartition des rôles (tâches ménagères, charge mentale) ?",
    options: ['Un partage strictement égalitaire', 'Une répartition selon les forces de chacun', 'L\'un gère plus la maison, l\'autre plus le financier', 'Autre...'],
  },
  {
    id: 'val_06',
    theme: 'Valeurs profondes',
    emoji: '⛈️',
    text: "Dans les moments de crise majeure, de quoi as-tu le plus besoin ?",
    options: ['De solitude et de temps pour réfléchir', 'D\'un dialogue immédiat pour régler le problème', 'D\'actions concrètes et de solutions', 'Autre...'],
  },
  {
    id: 'val_07',
    theme: 'Valeurs profondes',
    emoji: '🤝',
    text: "Ton partenaire a des opinions politiques ou sociétales opposées aux tiennes. Est-ce viable ?",
    options: ['Oui, la diversité des opinions enrichit le couple', 'Seulement sur certains sujets, pas sur les valeurs morales de base', 'Non, on doit partager la même vision du monde', 'Autre...'],
  },

  // --- JOUR 3 : FUTUR & SACRIFICES (7 questions) ---
  {
    id: 'fut_01',
    theme: 'Futur & Sacrifices',
    emoji: '🔮',
    text: "Ton partenaire te dit qu'il/elle ne veut plus d'enfants après 2 ans de relation. Réaction ?",
    options: ['C\'est un dealbreaker, je veux fonder une famille', 'On discute pour comprendre le pourquoi', 'L\'amour passe avant tout, même sans enfants', 'Autre...'],
  },
  {
    id: 'fut_02',
    theme: 'Futur & Sacrifices',
    emoji: '✈️',
    text: "Pour la carrière de ton conjoint, tu dois quitter ton pays, tes amis, ta famille. Tu acceptes ?",
    options: ['Sans hésiter, l\'amour est plus fort', 'Seulement si on en discute et que c\'est réciproque', 'Non, je ne sacrifierai jamais ma vie pour quelqu\'un', 'Autre...'],
  },
  {
    id: 'fut_03',
    theme: 'Futur & Sacrifices',
    emoji: '🏡',
    text: "Si vous héritez d'une belle somme, qu'en faites-vous en priorité ?",
    options: ['Acheter une maison/immobilier', 'Investir pour notre avenir (épargne, bourse)', 'Profiter de la vie et voyager', 'Autre...'],
  },
  {
    id: 'fut_04',
    theme: 'Futur & Sacrifices',
    emoji: '👴',
    text: "Comment vois-tu votre vie à la retraite ?",
    options: ['Voyager et explorer le monde', 'Se rapprocher des enfants et petits-enfants', 'Vivre calmement à la campagne ou à la mer', 'Autre...'],
  },
  {
    id: 'fut_05',
    theme: 'Futur & Sacrifices',
    emoji: '⚖️',
    text: "Jusqu'où es-tu prêt(e) à faire des compromis sur ton style de vie pour l'autre ?",
    options: ['Je suis prêt(e) à m\'adapter à 100%', 'Je fais des efforts mais je garde mes habitudes fondamentales', 'L\'autre doit m\'accepter tel(le) que je suis', 'Autre...'],
  },
  {
    id: 'fut_06',
    theme: 'Futur & Sacrifices',
    emoji: '🚀',
    text: "Si ton partenaire veut tout quitter pour lancer son entreprise (avec des risques financiers), tu le/la soutiens ?",
    options: ['À 100%, je prends le relais financièrement', 'Oui, mais avec des limites de temps et d\'argent claires', 'Non, j\'ai besoin de sécurité financière avant tout', 'Autre...'],
  },
  {
    id: 'fut_07',
    theme: 'Futur & Sacrifices',
    emoji: '🗝️',
    text: "Quel niveau d'indépendance est essentiel pour toi dans une relation à long terme ?",
    options: ['Tout faire ensemble, nous sommes fusionnels', 'Avoir des amis et des loisirs séparés de temps en temps', 'Garder une grande liberté personnelle et son jardin secret', 'Autre...'],
  }
];
