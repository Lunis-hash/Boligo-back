export interface BankQuestion {
  id: string;
  theme: string;
  emoji: string;
  text: string;
  options?: string[];
}

export const QUESTIONS_BANK: BankQuestion[] = [
  // --- JOUR 1 : LIGNES ROUGES ---
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
    emoji: '🔥',
    text: "Quel mensonge ne pardonnerais-tu jamais dans le couple ?",
    options: ['Mentir sur ses sentiments', 'Cacher des dettes / mensonges financiers', 'Mentir sur son passé (enfants, mariage)', 'Autre...'],
  },

  // --- JOUR 2 : VALEURS PROFONDES ---
  {
    id: 'val_01',
    theme: 'Valeurs profondes',
    emoji: '⚖️',
    text: "Si ton partenaire change de religion ou devient athée, tu fais quoi ?",
    options: ['Ça ne change rien, je l\'aime pour qui il/elle est', 'C\'est difficile mais on peut discuter', 'C\'est un problème grave pour notre avenir', 'Autre...'],
  },
  {
    id: 'val_02',
    theme: 'Valeurs profondes',
    emoji: '💔',
    text: "Ta belle-mère / beau-père déteste ton conjoint. Tu choisis qui ?",
    options: ['Mon conjoint, toujours. On construit notre vie ensemble', 'J\'essaie de concilier les deux sans trahir personne', 'La famille avant tout, même si ça fait mal', 'Autre...'],
  },

  // --- JOUR 3 : FUTUR & SACRIFICES ---
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

  // --- FAMILLE ---
  {
    id: 'fam_01',
    theme: 'Famille',
    emoji: '👨‍👩‍👧',
    text: "Quelle place accordes-tu à ta belle-famille dans la vie quotidienne de ton futur couple ?",
    options: ['Très impliquée', 'Présente mais pas intrusive', 'Chacun gère sa famille', 'Autre...'],
  },
  {
    id: 'fam_02',
    theme: 'Famille',
    emoji: '🍼',
    text: "Souhaites-tu des enfants rapidement, plus tard, ou pas du tout ?",
    options: ['Oui, rapidement', 'Oui, plus tard', 'Pas encore décidé', 'Autre...'],
  },

  // --- SPIRITUALITÉ ---
  {
    id: 'spi_01',
    theme: 'Spiritualité',
    emoji: '🕊️',
    text: "À quel point la pratique religieuse commune est-elle essentielle pour toi dans ton couple ?",
    options: ['Indispensable', 'Important mais pas bloquant', 'Pas essentiel', 'Autre...'],
  },
  {
    id: 'spi_02',
    theme: 'Spiritualité',
    emoji: '✨',
    text: "Comment gérerais-tu une différence de ferveur ou de pratique religieuse avec ton partenaire ?",
    options: ['Dialoguer pour trouver un terrain d\'entente', 'Respecter les différences', 'C\'est un critère non négociable', 'Autre...'],
  },

  // --- VALEURS ---
  {
    id: 'val_01',
    theme: 'Valeurs',
    emoji: '⚖️',
    text: "Quelle est la limite que tu ne pardonnerais jamais dans une relation ?",
    options: ['Trahison de confiance', 'Manque de respect répété', 'Absence d\'ambition', 'Autre...'],
  },
  {
    id: 'val_02',
    theme: 'Valeurs',
    emoji: '🤝',
    text: "Comment gères-tu les conflits ?",
    options: ['J\'affronte directement', 'Je prends du temps pour réfléchir', 'Je cherche un compromis', 'Autre...'],
  },

  // --- QUOTIDIEN ---
  {
    id: 'quo_01',
    theme: 'Quotidien',
    emoji: '🍳',
    text: "Comment imagines-tu la répartition des tâches ménagères ?",
    options: ['Partage équitable', 'Chacun ses tâches', 'On s\'adapte', 'Autre...'],
  },
  {
    id: 'quo_02',
    theme: 'Quotidien',
    emoji: '✈️',
    text: "Quelles sont tes vacances idéales ?",
    options: ['Aventure', 'Repos total', 'Visites culturelles', 'Autre...'],
  },
];
