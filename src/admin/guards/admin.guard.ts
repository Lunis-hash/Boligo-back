import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ADMIN_ROLES_KEY, roleAllowed } from './admin-roles';

/**
 * Tableau de bord : jeton valide et rôle d'équipe autorisé sur la route.
 * L'administrateur a toujours accès ; modération et marketing seulement là où
 * la route les autorise (@AllowRoles). Le rôle est relu en base à chaque requête.
 */
@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = (await super.canActivate(context)) as boolean;
    if (!activated) return false;

    const allowed = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { role: UserRole } }>();
    if (!user || !roleAllowed(user.role, allowed)) {
      throw new ForbiddenException('Accès réservé à l’équipe autorisée');
    }
    return true;
  }
}
