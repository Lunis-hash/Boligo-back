/**
 * Transfert ponctuel de la base BOLIGO vers sa propre base (Render Postgres).
 *
 * Déclenché au démarrage uniquement si DB_TRANSFER_TARGET_URL est défini :
 *  1. crée le schéma Prisma de BOLIGO dans la base cible (prisma db push) ;
 *  2. si la cible est vide, copie les 20 tables du schéma Prisma, dans l'ordre
 *     des clés étrangères, en une seule transaction ;
 *  3. compare les nombres de lignes table par table.
 *
 * Seules les tables du schéma Prisma de BOLIGO sont lues : aucune autre table
 * de la base source n'est copiée ni modifiée. La source n'est jamais écrite.
 * Les journaux ne contiennent ni adresse complète ni mot de passe.
 */
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import * as path from 'path';

const log = (message: string) => console.log(`[DB-TRANSFER] ${message}`);

export interface TransferReport {
  status: 'done' | 'skipped' | 'failed';
  tables: Record<string, { source: number; target: number }>;
  reason?: string;
}

/** Hôte d'une URL Postgres, sans identifiants. */
export function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'adresse invalide';
  }
}

/** Ordre d'insertion compatible avec les clés étrangères (parents d'abord). */
export function insertionOrder(
  tables: string[],
  foreignKeys: Array<{ child: string; parent: string }>,
): string[] {
  const parents = new Map(tables.map((t) => [t, new Set<string>()]));
  for (const { child, parent } of foreignKeys) {
    if (child !== parent && parents.has(child) && parents.has(parent)) {
      parents.get(child)!.add(parent);
    }
  }
  const order: string[] = [];
  const done = new Set<string>();
  while (order.length < tables.length) {
    const ready = tables
      .filter((t) => !done.has(t) && [...parents.get(t)!].every((p) => done.has(p)))
      .sort();
    if (ready.length === 0) {
      throw new Error('Cycle de clés étrangères : ordre de copie impossible.');
    }
    for (const t of ready) {
      order.push(t);
      done.add(t);
    }
  }
  return order;
}

function pushSchema(targetUrl: string) {
  const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build', 'index.js');
  execFileSync(process.execPath, [cli, 'db', 'push', '--skip-generate'], {
    env: { ...process.env, DATABASE_URL: targetUrl, DIRECT_URL: targetUrl },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
}

const count = async (db: PrismaClient, table: string) =>
  Number(
    (await db.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM "${table}"`))[0].n,
  );

export async function runDbTransfer(sourceUrl: string, targetUrl: string): Promise<TransferReport> {
  const report: TransferReport = { status: 'failed', tables: {} };
  if (!sourceUrl || !targetUrl || sourceUrl === targetUrl) {
    return { ...report, status: 'skipped', reason: 'source et cible identiques ou absentes' };
  }
  log(`source ${safeHost(sourceUrl)} → cible ${safeHost(targetUrl)}`);
  const source = new PrismaClient({ datasourceUrl: sourceUrl });
  const target = new PrismaClient({ datasourceUrl: targetUrl });
  try {
    pushSchema(targetUrl);
    log('schéma BOLIGO créé ou déjà à jour dans la cible');

    const tables = (
      await target.$queryRawUnsafe<Array<{ t: string }>>(
        `SELECT tablename AS t FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma%'`,
      )
    ).map((r) => r.t);
    const foreignKeys = await target.$queryRawUnsafe<Array<{ child: string; parent: string }>>(
      `SELECT c.relname AS child, p.relname AS parent
         FROM pg_constraint k
         JOIN pg_class c ON c.oid = k.conrelid
         JOIN pg_class p ON p.oid = k.confrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE k.contype = 'f' AND n.nspname = 'public'`,
    );
    const order = insertionOrder(tables, foreignKeys);

    const filled = await Promise.all(order.map((t) => count(target, t)));
    if (filled.some((n) => n > 0)) {
      log('la cible contient déjà des données : copie ignorée');
      for (const t of order) report.tables[t] = { source: await count(source, t), target: await count(target, t) };
      return { ...report, status: 'skipped', reason: 'cible non vide' };
    }

    await target.$transaction(
      async (tx) => {
        for (const t of order) {
          const rows = await source.$queryRawUnsafe<Array<{ data: unknown }>>(
            `SELECT coalesce(json_agg(x), '[]'::json) AS data FROM "${t}" x`,
          );
          await tx.$executeRawUnsafe(
            `INSERT INTO "${t}" SELECT * FROM json_populate_recordset(NULL::"${t}", $1::json)`,
            JSON.stringify(rows[0].data),
          );
        }
      },
      { timeout: 300_000, maxWait: 30_000 },
    );

    let identical = true;
    for (const t of order) {
      const entry = { source: await count(source, t), target: await count(target, t) };
      report.tables[t] = entry;
      if (entry.source !== entry.target) identical = false;
      log(`${t} : ${entry.target}/${entry.source}`);
    }
    report.status = identical ? 'done' : 'failed';
    if (!identical) report.reason = 'nombres de lignes différents';
    log(identical ? 'transfert terminé : toutes les tables sont identiques' : 'ÉCART de lignes : ne pas basculer');
    return report;
  } catch (err) {
    const reason = err instanceof Error ? err.message.split('\n')[0] : String(err);
    log(`échec : ${reason}`);
    return { ...report, status: 'failed', reason };
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }
}
