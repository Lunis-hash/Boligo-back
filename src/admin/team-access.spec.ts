import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { ADMIN_ROLES_KEY, isStaff, roleAllowed } from './guards/admin-roles';

type U = {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  accountStatus: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
};

function makeService(users: U[]) {
  const prisma = {
    user: {
      findUnique: jest.fn(
        ({ where }: { where: { email?: string; id?: string } }) =>
          Promise.resolve(
            users.find((u) =>
              where.email ? u.email === where.email : u.id === where.id,
            ) ?? null,
          ),
      ),
      findFirst: jest.fn(
        ({ where }: { where: { id: string; role: UserRole } }) =>
          Promise.resolve(
            users.find((u) => u.id === where.id && u.role === where.role) ??
              null,
          ),
      ),
      count: jest.fn(({ where }: { where: { role: UserRole } }) =>
        Promise.resolve(users.filter((u) => u.role === where.role).length),
      ),
      update: jest.fn(
        ({ where, data }: { where: { id: string }; data: Partial<U> }) => {
          const u = users.find((x) => x.id === where.id)!;
          Object.assign(u, data);
          return Promise.resolve(u);
        },
      ),
    },
  };
  const jwt = { signAsync: jest.fn(() => Promise.resolve('jeton')) };
  const service = new AdminService(
    prisma as never,
    jwt as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, prisma, users };
}

describe('Accès d’équipe au tableau de bord', () => {
  const OLD_ENV = process.env.ADMIN_BOOTSTRAP_EMAIL;
  afterEach(() => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = OLD_ENV;
  });

  it('reconnaît les rôles d’équipe et réserve tout le reste à l’administrateur', () => {
    expect(isStaff('ADMIN')).toBe(true);
    expect(isStaff('MODERATOR')).toBe(true);
    expect(isStaff('MARKETING')).toBe(true);
    expect(isStaff('USER')).toBe(false);
    expect(roleAllowed('ADMIN', undefined)).toBe(true);
    expect(roleAllowed('MODERATOR', undefined)).toBe(false);
    expect(roleAllowed('MODERATOR', [UserRole.MODERATOR])).toBe(true);
    expect(roleAllowed('MARKETING', [UserRole.MODERATOR])).toBe(false);
    expect(roleAllowed('USER', [UserRole.MODERATOR, UserRole.MARKETING])).toBe(
      false,
    );
  });

  it('le garde refuse un rôle non autorisé sur la route', async () => {
    const reflector = new Reflector();
    const guard = new AdminGuard(reflector);
    // On isole la vérification de rôle : le jeton est supposé valide.
    jest
      .spyOn(Object.getPrototypeOf(AdminGuard.prototype), 'canActivate')
      .mockResolvedValue(true as never);
    const ctx = (role: string, allowed?: UserRole[]) => {
      const handler = () => undefined;
      if (allowed) Reflect.defineMetadata(ADMIN_ROLES_KEY, allowed, handler);
      return {
        getHandler: () => handler,
        getClass: () => class {},
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      } as never;
    };
    await expect(guard.canActivate(ctx('ADMIN'))).resolves.toBe(true);
    await expect(
      guard.canActivate(ctx('MODERATOR', [UserRole.MODERATOR])),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(ctx('MARKETING', [UserRole.MODERATOR])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(ctx('USER', [UserRole.MARKETING])),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('nomme le premier administrateur désigné, puis plus jamais', async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = ' Fondateur@Boligo.fr ';
    const { service, users } = makeService([
      {
        id: 'a',
        email: 'fondateur@boligo.fr',
        role: UserRole.USER,
        isVerified: true,
        accountStatus: 'actif',
      },
      {
        id: 'b',
        email: 'autre@boligo.fr',
        role: UserRole.USER,
        isVerified: true,
        accountStatus: 'actif',
      },
    ]);
    await expect(service.ensureBootstrapAdmin()).resolves.toBe(true);
    expect(users[0].role).toBe(UserRole.ADMIN);
    process.env.ADMIN_BOOTSTRAP_EMAIL = 'autre@boligo.fr';
    await expect(service.ensureBootstrapAdmin()).resolves.toBe(false);
    expect(users[1].role).toBe(UserRole.USER);
  });

  it('n’attribue rien à un compte non vérifié', async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = 'fondateur@boligo.fr';
    const { service, users } = makeService([
      {
        id: 'a',
        email: 'fondateur@boligo.fr',
        role: UserRole.USER,
        isVerified: false,
        accountStatus: 'actif',
      },
    ]);
    await expect(service.ensureBootstrapAdmin()).resolves.toBe(false);
    expect(users[0].role).toBe(UserRole.USER);
  });

  it('ouvre la connexion aux rôles d’équipe, pas aux membres', async () => {
    const hash = await bcrypt.hash('mot-de-passe-solide', 4);
    const { service } = makeService([
      {
        id: 'm',
        email: 'modo@boligo.fr',
        role: UserRole.MODERATOR,
        isVerified: true,
        accountStatus: 'actif',
        passwordHash: hash,
      },
      {
        id: 'u',
        email: 'membre@boligo.fr',
        role: UserRole.USER,
        isVerified: true,
        accountStatus: 'actif',
        passwordHash: hash,
      },
    ]);
    await expect(
      service.login({
        email: 'MODO@boligo.fr',
        password: 'mot-de-passe-solide',
      }),
    ).resolves.toMatchObject({ user: { role: UserRole.MODERATOR } });
    await expect(
      service.login({
        email: 'membre@boligo.fr',
        password: 'mot-de-passe-solide',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('gère l’équipe : compte existant et vérifié, pas soi-même, jamais sans administrateur', async () => {
    const { service, users } = makeService([
      {
        id: 'admin',
        email: 'admin@boligo.fr',
        role: UserRole.ADMIN,
        isVerified: true,
        accountStatus: 'actif',
      },
      {
        id: 'x',
        email: 'commercial@boligo.fr',
        role: UserRole.USER,
        isVerified: true,
        accountStatus: 'actif',
      },
      {
        id: 'y',
        email: 'nonverifie@boligo.fr',
        role: UserRole.USER,
        isVerified: false,
        accountStatus: 'actif',
      },
    ]);
    await expect(
      service.setTeamRole('admin', 'Commercial@boligo.fr', UserRole.MARKETING),
    ).resolves.toBeTruthy();
    expect(users[1].role).toBe(UserRole.MARKETING);
    await expect(
      service.setTeamRole('admin', 'absent@boligo.fr', UserRole.MODERATOR),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.setTeamRole('admin', 'nonverifie@boligo.fr', UserRole.MODERATOR),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.setTeamRole('admin', 'admin@boligo.fr', UserRole.USER),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Un second administrateur ne peut pas retirer le premier s'il est seul… ici il y en a deux.
    users[1].role = UserRole.ADMIN;
    await expect(
      service.setTeamRole('x', 'admin@boligo.fr', UserRole.MODERATOR),
    ).resolves.toBeTruthy();
    await expect(
      service.setTeamRole('admin', 'commercial@boligo.fr', UserRole.USER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('la modération suspend un compte, mais ne touche ni aux crédits ni à la vérification', async () => {
    const { service } = makeService([
      {
        id: 'u',
        email: 'membre@boligo.fr',
        role: UserRole.USER,
        isVerified: true,
        accountStatus: 'actif',
      },
    ]);
    await expect(
      service.updateUser('u', { creditBalance: 10 }, UserRole.MODERATOR),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.updateUser('u', { isVerified: false }, UserRole.MODERATOR),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.updateUser(
        'u',
        { accountStatus: 'suspendu' as never },
        UserRole.MODERATOR,
      ),
    ).resolves.toBeTruthy();
  });

  it('ne montre pas à l’équipe Marketing quels membres ont utilisé un code', async () => {
    const promo = {
      id: 'p1',
      code: 'CAMILLE42',
      usages: [
        {
          id: 'u1',
          userId: 'membre-1',
          usedAt: new Date(),
          promoCode: { code: 'CAMILLE42' },
        },
      ],
      _count: { usages: 1 },
    };
    const prisma = {
      promoCode: { findUnique: jest.fn(() => Promise.resolve(promo)) },
    };
    const service = new AdminService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const forMarketing = await service.getPromoCode('p1', UserRole.MARKETING);
    expect(forMarketing.usages[0]).not.toHaveProperty('userId');
    expect(forMarketing.usages[0].id).toBe('u1');

    const forAdmin = await service.getPromoCode('p1', UserRole.ADMIN);
    expect(forAdmin.usages[0]).toHaveProperty('userId', 'membre-1');
  });
});
