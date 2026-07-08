import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Gender } from '@prisma/client';

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
      create: jest.fn(),
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
    videoSession: { deleteMany: jest.fn() },
    contactExchange: { deleteMany: jest.fn() },
    alumniCouple: { deleteMany: jest.fn() },
    creditTransaction: { deleteMany: jest.fn() },
    matchProposal: { deleteMany: jest.fn() },
    moduleResponse: { deleteMany: jest.fn() },
    mentalMap: { deleteMany: jest.fn() },
    notification: { deleteMany: jest.fn() },
    profile: { deleteMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
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

      const dto = {
        email: 'exists@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        gender: Gender.H,
        city: 'Paris',
        telephone: '123',
      };

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should successfully register a new user and return token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ id: 'new-user-id', email: 'new@example.com' });
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
      };

      const result = await service.register(dto);

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toEqual({ access_token: 'mock-jwt-token', userId: 'new-user-id' });
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const dto = {
        email: 'notfound@example.com',
        password: 'password',
      };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
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
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        passwordHash: 'correctHash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const dto = {
        email: 'user@example.com',
        password: 'correctpassword',
      };

      const result = await service.login(dto);

      expect(result).toEqual({ access_token: 'mock-jwt-token', userId: 'user-id' });
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
    });
  });
});
