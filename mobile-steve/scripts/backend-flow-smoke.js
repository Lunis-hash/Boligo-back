/* eslint-disable no-console */
/**
 * Recette API bout en bout contre un backend BOLIGO (local ou de test).
 *
 * Usage : API_URL=http://localhost:3000/api node scripts/backend-flow-smoke.js
 *
 * Crée deux comptes jetables (préfixe steve-smoke-<timestamp>), déroule
 * inscription → OTP → entretien 11 modules → découverte → like → match →
 * Sondeur (21 questions × 2) → chat → vidéo → échange de contacts, puis
 * vérifie les cas d'erreur (401/400/409) et le temps réel Socket.IO.
 * Ne jamais lancer contre la production.
 */
const API = process.env.API_URL || 'http://localhost:3000/api';
const SOCKET_URL = API.replace(/\/api\/?$/, '');
const { io } = require('socket.io-client');
const { execSync } = require('child_process');
// Commande psql vers la base de TEST (jamais la production) pour simuler le passage des jours du Sondeur.
const E2E_PSQL = process.env.E2E_PSQL || '';

const results = [];
function record(step, ok, detail = '') {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`);
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function registerAndVerify(tag, gender) {
  const email = `steve-smoke-${tag}-${Date.now()}@example.test`;
  const reg = await call('POST', '/auth/register', {
    body: {
      email, password: 'Password12!', firstName: tag, lastName: 'Test',
      birthDate: '1994-05-20T00:00:00.000Z', gender, city: 'Paris, France',
      telephone: `+3361${Math.floor(Math.random() * 1e7)}`, job: 'Testeur', meetingScope: 'international',
      acceptTerms: true, termsVersion: '2026-10-02',
    },
  });
  record(`register ${tag}`, reg.status === 201, `status ${reg.status}, otpDebugCode présent=${!!reg.data?.otpDebugCode}`);
  const ver = await call('POST', '/auth/verify-email', { body: { email, code: '1234' } });
  record(`verify-email ${tag} (code passe-partout 1234)`, ver.status === 200 && !!ver.data?.access_token, `status ${ver.status}`);
  return { email, token: ver.data.access_token, refresh: ver.data.refresh_token, userId: ver.data.userId };
}

async function completeInterview(user) {
  const st = await call('GET', '/interview/status', { token: user.token });
  record(`interview/status ${user.email.split('-')[2]}`, st.status === 200 && st.data.currentModule === 0, JSON.stringify(st.data));
  for (let m = 0; m <= 10; m++) {
    const q = await call('GET', `/interview/questions/${m}`, { token: user.token });
    const answers = {};
    (q.data || []).forEach((question) => { answers[question.id] = question.options[0]?.key || 'A'; });
    const save = await call('POST', '/interview/save-module', { token: user.token, body: { moduleNumber: m, moduleName: `Module ${m}`, answers } });
    if (save.status !== 201 || !save.data?.success) record(`save-module ${m}`, false, `status ${save.status} ${JSON.stringify(save.data)}`);
    if (m === 10) record('interview terminé (allModulesCompleted)', save.data?.allModulesCompleted === true, JSON.stringify(save.data));
  }
  const summary = await call('GET', '/interview/summary', { token: user.token });
  record('interview/summary', summary.status === 200 && Array.isArray(summary.data?.pillars), `maturity=${summary.data?.maturityScore} pillars=${summary.data?.pillars?.length}`);
  const st2 = await call('GET', '/interview/status', { token: user.token });
  record('interview/status après complétion', st2.data?.isCompleted === true, JSON.stringify(st2.data));
}

function waitFor(socket, event, ms = 4000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload) => { clearTimeout(t); resolve(payload); });
  });
}

(async () => {
  console.log(`API = ${API}`);
  const A = await registerAndVerify('alice', 'F');
  const B = await registerAndVerify('bob', 'H');

  // ── Erreurs d'authentification
  const badPwd = await call('POST', '/auth/login', { body: { email: A.email, password: 'wrong-pass' } });
  record('login mauvais mot de passe → 401', badPwd.status === 401, `status ${badPwd.status}`);
  const badMail = await call('POST', '/auth/login', { body: { email: 'nobody@example.test', password: 'Password12!' } });
  record('login utilisateur inexistant → 401', badMail.status === 401, `status ${badMail.status}`);
  const noToken = await call('GET', '/profile/me');
  record('route protégée sans token → 401', noToken.status === 401, `status ${noToken.status}`);
  const badToken = await call('GET', '/profile/me', { token: 'invalid.token.here' });
  record('route protégée token invalide → 401', badToken.status === 401, `status ${badToken.status}`);
  const badRefresh = await call('POST', '/auth/refresh', { body: { refreshToken: 'bad' } });
  record('refresh token invalide → 401', badRefresh.status === 401, `status ${badRefresh.status}`);
  const goodRefresh = await call('POST', '/auth/refresh', { body: { refreshToken: A.refresh } });
  record('refresh token valide → nouveaux tokens', goodRefresh.status === 200 && !!goodRefresh.data?.access_token, `status ${goodRefresh.status}`);
  if (goodRefresh.data?.access_token) { A.token = goodRefresh.data.access_token; A.refresh = goodRefresh.data.refresh_token; }
  const dup = await call('POST', '/auth/register', { body: { email: A.email, password: 'Password12!', firstName: 'X', birthDate: '1994-05-20', gender: 'F', acceptTerms: true } });
  record('register email déjà utilisé → 409', dup.status === 409, `status ${dup.status}`);
  const minor = await call('POST', '/auth/register', { body: { email: `minor-${Date.now()}@example.test`, password: 'Password12!', firstName: 'X', birthDate: '2015-05-20', gender: 'F', acceptTerms: true } });
  const noTerms = await call('POST', '/auth/register', { body: { email: `noterms-${Date.now()}@example.test`, password: 'Password12!', firstName: 'X', birthDate: '1994-05-20', gender: 'F' } });
  record('register sans acceptation des CGU → 400', noTerms.status === 400, `status ${noTerms.status}`);
  record('register mineur → 400', minor.status === 400, `status ${minor.status}`);
  const login = await call('POST', '/auth/login', { body: { email: A.email, password: 'Password12!' } });
  record('login valide → 200 + tokens', login.status === 200 && !!login.data?.access_token, `status ${login.status}`);

  // ── Profil
  const me = await call('GET', '/profile/me', { token: A.token });
  record('profile/me', me.status === 200 && me.data?.user?.email === A.email, `creditBalance=${me.data?.user?.creditBalance}`);
  const patch = await call('PATCH', '/profile/me', { token: A.token, body: { profession: 'Ingénieure', description: 'Bio de test', displayedCity: 'Lyon' } });
  record('PATCH profile/me', patch.status === 200 && patch.data?.profession === 'Ingénieure', `status ${patch.status}`);
  const badPatch = await call('PATCH', '/profile/me', { token: A.token, body: { profession: 'X', unknownField: 1 } });
  record('PATCH profile/me champ inconnu / profession trop courte → 400', badPatch.status === 400, `status ${badPatch.status} ${JSON.stringify(badPatch.data?.message).slice(0, 80)}`);

  // ── Entretien
  await completeInterview(A);
  await completeInterview(B);

  // ── Découverte & match
  const disc = await call('GET', '/matching/discover', { token: A.token });
  record('discover (A voit B)', disc.status === 200 && disc.data.some((p) => p.id === B.userId), `profils=${disc.data?.length}`);
  const noCredit = await call('POST', '/matching/connect', { token: A.token, body: { targetUserId: B.userId } });
  record('connect sans crédit → refus NO_CREDIT', noCredit.data?.success === false && noCredit.data?.code === 'NO_CREDIT', JSON.stringify(noCredit.data?.message));
  // Les codes promo n'existent qu'en base : code gratuit de test (base de TEST uniquement).
  const promoCode = `SMOKE${Date.now().toString(36).toUpperCase()}`;
  if (E2E_PSQL) {
    execSync(E2E_PSQL, { input: `INSERT INTO "PromoCode" (id, code, "discountType", "discountValue", "maxUses", "isActive") VALUES (gen_random_uuid()::text, '${promoCode}', 'free', 0, 5, true);`, stdio: ['pipe', 'ignore', 'inherit'] });
  }
  for (const user of [A, B]) {
    const promo = await call('POST', '/payment/apply-promo', { token: user.token, body: { code: promoCode, optionId: 'parcours_harmonie' } });
    record(`code promo gratuit → 1 crédit (${user.email.split('-')[2]})`, promo.status === 201 && promo.data?.isFree === true, `status ${promo.status}`);
  }
  const promoAgain = await call('POST', '/payment/apply-promo', { token: A.token, body: { code: promoCode, optionId: 'parcours_harmonie' } });
  record('même code promo une 2e fois → 400', promoAgain.status === 400, `status ${promoAgain.status}`);
  const legacyPromo = await call('POST', '/payment/apply-promo', { token: A.token, body: { code: 'BOLIGO100', optionId: 'parcours_harmonie' } });
  record('ancien code « en dur » absent de la base → 400', legacyPromo.status === 400, `status ${legacyPromo.status}`);
  const balanceBefore = await call('GET', '/credit/balance', { token: A.token });
  const connect = await call('POST', '/matching/connect', { token: A.token, body: { targetUserId: B.userId } });
  record('connect A→B (like)', connect.status === 201 && connect.data?.success === true, JSON.stringify(connect.data?.message));
  const balanceAfter = await call('GET', '/credit/balance', { token: A.token });
  record('connect débite 1 crédit côté serveur', balanceBefore.data?.credits === 1 && balanceAfter.data?.credits === 0, `avant=${balanceBefore.data?.credits} après=${balanceAfter.data?.credits}`);
  const disc2 = await call('GET', '/matching/discover', { token: A.token });
  record('discover bloqué pendant invitation en attente', disc2.data?.length === 0, `profils=${disc2.data?.length}`);
  const likes = await call('GET', '/matching/received-likes', { token: B.token });
  record('received-likes B', likes.status === 200 && likes.data.length === 1, `likes=${likes.data?.length}`);
  const accept = await call('POST', '/matching/accept', { token: B.token, body: { proposalId: likes.data[0].id } });
  record('accept B', accept.status === 201 && accept.data?.success === true && !!accept.data?.journey?.id, JSON.stringify(accept.data?.message));
  const journeyId = accept.data.journey.id;
  const balanceB = await call('GET', '/credit/balance', { token: B.token });
  record('accept débite 1 crédit à B côté serveur', balanceB.data?.credits === 0, `solde=${balanceB.data?.credits}`);
  const myMatches = await call('GET', '/matching/my-matches', { token: A.token });
  record('my-matches A → phase sondeur + journeyId', myMatches.data?.[0]?.phase === 'sondeur' && myMatches.data?.[0]?.journeyId === journeyId, JSON.stringify({ phase: myMatches.data?.[0]?.phase, videoEnabled: myMatches.data?.[0]?.videoEnabled }));

  // ── Sondeur (phase harmonie)
  const qs = await call('GET', `/journey/${journeyId}/questions`, { token: A.token });
  record('journey questions (21 attendues)', qs.status === 200 && qs.data.length === 21, `questions=${qs.data?.length} jours=${[...new Set((qs.data || []).map((q) => q.day))].join(',')}`);
  const progress = await call('GET', '/journey/sondeur-progress', { token: A.token });
  record('sondeur-progress', progress.status === 200 && progress.data?.totalQuestions === 21, JSON.stringify(progress.data));
  const moderated = await call('POST', '/journey/respond', { token: A.token, body: { questionId: qs.data[0].id, text: 'putain de question' } });
  record('respond avec grossièreté → 400 (modération locale)', moderated.status === 400, `status ${moderated.status}`);
  const byDay = (d) => (qs.data || []).filter((q) => q.day === d);
  record(
    'Sondeur : 3 jours × 7 questions, 7 thèmes fondamentaux chaque jour',
    [1, 2, 3].every((d) => byDay(d).length === 7 && new Set(byDay(d).map((q) => q.emoji)).size === 7),
    `jours=${[1, 2, 3].map((d) => byDay(d).length).join('/')} emojis=${[...new Set((qs.data || []).map((q) => q.emoji))].join('')}`,
  );
  const early = await call('POST', '/journey/respond', { token: A.token, body: { questionId: byDay(2)[0]?.id, text: 'Réponse trop tôt' } });
  record('respond à une question du jour 2 pendant le jour 1 → 400 (règle 7/jour côté serveur)', early.status === 400, `status ${early.status}`);
  for (let day = 1; day <= 3; day++) {
    for (const user of [A, B]) {
      for (const q of byDay(day)) {
        const r = await call('POST', '/journey/respond', { token: user.token, body: { questionId: q.id, text: `Réponse sincère de ${user.email.split('-')[2]}` } });
        if (r.status !== 201) record(`respond jour ${day} ${q.id}`, false, `status ${r.status}`);
      }
    }
    if (day < 3) {
      if (!E2E_PSQL) { record('Voyage dans le temps impossible (E2E_PSQL non défini) : jours 2 et 3 non rejoués', false); break; }
      execSync(E2E_PSQL, { input: `UPDATE "Journey" SET "stepStartDate" = "stepStartDate" - interval '1 day' WHERE id = '${journeyId}';`, stdio: ['pipe', 'ignore', 'inherit'] });
    }
  }
  const dupAnswer = await call('POST', '/journey/respond', { token: A.token, body: { questionId: byDay(1)[0]?.id, text: 'Deuxième réponse' } });
  record('respond deux fois à la même question → 400', dupAnswer.status === 400, `status ${dupAnswer.status}`);
  const status = await call('GET', `/journey/${journeyId}/status`, { token: A.token });
  record('journey passe en chat_libre après 21 réponses × 2', status.data?.currentStep === 'chat_libre', JSON.stringify(status.data));
  const access = await call('GET', '/journey/chat-access', { token: A.token });
  record('chat-access A → canAccess', access.data?.canAccess === true, JSON.stringify(access.data));

  // ── Chat HTTP + WebSocket
  const noAuthSocket = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
  const disconnected = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), 3000);
    noAuthSocket.on('disconnect', () => { clearTimeout(t); resolve(true); });
    noAuthSocket.on('connect_error', () => { clearTimeout(t); resolve(true); });
  });
  record('socket sans JWT → déconnecté par le serveur', disconnected, '');
  noAuthSocket.close();

  const socketB = io(SOCKET_URL, { transports: ['websocket'], auth: { token: B.token } });
  const connectedB = await new Promise((resolve) => { const t = setTimeout(() => resolve(false), 4000); socketB.on('connect', () => { clearTimeout(t); resolve(true); }); });
  record('socket avec JWT (B) → connecté', connectedB, socketB.id || '');
  socketB.emit('joinJourney', { journeyId });
  const history = await waitFor(socketB, 'messageHistory');
  record('joinJourney → messageHistory reçu', Array.isArray(history), `messages=${history?.length}`);
  const newMsgPromise = waitFor(socketB, 'newMessage', 5000);
  const sent = await call('POST', '/journey/message', { token: A.token, body: { journeyId, content: 'Bonjour Bob, ravie de te parler !', type: 'texte' } });
  record('POST journey/message (A)', sent.status === 201 && sent.data?.id, `status ${sent.status}`);
  const newMsg = await newMsgPromise;
  record('B reçoit newMessage en temps réel', newMsg?.id === sent.data?.id, JSON.stringify(newMsg?.content));
  const insult = await call('POST', '/journey/message', { token: A.token, body: { journeyId, content: 'ferme la connard', type: 'texte' } });
  record('message insultant → 400', insult.status === 400, `status ${insult.status}`);
  const msgs = await call('GET', `/journey/${journeyId}/messages`, { token: B.token });
  record('GET journey messages (B)', msgs.status === 200 && msgs.data.length === 1, `messages=${msgs.data?.length}`);
  // B est connecté au salon : ses messages sont marqués lus à la réception. Le compteur
  // de non-lus se mesure donc côté A (sans socket) après un message de B.
  await call('POST', '/journey/message', { token: B.token, body: { journeyId, content: 'Message de Bob pour tester les non-lus.', type: 'texte' } });
  const unread = await call('GET', '/chat/unread-count', { token: A.token });
  record('chat/unread-count A après un message de B (attendu 1)', unread.data === 1, `reçu=${JSON.stringify(unread.data)}`);
  const markRead = await call('POST', `/chat/journeys/${journeyId}/read`, { token: A.token });
  const unreadAfter = await call('GET', '/chat/unread-count', { token: A.token });
  record('chat/journeys/:id/read → compteur à 0', markRead.status < 300 && unreadAfter.data === 0, `status ${markRead.status}, reçu=${JSON.stringify(unreadAfter.data)}`);
  socketB.close();

  // ── Vidéo
  const endEarly = await call('POST', '/video/end', { token: A.token, body: { journeyId, durationSec: 60 } });
  record('video/end pendant le chat (aucun appel) → étape inchangée', endEarly.data?.advanced === false, JSON.stringify(endEarly.data));
  const forced = await call('PATCH', `/journey/${journeyId}/advance`, { token: A.token, body: { step: 'termine' } });
  record('avancement forcé vers « termine » → 400', forced.status === 400, `status ${forced.status}`);
  const exTooEarly = await call('POST', `/journey/${journeyId}/exchange-contact`, { token: A.token, body: { sharePhone: true, shareEmail: true } });
  record('échange de coordonnées avant la vidéo → 400', exTooEarly.status === 400, `status ${exTooEarly.status}`);
  if (E2E_PSQL) {
    // 3 jours de chat écoulés (base de TEST) → étape vidéo au prochain chargement.
    execSync(E2E_PSQL, { input: `UPDATE "Journey" SET "stepStartDate" = now() - interval '3 days 1 hour' WHERE id = '${journeyId}';`, stdio: ['pipe', 'ignore', 'inherit'] });
    await call('GET', '/matching/my-matches', { token: A.token });
  }
  const vs = await call('GET', `/video/session/${journeyId}`, { token: A.token });
  record('video/session canJoin (étape vidéo)', vs.status === 200 && vs.data?.canJoin === true, JSON.stringify({ step: vs.data?.currentStep, canJoin: vs.data?.canJoin, max: vs.data?.maxDurationSec }));
  const tokenCall = await call('POST', '/video/call-token', { token: A.token, body: { journeyId } });
  record('video/call-token → meetingUrl', tokenCall.status === 201 && !!tokenCall.data?.meetingUrl, `provider=${tokenCall.data?.provider}`);
  const endAlone = await call('POST', '/video/end', { token: A.token, body: { journeyId, durationSec: 60 } });
  record('video/end avec un seul membre connecté → étape inchangée', endAlone.data?.advanced === false, JSON.stringify(endAlone.data));
  await call('POST', '/video/call-token', { token: A.token, body: { journeyId } });
  const tokenCallB = await call('POST', '/video/call-token', { token: B.token, body: { journeyId } });
  record('video/call-token B → meetingUrl', tokenCallB.status === 201 && !!tokenCallB.data?.meetingUrl, `provider=${tokenCallB.data?.provider}`);
  if (E2E_PSQL) {
    execSync(E2E_PSQL, { input: `UPDATE "VideoSession" SET "startDate" = now() - interval '90 seconds' WHERE "journeyId" = '${journeyId}';`, stdio: ['pipe', 'ignore', 'inherit'] });
  }
  const endWrong = await call('POST', '/video/end', { token: A.token, body: { callId: journeyId, durationOrReason: 30 } });
  record('video/end sans journeyId → échec attendu', endWrong.status !== 201 || endWrong.data?.advanced !== true, `status ${endWrong.status}`);
  const endOk = await call('POST', '/video/end', { token: A.token, body: { journeyId, durationSec: 30 } });
  record('video/end {journeyId,durationSec} → avance vers echange_contacts', endOk.status === 201 && endOk.data?.currentStep === 'echange_contacts', JSON.stringify(endOk.data));

  // ── Échange de contacts
  const ce0 = await call('GET', `/journey/${journeyId}/contact-exchange`, { token: A.token });
  record('contact-exchange avant consentement ne révèle ni téléphone ni e-mail', ce0.status === 200 && ce0.data?.partner?.telephone == null && ce0.data?.partner?.email == null, JSON.stringify({ myConsent: ce0.data?.myConsent, partnerTel: ce0.data?.partner?.telephone ?? null }));
  const exA = await call('POST', `/journey/${journeyId}/exchange-contact`, { token: A.token, body: { sharePhone: true, shareEmail: true } });
  record('exchange-contact A', exA.status === 201 && exA.data?.consentA === true && exA.data?.bothAccepted === false, JSON.stringify(exA.data));
  const exB = await call('POST', `/journey/${journeyId}/exchange-contact`, { token: B.token, body: { sharePhone: false, shareEmail: true } });
  record('exchange-contact B (e-mail seulement) → bothAccepted, téléphone non partagé', exB.data?.bothAccepted === true && exB.data?.phoneShared === false && exB.data?.emailShared === true, JSON.stringify(exB.data));
  const ce1 = await call('GET', `/journey/${journeyId}/contact-exchange`, { token: A.token });
  record('A voit l\'e-mail de B mais pas son téléphone', !!ce1.data?.partner?.email && ce1.data?.partner?.telephone == null, '');
  const final = await call('GET', `/journey/${journeyId}/status`, { token: A.token });
  record('journey terminé', final.data?.currentStep === 'termine', JSON.stringify(final.data));

  // ── Crédits / paiement
  const plans = await call('GET', '/payment/plans');
  record('payment/plans (1 seul plan côté backend)', plans.status === 200 && plans.data?.plans?.length === 1, plans.data?.plans?.map((p) => `${p.id}=${p.priceDisplay}/${p.credits}cr`).join(' '));
  const premium = await call('POST', '/payment/create-payment-intent', { token: A.token, body: { optionId: 'harmonie_premium' } });
  record('create-payment-intent optionId inconnu (harmonie_premium) → retombe sur 15€/1 crédit (constat)', premium.data?.originalAmount === 1500, JSON.stringify({ status: premium.status, originalAmount: premium.data?.originalAmount, isMock: premium.data?.isMock }));
  const confirm = await call('POST', '/payment/confirm', { token: A.token, body: { paymentIntentId: '../charges' } });
  record('POST payment/confirm référence mal formée → 400', confirm.status === 400, `status ${confirm.status}`);
  const add = await call('POST', '/credit/add', { token: A.token, body: { amount: 2, description: 'self-service' } });
  record('credit/add n\'existe plus → 404', add.status === 404, `status ${add.status}`);
  const spend = await call('POST', '/credit/spend', { token: A.token, body: { amount: 1, description: 'ancienne app' } });
  record('credit/spend ne débite plus rien (débit serveur)', spend.status === 201 && spend.data?.charged === 0, JSON.stringify(spend.data));
  const creditHistory = await call('GET', '/credit/history', { token: A.token });
  record('credit/history (code promo + invitation)', creditHistory.status === 200 && creditHistory.data.length === 2, `transactions=${creditHistory.data?.length}`);

  // ── Divers
  const report = await call('POST', '/report', { token: A.token, body: { reportedUserId: B.userId, reason: 'spam', description: 'test' } });
  record('report utilisateur', report.status === 201 && report.data?.success === true, `status ${report.status}`);
  const push = await call('POST', '/notifications/push-token', { token: A.token, body: { pushToken: 'ExponentPushToken[test]' } });
  record('notifications/push-token', push.status === 201, `status ${push.status}`);
  const idor = await call('GET', `/journey/${journeyId}/messages`, { token: (await registerAndVerify('carol', 'F')).token });
  record('IDOR : un tiers ne lit pas les messages d\'un parcours (403)', idor.status === 403, `status ${idor.status} messages=${Array.isArray(idor.data) ? idor.data.length : '-'}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} étapes OK`);
  if (failed.length) { console.log('Étapes en échec :'); failed.forEach((f) => console.log(' -', f.step, f.detail)); }
  process.exit(0);
})().catch((e) => { console.error('Script error', e); process.exit(1); });
