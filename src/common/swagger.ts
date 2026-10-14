/**
 * Documentation Swagger (/docs) : montée hors production, ou en production
 * uniquement si SWAGGER_PUBLIC=true est explicitement défini.
 */
export function swaggerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SWAGGER_PUBLIC?.trim().toLowerCase() === 'true') return true;
  return env.NODE_ENV !== 'production';
}
