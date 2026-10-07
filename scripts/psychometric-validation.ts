/**
 * Validation psychométrique du Grand Entretien (V7.1), en LECTURE SEULE.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/psychometric-validation.ts \
 *     <URL de la base> [--out rapport.md] [--allow-remote]
 *
 * Pour chaque échelle : alpha de Cronbach, oméga (modèle à un facteur),
 * corrélations item-total corrigées, alpha sans chaque affirmation,
 * distributions des réponses et des scores, part de réponses par
 * acquiescement. Sortie : un rapport Markdown (sur la sortie standard, ou
 * dans le fichier de `--out`). Protocole : docs/VALIDATION_CLINIQUE.md.
 *
 * Garde-fous :
 *  - l'adresse de la base est passée en argument, jamais lue dans .env ;
 *  - une base qui n'est pas locale (localhost, 127.0.0.1, ::1 ou socket) est
 *    refusée, sauf avec `--allow-remote`, donné explicitement ;
 *  - toutes les lectures passent dans une transaction READ ONLY : la base
 *    refuse toute écriture ;
 *  - seules les réponses brutes des entretiens terminés sont lues, sans nom,
 *    adresse ni identifiant de membre ; le rapport ne contient que des
 *    agrégats.
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { collectRawAnswers } from '../src/matching/divergence.engine';
import {
  buildValidationReport,
  describeSource,
  isLocalDatabase,
} from '../src/psychometrics/validation-report';

function usage(message: string): never {
  console.error(`${message}

Usage : scripts/psychometric-validation.ts <URL de la base> [--out rapport.md] [--allow-remote]`);
  process.exit(2);
}

async function main() {
  const args = process.argv.slice(2);
  const allowRemote = args.includes('--allow-remote');
  const outIndex = args.indexOf('--out');
  const out = outIndex >= 0 ? args[outIndex + 1] : undefined;
  if (outIndex >= 0 && !out) usage('--out attend un nom de fichier.');
  const url = args.find(
    (a, i) => !a.startsWith('--') && (outIndex < 0 || i !== outIndex + 1),
  );
  if (!url) usage('Adresse de la base manquante.');
  if (!isLocalDatabase(url) && !allowRemote)
    usage(
      `Base refusée : ${describeSource(url)} n'est pas locale. Ajoutez --allow-remote pour la lire quand même (lecture seule).`,
    );

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    const interviews = await prisma.$transaction(
      async (tx) => {
        // Toute écriture est refusée par la base dans cette transaction.
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        return tx.interviewIA.findMany({
          where: { status: 'termine' },
          select: {
            responses: { select: { rawResponses: true } },
          },
        });
      },
      { timeout: 120_000 },
    );
    const members = interviews.map((i) => collectRawAnswers(i.responses));
    const report = buildValidationReport(members, {
      source: describeSource(url),
      date: new Date().toISOString().slice(0, 10),
    });
    if (out) {
      fs.writeFileSync(out, report);
      console.error(`Rapport écrit : ${out} (${members.length} entretiens)`);
    } else {
      process.stdout.write(report);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(
    'Validation impossible :',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
