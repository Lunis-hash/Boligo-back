// Types globaux pour HARMONIE

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Match {
  id: string;
  userId: string;
  compatibilityScore: number;
  status: 'pending' | 'active' | 'completed' | 'ghosted';
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

/**
 * Carte technique / profil Harmonie
 * Construite à partir des réponses de l'entretien IA.
 */

export type Importance = 0 | 1 | 2; // 0 = souple, 1 = important, 2 = non-négociable

export interface HarmonieProfile {
  // Module 0 — Filtres non-négociables
  genderPreference: string;
  agePreference: 'meme_gen' | 'plus_jeune' | 'plus_age' | 'no_filter';
  mobility: 'pas_pret' | 'peut_bouger' | 'ok_total';

  // Module 1 — Identité & Culture
  cultureContinent?: string;
  religion?: string;
  religionImportance: Importance;
  openToCulturalDiff: Importance;

  // Module 2 — Attachement & Régulation émotionnelle
  attachmentStyle?: string;
  emotionalSecurityNeed?: Importance;

  // Module 3 — Vécu & Contexte
  mainLesson?: string;
  hasChildren: boolean;
  recomposedFamilyOK: Importance;
  violenceHistoryFlag: boolean;

  // Module 4 — Vision économique
  moneyModel: 'commun' | 'proportionnel' | 'separe' | 'autre';
  whoPaysBills: 'homme' | 'egal' | 'autre';
  savingStyle: 'ensemble' | 'separe' | 'mixte' | 'aucune';

  // Module 5 — Dynamique sociale & familiale
  familyCentrality: Importance;
  inLawsCohabitationOK: Importance;
  familyApprovalImportance: Importance;

  // Module 6 — Quotidien, Communication réelle & Limites
  alcoholTolerance: Importance;
  smokingTolerance: Importance;
  violenceTolerance: Importance; // doit être 0 (= refus) sinon drapeau rouge

  // Module 7 — Trajectoire de vie & Personnalité
  ambitionLevel?: 'eleve' | 'modere' | 'faible' | 'accompli';
  socialEnergy?: 'introverti' | 'ambiverti' | 'extraverti';

  // Module 8 — Projet de couple
  commitmentGoal: 'mariage' | 'relation_serieuse' | 'exploration';
  loveLanguages: string[];
  breakingPoints: string[]; // ex: infidélité, religion, enfants

  // Module 9 — Pouvoir, Effort & Capacité à aimer
  decisionStyle?: string;
  effortPhilosophy?: string;

  // Module 10 — Alchimie, Vibe & Désir
  vibeEnergy?: string;
  uniqueContribution?: string;
}

