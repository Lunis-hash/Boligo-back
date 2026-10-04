import { Test, TestingModule } from '@nestjs/testing';
import { JourneyService } from './journey.service';
import { GhostingService } from './ghosting.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationService } from '../notifications/notification.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CreditService } from '../credit/credit.service';

describe('JourneyService - Règle de Justice (Anti-Ghosting)', () => {
  let service: JourneyService;

  const mockPrismaService = {
    journey: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockNotificationService = {
    sendPushNotification: jest.fn(),
  };
  const mockCreditService = {
    refundJourneyOnce: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JourneyService,
        GhostingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: {} },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ChatGateway, useValue: {} },
        { provide: CreditService, useValue: mockCreditService },
      ],
    }).compile();

    service = module.get<JourneyService>(JourneyService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Sondeur : B ne répond plus', () => {
    const ghostedJourney = (hoursAgo: number) => ({
      id: 'journey-id',
      currentStep: 'phase_harmonie',
      result: 'en_cours',
      stepStartDate: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
      userAId: 'user-a',
      userBId: 'user-b',
      userA: { id: 'user-a', firstName: 'Alice' },
      userB: { id: 'user-b', firstName: 'Bob' },
      harmonyQuestions: [
        {
          id: 'q1',
          responses: [{ userId: 'user-a', respondedAt: new Date() }],
        },
        { id: 'q2', responses: [] },
      ],
      messages: [],
      videoSession: null,
      contactExchange: null,
    });

    beforeEach(() => {
      mockPrismaService.journey.findFirst.mockResolvedValue(null);
    });

    it('ne sanctionne personne pendant les 3 jours du Sondeur (50 h)', async () => {
      mockPrismaService.journey.findMany.mockResolvedValue([
        ghostedJourney(50),
      ]);

      await service.canAccessMessages('user-a');

      expect(mockPrismaService.journey.updateMany).not.toHaveBeenCalled();
      expect(mockCreditService.refundJourneyOnce).not.toHaveBeenCalled();
    });

    it("rend le crédit d'Alice si Bob n'a pas répondu après 96 h", async () => {
      mockPrismaService.journey.findMany.mockResolvedValue([
        ghostedJourney(97),
      ]);
      mockPrismaService.journey.updateMany.mockResolvedValue({ count: 1 });
      mockCreditService.refundJourneyOnce.mockResolvedValue(1);

      await service.canAccessMessages('user-a');

      expect(mockPrismaService.journey.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'journey-id',
          result: 'en_cours',
          currentStep: 'phase_harmonie',
        },
        data: {
          currentStep: 'termine',
          result: 'echoue',
          endDate: expect.any(Date) as Date,
          closingReason: 'Sans réponse de Bob dans les délais',
        },
      });
      expect(mockCreditService.refundJourneyOnce).toHaveBeenCalledWith(
        'user-a',
        'journey-id',
        'Sans réponse de Bob : crédit rendu',
      );
      expect(mockNotificationService.sendPushNotification).toHaveBeenCalledWith(
        'user-a',
        'credit',
        'Votre crédit vous a été rendu',
        'Bob n’a pas répondu dans les délais : le parcours s’est terminé et votre crédit vous a été rendu.',
      );
      expect(mockNotificationService.sendPushNotification).toHaveBeenCalledWith(
        'user-b',
        'systeme',
        'Parcours terminé',
        'Faute de réponse dans les délais, votre parcours avec Alice s’est terminé.',
      );
    });
  });
});
