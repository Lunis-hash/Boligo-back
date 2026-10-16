/* eslint-disable no-console */
/**
 * Recette navigateur (390 px) du cas signalé par Steve le 16/10 : une invitation
 * reçue, aucun autre profil en Découverte, 0 crédit.
 * 1. la fiche de la personne qui invite est visible (« Voir le profil ») ;
 * 2. « Accepter » sans crédit propose directement de recharger ;
 * 3. paiement réel en mode TEST sur la page Stripe Checkout (carte 4242),
 *    retour dans l'app, 1 crédit ;
 * 4. acceptation : le parcours commence, le crédit est utilisé.
 *
 * LOCAL uniquement : base seedée par npm run seed:recette, Bella remise à
 * 0 crédit ; API lancée avec la clé Stripe de TEST et WEB_APP_URL=WEB_URL.
 *   API_URL=http://127.0.0.1:3300/api WEB_URL=http://127.0.0.1:8090 \
 *   node mobile-steve/e2e/invitation-sans-credit.e2e.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');

const API = process.env.API_URL || 'http://127.0.0.1:3300/api';
const WEB = process.env.WEB_URL || 'http://127.0.0.1:8090';
for (const u of [API, WEB]) if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(u)) throw new Error(`Local uniquement : ${u}`);
const SHOTS = path.resolve(__dirname, '..', '..', 'docs', 'recette-invitation');
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const record = (s, ok, d = '') => { results.push({ s, ok: !!ok, d }); console.log(`${ok ? '✅' : '❌'} ${s}${d ? ' — ' + d : ''}`); };
const call = async (m, p, { token, body } = {}) => {
  const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; } return { s: r.status, d };
};
const shot = (p, name) => p.screenshot({ path: path.join(SHOTS, name) });

(async () => {
  const token = (await call('POST', '/auth/login', { body: { email: 'bella.termine@recette.boligo.test', password: 'Recette2026!' } })).d.access_token;
  const start = (await call('GET', '/credit/balance', { token })).d.credits;
  record('Départ : Bella a 0 crédit et une invitation d’Adam', start === 0 && (await call('GET', '/matching/received-likes', { token })).d.length === 1, `crédits=${start}`);

  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    // Pages Stripe (HTTPS) par le proxy de l'environnement ; l'app locale
    // (HTTP) en direct.
    args: ['--no-sandbox', ...(process.env.HTTPS_PROXY ? [`--proxy-server=https=${new URL(process.env.HTTPS_PROXY).host}`] : [])],
  });
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
    const p = await ctx.newPage();
    await p.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
    await p.getByPlaceholder('votre@email.com').fill('bella.termine@recette.boligo.test');
    await p.getByPlaceholder('••••••••').fill('Recette2026!');
    await p.getByText('Se connecter', { exact: true }).click();
    await p.waitForTimeout(4000);
    await p.goto(`${WEB}/discover`, { waitUntil: 'networkidle' });
    await p.getByText('Invitations reçues').waitFor({ timeout: 20000 });
    await p.waitForTimeout(800);
    await shot(p, '01-invitation-recue-390.png');

    // 1. Fiche de la personne qui invite.
    const card = p.getByTestId('discover-profile-card');
    const cardShown = await card.waitFor({ timeout: 10000 }).then(() => true, () => false);
    const cardText = cardShown ? await card.innerText() : '';
    record('La fiche d’Adam s’affiche sous l’invitation (sans autre profil en Découverte)', cardShown && /Adam/.test(cardText) && /Architecte/.test(cardText), cardText.slice(0, 120).replace(/\n/g, ' · '));
    const view = p.getByTestId('discover-view-like-profile');
    record('Lien « Voir le profil » sur l’invitation', await view.isVisible().catch(() => false));
    await view.click();
    await p.waitForTimeout(1200);
    const box = await card.boundingBox();
    record('« Voir le profil » amène à la fiche', Boolean(box && box.y < 400), box ? `haut de la fiche à ${Math.round(box.y)} px` : 'fiche introuvable');
    await shot(p, '02-fiche-adam-390.png');
    record('Pas de flèches « profil suivant » sur une invitation', !(await p.getByLabel('Profil suivant').isVisible().catch(() => false)));

    // 2. Accepter sans crédit : recharge proposée directement.
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.getByText('Accepter', { exact: true }).first().click();
    const noCredit = await p.getByText('Plus de crédits disponibles').waitFor({ timeout: 8000 }).then(() => true, () => false);
    record('« Accepter » sans crédit : « Plus de crédits disponibles », sans passer par le pacte', noCredit && !(await p.getByTestId('pact-accept').isVisible().catch(() => false)));
    record('Message : l’invitation reste en attente pendant la recharge', await p.getByText(/invitations reçues restent en attente/).isVisible().catch(() => false));
    await shot(p, '03-sans-credit-390.png');

    // 3. Paiement TEST sur la page Stripe Checkout.
    await p.getByText('Recharger', { exact: true }).click();
    await p.waitForURL(/onboarding\/payment/, { timeout: 15000 });
    await p.waitForTimeout(2500);
    const plan = p.getByTestId('plan-parcours_harmonie');
    if (await plan.isVisible().catch(() => false)) { await plan.click(); await p.waitForTimeout(1500); }
    await p.getByTestId('early-start-consent').click();
    await shot(p, '04-paiement-390.png');
    await p.getByTestId('pay-submit').click();
    await p.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 });
    await p.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
    const fill = async (sel, v) => { const l = p.locator(sel).first(); if (await l.count()) await l.fill(v); };
    const cardTab = p.locator('[data-testid="card-accordion-item-button"]');
    if (await cardTab.count()) await cardTab.click();
    await fill('input#email', 'bella.termine@recette.boligo.test');
    await p.locator('input#cardNumber').fill(['4242', '4242', '4242', '4242'].join(''));
    await p.locator('input#cardExpiry').fill('12 / 34');
    await p.locator('input#cardCvc').fill('123');
    await fill('input#billingName', 'Bella Recette');
    // Le conteneur sort par les États-Unis : on choisit l'euro et la France,
    // et on ne s'inscrit pas à Link (qui demanderait un numéro de téléphone).
    const eur = p.getByText('15,00 €', { exact: true });
    if (await eur.count()) await eur.first().click();
    const country = p.locator('select#billingCountry');
    if (await country.count()) await country.selectOption('FR');
    const link = p.locator('input#enableStripePass');
    if ((await link.count()) && (await link.isChecked())) await link.uncheck({ force: true });
    await fill('input#billingAddressLine1', '1 rue de la Recette');
    await fill('input#billingPostalCode', '69001');
    await fill('input#billingLocality', 'Lyon');
    await shot(p, '05-checkout-stripe-test.png');
    await p.locator('button[data-testid="hosted-payment-submit-button"], .SubmitButton').first().click();
    await p.waitForURL(/checkout=success/, { timeout: 120000 }).catch(async (e) => {
      await p.screenshot({ path: path.join(SHOTS, '05b-checkout-bloque.png'), fullPage: true });
      throw e;
    });
    const confirmed = await p.getByText(/paiement a été confirmé/).waitFor({ timeout: 30000 }).then(() => true, () => false);
    await shot(p, '06-retour-paiement-390.png');
    const after = (await call('GET', '/credit/balance', { token })).d.credits;
    record('Paiement TEST payé sur Stripe Checkout, retour confirmé dans l’app : 1 crédit', confirmed && after === 1, `crédits=${after}`);

    // 4. Acceptation de l'invitation.
    await p.waitForURL(/discover/, { timeout: 15000 }).catch(() => p.goto(`${WEB}/discover`, { waitUntil: 'networkidle' }));
    await p.getByText('Invitations reçues').waitFor({ timeout: 20000 });
    await p.getByText('Accepter', { exact: true }).first().click();
    await p.getByTestId('pact-accept').click();
    await shot(p, '07-pacte-1-credit-390.png');
    await p.getByTestId('connect-confirm').click();
    await p.waitForTimeout(4000);
    await shot(p, '08-parcours-commence-390.png');
    const matches = (await call('GET', '/matching/my-matches', { token })).d || [];
    const end = (await call('GET', '/credit/balance', { token })).d.credits;
    record('Invitation acceptée : parcours avec Adam commencé, crédit utilisé', matches.some((m) => !m.ended) && end === 0, `parcours=${matches.length} crédits=${end}`);
    await ctx.close();
  } catch (e) {
    record('Déroulé interrompu', false, e.message.split('\n')[0]);
  } finally {
    await b.close();
    fs.writeFileSync(path.join(SHOTS, 'resultats.json'), JSON.stringify(results, null, 2));
    const ok = results.filter((r) => r.ok).length;
    console.log(`\n${ok}/${results.length} vérifications réussies`);
    process.exitCode = ok === results.length ? 0 : 1;
  }
})();
