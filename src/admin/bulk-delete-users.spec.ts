import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ADMIN_ROLES_KEY } from './guards/admin-roles';
import { BulkDeleteUsersDto } from './dto/delete-user.dto';

type U = { id: string; role: UserRole };

function setup(users: U[], failOn: string[] = []) {
  const prisma = {
    user: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(users.filter((u) => where.id.in.includes(u.id))),
      ),
    },
  };
  const deletion = {
    deleteUser: jest.fn((id: string) =>
      failOn.includes(id)
        ? Promise.reject(new Error('panne'))
        : Promise.resolve({ success: true }),
    ),
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
  { id: 'admin', role: UserRole.ADMIN },
  { id: 'mod', role: UserRole.MODERATOR },
  { id: 'm1', role: UserRole.USER },
  { id: 'm2', role: UserRole.USER },
  { id: 'm3', role: UserRole.USER },
];

describe('Suppression en masse des membres', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('est réservée aux administrateurs', () => {
    const handler = Object.getOwnPropertyDescriptor(
      AdminController.prototype,
      'bulkDeleteUsers',
    )?.value as object;
    expect(Reflect.getMetadata(ADMIN_ROLES_KEY, handler)).toBeUndefined();
  });

  it('supprime les membres sélectionnés après la confirmation exacte', async () => {
    const { service, deletion } = setup(users);
    const res = await service.bulkDeleteUsers(
      'admin',
      ['m1', 'm2', 'm2'],
      'supprimer 2',
    );
    expect(res).toEqual({ deleted: 2, deletedIds: ['m1', 'm2'], skipped: [] });
    expect(deletion.deleteUser).toHaveBeenCalledTimes(2);
  });

  it('refuse une confirmation qui ne donne pas le bon nombre', async () => {
    const { service, deletion } = setup(users);
    await expect(
      service.bulkDeleteUsers('admin', ['m1', 'm2'], 'SUPPRIMER 3'),
    ).rejects.toThrow(BadRequestException);
    expect(deletion.deleteUser).not.toHaveBeenCalled();
  });

  it('ne touche jamais à son propre compte ni à l’équipe, et continue après un échec', async () => {
    const { service, deletion } = setup(users, ['m2']);
    const res = await service.bulkDeleteUsers(
      'admin',
      ['admin', 'mod', 'm1', 'm2', 'm3', 'inconnu'],
      'SUPPRIMER 6',
    );
    expect(res.deletedIds).toEqual(['m1', 'm3']);
    expect(res.skipped).toEqual([
      { id: 'admin', reason: 'Votre propre compte' },
      { id: 'mod', reason: 'Compte de l’équipe' },
      { id: 'm2', reason: 'Échec de la suppression' },
      { id: 'inconnu', reason: 'Compte introuvable' },
    ]);
    expect(deletion.deleteUser).not.toHaveBeenCalledWith('admin');
    expect(deletion.deleteUser).not.toHaveBeenCalledWith('mod');
  });

  it('limite à 50 comptes par envoi', async () => {
    const tooMany = plainToInstance(BulkDeleteUsersDto, {
      ids: Array.from({ length: 51 }, (_, i) => `u${i}`),
      confirm: 'SUPPRIMER 51',
    });
    expect(await validate(tooMany)).not.toHaveLength(0);
    const ok = plainToInstance(BulkDeleteUsersDto, {
      ids: ['m1'],
      confirm: 'SUPPRIMER 1',
    });
    expect(await validate(ok)).toHaveLength(0);
  });
});
