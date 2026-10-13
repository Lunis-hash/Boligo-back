/**
 * Résumé de configuration écrit au démarrage, pour vérifier les réglages de
 * production dans les journaux de l'hébergeur SANS jamais exposer de secret :
 * on n'écrit que des états (présent, absent, mode) ou des fragments publics
 * (référence du projet de base, domaine d'envoi).
 */
export function configReport(env: NodeJS.ProcessEnv = process.env): string {
  const on = (v?: string) =>
    v?.trim().toLowerCase() === 'true' ? 'ACTIVÉ' : 'désactivé';
  const set = (v?: string) => (v?.trim() ? 'DÉFINI' : 'absent');
  const stripe = (v?: string) =>
    !v
      ? 'absente'
      : v.startsWith('sk_live_')
        ? 'RÉEL'
        : v.startsWith('sk_test_')
          ? 'test'
          : v.startsWith('rk_')
            ? 'restreinte'
            : 'inconnue';
  const dbRef = (v?: string) =>
    (v ?? '').match(/(?:postgres\.|db\.)([a-z0-9]{20})(?:[:@.])/)?.[1] ??
    (v ? 'hôte non Supabase' : 'absente');
  const domain = (v?: string) =>
    (v ?? '').match(/@([A-Za-z0-9.-]+)/)?.[1] ??
    (v ? 'invalide' : 'défaut boligo.fr');
  return [
    `NODE_ENV=${env.NODE_ENV ?? 'absent'}`,
    `OTP_DEBUG=${on(env.OTP_DEBUG)}`,
    `VIDEO_TEST_UNLOCK=${on(env.VIDEO_TEST_UNLOCK)}`,
    `INSIGHTS_RETRY_AFTER_MS=${set(env.INSIGHTS_RETRY_AFTER_MS)}`,
    `SONDEUR_MODELS_FILE=${set(env.SONDEUR_MODELS_FILE)}`,
    `INTERVIEW_VERSION=${env.INTERVIEW_VERSION?.trim() || 'absent (7.1)'}`,
    `INTERVIEW_V82_PERCENT=${env.INTERVIEW_V82_PERCENT?.trim() || 'absent'}`,
    `clé Stripe=${stripe(env.STRIPE_SECRET_KEY)}`,
    `secret webhook Stripe=${env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') ? 'présent' : 'absent ou invalide'}`,
    `base=${dbRef(env.DATABASE_URL)}`,
    `domaine e-mail=${domain(env.EMAIL_FROM)}`,
  ].join(' · ');
}
