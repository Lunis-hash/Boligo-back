/* eslint-disable no-console */
/**
 * Recette de bout en bout du programme partenaires — 20 partenaires FICTIFS,
 * 18 offres, dans un environnement local ISOLÉ (base jetable, e-mails en
 * simulation, aucun appel Stripe). Navigateur (webapp membre, formulaire
 * public, espace partenaire, administration) + API.
 *
 *   node e2e/recette-partenaires.js
 *
 * Prérequis (voir docs/RECETTE_PARTENAIRES.md) :
 *   API  http://localhost:3000/api  (NODE_ENV=development, sans STRIPE_WEBHOOK_SECRET)
 *   WEB  http://localhost:8081      (export web, EXPO_PUBLIC_API_URL=http://localhost:3000/api)
 *   ADM  http://localhost:8082      (admin/out, NEXT_PUBLIC_API_URL=http://localhost:3000/api)
 *   base postgresql://…@127.0.0.1:5432/boligo_recette_partenaires
 *
 * Ventes : événements payment_intent.succeeded NON SIGNÉS envoyés au webhook
 * local — accepté uniquement hors production et sans secret de webhook. Ce
 * sont des ventes SIMULÉES, aucune carte ni aucun compte Stripe n'est utilisé.
 *
 * Trafic : les visites et clics « API » portent une adresse X-Forwarded-For
 * de documentation (198.51.100.0/24, RFC 5737) pour simuler des visiteurs
 * distincts sans contourner la limite par IP du navigateur.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { DOMAIN, PARTNERS, OFFERS, CONVERSIONS, DAY } = require('./recette-partenaires-data');

const API = process.env.API_URL || 'http://localhost:3000/api';
const WEB = process.env.WEB_URL || 'http://localhost:8081';
const ADM = process.env.ADMIN_URL || 'http://localhost:8082';
const DB = process.env.RECETTE_DB || 'postgresql://boligo:boligo@127.0.0.1:5432/boligo_recette_partenaires';
const OUT = path.resolve(__dirname, '..', '..', 'docs', 'recette-partenaires');
const SHOTS = path.join(OUT, 'captures');
const SECRETS = process.env.RECETTE_SECRETS || '/tmp/claude-0/recette/acces-fictifs.json';
fs.mkdirSync(SHOTS, { recursive: true });

// ── Garde-fous : jamais ailleurs qu'en local, jamais sur une autre base.
for (const u of [API, WEB, ADM, DB]) {
  if (!/^(https?|postgresql):\/\/([^@]*@)?(localhost|127\.0\.0\.1)[:/]/.test(u)) throw new Error(`Recette locale uniquement : ${u}`);
}
const sql = (q) => execSync(`psql "${DB}" -tA`, { input: q, encoding: 'utf8' }).trim();
if (sql('SELECT current_database()') !== 'boligo_recette_partenaires') throw new Error('Base de recette inattendue');

const results = [];
let phase = '';
const record = (step, ok, detail = '') => {
  results.push({ phase, step, ok: !!ok, detail: String(detail) });
  console.log(`${ok ? '✅' : '❌'} [${phase}] ${step}${detail ? ' — ' + detail : ''}`);
};
const section = (name) => {
  phase = name;
  console.log(`\n── ${name}`);
};

let ipSeq = 0;
const nextIp = () => `198.51.100.${(ipSeq++ % 250) + 1}`;
async function call(method, p, { token, body, raw, ip, redirect } = {}) {
  const res = await fetch(API + p, {
    method,
    redirect: redirect || 'follow',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(ip ? { 'X-Forwarded-For': ip } : {}),
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}
const ok2xx = (r) => r.status >= 200 && r.status < 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const euro = (n) => `${n.toFixed(2).replace('.', ',')} €`;
const isoIn = (days) => new Date(Date.now() + days * DAY).toISOString();
const monthKey = (offset) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
};

let memberSeq = 0;
// Mots de passe fictifs tirés au hasard à chaque passage (jamais dans le dépôt).
const MEMBER_PW = `Mbr-${crypto.randomBytes(9).toString('base64url')}7!`;
async function registerMember({ tag, referralCode, role }) {
  memberSeq += 1;
  const email = `${tag}-${String(memberSeq).padStart(3, '0')}@${DOMAIN}`;
  const password = role === 'admin' ? `Rct-${crypto.randomBytes(9).toString('base64url')}9!` : MEMBER_PW;
  const reg = await call('POST', '/auth/register', {
    body: {
      email,
      password,
      firstName: role === 'admin' ? 'Admin' : `Membre${memberSeq}`,
      lastName: 'Recette',
      birthDate: '1991-05-1' + (memberSeq % 9) + 'T00:00:00.000Z',
      gender: memberSeq % 2 ? 'F' : 'H',
      city: 'Paris, France',
      telephone: `+33612${String(100000 + memberSeq * 37).slice(-6)}`,
      job: 'Profession fictive',
      meetingScope: 'international',
      acceptTerms: true,
      termsVersion: '2026-10-03',
      ...(referralCode ? { referralCode } : {}),
    },
  });
  if (!ok2xx(reg)) throw new Error(`inscription ${email} : ${reg.status} ${JSON.stringify(reg.data)}`);
  const ver = await call('POST', '/auth/verify-email', { body: { email, code: '1234' } });
  if (!ver.data?.access_token) throw new Error(`vérification ${email} : ${JSON.stringify(ver.data)}`);
  return { email, password, token: ver.data.access_token, refresh: ver.data.refresh_token, userId: ver.data.userId };
}

/** Vente simulée : montant réel calculé par le backend (check-promo), puis webhook local non signé. */
async function simulateSale(member, code) {
  const check = await call('POST', '/payment/check-promo', { token: member.token, body: { code } });
  if (!check.data?.isValid) return { ok: false, check: check.data };
  const amount = check.data.finalAmount;
  const pi = `pi_demo_${crypto.randomBytes(6).toString('hex')}`;
  const event = {
    id: `evt_demo_${crypto.randomBytes(6).toString('hex')}`,
    object: 'event',
    type: 'payment_intent.succeeded',
    livemode: false,
    data: { object: { id: pi, object: 'payment_intent', amount, currency: 'eur', status: 'succeeded', livemode: false, metadata: { userId: member.userId, credits: '1', planName: 'Parcours Harmonie', promoCode: code } } },
  };
  const res = await call('POST', '/payment/webhook', { raw: JSON.stringify(event) });
  return { ok: ok2xx(res), amount: amount / 100, pi };
}

const state = { partners: {}, offers: {}, links: {}, members: [], expected: {} };
const P = (key) => state.partners[key];
const O = (key) => state.offers[key];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const pageErrors = [];
  const newPage = async (ctxOpts = {}, init) => {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: 'fr-FR', ...ctxOpts });
    // Les liens des marques (*.example) n'existent pas : page neutre à la place.
    await ctx.route(/^https:\/\/[^/]*\.example\//, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Site fictif de la marque (recette)</h1>' }),
    );
    if (init) await ctx.addInitScript(init.fn, init.arg);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => pageErrors.push(`${page.url()} : ${e.message}`));
    return page;
  };
  const shot = (page, name, full = true) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: full });

  try {
    // ═════════════════════════════════════════════════════════════════════
    section('0. Environnement');
    record('Base de recette isolée', true, sql('SELECT current_database()'));
    const before = Number(sql(`SELECT count(*) FROM "PartnerApplication" WHERE email LIKE '%@${DOMAIN}'`));
    record('Aucune donnée de démonstration avant la recette', before === 0, `${before} partenaire(s) de démo présents`);
    const admin = await registerMember({ tag: 'admin.recette', role: 'admin' });
    sql(`UPDATE "User" SET role='ADMIN' WHERE id='${admin.userId}'`);
    const login = await call('POST', '/auth/login', { body: { email: admin.email, password: admin.password } });
    const AT = login.data?.access_token;
    record('Compte administrateur fictif (rôle ADMIN)', !!AT, admin.email);
    const memberProbe = await registerMember({ tag: 'membre' });
    const forbidden = await call('GET', '/admin/partners', { token: memberProbe.token });
    record('Un membre ne peut pas ouvrir l’administration des partenaires', forbidden.status === 403, `status ${forbidden.status}`);

    // ═════════════════════════════════════════════════════════════════════
    section('1. Candidatures');
    {
      const page = await newPage();
      for (const p of PARTNERS.filter((x) => x.via === 'navigateur')) {
        await page.goto(`${WEB}/partenaires`, { waitUntil: 'networkidle' });
        await page.getByTestId(`partner-type-${p.type}`).click();
        await page.getByTestId('partner-name').fill(p.name);
        await page.getByTestId('partner-email').fill(p.email);
        await page.getByTestId('partner-company').fill(p.company);
        await page.getByTestId('partner-country').fill('France');
        await page.getByTestId('partner-city').fill(p.city);
        if (p.website) await page.getByTestId('partner-website').fill(p.website);
        await page.getByTestId('partner-audience').fill(p.audience);
        await page.getByTestId('partner-message').fill(p.message);
        await page.getByTestId('partner-reg-AUTRE').click();
        await page.getByTestId('partner-reg-number').fill(p.regNumber);
        await page.getByTestId('partner-consent').click();
        if (p.key === 'galet') await shot(page, '01-formulaire-candidature-rempli', false);
        await page.getByTestId('partner-submit').click();
        const okSent = await page.getByTestId('partners-success').waitFor({ timeout: 10000 }).then(() => true, () => false);
        record(`Candidature via le formulaire public : ${p.company}`, okSent, p.type);
        if (p.key === 'galet') await shot(page, '02-formulaire-candidature-envoye', false);
      }
      await page.context().close();
    }
    for (const p of PARTNERS.filter((x) => x.via === 'api')) {
      const r = await call('POST', '/partners/apply', {
        body: { type: p.type, name: p.name, email: p.email, company: p.company, country: p.key === 'nora' ? 'Belgique' : 'France', city: p.city, website: p.website, audience: p.audience, message: p.message, language: 'fr', registrationType: 'AUTRE', registrationNumber: p.regNumber, consent: true },
      });
      if (!ok2xx(r)) record(`Candidature API ${p.company}`, false, `${r.status} ${JSON.stringify(r.data)}`);
    }
    const dup = await call('POST', '/partners/apply', {
      body: { type: 'AMBASSADEUR', name: 'Clara Fontenay', email: PARTNERS.find((x) => x.key === 'clara').email, country: 'France', message: PARTNERS[8].message, registrationType: 'AUTRE', registrationNumber: 'DEMO-2026-0009', consent: true },
    });
    await sleep(1500); // contrôle d'entreprise différé (manuel pour « autre pays »)
    const list = await call('GET', `/admin/partners?limit=50&q=${encodeURIComponent('(fictif)')}`, { token: AT });
    const rows = list.data?.data || [];
    for (const p of PARTNERS) {
      const row = rows.find((r) => r.email === p.email);
      state.partners[p.key] = { ...p, id: row?.id };
    }
    const n = Number(sql(`SELECT count(*) FROM "PartnerApplication" WHERE email LIKE '%@${DOMAIN}'`));
    record('20 candidatures enregistrées (8 entreprises, 6 ambassadeurs, 6 créateurs)', n === 20 && PARTNERS.every((p) => P(p.key).id), `${n} en base, ${rows.length} listées dans l’administration`);
    record('Doublon de candidature (même e-mail, même profil, < 24 h) non recréé', ok2xx(dup) && n === 20, `status ${dup.status}`);
    const verifStates = sql(`SELECT string_agg(DISTINCT "verificationStatus"::text || '/' || status::text, ',') FROM "PartnerApplication" WHERE email LIKE '%@${DOMAIN}'`);
    record('Nouvelles candidatures : statut Nouveau, entreprise « à vérifier » (aucun registre interrogé)', verifStates === 'A_VERIFIER/NOUVEAU', verifStates);

    // ═════════════════════════════════════════════════════════════════════
    section('2. Validation et codes');
    const accNoVerif = await call('PATCH', `/admin/partners/${P('clara').id}`, { token: AT, body: { status: 'ACCEPTE' } });
    record('Acceptation refusée tant que l’entreprise n’est pas vérifiée', accNoVerif.status === 400, accNoVerif.data?.message);
    const codeNoVerif = await call('POST', `/admin/partners/${P('clara').id}/code`, { token: AT, body: { code: 'DEMOCLARA', discountPercent: 10 } });
    record('Création de code refusée tant que l’entreprise n’est pas vérifiée', codeNoVerif.status === 400, codeNoVerif.data?.message);

    const toVerify = PARTNERS.filter((p) => !['galet', 'hugo', 'ines'].includes(p.key) && !p.adminUi);
    for (const p of toVerify) {
      const r = await call('PATCH', `/admin/partners/${P(p.key).id}/verification`, { token: AT, body: { status: 'VERIFIE', note: `Recette : numéro fictif ${p.regNumber} contrôlé (jeu de démonstration).` } });
      if (!ok2xx(r)) record(`Vérification ${p.company}`, false, `${r.status} ${JSON.stringify(r.data)}`);
    }
    record(`Vérification manuelle par l’administrateur (${toVerify.length} partenaires)`, Number(sql(`SELECT count(*) FROM "PartnerApplication" WHERE email LIKE '%@${DOMAIN}' AND "verificationStatus"='VERIFIE'`)) === toVerify.length);

    for (const p of PARTNERS.filter((x) => x.code && !x.adminUi)) {
      const r = await call('POST', `/admin/partners/${P(p.key).id}/code`, { token: AT, body: { code: p.code.code, discountPercent: p.code.discount } });
      if (r.data?.portalLink) state.links[p.key] = r.data.portalLink;
      if (!ok2xx(r)) record(`Code ${p.code.code}`, false, `${r.status} ${JSON.stringify(r.data)}`);
    }
    for (const key of ['velo', 'ourlet', 'tilleul']) {
      const a = await call('PATCH', `/admin/partners/${P(key).id}`, { token: AT, body: { status: 'ACCEPTE' } });
      const l = await call('POST', `/admin/partners/${P(key).id}/portal`, { token: AT });
      if (l.data?.portalLink) state.links[key] = l.data.portalLink;
      if (!ok2xx(a) || !ok2xx(l)) record(`Marque sans code ${key}`, false, `${a.status}/${l.status} ${JSON.stringify(l.data)}`);
    }
    record('Marques acceptées sans code : lien d’espace partenaire délivré', ['velo', 'ourlet', 'tilleul'].every((k) => /\/espace-partenaire#/.test(state.links[k] || '')));
    for (const key of ['ardoise', 'ines']) await call('PATCH', `/admin/partners/${P(key).id}`, { token: AT, body: { status: 'EN_COURS', notes: 'Recette : échange en cours (fictif).' } });
    for (const p of PARTNERS.filter((x) => x.rate)) await call('PATCH', `/admin/partners/${P(p.key).id}`, { token: AT, body: { commissionRate: p.rate } });
    // Jeu concours de Nora : code « Parcours offert », 3 utilisations au plus.
    const noraPromo = sql(`SELECT id FROM "PromoCode" WHERE code='DEMONORA'`);
    const freeRes = await call('PATCH', `/admin/promo/codes/${noraPromo}`, { token: AT, body: { discountType: 'free', discountValue: 100, maxUses: 3, description: 'Jeu concours fictif (recette)' } });
    record('Code DEMONORA passé en « Parcours offert » (jeu concours, 3 utilisations)', ok2xx(freeRes), `status ${freeRes.status}`);
    const codes = sql(`SELECT string_agg(code || ':' || "discountValue", ' ' ORDER BY code) FROM "PromoCode" WHERE code LIKE 'DEMO%'`);
    record('Codes personnalisés attribués (sauf DEMOLINA, créé depuis l’écran d’administration)', codes.split(' ').length === 12, codes);
    const linksOk = Object.values(state.links).every((l) => /^http:\/\/localhost:8081\/espace-partenaire#[A-Za-z0-9_-]{43}$/.test(l));
    record('Lien privé d’espace partenaire délivré une seule fois à la création du code (e-mail en simulation)', linksOk, `${Object.keys(state.links).length} liens`);
    const rates = sql(`SELECT string_agg(type::text || '=' || coalesce("commissionRate"::text,'—'), ' ' ORDER BY type) FROM (SELECT DISTINCT type, "commissionRate" FROM "PartnerApplication" WHERE email LIKE '%@${DOMAIN}' AND status='ACCEPTE') s`);
    record('Commissions : ambassadeurs 20 % (Yanis 25 %), créateurs 15 % (Nora 12 %), marques sans commission', /AMBASSADEUR=20/.test(rates) && /AMBASSADEUR=25/.test(rates) && /CREATEUR=12/.test(rates) && /CREATEUR=15/.test(rates) && /ANNONCEUR=—/.test(rates), rates);

    // ═════════════════════════════════════════════════════════════════════
    section('3. Offres');
    const draftWhileEnCours = await call('POST', `/admin/partners/${P('ardoise').id}/offers`, { token: AT, body: { title: 'Atelier dégustation', perk: '-15 %', description: 'Test de publication refusée (fictif).', url: 'https://cave-ardoise.example/test', isActive: true } });
    record('Publication refusée pour un partenaire non accepté (Cave Ardoise, en cours)', draftWhileEnCours.status === 400, draftWhileEnCours.data?.message);
    const badUrl = await call('POST', `/admin/partners/${P('lumen').id}/offers`, { token: AT, body: { title: 'Lien non sécurisé', perk: 'x', description: 'Test lien http refusé.', url: 'http://atelier-lumen.example', isActive: false } });
    record('Lien d’offre non https refusé', badUrl.status === 400, badUrl.data?.message);
    for (const o of OFFERS.filter((x) => !x.adminUi && !x.endInSec)) {
      const body = { title: o.title, perk: o.perk, description: o.description, url: o.url, perkCode: o.perkCode, placement: o.placement, isActive: !!o.publish };
      if (o.startIn != null) body.startsAt = isoIn(o.startIn);
      if (o.endIn != null) body.endsAt = isoIn(o.endIn);
      const r = await call('POST', `/admin/partners/${P(o.partner).id}/offers`, { token: AT, body });
      if (!ok2xx(r)) record(`Offre ${o.key}`, false, `${r.status} ${JSON.stringify(r.data)}`);
      state.offers[o.key] = { ...o, id: r.data?.id };
    }
    record('16 offres créées par l’API d’administration (2 autres : écran d’administration et expiration en direct)', Object.values(state.offers).filter((o) => o.id).length === 16);

    // ═════════════════════════════════════════════════════════════════════
    section('4. Visites, inscriptions, ventes');
    const pub = async () => (await call('GET', '/partners/offers', { ip: nextIp() })).data || [];
    for (const p of PARTNERS.filter((x) => x.traffic && !x.adminUi)) {
      const t = p.traffic;
      let counted = 0;
      for (let i = 0; i < t.visits; i++) {
        const r = await call('POST', `/partners/link/${p.code.code}/visit`, { ip: nextIp() });
        if (r.data?.counted) counted += 1;
      }
      const members = [];
      for (let i = 0; i < t.signups; i++) members.push(await registerMember({ tag: `membre-${p.key}`, referralCode: p.code.code }));
      let revenue = 0;
      let sales = 0;
      for (let i = 0; i < t.sales; i++) {
        const s = await simulateSale(members[i], p.code.code);
        if (s.ok) {
          sales += 1;
          revenue += s.amount;
        } else record(`Vente simulée ${p.code.code}`, false, JSON.stringify(s.check));
      }
      let free = 0;
      for (let i = 0; i < (t.free || 0); i++) {
        const r = await call('POST', '/payment/apply-promo', { token: members[t.sales + i].token, body: { code: p.code.code } });
        if (ok2xx(r)) free += 1;
        else record(`Activation gratuite ${p.code.code}`, false, `${r.status} ${JSON.stringify(r.data)}`);
      }
      state.members.push(...members.map((m) => ({ ...m, code: p.code.code })));
      const rate = p.rate ?? (p.type === 'AMBASSADEUR' ? 20 : p.type === 'CREATEUR' ? 15 : null);
      state.expected[p.key] = { visits: counted, signups: t.signups, sales, free, revenue: Math.round(revenue * 100) / 100, rate };
      record(`${p.code.code} : ${counted} visites, ${t.signups} inscriptions, ${sales} Parcours payés${free ? `, ${free} offerts` : ''}`, counted === t.visits && sales === t.sales && free === (t.free || 0), `CA ${euro(revenue)}`);
    }
    const attached = Number(sql(`SELECT count(*) FROM "User" u JOIN "PromoCode" c ON c.id=u."referralCodeId" WHERE c.code LIKE 'DEMO%'`));
    const expSignups = Object.values(state.expected).reduce((s, e) => s + e.signups, 0);
    record('Chaque inscription via un lien est rattachée au bon partenaire', attached === expSignups, `${attached}/${expSignups} membres rattachés`);
    const noraFree = sql(`SELECT count(*) FROM "CreditTransaction" t JOIN "PromoCode" c ON c.id=t."promoCodeId" WHERE c.code='DEMONORA' AND t."euroAmount"=0`);
    record('Activations gratuites tracées à 0 € (jamais comptées comme ventes)', noraFree === '2', `${noraFree} activation(s) à 0 €`);
    const third = await registerMember({ tag: 'membre-nora' });
    const thirdFree = await call('POST', '/payment/apply-promo', { token: third.token, body: { code: 'DEMONORA' } });
    const fourth = await registerMember({ tag: 'membre-nora' });
    const overLimit = await call('POST', '/payment/apply-promo', { token: fourth.token, body: { code: 'DEMONORA' } });
    record('Code « offert » limité à 3 utilisations : la 4e est refusée', ok2xx(thirdFree) && overLimit.status === 400, `3e ${thirdFree.status}, 4e ${overLimit.status}`);
    state.expected.nora.free += ok2xx(thirdFree) ? 1 : 0;

    // ═════════════════════════════════════════════════════════════════════
    section('5. Visibilité des offres (avant changements de statut)');
    const k = OFFERS.find((x) => x.key === 'K');
    const kRes = await call('POST', `/admin/partners/${P('ourlet').id}/offers`, { token: AT, body: { title: k.title, perk: k.perk, description: k.description, url: k.url, perkCode: k.perkCode, placement: k.placement, isActive: true, startsAt: isoIn(-1), endsAt: new Date(Date.now() + k.endInSec * 1000).toISOString() } });
    state.offers.K = { ...k, id: kRes.data?.id, expiresAt: Date.now() + k.endInSec * 1000 };
    const visibleKeys = (list) => Object.values(state.offers).filter((o) => list.some((x) => x.id === o.id)).map((o) => o.key).sort().join('');
    let vis = visibleKeys(await pub());
    record('Offres visibles des membres = offres en ligne de partenaires acceptés', vis === 'ABDGHIJKLMQ', `visibles : ${vis} (attendu ABDGHIJKLMQ ; C expirée, E programmée, brouillons cachés)`);
    const pom = (await call('GET', '/partners/offers?placement=PARTENAIRE_DU_MOIS', { ip: nextIp() })).data || [];
    record('« Partenaire du mois » : seule l’offre A (Atelier Lumen)', pom.length === 1 && pom[0].id === O('A').id, pom.map((x) => x.title).join(', '));

    // ═════════════════════════════════════════════════════════════════════
    section('6. Publication, suspension, refus, expiration');
    const withdraw = await call('PATCH', `/admin/partners/${P('velo').id}/offers/${O('I').id}`, { token: AT, body: { isActive: false } });
    record('Offre I retirée par l’équipe', ok2xx(withdraw));
    const republishExpired = await call('PATCH', `/admin/partners/${P('lumen').id}/offers/${O('C').id}`, { token: AT, body: { isActive: true } });
    record('Republication d’une offre expirée refusée', republishExpired.status === 400, republishExpired.data?.message);
    const clickExpired = await call('GET', `/partners/offers/${O('C').id}/go`, { ip: nextIp(), redirect: 'manual' });
    record('Clic sur une offre expirée : non redirigé, non compté', clickExpired.status === 404, `status ${clickExpired.status}`);

    // Suspension de Spa Nacre
    const nacreBefore = await call('POST', '/payment/check-promo', { token: memberProbe.token, body: { code: 'DEMONACRE' } });
    const susp = await call('PATCH', `/admin/partners/${P('nacre').id}`, { token: AT, body: { status: 'SUSPENDU', notes: 'Recette : suspension temporaire (fictif).' } });
    const nacreAfter = await call('POST', '/payment/check-promo', { token: memberProbe.token, body: { code: 'DEMONACRE' } });
    const nacreVisit = await call('POST', '/partners/link/DEMONACRE/visit', { ip: nextIp() });
    const nacreSignup = await registerMember({ tag: 'membre-nacre', referralCode: 'DEMONACRE' });
    const nacreAttached = sql(`SELECT count(*) FROM "User" WHERE id='${nacreSignup.userId}' AND "referralCodeId" IS NOT NULL`);
    record('Suspension : code valide avant, refusé après (paiement)', nacreBefore.data?.isValid === true && ok2xx(susp) && nacreAfter.data?.isValid === false, nacreAfter.data?.message);
    record('Suspension : visites et inscriptions via le lien ne sont plus comptées', nacreVisit.data?.counted === false && nacreAttached === '0');
    const nacrePortal = await call('POST', '/partners/portal', { body: { token: state.links.nacre.split('#')[1] }, ip: nextIp() });
    record('Suspension : espace partenaire toujours consultable (lecture seule)', nacrePortal.data?.partner?.status === 'SUSPENDU', `ventes ${nacrePortal.data?.totals?.purchases}`);

    // Refus de Voyages Tilleul (offre en ligne) et de Mathis (code actif)
    await call('PATCH', `/admin/partners/${P('tilleul').id}`, { token: AT, body: { status: 'REFUSE', notes: 'Recette : partenariat refusé (fictif).' } });
    await call('PATCH', `/admin/partners/${P('mathis').id}`, { token: AT, body: { status: 'REFUSE', notes: 'Recette : non-respect des règles de publication (fictif).' } });
    const mathisCode = await call('POST', '/payment/check-promo', { token: memberProbe.token, body: { code: 'DEMOMATHIS' } });
    record('Refus : le code du partenaire refusé est rejeté au paiement (corrigé)', mathisCode.data?.isValid === false, mathisCode.data?.message);
    const mathisPortal = await call('POST', '/partners/portal', { body: { token: state.links.mathis.split('#')[1] }, ip: nextIp() });
    record('Refus : le lien d’espace partenaire ne fonctionne plus', mathisPortal.status === 404, `status ${mathisPortal.status}`);

    // Suspension puis reprise de Maëlle (la suspension finale se fait depuis l’écran d’administration)
    await call('PATCH', `/admin/partners/${P('maelle').id}`, { token: AT, body: { status: 'SUSPENDU' } });
    const maelleOff = await call('POST', '/payment/check-promo', { token: memberProbe.token, body: { code: 'DEMOMAELLE' } });
    await call('PATCH', `/admin/partners/${P('maelle').id}`, { token: AT, body: { status: 'ACCEPTE' } });
    const maelleOn = await call('POST', '/payment/check-promo', { token: memberProbe.token, body: { code: 'DEMOMAELLE' } });
    record('Reprise après suspension : le code redevient valable', maelleOff.data?.isValid === false && maelleOn.data?.isValid === true);

    vis = visibleKeys(await pub());
    record('Après retrait, suspension et refus : I, L, M, Q ne sont plus visibles', vis === 'ABDGHJK', `visibles : ${vis}`);
    const imprRetired = await call('POST', '/partners/offers/impressions', { body: { ids: [O('L').id, O('C').id] }, ip: nextIp() });
    const lStats = sql(`SELECT coalesce(sum(impressions),0) FROM "PartnerOfferStat" WHERE "offerId" IN ('${O('L').id}','${O('C').id}')`);
    record('Affichages d’offres retirées ou expirées ignorés', ok2xx(imprRetired) && lStats === '0', `${lStats} affichage(s) enregistrés`);

    const waitMs = state.offers.K.expiresAt - Date.now() + 1500;
    if (waitMs > 0) await sleep(waitMs);
    vis = visibleKeys(await pub());
    record('Expiration en direct : l’offre K disparaît à sa date de fin, sans action', vis === 'ABDGHJ', `visibles : ${vis}`);

    // ═════════════════════════════════════════════════════════════════════
    section('7. Webapp membre (navigateur)');
    {
      const visitor = await newPage();
      await visitor.goto(`${WEB}/?p=DEMOCLARA`, { waitUntil: 'networkidle' });
      const banner = await visitor.getByTestId('referral-banner').waitFor({ timeout: 10000 }).then(() => true, () => false);
      const pomCard = await visitor.getByTestId(`offer-${O('A').id}`).first().waitFor({ timeout: 10000 }).then(() => true, () => false);
      await visitor.getByTestId('partner-of-month').scrollIntoViewIfNeeded().catch(() => undefined);
      await shot(visitor, '10-webapp-accueil-lien-clara-partenaire-du-mois');
      record('Visiteur arrivé par ?p=DEMOCLARA : bandeau de réduction affiché', banner);
      record('Accueil : « Partenaire du mois » Atelier Lumen affiché', pomCard);
      state.expected.clara.visits += 1;
      await visitor.context().close();

      const member = state.members.find((m) => m.code === 'DEMOJADE');
      const mp = await newPage({}, {
        fn: (m) => {
          localStorage.setItem('userToken', m.token);
          if (m.refresh) localStorage.setItem('refreshToken', m.refresh);
          localStorage.setItem('userId', m.userId);
        },
        arg: { token: member.token, refresh: member.refresh, userId: member.userId },
      });
      await mp.goto(`${WEB}/profile/offres`, { waitUntil: 'networkidle' });
      await mp.getByTestId('offers-screen').waitFor({ timeout: 15000 });
      await mp.waitForTimeout(1500);
      const ids = await mp.locator('[data-testid^="offer-go-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').replace('offer-go-', '')));
      const shown = Object.values(state.offers).filter((o) => ids.includes(o.id)).map((o) => o.key).sort().join('');
      await shot(mp, '11-webapp-membre-offres-partenaires');
      record('Membre connecté : page « Offres partenaires » = 6 offres en ligne', shown === 'ABDGHJ', `affichées : ${shown}`);
      // Le lien passe par /partners/offers/:id/go (clic compté) puis 302 vers la marque.
      let landed = '';
      mp.context().on('response', (res) => {
        if (/\/partners\/offers\/[^/]+\/go/.test(res.url()) && res.status() === 302) landed = res.headers().location || '';
      });
      const clicksBefore = Number(sql(`SELECT coalesce(sum(clicks),0) FROM "PartnerOfferStat" WHERE "offerId"='${O('D').id}'`));
      await mp.getByTestId(`offer-go-${O('D').id}`).first().click();
      await mp.waitForTimeout(2500);
      const clicksAfter = Number(sql(`SELECT coalesce(sum(clicks),0) FROM "PartnerOfferStat" WHERE "offerId"='${O('D').id}'`));
      landed += ` (clics D : ${clicksBefore} → ${clicksAfter})`;
      record('Clic membre : compté puis redirigé vers le site de la marque avec utm_source=boligo', /maison-cerfeuil\.example.*utm_source=boligo/.test(landed) && /→ (\d+)\)$/.exec(landed)?.[1] - clicksBefore === 1, landed);
      await mp.context().close();
    }
    // Clics de visiteurs distincts (API) : jamais des ventes.
    for (const o of OFFERS.filter((x) => x.clicks)) {
      for (let i = 0; i < o.clicks; i++) await call('GET', `/partners/offers/${O(o.key).id}/go`, { ip: nextIp(), redirect: 'manual' });
      await call('POST', '/partners/offers/impressions', { body: { ids: [O(o.key).id] }, ip: nextIp() });
    }
    for (let i = 0; i < 40; i++) await call('POST', '/partners/offers/impressions', { body: { ids: ['A', 'B', 'D', 'G', 'H', 'J'].map((x) => O(x).id) }, ip: nextIp() });
    const clickWithdrawn = await call('GET', `/partners/offers/${O('I').id}/go`, { ip: nextIp(), redirect: 'manual' });
    record('Clic sur une offre retirée : refusé', clickWithdrawn.status === 404, `status ${clickWithdrawn.status}`);

    // ═════════════════════════════════════════════════════════════════════
    section('8. Ventes confirmées des liens affiliés (relevés des marques)');
    for (const c of CONVERSIONS.filter((x) => !x.adminUi)) {
      const o = O(c.offer);
      const r = await call('POST', `/admin/partners/${P(o.partner).id}/offers/${o.id}/conversions`, { token: AT, body: { month: monthKey(c.month), conversions: c.conversions, revenue: c.revenue, reference: c.reference } });
      if (!ok2xx(r)) record(`Ventes confirmées ${c.offer}`, false, `${r.status} ${JSON.stringify(r.data)}`);
    }
    const future = await call('POST', `/admin/partners/${P('lumen').id}/offers/${O('A').id}/conversions`, { token: AT, body: { month: monthKey(1), conversions: 5, revenue: 10 } });
    record('Relevé d’un mois futur refusé', future.status === 400, future.data?.message);

    // ═════════════════════════════════════════════════════════════════════
    section('9. Administration (navigateur)');
    {
      const adminUser = { id: admin.userId, email: admin.email, firstName: 'Admin', lastName: 'Recette', role: 'ADMIN' };
      const ap = await newPage({ viewport: { width: 1440, height: 1000 } }, {
        fn: (s) => {
          localStorage.setItem('boligo_admin_token', s.token);
          localStorage.setItem('boligo_admin_user', JSON.stringify(s.user));
        },
        arg: { token: AT, user: adminUser },
      });
      const openPartner = async (key) => {
        await ap.goto(`${ADM}/dashboard/partners/`, { waitUntil: 'domcontentloaded' });
        await ap.getByTestId(`partner-row-${P(key).email}`).click({ timeout: 20000 });
        await ap.getByTestId('partner-detail').waitFor({ timeout: 10000 });
      };

      // Lina : vérification manuelle puis création du code depuis l'écran.
      await openPartner('lina');
      await ap.getByTestId('partner-code-blocked').waitFor({ timeout: 5000 }).catch(() => undefined);
      const blocked = await ap.getByTestId('partner-code-blocked').isVisible().catch(() => false);
      await ap.getByTestId('partner-manual-note').fill('Recette : numéro fictif DEMO-2026-0015 contrôlé (jeu de démonstration).');
      await ap.getByTestId('partner-manual-ok').click();
      await ap.waitForTimeout(1200);
      const lina = PARTNERS.find((p) => p.key === 'lina');
      await ap.getByPlaceholder('Généré').fill(lina.code.code);
      await ap.getByLabel('Réduction (%)').fill(String(lina.code.discount));
      await ap.getByTestId('partner-create-code').click();
      await ap.getByTestId('partner-portal-link').waitFor({ timeout: 10000 });
      const linaLink = (await ap.getByTestId('partner-portal-link').inputValue().catch(async () => ap.getByTestId('partner-portal-link').innerText())).trim();
      state.links.lina = linaLink;
      await shot(ap, '20-admin-lina-code-cree-lien-prive');
      record('Écran d’administration : code bloqué avant vérification, puis vérification et code DEMOLINA créés', blocked && /espace-partenaire#/.test(linaLink), linaLink.replace(/#.*/, '#…'));
    }
    // Trafic de Lina (après création de son code depuis l'écran)
    {
      const t = PARTNERS.find((p) => p.key === 'lina').traffic;
      let counted = 0;
      for (let i = 0; i < t.visits; i++) if ((await call('POST', '/partners/link/DEMOLINA/visit', { ip: nextIp() })).data?.counted) counted += 1;
      const members = [];
      for (let i = 0; i < t.signups; i++) members.push(await registerMember({ tag: 'membre-lina', referralCode: 'DEMOLINA' }));
      let revenue = 0;
      for (let i = 0; i < t.sales; i++) {
        const s = await simulateSale(members[i], 'DEMOLINA');
        if (s.ok) revenue += s.amount;
      }
      const page = await newPage();
      await page.goto(`${WEB}/?p=DEMOLINA`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.context().close();
      state.expected.lina = { visits: counted + 1, signups: t.signups, sales: t.sales, free: 0, revenue: Math.round(revenue * 100) / 100, rate: 15 };
      record(`DEMOLINA : ${counted + 1} visites (dont 1 navigateur), ${t.signups} inscriptions, ${t.sales} Parcours payés`, counted === t.visits, `CA ${euro(revenue)}`);
    }
    {
      const ap = await newPage({ viewport: { width: 1440, height: 1000 } }, {
        fn: (s) => {
          localStorage.setItem('boligo_admin_token', s.token);
          localStorage.setItem('boligo_admin_user', JSON.stringify(s.user));
        },
        arg: { token: AT, user: { id: admin.userId, email: admin.email, firstName: 'Admin', lastName: 'Recette', role: 'ADMIN' } },
      });
      const openPartner = async (key) => {
        await ap.goto(`${ADM}/dashboard/partners/`, { waitUntil: 'domcontentloaded' });
        await ap.getByTestId(`partner-row-${P(key).email}`).click({ timeout: 20000 });
        await ap.getByTestId('partner-detail').waitFor({ timeout: 10000 });
      };
      // Offre F (brouillon) créée depuis l'écran.
      await openPartner('cerfeuil');
      const f = OFFERS.find((x) => x.key === 'F');
      await ap.getByTestId('offer-new').click();
      const form = ap.getByTestId('offer-form');
      await form.getByLabel('Titre (80 car.)').fill(f.title);
      await form.getByLabel(/Avantage/).fill(f.perk);
      await form.getByLabel(/Description/).fill(f.description);
      await form.getByLabel(/Lien de la marque/).fill(f.url);
      await form.getByLabel(/Code de la marque/).fill(f.perkCode);
      await ap.getByTestId('offer-create').click();
      await ap.waitForTimeout(1500);
      const fId = sql(`SELECT id FROM "PartnerOffer" WHERE title='${f.title.replace(/'/g, "''")}'`);
      state.offers.F = { ...f, id: fId };
      await shot(ap, '21-admin-cerfeuil-offres');
      record('Écran d’administration : offre F créée en brouillon', !!fId);

      // Vente confirmée de l'offre G saisie depuis l'éditeur d'offre.
      await openPartner('velo');
      const g = CONVERSIONS.find((c) => c.adminUi);
      await ap.getByTestId(`offer-edit-${O('G').id}`).click();
      const ed = ap.getByTestId(`offer-editor-${O('G').id}`);
      await ed.waitFor({ timeout: 8000 });
      await ap.getByTestId('conv-month').fill(monthKey(g.month));
      await ap.getByTestId('conv-count').fill(String(g.conversions));
      await ap.getByTestId('conv-revenue').fill(String(g.revenue).replace('.', ','));
      await ap.getByTestId('conv-add').click();
      await ap.waitForTimeout(1500);
      const gConv = sql(`SELECT coalesce(sum(conversions),0) || '/' || coalesce(sum("revenueCents"),0) FROM "PartnerOfferConversion" WHERE "offerId"='${O('G').id}'`);
      await shot(ap, '22-admin-velo-editeur-offre-ventes-confirmees');
      record('Écran d’administration : vente confirmée de l’offre G enregistrée (1 vente, 4,50 €)', gConv === '1/450', gConv);

      // Suspension finale de Maëlle depuis l'écran.
      await openPartner('maelle');
      await ap.getByTestId('partner-status').selectOption('SUSPENDU');
      await ap.getByTestId('partner-save').click();
      await ap.waitForTimeout(1200);
      const maelleSt = sql(`SELECT p.status || '/' || c."isActive" FROM "PartnerApplication" p JOIN "PromoCode" c ON c.id=p."promoCodeId" WHERE p.email='${P('maelle').email}'`);
      record('Écran d’administration : Maëlle suspendue, code coupé', maelleSt === 'SUSPENDU/false', maelleSt);

      // Vue d'ensemble : 20 partenaires, synthèse des offres.
      await ap.goto(`${ADM}/dashboard/partners/`, { waitUntil: 'domcontentloaded' });
        await ap.locator('[data-testid^="partner-row-"]').first().waitFor({ timeout: 20000 });
      await ap.waitForTimeout(800);
      const rowsShown = await ap.locator(`[data-testid^="partner-row-"][data-testid$="@${DOMAIN}"]`).count();
      await shot(ap, '23-admin-liste-20-partenaires-synthese');
      record('Administration : les 20 partenaires fictifs listés', rowsShown === 20, `${rowsShown} lignes`);
      const sumText = await ap.getByTestId('offers-summary').innerText();
      record('Administration : synthèse « clics mesurés » distincte des « ventes confirmées »', /Clics mesurés \(pas des ventes\)/.test(sumText) && /Ventes confirmées par les marques/.test(sumText), sumText.replace(/\s+/g, ' ').slice(0, 220));
      for (const [key, name] of [['lumen', '24-admin-detail-atelier-lumen'], ['nacre', '25-admin-detail-spa-nacre-suspendu'], ['clara', '26-admin-detail-clara-ambassadrice']]) {
        await openPartner(key);
        await ap.waitForTimeout(800);
        await shot(ap, name);
      }
      await openPartner('lumen');
      await ap.getByTestId(`offer-edit-${O('A').id}`).click();
      await ap.getByTestId(`offer-editor-${O('A').id}`).waitFor({ timeout: 8000 });
      await ap.waitForTimeout(600);
      await shot(ap, '27-admin-lumen-editeur-offre-A');
      for (const type of ['ANNONCEUR', 'AMBASSADEUR', 'CREATEUR']) {
        await ap.goto(`${ADM}/dashboard/partners/`, { waitUntil: 'domcontentloaded' });
        await ap.locator('[data-testid^="partner-row-"]').first().waitFor({ timeout: 20000 });
        await ap.getByTestId('partners-filter-type').selectOption(type);
        await ap.waitForTimeout(900);
        await shot(ap, `28-admin-filtre-${type.toLowerCase()}`);
      }
      await ap.context().close();
    }

    // ═════════════════════════════════════════════════════════════════════
    section('10. Espace partenaire (API + navigateur)');
    for (const [key, exp] of Object.entries(state.expected)) {
      const tok = (state.links[key] || '').split('#')[1];
      const r = await call('POST', '/partners/portal', { body: { token: tok }, ip: nextIp() });
      if (key === 'mathis') continue;
      const d = r.data || {};
      const commission = exp.rate == null ? 0 : Math.round(exp.revenue * exp.rate) / 100;
      const good = ok2xx(r) && d.funnel?.visits === exp.visits && d.funnel?.signups === exp.signups && d.totals?.purchases === exp.sales && Math.abs(d.totals?.revenue - exp.revenue) < 0.01 && Math.abs(d.totals?.commission - commission) < 0.011 && d.funnel?.freeActivations === exp.free;
      record(`Espace ${P(key).code?.code || key} : chiffres exacts`, good, `visites ${d.funnel?.visits}/${exp.visits}, inscriptions ${d.funnel?.signups}/${exp.signups}, ventes ${d.totals?.purchases}/${exp.sales}, CA ${d.totals?.revenue}/${exp.revenue}, commission ${d.totals?.commission}/${commission}${exp.free ? `, offerts ${d.funnel?.freeActivations}/${exp.free}` : ''}`);
    }
    const velo = (await call('POST', '/partners/portal', { body: { token: state.links.velo.split('#')[1] }, ip: nextIp() })).data;
    const gStat = velo?.offers?.find((o) => o.id === O('G').id);
    record('Espace marque sans code (Vélo Brume) : offres, clics et ventes confirmées séparés', velo?.code === null && gStat && gStat.clicks >= 4 && gStat.confirmedSales === 1, `G : ${gStat?.clicks} clics, ${gStat?.confirmedSales} vente confirmée, état ${gStat?.state}`);
    const tilleulPortal = await call('POST', '/partners/portal', { body: { token: state.links.tilleul.split('#')[1] }, ip: nextIp() });
    record('Marque refusée (Voyages Tilleul) : espace fermé', tilleulPortal.status === 404, `status ${tilleulPortal.status}`);

    const spaces = [
      ['clara', '30-espace-clara-ambassadrice'],
      ['lina', '31-espace-lina-creatrice'],
      ['nora', '32-espace-nora-jeu-concours-offerts'],
      ['lumen', '33-espace-atelier-lumen-marque-avec-code'],
      ['velo', '34-espace-velo-brume-marque-sans-code'],
      ['nacre', '35-espace-spa-nacre-suspendu'],
      ['maelle', '36-espace-maelle-suspendue'],
      ['mathis', '37-espace-mathis-refuse-lien-coupe'],
    ];
    for (const [key, name] of spaces) {
      const sp = await newPage();
      await sp.goto(state.links[key], { waitUntil: 'networkidle' });
      await sp.waitForTimeout(1500);
      await shot(sp, name);
      if (key === 'clara') {
        const v = await sp.getByTestId('space-funnel-visits').innerText().catch(() => '');
        const c = await sp.getByTestId('space-kpi-commission').innerText().catch(() => '');
        record('Navigateur : espace de Clara (visites, commission)', v.includes(String(state.expected.clara.visits)) && /€/.test(c), `${v.replace(/\s+/g, ' ')} · ${c.replace(/\s+/g, ' ')}`);
      }
      if (key === 'velo') {
        const note = await sp.getByTestId('space-offers-note').isVisible().catch(() => false);
        const noCode = (await sp.getByTestId('space-code').count()) === 0;
        record('Navigateur : marque sans code — pas de code, offres avec « clic ≠ vente »', note && noCode);
      }
      if (key === 'nacre' || key === 'maelle') record(`Navigateur : bandeau « Partenariat suspendu » (${key})`, await sp.getByTestId('space-suspended').isVisible().catch(() => false));
      if (key === 'mathis') record('Navigateur : lien d’un partenaire refusé → « Ce lien ne fonctionne plus »', await sp.getByTestId('space-invalid').isVisible().catch(() => false));
      await sp.context().close();
    }

    // ═════════════════════════════════════════════════════════════════════
    section('11. Synthèse finale');
    const statuses = sql(`SELECT string_agg(status || '=' || n, ' ' ORDER BY status) FROM (SELECT status::text, count(*) n FROM "PartnerApplication" WHERE email LIKE '%@${DOMAIN}' GROUP BY status) s`);
    record('Statuts finaux : 12 acceptés, 2 suspendus, 2 en cours, 2 nouveaux, 2 refusés', statuses === 'ACCEPTE=12 EN_COURS=2 NOUVEAU=2 REFUSE=2 SUSPENDU=2', statuses);
    const sum = (await call('GET', '/admin/partners/offers/summary', { token: AT })).data;
    const by = sum?.byState || {};
    record('18 offres : 6 en ligne, 1 programmée, 2 expirées, 5 brouillons, 4 retirées', sum?.total === 18 && by.en_ligne === 6 && by.programmee === 1 && by.expiree === 2 && by.brouillon === 5 && by.retiree === 4, JSON.stringify(by));
    const expConfirmed = CONVERSIONS.reduce((s, c) => s + c.conversions, 0);
    const expConfRev = CONVERSIONS.reduce((s, c) => s + c.revenue, 0);
    record('Affiliation : clics mesurés ≠ ventes confirmées ; revenu BOLIGO = relevés seulement', sum?.confirmedSales === expConfirmed && Math.abs(sum?.confirmedRevenue - expConfRev) < 0.01 && sum?.clicks > sum?.confirmedSales, `${sum?.impressions} affichages, ${sum?.clicks} clics, ${sum?.confirmedSales} ventes confirmées, ${euro(sum?.confirmedRevenue || 0)} pour BOLIGO (taux ${sum?.conversionRate} %)`);
    const states = (await Promise.all(Object.values(state.offers).map(async (o) => {
      const list = (await call('GET', `/admin/partners/${P(o.partner).id}/offers`, { token: AT })).data || [];
      const row = list.find((x) => x.id === o.id);
      return `${o.key}:${row?.stats?.state === o.state ? 'ok' : `${row?.stats?.state}≠${o.state}`}`;
    }))).sort();
    record('Chaque offre dans l’état attendu', states.every((s) => s.endsWith(':ok')), states.join(' '));
    const summary = (await call('GET', '/admin/partners/summary', { token: AT })).data;
    const totalRevenue = Object.values(state.expected).reduce((s, e) => s + e.revenue, 0);
    const totalComm = Object.values(state.expected).reduce((s, e) => s + (e.rate == null ? 0 : Math.round(e.revenue * e.rate) / 100), 0);
    const totalSales = Object.values(state.expected).reduce((s, e) => s + e.sales, 0);
    record('Synthèse administration : Parcours payés, CA et commissions dues (codes partenaires)', summary?.purchases === totalSales && Math.abs(summary?.revenue - totalRevenue) < 0.02 && Math.abs(summary?.commission - totalComm) < 0.05, `${summary?.purchases}/${totalSales} Parcours, CA ${summary?.revenue}/${totalRevenue.toFixed(2)}, commissions ${summary?.commission}/${totalComm.toFixed(2)}`);
    record('Aucune erreur JavaScript dans les pages', pageErrors.length === 0, pageErrors.slice(0, 5).join(' | '));

    // Accès fictifs (hors dépôt, jamais commités).
    fs.mkdirSync(path.dirname(SECRETS), { recursive: true });
    fs.writeFileSync(SECRETS, JSON.stringify({ admin: { url: `${ADM}/login`, email: admin.email, password: admin.password }, membre: { email: state.members.find((m) => m.code === 'DEMOJADE').email, password: MEMBER_PW }, espaces: state.links }, null, 2), { mode: 0o600 });
  } catch (err) {
    record('Exécution', false, err.stack || err.message);
  } finally {
    await browser.close();
    const failed = results.filter((r) => !r.ok);
    fs.writeFileSync(path.join(OUT, 'resultats.json'), JSON.stringify({ date: new Date().toISOString(), total: results.length, echecs: failed.length, results }, null, 2));
    console.log(`\n${results.length - failed.length}/${results.length} contrôles réussis`);
    process.exit(failed.length ? 1 : 0);
  }
})();
