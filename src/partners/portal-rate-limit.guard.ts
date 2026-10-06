import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 60;
const MAX_KEYS = 50_000;

/**
 * Espace partenaire : 60 consultations par adresse IP toutes les 10 minutes.
 * Assez pour actualiser librement la page, trop peu pour tester des liens au
 * hasard (ils comptent 256 bits).
 */
@Injectable()
export class PortalRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ ip?: string }>();
    const key = req.ip ?? 'inconnue';
    const now = Date.now();
    if (this.hits.size > MAX_KEYS) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }
    entry.count += 1;
    if (entry.count > MAX_REQUESTS) {
      throw new HttpException(
        'Trop de consultations. Patientez quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
