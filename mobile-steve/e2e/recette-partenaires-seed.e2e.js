/* eslint-disable no-console */
/**
 * E2E navigateur du programme partenaires sur le jeu de recette SEEDÉ
 * (npm run seed:recette:partenaires) : membre, partenaire, administration.
 *
 *   node e2e/recette-partenaires-seed.e2e.js
 *
 * Prérequis (docs/RECETTE_PARTENAIRES.md, § « Recette en une commande ») :
 *   API  http://localhost:3000/api  (NODE_ENV=development, SANS clé ni secret Stripe)
 *   WEB  http://localhost:8081      (export web Expo)
 *   ADM  http://localhost:8082      (admin/out)
 *   DATABASE_URL vers la base LOCALE de recette (le seed refuse toute autre base).
 *
 * Le script relance d'abord le seed (état connu), puis :
 *   - membre : connexion, page « Offres partenaires » (6 offres en ligne), clic
 *     compté, code DEMOCLARA appliqué sur la page de paiement (13,50 €), achat
 *     SIMULÉ par le webhook local non signé (aucun appel Stripe) ;
 *   - remboursement partiel simulé : reprise de commission au prorata ;
 *   - partenaire : Espace de Clara (mêmes chiffres que l'admin), Spa Nacre
 *     suspendu, lien d'un partenaire refusé inopérant ;
 *   - admin : connexion, synthèse = somme des Espaces, fiche de Clara,
 *     création d'un partenaire, vérification, code, suspension (code refusé
 *     au paiement), publication d'une offre brouillon (visible des membres).
 * Captures : docs/recette-partenaires/captures/4x-*.png
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { chromium } = require('/opt/node-tools/node_modules/playwright');

const API = process.env.API_URL || 'http://localhost:3000/api';
const WEB = process.env.WEB_URL || 'http://localhost:8081';
const ADM = process.env.ADMIN_URL || 'http://localhost:8082';
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'recette-partenaires', 'captures');
const RESULTS = path.join(ROOT, 'docs', 'recette-partenaires', 'resultats-seed-e2e.json');
fs.mkdirSync(SHOTS, { recursive: true });

for (const u of [API, WEB, ADM, process.env.DATABASE_URL || '']) {
  if (!/^(https?|postgres(ql)?):\/\/([^@]*@)?(localhost|127\.0\.0\.1)[:/]/.test(u)) throw new Error(`Recette locale uniquement : ${u || 'DATABASE_URL vide'}`);
}

const ACC = {
  admin: { email: 'admin@boligo-demo.example', password: 'Demo-Admin-2026!' },
  membre: { email: 'membre@boligo-demo.example', password: 'Demo-Membre-2026!' },
};
const token = (key) => crypto.createHash('sha256').update(`boligo-recette-partenaires:${key}`).digest('base64url');
const portalUrl = (key) => `${WEB}/espace-partenaire#${token(key)}`;

const results = [];
const record = (step, ok, detail = '') => {
  results.push({ step, ok: !!ok, detail: String(detail) });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`);
};
async function call(method, p, { token: t, body } = {}) {
  const res = await fetch(API + p, {
    method,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}
const portal = async (key) => (await call('POST', '/partners/portal', { body: { token: token(key) } })).data;
const near = (a, b) => Math.abs(a - b) < 0.005;
const eur = (n) => n.toFixed(2).replace('.', ',');
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

(async () => {
  console.log('Seed de recette…');
  execSync('npm run -s seed:recette:partenaires', { cwd: ROOT, stdio: 'ignore', env: process.env });

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const jsErrors = [];
  const newPage = async (opts = {}) => {
    const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 900 }, ...opts });
    // Les sites des marques (.example) sont remplacés par une page neutre.
    await ctx.route(/\.example\//, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Site fictif de la marque (recette)</h1>' }));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => jsErrors.push(`${page.url()} : ${e.message}`));
    return page;
  };

  const login = await call('POST', '/auth/login', { body: ACC.admin });
  // Une seule connexion API du membre (limite : 8 essais / 10 min / e-mail).
  const memberLogin = (await call('POST', '/auth/login', { body: ACC.membre })).data;
  const MT = memberLogin.access_token;
  const memberId = memberLogin.user?.id || JSON.parse(Buffer.from(MT.split('.')[1], 'base64url').toString()).sub;
  const AT = login.data?.access_token;
  record('Admin fictif : connexion API', Boolean(AT), login.status);
  const partners = (await call('GET', '/admin/partners?limit=50', { token: AT })).data.data;
  const P = (company) => partners.find((p) => p.company?.includes(company));

  // ── 1. Membre ────────────────────────────────────────────────────────────
  {
    const mp = await newPage({ viewport: { width: 430, height: 900 } });
    await mp.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
    await mp.getByPlaceholder('votre@email.com').fill(ACC.membre.email);
    await mp.getByPlaceholder('••••••••').fill(ACC.membre.password);
    await mp.getByText('Se connecter', { exact: true }).click();
    await mp.waitForURL((u) => !/\/login/.test(u.toString()), { timeout: 20000 }).catch(() => undefined);
    record('Membre : connexion par le formulaire', !/\/login/.test(mp.url()), mp.url());

    await mp.goto(`${WEB}/profile`, { waitUntil: 'networkidle' });
    await mp.getByTestId('offers-link').click({ timeout: 15000 });
    await mp.getByTestId('offers-screen').waitFor({ timeout: 15000 });
    await mp.waitForTimeout(1500);
    const ids = await mp.locator('[data-testid^="offer-go-"]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('data-testid').replace('offer-go-', '')))]);
    const publicIds = (await call('GET', '/partners/offers')).data.map((o) => o.id);
    await shot(mp, '40-membre-offres-partenaires');
    record('Membre : « Offres partenaires » depuis le profil = 6 offres en ligne (ni brouillon, ni programmée, ni expirée)', ids.length === 6 && ids.every((i) => publicIds.includes(i)), `${ids.length} affichées`);

    const cerfeuil = P('Maison Cerfeuil');
    const offersC = (await call('GET', `/admin/partners/${cerfeuil.id}/offers`, { token: AT })).data;
    const dOffer = offersC.find((o) => /Dîner découverte/.test(o.title));
    const before = dOffer.stats?.clicks ?? 0;
    await mp.getByTestId(`offer-go-${dOffer.id}`).first().click();
    await mp.waitForTimeout(2500);
    const after = (await call('GET', `/admin/partners/${cerfeuil.id}/offers`, { token: AT })).data.find((o) => o.id === dOffer.id).stats?.clicks ?? 0;
    record('Membre : clic sur une offre compté (clic ≠ vente)', after === before + 1, `${before} → ${after}`);

    await mp.goto(`${WEB}/onboarding/payment`, { waitUntil: 'networkidle' });
    await mp.getByTestId('plan-parcours_harmonie').first().click({ timeout: 15000 });
    await mp.getByTestId('promo-input').fill('DEMOCLARA', { timeout: 15000 });
    await mp.getByTestId('promo-apply').click();
    await mp.waitForTimeout(2000);
    const body = await mp.locator('body').innerText();
    await shot(mp, '41-membre-paiement-code-democlara');
    record('Membre : code DEMOCLARA appliqué au paiement (15,00 € → 13,50 €)', /13,50/.test(body), (body.match(/[^\n]*13,50[^\n]*/) || [''])[0]);

    // Code d'un partenaire suspendu : refusé.
    await mp.getByTestId('promo-input').fill('DEMONACRE');
    await mp.getByTestId('promo-apply').click();
    await mp.waitForTimeout(1500);
    const chk = await call('POST', '/payment/check-promo', { token: MT, body: { code: 'DEMONACRE', optionId: 'parcours_harmonie' } });
    record('Membre : code d’un partenaire suspendu refusé', chk.data?.isValid === false, chk.data?.message);
    await mp.context().close();
  }

  // ── 2. Achat simulé avec DEMOCLARA, puis remboursement partiel ─────────
  const claraBefore = await portal('clara');
  const sumBefore = (await call('GET', '/admin/partners/summary', { token: AT })).data;
  const check = (await call('POST', '/payment/check-promo', { token: MT, body: { code: 'DEMOCLARA', optionId: 'parcours_harmonie' } })).data;
  const ref = `pi_e2e_${Date.now()}`;
  const paid = await call('POST', '/payment/webhook', {
    body: { id: `evt_${ref}`, type: 'payment_intent.succeeded', data: { object: { id: ref, amount: check.finalAmount, metadata: { userId: memberId, credits: '1', planName: 'Parcours Harmonie', promoCode: 'DEMOCLARA', promoCodeId: '' } } } },
  });
  const claraPaid = await portal('clara');
  record(
    'Achat simulé (webhook local) avec DEMOCLARA : +1 vente, +13,50 €, +2,70 € de commission au taux figé (20 %)',
    paid.status < 300 && claraPaid.totals.purchases === claraBefore.totals.purchases + 1 && near(claraPaid.totals.revenue, claraBefore.totals.revenue + 13.5) && near(claraPaid.totals.commission, claraBefore.totals.commission + 2.7),
    `ventes ${claraBefore.totals.purchases} → ${claraPaid.totals.purchases}, commission ${claraBefore.totals.commission} → ${claraPaid.totals.commission}`,
  );
  await call('POST', '/payment/webhook', { body: { id: `evt_${ref}_r`, type: 'charge.refunded', data: { object: { id: `ch_${ref}`, payment_intent: ref, amount: check.finalAmount, amount_refunded: Math.round(check.finalAmount / 2) } } } });
  await call('POST', '/payment/webhook', { body: { id: `evt_${ref}_r`, type: 'charge.refunded', data: { object: { id: `ch_${ref}`, payment_intent: ref, amount: check.finalAmount, amount_refunded: Math.round(check.finalAmount / 2) } } } });
  const claraRefund = await portal('clara');
  record(
    'Remboursement partiel (50 %, événement rejoué) : commission reprise au prorata une seule fois (−1,35 €)',
    near(claraRefund.totals.commission, claraPaid.totals.commission - 1.35) && near(claraRefund.totals.revenue, claraPaid.totals.revenue - 6.75),
    `commission ${claraPaid.totals.commission} → ${claraRefund.totals.commission}, revenu confirmé ${claraPaid.totals.revenue} → ${claraRefund.totals.revenue}`,
  );
  const sumAfter = (await call('GET', '/admin/partners/summary', { token: AT })).data;
  record(
    'Synthèse admin mise à jour des mêmes montants',
    near(sumAfter.commission - sumBefore.commission, claraRefund.totals.commission - claraBefore.totals.commission) && near(sumAfter.revenue - sumBefore.revenue, claraRefund.totals.revenue - claraBefore.totals.revenue),
    `commission ${sumBefore.commission} → ${sumAfter.commission}`,
  );

  // Admin = somme des Espaces (mêmes chiffres des deux côtés).
  {
    const list = (await call('GET', '/admin/partners?limit=50', { token: AT })).data.data;
    let ok = true;
    let revenue = 0;
    let commission = 0;
    for (const p of list) {
      revenue += p.sales.revenue;
      commission += p.sales.commission;
    }
    for (const key of ['clara', 'yanis', 'jade', 'lumen', 'nacre', 'maelle']) {
      const d = await portal(key);
      const row = list.find((p) => p.email === `partenaire-${key}@boligo-demo.example`);
      if (!near(d.totals.revenue, row.sales.revenue) || !near(d.totals.commission, row.sales.commission) || JSON.stringify(d.metrics) !== JSON.stringify(row.metrics)) ok = false;
    }
    record('Espace partenaire et admin : mêmes revenus, commissions, clics et conversions (6 partenaires)', ok);
    record('Synthèse admin = somme des lignes', near(revenue, sumAfter.revenue) && near(commission, sumAfter.commission), `${eur(sumAfter.revenue)} € / ${eur(sumAfter.commission)} €`);
  }

  // ── 3. Partenaire ────────────────────────────────────────────────────────
  {
    const sp = await newPage();
    await sp.goto(portalUrl('clara'), { waitUntil: 'networkidle' });
    await sp.getByTestId('space-kpi-commission').waitFor({ timeout: 15000 });
    await sp.waitForTimeout(800);
    await shot(sp, '42-partenaire-espace-clara');
    const kpi = await sp.getByTestId('space-kpi-commission').innerText();
    const refunds = await sp.getByTestId('space-refunds').innerText().catch(() => '');
    const clicks = await sp.getByTestId('space-kpi-clicks').innerText().catch(() => '');
    record('Partenaire (navigateur) : commission nette affichée', kpi.includes(eur(claraRefund.totals.commission)), kpi.replace(/\s+/g, ' '));
    record('Partenaire : remboursements et reprise de commission expliqués', /Remboursements/.test(refunds) && /prorata/.test(refunds), refunds);
    record('Partenaire : clics et conversions vérifiées séparés', /Clics/.test(clicks) && (await sp.getByTestId('space-kpi-conversions').count()) === 1, clicks.replace(/\s+/g, ' '));

    await sp.goto('about:blank');
    await sp.goto(portalUrl('nacre'), { waitUntil: 'networkidle' });
    await sp.waitForTimeout(1500);
    const nacre = await sp.locator('body').innerText();
    await shot(sp, '43-partenaire-spa-nacre-suspendu');
    record('Partenaire suspendu : Espace en lecture seule avec bandeau', /suspendu/i.test(nacre));

    await sp.goto('about:blank');
    await sp.goto(portalUrl('mathis'), { waitUntil: 'networkidle' });
    await sp.waitForTimeout(1500);
    const mathis = await sp.locator('body').innerText();
    await shot(sp, '44-partenaire-refuse-lien-inoperant');
    record('Partenaire refusé : aucun Espace', /ne fonctionne plus|invalide/i.test(mathis));
    await sp.context().close();
  }

  // ── 4. Administration ────────────────────────────────────────────────────
  {
    const ap = await newPage({ viewport: { width: 1440, height: 1000 } });
    await ap.goto(`${ADM}/login/`, { waitUntil: 'networkidle' });
    await ap.locator('input[type=email]').fill(ACC.admin.email);
    await ap.locator('input[type=password]').fill(ACC.admin.password);
    await ap.getByRole('button', { name: 'Accéder au tableau de bord' }).click();
    await ap.waitForURL(/dashboard/, { timeout: 20000 });
    await ap.goto(`${ADM}/dashboard/partners/`, { waitUntil: 'domcontentloaded' });
    await ap.getByTestId('partners-metrics').waitFor({ timeout: 15000 });
    await shot(ap, '45-admin-partenaires-synthese');
    const metrics = await ap.getByTestId('partners-metrics').innerText();
    record('Admin : cartes « Clics (pas des ventes) », « Conversions vérifiées », « Revenus réellement confirmés »', /Clics/.test(metrics) && /Conversions vérifiées/.test(metrics) && new RegExp(eur(sumAfter.metrics.confirmedRevenue)).test(metrics), metrics.replace(/\s+/g, ' '));

    const open = async (email) => {
      await ap.getByTestId(`partner-row-${email}`).click({ timeout: 15000 });
      await ap.getByTestId('partner-detail').waitFor({ timeout: 10000 });
    };
    await open('partenaire-clara@boligo-demo.example');
    await ap.getByTestId('partner-figures').scrollIntoViewIfNeeded();
    const fig = await ap.getByTestId('fig-commission').innerText();
    const refundsBox = await ap.getByTestId('fig-refunds').innerText().catch(() => '');
    await shot(ap, '46-admin-fiche-clara-chiffres');
    record('Admin : fiche de Clara = son Espace (commission, remboursements)', fig.includes(eur(claraRefund.totals.commission)) && /repris/.test(refundsBox), `${fig} · ${refundsBox}`);

    // Création d'un partenaire par l'équipe.
    await ap.goto(`${ADM}/dashboard/partners/`, { waitUntil: 'domcontentloaded' });
    await ap.getByTestId('partner-new').click();
    const email = `partenaire-e2e-${Date.now().toString(36)}@boligo-demo.example`;
    await ap.getByTestId('new-type').selectOption('CREATEUR');
    await ap.getByTestId('new-name').fill('[DÉMO] Zoé Lemarchand');
    await ap.getByTestId('new-email').fill(email);
    await ap.getByTestId('new-company').fill('[DÉMO] Chaîne « Deux cafés »');
    await ap.getByTestId('new-city').fill('Lille');
    await ap.getByTestId('new-reg-type').selectOption('AUTRE');
    await ap.getByTestId('new-reg-number').fill('DEMO-2026-0099');
    await ap.getByTestId('new-rate').fill('15');
    await shot(ap, '47-admin-nouveau-partenaire');
    await ap.getByTestId('new-submit').click();
    await ap.getByTestId('partner-detail').waitFor({ timeout: 15000 });
    const created = (await call('GET', `/admin/partners?q=${encodeURIComponent(email)}`, { token: AT })).data.data[0];
    record('Admin : partenaire créé depuis le back-office (« En discussion »)', created?.status === 'EN_COURS' && created.commissionRate === 15, created?.status);

    // Vérification manuelle, puis code (accepte le partenaire).
    await ap.getByTestId('partner-manual-note').fill('[DÉMO] Numéro fictif contrôlé à la main.');
    await ap.getByTestId('partner-manual-ok').click();
    await ap.waitForTimeout(1500);
    await ap.getByTestId('partner-create-code').click({ timeout: 10000 });
    await ap.getByTestId('partner-portal-link').waitFor({ timeout: 10000 });
    await shot(ap, '48-admin-nouveau-partenaire-verifie-code');
    const createdAfter = (await call('GET', `/admin/partners/${created.id}`, { token: AT })).data;
    record('Admin : vérification manuelle puis code créé → accepté', createdAfter.verificationStatus === 'VERIFIE' && createdAfter.status === 'ACCEPTE' && Boolean(createdAfter.promoCode?.code), createdAfter.promoCode?.code);

    // Suspension de Karim depuis l'écran : son code est refusé au paiement.
    await ap.goto(`${ADM}/dashboard/partners/`, { waitUntil: 'domcontentloaded' });
    await open('partenaire-karim@boligo-demo.example');
    await ap.getByTestId('partner-status').selectOption('SUSPENDU');
    await ap.getByTestId('partner-save').click();
    await ap.waitForTimeout(1500);
    const karimCode = await call('POST', '/payment/check-promo', { token: MT, body: { code: 'DEMOKARIM', optionId: 'parcours_harmonie' } });
    record('Admin : suspension → code refusé au paiement', karimCode.data?.isValid === false, karimCode.data?.message);

    // Publication de l'offre brouillon de Cerfeuil : visible des membres.
    await ap.goto(`${ADM}/dashboard/partners/`, { waitUntil: 'domcontentloaded' });
    await open('partenaire-cerfeuil@boligo-demo.example');
    const cer = P('Maison Cerfeuil');
    const brunch = (await call('GET', `/admin/partners/${cer.id}/offers`, { token: AT })).data.find((o) => /Brunch/.test(o.title));
    await ap.getByTestId(`offer-toggle-${brunch.id}`).click({ timeout: 10000 });
    await ap.waitForTimeout(1500);
    await shot(ap, '49-admin-offre-publiee');
    const visible = (await call('GET', '/partners/offers')).data.some((o) => o.id === brunch.id);
    record('Admin : publication d’une offre brouillon → visible des membres', visible);
    await ap.getByTestId(`offer-toggle-${brunch.id}`).click();
    await ap.waitForTimeout(1500);
    const hidden = !(await call('GET', '/partners/offers')).data.some((o) => o.id === brunch.id);
    record('Admin : retrait de l’offre → invisible des membres', hidden);
    await ap.context().close();
  }

  record('Aucune erreur JavaScript dans les pages', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
  await browser.close();
  const okCount = results.filter((r) => r.ok).length;
  fs.writeFileSync(RESULTS, JSON.stringify({ date: new Date().toISOString(), ok: okCount, total: results.length, results }, null, 2));
  console.log(`\n${okCount}/${results.length} contrôles réussis.`);
  // Remet le jeu de recette dans son état initial pour la session suivante.
  execSync('npm run -s seed:recette:partenaires', { cwd: ROOT, stdio: 'ignore', env: process.env });
  process.exit(okCount === results.length ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
