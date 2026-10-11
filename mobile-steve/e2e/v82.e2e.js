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
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { execSync } = require('child_process');

const APP_URL = process.env.APP_URL || 'http://localhost:8081';
const API = process.env.API_URL || 'http://localhost:3000/api';
const E2E_PSQL = process.env.E2E_PSQL || '';
if (!/localhost|127\.0\.0\.1/.test(API) || (E2E_PSQL && !/localhost|127\.0\.0\.1/.test(E2E_PSQL))) {
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

/** Membre piloté par l'API : premières options, plage d'âge, langue choisie. */
async function answerByApi(member, lang) {
  for (let m = 0; m <= 10; m++) {
    const answers = {};
    for (let round = 0; round < 3; round++) {
      const q = await api('GET', `/interview/questions/${m}?lang=${lang}`, { token: member.token });
      const pending = (q.data || []).filter((x) => !(x.id in answers));
      if (!pending.length) break;
      for (const x of pending) {
        if (x.input === 'ageRange') answers[x.id] = '30-42';
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
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
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
    const ageStored = Object.entries(stored).find(([, v]) => /^\d{2}-\d{2}$/.test(String(v)));
    record('Plage d’âge enregistrée « 28-38 »', ageStored?.[1] === '28-38', JSON.stringify(ageStored));

    await page.waitForURL(/interview\/summary/, { timeout: 40000 }).catch(() => {});
    await sleep(3000);
    await shot('06-bilan');
    const bilan = await body();
    record('Bilan affiché sans « undefined » ni texte vide', /Grand Entretien/.test(bilan) && !/undefined|null\b/.test(bilan));

    // ── 3. B : entretien en anglais par l'API, questions sensibles refusées
    await api('POST', '/interview/sensitive-consent', { token: B.token, body: { accepted: false } });
    await answerByApi(B, 'en');
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
    record('Sondeur : 21 questions, mêmes questions pour les deux membres', qa.length === 21 && qb.length === 21 &&
      qa.map((q) => q.id).join() === qb.map((q) => q.id).join(), `${qa.length}/${qb.length}`);
    const frInEn = qb.filter((q) => /[àâçéèêîôûù]|\bvous\b/i.test(q.questionText));
    record('Sondeur : B lit chaque question en anglais', frInEn.length === 0 && qb.every((q) => q.language === 'en'), frInEn.slice(0, 2).map((q) => q.questionText).join(' | '));

    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
    await sleep(3000);
    await page.getByText('Matchs', { exact: true }).first().click().catch(() => {});
    await sleep(2500);
    await shot('09-sondeur-accueil');
    let sent = 0;
    const secret = 'Je tiens beaucoup à ma famille du Mali.';
    for (let day = 1; day <= 3; day++) {
      await page.getByText('Question du jour').first().click();
      await sleep(1000);
      if (day === 1) await shot('10-sondeur-question');
      for (let q = 0; q < 7; q++) {
        const txt = day === 1 && q === 0 ? secret : `Réponse ${day}-${q + 1} : je privilégie le dialogue.`;
        await page.getByPlaceholder('Écrivez votre réponse ici...').fill(txt);
        await page.getByText('Valider la réponse').click();
        sent++;
        await sleep(900);
      }
      await sleep(1500);
      // Confidentialité : B ne voit pas la réponse de A tant qu'il n'a pas répondu.
      const bView = (await api('GET', `/journey/${journeyId}/questions?lang=en`, { token: B.token })).data || [];
      const dayB = bView.filter((q) => q.day === day);
      const leaked = dayB.some((q) => (q.responses || []).some((r) => r.userId === A.userId));
      record(`Jour ${day} : réponses de A invisibles pour B avant ses propres réponses`, !leaked && dayB.every((q) => q.partnerAnswered));
      for (const q of dayB) {
        await api('POST', '/journey/respond', { token: B.token, body: { questionId: q.id, text: `Answer ${day}: I value honest talks.` } });
      }
      const after = (await api('GET', `/journey/${journeyId}/questions?lang=en`, { token: B.token })).data || [];
      const first = after.find((q) => q.day === day);
      const seen = (first?.responses || []).find((r) => r.userId === A.userId);
      record(`Jour ${day} : réponse de A visible pour B après sa propre réponse`, !!seen && seen.responseText !== 'Réponse disponible plus tard.', seen ? seen.responseText.slice(0, 40) : '');
      if (day === 1) {
        const reports = Number(sql(`SELECT count(*) FROM "Report" WHERE description LIKE '%${journeyId}%'`));
        record('Jour 1 : réponses anodines, aucun signalement de modération', reports === 0, `${reports} signalement(s)`);
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
    record('Sondeur : 21 réponses envoyées depuis le navigateur', sent === 21);
    const progress = await api('GET', '/journey/sondeur-progress', { token: A.token });
    record('Progression côté serveur = 21/21', progress.data?.answeredCount === 21, JSON.stringify(progress.data));
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(3000);
    await page.getByText('Matchs', { exact: true }).first().click().catch(() => {});
    await sleep(2500);
    await shot('12-sondeur-termine');
    // La messagerie attend la lecture IA de chaque journée (ou trois échecs) :
    // chaque visite relance la lecture, comme dans l'app.
    let status;
    for (let i = 0; i < 8; i++) {
      await api('GET', '/matching/my-matches', { token: A.token });
      status = await api('GET', `/journey/${journeyId}/status`, { token: A.token });
      if (status.data?.currentStep === 'chat_libre') break;
      await sleep(3000);
    }
    record('Parcours ouvert au dialogue après les 3 jours', status.data?.currentStep === 'chat_libre', status.data?.currentStep);

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
    const ok = results.filter((r) => r.ok).length;
    console.log(`\n${ok}/${results.length} vérifications réussies`);
    fs.writeFileSync(path.join(SHOTS, 'resultats.json'), JSON.stringify(results, null, 2));
    process.exit(ok === results.length ? 0 : 1);
  }
})();
