import client from './api';

/**
 * Appels vidéo (backend : VideoController + JourneyController).
 *
 * Contrats backend :
 *  - GET  /video/session/:journeyId → { journeyId, currentStep, canJoin, testUnlock,
 *         dailyConfigured, maxDurationSec, partnerName, videoSession }
 *  - POST /video/call-token { journeyId } → { meetingUrl, roomName, partnerName,
 *         maxDurationSec, provider }
 *  - POST /video/end { journeyId, durationSec } → { success, advanced, currentStep }
 */
export interface VideoSessionInfo {
  journeyId: string;
  currentStep: string;
  canJoin: boolean;
  testUnlock: boolean;
  dailyConfigured: boolean;
  maxDurationSec: number;
  partnerName: string;
  videoSession: { status: string; startDate: string | null; endDate: string | null } | null;
}

export interface VideoJoinInfo {
  meetingUrl: string;
  roomName: string;
  partnerName: string;
  maxDurationSec: number;
  provider: 'daily' | 'jitsi' | string;
}

export interface VideoEndInfo {
  success: boolean;
  advanced: boolean;
  currentStep: string;
}

export async function getSession(journeyId: string): Promise<VideoSessionInfo> {
  const res = await client.get<VideoSessionInfo>(`/video/session/${journeyId}`);
  return res.data;
}

export async function joinVideoSession(journeyId: string): Promise<VideoJoinInfo> {
  const res = await client.post<VideoJoinInfo>('/video/call-token', { journeyId });
  return res.data;
}

export async function endVideoCall(journeyId: string, durationSec?: number): Promise<VideoEndInfo> {
  const res = await client.post<VideoEndInfo>('/video/end', {
    journeyId,
    ...(typeof durationSec === 'number' ? { durationSec: Math.max(0, Math.round(durationSec)) } : {}),
  });
  return res.data;
}

export const VideoService = {
  getSession,
  join: joinVideoSession,
  joinVideoSession,
  end: endVideoCall,
  endVideoCall,
};

export default VideoService;
