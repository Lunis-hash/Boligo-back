import {
  OTP_EMAIL_COOLDOWN_MS,
  otpEmailAllowed,
  resetOtpEmailCooldown,
} from './auth.service';

/** E-mails de code : au plus un par adresse et par minute. */
describe('Délai entre deux e-mails de code de vérification', () => {
  beforeEach(() => resetOtpEmailCooldown());

  it('premier envoi accepté, renvoi immédiat refusé', () => {
    const t = 1_000_000;
    expect(otpEmailAllowed('steve@example.com', t)).toBe(true);
    expect(otpEmailAllowed('steve@example.com', t + 500)).toBe(false);
    expect(otpEmailAllowed('steve@example.com', t + 15_000)).toBe(false);
  });

  it('adresse comparée sans tenir compte de la casse ni des espaces', () => {
    const t = 2_000_000;
    expect(otpEmailAllowed('Steve@Example.com', t)).toBe(true);
    expect(otpEmailAllowed(' steve@example.com ', t + 1)).toBe(false);
  });

  it('nouvel envoi possible après une minute', () => {
    const t = 3_000_000;
    expect(otpEmailAllowed('a@example.com', t)).toBe(true);
    expect(otpEmailAllowed('a@example.com', t + OTP_EMAIL_COOLDOWN_MS)).toBe(
      true,
    );
  });

  it('adresses différentes indépendantes', () => {
    const t = 4_000_000;
    expect(otpEmailAllowed('a@example.com', t)).toBe(true);
    expect(otpEmailAllowed('b@example.com', t)).toBe(true);
  });
});

describe('Mot de passe oublié : un seul e-mail par minute', () => {
  beforeEach(() => resetOtpEmailCooldown());

  it('clé distincte du code de validation (les deux restent possibles)', () => {
    const t = 5_000_000;
    expect(otpEmailAllowed('a@example.com', t)).toBe(true);
    expect(otpEmailAllowed('reset:a@example.com', t)).toBe(true);
    expect(otpEmailAllowed('reset:a@example.com', t + 1000)).toBe(false);
  });
});
