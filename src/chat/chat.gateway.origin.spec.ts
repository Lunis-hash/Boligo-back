import 'reflect-metadata';
import { GATEWAY_OPTIONS } from '@nestjs/websockets/constants';
import { ChatGateway } from './chat.gateway';

/** Réglages réellement posés par @WebSocketGateway sur ChatGateway. */
describe('ChatGateway : origines WebSocket', () => {
  const options = Reflect.getMetadata(GATEWAY_OPTIONS, ChatGateway) as {
    cors: { origin: unknown; credentials?: boolean };
    allowRequest: (
      req: { headers: { origin?: string; host?: string } },
      cb: (err: string | null | undefined, ok: boolean) => void,
    ) => void;
  };

  const allowed = (origin?: string, host = 'boligo-back.onrender.com') =>
    new Promise<boolean>((resolve) =>
      options.allowRequest({ headers: { origin, host } }, (_e, ok) =>
        resolve(ok),
      ),
    );

  it("n'utilise plus l'origine « * »", () => {
    expect(options.cors.origin).not.toBe('*');
    expect(typeof options.cors.origin).toBe('function');
    expect(options.cors.credentials).toBe(false);
  });

  it('refuse un site tiers, accepte le site BOLIGO et les clients natifs', async () => {
    expect(await allowed('https://evil.example')).toBe(false);
    expect(await allowed('https://boligo-web.onrender.com')).toBe(true);
    expect(await allowed(undefined)).toBe(true);
    expect(await allowed('https://boligo-back.onrender.com')).toBe(true);
  });
});
