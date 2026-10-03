import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const MAX_KEYS = 50_000;

/**
 * Limite les tentatives sur les routes sensibles (connexion, codes, mot de
 * passe) : 8 essais par adresse e-mail et par route sur 10 minutes. La clé est
 * l'e-mail, pas l'IP : derrière le relais de Render, tous les visiteurs
 * peuvent partager la même adresse.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      body?: { email?: unknown };
      ip?: string;
      route?: { path?: string };
      url?: string;
    }>();
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const key = `${req.route?.path ?? req.url}|${email || `ip:${req.ip}`}`;
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
    if (entry.count > MAX_ATTEMPTS) {
      throw new HttpException(
        'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
