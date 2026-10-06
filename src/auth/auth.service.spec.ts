import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AccountDeletionService } from '../account/account-deletion.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../common/email.service';
import { BadRequestException, ConflictException, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Gender } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './dto/register.dto';

/** Date « AAAA-MM-JJ » située `years` ans (et `days` jours) avant aujourd'hui, en UTC. */
function yearsAgo(years: number, days = 0): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate() - days));
  return d.toISOString().slice(0, 10);
}

/** Inscription valide de référence (CGU acceptées). */
function validRegistration(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return {
    email: 'new@example.com',
    password: 'password',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1990-01-01',
    gender: Gender.H,
    city: 'Paris',
    telephone: '+33 612345678',
    acceptTerms: true,
    termsVersion: '2026-10-02',
    ...overrides,
  };
}

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    journey: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    interviewIA: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    report: { deleteMany: jest.fn() },
    message: { deleteMany: jest.fn() },
    harmonyResponse: { deleteMany: jest.fn() },
    harmonyQuestion: { deleteMany: jest.fn() },
    journeyInsight: { deleteMany: jest.fn() },
    videoSession: { deleteMany: jest.fn() },
    contactExchange: { deleteMany: jest.fn() },
    alumniCouple: { deleteMany: jest.fn() },
    creditTransaction: { deleteMany: jest.fn(), updateMany: jest.fn() },
    matchProposal: { deleteMany: jest.fn() },
    moduleResponse: { deleteMany: jest.fn() },
    mentalMap: { deleteMany: jest.fn() },
    notification: { deleteMany: jest.fn() },
    profile: { deleteMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: { sendVerificationEmail: jest.fn().mockResolvedValue(undefined), sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined) } },
        AccountDeletionService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'existing-id', email: 'exists@example.com' });
      const dto = {
        email: 'exists@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        gender: Gender.H,
        city: 'Paris',
        telephone: '123',
        acceptTerms: true,
      };

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should successfully register a new user and return token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ id: 'new-user-id', email: 'new@example.com', verificationCode: '1234' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const dto = {
        email: 'new@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        gender: Gender.H,
        city: 'Paris',
        telephone: '123',
        acceptTerms: true,
      };

      const result = await service.register(dto);

      expect(prisma.user.create).toHaveBeenCalled();
      // Depuis la vérification par OTP, l'inscription ne renvoie plus de jeton.
      expect(result).toEqual(expect.objectContaining({ success: true, email: 'new@example.com' }));
    });
  });

  describe('register — CGU, âge et doublons', () => {
    beforeEach(() => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockImplementation(async ({ data }) => ({ id: 'new-id', email: data.email }));
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
    });

    it('refuse une inscription sans acceptation des CGU, avant tout accès à la base', async () => {
      const dto = validRegistration({ acceptTerms: false });
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
      await expect(service.register(dto)).rejects.toThrow(/accepter les conditions générales/);
      expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('enregistre la date et la version des CGU acceptées', async () => {
      const before = Date.now();
      await service.register(validRegistration({ termsVersion: ' 2026-10-02 ' }));

      const { data } = mockPrismaService.user.create.mock.calls[0][0];
      expect(data.termsVersion).toBe('2026-10-02');
      expect(data.termsAcceptedAt).toBeInstanceOf(Date);
      expect(data.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('accepte une inscription sans version de CGU (version inconnue enregistrée à null)', async () => {
      await service.register(validRegistration({ termsVersion: undefined }));
      const { data } = mockPrismaService.user.create.mock.calls[0][0];
      expect(data.termsVersion).toBeNull();
      expect(data.termsAcceptedAt).toBeInstanceOf(Date);
    });

    it('normalise l’e-mail et enregistre la date de naissance AAAA-MM-JJ sans décalage', async () => {
      await service.register(validRegistration({ email: '  Jean.Dupont@Example.COM ', birthDate: '1994-05-20' }));
      const { data } = mockPrismaService.user.create.mock.calls[0][0];
      expect(data.email).toBe('jean.dupont@example.com');
      expect((data.birthDate as Date).toISOString()).toBe('1994-05-20T00:00:00.000Z');
    });

    it('refuse un membre de moins de 18 ans', async () => {
      await expect(service.register(validRegistration({ birthDate: yearsAgo(17) }))).rejects.toThrow(
        new BadRequestException('Vous devez avoir au moins 18 ans pour vous inscrire.'),
      );
      // La veille de ses 18 ans, il est encore mineur.
      await expect(service.register(validRegistration({ birthDate: yearsAgo(18, -1) }))).rejects.toThrow(/au moins 18 ans/);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('accepte un membre de 18 ans révolus', async () => {
      await expect(service.register(validRegistration({ birthDate: yearsAgo(18, 1) }))).resolves.toMatchObject({ success: true });
    });

    it('refuse une date de naissance dans le futur, inexistante ou au-delà de 99 ans', async () => {
      await expect(service.register(validRegistration({ birthDate: yearsAgo(-1) }))).rejects.toThrow(/futur/);
      await expect(service.register(validRegistration({ birthDate: '2001-02-30' }))).rejects.toThrow(/Date de naissance invalide/);
      await expect(service.register(validRegistration({ birthDate: 'pas-une-date' }))).rejects.toThrow(BadRequestException);
      await expect(service.register(validRegistration({ birthDate: yearsAgo(100) }))).rejects.toThrow(/99 ans/);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('distingue un e-mail déjà inscrit (409) d’un numéro déjà utilisé (409)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValueOnce({ id: 'u1', email: 'new@example.com', telephone: '+33 600000000' });
      await expect(service.register(validRegistration({ email: 'NEW@example.com' }))).rejects.toThrow(
        new ConflictException('Un compte existe déjà avec cet e-mail.'),
      );

      mockPrismaService.user.findFirst.mockResolvedValueOnce({ id: 'u2', email: 'autre@example.com', telephone: '+33 612345678' });
      await expect(service.register(validRegistration())).rejects.toThrow(
        new ConflictException('Ce numéro de téléphone est déjà utilisé.'),
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('traduit une violation d’unicité concurrente (P2002) en 409 explicite', async () => {
      mockPrismaService.user.create.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['telephone'] },
      }));
      await expect(service.register(validRegistration())).rejects.toThrow(
        new ConflictException('Ce numéro de téléphone est déjà utilisé.'),
      );

      mockPrismaService.user.create.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['email'] },
      }));
      await expect(service.register(validRegistration())).rejects.toThrow(
        new ConflictException('Un compte existe déjà avec cet e-mail.'),
      );
    });
  });

  describe('RegisterDto — acceptation des CGU', () => {
    const base = {
      email: 'new@example.com',
      password: 'Password12!',
      firstName: 'Jean',
      birthDate: '1990-01-01',
      gender: 'H',
    };
    const errorsOf = async (payload: Record<string, unknown>) =>
      (await validate(plainToInstance(RegisterDto, payload))).flatMap((e) =>
        e.property === 'acceptTerms' || e.property === 'termsVersion' ? Object.values(e.constraints ?? {}) : [],
      );

    it('exige acceptTerms === true avec un message en français', async () => {
      for (const acceptTerms of [undefined, false, 'true', 1]) {
        const messages = await errorsOf({ ...base, acceptTerms });
        expect(messages).toEqual([expect.stringMatching(/^Vous devez accepter les conditions générales/)]);
      }
    });

    it('accepte acceptTerms === true, avec ou sans version', async () => {
      expect(await errorsOf({ ...base, acceptTerms: true })).toEqual([]);
      expect(await errorsOf({ ...base, acceptTerms: true, termsVersion: '2026-10-02' })).toEqual([]);
      expect(await errorsOf({ ...base, acceptTerms: true, termsVersion: 42 })).not.toEqual([]);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const dto = {
        email: 'notfound@example.com',
        password: 'password',
      };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        passwordHash: 'correctHash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const dto = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should login successfully if credentials are correct', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        passwordHash: 'correctHash',
        isVerified: true,
        accountStatus: 'actif',
      });
      mockPrismaService.user.update.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedRefresh');

      const dto = {
        email: 'user@example.com',
        password: 'correctpassword',
      };

      const result = await service.login(dto);

      expect(result).toEqual(expect.objectContaining({ access_token: 'mock-jwt-token', userId: 'user-id' }));
    });

    it('should refuse a suspended account with ForbiddenException', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        passwordHash: 'correctHash',
        isVerified: true,
        accountStatus: 'suspendu',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login({ email: 'user@example.com', password: 'correctpassword' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sécurité des codes et des sessions', () => {
    it('ne délivre jamais de session à un compte déjà vérifié, même sans code', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'u1', email: 'victime@example.com', isVerified: true });
      await expect(service.verifyEmail('victime@example.com', '0000')).rejects.toThrow(BadRequestException);
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('refuse le code passe-partout 1234 hors mode de test', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'u2', email: 'nouveau@example.com', isVerified: false, verificationCode: '5821',
      });
      await expect(service.verifyEmail('nouveau@example.com', '1234')).rejects.toThrow(BadRequestException);
    });

    it('accepte le bon code et vérifie le compte', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'u3', email: 'nouveau@example.com', isVerified: false, verificationCode: '5821',
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValue('jwt');
      await expect(service.verifyEmail('Nouveau@Example.com ', '5821')).resolves.toMatchObject({ access_token: 'jwt' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isVerified: true, verificationCode: null } }),
      );
    });

    it('rejette un refresh token dont l’empreinte ne correspond pas (rejeu)', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'u4' });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u4', email: 'a@example.com', accountStatus: 'actif',
        hashedRefreshToken: '$2b$10$ancienneEmpreinteBcryptQuiNeDoitPlusEtreAcceptee',
      });
      await expect(service.refreshTokens('ancien.jeton.jwt')).rejects.toThrow(UnauthorizedException);
    });

    it('refuse une connexion sociale simulée (jeton mock_)', async () => {
      await expect(
        service.socialLogin('google', 'mock_x', { email: 'victime@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
    });

    describe('connexion Google', () => {
      const realFetch = global.fetch;
      const env = process.env.GOOGLE_CLIENT_IDS;
      const tokenInfo = (over: Record<string, unknown> = {}) =>
        jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ aud: 'boligo-client', sub: 'g-1', email: 'Membre@Example.com', email_verified: 'true', ...over }),
        });
      beforeEach(() => {
        process.env.GOOGLE_CLIENT_IDS = 'boligo-client';
      });
      afterEach(() => {
        global.fetch = realFetch;
        process.env.GOOGLE_CLIENT_IDS = env;
      });

      it('est indisponible tant que les identifiants BOLIGO ne sont pas configurés', async () => {
        process.env.GOOGLE_CLIENT_IDS = '';
        global.fetch = tokenInfo();
        await expect(service.socialLogin('google', 'ya29.token')).rejects.toThrow(UnauthorizedException);
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('refuse un jeton émis pour une autre application', async () => {
        global.fetch = tokenInfo({ aud: 'autre-application', azp: 'autre-application' });
        await expect(service.socialLogin('google', 'ya29.token')).rejects.toThrow(UnauthorizedException);
        expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
      });

      it('ne crée pas de compte : il faut d’abord s’inscrire', async () => {
        global.fetch = tokenInfo();
        mockPrismaService.user.findFirst.mockResolvedValue(null);
        await expect(service.socialLogin('google', 'ya29.token')).rejects.toThrow(UnauthorizedException);
        expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      });

      it('connecte un membre existant et relie son identifiant Google', async () => {
        global.fetch = tokenInfo();
        mockPrismaService.user.findFirst.mockResolvedValue({ id: 'u9', email: 'membre@example.com', accountStatus: 'actif', googleId: null });
        mockPrismaService.user.update.mockResolvedValue({});
        const res = await service.socialLogin('google', 'ya29.token');
        expect(res).toHaveProperty('access_token');
        expect(mockPrismaService.user.update).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 'u9' }, data: { googleId: 'g-1' } }),
        );
      });
    });
  });

  describe('deleteAccount', () => {
    it('should throw NotFoundException if user to delete does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteAccount('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should delete user and all associated records in cascade transaction', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrismaService.journey.findMany.mockResolvedValue([
        { id: 'journey-1', proposalId: 'proposal-1' },
      ]);
      mockPrismaService.interviewIA.findMany.mockResolvedValue([{ id: 'interview-1' }]);

      const result = await service.deleteAccount('user-id');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-id' } });
      expect(result).toEqual({ success: true, message: 'Compte supprimé avec succès' });
      // Paiements gardés (comptabilité) : anonymisés, jamais supprimés.
      expect(mockPrismaService.creditTransaction.deleteMany).not.toHaveBeenCalled();
      expect(mockPrismaService.creditTransaction.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        data: { userId: null, journeyId: null },
      });
      expect(mockPrismaService.creditTransaction.updateMany).toHaveBeenCalledWith({
        where: { journeyId: { in: ['journey-1'] } },
        data: { journeyId: null },
      });
    });
  });
});
