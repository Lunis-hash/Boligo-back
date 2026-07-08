import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportReason } from '@prisma/client';

describe('ReportController', () => {
  let controller: ReportController;
  let service: ReportService;

  const mockReportService = {
    createReport: jest.fn().mockImplementation((reporterId, dto) => {
      return Promise.resolve({
        success: true,
        reportId: 'mock-report-id',
        message: 'Signalement enregistré avec succès.',
      });
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        {
          provide: ReportService,
          useValue: mockReportService,
        },
      ],
    }).compile();

    controller = module.get<ReportController>(ReportController);
    service = module.get<ReportService>(ReportService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createReport', () => {
    it('should call createReport with correct parameters', async () => {
      const dto = {
        reportedUserId: 'target-user-id',
        messageId: 'msg-id',
        reason: ReportReason.insulte,
        description: 'He insulted me',
      };

      const req = { user: { id: 'reporter-user-id' } };

      const result = await controller.createReport(req, dto);

      expect(service.createReport).toHaveBeenCalledWith('reporter-user-id', dto);
      expect(result).toEqual({
        success: true,
        reportId: 'mock-report-id',
        message: 'Signalement enregistré avec succès.',
      });
    });
  });
});
