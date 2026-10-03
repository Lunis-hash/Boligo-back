import client from './api';

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  assistance?: string;
  dependsOn?: {
    questionId: string;
    answerKey: string;
  };
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

  getQuestions: async (moduleNumber: number, retries = 2): Promise<Question[]> => {
    try {
      const response = await client.get<Question[]>(`/interview/questions/${moduleNumber}`);
      return response.data;
    } catch (error: any) {
      if (retries > 0) {
        await new Promise((res) => setTimeout(res, 1000));
        return InterviewService.getQuestions(moduleNumber, retries - 1);
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
