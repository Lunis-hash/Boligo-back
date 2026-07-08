import { Test, TestingModule } from '@nestjs/testing';
import { JourneyService } from './journey.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationService } from '../notifications/notification.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CreditService } from '../credit/credit.service';

describe('JourneyService - Règle de Justice (Anti-Ghosting)', () => {
  let service: JourneyService;
  let prisma: PrismaService;
  let creditService: CreditService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    journey: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    creditTransaction: {
      findFirst: jest.fn(),
    },
  };

  const mockAiService = {};
  const mockNotificationService = {
    sendPushNotification: jest.fn(),
  };
  const mockChatGateway = {};
  const mockCreditService = {
    refundJustice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JourneyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ChatGateway, useValue: mockChatGateway },
        { provide: CreditService, useValue: mockCreditService },
      ],
    }).compile();

    service = module.get<JourneyService>(JourneyService);
    prisma = module.get<PrismaService>(PrismaService);
    creditService = module.get<CreditService>(CreditService);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('autoAdvanceStaleJourneys - Ghosting Detection', () => {
    it('should refund user A if B ghosted in phase_harmonie (>48h)', async () => {
      const stepStartDate = new Date(Date.now() - 50 * 60 * 60 * 1000); // 50 hours ago

      // Mock journey search in autoAdvanceStaleJourneys
      mockPrismaService.journey.findMany.mockResolvedValue([
        {
          id: 'journey-id',
          currentStep: 'phase_harmonie',
          stepStartDate,
          userAId: 'user-a',
          userBId: 'user-b',
          userA: { id: 'user-a', firstName: 'Alice' },
          userB: { id: 'user-b', firstName: 'Bob' },
          harmonyQuestions: [
            {
              id: 'q1',
              responses: [
                { userId: 'user-a', responseText: 'Hello' }
              ]
            }
          ],
          messages: [],
          videoSession: null,
        }
      ]);

      // Mock message accessibility check query
      mockPrismaService.journey.findFirst.mockResolvedValue(null);

      // Mock transaction query
      mockPrismaService.creditTransaction.findFirst
        // First call: find victim consumption transaction
        .mockResolvedValueOnce({ id: 'tx-id', creditAmount: -1 })
        // Second call: check if refund exists
        .mockResolvedValueOnce(null);

      await service.canAccessMessages('user-a');

      // Check if journey was closed in database
      expect(prisma.journey.update).toHaveBeenCalledWith({
        where: { id: 'journey-id' },
        data: {
          currentStep: 'termine',
          result: 'echoue',
          endDate: expect.any(Date),
          closingReason: 'Inactivité de la part de Bob',
        },
      });

      // Check if credit service refund was triggered
      expect(creditService.refundJustice).toHaveBeenCalledWith(
        'user-a',
        'journey-id',
        1,
        'Remboursement anti-ghosting pour le parcours avec Bob'
      );

      // Check if victim was notified
      expect(notificationService.sendPushNotification).toHaveBeenCalledWith(
        'user-a',
        'credit',
        'Remboursement anti-ghosting 💍',
        'Votre crédit a été restitué car Bob n\'a pas répondu depuis 48 heures.'
      );
    });
  });
});
