import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyService } from './daily.service';

export const VIDEO_CALL_MAX_SECONDS = 2 * 60;

/** Étapes où l’appel vidéo est autorisé (prod). */
const VIDEO_STEPS_PROD = ['video'] as const;

/** En dev / VIDEO_TEST_UNLOCK=true : autoriser aussi pendant le chat libre. */
function isVideoTestUnlock(): boolean {
  const flag = process.env.VIDEO_TEST_UNLOCK?.trim().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

function canAccessVideoStep(currentStep: string): boolean {
  if (VIDEO_STEPS_PROD.includes(currentStep as (typeof VIDEO_STEPS_PROD)[number])) {
    return true;
  }
  return isVideoTestUnlock() && currentStep === 'chat_libre';
}

@Injectable()
export class VideoCallService {
  constructor(
    private prisma: PrismaService,
    private daily: DailyService,
  ) {
    this.daily.logConfigurationHint();
  }

  private async getJourneyForUser(journeyId: string, userId: string) {
    const journey = await this.prisma.journey.findUnique({
      where: { id: journeyId },
      include: {
        userA: { select: { id: true, firstName: true } },
        userB: { select: { id: true, firstName: true } },
        videoSession: true,
      },
    });

    if (!journey) {
      throw new NotFoundException('Parcours non trouvé');
    }

    if (journey.userAId !== userId && journey.userBId !== userId) {
      throw new ForbiddenException('Vous ne faites pas partie de ce parcours');
    }

    return journey;
  }

  async getSession(journeyId: string, userId: string) {
    const journey = await this.getJourneyForUser(journeyId, userId);
    const partner =
      journey.userAId === userId ? journey.userB : journey.userA;

    return {
      journeyId,
      currentStep: journey.currentStep,
      canJoin: canAccessVideoStep(journey.currentStep),
      testUnlock: isVideoTestUnlock(),
      dailyConfigured: this.daily.isConfigured(),
      maxDurationSec: VIDEO_CALL_MAX_SECONDS,
      partnerName: partner.firstName,
      videoSession: journey.videoSession
        ? {
            status: journey.videoSession.status,
            startDate: journey.videoSession.startDate,
            endDate: journey.videoSession.endDate,
          }
        : null,
    };
  }

  async joinCall(journeyId: string, userId: string) {
    const journey = await this.getJourneyForUser(journeyId, userId);

    if (!canAccessVideoStep(journey.currentStep)) {
      throw new BadRequestException(
        journey.currentStep === 'chat_libre'
          ? "L'appel vidéo se débloque après quelques jours de chat (phase vidéo du parcours)."
          : "L'appel vidéo n'est pas disponible à cette étape du parcours.",
      );
    }

    if (!this.daily.isConfigured()) {
      throw new ServiceUnavailableException(
        'Appels vidéo non configurés sur le serveur (DAILY_API_KEY)',
      );
    }

    const user =
      journey.userAId === userId ? journey.userA : journey.userB;
    const partner =
      journey.userAId === userId ? journey.userB : journey.userA;

    const roomName = this.daily.roomNameForJourney(journeyId);
    let roomUrl = journey.videoSession?.dailyRoomUrl ?? null;
    let effectiveRoomName =
      journey.videoSession?.dailyRoomName ?? roomName;

    if (!roomUrl) {
      let room = await this.daily.getRoom(roomName);
      if (!room) {
        room = await this.daily.createRoom(roomName, VIDEO_CALL_MAX_SECONDS);
      }
      roomUrl = room.url;
      effectiveRoomName = room.name;

      await this.prisma.videoSession.upsert({
        where: { journeyId },
        create: {
          journeyId,
          dailyRoomName: room.name,
          dailyRoomUrl: room.url,
          status: 'planifiee',
        },
        update: {
          dailyRoomName: room.name,
          dailyRoomUrl: room.url,
        },
      });
    }

    const token = await this.daily.createMeetingToken(
      effectiveRoomName,
      user.firstName?.trim() || 'Participant',
      VIDEO_CALL_MAX_SECONDS,
    );

    const meetingUrl = this.daily.buildMeetingUrl(roomUrl, token);

    const isUserA = journey.userAId === userId;
    await this.prisma.videoSession.upsert({
      where: { journeyId },
      create: {
        journeyId,
        dailyRoomName: effectiveRoomName,
        dailyRoomUrl: roomUrl,
        status: 'en_cours',
        startDate: new Date(),
        ...(isUserA ? { consentA: true } : { consentB: true }),
      },
      update: {
        status: 'en_cours',
        startDate: journey.videoSession?.startDate ?? new Date(),
        ...(isUserA ? { consentA: true } : { consentB: true }),
      },
    });

    return {
      meetingUrl,
      roomName,
      partnerName: partner.firstName,
      maxDurationSec: VIDEO_CALL_MAX_SECONDS,
      provider: 'daily',
    };
  }

  async endCall(journeyId: string, userId: string, durationSec?: number) {
    const journey = await this.getJourneyForUser(journeyId, userId);

    const now = new Date();
    const durationMinutes =
      durationSec != null
        ? Math.max(1, Math.ceil(durationSec / 60))
        : undefined;

    if (journey.videoSession) {
      await this.prisma.videoSession.update({
        where: { journeyId },
        data: {
          status: 'terminee',
          endDate: now,
          ...(durationMinutes != null ? { durationMinutes } : {}),
        },
      });
    }

    let advanced = false;
    if (
      journey.currentStep === 'video' ||
      journey.currentStep === 'chat_libre'
    ) {
      await this.prisma.journey.update({
        where: { id: journeyId },
        data: {
          currentStep: 'echange_contacts',
          stepStartDate: now,
        },
      });
      advanced = true;
    }

    return {
      success: true,
      advanced,
      currentStep: advanced ? 'echange_contacts' : journey.currentStep,
    };
  }
}
