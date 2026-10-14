#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Démarrage de la PRÉVISUALISATION DE RECETTE (Dockerfile.preview, Render).
 *
 * 1. Garde-fous : RECETTE_PREVIEW=1 obligatoire ; refus si la base est
 *    Supabase (production) ou si une clé Stripe LIVE est présente.
 * 2. Schéma : `prisma db push` (sans perte de données), puis prisma/sql/*.sql
 *    dans l'ordre des noms (scripts idempotents).
 * 3. Données fictives : seed:recette puis seed:recette:partenaires, compilés
 *    en JavaScript (dist-seed). Par défaut une seule fois : relancés seulement
 *    si les comptes de recette sont absents, ou si RECETTE_RESEED=1 (remise à
 *    zéro des comptes fictifs ; les comptes créés à la main sont conservés).
 * 4. IA simulée (faux OpenRouter local), sauf RECETTE_FAUX_IA=0.
 * 5. Lancement de l'API (qui sert aussi la webapp et l'admin).
 */
const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const env = process.env;

function die(message) {
  console.error(`\n❌ [PRÉVISUALISATION] ${message}\n`);
  process.exit(1);
}

if (env.RECETTE_PREVIEW !== '1') die('RECETTE_PREVIEW=1 est obligatoire pour cette image.');
const { previewConfigProblems } = require(path.join(ROOT, 'dist', 'common', 'preview.js'));
const problems = previewConfigProblems(env);
if (problems.length) die(`configuration refusée :\n - ${problems.join('\n - ')}`);

const prismaBin = path.join(ROOT, 'node_modules', 'prisma', 'build', 'index.js');
function run(label, args, extraEnv = {}) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...env, ...extraEnv },
  });
  return r.status === 0;
}

// 2. Schéma.
if (!run('Schéma : prisma db push', [prismaBin, 'db', 'push', '--skip-generate'])) {
  die('prisma db push a échoué (changement destructif ? voir le journal).');
}
const sqlDir = path.join(ROOT, 'prisma', 'sql');
for (const f of fs.readdirSync(sqlDir).filter((x) => x.endsWith('.sql')).sort()) {
  if (!run(`SQL ${f}`, [prismaBin, 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', path.join('prisma', 'sql', f)])) {
    die(`le script prisma/sql/${f} a échoué.`);
  }
}

// 3. Données fictives (une fois, sauf RECETTE_RESEED=1).
async function alreadySeeded() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const [members, partners] = await Promise.all([
      prisma.user.count({ where: { email: { endsWith: '@recette.boligo.test' } } }),
      prisma.partnerApplication.count({ where: { email: { endsWith: '@boligo-demo.example' } } }),
    ]);
    return members > 0 && partners > 0;
  } finally {
    await prisma.$disconnect();
  }
}

(async () => {
  const seeded = await alreadySeeded().catch(() => false);
  if (seeded && env.RECETTE_RESEED !== '1') {
    console.log('\nℹ️  Données de recette déjà présentes : seeds non relancés (RECETTE_RESEED=1 pour les recréer).');
  } else {
    const seedEnv = { NODE_OPTIONS: '--max-old-space-size=384' };
    if (!run('Membres fictifs (seed:recette)', [path.join('dist-seed', 'prisma', 'seed-recette.js')], seedEnv)) {
      console.error('⚠️  seed:recette a échoué : l’API démarre quand même (voir le journal).');
    }
    if (!run('Partenaires fictifs (seed:recette:partenaires)', [path.join('dist-seed', 'prisma', 'seed-recette-partenaires.js')], seedEnv)) {
      console.error('⚠️  seed:recette:partenaires a échoué : l’API démarre quand même (voir le journal).');
    }
  }

  // 4. IA SIMULÉE (par défaut en prévisualisation, RECETTE_FAUX_IA=0 pour la
  // couper) : faux OpenRouter local et déterministe, sans réseau ni clé. Sans
  // IA, la règle fail-closed cache chaque réponse du Sondeur jusqu'à la
  // décision de l'équipe et retient la messagerie : le parcours ne pourrait
  // pas être joué de bout en bout. Une vraie clé OpenRouter n'est jamais
  // utilisée ici (l'adresse est forcée sur le faux local).
  let apiEnv = env;
  if (env.RECETTE_FAUX_IA !== '0') {
    const fake = spawn(process.execPath, [path.join('deploy', 'fake-openrouter.js'), '8799'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { PATH: env.PATH },
    });
    fake.on('exit', (code) => console.error(`⚠️  Faux OpenRouter arrêté (code ${code}).`));
    apiEnv = {
      ...env,
      OPENROUTER_BASE_URL: 'http://127.0.0.1:8799/api/v1',
      OPENROUTER_API_KEY: 'faux-openrouter-local-recette',
      OPENROUTER_AUTH: '',
      GROQ_API_KEY: '',
      INSIGHTS_RETRY_AFTER_MS: env.INSIGHTS_RETRY_AFTER_MS || '5000',
    };
    console.log('\nℹ️  IA SIMULÉE : faux OpenRouter local (modération, lectures du Sondeur). RECETTE_FAUX_IA=0 pour tester le repli fail-closed sans IA.');
  }

  // 5. API (sert aussi / et /admin).
  console.log('\n▶ Démarrage de l’API');
  const api = spawn(process.execPath, ['--max-old-space-size=400', path.join('dist', 'main.js')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: apiEnv,
  });
  const stop = (sig) => api.kill(sig);
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
  api.on('exit', (code) => process.exit(code ?? 1));
})();
