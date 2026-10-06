import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/** Comptes d'équipe autorisés à se connecter au tableau de bord. */
export const STAFF_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MODERATOR,
  UserRole.MARKETING,
];

export const ADMIN_ROLES_KEY = 'adminRoles';

/**
 * Rôles d'équipe autorisés sur une route, en plus de l'administrateur qui a
 * toujours accès. Sans ce décorateur, la route est réservée à l'administrateur.
 */
export const AllowRoles = (...roles: UserRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);

export function isStaff(role: string | undefined): boolean {
  return STAFF_ROLES.includes(role as UserRole);
}

export function roleAllowed(
  role: string | undefined,
  allowed?: UserRole[],
): boolean {
  if (role === UserRole.ADMIN) return true;
  return Boolean(role && allowed?.includes(role as UserRole));
}
