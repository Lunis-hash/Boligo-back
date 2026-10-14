/* eslint-disable no-console */
/**
 * Recette complète de l'ADMINISTRATION sur la prévisualisation locale
 * (conteneur « boligo-preview », admin servi sous /admin).
 *
 *   BASE=http://localhost:10000 BASIC_USER=steve BASIC_PASS=… \
 *   E2E_PSQL="psql postgresql://boligo@127.0.0.1:5433/boligo_preview" \
 *   node mobile-steve/e2e/admin-recette.e2e.js
 *
 * Données : uniquement des données FICTIVES créées par le script (un membre
 * recette-admin-f-…@recette.boligo.test, un paiement/une demande de
 * rétractation fictifs liés à lui, un code promo RECETTEF…), toutes
 * supprimées à la fin. Aucune action destructive sur les données de démo.
 * Partenaires : lecture seule (un autre script les teste en profondeur).
 * Laboratoire IA : le bouton de lancement n'est pas cliqué (appel IA).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('/opt/node-tools/node_modules/playwright');

const BASE = (process.env.BASE || 'http://localhost:10000').replace(/\/+$/, '');
const BASIC_USER = process.env.BASIC_USER || 'steve';
const BASIC_PASS = process.env.BASIC_PASS || 'recette-locale-2026';
const PSQL = process.env.E2E_PSQL || 'psql postgresql://boligo@127.0.0.1:5433/boligo_preview';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error('Recette locale uniquement (BASE)');
if (!/127\.0\.0\.1|localhost/.test(PSQL)) throw new Error('Recette locale uniquement (E2E_PSQL)');

const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'recette-preview', 'admin');
const OUT = path.join(ROOT, 'docs', 'recette-preview', 'admin-resultats.json');
fs.mkdirSync(SHOTS, { recursive: true });
const API = `${BASE}/api`;
const ADMIN = `${BASE}/admin`;
const BASIC = 'Basic ' + Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString('base64');

// Limite de l'API : 8 tentatives de connexion par e-mail et par 10 minutes.
// Le script fait 3 connexions par compte (API + mauvais mot de passe + bonne
// connexion dans l'interface) ; les reconnexions suivantes réutilisent le jeton.
const ADMIN_WHO = process.env.ADMIN_WHO || 'admin2';
const ACCOUNTS = {
  admin: ['admin@recette.boligo.test', 'RecetteAdmin2026!'],
  admin2: ['admin@boligo-demo.example', 'Demo-Admin-2026!'],
  marketing: ['marketing@boligo-demo.example', 'Demo-Marketing-2026!'],
  member: ['adam.termine@recette.boligo.test', 'Recette2026!'],
};

const results = { base: BASE, startedAt: new Date().toISOString(), checks: [], pages: {}, deadButtons: [], emptyPages: [], badLinks: [], jsErrors: [], failedRequests: [] };
const record = (step, ok, detail = '', extra = {}) => {
  results.checks.push({ step, ok: !!ok, detail, ...extra });
  console.log(`${ok ? 'OK ' : 'KO '} ${step}${detail ? ' — ' + detail : ''}`);
};
const sql = (q) => execSync(`${PSQL} -tA`, { input: q, encoding: 'utf8' }).trim();

let cookie = '';
async function call(method, p, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie; else headers.Authorization = BASIC;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const sc = res.headers.get('set-cookie');
  if (sc && !cookie) cookie = sc.split(';')[0];
  const text = await res.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch { /* texte brut */ }
  return { status: res.status, data, headers: res.headers };
}
const login = async (who) => {
  const [email, password] = ACCOUNTS[who];
  return call('POST', '/admin/auth/login', { body: { email, password } });
};

// ───────────────────────────── 1-2. API : authentification et rôles ─────
const teamSnapshot = () => sql(`select email || ':' || role from "User" where role <> 'USER' order by email`);
async function apiChecks(ctx) {
  ctx.team = teamSnapshot();
  await call('GET', '/health');
  await call('GET', '/admin/me'); // pose le cookie de prévisualisation
  const bad = await call('POST', '/admin/auth/login', { body: { email: 'inconnu-recette-f@recette.boligo.test', password: 'mauvais-mot-de-passe' } });
  record('API : mauvais mot de passe refusé', bad.status === 401 || bad.status === 400, `HTTP ${bad.status} « ${bad.data?.message} »`);
  const member = await login('member');
  record('API : membre ordinaire refusé au tableau de bord', member.status >= 400 && member.status < 500 && !member.data?.access_token, `HTTP ${member.status} « ${member.data?.message} »`);

  const a = await login(ADMIN_WHO);
  record('API : connexion administrateur', a.status < 300 && a.data?.access_token, `rôle ${a.data?.user?.role}`);
  ctx.adminToken = a.data.access_token;
  ctx.adminUser = a.data.user;
  const m = await login('marketing');
  record('API : connexion marketing', m.status < 300 && m.data?.access_token, `rôle ${m.data?.user?.role}`);
  ctx.mkToken = m.data.access_token;
  ctx.mkUser = m.data.user;

  const none = await call('GET', '/admin/users');
  record('API : sans jeton → 401', none.status === 401, `HTTP ${none.status}`);
  const forged = await call('GET', '/admin/users', { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4IiwiZXhwIjoxfQ.invalide' });
  record('API : jeton expiré/invalide → 401', forged.status === 401, `HTTP ${forged.status}`);

  const fakeId = '00000000-0000-0000-0000-000000000000';
  const denied = [
    ['GET', '/admin/users'], ['GET', `/admin/users/${fakeId}`], ['PATCH', `/admin/users/${fakeId}`], ['DELETE', `/admin/users/${fakeId}`],
    ['POST', '/admin/users/bulk-delete'], ['GET', '/admin/users/export/csv'], ['GET', '/admin/matches'], ['GET', '/admin/journeys'],
    ['GET', `/admin/journeys/${fakeId}`], ['GET', '/admin/reports'], ['PATCH', `/admin/reports/${fakeId}`], ['GET', '/admin/messages/blocked'],
    ['GET', '/admin/finance/stats'], ['GET', '/admin/finance/transactions'], ['GET', '/admin/finance/export/csv'],
    ['GET', '/admin/billing/status'], ['GET', '/admin/billing/withdrawals'], ['POST', `/admin/billing/withdrawals/${fakeId}/decide`],
    ['GET', '/admin/billing/sales/export/csv'], ['GET', '/admin/team'], ['PATCH', '/admin/team'], ['GET', '/admin/ai/spend'],
    ['GET', '/admin/ai/lab'], ['POST', '/admin/ai/lab'], ['GET', '/admin/video/stats'], ['POST', '/admin/notifications/broadcast'],
  ];
  const leaks = [];
  for (const [meth, p] of denied) {
    const r = await call(meth, p, { token: ctx.mkToken, body: meth === 'GET' ? undefined : {} });
    if (r.status !== 403) leaks.push(`${meth} ${p} → ${r.status}`);
  }
  record(`API : MARKETING refusé (403) sur ${denied.length} routes d'administrateur`, leaks.length === 0, leaks.join(' ; ') || 'toutes en 403');
  const allowed = [['GET', '/admin/me'], ['GET', '/admin/stats'], ['GET', '/admin/partners'], ['GET', '/admin/partners/summary'], ['GET', '/admin/partners/offers/summary'], ['GET', '/admin/promo/codes'], ['GET', '/admin/promo/stats']];
  const ko = [];
  for (const [meth, p] of allowed) {
    const r = await call(meth, p, { token: ctx.mkToken });
    if (r.status >= 300) ko.push(`${p} → ${r.status}`);
  }
  record('API : MARKETING autorisé sur partenaires, offres, codes promo, vue d\'ensemble', ko.length === 0, ko.join(' ; ') || `${allowed.length} routes en 2xx`);
  const st = await call('GET', '/admin/stats', { token: ctx.mkToken });
  record('API : /admin/stats vu par MARKETING (compteurs agrégés seulement, sans liste de membres)', st.status === 200 && !Array.isArray(st.data?.users), `clés : ${Object.keys(st.data || {}).join(', ')}`);

  // Restes d'une exécution interrompue.
  for (const line of sql(`select id || '|' || email from "User" where email like 'recette-admin-f-%@recette.boligo.test'`).split('\n').filter(Boolean)) {
    const [id, mail] = line.split('|');
    sql(`delete from "WithdrawalRequest" where "userId"='${id}' and channel='recette-f'`);
    await call('DELETE', `/admin/users/${id}`, { token: ctx.adminToken, body: { confirmEmail: mail } });
  }
  sql(`delete from "Payment" where "planId"='recette-f' and id not in (select "paymentId" from "WithdrawalRequest") and id not in (select "paymentId" from "Invoice")`);
  // Membre fictif pour les actions destructives.
  const email = `recette-admin-f-${Date.now()}@recette.boligo.test`;
  const reg = await call('POST', '/auth/register', { body: { email, password: 'Password12!', firstName: 'Fictif', lastName: 'RecetteF', birthDate: '1990-01-01', gender: 'H', city: 'Paris, France', telephone: `+3361${Math.floor(1e7 + Math.random() * 8e7)}`, job: 'Architecte', meetingScope: 'international', acceptTerms: true, termsVersion: '2026-10-03' } });
  const code = reg.data?.otpDebugCode;
  if (code) await call('POST', '/auth/verify-email', { body: { email, code } });
  ctx.fake = { email, id: sql(`select id from "User" where email='${email}'`) };
  record('Données fictives : membre créé', !!ctx.fake.id, email);
  // Paiement + demande de rétractation fictifs (remboursement sans clé Stripe).
  const pi = `pi_recette_admin_f_${Date.now()}`;
  ctx.fake.paymentId = sql(`insert into "Payment"(id,"userId","stripePaymentIntentId",status,"planId",credits,currency,"listAmountCents","totalAmountCents","updatedAt","succeededAt") values (gen_random_uuid(),'${ctx.fake.id}','${pi}','reussi','recette-f',1,'EUR',1990,1990,now(),now()) returning id`).split('\n')[0];
  ctx.fake.withdrawalId = sql(`insert into "WithdrawalRequest"(id,"paymentId","userId",channel) values (gen_random_uuid(),'${ctx.fake.paymentId}','${ctx.fake.id}','recette-f') returning id`).split('\n')[0];
}

// ───────────────────────────── Outils navigateur ─────────────────────────
function watch(page, label) {
  page.on('pageerror', (e) => results.jsErrors.push({ page: label(), message: String(e.message || e).slice(0, 300) }));
  page.on('requestfailed', (r) => {
    const f = r.failure()?.errorText || '';
    if (/ERR_ABORTED/.test(f)) return; // navigation interrompue, téléchargement blob
    results.failedRequests.push({ page: label(), url: r.url(), error: f });
  });
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && u.startsWith(BASE) && !page.__expect4xx) results.failedRequests.push({ page: label(), url: u.replace(BASE, ''), status: r.status() });
  });
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true }).catch(() => undefined);
}
async function settle(page, ms = 900) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(ms);
}
async function uiLogin(page, who) {
  const [email, password] = ACCOUNTS[who];
  await page.goto(`${ADMIN}/login/`);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/admin\/dashboard\/?$/, { timeout: 15000 });
  await settle(page);
}
/** Reconnexion sans formulaire (jeton déjà obtenu) : évite la limite de tentatives. */
async function injectSession(page, token, user) {
  await page.goto(`${ADMIN}/login/`);
  await page.evaluate(([t, u]) => { localStorage.setItem('boligo_admin_token', t); localStorage.setItem('boligo_admin_user', JSON.stringify(u)); }, [token, user]);
  await page.goto(`${ADMIN}/dashboard/`);
  await settle(page);
}
async function checkLinks(page, label) {
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => ({ href: a.getAttribute('href'), abs: a.href, text: (a.textContent || '').trim().slice(0, 40) })));
  for (const h of hrefs) {
    const bad = /onrender\.com/.test(h.abs) || (h.abs.startsWith(BASE) && !h.abs.startsWith(`${ADMIN}/`) && !/^blob:/.test(h.abs));
    if (bad) results.badLinks.push({ page: label, ...h });
  }
  return hrefs.length;
}
const DANGER = /supprim|rembours|refus|suspend|réactiv|certif|crédit|désactiv|activer|pause|révoq|envoyer|lancer|enregistrer|créer|nouveau|nouvelle|déconnexion|valider|accepter|ajouter|modifier|vérifi|conserver|ignorer|traiter|rejeter|mettre|sauvegard|générer|copier|retir|donner|accès|rôle|role/i;
// Pages où une liste déroulante modifie des données (rôle d'équipe) : jamais touchées.
const NO_SELECT = /team|users\/detail|journeys\/detail|billing/;

/** Clique chaque bouton/lien « sûr » visible du contenu principal et vérifie un effet. */
async function exploreButtons(page, url, label) {
  await page.goto(url);
  await settle(page);
  const sel = 'main button:visible, main a[href]:visible, main select:visible, main [role=tab]:visible';
  const count = await page.locator(sel).count();
  const tested = [];
  for (let i = 0; i < count && i < 40; i++) {
    if (page.url().replace(/\/$/, '') !== url.replace(/\/$/, '')) { await page.goto(url); await settle(page, 500); }
    const el = page.locator(sel).nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const tag = await el.evaluate((n) => n.tagName.toLowerCase()).catch(() => '');
    const text = ((await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label')) || (await el.getAttribute('title')) || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    if (await el.isDisabled().catch(() => false)) { tested.push({ text, tag, effect: 'désactivé (normal)' }); continue; }
    if (DANGER.test(text)) { tested.push({ text, tag, effect: 'non cliqué (action testée à part ou modifiant des données)' }); continue; }
    if (tag === 'select' && NO_SELECT.test(url)) { tested.push({ text: 'select', tag, effect: 'non modifié (change des données)' }); continue; }
    if (tag === 'select') {
      const opts = await el.evaluate((n) => [...n.options].map((x) => x.value));
      let reqs = 0; const h = (r) => { if (r.url().includes('/api/')) reqs++; }; page.on('request', h);
      if (opts.length > 1) await el.selectOption(opts[1]).catch(() => undefined);
      await settle(page, 600); page.off('request', h);
      tested.push({ text: `select(${opts.length})`, tag, effect: reqs ? `requête API (${reqs})` : 'aucune requête' });
      if (opts.length > 1) await el.selectOption(opts[0]).catch(() => undefined);
      continue;
    }
    const before = { url: page.url(), html: (await page.locator('main').innerHTML().catch(() => '')).length };
    let reqs = 0; let dialog = false; let download = false;
    const onReq = (r) => { if (r.url().includes('/api/')) reqs++; };
    const onDlg = (d) => { dialog = d.message(); d.dismiss().catch(() => undefined); };
    const onDl = () => { download = true; };
    page.on('request', onReq); page.on('dialog', onDlg); page.on('download', onDl);
    await el.click({ timeout: 4000 }).catch(() => undefined);
    await settle(page, 700);
    page.off('request', onReq); page.off('dialog', onDlg); page.off('download', onDl);
    const after = { url: page.url(), html: (await page.locator('main').innerHTML().catch(() => '')).length };
    const effect = download ? 'téléchargement' : dialog ? `fenêtre « ${String(dialog).slice(0, 60)} »` : after.url !== before.url ? `navigation → ${after.url.replace(BASE, '')}` : reqs ? `requête API (${reqs})` : after.html !== before.html ? 'contenu modifié' : null;
    tested.push({ text, tag, effect: effect || 'AUCUN EFFET' });
    if (!effect) results.deadButtons.push({ page: label, text, tag });
  }
  return tested;
}

async function visit(page, ctxLabel, name, url, { expectText, emptyHint } = {}) {
  ctxLabel.current = name;
  const errBefore = results.jsErrors.length;
  await page.goto(url);
  await settle(page, 1500);
  const main = (await page.locator('main').innerText().catch(() => '')) || '';
  const stillLoading = /Chargement/.test(main) && main.length < 400;
  await shot(page, name);
  const links = await checkLinks(page, name);
  const ok = !stillLoading && (!expectText || new RegExp(expectText, 'i').test(main));
  if (stillLoading || main.trim().length < 40) results.emptyPages.push({ page: name, url: url.replace(BASE, ''), extrait: main.slice(0, 200) });
  return { ok, links, jsErrors: results.jsErrors.length - errBefore, extrait: main.slice(0, 160).replace(/\s+/g, ' '), emptyHint };
}

// ───────────────────────────── 3. Parcours admin ──────────────────────────
async function adminTour(browser, ctx) {
  const context = await browser.newContext({ httpCredentials: { username: BASIC_USER, password: BASIC_PASS }, viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const lab = { current: 'login' };
  watch(page, () => lab.current);

  // 1. Authentification
  await page.goto(`${ADMIN}/dashboard/`);
  await page.waitForURL(/\/admin\/login\/?$/, { timeout: 10000 }).catch(() => undefined);
  record('UI : sans jeton → /admin/login/', /\/admin\/login\/?$/.test(page.url()), page.url().replace(BASE, ''));
  page.__expect4xx = true;
  await page.fill('#email', ACCOUNTS[ADMIN_WHO][0]);
  await page.fill('#password', 'mauvais');
  await page.click('button[type=submit]');
  await page.waitForSelector('form [role=alert]', { timeout: 8000 }).catch(() => undefined);
  const alertTxt = await page.locator('form [role=alert]').innerText().catch(() => '');
  record('UI : mauvaise connexion → message clair', !!alertTxt && /\/login/.test(page.url()), `« ${alertTxt} »`);
  await shot(page, '01-login-erreur');
  await page.fill('#email', ACCOUNTS.member[0]);
  await page.fill('#password', ACCOUNTS.member[1]);
  await page.click('button[type=submit]');
  await page.waitForTimeout(2000);
  const memberAlert = await page.locator('form [role=alert]').innerText().catch(() => '');
  record('UI : membre ordinaire refusé', /\/login/.test(page.url()) && !!memberAlert, `« ${memberAlert} »`);
  await shot(page, '02-login-membre-refuse');
  page.__expect4xx = false;
  await uiLogin(page, ADMIN_WHO);
  record('UI : bonne connexion → tableau de bord', /\/admin\/dashboard\/?$/.test(page.url()), page.url().replace(BASE, ''));

  // Jeton expiré (signature invalide, exp passé) mais session encore en mémoire.
  page.__expect4xx = true;
  await page.evaluate(() => localStorage.setItem('boligo_admin_token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4IiwiZXhwIjoxfQ.expire'));
  await page.goto(`${ADMIN}/dashboard/users/`);
  await settle(page, 2500);
  const expUrl = page.url();
  const expTxt = (await page.locator('body').innerText()).slice(0, 300).replace(/\s+/g, ' ');
  await shot(page, '03-jeton-expire');
  record('UI : jeton expiré → redirection vers /admin/login/', /\/admin\/login\/?$/.test(expUrl), `${expUrl.replace(BASE, '')} — ${/Chargement des utilisateurs/.test(expTxt) ? 'reste sur « Chargement des utilisateurs… »' : expTxt.slice(0, 120)}`);
  await page.goto(`${ADMIN}/dashboard/`);
  await settle(page, 2000);
  const expDash = (await page.locator('main').innerText().catch(() => '')).slice(0, 200).replace(/\s+/g, ' ');
  record('UI : jeton expiré sur la vue d\'ensemble → message ou redirection', /\/login/.test(page.url()) || /unauthor|expir|reconnect|connexion/i.test(expDash), expDash.slice(0, 140));
  page.__expect4xx = false;
  await injectSession(page, ctx.adminToken, ctx.adminUser);

  const P = (p) => `${ADMIN}/dashboard/${p}`;
  const pages = [
    ['10-vue-ensemble', P(''), 'Vue d|membres|Utilisateurs'],
    ['11-finances', P('finance/'), 'Chiffre'],
    ['12-facturation', P('billing/'), 'Factur|rétract|registre'],
    ['13-utilisateurs', P('users/'), 'Utilisateurs'],
    ['14-matchs', P('matches/'), 'Match'],
    ['15-parcours', P('journeys/'), 'Parcours'],
    ['16-signalements', P('reports/'), 'Signalement'],
    ['17-moderation', P('moderation/'), 'bloqu|Modération'],
    ['18-partenaires', P('partners/'), 'Partenaire'],
    ['19-codes-promo', P('promo/'), 'promo|Code'],
    ['20-equipe', P('team/'), 'Équipe|rôle'],
    ['21-labo-ia', P('ai-lab/'), 'IA|Laboratoire|scénario'],
  ];
  for (const [name, url, expectText] of pages) {
    const v = await visit(page, lab, name, url, { expectText });
    v.buttons = name === '18-partenaires' || name === '21-labo-ia' ? 'lecture seule' : await exploreButtons(page, url, name);
    results.pages[name] = v;
    record(`Page ${name}`, v.ok && v.jsErrors === 0, v.extrait.slice(0, 90));
  }

  // Sidebar : chaque lien mène à sa page sous /admin.
  await page.goto(P(''));
  await settle(page);
  const side = await page.$$eval('aside a[href]', (as) => as.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
  record('Menu : liens sous /admin', side.every(([, h]) => h.startsWith('/admin/dashboard')), side.map(([t, h]) => `${t}=${h}`).join(' ; '));

  // Détails : utilisateur, parcours, identifiant inconnu.
  lab.current = '30-fiche-utilisateur';
  await page.goto(P('users/'));
  await settle(page);
  await page.fill('input[placeholder]', ctx.fake.email).catch(() => undefined);
  await page.keyboard.press('Enter');
  await page.locator('main button', { hasText: /Rechercher|Filtrer|Actualiser/ }).first().click().catch(() => undefined);
  await settle(page);
  const found = await page.locator('main', { hasText: ctx.fake.email }).count();
  record('Utilisateurs : recherche du membre fictif', found > 0, ctx.fake.email);
  await shot(page, '30-recherche-utilisateur');
  const dl = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await page.locator('main button', { hasText: 'Exporter' }).first().click().catch(() => undefined);
  const d = await dl;
  record('Utilisateurs : export CSV', !!d, d ? d.suggestedFilename() : 'aucun téléchargement');

  await page.goto(`${ADMIN}/dashboard/users/detail/?id=${ctx.fake.id}`);
  await settle(page, 1500);
  await shot(page, '31-fiche-utilisateur');
  results.pages['31-fiche-utilisateur'] = { ok: true, buttons: await exploreButtons(page, `${ADMIN}/dashboard/users/detail/?id=${ctx.fake.id}`, '31-fiche-utilisateur') };
  await page.goto(`${ADMIN}/dashboard/users/detail/?id=${ctx.fake.id}`);
  await settle(page, 1200);
  await page.locator('main button', { hasText: 'Suspendre' }).click();
  await settle(page, 1500);
  const s1 = sql(`select "accountStatus" from "User" where id='${ctx.fake.id}'`);
  const reactVisible = await page.locator('main button', { hasText: 'Réactiver' }).count();
  record('Fiche : Suspendre (membre fictif)', s1 === 'suspendu' && reactVisible > 0, `base : ${s1}`);
  await page.locator('main button', { hasText: 'Réactiver' }).click();
  await settle(page, 1500);
  record('Fiche : Réactiver', sql(`select "accountStatus" from "User" where id='${ctx.fake.id}'`) === 'actif');
  const v0 = sql(`select "isVerified" from "User" where id='${ctx.fake.id}'`);
  await page.locator('main button', { hasText: /Certifier|Révoquer certif/ }).click();
  await settle(page, 1200);
  const v1 = sql(`select "isVerified" from "User" where id='${ctx.fake.id}'`);
  record('Fiche : Certifier / Révoquer la certification', v0 !== v1, `${v0} → ${v1}`);
  const cr0 = Number(sql(`select "creditBalance" from "User" where id='${ctx.fake.id}'`));
  await page.locator('main button', { hasText: '+10' }).click();
  await settle(page, 1200);
  record('Fiche : +10 crédits', Number(sql(`select "creditBalance" from "User" where id='${ctx.fake.id}'`)) === cr0 + 10);

  page.__expect4xx = true;
  lab.current = '32-fiche-inconnue';
  await page.goto(`${ADMIN}/dashboard/users/detail/?id=00000000-0000-0000-0000-000000000000`);
  await settle(page, 2500);
  const unk = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  await shot(page, '32-fiche-inconnue');
  record('Fiche utilisateur inconnue → message clair', !/Chargement/.test(unk), unk.slice(0, 120));
  if (/Chargement/.test(unk)) results.emptyPages.push({ page: '32-fiche-inconnue', url: '/admin/dashboard/users/detail/?id=<inconnu>', extrait: unk.slice(0, 120) });
  await page.goto(`${ADMIN}/dashboard/journeys/detail/?id=00000000-0000-0000-0000-000000000000`);
  await settle(page, 2500);
  const unkJ = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  await shot(page, '33-parcours-inconnu');
  record('Parcours inconnu → message clair', !/Chargement/.test(unkJ), unkJ.slice(0, 120));
  if (/Chargement/.test(unkJ)) results.emptyPages.push({ page: '33-parcours-inconnu', url: '/admin/dashboard/journeys/detail/?id=<inconnu>', extrait: unkJ.slice(0, 120) });
  page.__expect4xx = false;

  lab.current = '34-parcours-detail';
  await page.goto(P('journeys/'));
  await settle(page);
  const jl = page.locator('main a[href*="journeys/detail"]').first();
  if (await jl.count()) {
    await jl.click();
    await settle(page, 1500);
    const jt = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    await shot(page, '34-parcours-detail');
    record('Parcours : détail', /journeys\/detail/.test(page.url()) && !/Chargement/.test(jt), jt.slice(0, 100));
    results.pages['34-parcours-detail'] = { ok: true, buttons: await exploreButtons(page, page.url(), '34-parcours-detail') };
  } else record('Parcours : détail', false, 'aucun lien de détail dans la liste');

  // Remboursement fictif sans clé Stripe.
  lab.current = '35-remboursement';
  page.__expect4xx = true;
  await page.goto(P('billing/'));
  await settle(page, 1500);
  const row = page.locator('main tr', { hasText: 'Fictif' });
  if (await row.count()) {
    page.once('dialog', (dd) => dd.accept());
    await row.locator('button', { hasText: 'Rembourser' }).first().click();
    await settle(page, 4000);
    const txt = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    const st = sql(`select status from "WithdrawalRequest" where id='${ctx.fake.withdrawalId}'`);
    await shot(page, '35-remboursement-sans-stripe');
    const msg = (txt.match(/[^.]*(Stripe|impossible|erreur|échou|Invalid|API key|serveur)[^.]*/i) || [''])[0];
    record('Remboursement sans clé Stripe : échec propre avec message', st === 'recue' && !!msg, `statut ${st} ; message « ${msg.slice(0, 140)} »`);
  } else {
    const txt = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    await shot(page, '35-facturation');
    record('Remboursement : demande fictive visible', false, txt.slice(0, 160));
  }
  const apiRef = await call('POST', `/admin/billing/withdrawals/${ctx.fake.withdrawalId}/decide`, { token: ctx.adminToken, body: { action: 'refund' } });
  record('API : remboursement sans clé Stripe → erreur explicite', apiRef.status >= 400 && apiRef.status !== 500, `HTTP ${apiRef.status} « ${JSON.stringify(apiRef.data?.message)?.slice(0, 140)} »`);
  page.__expect4xx = false;

  // Finances : export CSV.
  lab.current = '36-finances-export';
  await page.goto(P('finance/'));
  await settle(page);
  const dl2 = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await page.locator('main button', { hasText: 'Exporter' }).first().click();
  const d2 = await dl2;
  record('Finances : export CSV', !!d2, d2 ? d2.suggestedFilename() : 'aucun téléchargement');
  await page.goto(P('billing/'));
  await settle(page);
  const dl3 = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await page.locator('main button', { hasText: /journal|Exporter/i }).last().click().catch(() => undefined);
  const d3 = await dl3;
  record('Facturation : export du journal des ventes', !!d3, d3 ? d3.suggestedFilename() : 'aucun téléchargement');

  // Codes promo : création, modification, désactivation, suppression.
  lab.current = '37-codes-promo';
  const code = `RECETTEF${String(Date.now()).slice(-6)}`;
  ctx.promo = code;
  await page.goto(P('promo/'));
  await settle(page);
  await page.fill('[data-testid=promo-code]', code);
  await page.fill('[data-testid=promo-value]', '15').catch(() => undefined);
  await page.click('[data-testid=promo-create]');
  await settle(page, 1500);
  record('Codes promo : création', sql(`select count(*) from "PromoCode" where code='${code}'`) === '1', await page.locator('[data-testid=promo-msg]').innerText().catch(() => ''));
  await page.fill('[data-testid=promo-search]', code).catch(() => undefined);
  await settle(page);
  await page.click(`[data-testid=promo-edit-${code}]`);
  await page.fill('[data-testid=promo-edit-value]', '20');
  await page.click('[data-testid=promo-save]');
  await settle(page, 1500);
  const pv = sql(`select "discountValue" from "PromoCode" where code='${code}'`);
  record('Codes promo : modification', /^20(\.0+)?$/.test(pv), `valeur ${pv}`);
  const active0 = sql(`select "isActive" from "PromoCode" where code='${code}'`);
  await page.click(`[data-testid=promo-toggle-${code}]`);
  await settle(page, 1500);
  const active1 = sql(`select "isActive" from "PromoCode" where code='${code}'`);
  record('Codes promo : désactivation', active0 === 't' && active1 === 'f', `${active0} → ${active1}`);
  await shot(page, '37-code-promo-desactive');
  page.once('dialog', (dd) => dd.accept());
  await page.click(`[data-testid=promo-delete-${code}]`).catch(() => undefined);
  await settle(page, 1500);
  record('Codes promo : suppression du code fictif', sql(`select count(*) from "PromoCode" where code='${code}'`) === '0', await page.locator('[data-testid=promo-msg]').innerText().catch(() => ''));

  // Partenaires (lecture) : lien de partage same-origin.
  lab.current = '38-partenaires-lien';
  await page.goto(P('partners/'));
  await settle(page, 1500);
  const rows = page.locator('[data-testid^=partner-row-]');
  const n = await rows.count();
  let share = '';
  for (let i = 0; i < n && !share; i++) {
    await rows.nth(i).click();
    await page.waitForTimeout(800);
    share = await page.locator('[data-testid=partner-share-link] p.font-mono').first().innerText().catch(() => '');
    if (!share) await rows.nth(i).click();
  }
  await shot(page, '38-partenaire-lien-partage');
  record('Partenaires : lien de partage = http://localhost:10000/?p=CODE', share.startsWith(`${BASE}/?p=`), share || `aucun lien (${n} partenaires)`);
  await checkLinks(page, '38-partenaires-detail');

  // Suppression du membre fictif (après le nettoyage de sa demande/paiement).
  sql(`delete from "WithdrawalRequest" where id='${ctx.fake.withdrawalId}'`);
  lab.current = '39-suppression';
  await page.goto(`${ADMIN}/dashboard/users/detail/?id=${ctx.fake.id}`);
  await settle(page, 1200);
  await page.click('[data-testid=user-delete-open]');
  await page.fill('[data-testid=user-delete-email]', ctx.fake.email);
  await page.click('[data-testid=user-delete-confirm]');
  await page.waitForURL(/deleted=1/, { timeout: 15000 }).catch(() => undefined);
  await settle(page);
  const delMsg = await page.locator('[data-testid=user-deleted-msg]').count();
  await shot(page, '39-compte-supprime');
  record('Fiche : suppression définitive du membre fictif', sql(`select count(*) from "User" where id='${ctx.fake.id}'`) === '0' && delMsg > 0, page.url().replace(BASE, ''));

  // Déconnexion.
  lab.current = 'logout';
  await page.locator('aside button', { hasText: 'Déconnexion' }).click();
  await page.waitForURL(/\/admin\/login\/?$/, { timeout: 8000 }).catch(() => undefined);
  const tok = await page.evaluate(() => localStorage.getItem('boligo_admin_token'));
  record('UI : déconnexion → /admin/login/ et jeton effacé', /\/admin\/login\/?$/.test(page.url()) && !tok, page.url().replace(BASE, ''));
  await page.goto(`${ADMIN}/dashboard/`);
  await page.waitForURL(/\/admin\/login\/?$/, { timeout: 8000 }).catch(() => undefined);
  record('UI : après déconnexion, /dashboard renvoie vers la connexion', /\/admin\/login\/?$/.test(page.url()));

  // Mobile 390×800.
  await injectSession(page, ctx.adminToken, ctx.adminUser);
  await page.setViewportSize({ width: 390, height: 800 });
  for (const [name, p] of [['50-mobile-vue-ensemble', ''], ['51-mobile-utilisateurs', 'users/'], ['52-mobile-codes-promo', 'promo/'], ['53-mobile-finances', 'finance/']]) {
    lab.current = name;
    await page.goto(P(p));
    await settle(page, 1200);
    const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    await shot(page, name);
    record(`Mobile 390 : ${name} sans défilement horizontal`, ov.sw <= ov.cw + 1, `largeur ${ov.sw}px pour ${ov.cw}px`);
  }
  await page.goto(`${ADMIN}/login/`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${ADMIN}/login/`);
  await settle(page);
  await shot(page, '54-mobile-connexion');
  await context.close();
}

// ───────────────────────────── 2. Rôle MARKETING dans l'interface ────────
async function marketingTour(browser, ctx) {
  const context = await browser.newContext({ httpCredentials: { username: BASIC_USER, password: BASIC_PASS }, viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  const lab = { current: 'mk-login' };
  watch(page, () => lab.current);
  await injectSession(page, ctx.mkToken, ctx.mkUser);
  const menu = await page.$$eval('aside nav a', (as) => as.map((a) => a.textContent.trim()));
  const forbiddenInMenu = menu.filter((t) => /Finances|Facturation|Utilisateurs|Matchs|Parcours|Signalements|Modération|Équipe|Laboratoire/.test(t));
  record('MARKETING : menu limité (pas de fonctions d\'administrateur)', forbiddenInMenu.length === 0, `menu : ${menu.join(', ')}`);
  lab.current = '60-mk-vue-ensemble';
  const ov = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  await shot(page, '60-marketing-vue-ensemble');
  record('MARKETING : vue d\'ensemble lisible, sans erreur', ov.length > 80 && !/Accès réservé|Forbidden/i.test(ov), ov.slice(0, 120));
  results.pages['60-mk-vue-ensemble'] = { ok: true, buttons: await exploreButtons(page, `${ADMIN}/dashboard/`, '60-mk-vue-ensemble') };
  page.__expect4xx = true;
  for (const s of ['finance', 'billing', 'users', 'users/detail/?id=x', 'matches', 'journeys', 'journeys/detail/?id=x', 'reports', 'moderation', 'team', 'ai-lab']) {
    lab.current = `mk-${s}`;
    await page.goto(`${ADMIN}/dashboard/${s.includes('?') ? s : s + '/'}`);
    await settle(page, 1200);
    const t = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    const ok = /Accès non autorisé/.test(t);
    record(`MARKETING : /dashboard/${s} → refus clair`, ok, t.slice(0, 90));
    if (!ok) results.emptyPages.push({ page: `marketing ${s}`, extrait: t.slice(0, 120) });
  }
  await shot(page, '61-marketing-refus-utilisateurs');
  page.__expect4xx = false;
  for (const [s, re] of [['partners', 'Partenaire'], ['promo', 'Code']]) {
    lab.current = `mk-${s}`;
    await page.goto(`${ADMIN}/dashboard/${s}/`);
    await settle(page, 1500);
    const t = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    await shot(page, `62-marketing-${s}`);
    record(`MARKETING : ${s} accessible et chargé`, new RegExp(re, 'i').test(t) && !/Accès non autorisé|Chargement/.test(t.slice(0, 200)), t.slice(0, 90));
  }
  await context.close();
}

(async () => {
  const ctx = {};
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  try {
    await apiChecks(ctx);
    await adminTour(browser, ctx);
    await marketingTour(browser, ctx);
  } catch (e) {
    record('Exécution du script', false, String(e && e.stack || e).slice(0, 500));
  } finally {
    // Nettoyage des données fictives (idempotent).
    try {
      if (ctx.fake?.withdrawalId) sql(`delete from "WithdrawalRequest" where id='${ctx.fake.withdrawalId}'`);
      if (ctx.fake?.paymentId) sql(`delete from "Invoice" where "paymentId"='${ctx.fake.paymentId}'; delete from "Payment" where id='${ctx.fake.paymentId}'`);
      if (ctx.fake?.id && sql(`select count(*) from "User" where id='${ctx.fake.id}'`) !== '0')
        await call('DELETE', `/admin/users/${ctx.fake.id}`, { token: ctx.adminToken, body: { confirmEmail: ctx.fake.email } });
      if (ctx.promo) sql(`delete from "PromoCode" where code='${ctx.promo}'`);
    } catch (e) { record('Nettoyage', false, String(e.message).slice(0, 200)); }
    if (ctx.team) record('Garde-fou : rôles d\'équipe inchangés par la recette', teamSnapshot() === ctx.team, teamSnapshot().replace(/\n/g, ' ; '));
    await browser.close();
    results.finishedAt = new Date().toISOString();
    results.summary = { total: results.checks.length, ok: results.checks.filter((c) => c.ok).length, ko: results.checks.filter((c) => !c.ok).map((c) => c.step) };
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
    console.log(`\n${results.summary.ok}/${results.summary.total} vérifications OK ; boutons sans effet : ${results.deadButtons.length} ; pages vides : ${results.emptyPages.length} ; liens hors /admin : ${results.badLinks.length} ; erreurs JS : ${results.jsErrors.length}`);
    console.log(`Résultats : ${OUT}`);
  }
})();
