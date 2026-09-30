import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage, STORAGE_KEYS } from './storage';

declare const __DEV__: boolean;

export const PRODUCTION_API_URL = 'https://boligo-back.onrender.com/api';

const isLoopback = (value: string) => /(^|[/@.])(localhost|127\.0\.0\.1)(:|\/|$)/.test(value);

/**
 * Résolution de l'URL de l'API (fonction pure, testée unitairement).
 * 1. EXPO_PUBLIC_API_URL si elle pointe vers un serveur distant — ou, sur le
 *    web, quelle qu'elle soit (le navigateur atteint « localhost »).
 * 2. En développement natif (Expo Go / dev build), l'hôte qui sert le bundle,
 *    port 3000 — pratique pour un backend lancé sur le poste de dev.
 * 3. Sinon le backend de production.
 */
export function resolveApiUrl(opts: { envUrl?: string; hostUri?: string; platform: string }): string {
  const envUrl = opts.envUrl?.trim() || undefined;
  if (envUrl && (opts.platform === 'web' || !isLoopback(envUrl))) {
    return envUrl;
  }

  if (opts.platform !== 'web' && opts.hostUri) {
    // hostUri peut être « 192.168.1.10:8081 », « exp://192.168.1.10:8081 » ou
    // « http://localhost:8081 » : on ne garde que le nom d'hôte.
    const host = opts.hostUri.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split('/')[0].split(':')[0];
    if (host && !isLoopback(host)) {
      return `http://${host}:3000/api`;
    }
  }

  return envUrl || PRODUCTION_API_URL;
}

export const API_URL = resolveApiUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri || (Constants as any).experienceUrl,
  platform: Platform.OS,
});
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const debug = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

debug('🎯 [API Config] URL API résolue :', API_URL);

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

/** Erreur axios enrichie d'un message lisible par l'utilisateur. */
export type ApiError = AxiosError<{ message?: string | string[]; error?: string; statusCode?: number }> & {
  readableMessage?: string;
};

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let failedQueue: { resolve: (token: string | null) => void; reject: (reason?: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

const setAuthHeader = (headers: any, token: string) => {
  if (!headers) return;
  if (typeof headers.set === 'function') headers.set('Authorization', `Bearer ${token}`);
  else headers['Authorization'] = `Bearer ${token}`;
};

const AUTH_ROUTES_WITHOUT_REFRESH = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/verify-email'];

client.interceptors.request.use(
  async (config) => {
    debug('📤 [API]', config.method?.toUpperCase(), (config.baseURL || '') + (config.url || ''));
    const token = await storage.getItem(STORAGE_KEYS.accessToken);
    if (token) setAuthHeader(config.headers, token);
    return config;
  },
  (error) => Promise.reject(error),
);

/** Traduit une réponse d'erreur backend en message compréhensible. */
export const extractErrorMessage = (data: any, defaultMsg: string): string => {
  if (!data) return defaultMsg;
  let rawMsg = '';
  if (typeof data.message === 'string') rawMsg = data.message;
  else if (Array.isArray(data.message)) rawMsg = data.message.join('\n');
  else if (typeof data.error === 'string') rawMsg = data.error;
  else rawMsg = defaultMsg;

  const lower = rawMsg.toLowerCase();
  if (lower.includes('invalid credentials') || lower.includes('unauthorized') || lower.includes('bad credentials')) {
    return 'Adresse e-mail ou mot de passe incorrect. Veuillez vérifier vos identifiants.';
  }
  if (lower.includes('already exists') || lower.includes('unique constraint')) {
    return 'Un compte existe déjà avec cette adresse e-mail ou ce numéro.';
  }
  if (lower.includes('user not found')) {
    return 'Aucun compte associé à cette adresse e-mail.';
  }
  return rawMsg;
};

/** Message utilisateur pour n'importe quelle erreur (réseau, timeout, HTTP). */
export function getReadableError(error: unknown, fallback = 'Une erreur est survenue.'): string {
  const err = error as ApiError;
  if (err?.readableMessage) return err.readableMessage;
  if (err?.response?.data) return extractErrorMessage(err.response.data, fallback);
  if (err?.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre. Veuillez réessayer.';
  if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK') {
    return 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
  }
  return err?.message || fallback;
}

client.interceptors.response.use(
  (response) => {
    debug('✅ [API]', response.status, response.config.url);
    return response;
  },
  async (error: ApiError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (!error.readableMessage) {
      if (!error.response) {
        error.readableMessage =
          error.code === 'ECONNABORTED'
            ? 'Le serveur met trop de temps à répondre. Veuillez réessayer.'
            : 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
      } else if (error.response.status === 429) {
        error.readableMessage = 'Trop de requêtes. Patientez quelques secondes puis réessayez.';
      } else if (error.response.status >= 500) {
        error.readableMessage = 'Le serveur rencontre un problème. Veuillez réessayer dans un instant.';
      } else {
        error.readableMessage = extractErrorMessage(error.response.data, error.message || 'Une erreur de connexion est survenue.');
      }
    }

    if (error.response) {
      const status = error.response.status;
      const url = originalRequest?.url || '';
      const isRefreshable401 =
        status === 401 && !!originalRequest && !originalRequest._retry && !AUTH_ROUTES_WITHOUT_REFRESH.includes(url);

      if (isRefreshable401) {
        if (isRefreshing) {
          return new Promise<string | null>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            if (token) setAuthHeader(originalRequest.headers, token);
            return client(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await storage.getItem(STORAGE_KEYS.refreshToken);
          if (!refreshToken) throw new Error('Aucun token de rafraîchissement disponible');

          const { AuthService } = require('./auth');
          const result = await AuthService.refresh(refreshToken);
          const newToken: string = result.access_token;

          await storage.setItem(STORAGE_KEYS.accessToken, newToken);
          if (result.refresh_token) await storage.setItem(STORAGE_KEYS.refreshToken, result.refresh_token);

          setAuthHeader(client.defaults.headers.common, newToken);
          setAuthHeader(originalRequest.headers, newToken);
          processQueue(null, newToken);
          debug('🔄 [API] Session rafraîchie');
          return client(originalRequest);
        } catch (err) {
          processQueue(err, null);
          debug('🔐 [API] Rafraîchissement impossible : déconnexion.');
          try {
            await storage.clearSession();
            const { triggerGlobalSignOut } = require('../context/auth');
            await triggerGlobalSignOut();
          } catch (e) {
            debug('❌ [API] Erreur lors de la déconnexion forcée :', e);
          }
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      debug('❌ [API]', status, url, error.response.data);
    } else {
      debug('🌐 [API] Erreur réseau', error.code, (error.config?.baseURL || '') + (error.config?.url || ''));
    }

    return Promise.reject(error);
  },
);

export default client;
