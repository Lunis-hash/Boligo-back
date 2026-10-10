import { EmailService, emailDeliveryMode } from './email.service';

describe('Envoi des e-mails', () => {
  const saved = { ...process.env };
  const realFetch = global.fetch;
  afterEach(() => {
    process.env = { ...saved };
    global.fetch = realFetch;
  });

  it('Resend passe avant le SMTP quand sa clé est présente', () => {
    process.env.SMTP_HOST = 'smtp.zoho.eu';
    process.env.SMTP_USER = 'contact@boligo.fr';
    process.env.SMTP_PASS = 'x';
    process.env.RESEND_API_KEY = 're_test';
    expect(emailDeliveryMode()).toBe('resend');
    delete process.env.RESEND_API_KEY;
    expect(emailDeliveryMode()).toBe('smtp');
  });

  it('envoie par l’API Resend avec l’expéditeur BOLIGO', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'BOLIGO <no-reply@boligo.fr>';
    delete process.env.SMTP_PASS;
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve('') }),
    );
    global.fetch = fetchMock as never;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await (
      new EmailService() as unknown as {
        dispatchEmail: (to: string, s: string, h: string) => Promise<void>;
      }
    ).dispatchEmail('awa@exemple.com', 'Sujet', '<p>Bonjour</p>');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body)).toMatchObject({
      from: 'BOLIGO <no-reply@boligo.fr>',
      to: ['awa@exemple.com'],
      subject: 'Sujet',
    });
  });
});
