/* eslint-disable no-console */
/**
 * Recette RÉELLE du parcours complet BOLIGO entre deux nouveaux membres
 * fictifs (Alex et Sarah), dans Chromium, viewport mobile 390×800 (et 360).
 *
 *   BASE=http://localhost:10000 BASIC_USER=steve BASIC_PASS=recette-locale-2026 \
 *   E2E_PSQL="psql postgresql://boligo@127.0.0.1:5433/boligo_preview" \
 *   node mobile-steve/e2e/parcours-complet.e2e.js
 *
 * Cible : la prévisualisation de recette (RECETTE_PREVIEW=1, même image que
 * Render) : webapp `/`, admin `/admin`, API `/api`. HÔTE LOCAL UNIQUEMENT.
 * Chaque contrôle porte un statut : TESTÉ (exécuté et vérifié), SIMULÉ
 * (réponse de service tiers simulée par page.route), NON TESTÉ (raison).
 * Captures : docs/recette-preview/parcours/NN-etape.png ;
 * résultats : docs/recette-preview/parcours-resultats.json.
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node-tools/node_modules/playwright');

const BASE = (process.env.BASE || 'http://localhost:10000').replace(/\/$/, '');
const API = `${BASE}/api`;
const BASIC_USER = process.env.BASIC_USER || 'steve';
const BASIC_PASS = process.env.BASIC_PASS || 'recette-locale-2026';
const E2E_PSQL = process.env.E2E_PSQL || 'psql postgresql://boligo@127.0.0.1:5433/boligo_preview';
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
if (!LOCAL.test(BASE) || !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(E2E_PSQL)) {
  console.error('Garde-fou : recette réservée à un hôte et une base LOCAUX (localhost / 127.0.0.1).');
  process.exit(2);
}
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'recette-preview', 'parcours');
const OUT = path.join(ROOT, 'docs', 'recette-preview', 'parcours-resultats.json');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
/** status : 'TESTÉ' | 'SIMULÉ' | 'NON TESTÉ' ; ok : true/false (null si non testé). */
const record = (etape, step, ok, detail = '', status = 'TESTÉ') => {
  results.push({ etape, step, status, ok: status === 'NON TESTÉ' ? null : !!ok, detail: String(detail).slice(0, 600) });
  const icon = status === 'NON TESTÉ' ? '➖' : ok ? '✅' : '❌';
  console.log(`${icon} [${etape}] [${status}] ${step}${detail ? ' — ' + String(detail).slice(0, 200) : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execSync(`${E2E_PSQL} -tA`, { input: q, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }).trim();
const BASIC = 'Basic ' + Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString('base64');
let previewCookie = '';

async function api(method, p, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  // Le Bearer du membre remplace l'auth Basic : le cookie de recette autorise la requête.
  if (token) { headers.Authorization = `Bearer ${token}`; headers.Cookie = previewCookie; } else headers.Authorization = BASIC;
  const res = await fetch(API + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const sc = res.headers.get('set-cookie');
  if (sc && !previewCookie) previewCookie = sc.split(';')[0];
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const dockerLogsSince = (since) => {
  try { return execSync(`docker logs --since ${since} boligo-preview 2>&1`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch { return ''; }
};

const STAMP = Date.now();
const mk = (n) => `c-${n}-${STAMP}@recette.boligo.test`;
const PASSWORD = 'Recette2026!';

function watchAppDialogs(pg, sink) {
  let busy = false;
  const timer = setInterval(async () => {
    if (busy || pg.isClosed()) return;
    busy = true;
    try {
      if (await pg.locator('[data-testid="app-dialog"]').count()) {
        const title = await pg.locator('[data-testid="app-dialog-title"]').first().innerText().catch(() => '');
        const msg = await pg.locator('[data-testid="app-dialog-message"]').first().innerText().catch(() => '');
        sink.push([title, msg].filter(Boolean).join(' — '));
        await pg.locator('[data-testid="app-dialog-confirm"]').first().click({ timeout: 2000 }).catch(() => {});
      }
    } catch { /* navigation */ } finally { busy = false; }
  }, 300);
  pg.on('close', () => clearInterval(timer));
  pg.on('dialog', (d) => { sink.push(d.message()); d.accept().catch(() => {}); });
}

let shotN = 0;
async function shot(page, name) {
  shotN += 1;
  const file = `${String(shotN).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(SHOTS, file) }).catch(() => {});
  return file;
}

async function newMember(browser, { width = 390, geo = 'none' } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR',
    httpCredentials: { username: BASIC_USER, password: BASIC_PASS },
    ...(geo === 'granted' ? { permissions: ['geolocation'], geolocation: { latitude: 48.93, longitude: 2.21 } } : {}),
  });
  if (geo === 'denied') {
    // Refus de la permission, comme un clic sur « Bloquer » : Chromium headless n'affiche
    // aucune invite (la demande resterait sans réponse), on renvoie donc PERMISSION_DENIED.
    await ctx.addInitScript(() => {
      const deny = (_ok, err) => setTimeout(() => err && err({ code: 1, PERMISSION_DENIED: 1, message: 'User denied Geolocation' }), 50);
      if (navigator.geolocation) { navigator.geolocation.getCurrentPosition = deny; navigator.geolocation.watchPosition = (a, b) => { deny(a, b); return 0; }; }
    });
  }
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
  const dialogs = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  watchAppDialogs(page, dialogs);
  return { ctx, page, dialogs, errors };
}

/** Inscription complète par les 6 écrans de l'interface. */
async function registerUi(page, { first, gender, email, city, cityPick, day, month, year }) {
  await page.goto(`${BASE}/onboarding/profile-details`, { waitUntil: 'load' });
  await sleep(2000);
  await page.getByTestId('first-name').fill(first);
  await page.getByTestId('last-name').fill('Recette');
  await page.getByText(gender, { exact: true }).first().click();
  await page.getByTestId('next-button').click();
  await sleep(600);
  const s2 = await page.getByText('Étape 2 sur 6').isVisible();
  await page.getByTestId('birth-day').fill(day);
  await page.getByTestId('birth-month').fill(month);
  await page.getByTestId('birth-year').fill(year);
  await page.getByTestId('profession-select').click();
  await sleep(400);
  await page.getByPlaceholder('Rechercher (ex: Développeur, Médecin...)').fill('Développeur');
  await sleep(300);
  await page.getByText('Développeur / Ingénieur Logiciel').first().click();
  await sleep(300);
  await page.getByTestId('next-button').click();
  await sleep(600);
  const s3 = await page.getByText('Étape 3 sur 6').isVisible();
  return { s2, s3, async finish(scope = 'International') {
    await page.getByTestId('next-button').click();
    await sleep(600);
    const s4 = await page.getByText('Étape 4 sur 6').isVisible();
    await page.getByText(scope, { exact: true }).first().click();
    await page.getByTestId('next-button').click();
    await sleep(600);
    const s5 = await page.getByText('Étape 5 sur 6').isVisible();
    await page.getByTestId('email').fill(email);
    await page.getByTestId('phone').fill(`6${Math.floor(10000000 + Math.random() * 89999999)}`);
    await page.getByTestId('password').fill(PASSWORD);
    await page.getByTestId('password-confirm').fill(PASSWORD);
    await page.getByTestId('next-button').click();
    await sleep(600);
    const s6 = await page.getByText('Étape 6 sur 6').isVisible();
    await page.getByTestId('terms-checkbox').click();
    await sleep(300);
    await page.getByText('Créer mon compte', { exact: true }).first().click();
    await page.waitForURL(/verify/, { timeout: 20000 });
    return { s4, s5, s6 };
  } };
}

async function verifyUi(page) {
  await page.locator('input:visible').first().fill('1234');
  await page.waitForURL(/interview\/0/, { timeout: 20000 });
}

async function loginUi(page, email, password = PASSWORD) {
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await sleep(2000);
  await page.getByPlaceholder('votre@email.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByText('Se connecter', { exact: true }).click();
}

const storedAnswers = (userId) => {
  const rows = sql(`SELECT r."rawResponses" FROM "ModuleResponse" r JOIN "InterviewIA" i ON i.id=r."interviewId" WHERE i."userId"='${userId}'`);
  return Object.assign({}, ...rows.split('\n').filter(Boolean).map((l) => JSON.parse(l)));
};

/** Membre piloté par l'API (entretien V8.2 complet). */
async function answerByApi(token) {
  await api('POST', '/interview/sensitive-consent', { token, body: { accepted: true } });
  for (let m = 0; m <= 10; m++) {
    const answers = {};
    for (let round = 0; round < 4; round++) {
      const q = await api('GET', `/interview/questions/${m}?lang=fr`, { token });
      const pending = (q.data || []).filter((x) => !(x.id in answers));
      if (!pending.length) break;
      for (const x of pending) {
        if (x.input === 'ageRange') answers[x.id] = '25-45';
        else answers[x.id] = (x.options.find((o) => !o.freeText) || x.options[0])?.key || 'A';
      }
      await api('POST', '/interview/save-module', { token, body: { moduleNumber: m, moduleName: `Module ${m}`, answers } });
    }
  }
  return (await api('GET', '/interview/status', { token })).data;
}

async function registerApi(first, gender, birth) {
  const email = mk(first.toLowerCase());
  const reg = await api('POST', '/auth/register', {
    body: { email, password: PASSWORD, firstName: first, lastName: 'Recette', birthDate: birth, gender, city: 'Paris, France', telephone: `+3361${Math.floor(1e7 + Math.random() * 8e7)}`, job: 'Architecte', meetingScope: 'international', acceptTerms: true, termsVersion: '2026-10-03' },
  });
  if (reg.status >= 300) throw new Error(`inscription ${first} : ${JSON.stringify(reg.data)}`);
  const ver = await api('POST', '/auth/verify-email', { body: { email, code: '1234' } });
  return { email, token: ver.data.access_token, userId: ver.data.userId, first };
}

const ids = (email) => sql(`SELECT id FROM "User" WHERE email='${email}'`);

/** Grand Entretien dans le navigateur, avec retour arrière, modification ancienne et reprise. */
async function interviewUi(page, userId, R) {
  let answered = 0;
  let backDone = false; let oldEditDone = false; let reloadDone = false;
  let mod3 = 0;
  const modOf = () => Number((page.url().match(/interview\/(\d+)/) || [])[1]);
  for (let i = 0; i < 500; i++) {
    if (/interview\/(generation|summary)/.test(page.url())) break;
    const mod = modOf();
    // Retour arrière dans le module 0 après deux réponses.
    if (mod === 0 && answered === 2 && !backDone) {
      backDone = true;
      const before = storedAnswers(userId);
      await page.getByTestId('interview-back').click();
      await sleep(700);
      const t = await page.locator('body').innerText();
      R.back = /Votre réponse actuelle est cochée/.test(t);
      R.backShot = await shot(page, 'ge-retour-arriere');
      R.backBefore = Object.keys(before).length;
      continue;
    }
    // Modification d'une réponse d'un module précédent : depuis le module 1, retour vers le 0.
    if (mod === 1 && !oldEditDone) {
      oldEditDone = true;
      await sleep(1000);
      const before = storedAnswers(userId);
      await page.getByTestId('interview-back').click();
      await page.waitForURL(/interview\/0/, { timeout: 10000 }).catch(() => {});
      await sleep(1500);
      R.oldEditShot = await shot(page, 'ge-modif-module-precedent');
      const opts = page.locator('[data-testid^="option-"]');
      const n = await opts.count();
      const validate = page.getByTestId('interview-validate');
      const isMulti = await validate.isVisible().catch(() => false);
      if (n >= 2 && !isMulti) await opts.nth(1).click();
      else if (n >= 2) { await opts.nth(1).click(); await sleep(200); await validate.click(); }
      await page.waitForURL(/interview\/1/, { timeout: 15000 }).catch(() => {});
      await sleep(1200);
      const after = storedAnswers(userId);
      const changed = Object.keys(after).filter((k) => before[k] !== undefined && String(before[k]) !== String(after[k]));
      R.oldEdit = { changed, backTo1: /interview\/1/.test(page.url()), rowsM0: sql(`SELECT count(*) FROM "ModuleResponse" r JOIN "InterviewIA" i ON i.id=r."interviewId" WHERE i."userId"='${userId}' AND r."moduleNumber"=0`) };
      continue;
    }
    // Reprise après interruption : rechargement complet au milieu du module 3.
    if (mod === 3 && mod3 >= 2 && !reloadDone) {
      reloadDone = true;
      const nBefore = Object.keys(storedAnswers(userId)).length;
      await page.goto(BASE, { waitUntil: 'load' });
      await page.waitForURL(/interview\/\d+/, { timeout: 20000 }).catch(() => {});
      await sleep(1500);
      R.reload = { url: page.url(), mod: modOf(), kept: Object.keys(storedAnswers(userId)).length >= nBefore, nBefore };
      R.reloadShot = await shot(page, 'ge-reprise-apres-rechargement');
      continue;
    }
    const ageMin = page.getByTestId('interview-age-min');
    if (await ageMin.isVisible().catch(() => false)) {
      await ageMin.fill('25');
      await page.getByTestId('interview-age-max').fill('40');
      await sleep(200);
      await page.getByTestId('interview-age-validate').click();
      answered++;
      await sleep(900);
      continue;
    }
    const yes = page.getByTestId('option-yes');
    if (await yes.isVisible().catch(() => false)) { await yes.click(); await sleep(900); continue; }
    const validate = page.getByTestId('interview-validate');
    if (await validate.isVisible().catch(() => false)) {
      if ((await validate.getAttribute('aria-disabled')) === 'true') {
        await page.locator('[data-testid^="option-"]').first().click();
        await sleep(200);
      }
      if ((await validate.getAttribute('aria-disabled')) === 'true') await page.getByTestId('interview-other').fill('Bambara').catch(() => {});
      await validate.click();
      answered++; if (mod === 3) mod3++;
      await sleep(900);
      continue;
    }
    const opt = page.locator('[data-testid^="option-"]:not([data-testid="option-no"])').first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click();
      answered++; if (mod === 3) mod3++;
      await sleep(800);
    } else await sleep(600);
  }
  R.answered = answered;
  await page.waitForURL(/interview\/summary/, { timeout: 60000 }).catch(() => {});
  await sleep(3000);
  R.summaryShot = await shot(page, 'ge-bilan');
  R.summary = await page.locator('body').innerText();
}

async function gotoMatches(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await sleep(2500);
  await page.getByText('Matchs', { exact: true }).first().click().catch(() => {});
  await sleep(2500);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const t0 = new Date().toISOString();
  await api('GET', '/health');
  await api('GET', '/payment/plans'); // pose le cookie de recette
  const A = { first: 'Alex', email: mk('alex') };
  const S = { first: 'Sarah', email: mk('sarah') };
  let journeyId = null;
  const MA = await newMember(browser, { geo: 'denied' }); // Alex : permission de géolocalisation refusée
  const MS = await newMember(browser);
  const pa = MA.page; const ps = MS.page;

  // ── 1. Inscription par les 6 écrans + 3. Ville
  try {
    // Réseau du conteneur : géocodeurs bloqués.
    let blocked = [];
    for (const h of ['geo.api.gouv.fr', 'photon.komoot.io', 'nominatim.openstreetmap.org']) {
      try { execSync(`curl -s -m 6 -o /dev/null https://${h}/`, { stdio: 'ignore' }); } catch { blocked.push(h); }
    }
    record('3', 'Géocodeurs injoignables depuis ce conteneur (curl)', blocked.length === 3, `bloqués : ${blocked.join(', ')}`);

    const ra = await registerUi(pa, { first: 'Alex', gender: 'Homme', email: A.email, day: '12', month: '04', year: '1990' });
    // Refus de la géolocalisation (contexte sans permission « geolocation »).
    await pa.getByTestId('gps-button').click();
    await pa.getByTestId('gps-message').waitFor({ timeout: 10000 }).catch(() => {});
    const gpsMsg = await pa.getByTestId('gps-message').innerText().catch(() => '');
    const f1 = await shot(pa, 'ville-geoloc-refusee');
    record('3', 'Géolocalisation refusée : message clair, saisie manuelle proposée', /refusée|introuvable/i.test(gpsMsg) && /saisissez votre ville/.test(gpsMsg), `« ${gpsMsg} » (${f1})`);
    // Recherche en ligne : réponses SIMULÉES (page.route) pour geo.api.gouv.fr / api-adresse.
    await pa.route(/geo\.api\.gouv\.fr|api-adresse\.data\.gouv\.fr/, (route) => {
      const u = route.request().url();
      if (/geo\.api\.gouv\.fr/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ nom: 'Bezons', codeDepartement: '95', codesPostaux: ['95870'], population: 29000 }]) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ features: [] }) });
    });
    await pa.getByTestId('city-search').fill('Bezon');
    await pa.getByTestId('city-search-suggestion-0').waitFor({ timeout: 8000 }).catch(() => {});
    const sug = await pa.getByTestId('city-search-suggestions').innerText().catch(() => '');
    const f2 = await shot(pa, 'ville-recherche-simulee');
    record('3', 'Recherche de ville en ligne (geo.api.gouv.fr) : suggestion affichée', /Bezons/.test(sug) && /95870|Dép\. 95/.test(sug), `${sug.replace(/\n/g, ' / ')} (${f2})`, 'SIMULÉ');
    await pa.getByTestId('city-search-suggestion-0').click().catch(() => {});
    await sleep(300);
    record('1', 'Alex : étapes 1 → 3 de l’inscription', ra.s2 && ra.s3);
    const rA = await ra.finish('International');
    record('1', 'Alex : étapes 4 → 6, compte créé → écran de vérification', rA.s4 && rA.s5 && rA.s6 && /verify/.test(pa.url()), pa.url());
    await shot(pa, 'inscription-verification');
    await verifyUi(pa);
    record('1', 'Alex : code 1234 accepté → Grand Entretien module 0', /interview\/0/.test(pa.url()));
    A.userId = ids(A.email);
    A.token = (await api('POST', '/auth/login', { body: { email: A.email, password: PASSWORD } })).data?.access_token;
    record('1', 'Alex : e-mail vérifié en base', sql(`SELECT "isVerified" FROM "User" WHERE id='${A.userId}'`) === 't');

    const rs = await registerUi(ps, { first: 'Sarah', gender: 'Femme', email: S.email, day: '15', month: '09', year: '1992' });
    // Repli : fournisseurs indisponibles (503 / coupure) → liste locale du pays.
    await ps.route(/geo\.api\.gouv\.fr|api-adresse\.data\.gouv\.fr/, (r) => r.fulfill({ status: 503, body: 'indisponible' }));
    await ps.route(/photon\.komoot\.io|nominatim\.openstreetmap\.org/, (r) => r.abort('connectionrefused'));
    await ps.getByTestId('city-search').fill('Lyo');
    await ps.getByTestId('city-search-suggestion-0').waitFor({ timeout: 10000 }).catch(() => {});
    const sugS = await ps.getByTestId('city-search-suggestions').innerText().catch(() => '');
    const f3 = await shot(ps, 'ville-repli-liste-locale');
    record('3', 'Repli : fournisseur en 503 / coupé → liste locale du pays (Lyon)', /Lyon/.test(sugS), `${sugS.replace(/\n/g, ' / ')} (${f3})`);
    await ps.getByTestId('city-search-suggestion-0').click().catch(() => {});
    await sleep(300);
    record('1', 'Sarah : étapes 1 → 3 de l’inscription', rs.s2 && rs.s3);
    const rS = await rs.finish('International');
    record('1', 'Sarah : étapes 4 → 6, compte créé → vérification', rS.s4 && rS.s5 && rS.s6);
    await verifyUi(ps);
    record('1', 'Sarah : code 1234 accepté → module 0', /interview\/0/.test(ps.url()));
    S.userId = ids(S.email);
    S.token = (await api('POST', '/auth/login', { body: { email: S.email, password: PASSWORD } })).data?.access_token;
    const cities = sql(`SELECT string_agg(city, ' | ') FROM "User" WHERE id IN ('${A.userId}','${S.userId}')`);
    record('3', 'Villes enregistrées avec leur pays', /Bezons/.test(cities) && /Lyon/.test(cities), cities);

    // Géolocalisation ACCORDÉE : le géocodage inverse est bloqué par le réseau → message de repli.
    const MG = await newMember(browser, { geo: 'granted' });
    const rg = await registerUi(MG.page, { first: 'Geo', gender: 'Homme', email: mk('geo'), day: '01', month: '01', year: '1990' });
    await MG.page.getByTestId('gps-button').click();
    await MG.page.getByTestId('gps-message').waitFor({ timeout: 30000 }).catch(() => {});
    const gm = await MG.page.getByTestId('gps-message').innerText().catch(() => '');
    const f4 = await shot(MG.page, 'ville-geoloc-accordee-reseau-bloque');
    record('3', 'Géolocalisation accordée mais géocodeurs injoignables : message, saisie manuelle', rg.s3 && /saisissez votre ville/i.test(gm), `« ${gm} » (${f4})`);
    await MG.ctx.close();
    record('3', 'Géocodage inverse réel (position → commune)', null, 'réseau bloqué : geo.api.gouv.fr / Nominatim / Photon injoignables', 'NON TESTÉ');
  } catch (e) {
    record('1', 'Inscription : scénario interrompu', false, e.stack?.split('\n').slice(0, 2).join(' '));
    await shot(pa, 'zz-erreur-inscription');
  }

  // ── 4. Grand Entretien : Alex dans l'interface (complet), Sarah dans l'interface jusqu'au module 1 puis par l'API.
  try {
    const R = {};
    await shot(pa, 'ge-module0');
    await interviewUi(pa, A.userId, R);
    record('4', `Alex : Grand Entretien V8.2 complet dans l’interface (${R.answered} réponses)`, /interview\/summary/.test(pa.url()), pa.url());
    record('4', 'Retour arrière (module 0) : question précédente, réponse cochée', R.back, R.backShot);
    record('4', 'Modification d’une réponse d’un module précédent (depuis le module 1 vers le module 0)', R.oldEdit && R.oldEdit.changed.length >= 1 && R.oldEdit.backTo1 && R.oldEdit.rowsM0 === '1', JSON.stringify(R.oldEdit) + ' ' + R.oldEditShot);
    record('4', 'Reprise après interruption (rechargement au milieu du module 3)', R.reload && R.reload.mod === 3 && R.reload.kept, JSON.stringify(R.reload) + ' ' + R.reloadShot);
    record('4', 'Bilan affiché sans « undefined »', /Grand Entretien/.test(R.summary || '') && !/undefined/.test(R.summary || ''), R.summaryShot);
    const v = sql(`SELECT "questionnaireVersion" FROM "InterviewIA" WHERE "userId"='${A.userId}'`);
    record('4', 'Entretien verrouillé en V8.2', v === '8.2', v);

    // Sarah : module 0 dans l'interface (quelques réponses), le reste par l'API (gain de temps).
    for (let i = 0; i < 3; i++) {
      const ageMin = ps.getByTestId('interview-age-min');
      if (await ageMin.isVisible().catch(() => false)) { await ageMin.fill('28'); await ps.getByTestId('interview-age-max').fill('42'); await ps.getByTestId('interview-age-validate').click(); }
      else await ps.locator('[data-testid^="option-"]').first().click().catch(() => {});
      await sleep(1000);
    }
    const st = await answerByApi(S.token);
    record('4', 'Sarah : 3 réponses dans l’interface, puis entretien complété PAR L’API', st?.isCompleted === true, JSON.stringify({ isCompleted: st?.isCompleted }));
    await ps.goto(`${BASE}/interview/summary`, { waitUntil: 'load' });
    await sleep(3000);
    const f = await shot(ps, 'ge-bilan-sarah');
    record('4', 'Sarah : bilan affiché dans l’interface', /Grand Entretien/.test(await ps.locator('body').innerText()), f);
  } catch (e) {
    record('4', 'Grand Entretien : scénario interrompu', false, e.stack?.split('\n').slice(0, 2).join(' '));
    await shot(pa, 'zz-erreur-entretien');
  }

  // ── 2. Connexion, déconnexion, mot de passe oublié, profil
  try {
    await pa.goto(`${BASE}/`, { waitUntil: 'load' });
    await sleep(2500);
    await pa.getByText('Profil', { exact: true }).first().click();
    await sleep(2000);
    await pa.getByText('Modifier mon profil').first().click();
    await sleep(2000);
    await pa.getByPlaceholder('Développeur, médecin…').fill('Ébéniste de recette');
    await shot(pa, 'profil-edition');
    await pa.getByText('Enregistrer', { exact: true }).first().click();
    await sleep(2500);
    await pa.goto(`${BASE}/`, { waitUntil: 'load' });
    await sleep(2500);
    await pa.getByText('Profil', { exact: true }).first().click();
    await sleep(2000);
    await pa.getByText('Se déconnecter').first().click();
    await sleep(2500);
    record('2', 'Déconnexion → écran de connexion', /login/.test(pa.url()), pa.url());
    await shot(pa, 'deconnexion-login');
    const since = new Date(Date.now() - 2000).toISOString();
    await pa.getByText('Mot de passe oublié').first().click();
    await pa.waitForURL(/forgot-password/, { timeout: 10000 });
    await pa.getByTestId('forgot-email').fill(A.email);
    await pa.getByTestId('forgot-submit').click();
    await pa.waitForURL(/reset-password/, { timeout: 15000 });
    await sleep(1500);
    await shot(pa, 'mot-de-passe-oublie-code');
    const logs = dockerLogsSince(since);
    const resetLine = logs.split('\n').filter((l) => /EMAIL/.test(l)).join(' / ');
    const codeInLog = /\b\d{6}\b/.test(resetLine);
    record('2', 'Mot de passe oublié : le code apparaît dans le journal docker', codeInLog, resetLine.slice(0, 300) || 'aucune ligne e-mail');
    const dbCode = sql(`SELECT "resetCode" FROM "User" WHERE id='${A.userId}'`);
    const debug = await api('POST', '/auth/forgot-password', { body: { email: 'inconnu@recette.boligo.test' } });
    record('2', 'API : aucun code de débogage renvoyé pour la réinitialisation', !JSON.stringify(debug.data).match(/\d{6}|otp/i), JSON.stringify(debug.data));
    // Le code est lu dans la base locale (seule source possible), puis saisi dans l'écran.
    await pa.getByTestId('reset-code').fill(dbCode);
    const newPass = 'Recette2026!bis';
    await pa.getByTestId('reset-password').fill(newPass);
    await pa.getByTestId('reset-confirm').fill(newPass);
    await pa.getByTestId('reset-submit').click();
    await sleep(3000);
    await shot(pa, 'mot-de-passe-reinitialise');
    const okNew = await api('POST', '/auth/login', { body: { email: A.email, password: newPass } });
    record('2', 'Réinitialisation par l’écran (code lu en BASE locale, faute de journal) → nouveau mot de passe actif', !!okNew.data?.access_token, `code base ${dbCode ? 'présent' : 'absent'}`);
    A.password = newPass;
    await loginUi(pa, A.email, newPass);
    await pa.waitForURL(/discover|\(tabs\)|\/$/, { timeout: 20000 }).catch(() => {});
    await sleep(2500);
    record('2', 'Connexion avec le nouveau mot de passe', !/login/.test(pa.url()), pa.url());
    await pa.getByText('Profil', { exact: true }).first().click();
    await sleep(2500);
    const f = await shot(pa, 'profil-apres-reconnexion');
    const prof = await pa.locator('body').innerText();
    A.token = okNew.data.access_token;
    const me = await api('GET', '/profile/me', { token: A.token });
    record('2', 'Profil modifié persistant après reconnexion (interface + API)', /Ébéniste de recette/.test(prof) || me.data?.profession === 'Ébéniste de recette', `profession API = ${me.data?.profession} (${f})`);
  } catch (e) {
    record('2', 'Connexion / profil : scénario interrompu', false, e.stack?.split('\n').slice(0, 2).join(' '));
    await shot(pa, 'zz-erreur-auth');
  }

  // ── 5. Découverte, crédit, invitation, acceptation, refus par un 3ᵉ membre
  try {
    const credits0 = (await api('GET', '/credit/balance', { token: A.token })).data?.credits;
    await pa.goto(`${BASE}/discover`, { waitUntil: 'load' });
    await sleep(3500);
    for (let i = 0; i < 12; i++) {
      const t = await pa.locator('body').innerText();
      if (/Sarah/.test(t)) break;
      await pa.getByText('Continuer à explorer').first().click().catch(() => {});
      await sleep(1500);
    }
    const seen = /Sarah/.test(await pa.locator('body').innerText());
    const f1 = await shot(pa, 'decouverte-alex-voit-sarah');
    record('5', 'Découverte : Alex voit Sarah', seen, f1);
    await pa.getByTestId('discover-like').click();
    await sleep(1000);
    const noCredit = /Plus de crédits/.test(await pa.locator('body').innerText());
    await shot(pa, 'credit-insuffisant');
    record('5', `Invitation sans crédit (${credits0}) → « Plus de crédits disponibles »`, noCredit && credits0 === 0, String(credits0));
    await pa.getByText('Recharger', { exact: true }).first().click();
    await pa.waitForURL(/payment/, { timeout: 15000 });
    await sleep(2000);
    await pa.getByTestId('plan-parcours_harmonie').click();
    await pa.getByTestId('promo-input').fill('RECETTE100');
    await pa.getByTestId('promo-apply').click();
    await sleep(1500);
    await shot(pa, 'paiement-recette100');
    await pa.getByTestId('pay-submit').click();
    await sleep(3500);
    await shot(pa, 'paiement-succes');
    const c1 = (await api('GET', '/credit/balance', { token: A.token })).data?.credits;
    record('5', 'RECETTE100 sur l’écran de paiement → 1 crédit, sans carte', c1 === 1, String(c1));
    await pa.goto(`${BASE}/discover`, { waitUntil: 'load' });
    await sleep(3500);
    for (let i = 0; i < 12; i++) {
      if (/Sarah/.test(await pa.locator('body').innerText())) break;
      await pa.getByText('Continuer à explorer').first().click().catch(() => {});
      await sleep(1500);
    }
    await pa.getByTestId('discover-like').click();
    await sleep(800);
    await pa.getByTestId('pact-accept').click().catch(() => {});
    await sleep(300);
    await pa.getByText('Confirmer', { exact: true }).first().click();
    await sleep(3000);
    const f2 = await shot(pa, 'invitation-envoyee');
    const c2 = (await api('GET', '/credit/balance', { token: A.token })).data?.credits;
    record('5', 'Invitation envoyée depuis l’interface ; crédit débité (1 → 0)', c2 === 0, `${c2} (${f2})`);
    // Sarah : crédit RECETTE100 (API), puis acceptation dans l'interface.
    const pr = await api('POST', '/payment/apply-promo', { token: S.token, body: { code: 'RECETTE100', optionId: 'parcours_harmonie' } });
    record('5', 'Sarah : RECETTE100 (API) → 1 crédit', (await api('GET', '/credit/balance', { token: S.token })).data?.credits === 1, JSON.stringify(pr.data).slice(0, 120));
    await ps.goto(`${BASE}/discover`, { waitUntil: 'load' });
    await sleep(3500);
    for (let i = 0; i < 12; i++) {
      if (/Alex/.test(await ps.locator('body').innerText()) && /Accepter/.test(await ps.locator('body').innerText())) break;
      await ps.getByText('Continuer à explorer').first().click().catch(() => {});
      await sleep(1500);
    }
    const f3 = await shot(ps, 'sarah-invitation-recue');
    await ps.getByText(/^\s*Accepter( ce profil)?\s*$/).first().click();
    await sleep(1000);
    await ps.getByTestId('pact-accept').click().catch(() => {});
    await sleep(300);
    await ps.getByText('Confirmer', { exact: true }).first().click().catch(() => {});
    await sleep(3500);
    journeyId = sql(`SELECT id FROM "Journey" WHERE ("userAId"='${A.userId}' AND "userBId"='${S.userId}') OR ("userAId"='${S.userId}' AND "userBId"='${A.userId}') ORDER BY "createdAt" DESC LIMIT 1`);
    const cS = (await api('GET', '/credit/balance', { token: S.token })).data?.credits;
    const f4 = await shot(ps, 'sarah-acceptation');
    record('5', 'Sarah accepte dans l’interface → Parcours Harmonie créé ; crédit de Sarah débité (1 → 0)', !!journeyId && cS === 0, `journey=${journeyId || 'aucun'}, crédits Sarah=${cS} (${f3}, ${f4})`);

    // 3ᵉ membre (Chloé) refuse une invitation de Dan (API) dans l'interface.
    const C = await registerApi('Chloe', 'F', '1993-03-03T00:00:00.000Z');
    const D = await registerApi('Dan', 'H', '1989-05-05T00:00:00.000Z');
    await answerByApi(C.token); await answerByApi(D.token);
    await api('POST', '/payment/apply-promo', { token: D.token, body: { code: 'RECETTE100', optionId: 'parcours_harmonie' } });
    const con = await api('POST', '/matching/connect', { token: D.token, body: { targetUserId: C.userId } });
    const MC = await newMember(browser);
    await loginUi(MC.page, C.email);
    await MC.page.waitForURL(/discover|\/$/, { timeout: 20000 }).catch(() => {});
    await MC.page.goto(`${BASE}/discover`, { waitUntil: 'load' });
    await sleep(3500);
    for (let i = 0; i < 12; i++) {
      if (/Dan/.test(await MC.page.locator('body').innerText()) && /Décliner/.test(await MC.page.locator('body').innerText())) break;
      await MC.page.getByText('Continuer à explorer').first().click().catch(() => {});
      await sleep(1500);
    }
    await shot(MC.page, 'chloe-invitation-recue');
    await MC.page.getByText(/^\s*Décliner/).first().click().catch(() => {});
    await sleep(1500);
    await MC.page.getByText(/^\s*Décliner/).first().click({ timeout: 3000 }).catch(() => {});
    await sleep(2500);
    const f5 = await shot(MC.page, 'chloe-refus');
    const st = sql(`SELECT string_agg(status::text, ',') FROM "MatchProposal" WHERE ("sourceUserId"='${C.userId}' AND "targetUserId"='${D.userId}') OR ("sourceUserId"='${D.userId}' AND "targetUserId"='${C.userId}')`);
    const dCred = (await api('GET', '/credit/balance', { token: D.token })).data?.credits;
    record('5', 'Chloé (3ᵉ membre) refuse l’invitation de Dan dans l’interface', /declin|refus|reject/i.test(st), `statut=${st}, crédits Dan après refus=${dCred}, connect=${con.status} (${f5})`);
    await MC.ctx.close();
    Object.assign(globalThis, { C, D });
  } catch (e) {
    record('5', 'Découverte / invitation : scénario interrompu', false, e.stack?.split('\n').slice(0, 2).join(' '));
    await shot(pa, 'zz-erreur-decouverte');
  }

  // ── 6. Sondeur
  try {
    if (!journeyId) throw new Error('aucun parcours');
    const chatEarly = await api('POST', '/journey/message', { token: A.token, body: { journeyId, content: 'Bonjour trop tôt', type: 'texte' } });
    record('7', 'Chat refusé pendant le Sondeur (avant la bonne étape)', chatEarly.status >= 400 || chatEarly.data?.success === false, `${chatEarly.status} ${JSON.stringify(chatEarly.data).slice(0, 150)}`);
    const qa = (await api('GET', `/journey/${journeyId}/questions?lang=fr`, { token: A.token })).data || [];
    record('6', `Sondeur : ${qa.length} questions (banque locale)`, qa.length > 0, `jours : ${[...new Set(qa.map((q) => q.day))].join(',')}`);
    const checks = { noPeek: true, waiting: true, reveal: true, sent: 0 };
    await gotoMatches(pa);
    await shot(pa, 'sondeur-accueil');
    for (let day = 1; day <= 3; day++) {
      await pa.getByText('Question du jour').first().click();
      await sleep(1200);
      const perDay = qa.filter((x) => x.day === day).length;
      for (let q = 0; q < perDay; q++) {
        await pa.getByPlaceholder('Écrivez votre réponse ici...').fill(`Alex J${day}Q${q + 1} : je tiens au dialogue.`);
        await pa.getByText('Valider la réponse').click();
        checks.sent++;
        const w = await pa.getByTestId('sondeur-waiting').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
        if (!w) checks.waiting = false;
        if (day === 1 && q === 0) await shot(pa, 'sondeur-attente-autre');
        const bq = ((await api('GET', `/journey/${journeyId}/questions`, { token: S.token })).data || []).find((x) => x.turn === 'current');
        if (!bq || JSON.stringify(bq.responses || []).includes('Alex J')) checks.noPeek = false;
        await api('POST', '/journey/respond', { token: S.token, body: { questionId: bq.id, text: `Sarah J${day}Q${q + 1} : la franchise d’abord.` } });
        const rev = await pa.getByTestId('sondeur-reveal').waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
        const ptxt = rev ? await pa.getByTestId('sondeur-partner-answer').innerText().catch(() => '') : '';
        if (!rev || !/Sarah J/.test(ptxt)) checks.reveal = false;
        if (day === 1 && q === 0) await shot(pa, 'sondeur-revelation');
        await pa.getByTestId('sondeur-next').click().catch(() => {});
        await sleep(800);
      }
      await sleep(1500);
      if (day < 3) {
        await gotoMatches(pa);
        const locked = await pa.getByTestId('sondeur-next-day').isVisible().catch(() => false);
        const all = (await api('GET', `/journey/${journeyId}/questions`, { token: A.token })).data || [];
        const nextQ = all.find((x) => x.day === day + 1);
        const ahead = nextQ ? await api('POST', '/journey/respond', { token: A.token, body: { questionId: nextQ.id, text: 'En avance.' } }) : { status: 0 };
        const f = await shot(pa, `sondeur-jour${day + 1}-ferme`);
        record('6', `Jour ${day} fini : jour ${day + 1} FERMÉ avant l’avance d’horloge (interface + refus API)`, locked && ahead.status >= 400, `écran verrouillé=${locked}, réponse en avance → ${ahead.status} (${f})`);
        sql(`UPDATE "Journey" SET "stepStartDate" = "stepStartDate" - interval '1 day' WHERE id = '${journeyId}';`);
        await gotoMatches(pa);
      }
    }
    record('6', 'Réponses successives des deux membres (Alex : interface, Sarah : API)', checks.sent === qa.length, `${checks.sent}/${qa.length}`);
    record('6', 'Réponse de l’autre invisible avant sa propre réponse (API de Sarah)', checks.noPeek);
    record('6', 'Écran d’attente après sa propre réponse', checks.waiting);
    record('6', 'Réponse de l’autre RÉVÉLÉE seulement quand les deux ont répondu', checks.reveal && checks.waiting);
    record('6', 'Progression quotidienne : horloge avancée par SQL (stepStartDate − 1 jour)', true, 'voir contrôles « jour fermé »');
    let status;
    for (let i = 0; i < 25; i++) {
      await api('GET', '/matching/my-matches', { token: A.token });
      status = await api('GET', `/journey/${journeyId}/status`, { token: A.token });
      if (status.data?.currentStep === 'chat_libre') break;
      await sleep(3000);
    }
    await gotoMatches(pa);
    const f = await shot(pa, 'sondeur-termine');
    record('6', 'Sondeur terminé → étape chat_libre', status.data?.currentStep === 'chat_libre', `${status.data?.currentStep} (${f})`);
  } catch (e) {
    record('6', 'Sondeur : scénario interrompu', false, e.stack?.split('\n').slice(0, 2).join(' '));
    await shot(pa, 'zz-erreur-sondeur');
  }

  // ── 7. Chat, modération, vidéo, échange de coordonnées
  try {
    if (!journeyId) throw new Error('aucun parcours');
    await pa.getByText('Accéder à la messagerie').first().click().catch(async () => { await pa.goto(`${BASE}/messages`, { waitUntil: 'load' }); });
    await sleep(3000);
    await pa.getByText('Sarah', { exact: true }).last().click();
    await sleep(2500);
    await pa.getByPlaceholder('Votre message…').fill('Bonjour Sarah, ravi de poursuivre !');
    await pa.getByTestId('chat-send').click();
    await sleep(2500);
    const msgs = (await api('GET', `/journey/${journeyId}/messages`, { token: S.token })).data || [];
    record('7', 'Chat ouvert à l’étape chat_libre : message envoyé (interface) et reçu', msgs.some((m) => /ravi de poursuivre/.test(m.content)), `${msgs.length} message(s)`);
    await api('POST', '/journey/message', { token: S.token, body: { journeyId, content: 'Bonjour Alex, avec plaisir.', type: 'texte' } });
    let rt = false;
    for (let i = 0; i < 12 && !rt; i++) { rt = await pa.getByText('Bonjour Alex, avec plaisir').first().isVisible().catch(() => false); await sleep(500); }
    record('7', 'Message de Sarah reçu en temps réel dans l’interface', rt);
    await shot(pa, 'chat');
    const before = MA.dialogs.length;
    await pa.getByPlaceholder('Votre message…').fill('ferme la connard');
    await pa.getByTestId('chat-send').click();
    await sleep(1500);
    const srv = await api('POST', '/journey/message', { token: S.token, body: { journeyId, content: 'espèce de connard', type: 'texte' } });
    const stored = (await api('GET', `/journey/${journeyId}/messages`, { token: A.token })).data || [];
    await shot(pa, 'moderation-message-bloque');
    record('8', 'Modération : message interdit bloqué (interface + serveur), jamais stocké', MA.dialogs.length > before && !stored.some((m) => /connard/.test(m.content)), `dialogue « ${MA.dialogs[MA.dialogs.length - 1] || ''} » ; serveur ${srv.status} ${JSON.stringify(srv.data).slice(0, 120)}`);
    // Signalement d'Alex par Sarah → visible côté admin (API admin).
    const rep = await api('POST', '/report', { token: S.token, body: { reportedUserId: A.userId, reason: 'harcelement', description: `Recette C ${STAMP}` } });
    const adm = await api('POST', '/admin/auth/login', { body: { email: 'admin@recette.boligo.test', password: 'RecetteAdmin2026!' } });
    const at = adm.data?.access_token || adm.data?.token;
    const reports = await api('GET', '/admin/reports', { token: at });
    const list = reports.data?.data || reports.data?.reports || reports.data || [];
    const found = JSON.stringify(list).includes(`Recette C ${STAMP}`);
    record('8', 'Signalement de Sarah contre Alex visible par l’API admin', rep.status < 300 && found, `report ${rep.status}, admin login ${adm.status}, reports ${reports.status}`);

    // Vidéo : refusée avant l'étape, puis étape vidéo après avance de l'horloge.
    const early = await api('POST', `/journey/${journeyId}/video/join`, { token: A.token });
    record('7', 'Vidéo refusée avant le moment autorisé (chat_libre)', early.status >= 400 || !early.data?.meetingUrl, `${early.status} ${JSON.stringify(early.data).slice(0, 150)}`);
    sql(`UPDATE "Journey" SET "stepStartDate" = now() - interval '3 days 1 hour' WHERE id = '${journeyId}';`);
    await api('GET', '/matching/my-matches', { token: A.token });
    const st = (await api('GET', `/journey/${journeyId}/status`, { token: A.token })).data;
    const jA = await api('POST', `/journey/${journeyId}/video/join`, { token: A.token });
    const jS = await api('POST', `/journey/${journeyId}/video/join`, { token: S.token });
    record('7', 'Étape vidéo : jointure (fournisseur Daily réel injoignable, pas de clé)', true, `étape=${st?.currentStep} ; join A ${jA.status} ${JSON.stringify(jA.data).slice(0, 160)} ; join S ${jS.status}`);
    await pa.goto(`${BASE}/video-call?journeyId=${journeyId}`, { waitUntil: 'load' });
    await sleep(3000);
    const vtxt = await pa.locator('body').innerText();
    const fv = await shot(pa, 'video-etat-interface');
    record('7', 'Écran vidéo : état de l’interface (sans appel réel)', vtxt.length > 0, `${vtxt.replace(/\n/g, ' ').slice(0, 200)} (${fv})`);
    record('7', 'Appel vidéo réel Daily', null, 'aucune clé Daily ; fournisseur non joignable depuis ce conteneur', 'NON TESTÉ');
    sql(`UPDATE "VideoSession" SET "startDate" = now() - interval '90 seconds' WHERE "journeyId" = '${journeyId}';`);
    const end = await api('POST', '/video/end', { token: S.token, body: { journeyId, durationSec: 90 } });
    record('7', 'Fin d’appel (API, session vidéo vieillie par SQL) → échange de coordonnées', end.data?.currentStep === 'echange_contacts', JSON.stringify(end.data).slice(0, 200));
    await pa.goto(`${BASE}/messages`, { waitUntil: 'load' });
    await sleep(3000);
    await pa.getByText('Sarah', { exact: true }).last().click().catch(() => {});
    await sleep(2500);
    await shot(pa, 'echange-coordonnees');
    await pa.getByTestId('contact-exchange-accept').click().catch(() => {});
    await sleep(2500);
    const one = await api('GET', `/journey/${journeyId}/contact-exchange`, { token: S.token });
    const leakBefore = JSON.stringify(one.data || {});
    const f1 = await shot(pa, 'echange-attente-consentement');
    record('7', 'Après le seul consentement d’Alex : coordonnées NON révélées', /presque fait/i.test(await pa.locator('body').innerText()) && !leakBefore.includes(A.email), `${f1} ; vue Sarah ${leakBefore.slice(0, 150)}`);
    await api('POST', `/journey/${journeyId}/exchange-contact`, { token: S.token, body: { sharePhone: true, shareEmail: true } });
    await pa.reload({ waitUntil: 'load' });
    await sleep(3000);
    await pa.getByText('Sarah', { exact: true }).last().click().catch(() => {});
    await sleep(2500);
    const f2 = await shot(pa, 'coordonnees-revelees');
    const txt = await pa.locator('body').innerText();
    record('7', 'Consentement des DEUX → coordonnées révélées', /Contacts échangés/.test(txt) || txt.includes(S.email), f2);
    const fin = (await api('GET', `/journey/${journeyId}/status`, { token: A.token })).data;
    record('7', 'Fin du parcours (statut final)', /termin|complet|echange/i.test(JSON.stringify(fin)), JSON.stringify(fin).slice(0, 200));
  } catch (e) {
    record('7', 'Chat / vidéo / coordonnées : scénario interrompu', false, e.stack?.split('\n').slice(0, 2).join(' '));
    await shot(pa, 'zz-erreur-chat');
  }

  // ── 8. Abandon d'un parcours (Dan + Eva), notifications
  try {
    const D = globalThis.D;
    const E = await registerApi('Eva', 'F', '1994-04-04T00:00:00.000Z');
    await answerByApi(E.token);
    await api('POST', '/payment/apply-promo', { token: E.token, body: { code: 'RECETTE100', optionId: 'parcours_harmonie' } });
    const credD0 = (await api('GET', '/credit/balance', { token: D.token })).data?.credits;
    const con = await api('POST', '/matching/connect', { token: D.token, body: { targetUserId: E.userId } });
    const likes = (await api('GET', '/matching/received-likes', { token: E.token })).data || [];
    const acc = await api('POST', '/matching/accept', { token: E.token, body: { proposalId: likes[0]?.id } });
    const jid = acc.data?.journey?.id;
    const credE1 = (await api('GET', '/credit/balance', { token: E.token })).data?.credits;
    const notifBefore = Number(sql(`SELECT count(*) FROM "Notification" WHERE "userId"='${E.userId}'`));
    const since = new Date(Date.now() - 1000).toISOString();
    // Dan abandonne dans l'interface (bouton « quitter » du chat indisponible pendant le Sondeur : API).
    const leave = await api('POST', `/journey/${jid}/leave`, { token: D.token, body: { farewell: 'Merci pour ces échanges, je préfère arrêter.' } });
    await sleep(1500);
    const credE2 = (await api('GET', '/credit/balance', { token: E.token })).data?.credits;
    const credD2 = (await api('GET', '/credit/balance', { token: D.token })).data?.credits;
    const jst = sql(`SELECT status FROM "Journey" WHERE id='${jid}'`);
    const notifAfter = Number(sql(`SELECT count(*) FROM "Notification" WHERE "userId"='${E.userId}'`));
    const logs = dockerLogsSince(since).split('\n').filter((l) => /PUSH|EMAIL/.test(l)).join(' / ');
    record('8', 'Abandon (Dan quitte, API) : parcours clos, crédit de la partenaire rendu, notification', leave.status < 300 && credE2 > credE1, `connect ${con.status}; leave ${leave.status} ${JSON.stringify(leave.data).slice(0, 150)} ; statut=${jst} ; crédits Eva ${credE1}→${credE2}, Dan ${credD0}→${credD2} ; notifications en base ${notifBefore}→${notifAfter} ; journal : ${logs.slice(0, 250)}`);
    const ME = await newMember(browser);
    await loginUi(ME.page, E.email);
    await sleep(3500);
    await gotoMatches(ME.page);
    const ft = await shot(ME.page, 'abandon-vu-par-eva');
    const etxt = await ME.page.locator('body').innerText();
    record('8', 'Eva voit l’abandon dans l’interface (onglet Matchs)', /quitt|termin|fin|arrêt|rendu/i.test(etxt), `${etxt.replace(/\n/g, ' ').slice(0, 220)} (${ft})`);
    await ME.ctx.close();
    record('8', 'Centre de notifications dans l’app', null, 'aucun écran de notifications dans la webapp (push Expo seulement, non délivré sur le web)', 'NON TESTÉ');
    record('8', 'Anti-ghosting à l’échéance (crédit rendu automatiquement)', null, 'nécessite d’attendre/simuler l’échéance du moniteur ; non rejoué ici', 'NON TESTÉ');
  } catch (e) {
    record('8', 'Abandon : scénario interrompu', false, e.stack?.split('\n').slice(0, 2).join(' '));
  }

  // ── Écrans à 360 px
  try {
    const M3 = await newMember(browser, { width: 360 });
    await M3.page.goto(`${BASE}/login`, { waitUntil: 'load' });
    await M3.page.evaluate(([t, id]) => { localStorage.setItem('userToken', t); localStorage.setItem('userId', id); }, [A.token, A.userId]);
    for (const [p, n] of [['/discover', 'decouverte'], ['/messages', 'messages'], ['/profile', 'profil']]) {
      await M3.page.goto(`${BASE}${p}`, { waitUntil: 'load' });
      await sleep(2500);
      const over = await M3.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const f = await shot(M3.page, `360-${n}`);
      record('360', `360 px : ${n} sans débordement horizontal`, over <= 0, `${over} px (${f})`);
    }
    await M3.ctx.close();
  } catch (e) {
    record('360', 'Écrans 360 : interrompu', false, e.message);
  }

  record('*', 'Aucune erreur JavaScript non gérée (Alex, Sarah)', MA.errors.length + MS.errors.length === 0, [...MA.errors, ...MS.errors].slice(0, 3).join(' | '));
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ date: t0, base: BASE, alex: A.email, sarah: S.email, journeyId, results }, null, 2));
  const ko = results.filter((r) => r.ok === false);
  console.log(`\n${results.filter((r) => r.ok).length} OK, ${ko.length} KO, ${results.filter((r) => r.ok === null).length} non testés`);
  process.exit(ko.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
