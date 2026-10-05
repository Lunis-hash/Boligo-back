import client from './api';
import { getItem, setItem } from './storage';

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  assistance?: string;
  /** Plusieurs réponses possibles (langues) : envoyées « A,B ». */
  multiple?: boolean;
  /** Échelle d'accord ou de fréquence (5 points). */
  scale?: 'accord' | 'frequence';
}

/** Langue dans laquelle le membre passe le Grand Entretien. */
export type InterviewLanguage = 'fr' | 'en';

const LANGUAGE_KEY = 'interviewLanguage';

/** Langue de l'appareil : l'anglais si le système est en anglais, sinon le français. */
export function deviceLanguage(): InterviewLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return locale.toLowerCase().startsWith('en') ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export async function getInterviewLanguage(): Promise<InterviewLanguage> {
  const saved = await getItem(LANGUAGE_KEY);
  return saved === 'en' || saved === 'fr' ? saved : deviceLanguage();
}

export async function setInterviewLanguage(lang: InterviewLanguage): Promise<void> {
  await setItem(LANGUAGE_KEY, lang);
}

/** Réponses cochées d'une question à choix multiple, dans l'ordre des options. */
export function joinMultipleAnswer(question: Question, keys: string[]): { key: string; text: string } {
  const picked = question.options.filter((o) => keys.includes(o.key));
  return { key: picked.map((o) => o.key).join(','), text: picked.map((o) => o.text).join(', ') };
}

/** « Votre profil relationnel » (bilan) : lecture des échelles du Grand Entretien. */
export interface RelationalProfile {
  attachment: { style: string; title: string; text: string } | null;
  regulation: { title: string; text: string } | null;
  conflict: { title: string; text: string } | null;
  personality: { trait: string; label: string; value: number }[];
  observations: string[];
  disclaimer: string;
}

export interface InterviewStatus {
  status?: string; // 'none', 'en_cours', 'termine'
  interviewId?: string;
  currentModule: number;
  isCompleted: boolean;
  completedModules?: number[];
}

export const LAST_MODULE = 10;

/**
 * Module à afficher pour reprendre l'entretien : le premier module non
 * terminé. Le backend ne compte un module comme terminé que s'il ne reste
 * aucune question applicable (la réponse M0_Q02 enregistrée à l'inscription
 * ne termine donc pas le module 0).
 */
export function getResumeModule(status: Partial<InterviewStatus> | null | undefined): number {
  if (!status || status.isCompleted) return LAST_MODULE + 1;
  const current = typeof status.currentModule === 'number' ? status.currentModule : 0;
  if (!Array.isArray(status.completedModules)) {
    return Math.min(Math.max(current, 0), LAST_MODULE);
  }
  const completed = new Set(status.completedModules);
  for (let m = 0; m <= LAST_MODULE; m++) {
    if (!completed.has(m)) return m;
  }
  return Math.min(Math.max(current, 0), LAST_MODULE);
}

export const InterviewService = {
  getStatus: async () => {
    const response = await client.get<InterviewStatus>('/interview/status');
    return response.data;
  },

  getQuestions: async (moduleNumber: number, lang: InterviewLanguage = 'fr', retries = 2): Promise<Question[]> => {
    try {
      const response = await client.get<Question[]>(`/interview/questions/${moduleNumber}`, {
        params: { lang },
      });
      return response.data;
    } catch (error: any) {
      if (retries > 0) {
        await new Promise((res) => setTimeout(res, 1000));
        return InterviewService.getQuestions(moduleNumber, lang, retries - 1);
      }
      throw error;
    }
  },

  saveModule: async (moduleNumber: number, answers: Record<string, string>, retries = 2): Promise<any> => {
    // Module names mapping (Modules 0 à 10)
    const moduleNames = [
      'Filtres non-négociables',
      'Identité & Culture',
      'Attachement & Régulation émotionnelle',
      'Vécu & Contexte',
      'Vision économique',
      'Dynamique sociale & familiale',
      'Quotidien, Communication réelle & Limites',
      'Trajectoire de vie & Personnalité',
      'Projet de couple',
      'Pouvoir, Effort & Capacité à aimer',
      'Alchimie, Vibe & Désir',
    ];

    try {
      const response = await client.post('/interview/save-module', {
        moduleNumber,
        moduleName: moduleNames[moduleNumber] || `Module ${moduleNumber}`,
        answers,
      });
      return response.data;
    } catch (error: any) {
      if (retries > 0) {
        console.warn(`⚠️ [InterviewService] Retry ${3 - retries} for saveModule ${moduleNumber}...`);
        await new Promise((res) => setTimeout(res, 1200));
        return InterviewService.saveModule(moduleNumber, answers, retries - 1);
      }
      throw error;
    }
  },

  completeInterview: async () => {
    // Filet de sécurité : si le module 10 n'a pas été enregistré (ancienne
    // version de l'app), un enregistrement vide déclenche la complétion côté
    // backend. Les réponses déjà présentes sont conservées (fusion serveur).
    const moduleNames = [
      'Filtres non-négociables',
      'Identité & Culture',
      'Attachement & Régulation émotionnelle',
      'Vécu & Contexte',
      'Vision économique',
      'Dynamique sociale & familiale',
      'Quotidien, Communication réelle & Limites',
      'Trajectoire de vie & Personnalité',
      'Projet de couple',
      'Pouvoir, Effort & Capacité à aimer',
      'Alchimie, Vibe & Désir',
    ];

    const response = await client.post('/interview/save-module', {
      moduleNumber: 10,
      moduleName: moduleNames[10],
      answers: {},
    });
    return response.data;
  },

  getSummary: async () => {
    const response = await client.get('/interview/summary');
    return response.data;
  },
};
