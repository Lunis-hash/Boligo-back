export interface ProfessionCategory {
  category: string;
  icon: string;
  items: string[];
}

export const PROFESSIONS_DATA: ProfessionCategory[] = [
  {
    category: 'Technologies, IT & Digital',
    icon: '💻',
    items: [
      'Développeur / Ingénieur Logiciel',
      'Designer UI / UX',
      'Data Scientist / IA',
      'Chef de Projet Digital / Scrum Master',
      'Product Manager / PO',
      'Expert Cybersécurité',
      'DevOps / Ingénieur Cloud',
      'Marketing Digital / Growth',
      'Consultant Informatique',
    ],
  },
  {
    category: 'Santé, Médical & Bien-être',
    icon: '🩺',
    items: [
      'Médecin Généraliste',
      'Médecin Spécialiste',
      'Chirurgien',
      'Chirurgien-Dentiste',
      'Pharmacien',
      'Infirmier / Infirmière',
      'Kinésithérapeute / Ostéopathe',
      'Psychologue / Psychothérapeute',
      'Sage-Femme',
      'Vétérinaire',
      'Biologiste / Chercheur Médical',
    ],
  },
  {
    category: 'Droit, Finance & Gestion',
    icon: '⚖️',
    items: [
      'Avocat / Avocate',
      'Juriste d’Entreprise',
      'Notaire',
      'Magistrat / Juge',
      'Expert-Comptable',
      'Auditeur Financier',
      'Banquier d’Affaires / Trader',
      'Analyste Financier',
      'Contrôleur de Gestion',
      'Conseiller en Gestion de Patrimoine',
      'Courtier en Assurance / Prêt',
    ],
  },
  {
    category: 'Business, Management & Commerce',
    icon: '💼',
    items: [
      'Chef d’Entreprise / Entrepreneur',
      'Directeur / Cadre Dirigeant',
      'Consultant en Stratégie',
      'Responsable Ressources Humaines (RH)',
      'Business Developer / Commercial',
      'Directeur Marketing / Communication',
      'Directeur des Opérations',
      'Acheteur International',
    ],
  },
  {
    category: 'Ingénierie, Architecture & BTP',
    icon: '🏗️',
    items: [
      'Architecte',
      'Ingénieur BTP / Génie Civil',
      'Ingénieur Aéronautique / Spatial',
      'Ingénieur Énergie & Environnement',
      'Ingénieur Mécanique / Électronique',
      'Conducteur de Travaux',
      'Urbaniste',
      'Géomètre / Topographe',
    ],
  },
  {
    category: 'Enseignement, Recherche & Éducation',
    icon: '🎓',
    items: [
      'Professeur des Écoles',
      'Professeur Collège / Lycée',
      'Enseignant-Chercheur / Universitaire',
      'Chercheur Scientifique',
      'Formateur Professionnel',
      'Éducateur Spécialisé',
    ],
  },
  {
    category: 'Art, Culture, Médias & Création',
    icon: '🎨',
    items: [
      'Journaliste / Rédacteur',
      'Directeur Artistique / Graphiste',
      'Photographe / Vidéaste',
      'Architecte d’Intérieur / Décorateur',
      'Musicien / Compositeur',
      'Acteur / Comédien',
      'Styliste / Mode',
    ],
  },
  {
    category: 'Fonction Publique, Sécurité & Diplomatie',
    icon: '🏛️',
    items: [
      'Haut Fonctionnaire / Diplomate',
      'Fonctionnaire Territorial / État',
      'Officier Militaire',
      'Policier / Gendarme',
      'Pompier / Secours',
      'Pilote de Ligne / Navigation',
    ],
  },
  {
    category: 'Artisanat, Restauration & Hôtellerie',
    icon: '🍽️',
    items: [
      'Chef Cuisinier / Pâtissier',
      'Restaurateur / Hôtelier',
      'Artisan d’Art',
      'Commerçant Indépendant',
      'Manager Événementiel',
    ],
  },
  {
    category: 'Études, Reconversion & Autre',
    icon: '✨',
    items: [
      'Étudiant(e)',
      'En Reconversion Professionnelle',
      'Profession Libérale',
      'Autre Profession',
    ],
  },
];

// Liste aplatie de tous les métiers pour recherche rapide
export const ALL_PROFESSIONS = PROFESSIONS_DATA.flatMap(cat => cat.items);
