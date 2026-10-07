import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyService } from './daily.service';
import { NotificationService } from '../notifications/notification.service';
import { ChatGateway } from '../chat/chat.gateway';

/** Durée de l'échange vidéo du Parcours Harmonie : 7 minutes. */
export const VIDEO_CALL_MAX_SECONDS = 7 * 60;

/** Étapes où l’appel vidéo est autorisé (prod). */
const VIDEO_STEPS_PROD = ['video'] as const;

/** En dev / VIDEO_TEST_UNLOCK=true : autoriser uniquement si explicitement demandé. */
function isVideoTestUnlock(): boolean {
  const flag = process.env.VIDEO_TEST_UNLOCK?.trim().toLowerCase();
  return flag === 'true' || flag === '1';
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
    private notificationService: NotificationService,
    private chatGateway: ChatGateway,
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
      dailyConfigured: true,
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

    if (journey.result !== 'en_cours') {
      throw new BadRequestException('Ce parcours est terminé.');
    }
    if (!canAccessVideoStep(journey.currentStep)) {
      throw new BadRequestException(
        journey.currentStep === 'chat_libre'
          ? "L'appel vidéo se débloque après quelques jours de chat (phase vidéo du parcours)."
          : "L'appel vidéo n'est pas disponible à cette étape du parcours.",
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
    let isJitsi = roomUrl?.includes('meet.jit.si') ?? false;

    if (!roomUrl || (isJitsi && this.daily.isConfigured())) {
      if (this.daily.isConfigured()) {
        try {
          let room = await this.daily.getRoom(roomName);
          if (!room) {
            room = await this.daily.createRoom(roomName, VIDEO_CALL_MAX_SECONDS);
          }
          roomUrl = room.url;
          effectiveRoomName = room.name;
          isJitsi = false;
        } catch (err: any) {
          console.warn(`[Video] Daily API failed, falling back to Jitsi Meet:`, err.message);
          roomUrl = `https://meet.jit.si/boligo-${journeyId.replace(/-/g, '')}`;
          effectiveRoomName = roomName;
          isJitsi = true;
        }
      } else {
        roomUrl = `https://meet.jit.si/boligo-${journeyId.replace(/-/g, '')}`;
        effectiveRoomName = roomName;
        isJitsi = true;
      }

      await this.prisma.videoSession.upsert({
        where: { journeyId },
        create: {
          journeyId,
          dailyRoomName: effectiveRoomName,
          dailyRoomUrl: roomUrl,
          status: 'planifiee',
        },
        update: {
          dailyRoomName: effectiveRoomName,
          dailyRoomUrl: roomUrl,
        },
      });
    }

    let meetingUrl = '';
    let provider = 'daily';

    if (isJitsi) {
      meetingUrl = `${roomUrl}#config.deepLinking.enabled=false&config.disableDeepLinking=true&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.MOBILE_APP_PROMO=false`;
      provider = 'jitsi';
    } else {
      try {
        const token = await this.daily.createMeetingToken(
          effectiveRoomName,
          user.firstName?.trim() || 'Participant',
          VIDEO_CALL_MAX_SECONDS,
        );
        meetingUrl = this.daily.buildMeetingUrl(roomUrl, token);
      } catch (err: any) {
        console.warn(`[Video] Daily token failed, falling back to Jitsi Meet:`, err.message);
        meetingUrl = `https://meet.jit.si/boligo-${journeyId.replace(/-/g, '')}#config.deepLinking.enabled=false&config.disableDeepLinking=true&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.MOBILE_APP_PROMO=false`;
        provider = 'jitsi';
      }
    }

    // Trigger Notification & WebSocket if first participant
    const isFirstParticipant = !journey.videoSession || journey.videoSession.status !== 'en_cours';
    if (isFirstParticipant) {
      try {
        this.chatGateway.broadcastIncomingCall(journeyId, userId, user.firstName);
        console.log(`[Video] WebSocket incomingCall broadcasted for journey ${journeyId}`);
      } catch (wsErr) {
        console.error(`[Video] Failed to broadcast WS incomingCall:`, wsErr);
      }
      try {
        await this.notificationService.sendPushNotification(
          partner.id,
          'systeme',
          'Appel vidéo entrant',
          `${user.firstName} vous appelle en vidéo. Rejoignez l'appel.`,
        );
        console.log(`[Video] Push call notification sent to partner ${partner.id}`);
      } catch (pushErr) {
        console.error(`[Video] Failed to send push call notification:`, pushErr);
      }
    }

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
      provider,
    };
  }

  async endCall(journeyId: string, userId: string, durationSec?: number) {
    const journey = await this.getJourneyForUser(journeyId, userId);
    const call = journey.videoSession;

    const now = new Date();
    // La durée vient du serveur (premier participant entré → maintenant) ;
    // celle envoyée par l'app ne sert qu'à l'affiner à la baisse.
    const elapsedSec = call?.startDate
      ? Math.max(0, Math.round((now.getTime() - call.startDate.getTime()) / 1000))
      : 0;
    const clientSec =
      typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec >= 0
        ? durationSec
        : elapsedSec;
    const effectiveSec = Math.min(elapsedSec, clientSec, VIDEO_CALL_MAX_SECONDS + 60);

    if (call && call.status === 'en_cours') {
      await this.prisma.videoSession.update({
        where: { journeyId },
        data: {
          status: 'terminee',
          endDate: now,
          durationMinutes: Math.max(1, Math.ceil(effectiveSec / 60)),
        },
      });
    }

    // L'étape n'avance que si l'appel a vraiment eu lieu à l'étape vidéo,
    // avec les deux membres connectés.
    const bothJoined = Boolean(call?.consentA && call?.consentB);
    let advanced = false;
    if (
      bothJoined &&
      effectiveSec >= 10 &&
      journey.result === 'en_cours' &&
      canAccessVideoStep(journey.currentStep)
    ) {
      const res = await this.prisma.journey.updateMany({
        where: { id: journeyId, currentStep: journey.currentStep },
        data: {
          currentStep: 'echange_contacts',
          stepStartDate: now,
        },
      });
      advanced = res.count > 0;
    }

    return {
      success: true,
      advanced,
      currentStep: advanced ? 'echange_contacts' : journey.currentStep,
    };
  }
}
