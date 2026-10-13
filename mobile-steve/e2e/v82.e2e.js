/* eslint-disable no-console */
/**
 * Recette navigateur BOLIGO V8.2 (export web + backend de test LOCAL).
 *
 *   APP_URL=http://localhost:8081 API_URL=http://localhost:3000/api \
 *   E2E_PSQL="psql postgresql://boligo:boligo@localhost:5432/boligo_web_v82" \
 *   node e2e/v82.e2e.js
 *
 * Backend lancé avec INTERVIEW_VERSION=8.2 et OTP_DEBUG=true, sur une base
 * locale vide. Ne jamais lancer contre la production.
 *
 * A (Homme, interface FR) rejoue dans Chromium : Grand Entretien FR/EN, plage
 * d'âge, accord pour les questions sensibles, reprise après interruption,
 * questions conditionnelles, Découverte, invitation, Sondeur sur 3 jours.
 * B (Femme, interface EN) est pilotée par l'API et refuse les questions
 * sensibles.
 *
 * Réponses scriptées choisies pour que le couple porte de VRAIS écarts non
 * sensibles (épargne M4_Q14 A/C, déménagement M0_Q03 A/D) et un risque
 * partagé (M3_Q12 C/C) : le faux OpenRouter (e2e/fake-openrouter.js) y
 * rédige des questions valides et des questions pièges, que le backend doit
 * rejeter (NO_FAKE_GAP). Il lit le jour 1 comme un écart non compris et le
 * jour 2 comme un écart compris (ADAPTIVE_FOLLOWUP).
 *
 * Backend de recette lancé avec INSIGHTS_RETRY_AFTER_MS=2000 (écart entre
 * deux essais de lecture ; la règle des trois essais ne change pas).
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { execSync } = require('child_process');

const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const API = process.env.API_URL || 'http://localhost:3000/api';
const E2E_PSQL = process.env.E2E_PSQL || '';
const FAKE_URL = process.env.FAKE_OPENROUTER_URL || 'http://localhost:8799';
if (!/localhost|127\.0\.0\.1/.test(API) || !/localhost|127\.0\.0\.1/.test(FAKE_URL) || (E2E_PSQL && !/localhost|127\.0\.0\.1/.test(E2E_PSQL))) {
  console.error('Recette réservée à un backend et une base locaux.');
  process.exit(2);
}
const SHOTS = path.resolve(__dirname, '..', 'docs', 'screenshots', 'v82');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const record = (step, ok, detail = '') => {
  results.push({ step, ok: !!ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`);
};
/** Contrôle sans objet dans cette configuration : affiché, jamais compté. */
const notApplicable = (step, detail = '') => {
  results.push({ step, ok: null, na: true, detail });
  console.log(`➖ N/A ${step}${detail ? ' — ' + detail : ''}`);
};
/**
 * Rédaction IA du Sondeur désactivée (production en repli, fail-closed) :
 * E2E_SONDEUR_AI=off, ou aucune demande de rédaction reçue par le faux
 * OpenRouter.
 */
async function sondeurAiOff() {
  if (process.env.E2E_SONDEUR_AI === 'off') return true;
  if (process.env.E2E_SONDEUR_AI === 'on') return false;
  const stats = await fetch(`${FAKE_URL}/__stats`).then((r) => r.json()).catch(() => null);
  return !!stats && !(stats.byKind?.sondeur_writer > 0);
}
const sql = (q) =>
  execSync(`${E2E_PSQL} -tA`, { input: q, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function register(firstName, gender, birth) {
  const email = `v82-${firstName.toLowerCase()}-${Date.now()}@example.test`;
  const password = 'Password12!';
  const reg = await api('POST', '/auth/register', {
    body: { email, password, firstName, lastName: 'Recette', birthDate: birth, gender, city: 'Paris, France', telephone: `+3361${Math.floor(1e7 + Math.random() * 8e7)}`, job: 'Architecte', meetingScope: 'international', acceptTerms: true, termsVersion: '2026-10-03' },
  });
  if (reg.status >= 300) throw new Error(`inscription ${firstName} : ${JSON.stringify(reg.data)}`);
  const ver = await api('POST', '/auth/verify-email', { body: { email, code: '1234' } });
  return { email, password, token: ver.data.access_token, userId: ver.data.userId };
}

/** Réponses imposées (identifiant d'entretien → option) pour créer de vrais écarts. */
const FORCED_A = { M3_Q12: 'C' };
const FORCED_B = { M4_Q14: 'C', M0_Q03: 'D', M3_Q12: 'C' };
/** Emoji de chaque thème du Sondeur (src/matching/divergence.engine.ts). */
const THEME_EMOJI = {
  'Famille': '👨‍👩‍👧', 'Argent & dettes': '💶', 'Religion & spiritualité': '🕊️', 'Intimité & sexualité': '❤️‍🔥',
  'Communication & émotions': '💬', 'Projet de vie': '🌱', 'Lieu de vie & mobilité': '🧭',
};

/** Membre piloté par l'API : premières options (sauf réponses imposées), plage d'âge, langue choisie. */
async function answerByApi(member, lang, forced = {}) {
  for (let m = 0; m <= 10; m++) {
    const answers = {};
    for (let round = 0; round < 3; round++) {
      const q = await api('GET', `/interview/questions/${m}?lang=${lang}`, { token: member.token });
      const pending = (q.data || []).filter((x) => !(x.id in answers));
      if (!pending.length) break;
      for (const x of pending) {
        if (x.input === 'ageRange') answers[x.id] = '30-42';
        else if (forced[x.id] && x.options.some((o) => o.key === forced[x.id])) answers[x.id] = forced[x.id];
        else answers[x.id] = (x.options.find((o) => !o.freeText) || x.options[0])?.key || 'A';
      }
      await api('POST', '/interview/save-module', { token: member.token, body: { moduleNumber: m, moduleName: `Module ${m}`, answers } });
    }
  }
}

function watchAppDialogs(pg, sink) {
  let busy = false;
  const timer = setInterval(async () => {
    if (busy || pg.isClosed()) return;
    busy = true;
    try {
      const box = pg.locator('[data-testid="app-dialog"]');
      if (await box.count()) {
        const title = await pg.locator('[data-testid="app-dialog-title"]').first().innerText().catch(() => '');
        const msg = await pg.locator('[data-testid="app-dialog-message"]').first().innerText().catch(() => '');
        sink.push([title, msg].filter(Boolean).join(' — '));
        await pg.locator('[data-testid="app-dialog-confirm"]').first().click({ timeout: 2000 }).catch(() => {});
      }
    } catch { /* navigation */ } finally { busy = false; }
  }, 400);
  pg.on('close', () => clearInterval(timer));
  pg.on('dialog', (d) => { sink.push(d.message()); d.accept().catch(() => {}); });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() =>
    chromium.launch({ args: ['--no-sandbox'] }));
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 900 },
    locale: 'fr-FR',
    // E2E_VIDEO=1 : vidéo de démonstration du parcours (dossier docs/screenshots/v82/video).
    ...(process.env.E2E_VIDEO ? { recordVideo: { dir: path.join(SHOTS, 'video'), size: { width: 420, height: 900 } } } : {}),
  });
  const page = await ctx.newPage();
  const dialogs = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  watchAppDialogs(page, dialogs);
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${n}.png`) });
  const body = () => page.locator('body').innerText();

  try {
    // ── 0. Comptes : A (navigateur, FR), B (API, EN, refuse les questions sensibles)
    const A = await register('Steve', 'H', '1990-04-12T00:00:00.000Z');
    const B = await register('Nadia', 'F', '1992-09-15T00:00:00.000Z');
    record('Comptes de recette créés (OTP de test)', !!A.token && !!B.token);

    // ── 1. Connexion → reprise au module 0 (entretien vierge)
    await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('votre@email.com').fill(A.email);
    await page.getByPlaceholder('••••••••').fill(A.password);
    await page.getByText('Se connecter', { exact: true }).click();
    await page.waitForURL(/interview\/0/, { timeout: 20000 });
    await sleep(1500);
    record('Connexion → Grand Entretien module 0 (entretien vierge)', true);
    const version = sql(`SELECT "questionnaireVersion" FROM "InterviewIA" WHERE "userId"='${A.userId}'`);
    record('Entretien créé et verrouillé en V8.2', version.split('\n').every((v) => v === '8.2') && version.length > 0, version);
    await shot('01-entretien-module0');

    // Questions servies par module (pour vérifier les conditions à la fin).
    const served = {};
    for (let m = 0; m <= 10; m++) {
      served[m] = (await api('GET', `/interview/questions/${m}?lang=fr`, { token: A.token })).data || [];
    }
    const total = Object.values(served).reduce((n, l) => n + l.length, 0);
    const conditional = Object.values(served).flat().filter((q) => q.askIf?.length);
    record('Questions V8.2 servies à A', total > 0, `${total} questions, ${conditional.length} conditionnelles`);

    // ── 2. Grand Entretien dans le navigateur
    let answered = 0;
    let ageChecked = false;
    let consentShown = false;
    let englishChecked = false;
    let resumed = false;
    let modOf = () => Number((page.url().match(/interview\/(\d+)/) || [])[1]);
    for (let i = 0; i < 400; i++) {
      if (/interview\/(generation|summary)/.test(page.url())) break;
      const mod = modOf();

      // FR → EN au module 1, réponses conservées, retour en FR au module 2.
      if (mod === 1 && !englishChecked) {
        await page.getByTestId('interview-lang-en').click();
        await sleep(1500);
        const t = await body();
        englishChecked = true;
        // Question ou demande d'accord en attente : tout passe en anglais.
        const en = /\b(you|your)\b/i.test(t) && !/J’accepte de répondre|\bvous\b|\bvotre\b/.test(t);
        record('Grand Entretien : bascule en anglais au milieu d’un module', en);
        await shot('02-entretien-anglais');
      }
      if (mod === 2 && englishChecked && !page.__backToFr) {
        page.__backToFr = true;
        await page.getByTestId('interview-lang-fr').click();
        await sleep(1200);
      }

      // Interruption au milieu du module 3 : rechargement complet de l'app.
      if (mod === 3 && !resumed && answered > 0 && page.__mod3answers >= 2) {
        resumed = true;
        await page.goto(APP_URL, { waitUntil: 'networkidle' });
        await page.waitForURL(/interview\/\d+/, { timeout: 20000 });
        await sleep(1500);
        record('Reprise après interruption : retour au module en cours', modOf() === 3, page.url());
        await shot('03-reprise');
        continue;
      }

      const pageText = await body().catch(() => '');
      const ageMin = page.getByTestId('interview-age-min');
      if (await ageMin.isVisible().catch(() => false)) {
        await ageMin.fill('45');
        await page.getByTestId('interview-age-max').fill('30');
        await sleep(200);
        const disabled = (await page.getByTestId('interview-age-validate').getAttribute('aria-disabled')) === 'true';
        await shot('04-plage-age-invalide');
        await ageMin.fill('28');
        await page.getByTestId('interview-age-max').fill('38');
        await sleep(200);
        const enabled = (await page.getByTestId('interview-age-validate').getAttribute('aria-disabled')) !== 'true';
        record('Plage d’âge : 45-30 refusée, 28-38 acceptée', disabled && enabled);
        ageChecked = true;
        await page.getByTestId('interview-age-validate').click();
        answered++;
        await sleep(900);
        continue;
      }

      const yes = page.getByTestId('option-yes');
      if (await yes.isVisible().catch(() => false)) {
        consentShown = true;
        await shot('05-accord-sensible');
        await yes.click();
        await sleep(900);
        continue;
      }

      // Réponse imposée (risque partagé M3_Q12) : la question est reconnue à son texte.
      const forcedHere = Object.entries(FORCED_A).find(([id]) => {
        const q = (served[mod] || []).find((x) => x.id === id);
        const label = q && (q.text || q.questionText || '');
        return label && pageText.includes(label.slice(0, 40));
      });
      if (forcedHere && !page.__forced?.[forcedHere[0]]) {
        const opt = page.getByTestId(`option-${forcedHere[1]}`);
        if (await opt.isVisible().catch(() => false)) {
          page.__forced = { ...(page.__forced || {}), [forcedHere[0]]: true };
          await opt.click();
          await sleep(300);
          const v = page.getByTestId('interview-validate');
          if (await v.isVisible().catch(() => false) && (await v.getAttribute('aria-disabled')) !== 'true') await v.click();
          answered++;
          if (mod === 3) page.__mod3answers = (page.__mod3answers || 0) + 1;
          await sleep(900);
          continue;
        }
      }

      const validate = page.getByTestId('interview-validate');
      if (await validate.isVisible().catch(() => false)) {
        if ((await validate.getAttribute('aria-disabled')) === 'true') {
          await page.locator('[data-testid^="option-"]').first().click();
          await sleep(200);
        }
        if ((await validate.getAttribute('aria-disabled')) === 'true') {
          await page.getByTestId('interview-other').fill('Bambara').catch(() => {});
        }
        await validate.click();
        answered++;
        if (mod === 3) page.__mod3answers = (page.__mod3answers || 0) + 1;
        await sleep(900);
        continue;
      }

      const opt = page.locator('[data-testid^="option-"]:not([data-testid="option-no"])').first();
      if (await opt.isVisible().catch(() => false)) {
        await opt.click();
        answered++;
        if (mod === 3) page.__mod3answers = (page.__mod3answers || 0) + 1;
        await sleep(800);
      } else {
        await sleep(600);
      }
    }
    record(`Grand Entretien terminé dans le navigateur (${answered} réponses)`, /interview\/(generation|summary)/.test(page.url()), page.url());
    record('Plage d’âge saisie dans le navigateur', ageChecked);
    record('Accord pour les questions sensibles demandé avant la première', consentShown);
    const consent = await api('GET', '/interview/sensitive-consent', { token: A.token });
    record('Accord enregistré côté serveur', consent.data?.consent === true, JSON.stringify(consent.data));

    // Conditions : une question conditionnelle n'a de réponse que si sa condition est remplie.
    const rows = sql(`SELECT r."rawResponses" FROM "ModuleResponse" r JOIN "InterviewIA" i ON i.id=r."interviewId" WHERE i."userId"='${A.userId}'`);
    const stored = Object.assign({}, ...rows.split('\n').filter(Boolean).map((l) => JSON.parse(l)));
    const met = (q) => q.askIf.some((d) => String(stored[d.questionId] ?? '').split(',').some((k) => d.values.includes(k.trim())));
    const wrong = conditional.filter((q) => (q.id in stored) !== met(q));
    record('Questions conditionnelles : posées si et seulement si la condition est remplie', wrong.length === 0,
      `${conditional.filter(met).length} posées, ${conditional.filter((q) => !met(q)).length} écartées${wrong.length ? ' ; écarts : ' + wrong.map((q) => q.id).join(',') : ''}`);
    record('Réponse scriptée de A enregistrée (M3_Q12 = C, risque partagé avec B)', stored.M3_Q12 === 'C', String(stored.M3_Q12));
    const ageStored = Object.entries(stored).find(([, v]) => /^\d{2}-\d{2}$/.test(String(v)));
    record('Plage d’âge enregistrée « 28-38 »', ageStored?.[1] === '28-38', JSON.stringify(ageStored));

    await page.waitForURL(/interview\/summary/, { timeout: 40000 }).catch(() => {});
    await sleep(3000);
    await shot('06-bilan');
    const bilan = await body();
    record('Bilan affiché sans « undefined » ni texte vide', /Grand Entretien/.test(bilan) && !/undefined|null\b/.test(bilan));

    // ── 3. B : entretien en anglais par l'API, questions sensibles refusées
    await api('POST', '/interview/sensitive-consent', { token: B.token, body: { accepted: false } });
    await answerByApi(B, 'en', FORCED_B);
    const bStatus = await api('GET', '/interview/status', { token: B.token });
    record('B : entretien V8.2 terminé en anglais, sans questions sensibles', bStatus.data?.isCompleted === true, JSON.stringify({ done: bStatus.data?.isCompleted }));

    // ── 4. Découverte et invitation
    await page.goto(`${APP_URL}/discover`, { waitUntil: 'networkidle' });
    await sleep(3500);
    const disc = await api('GET', '/matching/discover', { token: A.token });
    const nadia = (disc.data || []).find((p) => p.firstName === 'Nadia');
    await shot('07-decouverte');
    record('Découverte : B proposée à A', !!nadia && (await page.getByText('Nadia').first().isVisible().catch(() => false)), nadia ? `${nadia.compatibility} %` : 'absente');
    const leak = JSON.stringify(nadia || {});
    record('Découverte : aucune donnée interne exposée (safetyHold, réponses brutes, consentement)', !/safetyHold|rawResponses|sensitiveConsent|"M\d+_Q\d+"\s*:/.test(leak));

    // Crédits de recette : un code gratuit créé dans la base locale.
    const promo = `V82${Date.now().toString(36).toUpperCase()}`;
    sql(`INSERT INTO "PromoCode" (id, code, "discountType", "discountValue", "maxUses", "isActive") VALUES (gen_random_uuid()::text, '${promo}', 'free', 0, 5, true);`);
    for (const m of [A, B]) await api('POST', '/payment/apply-promo', { token: m.token, body: { code: promo, optionId: 'parcours_harmonie' } });
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(3000);
    await page.getByTestId('discover-like').click();
    await sleep(700);
    await page.getByTestId('pact-accept').click().catch(() => {});
    await sleep(300);
    await page.getByText('Confirmer', { exact: true }).first().click();
    await sleep(3000);
    await shot('08-invitation');
    const likes = await api('GET', '/matching/received-likes', { token: B.token });
    record('Invitation envoyée depuis le navigateur, reçue par B', (likes.data || []).length === 1);
    const accept = await api('POST', '/matching/accept', { token: B.token, body: { proposalId: likes.data?.[0]?.id } });
    const journeyId = accept.data?.journey?.id;
    record('B accepte → parcours Harmonie créé', !!journeyId, accept.data?.message || '');

    // ── 5. Sondeur sur 3 jours (A dans le navigateur en FR, B par l'API en EN)
    const qa = (await api('GET', `/journey/${journeyId}/questions?lang=fr`, { token: A.token })).data || [];
    const qb = (await api('GET', `/journey/${journeyId}/questions?lang=en`, { token: B.token })).data || [];
    record('Sondeur adaptatif : entre 9 et 21 questions, mêmes questions pour les deux membres', qa.length >= 9 && qa.length <= 21 && qb.length === qa.length &&
      qa.map((q) => q.id).join() === qb.map((q) => q.id).join(), `${qa.length}/${qb.length}`);
    // ── NO_FAKE_GAP : aucune question piège (accord, risque partagé) servie ;
    // chaque question de l'IA servie porte une preuve d'écart réel.
    {
      const fake = await fetch(`${FAKE_URL}/__traps`).then((r) => r.json()).catch(() => null);
      const rowsQ = sql(`SELECT json_build_object('day', day, 'text', "questionText", 'meta', meta) FROM "HarmonyQuestion" WHERE "journeyId"='${journeyId}' ORDER BY "sentAt"`)
        .split('\n').filter(Boolean).map((l) => JSON.parse(l));
      const traps = new Set(fake?.traps || []);
      const kindOf = new Map((fake?.evidence || []).map((e) => [e.id, e.kind]));
      const servedTraps = rowsQ.filter((q) => traps.has(q.text));
      const ia = rowsQ.filter((q) => q.meta?.source === 'ia');
      const badIa = ia.filter((q) => {
        const ev = q.meta?.evidence;
        return !ev || ev.claim !== 'divergence' || !(ev.evidence || []).length ||
          ev.evidence.some((id) => kindOf.get(id) !== 'gap');
      });
      const ok = !!fake && traps.size > 0 && ia.length > 0 && servedTraps.length === 0 && badIa.length === 0;
      const ids = [...new Set(ia.flatMap((q) => q.meta.evidence?.evidence || []))];
      if (await sondeurAiOff()) {
        // Repli déterministe : aucune question de l'IA, donc aucun faux écart
        // possible ; un échec (question IA servie) reste un échec.
        if (ia.length === 0 && servedTraps.length === 0)
          notApplicable('NO_FAKE_GAP : questions IA sur un écart réel', `IA désactivée (repli déterministe) : 0 question IA servie sur ${rowsQ.length}`);
        else
          record('NO_FAKE_GAP : IA désactivée, aucune question IA ne doit être servie', false, `${ia.length} question(s) IA, ${servedTraps.length} piège(s) servis`);
      } else
      record('NO_FAKE_GAP : aucune question piège servie, chaque question IA porte une preuve d’écart réel', ok,
        !fake ? `faux OpenRouter injoignable (${FAKE_URL}/__traps)`
          : traps.size === 0 ? 'aucun piège rédigé par le faux OpenRouter : le contrôle ne prouve rien'
            : ia.length === 0 ? 'aucune question IA servie : le contrôle ne prouve rien (écarts réels absents ou rédaction refusée)'
              : `${ia.length} question(s) IA servies (preuves ${ids.map((id) => `${id}=${kindOf.get(id)}`).join(', ')}), ${traps.size} piège(s) rédigé(s), ${servedTraps.length} servi(s)` +
                (servedTraps.length ? ` : ${servedTraps.map((q) => q.text).join(' | ')}` : '') +
                (badIa.length ? ` ; IA sans preuve d’écart : ${badIa.map((q) => q.text).join(' | ')}` : ''));
    }
    const frInEn = qb.filter((q) => /[àâçéèêîôûù]|\bvous\b/i.test(q.questionText));
    record('Sondeur : B lit chaque question en anglais', frInEn.length === 0 && qb.every((q) => q.language === 'en'), frInEn.slice(0, 2).map((q) => q.questionText).join(' | '));

    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
    await sleep(3000);
    await page.getByText('Matchs', { exact: true }).first().click().catch(() => {});
    await sleep(2500);
    await shot('09-sondeur-accueil');
    let sent = 0;
    const secret = 'Je tiens beaucoup à ma famille du Mali.';
    const checks = { noSkip: true, noAdvance: true, noPeek: true, revealBeforeNext: true, resume: false, exit: false };
    const bCurrent = async () => ((await api('GET', `/journey/${journeyId}/questions?lang=en`, { token: B.token })).data || []).find((q) => q.turn === 'current');
    for (let day = 1; day <= 3; day++) {
      await page.getByText('Question du jour').first().click();
      await sleep(1000);
      if (day === 1) await shot('10-sondeur-question');
      const perDay = qa.filter((x) => x.day === day).length;
      for (let q = 0; q < perDay; q++) {
        const txt = day === 1 && q === 0 ? secret : `Réponse ${day}-${q + 1} : je privilégie le dialogue.`;
        // On ne passe aucune question : pas de bouton, et le serveur refuse.
        if (await page.getByTestId('sondeur-vive-voix').isVisible().catch(() => false)) checks.noSkip = false;
        await page.getByPlaceholder('Écrivez votre réponse ici...').fill(txt);
        await page.getByText('Valider la réponse').click();
        sent++;
        await page.getByTestId('sondeur-waiting').waitFor({ timeout: 15000 }).catch(() => { checks.revealBeforeNext = false; });
        if (day === 1 && q === 0) {
          await shot('10b-sondeur-attente');
          const all = (await api('GET', `/journey/${journeyId}/questions`, { token: A.token })).data || [];
          const nextQ = all[1];
          const ahead = await api('POST', '/journey/respond', { token: A.token, body: { questionId: nextQ.id, text: 'Réponse prise d’avance.' } });
          if (ahead.status < 400) checks.noAdvance = false;
        }
        // B ne voit pas la réponse de A avant d'avoir répondu.
        const bq = await bCurrent();
        if (!bq || (bq.responses || []).some((r) => r.userId === A.userId)) checks.noPeek = false;
        if (day === 1 && q === 0) {
          const skip = await api('POST', '/journey/respond', { token: B.token, body: { questionId: bq.id, text: "I'd rather talk about it in person." } });
          if (skip.status < 400) checks.noSkip = false;
        }
        await api('POST', '/journey/respond', { token: B.token, body: { questionId: bq.id, text: `Answer ${day}-${q + 1}: I value honest talks.` } });
        // Révélation des deux réponses avant la question suivante.
        const revealed = await page.getByTestId('sondeur-reveal').waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
        const partnerTxt = revealed ? await page.getByTestId('sondeur-partner-answer').innerText() : '';
        if (!revealed || !/Answer/.test(partnerTxt)) checks.revealBeforeNext = false;
        if (day === 1 && q === 0) await shot('10c-sondeur-revelation');
        await page.getByTestId('sondeur-next').click();
        await sleep(800);
        // Quitter puis revenir : reprise exacte à la question non répondue.
        if (day === 1 && perDay > 1 && q === perDay - 2) {
          const expected = ((await api('GET', `/journey/${journeyId}/questions`, { token: A.token })).data || []).find((x) => x.turn === 'current');
          await page.locator('text=←').first().click().catch(() => {});
          await sleep(800);
          checks.exit = await page.getByText('Question du jour').first().isVisible().catch(() => false);
          await page.reload({ waitUntil: 'networkidle' });
          await sleep(2500);
          await page.getByText('Matchs', { exact: true }).first().click().catch(() => {});
          await sleep(2000);
          await page.getByText('Question du jour').first().click();
          await sleep(1200);
          const shown = await page.locator('body').innerText();
          checks.resume = !!expected && shown.includes(expected.questionText.slice(0, 40));
        }
      }
      await sleep(1500);
      if (day === 1) {
        const reports = Number(sql(`SELECT count(*) FROM "Report" WHERE description LIKE '%${journeyId}%'`));
        record('Jour 1 : réponses anodines, aucun signalement de modération', reports === 0, `${reports} signalement(s)`);
      }
      // ── ADAPTIVE_FOLLOWUP : la lecture du jour (écrite après la dernière
      // réponse) décide de la relance du lendemain.
      if (day < 3) {
        let insight = null;
        for (let i = 0; i < 30 && !insight; i++) {
          const raw = sql(`SELECT content FROM "JourneyInsight" WHERE "journeyId"='${journeyId}' AND day=${day}`);
          insight = raw ? JSON.parse(raw) : null;
          if (!insight) await sleep(1000);
        }
        // La relance est placée juste avant l'enregistrement de la lecture.
        const follow = sql(`SELECT json_build_object('emoji', emoji, 'text', "questionText", 'meta', meta) FROM "HarmonyQuestion" WHERE "journeyId"='${journeyId}' AND day=${day + 1} AND "followUp"`)
          .split('\n').filter(Boolean).map((l) => JSON.parse(l));
        const gaps = insight?.toDiscuss || [];
        if (day === 1 && (await sondeurAiOff())) {
          // Repli déterministe : la relance est une question rédigée par l'IA,
          // donc jamais placée ; la lecture du jour reste faite.
          record('ADAPTIVE_FOLLOWUP (repli) : jour 1 lu, aucune relance IA placée au jour 2', !!insight && follow.length === 0,
            `lecture ${insight ? insight.source : 'absente'}, ${gaps.length} écart(s) à explorer, ${follow.length} relance(s) au jour 2`);
        } else if (day === 1) {
          const gapEmoji = THEME_EMOJI[gaps[0]?.theme];
          const ok = insight?.source === 'ia' && gaps.length > 0 && follow.length === 1 && follow[0].emoji === gapEmoji && follow[0].meta?.source === 'suivi';
          record('ADAPTIVE_FOLLOWUP : jour 1 (écart non compris) → une relance au jour 2, sur le thème de l’écart', ok,
            `lecture ${insight ? insight.source : 'absente'}, ${gaps.length} écart(s) à explorer (${gaps.map((g) => g.theme).join(', ')}), ${follow.length} relance(s) au jour 2${follow[0] ? ` : ${follow[0].emoji} « ${follow[0].text} »` : ''}`);
        } else {
          const ok = insight?.source === 'ia' && gaps.length === 0 && follow.length === 0;
          record('ADAPTIVE_FOLLOWUP : jour 2 (écart compris) → aucune relance au jour 3', ok,
            `lecture ${insight ? insight.source : 'absente'}, ${gaps.length} écart(s) à explorer, ${follow.length} relance(s) au jour 3`);
        }
      }
      if (day < 3) {
        await page.reload({ waitUntil: 'networkidle' });
        await sleep(2500);
        await page.getByText('Matchs', { exact: true }).first().click().catch(() => {});
        await sleep(2000);
        const locked = await page.getByTestId('sondeur-next-day').isVisible().catch(() => false);
        record(`Jour ${day} terminé → jour ${day + 1} fermé jusqu’au lendemain`, locked);
        if (day === 1) await shot('11-sondeur-jour-ferme');
        sql(`UPDATE "Journey" SET "stepStartDate" = "stepStartDate" - interval '1 day' WHERE id = '${journeyId}';`);
        await page.reload({ waitUntil: 'networkidle' });
        await sleep(3000);
        await page.getByText('Matchs', { exact: true }).first().click().catch(() => {});
        await sleep(2500);
      }
    }
    record('CANNOT_SKIP : aucune option pour passer, refus du serveur', checks.noSkip);
    record('CANNOT_ADVANCE_WITHOUT_ANSWER : pas d’avance sans la réponse de l’autre', checks.noAdvance);
    record('CANNOT_SEE_PARTNER_BEFORE_OWN_ANSWER', checks.noPeek);
    record('BOTH_ANSWERS_REVEALED_BEFORE_NEXT : attente puis révélation à chaque question', checks.revealBeforeNext);
    record('CAN_EXIT : retour à l’accueil au milieu de la journée', checks.exit);
    record('RESUME_SAME_QUESTION : reprise exacte après rechargement', checks.resume);
    record(`Sondeur : ${sent} réponses envoyées depuis le navigateur (toutes les questions)`, sent === qa.length);
    const progress = await api('GET', '/journey/sondeur-progress', { token: A.token });
    record(`Progression côté serveur = ${qa.length}/${qa.length}`, progress.data?.answeredCount === qa.length && progress.data?.totalQuestions === qa.length, JSON.stringify(progress.data));
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(3000);
    await page.getByText('Matchs', { exact: true }).first().click().catch(() => {});
    await sleep(2500);
    await shot('12-sondeur-termine');
    // La messagerie attend la lecture IA de chaque journée (ou trois échecs) :
    // chaque visite relance la lecture, comme dans l'app.
    // Lectures réussies : le dialogue s'ouvre dès qu'elles sont écrites. Si
    // une lecture échoue, trois essais espacés de INSIGHTS_RETRY_AFTER_MS
    // (2 s en recette) : 60 s d'attente au plus.
    let status;
    for (let i = 0; i < 20; i++) {
      await api('GET', '/matching/my-matches', { token: A.token });
      status = await api('GET', `/journey/${journeyId}/status`, { token: A.token });
      if (status.data?.currentStep === 'chat_libre') break;
      await sleep(3000);
    }
    const insightDays = sql(`SELECT string_agg(day || ':' || source, ',' ORDER BY day) FROM "JourneyInsight" WHERE "journeyId"='${journeyId}'`);
    record('Parcours ouvert au dialogue après les 3 jours', status.data?.currentStep === 'chat_libre', `${status.data?.currentStep} ; lectures ${insightDays || 'aucune'}`);
    const fakeStats = await fetch(`${FAKE_URL}/__stats`).then((r) => r.json()).catch(() => null);
    if (fakeStats) console.log(`Faux OpenRouter : ${JSON.stringify(fakeStats.byKind)}`);

    // ── 6. Affichage : B (EN) dans un second navigateur, aucune trace de la langue de A
    const ctxB = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'en-GB' });
    const pb = await ctxB.newPage();
    pb.on('pageerror', (e) => pageErrors.push(String(e)));
    watchAppDialogs(pb, dialogs);
    await pb.goto(`${APP_URL}/login`, { waitUntil: 'networkidle' });
    await pb.getByPlaceholder('votre@email.com').fill(B.email);
    await pb.getByPlaceholder('••••••••').fill(B.password);
    await pb.getByText('Se connecter', { exact: true }).click();
    await pb.waitForURL(/discover|\(tabs\)/, { timeout: 20000 }).catch(() => {});
    await sleep(2500);
    await pb.getByText('Matchs', { exact: true }).first().click().catch(() => {});
    await sleep(3000);
    await pb.screenshot({ path: path.join(SHOTS, '13-b-anglais.png') });
    const bText = await pb.locator('body').innerText();
    record('B (interface anglaise) : libellés du Sondeur en anglais', /Day 1|Answers compared/.test(bText), bText.match(/Day \d[^\n]*/)?.[0] || '');
    await ctxB.close();

    record('Aucune erreur JavaScript pendant le parcours', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
    record('Dialogues d’erreur inattendus', !dialogs.some((d) => /erreur|error|impossible/i.test(d)), dialogs.slice(0, 4).join(' | '));
  } catch (e) {
    record('Exception pendant le scénario', false, String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    await page.screenshot({ path: path.join(SHOTS, 'zz-erreur.png') }).catch(() => {});
  } finally {
    await browser.close();
    const applicable = results.filter((r) => !r.na);
    const ok = applicable.filter((r) => r.ok).length;
    const na = results.length - applicable.length;
    console.log(`\n${ok}/${applicable.length} vérifications réussies${na ? ` (${na} N/A)` : ''}`);
    fs.writeFileSync(path.join(SHOTS, 'resultats.json'), JSON.stringify(results, null, 2));
    process.exit(ok === applicable.length ? 0 : 1);
  }
})();
