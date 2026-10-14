import express from 'express';
import cors from 'cors';
import request from 'supertest';
import {
  adminOrigins,
  appOrigins,
  corsDelegate,
  corsOptionsFor,
  DEFAULT_ADMIN_ORIGINS,
  DEFAULT_APP_ORIGINS,
  isAllowedAppOrigin,
} from './cors';

/** Exécute la fonction origin d'un réglage CORS et renvoie sa décision. */
function decide(
  options: ReturnType<typeof corsOptionsFor>,
  origin: string | undefined,
): unknown {
  const fn = options.origin as (
    o: string | undefined,
    cb: (err: Error | null, allow?: unknown) => void,
  ) => void;
  let decision: unknown;
  fn(origin, (_err, allow) => (decision = allow));
  return decision;
}

describe('CORS', () => {
  const allowed = adminOrigins();
  const app = appOrigins(undefined, allowed);

  it('accepte le site BOLIGO et les origines de développement locales', () => {
    for (const origin of [
      'https://boligo-web.onrender.com',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:3000',
    ]) {
      expect(
        decide(corsOptionsFor('/api/auth/login', allowed, app), origin),
      ).toBe(true);
    }
  });

  it('refuse une origine inconnue sur les routes de l’application', () => {
    for (const url of ['/api/auth/login', '/api/matching/discover?page=1']) {
      expect(
        decide(corsOptionsFor(url, allowed, app), 'https://evil.example'),
      ).toBe(false);
    }
    expect(decide(corsOptionsFor('/api/users/me', allowed, app), 'null')).toBe(
      false,
    );
  });

  it('laisse passer les requêtes sans Origin (application native, curl, serveur)', () => {
    expect(
      decide(corsOptionsFor('/api/auth/login', allowed, app), undefined),
    ).toBe(true);
    expect(isAllowedAppOrigin(undefined, app)).toBe(true);
  });

  it('ne renvoie plus de credentials sur les routes de l’application (jeton Bearer)', () => {
    expect(corsOptionsFor('/api/auth/login', allowed, app).credentials).toBe(
      false,
    );
    expect(corsOptionsFor(undefined, allowed, app).origin).not.toBe(true);
  });

  it('accepte les origines admin sur les routes communes', () => {
    expect(
      decide(
        corsOptionsFor('/api/auth/login', allowed, app),
        'https://boligo-admin.onrender.com',
      ),
    ).toBe(true);
  });

  it('ajoute les origines de CORS_ORIGINS, sans doublon ni barre finale', () => {
    const list = appOrigins(
      ' https://web.exemple.fr/ ,http://localhost:8081',
      [],
    );
    expect(list).toEqual([...DEFAULT_APP_ORIGINS, 'https://web.exemple.fr']);
    expect(
      decide(corsOptionsFor('/api/x', allowed, list), 'https://web.exemple.fr'),
    ).toBe(true);
  });

  it('limite le tableau de bord admin à ses adresses BOLIGO (inchangé)', () => {
    for (const url of [
      '/api/admin/auth/login',
      '/api/admin/users?page=2',
      '/api/admin',
    ]) {
      const opts = corsOptionsFor(url, allowed, app);
      expect(opts.origin).toEqual(allowed);
      expect(opts.credentials).toBe(true);
    }
    expect(allowed).toContain('https://boligo-admin.onrender.com');
    expect(allowed).not.toContain('https://boligo-admin.vercel.app');
  });

  it('ne confond pas une route voisine avec l’admin', () => {
    const opts = corsOptionsFor('/api/administration', allowed, app);
    expect(typeof opts.origin).toBe('function');
    expect(decide(opts, 'https://evil.example')).toBe(false);
  });

  it('ajoute les origines de ADMIN_ALLOWED_ORIGINS, sans doublon ni barre finale', () => {
    const list = adminOrigins(
      ' https://admin.exemple.fr/ ,http://localhost:3001',
    );
    expect(list).toEqual([
      ...DEFAULT_ADMIN_ORIGINS,
      'https://admin.exemple.fr',
    ]);
  });
});

describe('CORS : en-têtes réels (middleware cors + express)', () => {
  const allowed = adminOrigins();
  const server = express();
  server.use(
    cors(corsDelegate(allowed) as unknown as Parameters<typeof cors>[0]),
  );
  server.get('/api/ping', (_req, res) => res.json({ ok: true }));
  server.get('/api/admin/ping', (_req, res) => res.json({ ok: true }));

  it('ne reflète plus une origine inconnue et n’envoie pas allow-credentials', async () => {
    const res = await request(server)
      .get('/api/ping')
      .set('Origin', 'https://evil.example');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('autorise le site BOLIGO', async () => {
    const res = await request(server)
      .get('/api/ping')
      .set('Origin', 'https://boligo-web.onrender.com');
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://boligo-web.onrender.com',
    );
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('sert une requête sans Origin (application native)', async () => {
    const res = await request(server).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('admin : origine BOLIGO acceptée avec credentials, origine inconnue refusée', async () => {
    const ok = await request(server)
      .get('/api/admin/ping')
      .set('Origin', 'https://boligo-admin.onrender.com');
    expect(ok.headers['access-control-allow-origin']).toBe(
      'https://boligo-admin.onrender.com',
    );
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const ko = await request(server)
      .get('/api/admin/ping')
      .set('Origin', 'https://evil.example');
    expect(ko.headers['access-control-allow-origin']).toBeUndefined();
  });
});
