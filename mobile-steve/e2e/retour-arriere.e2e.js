/* eslint-disable no-console */
/**
 * Recette mobile (360 et 390 px) du Grand Entretien V8.2 : tranche d'âge
 * « Entre __ et __ ans », retour à la question précédente (dans le module et
 * vers le module précédent), modification d'une réponse sans doublon,
 * nettoyage des réponses de suite, reprise après interruption, version
 * inchangée, page déclarée en français sans traduction automatique.
 *
 *   APP_URL=http://localhost:8091 API_URL=http://localhost:3100/api \
 *   E2E_PSQL="psql postgresql://boligo@127.0.0.1:5433/boligo_e2e" \
 *   node e2e/retour-arriere.e2e.js
 *
 * Backend LOCAL lancé avec INTERVIEW_VERSION=8.2 et OTP_DEBUG=true.
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node-tools/node_modules/playwright');

const APP_URL = process.env.APP_URL || 'http://localhost:8091';
const API = process.env.API_URL || 'http://localhost:3100/api';
const E2E_PSQL = process.env.E2E_PSQL || '';
if (!/localhost|127\.0\.0\.1/.test(API + APP_URL) || (E2E_PSQL && !/localhost|127\.0\.0\.1/.test(E2E_PSQL))) {
  console.error('Recette réservée à un backend et une base locaux.');
  process.exit(2);
}
const SHOTS = path.resolve(__dirname, '..', '..', 'docs', 'recette-ergonomie', 'captures');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const record = (step, ok, detail = '') => {
  results.push({ step, ok: !!ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execSync(`${E2E_PSQL} -tA -c ${JSON.stringify(q)}`).toString().trim();

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
  const email = `retour-${firstName.toLowerCase()}-${Date.now()}@example.test`;
  const password = 'Password12!';
  const reg = await api('POST', '/auth/register', {
    body: { email, password, firstName, lastName: 'Recette', birthDate: birth, gender, city: 'Bezons, France', telephone: `+3361${Math.floor(1e7 + Math.random() * 8e7)}`, job: 'Architecte', meetingScope: 'national', acceptTerms: true, termsVersion: '2026-10-03' },
  });
  if (reg.status >= 300) throw new Error(`inscription ${firstName} : ${JSON.stringify(reg.data)}`);
  const ver = await api('POST', '/auth/verify-email', { body: { email, code: reg.data?.otpDebugCode || '1234' } });
  return { email, password, token: ver.data.access_token, userId: ver.data.userId };
}

async function run(width) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}-${width}.png`) });
  const body = () => page.locator('body').innerText();
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const moduleRows = (userId, m) => sql(`SELECT count(*) FROM "ModuleResponse" r JOIN "InterviewIA" i ON i.id=r."interviewId" WHERE i."userId"='${userId}' AND r."moduleNumber"=${m}`);
  const stored = (userId) => {
    const rows = sql(`SELECT r."rawResponses" FROM "ModuleResponse" r JOIN "InterviewIA" i ON i.id=r."interviewId" WHERE i."userId"='${userId}'`);
    return Object.assign({}, ...rows.split('\n').filter(Boolean).map((l) => JSON.parse(l)));
  };
  const tag = `[${width} px]`;

  const A = await register(`Bezons${width}`, 'H', '1990-04-12T00:00:00.000Z');
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle' });
  const lang = await page.evaluate(() => ({ lang: document.documentElement.lang, translate: document.documentElement.getAttribute('translate') }));
  record(`${tag} Page déclarée en français, sans traduction automatique`, lang.lang === 'fr' && lang.translate === 'no', JSON.stringify(lang));
  await page.getByPlaceholder('votre@email.com').fill(A.email);
  await page.getByPlaceholder('••••••••').fill(A.password);
  await page.getByText('Se connecter', { exact: true }).click();
  await page.waitForURL(/interview\/0/, { timeout: 20000 });
  await page.getByTestId('interview-age-min').waitFor({ timeout: 15000 });

  // 1. Tranche idéale « Entre 28 et 34 ans ».
  const t1 = await body();
  record(`${tag} Tranche d’âge : « vous attire » et « Entre … et … ans »`, /vous attire/.test(t1) && /Entre/.test(t1) && /\bans\b/.test(t1));
  record(`${tag} Tranche d’âge : aucun débordement horizontal`, (await overflow()) <= 0, `${await overflow()} px`);
  await page.getByTestId('interview-age-min').fill('45');
  await page.getByTestId('interview-age-max').fill('30');
  await sleep(150);
  const orderMsg = await page.getByTestId('interview-age-message').innerText();
  record(`${tag} Âges inversés : message dans le champ, bouton désactivé`, /inférieur ou égal/.test(orderMsg) && (await page.getByTestId('interview-age-validate').getAttribute('aria-disabled')) === 'true', orderMsg);
  await shot('ge-age-erreur');
  await page.getByTestId('interview-age-min').fill('28');
  await page.getByTestId('interview-age-max').fill('34');
  await shot('ge-age-ideal');
  await page.getByTestId('interview-age-validate').click();

  // 2. Plage acceptée : préremplie avec la tranche idéale ; 30-40 → élargie à 28-40, sans blocage.
  await page.waitForFunction(() => /accept/.test(document.body.innerText), null, { timeout: 10000 });
  const pre = [await page.getByTestId('interview-age-min').inputValue(), await page.getByTestId('interview-age-max').inputValue()];
  record(`${tag} Plage acceptée préremplie avec la tranche idéale`, pre[0] === '28' && pre[1] === '34', pre.join('-'));
  await page.getByTestId('interview-age-min').fill('30');
  await page.getByTestId('interview-age-max').fill('40');
  await sleep(150);
  const widenMsg = await page.getByTestId('interview-age-message').innerText();
  await shot('ge-age-elargie');
  record(`${tag} Plage qui n’englobe pas la tranche idéale : explication claire, bouton actif`, /28 – 40/.test(widenMsg) && (await page.getByTestId('interview-age-validate').getAttribute('aria-disabled')) !== 'true', widenMsg);
  await page.getByTestId('interview-age-validate').click();
  await sleep(1200);
  let s = stored(A.userId);
  record(`${tag} Jamais « Sauvegarde impossible » : plage enregistrée 28-40`, s.V82_M0_02 === '28-40' && s.V82_M0_01 === '28-34', JSON.stringify({ a: s.V82_M0_01, b: s.V82_M0_02 }));

  // 3. Deux réponses de plus, puis retour en arrière.
  await page.getByTestId('option-A').click(); // M0_Q03
  await sleep(1200);
  record(`${tag} Réponse enregistrée aussitôt (sans attendre la fin du module)`, stored(A.userId).M0_Q03 === 'A');
  await page.getByTestId('interview-back').click();
  await sleep(500);
  const back = await body();
  record(`${tag} Retour : question précédente affichée, réponse actuelle cochée`, /déménager/.test(back) && /Votre réponse actuelle est cochée/.test(back));
  await shot('ge-retour-question-precedente');
  await page.getByTestId('option-C').click();
  await sleep(1200);
  s = stored(A.userId);
  record(`${tag} Réponse modifiée : remplacée, une seule ligne pour le module 0`, s.M0_Q03 === 'C' && moduleRows(A.userId, 0) === '1', `M0_Q03=${s.M0_Q03}, lignes=${moduleRows(A.userId, 0)}`);
  const hist = await body();
  record(`${tag} Fil de discussion reconstruit (réponses modifiables)`, /28 – 34 ans/.test(hist) && /Cela dépend de la distance/.test(hist));

  // 4. Toucher une réponse du fil pour y revenir directement.
  await page.getByTestId('answer-V82_M0_01').click();
  await sleep(400);
  const vals = [await page.getByTestId('interview-age-min').inputValue(), await page.getByTestId('interview-age-max').inputValue()];
  record(`${tag} Toucher une réponse du fil la rouvre, valeurs reprises`, vals.join('-') === '28-34', vals.join('-'));
  // Tranche idéale élargie après coup : la plage acceptée suit, sans blocage.
  await page.getByTestId('interview-age-min').fill('25');
  await page.getByTestId('interview-age-max').fill('45');
  await page.getByTestId('interview-age-validate').click();
  await sleep(1200);
  s = stored(A.userId);
  record(`${tag} Tranche idéale élargie après coup : plage acceptée ajustée (25-45)`, s.V82_M0_01 === '25-45' && s.V82_M0_02 === '25-45', `${s.V82_M0_01} / ${s.V82_M0_02}`);

  // 5. Reprise après interruption : rechargement complet.
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForURL(/interview\/0/, { timeout: 20000 });
  await sleep(1500);
  const resumed = await body();
  record(`${tag} Reprise après interruption : réponses conservées, première question restante`, /25 – 45 ans/.test(resumed) && !(await page.getByTestId('interview-age-min').isVisible().catch(() => false)));
  await shot('ge-reprise');

  // 6. Fin du module 0, puis retour depuis le module 1 vers le module 0.
  for (let i = 0; i < 40 && /interview\/0/.test(page.url()); i++) {
    const validate = page.getByTestId('interview-validate');
    if (await validate.isVisible().catch(() => false)) {
      if ((await validate.getAttribute('aria-disabled')) === 'true') {
        await page.locator('[data-testid^="option-"]').first().click();
        await sleep(150);
      }
      if ((await validate.getAttribute('aria-disabled')) === 'true') await page.getByTestId('interview-other').fill('Bambara').catch(() => {});
      await validate.click();
    } else {
      const opt = page.locator('[data-testid^="option-"]').first();
      if (await opt.isVisible().catch(() => false)) await opt.click();
    }
    await sleep(1000);
  }
  await page.waitForURL(/interview\/1/, { timeout: 15000 }).catch(() => {});
  record(`${tag} Module 0 terminé → module 1`, /interview\/1/.test(page.url()), page.url());
  await sleep(1200);
  await page.getByTestId('interview-back').click();
  await page.waitForURL(/interview\/0\?at=last/, { timeout: 10000 }).catch(() => {});
  await sleep(1500);
  const last = await body();
  record(`${tag} Retour depuis le module 1 : dernière question du module 0 rouverte`, /interview\/0/.test(page.url()) && /Votre réponse actuelle est cochée/.test(last), page.url());
  await shot('ge-retour-module-precedent');
  record(`${tag} Écran de retour : aucun débordement horizontal`, (await overflow()) <= 0, `${await overflow()} px`);
  // Réponse gardée telle quelle : on repart vers le module 1.
  // La boucle ci-dessus a toujours choisi la première option : c'est elle qui est cochée.
  const checkedOpt = page.locator('[data-testid^="option-"]').first();
  if (!(await page.getByTestId('interview-validate').isVisible().catch(() => false)) && (await checkedOpt.isVisible().catch(() => false))) await checkedOpt.click();
  else {
    const v = page.getByTestId('interview-validate');
    if (await v.isVisible().catch(() => false)) await v.click();
  }
  await page.waitForURL(/interview\/1/, { timeout: 15000 }).catch(() => {});
  record(`${tag} Réponse gardée → retour au module 1 sans rien reposer`, /interview\/1/.test(page.url()), page.url());

  // 7. Nettoyage des réponses de suite (API, même route que l'app) et version inchangée.
  await api('POST', '/interview/answer', { token: A.token, body: { questionId: 'V82_M8_01', value: 'A' } });
  await api('POST', '/interview/answer', { token: A.token, body: { questionId: 'V82_M8_02', value: 'B' } });
  const change = await api('POST', '/interview/answer', { token: A.token, body: { questionId: 'V82_M8_01', value: 'D' } });
  s = stored(A.userId);
  record(`${tag} Réponse de suite devenue sans objet effacée (V82_M8_02)`, !('V82_M8_02' in s) && (change.data?.removed || []).includes('V82_M8_02'), JSON.stringify(change.data));
  const invalid = await api('POST', '/interview/answer', { token: A.token, body: { questionId: 'V82_M8_01', value: 'Z' } });
  record(`${tag} Réponse invalide refusée (400)`, invalid.status === 400, String(invalid.status));
  const version = sql(`SELECT "questionnaireVersion" FROM "InterviewIA" WHERE "userId"='${A.userId}'`);
  record(`${tag} questionnaireVersion inchangée (8.2)`, version === '8.2', version);
  const dup = sql(`SELECT max(c) FROM (SELECT count(*) c FROM "ModuleResponse" r JOIN "InterviewIA" i ON i.id=r."interviewId" WHERE i."userId"='${A.userId}' GROUP BY r."moduleNumber") x`);
  record(`${tag} Aucun doublon de module`, dup === '1', `max lignes par module = ${dup}`);

  await browser.close();
}

(async () => {
  let failed = false;
  for (const w of [360, 390]) {
    try {
      await run(w);
    } catch (e) {
      failed = true;
      record(`[${w} px] scénario interrompu`, false, e.message);
    }
  }
  const ko = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(SHOTS, '..', 'retour-arriere-e2e.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.length - ko.length}/${results.length} contrôles réussis`);
  process.exit(ko.length || failed ? 1 : 0);
})();
