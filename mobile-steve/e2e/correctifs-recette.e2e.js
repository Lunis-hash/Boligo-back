/* eslint-disable no-console */
/**
 * Correctifs de la recette du 14/10 (local uniquement) :
 * 1. onglet Matchs après un abandon : parcours terminé expliqué, crédit rendu ;
 * 2. admin : jeton expiré → retour à la connexion avec un message ;
 * 3. admin : fiche utilisateur ou parcours inconnu → message d'erreur clair.
 * (Le délai maximal de géolocalisation est couvert par services/__tests__/location.test.ts.)
 *
 *   API http://localhost:3000/api (base seedée par npm run seed:recette),
 *   WEB http://localhost:8081, ADM http://localhost:8082
 *   node e2e/correctifs-recette.e2e.js
 */
const path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');

const API = process.env.API_URL || 'http://localhost:3000/api';
const WEB = process.env.WEB_URL || 'http://localhost:8081';
const ADM = process.env.ADMIN_URL || 'http://localhost:8082';
for (const u of [API, WEB, ADM]) if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(u)) throw new Error(`Local uniquement : ${u}`);
const SHOTS = path.resolve(__dirname, '..', '..', 'docs', 'recette-correctifs');
const results = [];
const record = (s, ok, d = '') => { results.push({ s, ok: !!ok, d }); console.log(`${ok ? '✅' : '❌'} ${s}${d ? ' — ' + d : ''}`); };
const call = async (m, p, { token, body } = {}) => {
  const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; } return { s: r.status, d };
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  try {
    // 1. Cyril quitte le parcours ; Diane ouvre l'onglet Matchs.
    const cyril = (await call('POST', '/auth/login', { body: { email: 'cyril.sondeur@recette.boligo.test', password: 'Recette2026!' } })).d.access_token;
    const prog = (await call('GET', '/journey/sondeur-progress', { token: cyril })).d;
    const leave = await call('POST', `/journey/${prog.journeyId}/leave`, { token: cyril, body: {} });
    record('Cyril met fin au parcours', leave.s < 300, `status ${leave.s}`);
    const diane = (await call('POST', '/auth/login', { body: { email: 'diane.sondeur@recette.boligo.test', password: 'Recette2026!' } })).d.access_token;
    const last = await call('GET', '/journey/last-ended', { token: diane });
    record('API last-ended : parcours de Diane avec Cyril, crédit rendu', last.d?.ended?.partnerName === 'Cyril' && last.d.ended.creditReturned > 0, JSON.stringify(last.d));
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, locale: 'fr-FR' });
    const p = await ctx.newPage();
    await p.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
    await p.getByPlaceholder('votre@email.com').fill('diane.sondeur@recette.boligo.test');
    await p.getByPlaceholder('••••••••').fill('Recette2026!');
    await p.getByText('Se connecter', { exact: true }).click();
    await p.waitForTimeout(4000);
    await p.goto(`${WEB}/`, { waitUntil: 'networkidle' });
    await p.getByText('Matchs', { exact: true }).first().click().catch(() => {});
    const card = p.getByTestId('ended-journey');
    const shown = await card.waitFor({ timeout: 15000 }).then(() => true, () => false);
    const text = shown ? await card.innerText() : await p.locator('body').innerText();
    record('Onglet Matchs : « Votre parcours avec Cyril est terminé » et crédit rendu', shown && /Cyril/.test(text) && /crédit vous a été rendu/.test(text), text.slice(0, 160).replace(/\n/g, ' '));
    await p.screenshot({ path: path.join(SHOTS, '01-matchs-parcours-termine-390.png') });
    if (shown) {
      await p.getByTestId('ended-journey-ok').click();
      await p.waitForTimeout(500);
      const gone = !(await card.isVisible().catch(() => false));
      await p.reload({ waitUntil: 'networkidle' });
      await p.getByText('Matchs', { exact: true }).first().click().catch(() => {});
      await p.waitForTimeout(3000);
      record('« J’ai compris » : la carte disparaît et ne revient pas', gone && !(await card.isVisible().catch(() => false)));
    }
    await ctx.close();

    // 2. Admin : jeton expiré.
    const a = await b.newContext({ viewport: { width: 1366, height: 900 } });
    const pa = await a.newPage();
    const expired = 'e30.' + Buffer.from(JSON.stringify({ sub: 'x', role: 'ADMIN', exp: 1 })).toString('base64url') + '.x';
    await pa.goto(`${ADM}/login/`, { waitUntil: 'networkidle' });
    await pa.evaluate((t) => { localStorage.setItem('boligo_admin_token', t); localStorage.setItem('boligo_admin_user', JSON.stringify({ id: 'x', email: 'x', firstName: 'X', lastName: 'Y', role: 'ADMIN' })); }, expired);
    await pa.goto(`${ADM}/dashboard/users/`, { waitUntil: 'networkidle' });
    await pa.waitForTimeout(2500);
    const msg = await pa.getByTestId('session-expiree').innerText().catch(() => '');
    record('Admin : jeton expiré → page de connexion avec « session expirée »', /\/login\/?\?expiree=1/.test(pa.url()) && /expiré/.test(msg), pa.url());
    await pa.screenshot({ path: path.join(SHOTS, '02-admin-session-expiree.png') });
    // Jeton non expiré mais révoqué (signature invalide) : l'API répond 401 → même retour.
    const revoked = 'e30.' + Buffer.from(JSON.stringify({ sub: 'x', role: 'ADMIN', exp: 4102444800 })).toString('base64url') + '.signature-fausse';
    await pa.evaluate((t) => { localStorage.setItem('boligo_admin_token', t); localStorage.setItem('boligo_admin_user', JSON.stringify({ id: 'x', email: 'x', firstName: 'X', lastName: 'Y', role: 'ADMIN' })); }, revoked);
    await pa.goto(`${ADM}/dashboard/users/`, { waitUntil: 'load' });
    await pa.waitForURL(/expiree=1/, { timeout: 15000 }).catch(() => {});
    record('Admin : jeton refusé par l’API (401) → retour à la connexion', /\/login\/?\?expiree=1/.test(pa.url()), pa.url());

    // 3. Fiches inconnues.
    await pa.goto(`${ADM}/login/`, { waitUntil: 'networkidle' });
    await pa.locator('input[type="email"]').fill('admin@recette.boligo.test');
    await pa.locator('input[type="password"]').fill('RecetteAdmin2026!');
    await pa.locator('button[type="submit"]').click();
    await pa.waitForURL(/dashboard/, { timeout: 15000 });
    for (const [label, url] of [['Fiche utilisateur inconnue', '/dashboard/users/detail/?id=00000000-0000-0000-0000-000000000000'], ['Parcours inconnu', '/dashboard/journeys/detail/?id=00000000-0000-0000-0000-000000000000']]) {
      await pa.goto(ADM + url, { waitUntil: 'load' });
      const err = await pa.getByTestId('detail-erreur').innerText({ timeout: 10000 }).catch(() => '');
      record(`${label} → message clair (plus de « Chargement… » sans fin)`, /introuvable/i.test(err), err);
    }
    await pa.screenshot({ path: path.join(SHOTS, '03-admin-parcours-introuvable.png') });
  } catch (e) {
    record('scénario interrompu', false, e.message);
  } finally {
    await b.close();
  }
  require('fs').writeFileSync(path.join(SHOTS, 'resultats.json'), JSON.stringify(results, null, 2));
  const ko = results.filter((r) => !r.ok).length;
  console.log(`${results.length - ko}/${results.length} contrôles réussis`);
  process.exit(ko ? 1 : 0);
})();
