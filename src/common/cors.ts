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

/* ------------------------------------------------------------------------ */
/* WebSocket (socket.io) : même liste d'origines que les routes HTTP.        */
/* ------------------------------------------------------------------------ */

/** Hôte (nom[:port], en minuscules) d'une origine, ou undefined si illisible. */
function originHost(origin: string): string | undefined {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return undefined;
  }
}

/**
 * Origine acceptée pour une connexion WebSocket de la messagerie :
 * - sans en-tête Origin (client natif, serveur à serveur) : acceptée ;
 * - origine de la liste de l'application (site BOLIGO, dev local, CORS_ORIGINS) ;
 * - origine égale à l'hôte de l'API elle-même : les WebSocket React Native
 *   (iOS et Android) envoient « Origin: https://<serveur appelé> », ce n'est
 *   pas un site tiers ;
 * - toute autre origine de navigateur (site tiers) : refusée.
 */
export function isAllowedSocketOrigin(
  origin: string | undefined,
  host: string | undefined,
  allowedApp: string[],
): boolean {
  if (!origin) return true;
  if (isAllowedAppOrigin(origin, allowedApp)) return true;
  const fromHost = originHost(origin);
  return !!fromHost && !!host && fromHost === host.trim().toLowerCase();
}

/** Liste des origines de l'application, relue dans l'environnement (comme main.ts). */
export function socketAllowedOrigins(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return appOrigins(env.CORS_ORIGINS, adminOrigins(env.ADMIN_ALLOWED_ORIGINS));
}

type SocketRequest = {
  headers: { origin?: string; host?: string };
};

/**
 * Contrôle socket.io « allowRequest » : appliqué à la poignée de main, y compris
 * en transport WebSocket pur (où le navigateur n'applique aucun CORS). Une
 * origine refusée reçoit 403.
 */
export function socketAllowRequest(
  getAllowed: () => string[] = () => socketAllowedOrigins(),
) {
  return (
    req: SocketRequest,
    callback: (err: string | null | undefined, success: boolean) => void,
  ) => {
    const ok = isAllowedSocketOrigin(
      req.headers.origin,
      req.headers.host,
      getAllowed(),
    );
    callback(ok ? null : 'Origine non autorisée', ok);
  };
}

/** Réglage CORS socket.io (transport polling) : même liste, sans credentials. */
export function socketCorsOptions(
  getAllowed: () => string[] = () => socketAllowedOrigins(),
): CorsOptions {
  return {
    origin: (origin, callback) =>
      callback(null, isAllowedAppOrigin(origin, getAllowed())),
    credentials: false,
  };
}
