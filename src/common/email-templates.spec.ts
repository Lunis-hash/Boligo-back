import * as T from './email-templates';
import { maskEmail } from './email.service';
import { NotificationService } from '../notifications/notification.service';

const all = (): [string, T.RenderedEmail][] => [
  ['code', T.verificationEmail('4821')],
  ['bienvenue', T.welcomeEmail('Awa')],
  ['mot de passe', T.passwordResetEmail('7390')],
  ['profil prêt', T.profileReadyEmail('Awa')],
  ['profil compatible', T.newMatchEmail('Awa', 87.4)],
  ['invitation reçue', T.invitationReceivedEmail('Awa')],
  ['invitation acceptée', T.journeyStartedEmail('Awa', 'Malik', 'inviteur')],
  ['parcours commence', T.journeyStartedEmail('Malik', 'Awa', 'invite')],
  ['invitation sans suite', T.invitationClosedEmail('Awa', 'expiree', true)],
  ['messagerie', T.chatOpenEmail('Awa', 'Malik')],
  ['vidéo', T.videoUnlockedEmail('Awa', 'Malik')],
  [
    'fin de parcours',
    T.journeyEndedEmail('Awa', 'Malik', 'Merci pour ces échanges.', true),
  ],
  [
    'reçu',
    T.paymentReceiptEmail({
      firstName: 'Awa',
      amountEur: 15,
      planName: 'Parcours Harmonie',
      paymentRef: 'pi_123',
      taxCents: 250,
      ratePercent: 20,
    }),
  ],
];

describe('E-mails BOLIGO', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it.each(all())('%s : sujet, marque, lien et pied de page', (_name, email) => {
    expect(email.subject.length).toBeGreaterThan(5);
    expect(email.html).toContain('BOLIGO');
    expect(email.html).toContain('contact@boligo.fr');
    expect(email.html).toContain(
      'Vous recevez cet e-mail car vous avez un compte BOLIGO.',
    );
    expect(email.html).not.toMatch(/Duparc|Bezons|Société HARMONIE|OWEKE/i);
  });

  it('les liens pointent vers le site BOLIGO configuré', () => {
    process.env.WEB_APP_URL = 'https://app.boligo.fr/';
    const html = T.journeyStartedEmail('Awa', 'Malik', 'invite').html;
    expect(html).toContain('href="https://app.boligo.fr/messages"');
  });

  it('le texte saisi par un membre est échappé', () => {
    const html = T.journeyEndedEmail(
      'Awa',
      '<b>Malik</b>',
      '<script>alert(1)</script>',
      false,
    ).html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b>Malik</b>');
  });

  it('le code reste lisible et le crédit rendu est annoncé', () => {
    expect(T.verificationEmail('4821').html).toContain('4821');
    expect(T.invitationClosedEmail('Awa', 'refusee', true).html).toContain(
      'Rendu sur votre compte',
    );
    expect(T.invitationClosedEmail('Awa', 'refusee', false).html).not.toContain(
      'Rendu sur votre compte',
    );
  });

  it('le reçu affiche le total TTC et la TVA', () => {
    const html = T.paymentReceiptEmail({
      firstName: 'Awa',
      amountEur: 15,
      planName: 'Parcours Harmonie',
      paymentRef: 'pi_123',
      taxCents: 250,
      ratePercent: 20,
    }).html;
    expect(html).toContain('15,00 €');
    expect(html).toContain('dont TVA (20 %) : 2,50 €');
  });

  it('les adresses sont masquées dans les journaux', () => {
    expect(maskEmail('awa.diallo@gmail.com')).toBe('a•••@gmail.com');
    expect(maskEmail('pas-une-adresse')).toBe('•••');
  });
});

describe('E-mail d’étape au membre', () => {
  const setup = (user: unknown) => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const email = { sendStepEmail: jest.fn().mockResolvedValue(undefined) };
    const service = new NotificationService(prisma as never, email as never);
    return { service, email };
  };

  it('envoie avec le prénom du membre', async () => {
    const { service, email } = setup({
      email: 'awa@exemple.com',
      firstName: 'Awa',
      accountStatus: 'actif',
    });
    await service.emailUser('u1', (name) => T.chatOpenEmail(name, 'Malik'));
    const [to, rendered] = email.sendStepEmail.mock.calls[0] as [
      string,
      T.RenderedEmail,
    ];
    expect(to).toBe('awa@exemple.com');
    expect(rendered.html).toContain('Bonjour Awa,');
  });

  it('rien pour un compte suspendu ou introuvable', async () => {
    for (const user of [
      null,
      { email: 'x@exemple.com', firstName: 'X', accountStatus: 'suspendu' },
    ]) {
      const { service, email } = setup(user);
      await service.emailUser('u1', (name) => T.chatOpenEmail(name, 'Malik'));
      expect(email.sendStepEmail).not.toHaveBeenCalled();
    }
  });

  it('une panne d’envoi ne remonte pas', async () => {
    const { service, email } = setup({
      email: 'awa@exemple.com',
      firstName: 'Awa',
      accountStatus: 'actif',
    });
    email.sendStepEmail.mockRejectedValue(new Error('panne'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      service.emailUser('u1', (name) => T.chatOpenEmail(name, 'Malik')),
    ).resolves.toBeUndefined();
  });
});
