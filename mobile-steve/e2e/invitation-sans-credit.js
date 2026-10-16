/* eslint-disable no-console */
/**
 * Recette : invitation reçue avec 0 crédit, paiement Stripe en mode TEST,
 * puis acceptation. API et base LOCALES uniquement (comptes fictifs de
 * seed:recette, Bella remise à 0 crédit).
 *
 *   STRIPE_TEST_SECRET_KEY=sk_test_… (environnement seulement)
 *   API_URL=http://127.0.0.1:3300/api node mobile-steve/e2e/invitation-sans-credit.js
 *
 * RÉEL : PaymentIntent de test confirmé par la carte de test pm_card_visa,
 * relu chez Stripe (livemode=false). Aucun webhook du compte n'est modifié :
 * le crédit est confirmé par l'appel de l'app au retour du paiement.
 */
const API = process.env.API_URL || 'http://127.0.0.1:3300/api';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(API)) { console.error('API locale uniquement : refus.'); process.exit(2); }
const KEY = process.env.STRIPE_TEST_SECRET_KEY || '';
if (!KEY.startsWith('sk_test_')) { console.error('Clé Stripe de TEST (sk_test_) requise : refus.'); process.exit(2); }

const j = async (m, p, { token, body } = {}) => {
  const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; } return { s: r.status, d };
};
const stripe = async (method, p, form) => {
  const r = await fetch('https://api.stripe.com/v1' + p, { method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form ? new URLSearchParams(form) : undefined });
  return r.json();
};

let ok = 0; let ko = 0;
const check = (label, cond, detail = '') => {
  if (cond) ok += 1; else ko += 1;
  console.log(`${cond ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
};
const login = async (email) => (await j('POST', '/auth/login', { body: { email, password: 'Recette2026!' } })).d.access_token;
const credits = async (token) => (await j('GET', '/credit/balance', { token })).d;

(async () => {
  const bella = await login('bella.termine@recette.boligo.test');
  const adam = await login('adam.termine@recette.boligo.test');
  check('Connexion des comptes fictifs Bella et Adam', Boolean(bella && adam));

  const likes = await j('GET', '/matching/received-likes', { token: bella });
  const like = (likes.d || [])[0];
  check('Bella voit l’invitation d’Adam', likes.s === 200 && like?.firstName === 'Adam', `HTTP ${likes.s}`);
  check(
    'L’invitation porte la fiche complète (pour « Voir le profil »)',
    Boolean(like && typeof like.compatibility === 'number' && like.profession && (like.positivePoints?.length || like.aiAnalysis || like.mentalMap?.length)),
    like ? `compatibilité ${like.compatibility} %, métier « ${like.profession} », points forts ${like.positivePoints?.length ?? 0}, piliers ${like.mentalMap?.length ?? 0}` : 'aucune',
  );
  const discover = await j('GET', '/matching/discover', { token: bella });
  check('Cas de Steve reproduit : Découverte sans autre profil, seule l’invitation existe', Array.isArray(discover.d) && discover.d.length === 0, `${discover.d?.length} profil(s) en Découverte`);

  const before = await credits(bella);
  const adamBefore = await credits(adam);
  check('Bella a 0 crédit', JSON.stringify(before).includes('0'), JSON.stringify(before));

  const refused = await j('POST', '/matching/accept', { token: bella, body: { proposalId: like.id } });
  check('Accepter sans crédit : refusé proprement (NO_CREDIT), invitation intacte', refused.d?.success === false && refused.d?.code === 'NO_CREDIT', JSON.stringify(refused.d).slice(0, 140));
  const still = await j('GET', '/matching/received-likes', { token: bella });
  check('L’invitation reste en attente après le refus', (still.d || []).some((l) => l.id === like.id));

  const plans = await j('GET', '/payment/plans');
  check('Offres de paiement disponibles', plans.s === 200, JSON.stringify(plans.d).slice(0, 120));
  const intent = await j('POST', '/payment/create-payment-intent', { token: bella, body: { optionId: 'parcours_harmonie', earlyStartConsent: true } });
  const pi = intent.d?.paymentIntentId || String(intent.d?.paymentIntent || intent.d?.clientSecret || '').split('_secret')[0];
  check('Paiement créé par l’API (Stripe TEST)', intent.s < 300 && String(pi).startsWith('pi_'), `HTTP ${intent.s}`);
  const conf = await stripe('POST', `/payment_intents/${pi}/confirm`, { payment_method: 'pm_card_visa', return_url: 'https://example.test' });
  check('Carte de test acceptée chez Stripe, mode test', conf.status === 'succeeded' && conf.livemode === false, `statut=${conf.status} livemode=${conf.livemode} montant=${conf.amount} ${conf.currency}`);
  const done = await j('POST', '/payment/confirm', { token: bella, body: { paymentIntentId: pi } });
  check('Retour de paiement confirmé par l’API', done.s < 300, `HTTP ${done.s}`);
  const again = await j('POST', '/payment/confirm', { token: bella, body: { paymentIntentId: pi } });
  const after = await credits(bella);
  check('1 crédit ajouté, une seule fois (double confirmation sans effet)', again.s < 300 && JSON.stringify(after).includes('1'), JSON.stringify(after));

  const accepted = await j('POST', '/matching/accept', { token: bella, body: { proposalId: like.id } });
  check('Bella accepte l’invitation : parcours créé', accepted.d?.success === true && Boolean(accepted.d?.journey?.id), JSON.stringify(accepted.d).slice(0, 120));
  const end = await credits(bella);
  const adamEnd = await credits(adam);
  check('Crédit de Bella utilisé (retour à 0)', JSON.stringify(end).includes('0'), JSON.stringify(end));
  check('Crédit d’Adam inchangé (déjà débité à l’invitation)', JSON.stringify(adamEnd) === JSON.stringify(adamBefore), `${JSON.stringify(adamBefore)} → ${JSON.stringify(adamEnd)}`);
  const matches = await j('GET', '/matching/my-matches', { token: bella });
  check('Le parcours apparaît chez Bella', (matches.d || []).some((m) => !m.ended), `${(matches.d || []).length} parcours`);

  const read = await stripe('GET', `/payment_intents/${pi}`);
  check('Paiement relu chez Stripe : test, payé', read.livemode === false && read.status === 'succeeded', `livemode=${read.livemode}`);

  console.log(`\n${ok}/${ok + ko} vérifications réussies`);
  process.exitCode = ko ? 1 : 0;
})().catch((e) => { console.error('ÉCHEC :', e.message); process.exit(1); });
