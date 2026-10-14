import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  assertPreviewSafe,
  basicAuthOk,
  isPublicPath,
  parseBasicAuth,
  previewConfigProblems,
  previewGuard,
  previewStatic,
} from './preview';
import { isRecetteAddress } from './email.service';

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const OK = {
  RECETTE_PREVIEW: '1',
  DATABASE_URL: 'postgresql://u:p@dpg-abc-a/boligo_recette',
  RECETTE_BASIC_AUTH: 'steve:mot-de-passe-long',
};

interface FakeRes {
  headers: Record<string, string>;
  statusCode: number;
  body?: string;
  file?: string;
  setHeader(k: string, v: string): void;
  status(c: number): FakeRes;
  send(b: string): FakeRes;
  sendFile(f: string): FakeRes;
}
function fakeRes(): FakeRes {
  const res: FakeRes = {
    headers: {},
    statusCode: 200,
    setHeader: (k, v) => {
      res.headers[k] = v;
    },
    status: (c) => {
      res.statusCode = c;
      return res;
    },
    send: (b) => {
      res.body = b;
      return res;
    },
    sendFile: (f) => {
      res.file = f;
      return res;
    },
  };
  return res;
}
type Mw = (req: unknown, res: unknown, next: () => void) => void;
const basic = (u: string, p: string) =>
  `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;

describe('Prévisualisation de recette : garde-fous', () => {
  it('configuration valide : aucun problème', () => {
    expect(previewConfigProblems(env(OK))).toEqual([]);
  });

  it('Supabase refusé (base de production)', () => {
    const p = previewConfigProblems(
      env({
        ...OK,
        DATABASE_URL:
          'postgresql://postgres.ref:pw@aws-0-eu-west-3.pooler.supabase.com:6543/postgres',
      }),
    );
    expect(p.join(' ')).toMatch(/Supabase/);
    expect(() =>
      assertPreviewSafe(
        env({ ...OK, DIRECT_URL: 'postgresql://u:p@db.x.supabase.co:5432/p' }),
      ),
    ).toThrow(/Démarrage refusé/);
  });

  it('clé Stripe LIVE refusée, clé TEST acceptée', () => {
    expect(
      previewConfigProblems(
        env({ ...OK, STRIPE_SECRET_KEY: 'sk_live_x' }),
      ).join(' '),
    ).toMatch(/LIVE/);
    expect(
      previewConfigProblems(
        env({ ...OK, EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_x' }),
      ).join(' '),
    ).toMatch(/LIVE/);
    expect(
      previewConfigProblems(env({ ...OK, STRIPE_SECRET_KEY: 'sk_test_x' })),
    ).toEqual([]);
  });

  it('mot de passe HTTP obligatoire et assez long', () => {
    expect(parseBasicAuth('steve:court')).toBeNull();
    expect(parseBasicAuth('sansdeuxpoints')).toBeNull();
    expect(parseBasicAuth('steve:a:b:cdefgh')).toEqual({
      user: 'steve',
      pass: 'a:b:cdefgh',
    });
    expect(
      previewConfigProblems(env({ ...OK, RECETTE_BASIC_AUTH: '' })).join(' '),
    ).toMatch(/RECETTE_BASIC_AUTH/);
  });

  it('hors prévisualisation : rien n’est vérifié ni bloqué', () => {
    expect(() =>
      assertPreviewSafe(env({ STRIPE_SECRET_KEY: 'sk_live_x' })),
    ).not.toThrow();
  });

  it('e-mails : seules les adresses fictives de recette peuvent partir', () => {
    expect(isRecetteAddress('emma.entretien@recette.boligo.test')).toBe(true);
    expect(isRecetteAddress('membre@boligo-demo.example')).toBe(true);
    expect(isRecetteAddress('stevebandama@gmail.com')).toBe(false);
    expect(isRecetteAddress('x@recette.boligo.test.evil.com')).toBe(false);
  });
});

describe('Prévisualisation de recette : mot de passe HTTP et noindex', () => {
  const guard = previewGuard(env(OK)) as unknown as Mw;
  const call = (path: string, auth?: string, method = 'GET') => {
    const res = fakeRes();
    let passed = false;
    guard(
      { path, method, headers: auth ? { authorization: auth } : {} },
      res,
      () => (passed = true),
    );
    return { res, passed };
  };

  it('sans mot de passe : 401 et invite du navigateur', () => {
    const { res, passed } = call('/');
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.headers['WWW-Authenticate']).toMatch(/Basic/);
    expect(res.headers['X-Robots-Tag']).toMatch(/noindex/);
  });

  it('mauvais mot de passe refusé, bon mot de passe accepté', () => {
    expect(call('/admin/', basic('steve', 'faux-mot-de-passe')).passed).toBe(
      false,
    );
    expect(
      call('/api/auth/login', basic('steve', 'mot-de-passe-long')).passed,
    ).toBe(true);
  });

  it('santé et webhook Stripe ouverts (sans mot de passe), toujours noindex', () => {
    expect(isPublicPath('/api/health')).toBe(true);
    const { res, passed } = call('/api/payment/webhook', undefined, 'POST');
    expect(passed).toBe(true);
    expect(res.headers['X-Robots-Tag']).toMatch(/noindex/);
    expect(call('/api/healthz').passed).toBe(false);
  });

  it('cookie posé après le mot de passe : les appels avec jeton Bearer passent', () => {
    const ok = call('/', basic('steve', 'mot-de-passe-long'));
    const setCookie = ok.res.headers['Set-Cookie'];
    expect(setCookie).toMatch(
      /^boligo_recette=[^;]+; Path=\/; HttpOnly; SameSite=Lax/,
    );
    const value = setCookie.split(';')[0];
    const res = fakeRes();
    let passed = false;
    guard(
      {
        path: '/api/interview/status',
        method: 'GET',
        headers: {
          authorization: 'Bearer jeton-du-membre',
          cookie: `autre=1; ${value}`,
        },
      },
      res,
      () => (passed = true),
    );
    expect(passed).toBe(true);
    // Cookie forgé ou mot de passe changé : refusé.
    const forged = fakeRes();
    let p2 = false;
    guard(
      {
        path: '/api/x',
        method: 'GET',
        headers: { cookie: 'boligo_recette=faux' },
      },
      forged,
      () => (p2 = true),
    );
    expect(p2).toBe(false);
    expect(forged.statusCode).toBe(401);
  });

  it('basicAuthOk : en-tête malformé refusé', () => {
    const exp = { user: 'a', pass: 'bbbbbbbb' };
    expect(basicAuthOk(undefined, exp)).toBe(false);
    expect(basicAuthOk('Basic !!!', exp)).toBe(false);
    expect(basicAuthOk(basic('a', 'bbbbbbbb'), exp)).toBe(true);
  });
});

describe('Prévisualisation de recette : webapp à la racine, admin sous /admin', () => {
  const root = mkdtempSync(join(tmpdir(), 'preview-'));
  const web = join(root, 'web');
  const admin = join(root, 'admin');
  mkdirSync(join(web, '_expo'), { recursive: true });
  mkdirSync(join(admin, 'dashboard'), { recursive: true });
  writeFileSync(join(web, 'index.html'), 'web');
  writeFileSync(join(web, '_expo', 'app.js'), 'js');
  writeFileSync(join(admin, 'index.html'), 'admin');
  writeFileSync(join(admin, '404.html'), '404');
  writeFileSync(join(admin, 'dashboard', 'index.html'), 'dash');
  writeFileSync(join(root, 'secret.txt'), 'secret');
  const mw = previewStatic(web, admin) as unknown as Mw;
  const get = (path: string, method = 'GET') => {
    const res = fakeRes();
    let passed = false;
    mw({ path, method }, res, () => (passed = true));
    return { res, passed };
  };

  it('fichiers de la webapp et page unique pour ses routes', () => {
    expect(get('/_expo/app.js').res.file).toBe(join(web, '_expo', 'app.js'));
    expect(get('/espace-partenaire').res.file).toBe(join(web, 'index.html'));
    expect(get('/interview/0').res.file).toBe(join(web, 'index.html'));
  });

  it('admin sous /admin (pages exportées, 404 sinon)', () => {
    expect(get('/admin').res.file).toBe(join(admin, 'index.html'));
    expect(get('/admin/dashboard/').res.file).toBe(
      join(admin, 'dashboard', 'index.html'),
    );
    const missing = get('/admin/inexistant/');
    expect(missing.res.file).toBe(join(admin, '404.html'));
    expect(missing.res.statusCode).toBe(404);
  });

  it('API, documentation et socket jamais interceptées ; POST laissé à l’API', () => {
    expect(get('/api/health').passed).toBe(true);
    expect(get('/docs').passed).toBe(true);
    expect(get('/socket.io/').passed).toBe(true);
    expect(get('/', 'POST').passed).toBe(true);
  });

  it('aucune sortie du dossier servi', () => {
    expect(get('/../secret.txt').res.file).toBe(join(web, 'index.html'));
    expect(get('/admin/../../secret.txt').res.file).not.toBe(
      join(root, 'secret.txt'),
    );
    expect(get('/%2e%2e/secret.txt').res.file).not.toBe(
      join(root, 'secret.txt'),
    );
  });
});
