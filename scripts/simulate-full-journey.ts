/**
 * ============================================================
 *  🎬  SIMULATION COMPLÈTE — OWEKE / BOLIGO
 *  Parcours : Inscription → Vérification → Matching → Vidéo
 * ============================================================
 *
 * Usage :
 *   cd backend
 *   npx ts-node scripts/simulate-full-journey.ts
 *
 * Prérequis :
 *   - Backend démarré sur http://localhost:3000
 *   - Base de données accessible (DATABASE_URL dans .env)
 */

import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:3000';
const DELAY_BETWEEN_STEPS = 800; // ms entre chaque step

// ─── COULEURS CONSOLE ──────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgMagenta: '\x1b[45m',
};

// ─── LOGGER ───────────────────────────────────────────────────────────────
const timestamp = () => new Date().toISOString().replace('T', ' ').split('.')[0];

function logSection(title: string) {
  const line = '═'.repeat(60);
  console.log(`\n${C.cyan}${C.bold}${line}`);
  console.log(`  ${title}`);
  console.log(`${line}${C.reset}\n`);
}

function logStep(icon: string, label: string, detail?: string) {
  const ts = `${C.dim}[${timestamp()}]${C.reset}`;
  console.log(`${ts} ${icon}  ${C.bold}${label}${C.reset}${detail ? `  ${C.dim}${detail}${C.reset}` : ''}`);
}

function logRequest(method: string, path: string, body?: object) {
  console.log(`    ${C.blue}➤ ${method.toUpperCase()} ${path}${C.reset}`);
  if (body) {
    const bodyStr = JSON.stringify(body, null, 2)
      .split('\n')
      .map(l => `       ${C.dim}${l}${C.reset}`)
      .join('\n');
    console.log(bodyStr);
  }
}

function logResponse(status: number, data: any) {
  const color = status >= 200 && status < 300 ? C.green : C.red;
  const icon = status >= 200 && status < 300 ? '✅' : '❌';
  console.log(`    ${color}${icon} HTTP ${status}${C.reset}`);
  const preview = JSON.stringify(data)?.slice(0, 200);
  console.log(`    ${C.dim}${preview}${(preview?.length ?? 0) >= 200 ? '...' : ''}${C.reset}`);
}

function logError(label: string, err: any) {
  console.log(`    ${C.red}${C.bold}✖ ERREUR: ${label}${C.reset}`);
  console.log(`    ${C.red}${err?.message || err}${C.reset}`);
}

function logSuccess(message: string) {
  console.log(`    ${C.green}${C.bold}✔ ${message}${C.reset}`);
}

function logInfo(message: string) {
  console.log(`    ${C.yellow}ℹ ${message}${C.reset}`);
}

// ─── HTTP CLIENT ──────────────────────────────────────────────────────────
function request(
  method: string,
  path: string,
  body?: object,
  token?: string,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const bodyStr = body ? JSON.stringify(body) : undefined;

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: parseInt(url.port || '3000'),
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let data: any;
        try { data = JSON.parse(raw); } catch { data = raw; }
        resolve({ status: res.statusCode || 0, data });
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── UTILS ────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function randomSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

// ─── PROFILS TEST ─────────────────────────────────────────────────────────
function buildProfile(prenom: string, genre: 'MALE' | 'FEMALE') {
  const suffix = randomSuffix();
  return {
    email: `${prenom.toLowerCase()}.${suffix}@oweke-test.fr`,
    password: 'Test1234!',
    firstName: prenom,
    lastName: 'TestUser',
    birthDate: '1995-06-15',
    gender: genre,
    city: 'Paris (75011)',
    telephone: `06${Math.floor(10000000 + Math.random() * 89999999)}`,
    profession: 'Développeur',
  };
}

// ─── ÉTAPES ───────────────────────────────────────────────────────────────

async function etape_inscription(profile: ReturnType<typeof buildProfile>, label: string) {
  logStep('📝', `Inscription de ${label}`, profile.email);
  logRequest('POST', '/auth/register', { ...profile, password: '***masqué***' });

  const res = await request('POST', '/auth/register', profile);
  logResponse(res.status, res.data);

  if (res.status !== 201) {
    throw new Error(`Inscription ${label} échouée: ${JSON.stringify(res.data)}`);
  }

  logSuccess(`Compte ${label} créé ! Code de vérification envoyé par email.`);
  logInfo(`userId: ${res.data.userId || '(dans la réponse ci-dessus)'}`);
  return res.data;
}

async function etape_login(email: string, password: string, label: string) {
  logStep('🔐', `Connexion de ${label}`, email);
  logRequest('POST', '/auth/login', { email, password: '***' });

  const res = await request('POST', '/auth/login', { email, password });
  logResponse(res.status, res.data);

  if (res.status !== 200) {
    throw new Error(`Login ${label} échoué: ${JSON.stringify(res.data)}`);
  }

  logSuccess(`${label} connecté ! Token JWT valide 7 jours.`);
  return res.data;
}

async function etape_profil_utilisateur(token: string, label: string) {
  logStep('👤', `Récupération profil de ${label}`);
  logRequest('GET', '/profile/me');

  const res = await request('GET', '/profile/me', undefined, token);
  logResponse(res.status, res.data);

  if (res.status === 200) {
    logSuccess(`Profil de ${label} chargé`);
    logInfo(`Étape entretien: ${res.data?.interview?.status || 'inconnu'}`);
  }
  return res.data;
}

async function etape_decouverte_profils(token: string, label: string) {
  logStep('🔍', `${label} découvre des profils`);
  logRequest('GET', '/matching/discover');

  const res = await request('GET', '/matching/discover', undefined, token);
  logResponse(res.status, res.data);

  const profiles = Array.isArray(res.data) ? res.data : res.data?.profiles || [];
  logSuccess(`${profiles.length} profils disponibles pour ${label}`);
  return profiles;
}

async function etape_like(tokenA: string, targetUserId: string, labelA: string, labelB: string) {
  logStep('❤️', `${labelA} envoie un like à ${labelB}`, `targetId: ${targetUserId}`);
  logRequest('POST', '/matching/connect', { targetUserId });

  const res = await request('POST', '/matching/connect', { targetUserId }, tokenA);
  logResponse(res.status, res.data);

  if (res.status === 200 || res.status === 201) {
    logSuccess(`Like envoyé par ${labelA} → ${labelB}`);
  }
  return res.data;
}

async function etape_voir_likes_recus(tokenB: string, labelB: string) {
  logStep('💌', `${labelB} consulte ses likes reçus`);
  logRequest('GET', '/matching/received-likes');

  const res = await request('GET', '/matching/received-likes', undefined, tokenB);
  logResponse(res.status, res.data);

  const likes = Array.isArray(res.data) ? res.data : res.data?.likes || [];
  logSuccess(`${labelB} a ${likes.length} like(s) reçu(s)`);
  return likes;
}

async function etape_accepter_match(tokenB: string, proposalId: string, labelB: string, labelA: string) {
  logStep('✅', `${labelB} accepte le match de ${labelA}`, `proposalId: ${proposalId}`);
  logRequest('POST', '/matching/accept', { proposalId });

  const res = await request('POST', '/matching/accept', { proposalId }, tokenB);
  logResponse(res.status, res.data);

  if (res.status === 200 || res.status === 201) {
    logSuccess(`MATCH créé entre ${labelA} et ${labelB} ! 🎉`);
    logInfo(`Journey ID: ${res.data?.journeyId || res.data?.journey?.id}`);
  }
  return res.data;
}

async function etape_statut_journey(journeyId: string, token: string, label: string) {
  logStep('🗺️', `Statut du parcours pour ${label}`, `journeyId: ${journeyId}`);
  logRequest('GET', `/journey/${journeyId}/status`);

  const res = await request('GET', `/journey/${journeyId}/status`, undefined, token);
  logResponse(res.status, res.data);

  if (res.status === 200) {
    logInfo(`Étape actuelle: ${C.magenta}${res.data?.currentStep}${C.reset}`);
  }
  return res.data;
}

async function etape_envoyer_message(journeyId: string, token: string, content: string, label: string) {
  logStep('💬', `${label} envoie un message`, `"${content}"`);
  logRequest('POST', '/journey/message', { journeyId, content, type: 'texte' });

  const res = await request('POST', '/journey/message', { journeyId, content, type: 'texte' }, token);
  logResponse(res.status, res.data);

  if (res.status === 200 || res.status === 201) {
    logSuccess(`Message de ${label} envoyé`);
  }
  return res.data;
}

async function etape_avancer_etape(journeyId: string, token: string, step: string, label: string) {
  logStep('⏭️', `${label} avance vers l'étape: ${step}`, `journeyId: ${journeyId}`);
  logRequest('PATCH', `/journey/${journeyId}/advance`, { step });

  const res = await request('PATCH', `/journey/${journeyId}/advance`, { step }, token);
  logResponse(res.status, res.data);

  if (res.status === 200 || res.status === 201) {
    logSuccess(`Étape avancée vers "${step}"`);
  }
  return res.data;
}

async function etape_session_video(journeyId: string, token: string, label: string) {
  logStep('🎥', `${label} vérifie la session vidéo`, `journeyId: ${journeyId}`);
  logRequest('GET', `/journey/${journeyId}/video/session`);

  const res = await request('GET', `/journey/${journeyId}/video/session`, undefined, token);
  logResponse(res.status, res.data);

  logInfo(`Peut rejoindre: ${res.data?.canJoin ? '✅ OUI' : '❌ NON'}`);
  logInfo(`Étape courante: ${res.data?.currentStep}`);
  return res.data;
}

async function etape_rejoindre_appel(journeyId: string, token: string, label: string) {
  logStep('📹', `${label} REJOINT L'APPEL VIDÉO !`, `journeyId: ${journeyId}`);
  logRequest('POST', `/journey/${journeyId}/video/join`);

  const res = await request('POST', `/journey/${journeyId}/video/join`, {}, token);
  logResponse(res.status, res.data);

  if (res.status === 200 || res.status === 201) {
    logSuccess(`${label} a rejoint l'appel vidéo !`);
    logInfo(`Provider: ${res.data?.provider}`);
    logInfo(`Partenaire: ${res.data?.partnerName}`);
    logInfo(`Durée max: ${res.data?.maxDurationSec}s (${Math.ceil((res.data?.maxDurationSec || 120) / 60)} min)`);
    console.log(`\n    ${C.bgMagenta}${C.white}${C.bold}  🔗 URL: ${res.data?.meetingUrl}  ${C.reset}\n`);
  }
  return res.data;
}

async function etape_terminer_appel(journeyId: string, token: string, durationSec: number, label: string) {
  logStep('🔚', `${label} termine l'appel vidéo`, `durée: ${durationSec}s`);
  logRequest('POST', `/journey/${journeyId}/video/end`, { durationSec });

  const res = await request('POST', `/journey/${journeyId}/video/end`, { durationSec }, token);
  logResponse(res.status, res.data);

  if (res.status === 200 || res.status === 201) {
    logSuccess(`Appel terminé. Étape avancée: ${res.data?.currentStep}`);
  }
  return res.data;
}

// ─── FLUX PRINCIPAL ──────────────────────────────────────────────────────

async function runSimulation() {
  console.clear();

  console.log(`
${C.magenta}${C.bold}
  ██████╗ ██╗    ██╗███████╗██╗  ██╗███████╗
 ██╔═══██╗██║    ██║██╔════╝██║ ██╔╝██╔════╝
 ██║   ██║██║ █╗ ██║█████╗  █████╔╝ █████╗  
 ██║   ██║██║███╗██║██╔══╝  ██╔═██╗ ██╔══╝  
 ╚██████╔╝╚███╔███╔╝███████╗██║  ██╗███████╗
  ╚═════╝  ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝╚══════╝
  
  🎬 SIMULATION COMPLÈTE DU PARCOURS UTILISATEUR
  Inscription → Vérification → Matching → Appel Vidéo
${C.reset}
  `);

  logInfo(`Backend cible: ${BASE_URL}`);
  logInfo(`Heure début:   ${timestamp()}`);

  const profil_camille = buildProfile('Camille', 'FEMALE');
  const profil_maxime  = buildProfile('Maxime', 'MALE');

  let tokenCamille: string | undefined;
  let tokenMaxime: string | undefined;
  let userIdCamille: string | undefined;
  let userIdMaxime: string | undefined;
  let journeyId: string | undefined;

  // ─────────────────────────────────────────────────────────────────────
  logSection('ÉTAPE 1 ─ CRÉATION DES 2 COMPTES');
  // ─────────────────────────────────────────────────────────────────────
  try {
    await etape_inscription(profil_camille, 'Camille');
    await sleep(DELAY_BETWEEN_STEPS);
    await etape_inscription(profil_maxime, 'Maxime');
    await sleep(DELAY_BETWEEN_STEPS);

    // ─────────────────────────────────────────────────────────────────
    logSection('ÉTAPE 2 ─ CONNEXION (JWT)');
    // ─────────────────────────────────────────────────────────────────
    const loginC = await etape_login(profil_camille.email, profil_camille.password, 'Camille');
    await sleep(DELAY_BETWEEN_STEPS);

    const loginM = await etape_login(profil_maxime.email, profil_maxime.password, 'Maxime');
    await sleep(DELAY_BETWEEN_STEPS);

    tokenCamille   = loginC.accessToken;
    tokenMaxime    = loginM.accessToken;
    userIdCamille  = loginC.userId || loginC.user?.id;
    userIdMaxime   = loginM.userId || loginM.user?.id;

    if (!tokenCamille || !tokenMaxime) {
      throw new Error('Tokens JWT manquants dans la réponse login');
    }

  } catch (err: any) {
    logError('Phase Inscription/Login', err);
    logInfo('→ Si les comptes nécessitent une vérification email, récupérez les codes');
    logInfo('  dans les logs du backend (console.log verificationCode)');
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────
  logSection('ÉTAPE 3 ─ SAISIE DES INFORMATIONS (Profil)');
  // ─────────────────────────────────────────────────────────────────────
  await etape_profil_utilisateur(tokenCamille!, 'Camille').catch(e => logError('Profil Camille', e));
  await sleep(DELAY_BETWEEN_STEPS);
  await etape_profil_utilisateur(tokenMaxime!, 'Maxime').catch(e => logError('Profil Maxime', e));
  await sleep(DELAY_BETWEEN_STEPS);

  // ─────────────────────────────────────────────────────────────────────
  logSection('ÉTAPE 4 ─ DÉCOUVERTE DE PROFILS');
  // ─────────────────────────────────────────────────────────────────────
  const profilesVusByCamille = await etape_decouverte_profils(tokenCamille!, 'Camille');
  await sleep(DELAY_BETWEEN_STEPS);

  let targetIdForCamille = userIdMaxime;
  if (!targetIdForCamille && profilesVusByCamille.length > 0) {
    targetIdForCamille = profilesVusByCamille[0]?.id || profilesVusByCamille[0]?.userId;
    logInfo(`Camille cible le premier profil: ${targetIdForCamille}`);
  }

  if (!targetIdForCamille) {
    logError('Matching', 'Impossible de trouver un profil cible pour Camille');
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────
  logSection('ÉTAPE 5 ─ LIKE & ACCEPTATION DU MATCH');
  // ─────────────────────────────────────────────────────────────────────
  await etape_like(tokenCamille!, targetIdForCamille, 'Camille', 'Maxime');
  await sleep(DELAY_BETWEEN_STEPS);

  const likesRecus = await etape_voir_likes_recus(tokenMaxime!, 'Maxime');
  await sleep(DELAY_BETWEEN_STEPS);

  const proposalId = likesRecus[0]?.id || likesRecus[0]?.proposalId;

  if (!proposalId) {
    logError('Accept Match', 'Aucun proposalId trouvé dans les likes reçus');
    logInfo(`Likes reçus: ${JSON.stringify(likesRecus?.slice(0, 2))}`);
    process.exit(1);
  }

  const matchResult = await etape_accepter_match(tokenMaxime!, proposalId, 'Maxime', 'Camille');
  await sleep(DELAY_BETWEEN_STEPS);

  journeyId = matchResult?.journeyId || matchResult?.journey?.id;
  if (!journeyId) {
    logError('Journey', 'journeyId non trouvé dans la réponse du match');
    logInfo(`Réponse complète: ${JSON.stringify(matchResult)}`);
    process.exit(1);
  }

  logSuccess(`Journey créé ! ID: ${journeyId}`);

  // ─────────────────────────────────────────────────────────────────────
  logSection('ÉTAPE 6 ─ CHAT / MESSAGES');
  // ─────────────────────────────────────────────────────────────────────
  await etape_statut_journey(journeyId, tokenCamille!, 'Camille');
  await sleep(DELAY_BETWEEN_STEPS);

  await etape_envoyer_message(journeyId, tokenCamille!, 'Salut Maxime ! Ravi de faire ta connaissance 😊', 'Camille');
  await sleep(DELAY_BETWEEN_STEPS);

  await etape_envoyer_message(journeyId, tokenMaxime!, 'Bonjour Camille ! Pareil, hâte de te connaître !', 'Maxime');
  await sleep(DELAY_BETWEEN_STEPS);

  await etape_envoyer_message(journeyId, tokenCamille!, 'Tu fais quoi dans la vie ?', 'Camille');
  await sleep(DELAY_BETWEEN_STEPS);

  await etape_envoyer_message(journeyId, tokenMaxime!, 'Développeur ! Et toi ?', 'Maxime');
  await sleep(DELAY_BETWEEN_STEPS);

  // ─────────────────────────────────────────────────────────────────────
  logSection('ÉTAPE 7 ─ AVANCEMENT VERS LA VIDÉO');
  // ─────────────────────────────────────────────────────────────────────
  logInfo('VIDEO_TEST_UNLOCK=true → appel vidéo débloqué depuis la phase chat_libre');

  const statusAvant = await etape_statut_journey(journeyId, tokenCamille!, 'Camille');
  const currentStep = statusAvant?.currentStep;
  logInfo(`Étape actuelle: ${currentStep}`);
  await sleep(DELAY_BETWEEN_STEPS);

  if (currentStep && currentStep !== 'video' && currentStep !== 'chat_libre') {
    await etape_avancer_etape(journeyId, tokenCamille!, 'chat_libre', 'Camille (test mode)');
    await sleep(DELAY_BETWEEN_STEPS);
  }

  // ─────────────────────────────────────────────────────────────────────
  logSection('ÉTAPE 8 ─ APPEL VIDÉO 🎥');
  // ─────────────────────────────────────────────────────────────────────
  await etape_session_video(journeyId, tokenCamille!, 'Camille');
  await sleep(DELAY_BETWEEN_STEPS);

  await etape_session_video(journeyId, tokenMaxime!, 'Maxime');
  await sleep(DELAY_BETWEEN_STEPS);

  logStep('📡', 'Camille initie l\'appel vidéo...');
  await sleep(500);
  await etape_rejoindre_appel(journeyId, tokenCamille!, 'Camille');
  await sleep(DELAY_BETWEEN_STEPS);

  logStep('📡', 'Maxime reçoit la notification et rejoint l\'appel...');
  await sleep(800);
  await etape_rejoindre_appel(journeyId, tokenMaxime!, 'Maxime');
  await sleep(DELAY_BETWEEN_STEPS);

  // Simuler 90 secondes d'appel
  logStep('⏱️', 'Appel en cours... (90 secondes simulées)');
  logInfo('Les deux participants sont dans le call vidéo ensemble');
  await sleep(2000);

  await etape_terminer_appel(journeyId, tokenCamille!, 90, 'Camille');
  await sleep(DELAY_BETWEEN_STEPS);

  // ─────────────────────────────────────────────────────────────────────
  logSection('RÉSUMÉ FINAL');
  // ─────────────────────────────────────────────────────────────────────
  const statusFinal = await etape_statut_journey(journeyId, tokenCamille!, 'Camille (post-vidéo)');

  console.log(`
${C.green}${C.bold}
  ╔═══════════════════════════════════════════════════════════╗
  ║       🎉  SIMULATION TERMINÉE AVEC SUCCÈS  🎉            ║
  ╚═══════════════════════════════════════════════════════════╝
${C.reset}
  ${C.bold}Résumé du parcours:${C.reset}

  👩 Camille  →  Email: ${C.cyan}${profil_camille.email}${C.reset}
  👨 Maxime   →  Email: ${C.cyan}${profil_maxime.email}${C.reset}
  
  🗺️  Journey ID:   ${C.yellow}${journeyId}${C.reset}
  📍 Étape finale: ${C.magenta}${statusFinal?.currentStep || 'echange_contacts'}${C.reset}

  Parcours complet simulé:
  ${C.green}✔${C.reset} [ÉTAPE 1] Inscription Camille & Maxime
  ${C.green}✔${C.reset} [ÉTAPE 2] Connexion & JWT Tokens
  ${C.green}✔${C.reset} [ÉTAPE 3] Chargement des profils
  ${C.green}✔${C.reset} [ÉTAPE 4] Découverte de profils
  ${C.green}✔${C.reset} [ÉTAPE 5] Like + Acceptation du match
  ${C.green}✔${C.reset} [ÉTAPE 6] Chat / Messages (×4)
  ${C.green}✔${C.reset} [ÉTAPE 7] Vérification session vidéo
  ${C.green}✔${C.reset} [ÉTAPE 8] Appel vidéo (join × 2 → fin d'appel)
  ${C.green}✔${C.reset}           Étape suivante: ${statusFinal?.currentStep || 'echange_contacts'}

  ${C.dim}Heure fin: ${timestamp()}${C.reset}
  `);
}

// ─── LANCEMENT ────────────────────────────────────────────────────────────
runSimulation().catch((err) => {
  console.error(`\n${C.red}${C.bold}💥 ERREUR FATALE:${C.reset} ${err.message || err}`);
  process.exit(1);
});
