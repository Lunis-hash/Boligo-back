/* eslint-disable no-console */
/**
 * Recette du BUILD FINAL (local, comptes fictifs) : paiement Stripe en mode
 * TEST par webhook signé localement, attribution des crédits, accès au
 * parcours après paiement, tableau de bord administrateur (API).
 *
 * Aucun appel à Stripe : le backend est lancé avec STRIPE_WEBHOOK_SECRET=
 * whsec_… local ; les événements sont signés ici avec la bibliothèque
 * officielle (stripe.webhooks.generateTestHeaderString), comme le ferait
 * `stripe trigger`. Non vérifié contre le vrai Stripe test : création de la
 * session de paiement (aucune clé sk_test_ dans l'environnement).
 *
 *   API_URL=http://localhost:3000/api E2E_PSQL="psql postgresql://…" \
 *   STRIPE_WEBHOOK_SECRET=whsec_… node e2e/recette-paiement-admin.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Stripe = require(path.resolve(__dirname, '../../node_modules/stripe'));

const API = process.env.API_URL || 'http://localhost:3000/api';
const E2E_PSQL = process.env.E2E_PSQL || '';
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const OUT = path.resolve(__dirname, '..', '..', 'docs', 'recette-build-final');
fs.mkdirSync(OUT, { recursive: true });
if (!/localhost|127\.0\.0\.1/.test(API) || !/localhost|127\.0\.0\.1/.test(E2E_PSQL))
  throw new Error('Recette locale uniquement');
if (!/^whsec_/.test(SECRET)) throw new Error('STRIPE_WEBHOOK_SECRET local (whsec_…) requis');

const stripe = new Stripe('sk_test_dummy');
const results = [];
const record = (step, ok, detail = '') => {
  results.push({ step, ok: !!ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`);
};
const sql = (q) => execSync(`${E2E_PSQL} -tA`, { input: q, encoding: 'utf8' }).trim();
async function call(method, p, { token, body, raw, headers } = {}) {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers || {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
async function register(tag, gender, birth) {
  const email = `recette-${tag}-${Date.now()}@example.test`;
  const reg = await call('POST', '/auth/register', {
    body: { email, password: 'Password12!', firstName: tag, lastName: 'Recette', birthDate: birth, gender, city: 'Paris, France', telephone: `+3361${Math.floor(1e7 + Math.random() * 8e7)}`, job: 'Architecte', meetingScope: 'international', acceptTerms: true, termsVersion: '2026-10-03' },
  });
  if (reg.status >= 300) throw new Error(`inscription ${tag} : ${JSON.stringify(reg.data)}`);
  const ver = await call('POST', '/auth/verify-email', { body: { email, code: '1234' } });
  return { email, token: ver.data.access_token, userId: ver.data.userId };
}
async function completeInterview(user) {
  await call('GET', '/interview/status', { token: user.token });
  for (let m = 0; m <= 10; m++) {
    const q = await call('GET', `/interview/questions/${m}`, { token: user.token });
    const answers = {};
    (q.data || []).forEach((question) => {
      answers[question.id] = question.input === 'ageRange' ? '24-45' : question.options[0]?.key || 'A';
    });
    await call('POST', '/interview/save-module', { token: user.token, body: { moduleNumber: m, moduleName: `Module ${m}`, answers } });
  }
  const st = await call('GET', '/interview/status', { token: user.token });
  return st.data?.isCompleted === true;
}
/** Événement Stripe signé (même format que les webhooks réels). */
function signed(event) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return { payload, header };
}
function paymentEvent(eventId, piId, userId) {
  return {
    id: eventId,
    object: 'event',
    type: 'payment_intent.succeeded',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: { object: { id: piId, object: 'payment_intent', amount: 1500, currency: 'eur', status: 'succeeded', livemode: false, metadata: { userId, credits: '1', planName: 'Parcours Harmonie' } } },
  };
}
const balance = async (u) => (await call('GET', '/credit/balance', { token: u.token })).data?.credits;

(async () => {
  try {
    const A = await register('Payeur', 'H', '1990-04-12T00:00:00.000Z');
    const B = await register('Payeuse', 'F', '1992-09-15T00:00:00.000Z');
    record('Comptes fictifs créés (inscription + code de vérification)', !!A.token && !!B.token);
    record('Grand Entretien terminé (A et B)', (await completeInterview(A)) && (await completeInterview(B)));

    // ── Webhook : refus sans signature, avec mauvaise signature.
    const ev = paymentEvent(`evt_test_${Date.now()}`, `pi_test_${Date.now()}`, A.userId);
    const unsigned = await call('POST', '/payment/webhook', { raw: JSON.stringify(ev) });
    record('Webhook sans signature → refusé (400)', unsigned.status === 400, `status ${unsigned.status}`);
    const forged = await call('POST', '/payment/webhook', { raw: JSON.stringify(ev), headers: { 'stripe-signature': 't=1,v1=deadbeef' } });
    record('Webhook à signature invalide → refusé (400)', forged.status === 400, `status ${forged.status}`);
    record('Aucun crédit attribué par un webhook refusé', (await balance(A)) === 0, `crédits A = ${await balance(A)}`);

    // ── Paiement réussi (mode TEST) : 1 crédit, une seule fois.
    const s1 = signed(ev);
    const ok1 = await call('POST', '/payment/webhook', { raw: s1.payload, headers: { 'stripe-signature': s1.header } });
    record('Webhook signé payment_intent.succeeded (15,00 €, mode test) → accepté', ok1.status < 300, `status ${ok1.status} ${JSON.stringify(ok1.data)}`);
    record('Crédit attribué au bon compte (A : 0 → 1)', (await balance(A)) === 1, `crédits A = ${await balance(A)}, B = ${await balance(B)}`);
    const replay = await call('POST', '/payment/webhook', { raw: s1.payload, headers: { 'stripe-signature': s1.header } });
    const ev2 = signed(paymentEvent(`evt_test_${Date.now()}b`, ev.data.object.id, A.userId));
    const sameIntent = await call('POST', '/payment/webhook', { raw: ev2.payload, headers: { 'stripe-signature': ev2.header } });
    record('Rejeu du même événement et même paiement : jamais crédité deux fois', replay.status < 300 && sameIntent.status < 300 && (await balance(A)) === 1, `crédits A = ${await balance(A)}`);
    const sB = signed(paymentEvent(`evt_test_${Date.now()}c`, `pi_test_${Date.now()}c`, B.userId));
    await call('POST', '/payment/webhook', { raw: sB.payload, headers: { 'stripe-signature': sB.header } });
    record('Paiement de B → 1 crédit pour B', (await balance(B)) === 1, `crédits B = ${await balance(B)}`);
    // Sans session de paiement créée (aucune clé sk_test_), la ligne Payment
    // n'existe pas : la trace est l'achat CreditTransaction (paymentRef = PI).
    const txA = Number(sql(`SELECT count(*) FROM "CreditTransaction" WHERE "userId"='${A.userId}' AND "paymentRef"='${ev.data.object.id}'`) || '0');
    record('Achat tracé une seule fois (CreditTransaction, paymentRef = PaymentIntent)', txA === 1, `${txA} transaction(s) pour A`);

    // ── Accès au parcours après paiement : invitation, acceptation.
    const disc = await call('GET', '/matching/discover', { token: A.token });
    const connect = await call('POST', '/matching/connect', { token: A.token, body: { targetUserId: B.userId } });
    record('Après paiement : invitation possible (1 crédit débité)', connect.data?.success === true && (await balance(A)) === 0, `découverte=${Array.isArray(disc.data) ? disc.data.length : disc.status}, ${JSON.stringify(connect.data?.message)}`);
    const likes = await call('GET', '/matching/received-likes', { token: B.token });
    const acc = await call('POST', '/matching/accept', { token: B.token, body: { proposalId: likes.data?.[0]?.id } });
    const journeyId = acc.data?.journey?.id;
    record('Double consentement : B accepte → parcours Harmonie ouvert (1 crédit débité à B)', !!journeyId && (await balance(B)) === 0, `status ${acc.status}, crédits B = ${await balance(B)}`);
    const qs = await call('GET', `/journey/${journeyId}/questions`, { token: A.token });
    record('Parcours accessible à A après paiement : questions du Sondeur servies', qs.status === 200 && Array.isArray(qs.data) && qs.data.length >= 9, `questions=${qs.data?.length}`);

    // ── Tableau de bord administrateur (API).
    const admin = await register('Admin', 'H', '1985-01-01T00:00:00.000Z');
    const member = await call('GET', '/admin/stats', { token: A.token });
    record('Admin : accès refusé à un membre', member.status === 401 || member.status === 403, `status ${member.status}`);
    sql(`UPDATE "User" SET role='ADMIN' WHERE id='${admin.userId}'`);
    const login = await call('POST', '/auth/login', { body: { email: admin.email, password: 'Password12!' } });
    const tok = login.data?.access_token;
    const pages = {};
    for (const p of ['/admin/stats', '/admin/users', '/admin/journeys', '/admin/reports', '/admin/messages/blocked', '/admin/finance/stats']) {
      const r = await call('GET', p, { token: tok });
      pages[p] = r.status;
      fs.writeFileSync(path.join(OUT, `admin${p.replace(/\//g, '_')}.json`), JSON.stringify(r.data, null, 2).slice(0, 20000));
    }
    record('Admin : pages du tableau de bord accessibles (stats, membres, parcours, signalements, modération, finances)', Object.values(pages).every((s) => s === 200), JSON.stringify(pages));
    const journeys = await call('GET', '/admin/journeys', { token: tok });
    record('Admin : le parcours de recette apparaît', JSON.stringify(journeys.data).includes(journeyId), '');
  } catch (e) {
    record('Exception pendant la recette', false, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
  } finally {
    const ok = results.filter((r) => r.ok).length;
    console.log(`\n${ok}/${results.length} vérifications réussies`);
    fs.writeFileSync(path.join(OUT, 'paiement-admin.json'), JSON.stringify(results, null, 2));
    process.exit(ok === results.length ? 0 : 1);
  }
})();
