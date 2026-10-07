import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ADMIN_ROLES_KEY } from './guards/admin-roles';

type U = { id: string; email: string; role: UserRole };

function setup(users: U[]) {
  const prisma = {
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(users.find((u) => u.id === where.id) ?? null),
      ),
    },
  };
  const deletion = {
    deleteUser: jest.fn(() => Promise.resolve({ success: true })),
  };
  const service = new AdminService(
    prisma as never,
    {} as never,
    {} as never,
    deletion as never,
    {} as never,
  );
  return { service, deletion };
}

const users: U[] = [
  { id: 'admin', email: 'admin@boligo.fr', role: UserRole.ADMIN },
  { id: 'mod', email: 'mod@boligo.fr', role: UserRole.MODERATOR },
  { id: 'm1', email: 'Awa@Exemple.com', role: UserRole.USER },
];

describe('Suppression d’un membre par l’administrateur', () => {
  it('est réservée aux administrateurs (aucun autre rôle autorisé sur la route)', () => {
    const handler = Object.getOwnPropertyDescriptor(
      AdminController.prototype,
      'deleteUser',
    )?.value as object;
    expect(Reflect.getMetadata(ADMIN_ROLES_KEY, handler)).toBeUndefined();
  });

  it('supprime un membre quand l’adresse retapée correspond', async () => {
    const { service, deletion } = setup(users);
    await expect(
      service.deleteUser('admin', 'm1', ' awa@exemple.COM '),
    ).resolves.toEqual({ deleted: true });
    expect(deletion.deleteUser).toHaveBeenCalledWith('m1');
  });

  it('refuse une adresse différente, son propre compte, un compte d’équipe, un compte inconnu', async () => {
    const { service, deletion } = setup(users);
    await expect(
      service.deleteUser('admin', 'm1', 'autre@exemple.com'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.deleteUser('admin', 'admin', 'admin@boligo.fr'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.deleteUser('admin', 'mod', 'mod@boligo.fr'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.deleteUser('admin', 'inconnu', 'x@y.fr'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(deletion.deleteUser).not.toHaveBeenCalled();
  });
});
