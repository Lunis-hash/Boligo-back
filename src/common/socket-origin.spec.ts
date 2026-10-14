import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import WebSocket from 'ws';
import {
  appOrigins,
  isAllowedSocketOrigin,
  socketAllowedOrigins,
  socketAllowRequest,
  socketCorsOptions,
} from './cors';

const APP = appOrigins(undefined, ['https://boligo-admin.onrender.com']);
const API_HOST = 'boligo-back.onrender.com';

describe('isAllowedSocketOrigin', () => {
  it('accepte un client natif sans en-tête Origin', () => {
    expect(isAllowedSocketOrigin(undefined, API_HOST, APP)).toBe(true);
  });

  it('accepte le site BOLIGO et le dev local', () => {
    expect(
      isAllowedSocketOrigin('https://boligo-web.onrender.com', API_HOST, APP),
    ).toBe(true);
    expect(isAllowedSocketOrigin('http://localhost:8081', API_HOST, APP)).toBe(
      true,
    );
  });

  it("accepte l'Origin que React Native envoie (l'API elle-même)", () => {
    expect(
      isAllowedSocketOrigin('https://boligo-back.onrender.com', API_HOST, APP),
    ).toBe(true);
    expect(
      isAllowedSocketOrigin('wss://BOLIGO-back.onrender.com', API_HOST, APP),
    ).toBe(true);
  });

  it('refuse un site tiers, une origine « null » ou illisible', () => {
    expect(isAllowedSocketOrigin('https://evil.example', API_HOST, APP)).toBe(
      false,
    );
    expect(
      isAllowedSocketOrigin(
        'https://boligo-back.onrender.com.evil.example',
        API_HOST,
        APP,
      ),
    ).toBe(false);
    expect(isAllowedSocketOrigin('null', API_HOST, APP)).toBe(false);
    expect(isAllowedSocketOrigin('https://evil.example', undefined, APP)).toBe(
      false,
    );
  });
});

describe('socketAllowedOrigins', () => {
  it('reprend CORS_ORIGINS et ADMIN_ALLOWED_ORIGINS comme le HTTP', () => {
    const list = socketAllowedOrigins({
      CORS_ORIGINS: 'https://preview.boligo.fr/',
      ADMIN_ALLOWED_ORIGINS: 'https://admin2.boligo.fr',
    });
    expect(list).toEqual(
      expect.arrayContaining([
        'https://boligo-web.onrender.com',
        'https://preview.boligo.fr',
        'https://admin2.boligo.fr',
        'https://boligo-admin.onrender.com',
      ]),
    );
    expect(list).not.toContain('*');
  });
});

describe('socketAllowRequest / socketCorsOptions', () => {
  const allow = socketAllowRequest(() => APP);
  const run = (headers: { origin?: string; host?: string }) =>
    new Promise<[string | null | undefined, boolean]>((resolve) =>
      allow({ headers }, (err, ok) => resolve([err, ok])),
    );

  it('poignée de main : site tiers refusé avec un message, natif accepté', async () => {
    expect(
      await run({ origin: 'https://evil.example', host: API_HOST }),
    ).toEqual(['Origine non autorisée', false]);
    expect(await run({ host: API_HOST })).toEqual([null, true]);
    expect(
      await run({ origin: 'https://boligo-web.onrender.com', host: API_HOST }),
    ).toEqual([null, true]);
  });

  it("CORS polling : plus d'origine « * », pas de credentials", () => {
    const opts = socketCorsOptions(() => APP);
    expect(opts.origin).not.toBe('*');
    expect(opts.credentials).toBe(false);
    const decide = (o: string | undefined) =>
      new Promise((resolve) =>
        (
          opts.origin as (
            o: string | undefined,
            cb: (e: Error | null, a?: boolean) => void,
          ) => void
        )(o, (_e, a) => resolve(a)),
      );
    return Promise.all([
      expect(decide('https://evil.example')).resolves.toBe(false),
      expect(decide('https://boligo-web.onrender.com')).resolves.toBe(true),
      expect(decide(undefined)).resolves.toBe(true),
    ]);
  });
});

/**
 * Serveur socket.io réel avec les mêmes réglages que ChatGateway, et poignée de
 * main WebSocket pure (transport utilisé par l'application mobile).
 */
describe('socket.io réel : poignée de main WebSocket', () => {
  let http: HttpServer;
  let io: Server;
  let port: number;

  beforeAll(async () => {
    http = createServer();
    io = new Server(http, {
      cors: socketCorsOptions(() => APP),
      allowRequest: socketAllowRequest(() => APP),
    });
    await new Promise<void>((r) => http.listen(0, '127.0.0.1', r));
    port = (http.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await io.close();
  });

  /** Ouvre un WebSocket engine.io ; renvoie 'open' ou le code HTTP de refus. */
  const handshake = (origin?: string) =>
    new Promise<string>((resolve) => {
      const ws = new WebSocket(
        `ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`,
        origin ? { origin } : {},
      );
      ws.on('message', (data) => {
        // Premier paquet engine.io « 0{...} » = connexion ouverte.
        const text = (data as Buffer).toString('utf8');
        resolve(text.startsWith('0') ? 'open' : `msg:${text}`);
        ws.close();
      });
      ws.on('unexpected-response', (_req, res) => {
        resolve(String(res.statusCode));
        ws.terminate();
      });
      ws.on('error', () => undefined);
    });

  it('site tiers : refusé (engine.io répond 400 à une montée WebSocket refusée)', async () => {
    expect(await handshake('https://evil.example')).toBe('400');
  });

  it('site tiers en polling : refusé (403), site BOLIGO accepté (200)', async () => {
    const poll = (origin: string) =>
      fetch(`http://127.0.0.1:${port}/socket.io/?EIO=4&transport=polling`, {
        headers: { Origin: origin },
      }).then((r) => r.status);
    expect(await poll('https://evil.example')).toBe(403);
    expect(await poll('https://boligo-web.onrender.com')).toBe(200);
  });

  it('client natif sans Origin : connecté', async () => {
    expect(await handshake()).toBe('open');
  });

  it('site BOLIGO : connecté', async () => {
    expect(await handshake('https://boligo-web.onrender.com')).toBe('open');
  });

  it("Origin = l'API elle-même (React Native) : connecté", async () => {
    expect(await handshake(`http://127.0.0.1:${port}`)).toBe('open');
  });
});
