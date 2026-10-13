import { configReport } from './config-report';

describe('Résumé de configuration au démarrage', () => {
  it('donne les états attendus sans jamais écrire de secret', () => {
    const env = {
      NODE_ENV: 'production',
      OTP_DEBUG: 'false',
      STRIPE_SECRET_KEY: 'sk_test_SECRETSECRET',
      STRIPE_WEBHOOK_SECRET: 'whsec_SECRETSECRET',
      DATABASE_URL:
        'postgresql://postgres.hhnnsevawhhtzdffnomv:MOTDEPASSE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
      EMAIL_FROM: 'BOLIGO <no-reply@boligo.fr>',
      JWT_SECRET: 'JWTSECRET',
    } as NodeJS.ProcessEnv;
    const r = configReport(env);
    expect(r).toContain('NODE_ENV=production');
    expect(r).toContain('OTP_DEBUG=désactivé');
    expect(r).toContain('VIDEO_TEST_UNLOCK=désactivé');
    expect(r).toContain('INSIGHTS_RETRY_AFTER_MS=absent');
    expect(r).toContain('SONDEUR_MODELS_FILE=absent');
    expect(r).toContain('INTERVIEW_VERSION=absent (7.1)');
    expect(r).toContain('clé Stripe=test');
    expect(r).toContain('secret webhook Stripe=présent');
    expect(r).toContain('base=hhnnsevawhhtzdffnomv');
    expect(r).toContain('domaine e-mail=boligo.fr');
    for (const secret of [
      'SECRETSECRET',
      'MOTDEPASSE',
      'JWTSECRET',
      'sk_test_',
      'whsec_',
    ])
      expect(r).not.toContain(secret);
  });

  it('signale les réglages dangereux', () => {
    const r = configReport({
      OTP_DEBUG: 'true',
      VIDEO_TEST_UNLOCK: 'true',
      INSIGHTS_RETRY_AFTER_MS: '2000',
      SONDEUR_MODELS_FILE: '/x.json',
      INTERVIEW_VERSION: '8.2',
      STRIPE_SECRET_KEY: 'sk_live_X',
      DATABASE_URL:
        'postgresql://u:p@db.qlfwuqmhghfaytnridvd.supabase.co:5432/postgres',
    } as NodeJS.ProcessEnv);
    expect(r).toContain('OTP_DEBUG=ACTIVÉ');
    expect(r).toContain('VIDEO_TEST_UNLOCK=ACTIVÉ');
    expect(r).toContain('INSIGHTS_RETRY_AFTER_MS=DÉFINI');
    expect(r).toContain('SONDEUR_MODELS_FILE=DÉFINI');
    expect(r).toContain('INTERVIEW_VERSION=8.2');
    expect(r).toContain('clé Stripe=RÉEL');
    expect(r).toContain('base=qlfwuqmhghfaytnridvd');
  });
});
