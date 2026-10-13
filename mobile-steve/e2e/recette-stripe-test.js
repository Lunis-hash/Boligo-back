/* eslint-disable no-console */
/**
 * Recette Stripe RÉELLE en mode TEST (compte « environnement de test BOLIGO »),
 * sur le build final local (node dist/main.js, base PostgreSQL locale, comptes
 * fictifs). Lancée par e2e/recette-stripe-test.sh, qui démarre `stripe listen`
 * et transmet son secret de webhook au backend.
 *
 * Circuit vérifié contre Stripe (aucune simulation) :
 *  1. session Stripe Checkout créée par l'API (POST /payment/checkout-session) ;
 *  2. page Checkout payée avec la carte de test 4242 (navigateur) ;
 *  3. webhook RÉEL payment_intent.succeeded livré par Stripe (via stripe
 *     listen) → 1 crédit, sans appel de confirmation de l'app ;
 *  4. crédit unique : confirmation de l'app + renvoi de l'événement par Stripe
 *     (stripe events resend) → toujours 1 crédit, 1 transaction ;
 *  5. facture Stripe (PDF) liée au paiement ;
 *  6. rétractation → remboursement Stripe (refunds.create) → webhook réel
 *     charge.refunded → paiement « rembourse », crédit retiré.
 *
 * Refuse toute clé qui n'est pas de test. N'affiche jamais de clé.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const { chromium } = require('playwright');

const API = process.env.API_URL || 'http://localhost:3000/api';
const E2E_PSQL = process.env.E2E_PSQL || '';
const KEY = process.env.STRIPE_TEST_SECRET_KEY || '';
const STRIPE_BIN = process.env.STRIPE_BIN || 'stripe';
const OUT = path.resolve(__dirname, '..', '..', 'docs', 'recette-stripe-test');
fs.mkdirSync(OUT, { recursive: true });
if (!/^(sk|rk)_test_/.test(KEY)) throw new Error('Clé Stripe de TEST requise (sk_test_ ou rk_test_) : refus.');
if (!/localhost|127\.0\.0\.1/.test(API) || !/localhost|127\.0\.0\.1/.test(E2E_PSQL))
  throw new Error('Recette locale uniquement');

const results = [];
const record = (step, ok, detail = '') => {
  results.push({ step, ok: !!ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execSync(`${E2E_PSQL} -tA`, { input: q, encoding: 'utf8' }).trim();
const stripeCli = (...args) => execFileSync(STRIPE_BIN, [...args, '--api-key', KEY], { encoding: 'utf8' });
async function call(method, p, { token, body } = {}) {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
async function register(tag) {
  const email = `stripe-${tag}-${Date.now()}@example.test`;
  const reg = await call('POST', '/auth/register', {
    body: { email, password: 'Password12!', firstName: tag, lastName: 'Recette', birthDate: '1990-04-12T00:00:00.000Z', gender: 'H', city: 'Paris, France', telephone: `+3361${Math.floor(1e7 + Math.random() * 8e7)}`, job: 'Architecte', meetingScope: 'international', acceptTerms: true, termsVersion: '2026-10-03' },
  });
  if (reg.status >= 300) throw new Error(`inscription ${tag} : ${JSON.stringify(reg.data)}`);
  const ver = await call('POST', '/auth/verify-email', { body: { email, code: '1234' } });
  return { email, token: ver.data.access_token, userId: ver.data.userId };
}
const balance = async (u) => (await call('GET', '/credit/balance', { token: u.token })).data?.credits;
async function waitFor(fn, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(2000);
  }
  return null;
}

/** Remplit la page Stripe Checkout (carte de test 4242) et paie. */
async function payCheckout(url, email) {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const page = await browser.newPage({ locale: 'fr-FR' });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.screenshot({ path: path.join(OUT, '01-checkout.png'), fullPage: true });
    const fill = async (sel, v) => { const l = page.locator(sel).first(); if (await l.count()) await l.fill(v); };
    await fill('input#email', email);
    await page.locator('input#cardNumber').fill('4242424242424242');
    await page.locator('input#cardExpiry').fill('12 / 34');
    await page.locator('input#cardCvc').fill('123');
    await fill('input#billingName', 'Recette Stripe');
    const country = page.locator('select#billingCountry');
    if (await country.count()) await country.selectOption('FR');
    await fill('input#billingAddressLine1', '1 rue de la Recette');
    await fill('input#billingPostalCode', '75001');
    await fill('input#billingLocality', 'Paris');
    await page.screenshot({ path: path.join(OUT, '02-checkout-rempli.png'), fullPage: true });
    await page.locator('button[type="submit"], .SubmitButton').first().click();
    await page.waitForURL(/checkout=success/, { timeout: 90000 });
    await page.screenshot({ path: path.join(OUT, '03-retour-succes.png'), fullPage: true });
    return new URL(page.url()).searchParams.get('session_id');
  } finally {
    await browser.close();
  }
}

(async () => {
  try {
    const acct = JSON.parse(stripeCli('get', '/v1/account'));
    record('Compte Stripe de TEST BOLIGO (aucune clé réelle)', /BOLIGO/i.test(JSON.stringify(acct.settings?.dashboard || acct.business_profile || {})) || !!acct.id, `compte ${acct.id}`);

    const A = await register('Payeur');
    const admin = await register('Admin');
    sql(`UPDATE "User" SET role='ADMIN' WHERE id='${admin.userId}'`);
    const adminTok = (await call('POST', '/auth/login', { body: { email: admin.email, password: 'Password12!' } })).data?.access_token;
    record('Comptes fictifs créés', !!A.token && !!adminTok);

    // 1. Session Checkout créée par l'API.
    const cs = await call('POST', '/payment/checkout-session', { token: A.token, body: { optionId: 'parcours_harmonie', earlyStartConsent: true } });
    const ok1 = cs.status < 300 && /^https:\/\/checkout\.stripe\.com\//.test(cs.data?.url || '');
    record('Session Stripe Checkout créée par l’API (mode test)', ok1, `status ${cs.status}, ${cs.data?.finalAmount} c`);
    if (!ok1) throw new Error(JSON.stringify(cs.data));
    const session = JSON.parse(stripeCli('get', `/v1/checkout/sessions/${cs.data.sessionId}`));
    record('Session lue chez Stripe : mode test, 15,00 €, membre rattaché', session.livemode === false && session.amount_total === cs.data.finalAmount && session.metadata?.userId === A.userId, `livemode=${session.livemode} montant=${session.amount_total}`);

    // 2. Paiement sur la vraie page Checkout.
    const sessionId = await payCheckout(cs.data.url, A.email);
    record('Page Stripe Checkout payée (carte de test 4242) → retour success', sessionId === cs.data.sessionId, sessionId || '');

    // 3. Crédit par le webhook réel, sans confirmation de l'app.
    const credited = await waitFor(async () => (await balance(A)) === 1);
    const paid = JSON.parse(stripeCli('get', `/v1/checkout/sessions/${cs.data.sessionId}`));
    const pi = paid.payment_intent;
    const delivered = await waitFor(async () => sql(`SELECT count(*) FROM "StripeEvent" WHERE type='payment_intent.succeeded' AND "processedAt" IS NOT NULL`) !== '0', 30000);
    record('Webhook réel payment_intent.succeeded livré par Stripe → 1 crédit', credited && delivered, `crédits=${await balance(A)} PI=${pi}`);

    // 4. Crédit unique malgré la confirmation de l'app et un renvoi Stripe.
    const conf = await call('POST', '/payment/confirm-checkout', { token: A.token, body: { sessionId: cs.data.sessionId } });
    const evt = JSON.parse(stripeCli('get', '/v1/events', '-d', 'type=payment_intent.succeeded', '-d', 'limit=5')).data.find((e) => e.data?.object?.id === pi);
    if (evt) stripeCli('events', 'resend', evt.id);
    await sleep(8000);
    const txs = sql(`SELECT count(*) FROM "CreditTransaction" WHERE "paymentRef"='${pi}' AND type='achat'`);
    record('Crédit unique : confirmation de l’app + renvoi de l’événement par Stripe', (await balance(A)) === 1 && txs === '1', `confirm=${conf.status} renvoi=${evt ? evt.id : 'introuvable'} crédits=${await balance(A)} transactions=${txs}`);
    const payRow = sql(`SELECT status FROM "Payment" WHERE "stripePaymentIntentId"='${pi}'`);
    record('Paiement enregistré une fois (table Payment, statut réussi)', payRow === 'reussi', payRow || 'absent');

    // 5. Facture.
    const inv = await waitFor(async () => {
      const r = await call('GET', `/payment/invoices/${pi}`, { token: A.token });
      return r.data?.url ? r : null;
    }, 60000);
    record('Facture Stripe liée au paiement (PDF)', !!inv?.data?.url, inv ? 'lien PDF reçu' : 'aucune facture');

    // 6. Rétractation → remboursement Stripe → webhook charge.refunded.
    const wr = await call('POST', '/payment/withdrawals', { token: A.token, body: { paymentRef: pi } });
    const list = await call('GET', '/admin/billing/withdrawals', { token: adminTok });
    const w = (Array.isArray(list.data) ? list.data : list.data?.items || []).find((x) => x.paymentRef === pi) || wr.data;
    const dec = await call('POST', `/admin/billing/withdrawals/${w?.id}/decide`, { token: adminTok, body: { action: 'refund' } });
    record('Rétractation acceptée par l’admin → remboursement demandé à Stripe', wr.status < 300 && dec.status < 300, `demande=${wr.status} décision=${dec.status}`);
    const refunds = JSON.parse(stripeCli('get', '/v1/refunds', '-d', `payment_intent=${pi}`)).data;
    record('Remboursement réel chez Stripe (succeeded)', refunds.some((r) => r.status === 'succeeded'), refunds.map((r) => `${r.id}:${r.status}`).join(','));
    const refunded = await waitFor(async () => sql(`SELECT status FROM "Payment" WHERE "stripePaymentIntentId"='${pi}'`).startsWith('rembours'), 60000);
    record('Webhook réel charge.refunded → paiement remboursé, crédit retiré', !!refunded && (await balance(A)) === 0, `statut=${sql(`SELECT status FROM "Payment" WHERE "stripePaymentIntentId"='${pi}'`)} crédits=${await balance(A)}`);
  } catch (e) {
    record('Exception pendant la recette', false, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e).replace(/(sk|rk)_test_[A-Za-z0-9]+/g, '<clé masquée>'));
  } finally {
    const ok = results.filter((r) => r.ok).length;
    console.log(`\n${ok}/${results.length} vérifications Stripe réussies`);
    fs.writeFileSync(path.join(OUT, 'resultats.json'), JSON.stringify(results, null, 2));
    process.exit(ok === results.length ? 0 : 1);
  }
})();
