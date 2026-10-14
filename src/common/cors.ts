import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Adresses autorisées à appeler les routes /api/admin depuis un navigateur. */
export const DEFAULT_ADMIN_ORIGINS = [
  'https://boligo-admin.onrender.com',
  'http://localhost:3001',
];

/**
 * Adresses autorisées à appeler les autres routes de l'API depuis un
 * navigateur : le site web BOLIGO (Render et domaines boligo.fr) et les
 * serveurs de développement locaux (Expo web 8081 / 19006, Next 3000).
 * Les origines admin y sont ajoutées automatiquement (voir appOrigins).
 */
export const DEFAULT_APP_ORIGINS = [
  'https://boligo-web.onrender.com',
  'https://boligo.fr',
  'https://www.boligo.fr',
  'https://app.boligo.fr',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
];

function parseOrigins(extra?: string): string[] {
  return (extra ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/** Liste des origines admin : celles par défaut, plus ADMIN_ALLOWED_ORIGINS (séparées par des virgules). */
export function adminOrigins(extra?: string): string[] {
  return [...new Set([...DEFAULT_ADMIN_ORIGINS, ...parseOrigins(extra)])];
}

/**
 * Liste des origines de l'application : celles par défaut, les origines admin
 * (le tableau de bord appelle aussi des routes communes), plus CORS_ORIGINS
 * (séparées par des virgules).
 */
export function appOrigins(extra?: string, admin: string[] = []): string[] {
  return [
    ...new Set([...DEFAULT_APP_ORIGINS, ...admin, ...parseOrigins(extra)]),
  ];
}

/**
 * Origine acceptée pour les routes de l'application : une requête SANS en-tête
 * Origin (application mobile native, curl, appel serveur à serveur) n'est pas
 * concernée par CORS et reste servie ; une origine de navigateur doit figurer
 * dans la liste.
 */
export function isAllowedAppOrigin(
  origin: string | undefined,
  allowedApp: string[],
): boolean {
  if (!origin) return true;
  return allowedApp.includes(origin.replace(/\/+$/, ''));
}

/**
 * Réglage CORS d'une requête :
 * - tableau de bord d'administration : accepté uniquement depuis ses adresses
 *   BOLIGO (inchangé) ;
 * - autres routes : liste d'origines autorisées (plus de reflet de n'importe
 *   quelle origine) et SANS credentials, car l'authentification passe par
 *   l'en-tête « Authorization: Bearer », jamais par un cookie.
 */
export function corsOptionsFor(
  url: string | undefined,
  allowedAdmin: string[],
  allowedApp: string[] = appOrigins(undefined, allowedAdmin),
): CorsOptions {
  const isAdmin = /^\/api\/admin(\/|$|\?)/.test(url ?? '');
  if (isAdmin) {
    return { origin: allowedAdmin, credentials: true };
  }
  return {
    origin: (origin, callback) =>
      callback(null, isAllowedAppOrigin(origin, allowedApp)),
    credentials: false,
  };
}

/** Délégué pour app.enableCors : choisit le réglage selon la route appelée. */
export function corsDelegate(allowedAdmin: string[], allowedApp?: string[]) {
  const app = allowedApp ?? appOrigins(undefined, allowedAdmin);
  return (
    req: { url?: string },
    callback: (err: Error | null, options: CorsOptions) => void,
  ) => callback(null, corsOptionsFor(req.url, allowedAdmin, app));
}
