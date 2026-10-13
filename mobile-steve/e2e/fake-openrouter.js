/* eslint-disable no-console */
/**
 * Faux OpenRouter LOCAL et DÉTERMINISTE pour la recette navigateur (aucun
 * appel réel, aucun coût). Il reconnaît chaque consigne du backend par des
 * marqueurs textuels stables et répond comme le ferait un modèle sage :
 *
 *   - modération            → « aucun danger » ;
 *   - rédaction du Sondeur  → questions valides sur chaque écart réel du jour,
 *                             plus des questions PIÈGES (accord, risque partagé)
 *                             que le contrôle du backend doit rejeter ;
 *   - relecture (critic)    → tout est accepté (le code a déjà filtré) ;
 *   - lecture du jour       → jour 1 : un écart non compris (toDiscuss),
 *                             jours 2 et 3 : écart compris (toDiscuss vide) ;
 *   - fidélité              → {"fidele": true} ;
 *   - relance               → deux propositions sur le thème de l'écart du jour 1 ;
 *   - bilan                 → accords cités mot pour mot, premières questions ;
 *   - tout le reste         → 503 (le backend se replie sur ses gabarits).
 *
 * Il ne juge rien : la qualité réelle se mesure avec de vrais modèles.
 *
 *   node e2e/fake-openrouter.js 8799
 *   OPENROUTER_API_KEY=stub-local OPENROUTER_BASE_URL=http://localhost:8799/api/v1 node dist/main.js
 *
 * Contrôle : GET /__stats (compteurs par type et par modèle),
 *            GET /__traps (textes des questions pièges, dernières preuves lues).
 * Chaque requête est journalisée (une ligne JSON : type reconnu, modèle).
 */
const http = require('http');

// ─── Thèmes (clés et libellés du backend : src/matching/divergence.engine.ts) ──
const THEME_LABELS = {
  famille: 'Famille',
  argent: 'Argent & dettes',
  spiritualite: 'Religion & spiritualité',
  intimite: 'Intimité & sexualité',
  communication: 'Communication & émotions',
  projet: 'Projet de vie',
  lieu: 'Lieu de vie & mobilité',
};
const THEME_EMOJI = {
  famille: '👨‍👩‍👧',
  argent: '💶',
  spiritualite: '🕊️',
  intimite: '❤️‍🔥',
  communication: '💬',
  projet: '🌱',
  lieu: '🧭',
};
const keyOfLabel = (label) =>
  Object.keys(THEME_LABELS).find((k) => THEME_LABELS[k] === String(label).trim()) || null;

/**
 * V8.3 — le rédacteur choisit un CADRE validé et en remplit les cases ; le
 * backend compose la question (texte français et anglais). Copie des cadres
 * utilisés ici (mêmes textes que src/journey/sondeur-frames.ts), pour
 * connaître le texte composé des pièges.
 */
const FRAMES = {
  C02: ["Si {objet} ne changeait jamais chez l'un de vous, pourriez-vous le vivre pendant des années ?", 'If {objet} never changed for one of you, could you live with it for years?'],
  C03: ["Jusqu'où iriez-vous pour {infinitif} ?", 'How far would you go to {infinitif}?'],
  C04: ["Qu'est-ce que vous ne pourriez pas accepter dans {objet} ?", 'What could you not accept about {objet}?'],
  C07: ['Combien de {duree} pourriez-vous attendre avant de trancher {objet} ?', 'How many {duree} could you wait before settling {objet}?'],
  C08: ['Pour {objet}, à partir de combien de {unite} par {periode} ce serait trop pour vous ?', 'For {objet}, how many {unite} a {periode} would be too much for you?'],
  C10: ['Si vos positions sur {objet} ne bougeaient jamais, pourriez-vous vous engager quand même ?', 'If your positions on {objet} never moved, could you still commit?'],
  C12: ['Sur {montant} € par mois à deux, quelle part consacreriez-vous à {objet} ?', 'Out of €{montant} a month for the two of you, what share would you put toward {objet}?'],
  C14: ['Quelle limite fixeriez-vous pour {objet} dans une vie à deux ?', 'What limit would you set for {objet} in a life together?'],
  C15: ['Pendant combien de {duree} pourriez-vous vivre sereinement avec {objet} ?', 'For how many {duree} could you live calmly with {objet}?'],
  C16: ["Si {objet} restait une question ouverte entre vous, combien de {duree} pourriez-vous l'accepter ?", 'If {objet} remained an open question between you, for how many {duree} could you accept it?'],
  C22: ['Quelle condition concrète poseriez-vous sur {objet} avant de vivre ensemble ?', 'What concrete condition would you set on {objet} before living together?'],
};
const CLOSED_EN = { mois: 'months', années: 'years', semaines: 'weeks', sorties: 'outings', '2 000': '2,000' };
/** Texte composé par le backend (français), pour reconnaître un piège servi. */
function composeFr(cadre, cases) {
  return FRAMES[cadre][0]
    .replace(/\{(\w+)\}/g, (_, k) => cases[k])
    .replace(/(^|[^\p{L}])de (années|heures)(?!\p{L})/gu, "$1d'$2");
}

/**
 * Propositions VALIDES par thème d'écart et par jour : [cadre, cases FR,
 * cases EN, méthode]. Un cadre différent par question : le backend écarte
 * deux questions du même écart avec la même tournure.
 */
const GAP_BANK = {
  argent: {
    1: [
      ['C12', { montant: '2 000', objet: "l'épargne" }, { objet: 'savings' }, 'chiffre'],
      ['C08', { objet: 'les achats plaisir', unite: 'sorties', periode: 'mois' }, { objet: 'treat purchases' }, 'chiffre'],
    ],
    2: [
      ['C03', { infinitif: 'épargner pour un projet commun' }, { infinitif: 'save for a shared project' }, "jusqu'où"],
      ['C14', { objet: 'les dépenses plaisir' }, { objet: 'treat spending' }, 'confrontation'],
    ],
    3: [
      ['C02', { objet: "la façon d'épargner" }, { objet: 'the way of saving' }, 'si cela ne changeait jamais'],
      ['C22', { objet: 'le budget commun' }, { objet: 'the shared budget' }, 'confrontation'],
    ],
  },
  lieu: {
    1: [
      ['C03', { infinitif: 'vivre dans une autre ville' }, { infinitif: 'live in another city' }, "jusqu'où"],
      ['C15', { duree: 'années', objet: 'une relation à distance' }, { objet: 'a long-distance relationship' }, 'chiffre'],
    ],
    2: [
      ['C07', { duree: 'mois', objet: 'la question du déménagement' }, { objet: 'the question of moving' }, 'chiffre'],
      ['C16', { objet: 'le lieu de vie', duree: 'mois' }, { objet: 'where to live' }, 'chiffre'],
    ],
    3: [
      ['C10', { objet: 'le déménagement' }, { objet: 'moving' }, 'si cela ne changeait jamais'],
      ['C22', { objet: 'le choix de la ville' }, { objet: 'the choice of city' }, 'confrontation'],
    ],
  },
};

/**
 * Questions PIÈGES : bien composées dans un cadre, mais posées sur un ACCORD
 * ou sur un RISQUE PARTAGÉ. Le contrôle du backend (aucun écart réel cité :
 * F8, P16, P18) doit les rejeter ; aucune ne doit être servie.
 */
const ACCORD_TRAPS = {
  famille: { 1: ['C22', { objet: 'les visites familiales' }, { objet: 'family visits' }], 2: ['C14', { objet: 'les visites familiales' }, { objet: 'family visits' }], 3: ['C04', { objet: 'les visites familiales' }, { objet: 'family visits' }] },
  argent: { 1: ['C04', { objet: "l'argent du foyer" }, { objet: 'household money' }], 2: ['C14', { objet: "l'argent du foyer" }, { objet: 'household money' }], 3: ['C22', { objet: "l'argent du foyer" }, { objet: 'household money' }] },
  projet: { 1: ['C22', { objet: 'les projets communs' }, { objet: 'shared projects' }], 2: ['C14', { objet: 'les projets communs' }, { objet: 'shared projects' }], 3: ['C04', { objet: 'les projets communs' }, { objet: 'shared projects' }] },
  lieu: { 1: ['C14', { objet: 'le lieu de vie' }, { objet: 'where to live' }], 2: ['C22', { objet: 'le lieu de vie' }, { objet: 'where to live' }], 3: ['C04', { objet: 'le lieu de vie' }, { objet: 'where to live' }] },
};
const SHARED_RISK_TRAPS = {
  communication: { 1: ['C04', { objet: 'le silence après un désaccord' }, { objet: 'silence after a disagreement' }], 2: ['C22', { objet: 'le silence après un désaccord' }, { objet: 'silence after a disagreement' }], 3: ['C14', { objet: 'le silence après un désaccord' }, { objet: 'silence after a disagreement' }] },
  famille: { 1: ['C22', { objet: 'les décisions de famille' }, { objet: 'family decisions' }], 2: ['C14', { objet: 'les décisions de famille' }, { objet: 'family decisions' }], 3: ['C04', { objet: 'les décisions de famille' }, { objet: 'family decisions' }] },
};
void CLOSED_EN;

/** Relances (question d'approfondissement), par thème de l'écart du jour 1. */
const FOLLOW_UP_BANK = {
  argent: [
    ['Quelle part d’une prime inattendue aimeriez-vous garder pour un plaisir ?',
      'What share of an unexpected bonus would you like to keep for a treat?', 'chiffre'],
    ['Qu’est-ce qui vous ferait accepter un mois sans aucune dépense plaisir ?',
      'What would make you accept a month with no treats at all?', 'confrontation'],
  ],
  lieu: [
    ['Quelle ville aimeriez-vous proposer pour une première année à deux ?',
      'Which city would you suggest for a first year together?', 'confrontation'],
    ['Combien de mois faudrait-il pour vous sentir chez vous dans une nouvelle ville ?',
      'How many months would it take you to feel at home in a new city?', 'chiffre'],
  ],
  default: [
    ['Qu’est-ce qui vous aiderait à mieux comprendre la réponse de l’autre sur ce sujet ?',
      'What would help you better understand the other answer on this topic?', 'confrontation'],
  ],
};

// ─── État (recette) ────────────────────────────────────────────────────────────
const stats = { total: 0, byKind: {}, byModel: {}, startedAt: new Date().toISOString() };
const traps = new Set();
const served = { valid: [], traps: [] };
let lastEvidence = [];
let lastGapThemes = [];
let lastFollowUpTheme = null;

// ─── Lecture des consignes ─────────────────────────────────────────────────────

/** Lignes « E3 · argent · écart · Épargne et dépenses (moderee) » du bloc PREUVES. */
function parseEvidence(prompt) {
  const start = prompt.indexOf('PREUVES AUTORISÉES');
  if (start < 0) return [];
  const out = [];
  for (const line of prompt.slice(start).split('\n').slice(1)) {
    const m = /^(\S+) · (\w+) · ([^·]+?)(?: · (.+))?$/.exec(line.trim());
    if (!m) {
      if (out.length) break;
      continue;
    }
    const kindText = m[3].trim();
    const kind = /^risque partagé/.test(kindText)
      ? 'shared'
      : kindText === 'écart'
        ? 'gap'
        : kindText === 'accord'
          ? 'accord'
          : kindText === 'neutre'
            ? 'neutral'
            : 'other';
    out.push({ id: m[1], theme: m[2], kind, topic: (m[4] || '').trim() });
  }
  return out;
}

/** Réponses du jour : « 1. [Thème] Question\n   A : ‹ … ›\n   B : ‹ … › ». */
function parseItems(prompt) {
  const items = [];
  const re = /^(\d+)\. \[([^\]]+)\] (.*)\n {3}(.+?) : (?:\S+ )?‹ (.*?) ›\n {3}(.+?) : (?:\S+ )?‹ (.*?) ›/gmu;
  for (const m of prompt.matchAll(re))
    items.push({ n: Number(m[1]), theme: m[2], question: m[3], answers: [m[5], m[7]] });
  return items;
}

/** Extrait cité mot pour mot : la réponse sans son préfixe « Réponse 1-2 : », 2 à 6 mots. */
function excerpt(answer) {
  const body = answer.replace(/^[^:]{0,20}:\s*/, '');
  const words = body.split(/\s+/).map((w) => w.replace(/[.,;!?…]+$/u, '')).filter(Boolean);
  return words.slice(0, Math.min(6, words.length)).join(' ');
}
const wordCount = (t) => t.split(/\s+/).filter(Boolean).length;

function classify(prompt) {
  if (/Tu modères une réponse au questionnaire|modérateur de sécurité de BOLIGO/.test(prompt)) return 'moderation';
  if (/Tu prépares les questions du JOUR \d/.test(prompt)) return 'sondeur_writer';
  if (/QUESTIONS À RELIRE/.test(prompt)) return 'critic';
  if (/LECTURE À VÉRIFIER/.test(prompt)) return 'fidelity';
  if (/Propose DEUX questions d'approfondissement/.test(prompt)) return 'follow_up';
  if (/Écris le bilan Harmonie/.test(prompt)) return 'review';
  if (/viennent de terminer la journée \d du Sondeur/.test(prompt) && /Écris la lecture de cette journée/.test(prompt))
    return 'day_reading';
  return 'other';
}

// ─── Réponses ─────────────────────────────────────────────────────────────────

function writerAnswer(prompt) {
  const day = Number(/Tu prépares les questions du JOUR (\d)/.exec(prompt)[1]);
  const evidence = parseEvidence(prompt);
  lastEvidence = evidence;
  // Écarts réels du jour : preuves « écart », hors risque partagé et hors
  // sujet non renseigné (sensible : jamais repris).
  const gaps = evidence.filter((e) => e.kind === 'gap' && !/non renseigné/i.test(e.topic));
  lastGapThemes = [...new Set(gaps.map((g) => g.theme))];
  const questions = [];
  const analyse = [];
  for (const theme of lastGapThemes) {
    const ids = gaps.filter((g) => g.theme === theme).map((g) => g.id);
    const bank = GAP_BANK[theme]?.[day] ?? [];
    analyse.push(`${theme} : écart ${ids.join(', ')} à confronter à la réalité.`);
    for (const [cadre, cases, casesEn, methode] of bank) {
      questions.push({
        day, themeKey: theme, theme: THEME_LABELS[theme], emoji: THEME_EMOJI[theme],
        cadre, cases, cases_en: casesEn,
        ecart: `Écart ${ids.join(', ')} (${theme})`, methode, cible: 'ce que chacun accepterait vraiment',
        preuves: ids.slice(0, 1), nature: 'ecart',
        options: ['Oui, sans difficulté', 'Avec du temps', 'Difficilement'],
        options_en: ['Yes, easily', 'With time', 'With difficulty'],
      });
      served.valid.push(composeFr(cadre, cases));
    }
  }
  // Piège 1 : une preuve d'ACCORD, présentée comme un écart (jour impair)
  // ou comme un accord (jour pair). Les deux doivent être rejetées (P4/P16).
  const accord = evidence.find((e) => e.kind === 'accord' && ACCORD_TRAPS[e.theme]);
  if (accord) {
    const [cadre, cases, casesEn] = ACCORD_TRAPS[accord.theme][day];
    const text = composeFr(cadre, cases);
    traps.add(text);
    served.traps.push(text);
    questions.push({
      day, themeKey: accord.theme, theme: THEME_LABELS[accord.theme], emoji: THEME_EMOJI[accord.theme],
      cadre, cases, cases_en: casesEn, ecart: 'aucun', methode: 'confrontation', cible: 'organisation',
      preuves: [accord.id], nature: day % 2 ? 'ecart' : 'accord',
      options: ['Oui', 'Peut-être', 'Non'], options_en: ['Yes', 'Maybe', 'No'],
    });
  }
  // Piège 2 : un RISQUE PARTAGÉ (mêmes réponses), présenté comme un écart (P18).
  const shared = evidence.find((e) => e.kind === 'shared' && SHARED_RISK_TRAPS[e.theme]);
  if (shared) {
    const [cadre, cases, casesEn] = SHARED_RISK_TRAPS[shared.theme][day];
    const text = composeFr(cadre, cases);
    traps.add(text);
    served.traps.push(text);
    questions.push({
      day, themeKey: shared.theme, theme: THEME_LABELS[shared.theme], emoji: THEME_EMOJI[shared.theme],
      cadre, cases, cases_en: casesEn, ecart: 'mêmes réponses', methode: 'confrontation', cible: 'réaction',
      preuves: [shared.id], nature: 'ecart',
      options: ['Oui', 'Peut-être', 'Non'], options_en: ['Yes', 'Maybe', 'No'],
    });
  }
  return { analyse, questions };
}

function criticAnswer(prompt) {
  const list = prompt.split(/\n(?:QUESTIONS DÉJÀ POSÉES|ANALYSE DU COUPLE|CONTEXTE|ANGLES DES JOURS|PREUVES AUTORISÉES|QUESTIONS DU GRAND ENTRETIEN|Refuse une question si)/)[0];
  const ns = [...list.matchAll(/^(\d+)\. \[jour (\d) · ([^\]]+)\]/gm)].map((m) => ({ n: Number(m[1]), slot: `${m[2]}|${m[3]}` }));
  const firstOfSlot = new Map();
  for (const x of ns) if (!firstOfSlot.has(x.slot)) firstOfSlot.set(x.slot, x.n);
  return { verdicts: ns.map((x) => ({ n: x.n, ok: true })), meilleures: [...firstOfSlot.values()] };
}

const POINT_GAP = 'Les deux réponses parlent de ce sujet avec des mots différents : le sens de chacune reste à préciser.';
const POINT_AGREE = 'Les deux réponses évoquent le dialogue comme point d’appui.';
const OPENER = 'Qu’est-ce qui compte le plus pour vous dans la façon d’en parler ?';

function point(it, text) {
  return { n: it.n, a: excerpt(it.answers[0]), b: excerpt(it.answers[1]), text };
}

function dayReadingAnswer(prompt) {
  const day = Number(/viennent de terminer la journée (\d) du Sondeur/.exec(prompt)[1]);
  const items = parseItems(prompt);
  const long = items.filter((it) => it.answers.every((a) => wordCount(a) >= 4));
  if (day === 1) {
    // Écart NON compris : le point « à explorer » porte sur le thème d'un
    // écart réel (argent de préférence), pour que la relance s'y rattache.
    const gapLabels = ['argent', ...lastGapThemes].map((k) => THEME_LABELS[k]);
    const target =
      gapLabels.map((l) => items.find((it) => it.theme === l)).find(Boolean) ?? items[0];
    const agree = long.find((it) => it !== target);
    return {
      alerte: 'aucune', membre: null,
      headline: 'Vous avez exploré aujourd’hui vos lignes rouges.',
      together: agree ? [point(agree, POINT_AGREE)] : [],
      toDiscuss: target ? [point(target, POINT_GAP)] : [],
      opener: OPENER,
    };
  }
  // Jours 2 et 3 : écart compris, rien à explorer (toDiscuss vide).
  return {
    alerte: 'aucune', membre: null,
    headline: 'Vous avez exploré aujourd’hui ce qui compte pour vous.',
    together: long.slice(0, 2).map((it) => point(it, POINT_AGREE)),
    toDiscuss: [],
    opener: OPENER,
  };
}

function followUpAnswer(prompt) {
  const block = (prompt.split('Écarts relevés dans ces réponses :')[1] || '').split('\n').filter((l) => l.startsWith('- '));
  const label = block.length ? block[0].slice(2).split(' : ')[0] : '';
  const theme = keyOfLabel(label) || 'argent';
  lastFollowUpTheme = theme;
  const bank = FOLLOW_UP_BANK[theme] ?? FOLLOW_UP_BANK.default;
  return {
    questions: bank.map(([text, textEn, methode]) => ({
      themeKey: theme, text, text_en: textEn, methode, cible: 'ce que chacun accepterait vraiment',
    })),
  };
}

function reviewAnswer(prompt) {
  const items = parseItems(prompt);
  const long = items.filter((it) => it.answers.every((a) => wordCount(a) >= 4));
  return {
    alerte: 'aucune', membre: null,
    headline: 'Vous avez exploré pendant trois jours ce qui compte pour vous.',
    accords: long.slice(0, 2).map((it) => point(it, POINT_AGREE)),
    toDiscuss: [],
    openers: [
      'Qu’est-ce qui vous a donné envie d’en savoir plus sur l’autre ?',
      'Quel sujet aimeriez-vous aborder en premier lors de votre rencontre ?',
      'Quelle réponse de l’autre aimeriez-vous mieux comprendre ?',
    ],
    advice: 'Prenez le temps de lire chaque réponse avant d’écrire. Gardez les sujets les plus personnels pour la rencontre.',
  };
}

const ANSWERS = {
  moderation: () => ({ allowed: true, danger: [] }),
  sondeur_writer: writerAnswer,
  critic: criticAnswer,
  fidelity: () => ({ fidele: true }),
  follow_up: followUpAnswer,
  review: reviewAnswer,
  day_reading: dayReadingAnswer,
};

function reply(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function handle(req, res, body) {
  if (req.method === 'GET' && req.url.startsWith('/__stats')) return reply(res, 200, { ...stats, traps: traps.size, lastFollowUpTheme });
  if (req.method === 'GET' && req.url.startsWith('/__traps'))
    return reply(res, 200, { traps: [...traps], evidence: lastEvidence, gapThemes: lastGapThemes, written: served.valid.length, lastFollowUpTheme });
  // Catalogue injoignable : le backend s'en remet au prix plafond (max_price).
  if (req.url.endsWith('/models')) {
    count('catalogue', null);
    return reply(res, 503, {});
  }
  let parsed = null;
  try { parsed = JSON.parse(body); } catch { /* corps illisible */ }
  const prompt = (parsed?.messages ?? []).map((m) => m.content).join('\n');
  const model = parsed?.model ?? null;
  const kind = classify(prompt);
  count(kind, model);
  const build = ANSWERS[kind];
  if (!build) return reply(res, 503, { error: 'faux OpenRouter : consigne non simulée' });
  let content;
  try {
    content = JSON.stringify(build(prompt));
  } catch (e) {
    console.log(JSON.stringify({ t: new Date().toISOString(), kind, error: String(e) }));
    return reply(res, 503, { error: 'faux OpenRouter : consigne non comprise' });
  }
  return reply(res, 200, {
    id: `fake-${stats.total}`,
    model,
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
  });
}

function count(kind, model) {
  stats.total += 1;
  stats.byKind[kind] = (stats.byKind[kind] ?? 0) + 1;
  if (model) stats.byModel[model] = (stats.byModel[model] ?? 0) + 1;
  console.log(JSON.stringify({ t: new Date().toISOString(), kind, model }));
}

module.exports = { classify, parseEvidence, parseItems, excerpt, writerAnswer, dayReadingAnswer, followUpAnswer, reviewAnswer, criticAnswer, GAP_BANK, ACCORD_TRAPS, SHARED_RISK_TRAPS, FOLLOW_UP_BANK };

if (require.main === module) {
  const port = Number(process.argv[2] || 8799);
  http
    .createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => handle(req, res, body));
    })
    .listen(port, () => console.log(`Faux OpenRouter déterministe sur http://localhost:${port}`));
  process.on('SIGTERM', () => {
    console.log(JSON.stringify({ arret: true, ...stats }));
    process.exit(0);
  });
}
