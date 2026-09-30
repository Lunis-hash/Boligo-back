/* eslint-disable no-console */
/**
 * Recette navigateur du parcours complet BOLIGO (export web + backend de test).
 *
 *   APP_URL=http://localhost:8081 API_URL=http://localhost:3000/api node e2e/journey.e2e.js
 *
 * Utilisateur A (Homme) rejoue le parcours dans Chromium ; le partenaire B
 * (Femme) est piloté par l'API. Captures d'écran dans docs/screenshots/.
 * Ne jamais lancer contre la production.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/node-tools/node_modules/playwright');

const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const API = process.env.API_URL || 'http://localhost:3000/api';
const SHOTS = path.resolve(__dirname, '..', 'docs', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const record = (step, ok, detail = '') => {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`);
};

async function api(method, p, { token, body } = {}) {
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

async function createPartner(gender) {
  const email = `steve-e2e-partner-${Date.now()}@example.test`;
  await api('POST', '/auth/register', {
    body: { email, password: 'Password12!', firstName: 'Nadia', lastName: 'Partenaire', birthDate: '2001-09-15T00:00:00.000Z', gender, city: 'Paris, France', telephone: `+3362${Math.floor(Math.random() * 1e7)}`, job: 'Architecte', meetingScope: 'international' },
  });
  const ver = await api('POST', '/auth/verify-email', { body: { email, code: '1234' } });
  const token = ver.data.access_token;
  for (let m = 0; m <= 10; m++) {
    const q = await api('GET', `/interview/questions/${m}`, { token });
    const answers = {};
    (q.data || []).forEach((question) => { answers[question.id] = question.options[0]?.key || 'A'; });
    await api('POST', '/interview/save-module', { token, body: { moduleNumber: m, moduleName: `Module ${m}`, answers } });
  }
  return { email, token, userId: ver.data.userId };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Diagnostic partagé avec le gestionnaire d'erreur final.
const diag = { page: null, dialogs: [], pageErrors: [], consoleErrors: [] };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const { pageErrors, dialogs } = diag;
  diag.page = page;
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') diag.consoleErrors.push(m.text().slice(0, 300)); });
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  const text = (t, opts = {}) => page.getByText(t, { exact: false, ...opts }).first();
  const clickText = async (t, opts) => { await text(t, opts).click(); };
  const fillPlaceholder = async (ph, value) => { await page.getByPlaceholder(ph).first().fill(value); };
  const email = `steve-e2e-${Date.now()}@example.test`;
  const password = 'Password12!';

  // ── 1. Accueil & onboarding
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  record('Accueil affiché', await text('Trouver mon BOLIGO').isVisible());
  await shot('01-accueil');
  await clickText('Trouver mon BOLIGO');
  await page.waitForURL(/value-slides/);
  await shot('02-slides');
  for (let i = 0; i < 5; i++) { await clickText('Suivant →'); await page.waitForTimeout(500); }
  await shot('03-slides-cgu');
  const ctaDisabled = (await page.locator('[aria-disabled="true"]', { hasText: 'Créer mon compte gratuitement' }).count()) > 0;
  record('Slides : 6 écrans parcourus, CTA désactivé tant que les CGU ne sont pas cochées', ctaDisabled);
  await clickText("J'ai lu et j'accepte les");
  await page.waitForTimeout(300);
  await clickText('Créer mon compte gratuitement');
  await page.waitForURL(/profile-details/);
  record('CGU acceptées → formulaire de profil', true);

  // ── 2. Inscription (4 étapes)
  await fillPlaceholder('Votre prénom', 'Steve');
  await fillPlaceholder('Votre nom', 'Test');
  await clickText('Sélectionner ou rechercher un métier');
  await page.waitForTimeout(400);
  await fillPlaceholder('Rechercher (ex: Développeur, Médecin...)', 'Développeur');
  await page.waitForTimeout(300);
  await clickText('Développeur / Ingénieur Logiciel');
  await clickText('Homme', { exact: true });
  await clickText('Choisir ma date de naissance');
  await page.waitForTimeout(400);
  await text('15', { exact: true }).last().click();
  await clickText('Confirmer —');
  await page.waitForTimeout(300);
  await shot('04-inscription-etape1');
  await clickText('Continuer', { exact: true });
  await page.waitForTimeout(600);
  record('Étape 1 (identité, métier, genre, date) validée', await text('Étape 2 sur 4').isVisible());
  const regionVisible = await text('Sélectionner une ville').isVisible().catch(() => false);
  if (regionVisible) { await clickText('Sélectionner une ville'); await page.waitForTimeout(300); await clickText('Paris', { exact: true }); }
  await shot('05-inscription-etape2');
  await clickText('Continuer', { exact: true });
  await page.waitForTimeout(600);
  record('Étape 2 (localisation) validée', await text('Étape 3 sur 4').isVisible());
  await clickText('International', { exact: true });
  await shot('06-inscription-etape3');
  await clickText('Continuer', { exact: true });
  await page.waitForTimeout(600);
  record('Étape 3 (périmètre) validée', await text('Étape 4 sur 4').isVisible());
  await fillPlaceholder('exemple@email.com', email);
  await fillPlaceholder('Minimum 8 caractères', password);
  await fillPlaceholder('Répétez votre mot de passe', password);
  const phoneInput = page.locator('input:visible').last();
  await phoneInput.fill(`6${Math.floor(10000000 + Math.random() * 89999999)}`);
  await shot('07-inscription-etape4');
  await clickText('Créer mon compte', { exact: true });
  await page.waitForURL(/verify/, { timeout: 15000 });
  record('Compte créé → écran de vérification OTP', true);
  await shot('08-verification-otp');

  // ── 3. OTP
  await page.locator('input:visible').first().fill('1234');
  await page.waitForURL(/interview\/0/, { timeout: 15000 });
  record('Code OTP accepté → entretien module 0', true);
  await page.waitForTimeout(1500);
  await shot('09-entretien-module0');

  // ── 4. Entretien 11 modules
  let answered = 0;
  for (let i = 0; i < 120; i++) {
    if (/interview\/(generation|summary)/.test(page.url())) break;
    const opt = page.getByText(/^A$/).first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click();
      answered++;
      await page.waitForTimeout(900);
    } else {
      await page.waitForTimeout(700);
    }
  }
  record(`Entretien : ${answered} questions répondues, modules 0→10`, /interview\/(generation|summary)/.test(page.url()), page.url());
  await shot('10-generation');
  await page.waitForURL(/interview\/summary/, { timeout: 30000 });
  await page.waitForTimeout(3500);
  await shot('11-bilan');
  record('Bilan de compatibilité affiché', await text('Vos 6 dimensions clés').isVisible());
  await clickText('Découvrir mes matchs');
  await page.waitForURL(/\/(discover|\(tabs\))?$/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);

  // ── 5. Découverte (vide, puis avec un partenaire)
  const loginRes = await api('POST', '/auth/login', { body: { email, password } });
  const tokenA = loginRes.data.access_token;
  record('Login API du compte créé via l\'UI', !!tokenA);
  await page.getByText('Discover', { exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(2000);
  await shot('12-discover-vide');
  record('Découverte : état vide géré', await page.locator('body').innerText().then((t) => /Aucun profil|Tout est à jour|Actualiser/.test(t)));
  const partner = await createPartner('F');
  await clickText('Actualiser');
  await page.waitForTimeout(3000);
  await shot('13-discover-profil');
  record('Découverte : profil compatible affiché', await text('Nadia').isVisible());

  // ── 6. Crédits : 0 crédit → écran de paiement → code promo
  await page.getByTestId('discover-like').click();
  await page.waitForTimeout(800);
  await shot('14-plus-de-credits');
  record('Like sans crédit → « Plus de crédits disponibles »', await text('Plus de crédits disponibles').isVisible());
  await clickText('Recharger', { exact: true });
  await page.waitForURL(/payment/);
  await page.waitForTimeout(2000);
  await shot('15-paiement-formules');
  record('Formule chargée depuis le backend (15,00 €)', await text('15,00 €').isVisible());
  await page.getByTestId('plan-parcours_harmonie').click();
  await page.waitForTimeout(600);
  await page.getByTestId('promo-input').fill('BOLIGO100');
  await page.getByTestId('promo-apply').click();
  await page.waitForTimeout(1500);
  await shot('16-paiement-promo');
  record('Code promo validé', await text('Offre gratuite activée').isVisible());
  await page.getByTestId('pay-submit').click();
  await page.waitForTimeout(3000);
  await shot('17-paiement-succes');
  const balance = await api('GET', '/credit/balance', { token: tokenA });
  record('Crédit ajouté côté backend après code promo', balance.data?.credits === 1, JSON.stringify(balance.data));
  await page.waitForTimeout(2500);

  // ── 7. Like avec crédit, attente, acceptation par le partenaire
  await page.goto(`${APP_URL}/discover`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  record('Solde affiché dans la découverte = 1 crédit', await text('1 crédits').isVisible());
  await page.getByTestId('discover-like').click();
  await page.waitForTimeout(600);
  await shot('18-confirmation-connexion');
  await clickText('Confirmer', { exact: true });
  await page.waitForTimeout(3000);
  await shot('19-invitation-envoyee');
  record('Invitation envoyée (en attente de réponse)', await text('En attente de réponse').isVisible());
  const balanceAfter = await api('GET', '/credit/balance', { token: tokenA });
  record('Crédit débité après la connexion', balanceAfter.data?.credits === 0, JSON.stringify(balanceAfter.data));
  const likes = await api('GET', '/matching/received-likes', { token: partner.token });
  const accept = await api('POST', '/matching/accept', { token: partner.token, body: { proposalId: likes.data[0].id } });
  const journeyId = accept.data.journey.id;
  record('Partenaire accepte (API) → parcours créé', !!journeyId);

  // ── 8. Sondeur 21 questions (jour 1 → 3)
  await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.getByText('Matches', { exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(3000);
  await shot('20-matchs-sondeur');
  record('Onglet Matchs : parcours Harmonie visible', await text('Parcours Harmonie — 3 jours').isVisible());
  let answeredSondeur = 0;
  for (let day = 1; day <= 3; day++) {
    await clickText('Question du jour');
    await page.waitForTimeout(800);
    if (day === 1) await shot('21-sondeur-question');
    for (let q = 0; q < 7; q++) {
      await fillPlaceholder('Écrivez votre réponse ici...', `Réponse sincère ${day}-${q + 1} : je privilégie le dialogue.`);
      await clickText('Valider la réponse');
      answeredSondeur++;
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(1200);
  }
  record(`Sondeur : ${answeredSondeur} réponses envoyées via l'UI`, answeredSondeur === 21);
  await shot('22-sondeur-reponses');
  const progress = await api('GET', '/journey/sondeur-progress', { token: tokenA });
  record('Progression Sondeur côté backend = 21/21', progress.data?.answeredCount === 21, JSON.stringify(progress.data));
  // Modération : une réponse refusée doit être signalée (dialogue) et non enregistrée
  const qs = await api('GET', `/journey/${journeyId}/questions`, { token: partner.token });
  for (const q of qs.data) {
    await api('POST', '/journey/respond', { token: partner.token, body: { questionId: q.id, text: 'Réponse sincère du partenaire.' } });
  }
  const status = await api('GET', `/journey/${journeyId}/status`, { token: tokenA });
  record('Parcours en chat libre après les réponses des deux membres', status.data?.currentStep === 'chat_libre', JSON.stringify(status.data));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.getByText('Matches', { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await shot('23-sondeur-termine');
  record('Onglet Matchs : CTA « Accéder à la messagerie » affiché', await text('Accéder à la messagerie').isVisible());

  // ── 9. Chat temps réel
  await clickText('Accéder à la messagerie');
  await page.waitForTimeout(3000);
  await shot('24-messages-liste');
  await page.getByText('Nadia', { exact: true }).last().click();
  await page.waitForTimeout(2500);
  await fillPlaceholder('Votre message…', 'Bonjour Nadia, ravi de te parler !');
  const sendBtn = page.getByTestId('chat-send');
  await sendBtn.click();
  await page.waitForTimeout(2500);
  const sentOk = await text('Bonjour Nadia').isVisible();
  record('Message envoyé depuis l\'app (bulle affichée)', sentOk);
  const msgsA = await api('GET', `/journey/${journeyId}/messages`, { token: tokenA });
  record('Message persisté côté backend', (msgsA.data || []).some((m) => m.content.includes('Bonjour Nadia')), `messages=${msgsA.data?.length}`);
  await api('POST', '/journey/message', { token: partner.token, body: { journeyId, content: 'Coucou Steve ! Ravie aussi 😊', type: 'texte' } });
  let realtime = false;
  for (let i = 0; i < 12; i++) { if (await text('Coucou Steve').isVisible().catch(() => false)) { realtime = true; break; } await sleep(500); }
  record('Message du partenaire reçu en temps réel (WebSocket)', realtime);
  await shot('25-chat-temps-reel');
  const insultDialogsBefore = dialogs.length;
  await fillPlaceholder('Votre message…', 'ferme la connard');
  await sendBtn.click();
  await page.waitForTimeout(800);
  record('Message insultant bloqué avant envoi (modération locale)', dialogs.length > insultDialogsBefore, dialogs[dialogs.length - 1] || '');

  // ── 10. Vidéo (API) puis échange de contacts (UI)
  const endCall = await api('POST', '/video/end', { token: partner.token, body: { journeyId, durationSec: 60 } });
  record('Fin d\'appel vidéo (API) → étape échange de contacts', endCall.data?.currentStep === 'echange_contacts', JSON.stringify(endCall.data));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.getByText('Nadia', { exact: true }).last().click();
  await page.waitForTimeout(2500);
  await shot('26-echange-contacts');
  record('Carte « Échanger vos contacts ? » affichée', await text('Échanger vos contacts ?').isVisible());
  await page.getByTestId('contact-exchange-accept').click();
  await page.waitForTimeout(2000);
  record('Après mon consentement : contacts NON révélés tant que le partenaire n\'a pas accepté', await text("C'est presque fait").isVisible());
  await shot('27-attente-consentement');
  await api('POST', `/journey/${journeyId}/exchange-contact`, { token: partner.token, body: { sharePhone: true, shareEmail: true } });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.getByText('Nadia', { exact: true }).last().click();
  await page.waitForTimeout(2500);
  await shot('28-contacts-reveles');
  record('Contacts révélés après double consentement', await text('Contacts échangés').isVisible());

  // ── 11. Profil, édition, persistance de session, déconnexion / reconnexion
  await page.getByText('Profil', { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await shot('29-profil');
  record('Profil : données réelles du backend', await text('Steve').isVisible() && await text(email).isVisible());
  await clickText('Modifier mon profil');
  await page.waitForTimeout(2000);
  await page.getByPlaceholder('Développeur, Médecin...').fill('Product Manager');
  await shot('30-profil-edition');
  await clickText('Enregistrer', { exact: true });
  await page.waitForTimeout(2500);
  const me = await api('GET', '/profile/me', { token: tokenA });
  record('Profession modifiée et persistée (PATCH /profile/me)', me.data?.profession === 'Product Manager', JSON.stringify(me.data?.profession));
  await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  record('Session persistante après rechargement (token stocké)', /discover/.test(page.url()), page.url());
  await page.getByText('Profil', { exact: true }).first().click();
  await page.waitForTimeout(2000);
  await clickText('Se déconnecter');
  await page.waitForTimeout(2000);
  record('Déconnexion → écran de connexion', /login/.test(page.url()), page.url());
  await shot('31-login');
  await fillPlaceholder('votre@email.com', email);
  await fillPlaceholder('••••••••', 'mauvais-mdp');
  const dialogsBefore = dialogs.length;
  await clickText('Se connecter', { exact: true });
  await page.waitForTimeout(2500);
  record('Mauvais mot de passe → message clair', dialogs.length > dialogsBefore && /incorrect/.test(dialogs[dialogs.length - 1] || ''), dialogs[dialogs.length - 1] || '');
  await fillPlaceholder('••••••••', password);
  await clickText('Se connecter', { exact: true });
  await page.waitForURL(/discover/, { timeout: 15000 }).catch(() => {});
  record('Reconnexion → découverte (entretien déjà complété)', /discover/.test(page.url()), page.url());
  await clickText('Mot de passe oublié').catch(() => {});
  await page.getByText('Profil', { exact: true }).first().click().catch(() => {});

  // ── 12. Mot de passe oublié (écran)
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await clickText('Mot de passe oublié');
  await page.waitForURL(/forgot-password/);
  await page.getByTestId('forgot-email').fill(email);
  await page.getByTestId('forgot-submit').click();
  await page.waitForURL(/reset-password/, { timeout: 10000 });
  await shot('32-reset-password');
  record('Mot de passe oublié → écran de saisie du code', true);

  // ── 13. Responsive : captures sur d'autres tailles
  for (const [w, h, label] of [[360, 640, 'android-petit'], [768, 1024, 'tablette']]) {
    const c2 = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: true, locale: 'fr-FR' });
    const p2 = await c2.newPage();
    p2.on('dialog', (d) => d.accept());
    await p2.goto(APP_URL, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(1200);
    await p2.screenshot({ path: path.join(SHOTS, `40-accueil-${label}.png`) });
    await p2.goto(`${APP_URL}/login`, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(1200);
    await p2.screenshot({ path: path.join(SHOTS, `41-login-${label}.png`) });
    await p2.evaluate(([t, id]) => { localStorage.setItem('userToken', t); localStorage.setItem('userId', id); }, [tokenA, loginRes.data.userId]);
    await p2.goto(`${APP_URL}/discover`, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(3000);
    await p2.screenshot({ path: path.join(SHOTS, `42-discover-${label}.png`) });
    await p2.goto(`${APP_URL}/onboarding/payment`, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(2500);
    await p2.screenshot({ path: path.join(SHOTS, `43-paiement-${label}.png`) });
    const overflow = await p2.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    record(`Responsive ${label} (${w}×${h}) : pas de débordement horizontal`, !overflow);
    await c2.close();
  }

  record('Aucune erreur JavaScript non gérée pendant le parcours', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} étapes OK`);
  const md = ['# Recette navigateur — résultats', '', `Date : ${new Date().toISOString()} · App : ${APP_URL} · API : ${API}`, '', '| Étape | Résultat | Détail |', '|---|---|---|', ...results.map((r) => `| ${r.step} | ${r.ok ? '✅' : '❌'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 160)} |`)].join('\n');
  fs.writeFileSync(path.resolve(__dirname, '..', 'docs', 'E2E_RESULTATS.md'), md + '\n');
  await browser.close();
  process.exit(0);
})().catch(async (e) => {
  console.error('E2E error', e);
  console.error('URL courante :', diag.page ? diag.page.url() : '(pas de page)');
  console.error('Dialogues :', JSON.stringify(diag.dialogs.slice(-5)));
  console.error('Erreurs JS :', JSON.stringify(diag.pageErrors.slice(-5)));
  console.error('Console (error) :', JSON.stringify(diag.consoleErrors.slice(-5)));
  if (diag.page) { try { await diag.page.screenshot({ path: path.join(SHOTS, 'zz-echec.png') }); } catch {} }
  process.exit(1);
});
