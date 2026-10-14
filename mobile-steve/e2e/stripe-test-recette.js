/* eslint-disable no-console */
/**
 * Recette du paiement en mode TEST Stripe, contre une API LOCALE uniquement.
 *
 *   STRIPE_TEST_SECRET_KEY=sk_test_… (environnement seulement)
 *   API_URL=http://127.0.0.1:3200/api
 *   DB_URL=postgresql://boligo@127.0.0.1:5433/boligo_stripe
 *   WEBHOOK_SECRET=whsec_local_recette   (secret LOCAL de l'API, pas celui du compte)
 *   node mobile-steve/e2e/stripe-test-recette.js
 *
 * - RÉEL : appel à l'API Stripe de test (PaymentIntent, confirmation par carte de
 *   test, session Checkout, facture, avoir) ; chaque objet est relu (livemode=false).
 * - SIMULÉ : événement webhook signé localement (HMAC SHA256 de « t.payload »),
 *   envoyé à l'API locale ; aucun webhook du compte Stripe n'est créé ni modifié.
 * - Aucun remboursement réel : le webhook TEST du compte pointe vers Render, et
 *   un charge.refunded y écrirait une ligne StripeEvent si la facturation y est
 *   active. Les remboursements sont donc simulés par événement signé.
 * La clé n'est jamais affichée, écrite ni passée en argument de processus.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const KEY = process.env.STRIPE_TEST_SECRET_KEY || '';
if (!KEY.startsWith('sk_test_')) { console.error('Clé Stripe de TEST (sk_test_) requise : refus.'); process.exit(2); }
const API = process.env.API_URL || 'http://127.0.0.1:3200/api';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(API)) { console.error('API locale uniquement : refus.'); process.exit(2); }
const DB_URL = process.env.DB_URL || 'postgresql://boligo@127.0.0.1:5433/boligo_stripe';
if (!/@(127\.0\.0\.1|localhost):\d+\//.test(DB_URL)) { console.error('Base locale uniquement : refus.'); process.exit(2); }
const WHSEC = process.env.WEBHOOK_SECRET || 'whsec_local_recette';
const OUT = process.env.OUT || path.join(__dirname, '../../docs/recette-stripe-test/resultats-2026-10-14.json');
const CHECKOUT_BROWSER = process.env.CHECKOUT_BROWSER !== 'non';

const cut = (id) => (typeof id === 'string' && id.length > 12 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id);
const scrub = (s) => String(s)
  .replace(/(sk|rk|pk)_(test|live)_[A-Za-z0-9]+/g, '<clé masquée>')
  .replace(/whsec_[A-Za-z0-9_]+/g, '<secret masqué>')
  .replace(/\b(pi|cs|re|ch|cus|in|cn|evt|txr|pm)_[A-Za-z0-9_]{8,}/g, (m) => cut(m))
  .replace(/_secret_[A-Za-z0-9]+/g, '_secret_<masqué>')
  .replace(/\b\d{13,19}\b/g, '<n° masqué>');
const results = [];
const record = (cas, nature, ok, preuve) => {
  const r = { cas, nature, ok: !!ok, preuve: scrub(typeof preuve === 'string' ? preuve : JSON.stringify(preuve)) };
  results.push(r);
  console.log(`${ok ? 'OK ' : 'KO '} [${nature}] ${cas} — ${r.preuve}`);
  return !!ok;
};
const sql = (q) => execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-tA', DB_URL, '-c', q], { encoding: 'utf8' }).trim();

async function call(method, p, { token, body, headers, raw } = {}) {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers || {}) },
    body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000),
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
/** API Stripe de TEST ; la clé ne sort jamais de ce processus. */
async function stripe(method, p, form) {
  const res = await fetch('https://api.stripe.com/v1' + p, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2024-06-20' },
    body: form ? new URLSearchParams(form) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const d = await res.json();
  if (d && d.livemode === true) throw new Error('Objet Stripe en mode RÉEL : arrêt immédiat.');
  return d;
}
/** Événement signé localement (méthode officielle Stripe : v1 = HMAC SHA256 de « t.payload »). */
function signed(event, secret = WHSEC) {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return { raw: payload, headers: { 'stripe-signature': `t=${t},v1=${v1}` } };
}
const sendEvent = (event, secret) => { const s = signed(event, secret); return call('POST', '/payment/webhook', s); };
const evt = (type, object) => ({ id: `evt_local_${crypto.randomBytes(8).toString('hex')}`, object: 'event', type, livemode: false, created: Math.floor(Date.now() / 1000), api_version: '2024-06-20', data: { object } });

async function register(tag) {
  const email = `stripe-${tag.toLowerCase()}-${Date.now()}@example.test`;
  const reg = await call('POST', '/auth/register', {
    body: { email, password: 'Password12!', firstName: tag, lastName: 'Recette', birthDate: '1990-04-12T00:00:00.000Z', gender: 'H', city: 'Paris, France', telephone: `+3361${Math.floor(1e7 + Math.random() * 8e7)}`, job: 'Architecte', meetingScope: 'international', acceptTerms: true, termsVersion: '2026-10-03' },
  });
  if (reg.status >= 300) throw new Error(`inscription ${tag} : HTTP ${reg.status}`);
  const ver = await call('POST', '/auth/verify-email', { body: { email, code: reg.data?.otpDebugCode || '1234' } });
  if (!ver.data?.access_token) throw new Error(`vérification ${tag} : HTTP ${ver.status}`);
  return { email, token: ver.data.access_token, userId: ver.data.userId || ver.data.user?.id };
}
const balance = async (u) => (await call('GET', '/credit/balance', { token: u.token })).data?.credits;
const piOf = (d) => d?.paymentIntentId || String(d?.paymentIntent || '').split('_secret')[0];
const txCount = (pi) => sql(`SELECT count(*) FROM "CreditTransaction" WHERE "paymentRef"='${pi}' AND type='achat'`);

function seedPromos() {
  sql(`DELETE FROM "PromoUsage" WHERE "promoCodeId" IN (SELECT id FROM "PromoCode" WHERE code LIKE 'RECETTE%')`);
  const rows = [
    ['RECETTE100', 'free', 0, 'NULL', 'NULL', 0],
    ['RECETTE50', 'percent', 50, 'NULL', 'NULL', 0],
    ['RECETTEEXPIRE', 'percent', 50, 'NULL', `now() - interval '1 day'`, 0],
    ['RECETTEEPUISE', 'percent', 50, '1', 'NULL', 1],
    ['RECETTEPART20', 'percent', 20, 'NULL', 'NULL', 0],
  ];
  for (const [code, type, value, maxUses, expiresAt, used] of rows)
    sql(`INSERT INTO "PromoCode"(id, code, "discountType", "discountValue", "maxUses", "usedCount", "expiresAt", "isActive", description)
         VALUES ('promo_${code.toLowerCase()}', '${code}', '${type}', ${value}, ${maxUses}, ${used}, ${expiresAt}, true, 'Recette Stripe test (fictif)')
         ON CONFLICT (code) DO UPDATE SET "discountType"=EXCLUDED."discountType", "discountValue"=EXCLUDED."discountValue", "maxUses"=EXCLUDED."maxUses", "usedCount"=EXCLUDED."usedCount", "expiresAt"=EXCLUDED."expiresAt", "isActive"=true`);
  sql(`INSERT INTO "PartnerApplication"(id, type, status, name, email, country, message, "commissionRate", "promoCodeId", "updatedAt")
       VALUES ('partner_recette_stripe', 'AMBASSADEUR', 'ACCEPTE', 'Partenaire fictif recette', 'partenaire-recette@example.test', 'FR', 'Recette Stripe test', 30, 'promo_recettepart20', now())
       ON CONFLICT (id) DO UPDATE SET status='ACCEPTE', "commissionRate"=30, "promoCodeId"='promo_recettepart20'`);
}

async function payCheckout(url, email) {
  const { chromium } = require('/opt/node-tools/node_modules/playwright');
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox'],
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined,
  });
  const page = await browser.newPage({ locale: 'fr-FR' });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    const fill = async (sel, v) => { const l = page.locator(sel).first(); if (await l.count()) await l.fill(v); };
    const card = page.locator('[data-testid="card-accordion-item-button"]');
    if (await card.count()) await card.click();
    await fill('input#email', email);
    await page.locator('input#cardNumber').fill(['4242', '4242', '4242', '4242'].join(''));
    await page.locator('input#cardExpiry').fill('12 / 34');
    await page.locator('input#cardCvc').fill('123');
    await fill('input#billingName', 'Recette Stripe');
    const country = page.locator('select#billingCountry');
    if (await country.count()) await country.selectOption('FR');
    await fill('input#billingAddressLine1', '1 rue de la Recette');
    await fill('input#billingPostalCode', '75001');
    await fill('input#billingLocality', 'Paris');
    await page.locator('button[data-testid="hosted-payment-submit-button"], .SubmitButton').first().click();
    await page.waitForURL(/checkout=success/, { timeout: 120000 });
    return new URL(page.url()).searchParams.get('session_id');
  } finally {
    await browser.close();
  }
}

async function run() {
  seedPromos();
  const A = await register('Payeur');
  const B = await register('Autre');
  const C = await register('Offert');
  const D = await register('Web');
  const P = await register('Partenaire');
  const adm = await register('Admin');
  sql(`UPDATE "User" SET role='ADMIN' WHERE email='${adm.email}'`);
  const admTok = (await call('POST', '/auth/login', { body: { email: adm.email, password: 'Password12!' } })).data?.access_token;
  record('0. Comptes fictifs sur la base locale', 'LOCAL', !!A.token && !!admTok && (await balance(A)) === 0, 'base boligo_stripe (127.0.0.1:5433), 6 comptes');

  // 1. Prix TTC
  const plans = await call('GET', '/payment/plans');
  const plan = plans.data?.plans?.[0];
  record('1. Prix TTC affiché par /payment/plans', 'LOCAL', plans.status === 200 && plan?.price === 15 && /TTC/.test(plan?.priceDisplay), `HTTP ${plans.status}, ${plan?.priceDisplay} — ${plan?.priceNote}`);

  // 3. Paiement réussi (carte de test pm_card_visa)
  const iA = await call('POST', '/payment/create-payment-intent', { token: A.token, body: { optionId: 'parcours_harmonie', earlyStartConsent: true } });
  const piA = piOf(iA.data);
  const confA = await stripe('POST', `/payment_intents/${piA}/confirm`, { payment_method: 'pm_card_visa', return_url: 'https://example.test/retour' });
  const doneA = await call('POST', '/payment/confirm', { token: A.token, body: { paymentIntentId: piA } });
  record('3. Paiement réussi (pm_card_visa) puis /payment/confirm', 'RÉEL Stripe test', confA.status === 'succeeded' && confA.livemode === false && confA.amount === 1500 && doneA.data?.credited === true && (await balance(A)) === 1,
    `${piA} statut=${confA.status} livemode=${confA.livemode} montant=${confA.amount} ; confirm HTTP ${doneA.status} credited=${doneA.data?.credited} solde=${await balance(A)}`);

  // 1bis. TVA sur la facture
  const inv = sql(`SELECT i.status||'|'||i."taxRatePercent"||'|'||i."taxCents"||'|'||i."totalExclTaxCents"||'|'||coalesce(i."stripeObjectId",'') FROM "Invoice" i JOIN "Payment" p ON p.id=i."paymentId" WHERE p."stripePaymentIntentId"='${piA}' AND i.kind='facture'`);
  const [invSt, rate, tax, ht, invId] = inv.split('|');
  const sInv = invId ? await stripe('GET', `/invoices/${invId}`) : null;
  record('1bis. TVA de la facture (facturation active, client France)', 'RÉEL Stripe test', invSt === 'emise' && Number(rate) === 20 && tax === '250' && ht === '1250' && sInv?.status === 'paid' && sInv?.livemode === false,
    `registre ${invSt}, taux ${rate} %, HT ${ht} c, TVA ${tax} c ; facture Stripe ${invId} statut=${sInv?.status} total=${sInv?.total} livemode=${sInv?.livemode}`);

  // 2. Codes de réduction
  const c50 = await call('POST', '/payment/check-promo', { token: B.token, body: { code: 'recette50' } });
  const i50 = await call('POST', '/payment/create-payment-intent', { token: B.token, body: { promoCode: 'RECETTE50', earlyStartConsent: true } });
  const pi50 = piOf(i50.data);
  const s50 = await stripe('GET', `/payment_intents/${pi50}`);
  record('2a. RECETTE50 : montant réduit envoyé à Stripe', 'RÉEL Stripe test', c50.data?.finalAmount === 750 && i50.data?.finalAmount === 750 && s50.amount === 750 && s50.livemode === false,
    `check-promo ${c50.data?.message} ; ${pi50} amount=${s50.amount} livemode=${s50.livemode} statut=${s50.status}`);
  const before100 = await balance(C);
  const a100 = await call('POST', '/payment/apply-promo', { token: C.token, body: { code: 'RECETTE100' } });
  const a100b = await call('POST', '/payment/apply-promo', { token: C.token, body: { code: 'RECETTE100' } });
  const i100 = await call('POST', '/payment/create-payment-intent', { token: C.token, body: { promoCode: 'RECETTE100', earlyStartConsent: true } });
  record('2b. RECETTE100 : offert, sans Stripe', 'LOCAL (aucun appel Stripe)', a100.data?.isFree === true && (await balance(C)) === before100 + 1 && a100b.status === 400 && i100.status === 400,
    `apply-promo HTTP ${a100.status} isFree=${a100.data?.isFree} solde ${before100}→${await balance(C)} ; 2e usage HTTP ${a100b.status} « ${a100b.data?.message} » ; create-intent HTTP ${i100.status}`);
  const bad = await call('POST', '/payment/check-promo', { token: B.token, body: { code: 'NEXISTEPAS' } });
  const badI = await call('POST', '/payment/create-payment-intent', { token: B.token, body: { promoCode: 'NEXISTEPAS', earlyStartConsent: true } });
  record('2c. Code invalide', 'LOCAL', bad.data?.isValid === false && badI.status === 400, `check-promo « ${bad.data?.message} » ; create-intent HTTP ${badI.status} « ${badI.data?.message} »`);
  const exp = await call('POST', '/payment/check-promo', { token: B.token, body: { code: 'RECETTEEXPIRE' } });
  const epu = await call('POST', '/payment/check-promo', { token: B.token, body: { code: 'RECETTEEPUISE' } });
  const epuA = await call('POST', '/payment/create-payment-intent', { token: B.token, body: { promoCode: 'RECETTEEPUISE', earlyStartConsent: true } });
  record('2d. Code expiré / épuisé', 'LOCAL', exp.data?.isValid === false && /expir/i.test(exp.data?.message) && epu.data?.isValid === false && /puis/i.test(epu.data?.message) && epuA.status === 400,
    `expiré « ${exp.data?.message} » ; épuisé « ${epu.data?.message} » ; create-intent HTTP ${epuA.status}`);

  // 4. Paiement refusé
  const b0 = await balance(A);
  const iR = await call('POST', '/payment/create-payment-intent', { token: A.token, body: { earlyStartConsent: true } });
  const piR = piOf(iR.data);
  const confR = await stripe('POST', `/payment_intents/${piR}/confirm`, { payment_method: 'pm_card_visa_chargeDeclined', return_url: 'https://example.test/retour' });
  const sR = await stripe('GET', `/payment_intents/${piR}`);
  const doneR = await call('POST', '/payment/confirm', { token: A.token, body: { paymentIntentId: piR } });
  record('4. Paiement refusé (pm_card_visa_chargeDeclined) : aucun crédit', 'RÉEL Stripe test', confR.error?.code === 'card_declined' && sR.status === 'requires_payment_method' && sR.livemode === false && doneR.data?.credited === false && (await balance(A)) === b0 && txCount(piR) === '0',
    `${piR} erreur=${confR.error?.code}/${confR.error?.decline_code} statut=${sR.status} livemode=${sR.livemode} ; confirm HTTP ${doneR.status} ${JSON.stringify(doneR.data)} ; solde ${b0}→${await balance(A)}`);

  // 5. Paiement interrompu (PaymentIntent RECETTE50 créé, jamais confirmé)
  const done5 = await call('POST', '/payment/confirm', { token: B.token, body: { paymentIntentId: pi50 } });
  record('5. Paiement interrompu : /payment/confirm sur un PaymentIntent jamais confirmé', 'RÉEL Stripe test', done5.status === 200 && done5.data?.credited === false && (await balance(B)) === 0 && txCount(pi50) === '0',
    `${pi50} ; HTTP ${done5.status} ${JSON.stringify(done5.data)} (aucun champ message) ; solde B=${await balance(B)}`);

  // 7. Confirmation : PaymentIntent d'un autre membre ; référence invalide
  const other = await call('POST', '/payment/confirm', { token: B.token, body: { paymentIntentId: piA } });
  const junk = await call('POST', '/payment/confirm', { token: B.token, body: { paymentIntentId: 'pi_x"; DROP' } });
  record('7. Confirmation d’un PaymentIntent d’un autre membre / non payé / invalide', 'RÉEL Stripe test', other.status === 403 && junk.status === 400 && done5.data?.credited === false && (await balance(B)) === 0,
    `autre membre HTTP ${other.status} « ${other.data?.message} » ; non payé credited=false (cas 5) ; référence invalide HTTP ${junk.status}`);

  // 8. Crédit unique : confirm x2 + webhook payment_intent.succeeded (signé localement, objet relu chez Stripe)
  const again1 = await call('POST', '/payment/confirm', { token: A.token, body: { paymentIntentId: piA } });
  const again2 = await call('POST', '/payment/confirm', { token: A.token, body: { paymentIntentId: piA } });
  const piAobj = await stripe('GET', `/payment_intents/${piA}`);
  const eSucc = evt('payment_intent.succeeded', piAobj);
  const w8 = await sendEvent(eSucc);
  record('8. Crédit attribué une seule fois (confirm ×3 + webhook succeeded)', 'RÉEL Stripe test + webhook SIMULÉ', again1.data?.alreadyCredited === true && again2.data?.alreadyCredited === true && w8.status === 200 && (await balance(A)) === 1 && txCount(piA) === '1',
    `confirm 2 et 3 : alreadyCredited=${again1.data?.alreadyCredited}/${again2.data?.alreadyCredited} ; webhook ${eSucc.id} HTTP ${w8.status} ; solde=${await balance(A)} ; transactions=${txCount(piA)}`);

  // 11. Idempotence et signature
  const w11 = await sendEvent(eSucc);
  const badSig = await sendEvent(evt('payment_intent.succeeded', piAobj), 'whsec_faux_secret');
  const noSig = await call('POST', '/payment/webhook', { raw: JSON.stringify(eSucc) });
  record('11. Webhook rejoué (même evt_) et signature invalide', 'SIMULÉ (signé localement)', w11.status === 200 && w11.data?.duplicate === true && (await balance(A)) === 1 && badSig.status === 400 && noSig.status === 400,
    `rejeu HTTP ${w11.status} ${JSON.stringify(w11.data)} ; solde=${await balance(A)} ; signature invalide HTTP ${badSig.status} ; sans signature HTTP ${noSig.status} ; StripeEvent=${sql(`SELECT count(*) FROM "StripeEvent" WHERE id='${eSucc.id}'`)}`);

  // 9. Historique et facture
  const pur = await call('GET', '/payment/purchases', { token: A.token });
  const pdf = await call('GET', `/payment/invoices/${piA}`, { token: A.token });
  const pdfOther = await call('GET', `/payment/invoices/${piA}`, { token: B.token });
  const p0 = Array.isArray(pur.data) ? pur.data[0] : null;
  record('9. Historique /payment/purchases et facture /payment/invoices/:ref', 'RÉEL Stripe test', pur.status === 200 && pur.data.length === 1 && p0?.amountCents === 1500 && !!p0?.invoiceNumber && /^https:\/\/pay\.stripe\.com\//.test(pdf.data?.url || '') && pdfOther.status === 404,
    `achats=${pur.data?.length} montant=${p0?.amountCents} facture n°${p0?.invoiceNumber} canWithdraw=${p0?.canWithdraw} ; PDF ${pdf.data?.url ? 'pay.stripe.com/…' : 'absent'} ; autre membre HTTP ${pdfOther.status}`);

  // 12. Rétractation : demande, liste admin, refus (le remboursement admin ferait un vrai refund : non exécuté)
  const wr = await call('POST', '/payment/withdrawals', { token: A.token, body: { paymentRef: piA } });
  const wr2 = await call('POST', '/payment/withdrawals', { token: A.token, body: { paymentRef: piA } });
  const wrOther = await call('POST', '/payment/withdrawals', { token: B.token, body: { paymentRef: piA } });
  const list = await call('GET', '/admin/billing/withdrawals', { token: admTok });
  const mine = Array.isArray(list.data) ? list.data.find((w) => w.payment?.ref === piA) : null;
  const noNote = await call('POST', `/admin/billing/withdrawals/${mine?.id}/decide`, { token: admTok, body: { action: 'refuse' } });
  const ref = await call('POST', `/admin/billing/withdrawals/${mine?.id}/decide`, { token: admTok, body: { action: 'refuse', note: 'Recette : refus de test' } });
  const memberAdmin = await call('GET', '/admin/billing/withdrawals', { token: A.token });
  record('12. Rétractation : demande, liste admin, refus motivé', 'LOCAL (aucun appel Stripe)', wr.data?.status === 'recue' && wr2.data?.alreadyRequested === true && wrOther.status === 404 && mine?.suggestedRefundCents === 1500 && noNote.status === 400 && ref.data?.status === 'refusee' && memberAdmin.status >= 401,
    `demande HTTP ${wr.status} ${wr.data?.status} ; doublon alreadyRequested=${wr2.data?.alreadyRequested} ; autre membre HTTP ${wrOther.status} ; admin : remboursement suggéré ${mine?.suggestedRefundCents} c ; refus sans motif HTTP ${noNote.status} ; refus ${ref.data?.status} ; membre sur route admin HTTP ${memberAdmin.status}`);

  // 10. Remboursements (paiement réel avec code partenaire ; remboursements SIMULÉS par événement signé)
  const iP = await call('POST', '/payment/create-payment-intent', { token: P.token, body: { promoCode: 'RECETTEPART20', earlyStartConsent: true } });
  const piP = piOf(iP.data);
  const confP = await stripe('POST', `/payment_intents/${piP}/confirm`, { payment_method: 'pm_card_visa', return_url: 'https://example.test/retour' });
  const doneP = await call('POST', '/payment/confirm', { token: P.token, body: { paymentIntentId: piP } });
  const sale = sql(`SELECT "amountCents"||'|'||"commissionCents" FROM "PartnerCommission" WHERE "paymentRef"='${piP}' AND kind='VENTE'`);
  record('10a. Paiement avec code partenaire (base du remboursement)', 'RÉEL Stripe test', confP.status === 'succeeded' && confP.amount === 1200 && confP.livemode === false && doneP.data?.credited === true && sale === '1200|360',
    `${piP} statut=${confP.status} montant=${confP.amount} livemode=${confP.livemode} ; commission vente ${sale} (montant|commission, taux 30 %)`);
  const charge = await stripe('GET', `/charges/${confP.latest_charge}`);
  const partial = { ...charge, amount_refunded: 600, refunded: false };
  const ePart = evt('charge.refunded', partial);
  const wP = await sendEvent(ePart);
  const wPdup = await sendEvent(ePart);
  const afterPart = sql(`SELECT status||'|'||"refundedCents" FROM "Payment" WHERE "stripePaymentIntentId"='${piP}'`);
  const avoir1 = sql(`SELECT i.status||'|'||i."totalInclTaxCents"||'|'||coalesce(i."stripeObjectId",'') FROM "Invoice" i JOIN "Payment" p ON p.id=i."paymentId" WHERE p."stripePaymentIntentId"='${piP}' AND i.kind='avoir' ORDER BY i."createdAt"`).split('\n');
  const rep1 = sql(`SELECT coalesce(sum("commissionCents"),0) FROM "PartnerCommission" WHERE "paymentRef"='${piP}' AND kind='REPRISE'`);
  const balP1 = await balance(P);
  record('10b. Remboursement partiel (600/1200) : charge.refunded signé localement', 'SIMULÉ (événement signé ; aucun re_ réel) + avoir RÉEL Stripe test', wP.status === 200 && wPdup.data?.duplicate === true && afterPart === 'rembourse_partiel|600' && balP1 === 1 && avoir1.length === 1 && avoir1[0].startsWith('emise|600|') && rep1 === '-180',
    `${ePart.id} HTTP ${wP.status}, rejeu duplicate=${wPdup.data?.duplicate} ; Payment ${afterPart} ; crédit conservé (solde=${balP1}) ; avoir ${avoir1.join(' / ')} ; reprise commission ${rep1} c (prorata 50 %)`);
  const cn1 = avoir1[0]?.split('|')[2];
  const cnObj = cn1 ? await stripe('GET', `/credit_notes/${cn1}`) : null;
  const full = { ...charge, amount_refunded: 1200, refunded: true };
  const eFull = evt('charge.refunded', full);
  const wF = await sendEvent(eFull);
  const afterFull = sql(`SELECT status||'|'||"refundedCents" FROM "Payment" WHERE "stripePaymentIntentId"='${piP}'`);
  const avoirs = sql(`SELECT i.status||'|'||i."totalInclTaxCents" FROM "Invoice" i JOIN "Payment" p ON p.id=i."paymentId" WHERE p."stripePaymentIntentId"='${piP}' AND i.kind='avoir' ORDER BY i."createdAt"`).split('\n');
  const rep2 = sql(`SELECT coalesce(sum("commissionCents"),0) FROM "PartnerCommission" WHERE "paymentRef"='${piP}' AND kind='REPRISE'`);
  const refundTx = sql(`SELECT count(*)||'|'||coalesce(sum("creditAmount"),0) FROM "CreditTransaction" WHERE "paymentRef" LIKE '${piP}:remboursement:%'`);
  const balP2 = await balance(P);
  record('10c. Remboursement total (reste 600) : crédit retiré, 2e avoir, commission reprise en totalité', 'SIMULÉ (événement signé ; aucun re_ réel) + avoirs RÉELS Stripe test', wF.status === 200 && afterFull === 'rembourse|1200' && balP2 === 0 && avoirs.length === 2 && avoirs.every((a) => a.startsWith('emise|600')) && rep2 === '-360' && refundTx === '2|-1' && cnObj?.livemode === false,
    `${eFull.id} HTTP ${wF.status} ; Payment ${afterFull} ; solde ${balP1}→${balP2} ; avoirs ${avoirs.join(' / ')} (1er avoir Stripe ${cn1} statut=${cnObj?.status} livemode=${cnObj?.livemode}) ; reprise totale ${rep2} c ; écritures ${refundTx}`);
  const wF2 = await sendEvent({ ...eFull, id: `${eFull.id}b` });
  record('10d. Même état de remboursement renvoyé sous un autre evt_ : aucun effet', 'SIMULÉ', wF2.status === 200 && (await balance(P)) === 0 && sql(`SELECT count(*) FROM "CreditTransaction" WHERE "paymentRef" LIKE '${piP}:remboursement:%'`) === '2' && sql(`SELECT coalesce(sum("commissionCents"),0) FROM "PartnerCommission" WHERE "paymentRef"='${piP}' AND kind='REPRISE'`) === '-360',
    `HTTP ${wF2.status} ; solde=${await balance(P)} ; écritures inchangées`);

  // 6. Checkout web
  const cs = await call('POST', '/payment/checkout-session', { token: D.token, body: { optionId: 'parcours_harmonie', earlyStartConsent: true } });
  const s0 = cs.data?.sessionId ? await stripe('GET', `/checkout/sessions/${cs.data.sessionId}`) : null;
  const early = await call('POST', '/payment/confirm-checkout', { token: D.token, body: { sessionId: cs.data?.sessionId } });
  const otherCs = await call('POST', '/payment/confirm-checkout', { token: A.token, body: { sessionId: cs.data?.sessionId } });
  record('6a. /payment/checkout-session : session de TEST', 'RÉEL Stripe test', cs.status < 300 && s0?.livemode === false && s0?.amount_total === 1500 && s0?.payment_status === 'unpaid' && early.data?.credited === false && otherCs.status === 403,
    `${cs.data?.sessionId} livemode=${s0?.livemode} montant=${s0?.amount_total} statut=${s0?.payment_status} ; confirm-checkout avant paiement ${JSON.stringify(early.data)} ; autre membre HTTP ${otherCs.status}`);
  if (CHECKOUT_BROWSER) {
    let sid = null; let why = '';
    try { sid = await payCheckout(cs.data.url, D.email); } catch (e) { why = String(e.message).split('\n')[0].slice(0, 200); }
    const s1 = await stripe('GET', `/checkout/sessions/${cs.data.sessionId}`);
    const piD = typeof s1.payment_intent === 'string' ? s1.payment_intent : s1.payment_intent?.id;
    const doneD = await call('POST', '/payment/confirm-checkout', { token: D.token, body: { sessionId: cs.data.sessionId } });
    const doneD2 = await call('POST', '/payment/confirm-checkout', { token: D.token, body: { sessionId: cs.data.sessionId } });
    record('6b. Page checkout.stripe.com payée dans Chromium (carte de test 4242), retour /payment/confirm-checkout', 'RÉEL Stripe test', sid === cs.data.sessionId && s1.payment_status === 'paid' && doneD.data?.credited === true && doneD2.data?.alreadyCredited === true && (await balance(D)) === 1,
      sid ? `session payée statut=${s1.payment_status} ${piD} ; confirm-checkout credited=${doneD.data?.credited}, 2e appel alreadyCredited=${doneD2.data?.alreadyCredited} ; solde=${await balance(D)}` : `navigateur : ${why} ; statut session=${s1.payment_status}`);
  }
}

(async () => {
  let fatal = null;
  try { await run(); } catch (e) { fatal = scrub(e && e.message ? e.message : e).slice(0, 300); record('Arrêt de la recette', 'ERREUR', false, fatal); }
  const n = results.filter((r) => r.ok).length;
  console.log(`\n${n}/${results.length} vérifications réussies`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const doc = {
    date: '2026-10-14', api: 'locale (127.0.0.1)', base: 'boligo_stripe (127.0.0.1:5433)', stripe: 'compte de TEST (livemode=false vérifié sur chaque objet relu)',
    webhookSecret: 'secret LOCAL (aucun webhook du compte Stripe créé ou modifié)',
    remboursements: 'simulés par événement signé : aucun remboursement réel (le webhook TEST du compte pointe vers Render)',
    reussis: n, total: results.length, resultats: results,
  };
  fs.writeFileSync(OUT, scrub(JSON.stringify(doc, null, 2)));
  process.exit(fatal || n !== results.length ? 1 : 0);
})();
