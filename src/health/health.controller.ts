import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

/** Délai maximal de la vérification de la base : la sonde ne reste jamais bloquée. */
export const HEALTH_DB_TIMEOUT_MS = 3000;

export interface HealthReport {
  status: 'ok' | 'degraded';
  db: 'ok' | 'down';
  version: string;
}

/**
 * Version annoncée : APP_VERSION si défini (ex. empreinte du commit injectée
 * au build), sinon le champ « version » de package.json. Rien d'autre.
 */
export function appVersion(
  env: Record<string, string | undefined> = process.env,
): string {
  const fromEnv = env.APP_VERSION?.trim();
  if (fromEnv) return fromEnv.slice(0, 40);
  try {
    const file = join(__dirname, '..', '..', 'package.json');
    if (existsSync(file)) {
      const pkg = JSON.parse(readFileSync(file, 'utf8')) as { version?: unknown };
      if (typeof pkg.version === 'string') return pkg.version.slice(0, 40);
    }
  } catch {
    // version inconnue : on ne révèle pas pourquoi
  }
  return 'unknown';
}

/**
 * GET /api/health — sonde publique (sans authentification) pour l'hébergeur,
 * le répartiteur de charge ou la supervision. Ne renvoie aucun détail
 * d'erreur, d'hôte ni de configuration : seulement l'état de l'API et de la
 * base (requête `SELECT 1`). Réponse 200 si tout va bien, 503 si la base ne
 * répond pas.
 */
@Controller('health')
export class HealthController {
  private readonly version = appVersion();

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthReport> {
    let db: HealthReport['db'] = 'down';
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          const t = setTimeout(() => reject(new Error('timeout')), HEALTH_DB_TIMEOUT_MS);
          (t as { unref?: () => void }).unref?.();
          timer = t;
        }),
      ]);
      db = 'ok';
    } catch {
      db = 'down';
    } finally {
      if (timer) clearTimeout(timer);
    }
    return { status: db === 'ok' ? 'ok' : 'degraded', db, version: this.version };
  }

  @Get()
  async health(@Res({ passthrough: true }) res: Response): Promise<HealthReport> {
    const report = await this.check();
    res.setHeader('Cache-Control', 'no-store');
    res.status(report.db === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
