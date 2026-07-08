import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportReason } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ReportService', () => {
  let service: ReportService;
  let prisma: PrismaService;

  const mockPrismaService = {
    message: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    report: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    it('should throw BadRequestException if neither messageId nor reportedUserId is provided', async () => {
      await expect(
        service.createReport('reporter-id', { reason: ReportReason.insulte }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if message is not found', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(
        service.createReport('reporter-id', {
          messageId: 'nonexistent-msg',
          reason: ReportReason.insulte,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if reporter is not member of the journey', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue({
        id: 'msg-id',
        senderId: 'target-id',
        journey: {
          userAId: 'user-a',
          userBId: 'user-b',
        },
      });

      await expect(
        service.createReport('reporter-id', {
          messageId: 'msg-id',
          reason: ReportReason.insulte,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create report resolving reportedUserId from message sender', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue({
        id: 'msg-id',
        senderId: 'target-id',
        journey: {
          userAId: 'reporter-id',
          userBId: 'target-id',
        },
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'target-id' });
      mockPrismaService.report.create.mockResolvedValue({ id: 'report-id' });

      const result = await service.createReport('reporter-id', {
        messageId: 'msg-id',
        reason: ReportReason.insulte,
      });

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-id' },
        data: { moderationStatus: 'en_verification' },
      });
      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'reporter-id',
          reportedId: 'target-id',
          messageId: 'msg-id',
          reason: ReportReason.insulte,
          description: undefined,
          status: 'en_attente',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
