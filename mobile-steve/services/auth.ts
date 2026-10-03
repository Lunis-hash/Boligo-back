import client from './api';

export interface RegisterData {
  email: string;
  password?: string;
  firstName: string;
  lastName?: string;
  /** Date de naissance au format AAAA-MM-JJ. */
  birthDate: string;
  gender: 'H' | 'F';
  city?: string;
  telephone?: string;
  job?: string;
  profession?: string;
  /** Périmètre de rencontre choisi à l'onboarding (local | national | international). */
  meetingScope?: 'local' | 'national' | 'international';
  /** Acceptation expresse des CGU et de la politique de confidentialité (exigée par le serveur). */
  acceptTerms: true;
  /** Version des textes légaux acceptée (champ « version » de constants/legal.json). */
  termsVersion?: string;
}

export const AuthService = {
  register: async (data: RegisterData) => {
    const response = await client.post('/auth/register', data);
    return response.data;
  },

  login: async (email: string, password?: string) => {
    const response = await client.post('/auth/login', { email, password });
    return response.data;
  },

  refresh: async (refreshToken: string) => {
    // L'intercepteur ignore volontairement /auth/refresh : pas de boucle.
    const response = await client.post('/auth/refresh', { refreshToken });
    return response.data;
  },


  forgotPassword: async (email: string) => {
    const response = await client.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email: string, code: string, newPassword?: string) => {
    const response = await client.post('/auth/reset-password', { email, code, newPassword });
    return response.data;
  },

  verifyEmail: async (email: string, code: string) => {
    const response = await client.post('/auth/verify-email', { email, code });
    return response.data;
  },

  resendVerification: async (email: string) => {
    const response = await client.post('/auth/resend-verification', { email });
    return response.data;
  },
};
