import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Adresses autorisées à appeler les routes /api/admin depuis un navigateur. */
export const DEFAULT_ADMIN_ORIGINS = [
  'https://boligo-admin.onrender.com',
  'http://localhost:3001',
];

/** Liste des origines admin : celles par défaut, plus ADMIN_ALLOWED_ORIGINS (séparées par des virgules). */
export function adminOrigins(extra?: string): string[] {
  const added = (extra ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return [...new Set([...DEFAULT_ADMIN_ORIGINS, ...added])];
}

/**
 * Réglage CORS d'une requête : l'application et le site restent ouverts à
 * toutes les origines, mais le tableau de bord d'administration n'est accepté
 * que depuis ses adresses BOLIGO. Une copie du tableau de bord hébergée
 * ailleurs ne peut donc plus appeler l'API depuis un navigateur.
 */
export function corsOptionsFor(
  url: string | undefined,
  allowedAdmin: string[],
): CorsOptions {
  const isAdmin = /^\/api\/admin(\/|$|\?)/.test(url ?? '');
  return {
    origin: isAdmin ? allowedAdmin : true,
    credentials: true,
  };
}

/** Délégué pour app.enableCors : choisit le réglage selon la route appelée. */
export function corsDelegate(allowedAdmin: string[]) {
  return (
    req: { url?: string },
    callback: (err: Error | null, options: CorsOptions) => void,
  ) => callback(null, corsOptionsFor(req.url, allowedAdmin));
}
