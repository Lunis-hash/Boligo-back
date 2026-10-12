import { HealthController, appVersion } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

function fakeRes() {
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
  };
  return res;
}

function controller(queryRaw: jest.Mock) {
  return new HealthController({ $queryRaw: queryRaw } as unknown as PrismaService);
}

describe('HealthController', () => {
  it('répond 200 avec db ok quand SELECT 1 aboutit', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const res = fakeRes();
    const body = await controller(query).health(res as never);
    expect(query).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(body).toEqual({ status: 'ok', db: 'ok', version: expect.any(String) });
  });

  it('répond 503 sans détail d’erreur quand la base est injoignable', async () => {
    const query = jest
      .fn()
      .mockRejectedValue(new Error('connect ECONNREFUSED db.secret-host:5432 password=xyz'));
    const res = fakeRes();
    const body = await controller(query).health(res as never);
    expect(res.statusCode).toBe(503);
    expect(body).toEqual({ status: 'degraded', db: 'down', version: expect.any(String) });
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|secret-host|password/);
    expect(Object.keys(body).sort()).toEqual(['db', 'status', 'version']);
  });

  it('considère la base en panne si elle ne répond pas à temps', async () => {
    jest.useFakeTimers();
    try {
      const query = jest.fn().mockReturnValue(new Promise(() => undefined));
      const pending = controller(query).check();
      jest.advanceTimersByTime(3500);
      await expect(pending).resolves.toMatchObject({ db: 'down', status: 'degraded' });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('appVersion', () => {
  it('prend APP_VERSION si défini (tronqué)', () => {
    expect(appVersion({ APP_VERSION: ' abc123 ' })).toBe('abc123');
    expect(appVersion({ APP_VERSION: 'x'.repeat(80) })).toHaveLength(40);
  });

  it('retombe sur la version de package.json', () => {
    expect(appVersion({})).toMatch(/^\d+\.\d+\.\d+/);
  });
});
