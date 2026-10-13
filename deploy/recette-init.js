#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Initialisation de la base de RECETTE LOCALE (Mac, Linux, Windows, Docker).
 *
 *   node deploy/recette-init.js
 *
 * 1. Refuse toute base qui n'est pas locale (localhost, 127.0.0.1, hôte Docker « db »).
 * 2. Base VIDE (aucune table dans « public ») : `prisma db push`. Base déjà
 *    remplie : le schéma n'est PAS repoussé (réinitialiser la recette pour
 *    repartir d'un schéma neuf).
 * 3. Migrations additives prisma/sql/*.sql (rejouables sans effet : déclencheur
 *    de version du Grand Entretien, colonnes bilingues, etc.).
 * 4. Seed des membres fictifs (npm run seed:recette), puis
 *    `seed:recette:partenaires` s'il existe dans package.json.
 *
 * Lancé par recette.sh / recette.ps1 (conteneur « recette-init », ou
 * directement en mode --sans-docker). Ne contacte aucun service distant.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(2);
}

function hostOf(raw) {
  try {
    return new URL(raw).hostname;
  } catch {
    return '';
  }
}

const ALLOWED = new Set(['localhost', '127.0.0.1', 'db']);
for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
  const h = hostOf(process.env[name] || '');
  if (!ALLOWED.has(h)) {
    die(`${name} doit viser une base LOCALE (localhost, 127.0.0.1 ou « db »), reçu « ${h || 'absent'} ». Rien n'a été fait.`);
  }
}

const PRISMA_CLI = path.join(ROOT, 'node_modules', 'prisma', 'build', 'index.js');
if (!fs.existsSync(PRISMA_CLI)) die('node_modules absent : lancez « npm ci » à la racine.');

function run(label, cmd, args) {
  console.log(`\n▶ ${label}`);
  // Windows : npm.cmd ne se lance qu'à travers le shell (Node 18.20+ / 20.12+).
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: cmd.endsWith('.cmd'), env: process.env });
  if (r.status !== 0) die(`${label} : échec (code ${r.status}).`);
}
const prisma = (...args) => run(`prisma ${args.join(' ')}`, process.execPath, [PRISMA_CLI, ...args]);

async function tableCount() {
  const { PrismaClient } = require('@prisma/client');
  const client = new PrismaClient();
  for (let i = 0; i < 30; i++) {
    try {
      const rows = await client.$queryRawUnsafe(
        "select count(*)::int as n from information_schema.tables where table_schema = 'public'",
      );
      await client.$disconnect();
      return rows[0].n;
    } catch (e) {
      if (i === 29) {
        await client.$disconnect().catch(() => {});
        throw e;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return 0;
}

async function main() {
  console.log(`🧪 Recette locale : base « ${hostOf(process.env.DATABASE_URL)} »`);
  const n = await tableCount();
  if (n === 0) {
    prisma('db', 'push', '--skip-generate');
  } else {
    console.log(`\nℹ️  Base déjà initialisée (${n} tables) : schéma conservé, pas de « db push ».`);
  }

  const sqlDir = path.join(ROOT, 'prisma', 'sql');
  for (const f of fs.readdirSync(sqlDir).filter((x) => x.endsWith('.sql')).sort()) {
    prisma('db', 'execute', '--schema', 'prisma/schema.prisma', '--file', path.join('prisma', 'sql', f));
  }

  const tsNode = path.join(ROOT, 'node_modules', 'ts-node', 'dist', 'bin.js');
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts || {};
  const npmRun = (name) => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    run(`npm run ${name}`, npm, ['run', '--silent', name]);
  };
  if (scripts['seed:recette']) npmRun('seed:recette');
  else run('seed:recette', process.execPath, [tsNode, '-P', 'tsconfig.json', '--transpile-only', 'prisma/seed-recette.ts']);

  if (scripts['seed:recette:partenaires']) {
    npmRun('seed:recette:partenaires');
  } else {
    console.log('\nℹ️  Script « seed:recette:partenaires » absent de package.json : partenaires fictifs non créés (étape ignorée).');
  }
  console.log('\n✅ Base de recette prête.');
}

main().catch((e) => die(e && e.message ? e.message : String(e)));
