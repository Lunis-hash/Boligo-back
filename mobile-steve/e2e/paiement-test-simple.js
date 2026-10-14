// Paiement Stripe en mode TEST contre l'API LOCALE (aucun paiement réel) :
//   STRIPE_TEST_SECRET_KEY=sk_test_… API_URL=http://localhost:3000/api node mobile-steve/e2e/paiement-test-simple.js
const API = process.env.API_URL || 'http://localhost:3000/api';
if (!/localhost|127\.0\.0\.1/.test(API)) { console.error('API locale uniquement'); process.exit(2); }
const KEY = process.env.STRIPE_TEST_SECRET_KEY || '';
if (!KEY.startsWith('sk_test_')) { console.error('clé test requise'); process.exit(2); }
const j = async (m, p, { token, body } = {}) => {
  const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; } return { s: r.status, d };
};
const stripe = async (p, form) => {
  const r = await fetch('https://api.stripe.com/v1' + p, { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form) });
  return r.json();
};
(async () => {
  const email = `paiement-test-${Date.now()}@example.test`;
  const reg = await j('POST', '/auth/register', { body: { email, password: 'Password12!', firstName: 'Paiement', lastName: 'Test', birthDate: '1990-01-01T00:00:00.000Z', gender: 'H', city: 'Bezons, France', telephone: `+3361${Math.floor(1e7 + Math.random() * 8e7)}`, job: 'Test', meetingScope: 'national', acceptTerms: true, termsVersion: '2026-10-03' } });
  const ver = await j('POST', '/auth/verify-email', { body: { email, code: reg.d.otpDebugCode || '1234' } });
  const token = ver.d.access_token;
  const plans = await j('GET', '/payment/plans');
  console.log('plans', plans.s, JSON.stringify(plans.d).slice(0, 160));
  const intent = await j('POST', '/payment/create-payment-intent', { token, body: { optionId: 'parcours_harmonie', earlyStartConsent: true } });
  console.log('intent', intent.s, Object.keys(intent.d || {}).join(','));
  const pi = intent.d.paymentIntentId || (intent.d.paymentIntent || '').split('_secret')[0];
  if (!pi?.startsWith('pi_')) { console.log('réponse', JSON.stringify(intent.d).slice(0, 300)); process.exit(1); }
  const conf = await stripe(`/payment_intents/${pi}/confirm`, { payment_method: 'pm_card_visa', return_url: 'https://example.test' });
  console.log('stripe confirm', conf.status, conf.livemode === false ? 'livemode=false' : 'LIVEMODE?!');
  const done = await j('POST', '/payment/confirm', { token, body: { paymentIntentId: pi } });
  console.log('confirm API', done.s, JSON.stringify(done.d).slice(0, 200));
  const purchases = await j('GET', '/payment/purchases', { token });
  console.log('achats', purchases.s, JSON.stringify(purchases.d).slice(0, 250));
})().catch((e) => { console.error(e.message); process.exit(1); });
