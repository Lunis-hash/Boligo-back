/* eslint-disable no-console */
/**
 * Recette Stripe RÉELLE en mode TEST (compte « environnement de test BOLIGO »).
 * Toujours lancée par e2e/recette-stripe-test.sh, qui prépare la base locale
 * dédiée, le listener `stripe listen` et le backend (build final).
 *
 *   preflight       compte, permissions de la clé, webhooks existants (aucune création)
 *   run             recette complète (paiement de test 4242 et remboursement)
 *   webhooks-after  compare les webhooks du compte à l'instantané de départ
 *
 * La clé n'est passée à Stripe CLI que par la variable STRIPE_API_KEY, jamais en
 * argument ; toutes les sorties sont masquées par le script shell.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const MODE = process.argv[2];
const KEY = process.env.STRIPE_TEST_SECRET_KEY || '';
const ACCOUNT = process.env.ACCOUNT || '';
const WORK = process.env.WORK || '';
const OUT = process.env.OUT || '';
const STRIPE_BIN = process.env.STRIPE_BIN || 'stripe';
const SNAPSHOT = path.join(WORK, 'webhooks-avant.json');
const RENDER_URL = 'https://boligo-back.onrender.com/api/payment/webhook';
const RENDER_EVENTS = ['charge.dispute.closed', 'charge.dispute.created', 'charge.refunded', 'payment_intent.succeeded'];
if (!/^(sk|rk)_test_/.test(KEY)) throw new Error('Clé Stripe de TEST requise : refus.');
if (!/^acct_/.test(ACCOUNT) || !WORK) throw new Error('À lancer par recette-stripe-test.sh');

const results = [];
const record = (step, ok, detail = '') => {
  results.push({ step, ok: !!ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`);
  return !!ok;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Stripe CLI ; la clé passe par l'environnement du processus fils uniquement. */
function stripe(args, { json = true } = {}) {
  const r = spawnSync(STRIPE_BIN, ['--color', 'off', ...args], {
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, STRIPE_API_KEY: KEY, STRIPE_TEST_SECRET_KEY: '', STRIPE_CLI_TELEMETRY_OPTOUT: '1' },
  });
  // JSON sur la sortie standard seulement (le CLI écrit ses messages annexes sur stderr).
  const out = r.stdout || '';
  const text = `${out}${r.stderr || ''}`;
  if (!json) return { status: r.status, text };
  const start = out.indexOf('{');
  let data = null;
  try { data = start >= 0 ? JSON.parse(out.slice(start)) : null; } catch { data = null; }
  return { status: r.status, text, data };
}
const sget = (p, query = {}) => stripe(['get', p, ...Object.entries(query).flatMap(([k, v]) => ['-d', `${k}=${v}`])]).data;
const isPermissionError = (d) => !!d?.error && /permission/i.test(d.error.message || '');

// ─── Contrôles préalables (aucune création chez Stripe) ─────────────────────
function preflight() {
  let ok = true;
  const acct = sget('/v1/account');
  ok = record('Compte Stripe imposé (environnement de test BOLIGO)', acct?.id === ACCOUNT, `compte ${acct?.id || acct?.error?.message || 'illisible'}`) && ok;

  // Lectures nécessaires à la recette.
  for (const p of ['/v1/checkout/sessions', '/v1/payment_intents', '/v1/charges', '/v1/customers', '/v1/invoices', '/v1/refunds', '/v1/events', '/v1/webhook_endpoints']) {
    const d = sget(p, { limit: 1 });
    ok = record(`Permission lecture ${p}`, Array.isArray(d?.data), d?.error?.message ? d.error.message.slice(0, 120) : '') && ok;
  }
  // Écritures : requêtes volontairement invalides. Une clé autorisée reçoit une
  // erreur de paramètre (rien n'est créé), une clé non autorisée une erreur de permission.
  const probes = [
    ['/v1/checkout/sessions', []],
    ['/v1/customers', ['-d', 'zz_recette_sonde=1']],
    ['/v1/invoices', []],
    ['/v1/invoiceitems', []],
    ['/v1/refunds', []],
  ];
  for (const [p, extra] of probes) {
    const d = stripe(['post', p, ...extra]).data;
    const paramError = d?.error?.type === 'invalid_request_error' && !isPermissionError(d);
    ok = record(`Permission écriture ${p} (sonde sans création)`, paramError, d?.error ? `${d.error.code || ''} ${String(d.error.message).slice(0, 100)}` : 'réponse inattendue (objet créé ?)') && ok;
  }

  // Webhooks existants : instantané et décision.
  const list = sget('/v1/webhook_endpoints', { limit: 100 });
  if (!Array.isArray(list?.data)) {
    record('Webhooks du compte lisibles', false, list?.error?.message || 'lecture impossible');
    return false;
  }
  const eps = list.data.map((e) => ({ id: e.id, url: e.url, status: e.status, enabled_events: [...e.enabled_events].sort(), api_version: e.api_version, description: e.description, livemode: e.livemode }));
  fs.writeFileSync(SNAPSHOT, JSON.stringify(eps, null, 2));
  if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'webhooks-avant.json'), JSON.stringify(eps, null, 2)); }
  for (const e of eps) console.log(`   webhook ${e.id} ${e.status} ${e.url} [${e.enabled_events.join(', ')}]`);
  const remote = eps.filter((e) => e.status === 'enabled' && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(e.url));
  const onlyKnownRender = remote.every((e) => e.url === RENDER_URL && JSON.stringify(e.enabled_events) === JSON.stringify(RENDER_EVENTS));
  if (remote.length === 0) console.log('WEBHOOK_RENDER_OK desactive');
  else if (onlyKnownRender) console.log('WEBHOOK_RENDER_OK accepte');
  record('Webhooks distants actifs identifiés', remote.length === 0 || onlyKnownRender, remote.length ? `${remote.length} actif(s) vers Render : effets décrits dans docs/DEPLOIEMENT_RENDER.md §1` : 'aucun');
  ok = ok && (remote.length === 0 || onlyKnownRender);
  return ok;
}

function webhooksAfter() {
  const before = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const list = sget('/v1/webhook_endpoints', { limit: 100 });
  if (!Array.isArray(list?.data)) { console.log('⚠️ Webhooks illisibles après la recette : comparaison impossible'); return; }
  const after = list.data.map((e) => ({ id: e.id, url: e.url, status: e.status, enabled_events: [...e.enabled_events].sort(), api_version: e.api_version, description: e.description, livemode: e.livemode }));
  if (OUT) fs.writeFileSync(path.join(OUT, 'webhooks-apres.json'), JSON.stringify(after, null, 2));
  const same = JSON.stringify(before) === JSON.stringify(after);
  console.log(`${same ? '✅' : '⚠️'} Configuration des webhooks Stripe ${same ? 'identique avant et après la recette' : 'MODIFIÉE pendant la recette (voir webhooks-avant/apres.json)'}`);
}

// ─── Recette ─────────────────────────────────────────────────────────────────
const API = process.env.API_URL || '';
const DB_URL = process.env.DB_URL || '';
const LISTEN_LOG = process.env.LISTEN_LOG || '';
const BACKEND_LOG = process.env.BACKEND_LOG || '';
const LISTEN_PID = Number(process.env.LISTEN_PID || 0);
const sql = (q) => execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-tA', DB_URL, '-c', q], { encoding: 'utf8' }).trim();
async function call(method, p, { token, body } = {}) {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
async function register(tag) {
  const email = `stripe-${tag.toLowerCase()}-${Date.now()}@example.test`;
  const reg = await call('POST', '/auth/register', {
    body: { email, password: 'Password12!', firstName: tag, lastName: 'Recette', birthDate: '1990-04-12T00:00:00.000Z', gender: 'H', city: 'Paris, France', telephone: `+3361${Math.floor(1e7 + Math.random() * 8e7)}`, job: 'Architecte', meetingScope: 'international', acceptTerms: true, termsVersion: '2026-10-03' },
  });
  if (reg.status >= 300) throw new Error(`inscription ${tag} : ${JSON.stringify(reg.data)}`);
  const ver = await call('POST', '/auth/verify-email', { body: { email, code: '1234' } });
  return { email, token: ver.data.access_token, userId: ver.data.userId };
}
const balance = async (u) => (await call('GET', '/credit/balance', { token: u.token })).data?.credits;
async function waitFor(fn, ms) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v || Date.now() > end) return v;
    await sleep(2000);
  }
}
const listenerAlive = () => { try { process.kill(LISTEN_PID, 0); return true; } catch { return false; } };
/** Livraisons RÉELLES acceptées par le backend local pour un événement (journal du listener). */
const deliveries = (evtId) => fs.readFileSync(LISTEN_LOG, 'utf8').split('\n').filter((l) => l.includes('<--') && l.includes('[200]') && l.includes(evtId)).length;
const backendReceived = (type) => fs.readFileSync(BACKEND_LOG, 'utf8').split('\n').filter((l) => l.includes(`Événement Stripe reçu : ${type}`)).length;
const eventFor = (type, objectId) => (sget('/v1/events', { type, limit: 20 })?.data || []).find((e) => e.data?.object?.id === objectId || e.data?.object?.payment_intent === objectId);

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
    await page.screenshot({ path: path.join(OUT, '01-checkout.png'), fullPage: true });
    const fill = async (sel, v) => { const l = page.locator(sel).first(); if (await l.count()) await l.fill(v); };
    const card = page.locator('[data-testid="card-accordion-item-button"]');
    if (await card.count()) await card.click();
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
    await page.locator('button[data-testid="hosted-payment-submit-button"], .SubmitButton').first().click();
    await page.waitForURL(/checkout=success/, { timeout: 120000 });
    await page.screenshot({ path: path.join(OUT, '03-retour-succes.png'), fullPage: true });
    return new URL(page.url()).searchParams.get('session_id');
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, '99-checkout-erreur.png'), fullPage: true }).catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
}

async function run() {
  const must = (ok, why) => { if (!ok) throw new Error(why); };
  must(listenerAlive(), 'listener Stripe arrêté');
  const A = await register('Payeur');
  const admin = await register('Admin');
  sql(`UPDATE "User" SET role='ADMIN' WHERE id='${admin.userId}'`);
  const adminTok = (await call('POST', '/auth/login', { body: { email: admin.email, password: 'Password12!' } })).data?.access_token;
  must(record('Comptes fictifs créés sur la base locale dédiée', !!A.token && !!adminTok && (await balance(A)) === 0), 'comptes');

  // 1. Création du paiement : session Checkout par l'API, relue chez Stripe.
  const cs = await call('POST', '/payment/checkout-session', { token: A.token, body: { optionId: 'parcours_harmonie', earlyStartConsent: true } });
  must(record('1. Création du paiement : session Checkout créée par l’API', cs.status < 300 && /^https:\/\/checkout\.stripe\.com\//.test(cs.data?.url || ''), `HTTP ${cs.status}, ${cs.data?.finalAmount} centimes`), JSON.stringify(cs.data));
  const s0 = sget(`/v1/checkout/sessions/${cs.data.sessionId}`);
  must(record('   Session relue chez Stripe : mode test, montant, membre rattaché, non payée', s0?.livemode === false && s0.amount_total === cs.data.finalAmount && s0.metadata?.userId === A.userId && s0.payment_status === 'unpaid', `livemode=${s0?.livemode} montant=${s0?.amount_total} statut=${s0?.payment_status}`), 'session');

  // 2. Page Checkout réelle, carte de test 4242.
  const sessionId = await payCheckout(cs.data.url, A.email);
  const s1 = sget(`/v1/checkout/sessions/${cs.data.sessionId}`);
  const pi = typeof s1?.payment_intent === 'string' ? s1.payment_intent : s1?.payment_intent?.id;
  must(record('2. Page Stripe Checkout payée (carte de test 4242), retour success', sessionId === cs.data.sessionId && s1?.payment_status === 'paid' && !!pi, `statut=${s1?.payment_status} PI=${pi}`), 'checkout');

  // 3. Webhook réel reçu localement, avant toute confirmation de l'app.
  const evt = await waitFor(async () => eventFor('payment_intent.succeeded', pi), 60000);
  const got = await waitFor(async () => (evt && deliveries(evt.id) >= 1 && (await balance(A)) === 1) || null, 90000);
  must(record('3. Webhook payment_intent.succeeded livré par Stripe et accepté localement (HTTP 200)', !!got, `événement ${evt?.id} livraisons=${evt ? deliveries(evt.id) : 0} crédits=${await balance(A)}`), 'webhook');

  // 4. Crédit unique : confirmation de l'app + nouvelle livraison réelle de l'événement.
  const conf = await call('POST', '/payment/confirm-checkout', { token: A.token, body: { sessionId: cs.data.sessionId } });
  must(listenerAlive(), 'listener Stripe arrêté');
  const before = deliveries(evt.id);
  // Sans --webhook-endpoint : nouvelle livraison aux listeners Stripe CLI.
  const resend = stripe(['events', 'resend', evt.id]);
  const again = await waitFor(async () => deliveries(evt.id) > before || null, 60000);
  const tx = sql(`SELECT count(*) FROM "CreditTransaction" WHERE "paymentRef"='${pi}' AND type='achat'`);
  record('4. Crédit unique : confirmation de l’app + nouvelle livraison réelle de l’événement', conf.status < 300 && !!again && (await balance(A)) === 1 && tx === '1',
    `confirmation HTTP ${conf.status}, renvoi CLI code ${resend.status}, livraisons ${before}→${deliveries(evt.id)}, crédits=${await balance(A)}, transactions=${tx}`);
  const pay = sql(`SELECT status || '|' || "totalAmountCents" FROM "Payment" WHERE "stripePaymentIntentId"='${pi}'`);
  record('   Paiement enregistré une seule fois (table Payment)', pay === `reussi|${cs.data.finalAmount}`, pay || 'absent');

  // 5. Facture Stripe.
  const inv = await waitFor(async () => {
    const r = await call('GET', `/payment/invoices/${pi}`, { token: A.token });
    return r.data?.url ? r : null;
  }, 60000);
  const invRow = sql(`SELECT i.status || '|' || coalesce(i."stripeObjectId", '') FROM "Invoice" i JOIN "Payment" p ON p.id = i."paymentId" WHERE p."stripePaymentIntentId"='${pi}' AND i.kind='facture'`);
  const stripeInv = invRow.split('|')[1] ? sget(`/v1/invoices/${invRow.split('|')[1]}`) : null;
  record('5. Facture : émise, payée chez Stripe, PDF disponible', !!inv?.data?.url && invRow.startsWith('emise|') && stripeInv?.status === 'paid' && stripeInv?.livemode === false,
    `registre=${invRow || 'absent'} Stripe=${stripeInv?.status || '—'} PDF=${inv ? 'oui' : 'non'}`);

  // 6. Remboursement : rétractation, décision admin, remboursement Stripe, webhook réel.
  const wr = await call('POST', '/payment/withdrawals', { token: A.token, body: { paymentRef: pi } });
  const wid = sql(`SELECT w.id FROM "WithdrawalRequest" w JOIN "Payment" p ON p.id = w."paymentId" WHERE p."stripePaymentIntentId"='${pi}'`);
  const dec = await call('POST', `/admin/billing/withdrawals/${wid}/decide`, { token: adminTok, body: { action: 'refund' } });
  const refunds = (await waitFor(async () => {
    const l = sget('/v1/refunds', { payment_intent: pi })?.data || [];
    return l.some((r) => r.status === 'succeeded') ? l : null;
  }, 60000)) || [];
  record('6. Remboursement réel chez Stripe (rétractation acceptée par l’admin)', wr.status < 300 && dec.status < 300 && refunds.some((r) => r.status === 'succeeded'),
    `demande HTTP ${wr.status}, décision HTTP ${dec.status}, ${refunds.map((r) => `${r.id}:${r.status}:${r.amount}`).join(',') || 'aucun'}`);
  const revt = await waitFor(async () => eventFor('charge.refunded', pi), 60000);
  const rgot = await waitFor(async () => (revt && deliveries(revt.id) >= 1 && sql(`SELECT status FROM "Payment" WHERE "stripePaymentIntentId"='${pi}'`) === 'rembourse') || null, 90000);
  record('   Webhook charge.refunded livré par Stripe et accepté localement', !!rgot, `événement ${revt?.id} livraisons=${revt ? deliveries(revt.id) : 0}`);

  // 7. Crédits mis à jour.
  const refundTx = sql(`SELECT count(*) || '|' || coalesce(sum("creditAmount"), 0) FROM "CreditTransaction" WHERE "paymentRef" LIKE '${pi}:remboursement:%'`);
  record('7. Crédits mis à jour : crédit retiré une seule fois', (await balance(A)) === 0 && refundTx === '1|-1', `crédits=${await balance(A)}, écriture de remboursement=${refundTx}`);
  record('   Réceptions par le backend local (journal)', backendReceived('payment_intent.succeeded') >= 2 && backendReceived('charge.refunded') >= 1,
    `payment_intent.succeeded=${backendReceived('payment_intent.succeeded')}, charge.refunded=${backendReceived('charge.refunded')}`);
}

(async () => {
  let ok = false;
  try {
    if (MODE === 'preflight') ok = preflight();
    else if (MODE === 'webhooks-after') { webhooksAfter(); ok = true; }
    else if (MODE === 'run') { fs.mkdirSync(OUT, { recursive: true }); await run(); ok = results.every((r) => r.ok); }
    else throw new Error(`mode inconnu : ${MODE}`);
  } catch (e) {
    record('Arrêt de la recette', false, String(e && e.message ? e.message : e).slice(0, 300));
  } finally {
    if (MODE === 'run') {
      const n = results.filter((r) => r.ok).length;
      console.log(`\n${n}/${results.length} vérifications Stripe réussies (aucun résultat simulé)`);
      fs.writeFileSync(path.join(OUT, 'resultats.json'), JSON.stringify(results, null, 2).replace(/(sk|rk|pk)_(test|live)_[A-Za-z0-9]+/g, '<clé masquée>').replace(/whsec_[A-Za-z0-9]+/g, '<secret masqué>'));
    }
    process.exit(ok ? 0 : 1);
  }
})();
