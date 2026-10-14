/**
 * Prévisualisation de RECETTE (RECETTE_PREVIEW=1) : un seul service Render
 * gratuit sert l'API (/api), la webapp (/), l'espace partenaire
 * (/espace-partenaire, route de la webapp) et l'admin (/admin), sur la même
 * origine, derrière une authentification HTTP Basic.
 *
 * Garde-fous (crash explicite au démarrage) :
 * - jamais sur Supabase (la base de production BOLIGO) ;
 * - jamais avec une clé Stripe LIVE ;
 * - RECETTE_BASIC_AUTH obligatoire (« utilisateur:motdepasse »).
 * Hors de ce mode, rien ne change.
 */
import { existsSync, statSync } from 'fs';
import { join, normalize, resolve, sep } from 'path';
import { createHmac, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const isPreview = (env: NodeJS.ProcessEnv = process.env) =>
  env.RECETTE_PREVIEW === '1';

/** Base de production BOLIGO (Supabase) : jamais utilisée par la prévisualisation. */
export const isSupabaseUrl = (url: string | undefined) =>
  /supabase\.co|pooler\.supabase|supabase\.com/i.test(url ?? '');

/** Problèmes bloquants de configuration de la prévisualisation (vide si tout va bien). */
export function previewConfigProblems(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const problems: string[] = [];
  for (const k of ['DATABASE_URL', 'DIRECT_URL']) {
    if (isSupabaseUrl(env[k]))
      problems.push(`${k} vise Supabase (base de production) : refusé.`);
  }
  if (!env.DATABASE_URL) problems.push('DATABASE_URL absente.');
  for (const k of [
    'STRIPE_SECRET_KEY',
    'STRIPE_TEST_SECRET_KEY',
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ]) {
    if (/^(sk|rk|pk)_live_/.test(env[k]?.trim() ?? ''))
      problems.push(
        `${k} est une clé Stripe LIVE : refusée (mode TEST seulement).`,
      );
  }
  if (!parseBasicAuth(env.RECETTE_BASIC_AUTH))
    problems.push(
      'RECETTE_BASIC_AUTH absente ou invalide (format « utilisateur:motdepasse », mot de passe de 8 caractères au moins).',
    );
  return problems;
}

/** Arrêt immédiat si la prévisualisation est mal configurée. */
export function assertPreviewSafe(env: NodeJS.ProcessEnv = process.env): void {
  if (!isPreview(env)) return;
  const problems = previewConfigProblems(env);
  if (problems.length) {
    throw new Error(
      `[PRÉVISUALISATION] Démarrage refusé :\n - ${problems.join('\n - ')}`,
    );
  }
}

export function parseBasicAuth(
  raw: string | undefined,
): { user: string; pass: string } | null {
  const v = raw?.trim() ?? '';
  const i = v.indexOf(':');
  if (i < 1) return null;
  const user = v.slice(0, i);
  const pass = v.slice(i + 1);
  return pass.length >= 8 ? { user, pass } : null;
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Chemins ouverts sans mot de passe : sonde de santé de Render et webhook Stripe (signé). */
export const isPublicPath = (path: string) =>
  path === '/api/health' || path === '/api/payment/webhook';

/** Requête autorisée par l'authentification HTTP Basic ? */
export function basicAuthOk(
  header: string | undefined,
  expected: { user: string; pass: string },
): boolean {
  const m = /^Basic\s+(.+)$/i.exec(header ?? '');
  if (!m) return false;
  const decoded = Buffer.from(m[1], 'base64').toString('utf8');
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  return (
    same(decoded.slice(0, i), expected.user) &&
    same(decoded.slice(i + 1), expected.pass)
  );
}

/** Cookie posé après une authentification HTTP réussie (voir previewGuard). */
export const PREVIEW_COOKIE = 'boligo_recette';

/** Valeur du cookie : empreinte du mot de passe HTTP (change avec lui). */
export function previewCookieValue(raw: string | undefined): string {
  return createHmac('sha256', raw ?? '')
    .update('boligo-recette-preview')
    .digest('base64url');
}

function cookieOf(header: string | undefined, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name)
      return part.slice(i + 1).trim();
  }
  return null;
}

/**
 * Mot de passe HTTP sur tout le site (sauf santé et webhook), jamais indexé.
 * Après une authentification HTTP réussie, un cookie HttpOnly autorise les
 * requêtes suivantes : l'application envoie son propre en-tête
 * « Authorization: Bearer » (jeton du membre), qui remplace celui du
 * navigateur pour les appels à l'API.
 */
export function previewGuard(env: NodeJS.ProcessEnv = process.env) {
  const expected = parseBasicAuth(env.RECETTE_BASIC_AUTH);
  const cookie = previewCookieValue(env.RECETTE_BASIC_AUTH);
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (isPublicPath(req.path)) return next();
    // Pré-requêtes CORS du navigateur : jamais d'identifiants.
    if (req.method === 'OPTIONS') return next();
    const got = cookieOf(req.headers.cookie, PREVIEW_COOKIE);
    if (expected && got && same(got, cookie)) return next();
    if (expected && basicAuthOk(req.headers.authorization, expected)) {
      res.setHeader(
        'Set-Cookie',
        `${PREVIEW_COOKIE}=${cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${req.secure ? '; Secure' : ''}`,
      );
      return next();
    }
    res.setHeader(
      'WWW-Authenticate',
      'Basic realm="BOLIGO recette", charset="UTF-8"',
    );
    res.status(401).send('Accès réservé à la recette BOLIGO.');
  };
}

/** Fichier statique sûr (pas de sortie du dossier) ou null. */
function staticFile(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const target = resolve(root, '.' + normalize(decoded));
  if (target !== root && !target.startsWith(root + sep)) return null;
  for (const candidate of [target, join(target, 'index.html')]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      /* absent : candidat suivant */
    }
  }
  return null;
}

const ROUTED_BY_API = /^\/(api|docs|socket\.io)(\/|$)/;

/**
 * Webapp (export Expo, application monopage) à la racine et admin (export
 * Next, basePath /admin) sous /admin. Les routes de l'API ne sont jamais
 * interceptées.
 */
export function previewStatic(webDir: string, adminDir: string) {
  const web = resolve(webDir);
  const admin = resolve(adminDir);
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (ROUTED_BY_API.test(req.path)) return next();
    if (req.path === '/admin' || req.path.startsWith('/admin/')) {
      const rel = req.path.slice('/admin'.length) || '/';
      const file =
        staticFile(admin, rel) ?? staticFile(admin, '/404.html') ?? null;
      if (!file) return next();
      if (file.endsWith('404.html') && !rel.endsWith('404.html'))
        res.status(404);
      return res.sendFile(file);
    }
    const file = staticFile(web, req.path);
    if (file) return res.sendFile(file);
    // Route de l'application (espace partenaire, entretien…) : page unique.
    const index = join(web, 'index.html');
    if (existsSync(index)) return res.sendFile(index);
    return next();
  };
}
