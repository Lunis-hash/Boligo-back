import { Injectable, Logger } from '@nestjs/common';

export interface DailyRoom {
  name: string;
  url: string;
}

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  private readonly apiKey = process.env.DAILY_API_KEY?.trim() || '';
  private readonly apiBase = 'https://api.daily.co/v1';

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const err = data as { error?: string; info?: string };
      throw new Error(
        err.error || err.info || `Daily API ${res.status}: ${text.slice(0, 200)}`,
      );
    }

    return data as T;
  }

  /** Nom de room stable et valide pour Daily (a-z, 0-9, -, _). */
  roomNameForJourney(journeyId: string): string {
    return `boligo-${journeyId.replace(/-/g, '')}`.slice(0, 128);
  }

  async getRoom(roomName: string): Promise<DailyRoom | null> {
    try {
      const room = await this.request<{ name: string; url: string }>(
        'GET',
        `/rooms/${encodeURIComponent(roomName)}`,
      );
      return { name: room.name, url: room.url };
    } catch {
      return null;
    }
  }

  async createRoom(roomName: string, maxDurationSec: number): Promise<DailyRoom> {
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 4; // room TTL 4h

    const room = await this.request<{ name: string; url: string }>('POST', '/rooms', {
      name: roomName,
      privacy: 'private',
      properties: {
        exp,
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: false,
        enable_recording: false,
        start_video_off: false,
        start_audio_off: false,
        eject_after_elapsed: maxDurationSec,
      },
    });

    return { name: room.name, url: room.url };
  }

  async createMeetingToken(
    roomName: string,
    userName: string,
    maxDurationSec: number,
  ): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + 60 * 60;

    const result = await this.request<{ token: string }>('POST', '/meeting-tokens', {
      properties: {
        room_name: roomName,
        user_name: userName.slice(0, 40),
        exp,
        eject_after_elapsed: maxDurationSec,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
        enable_recording: false,
      },
    });

    return result.token;
  }

  buildMeetingUrl(roomUrl: string, token: string): string {
    const separator = roomUrl.includes('?') ? '&' : '?';
    return `${roomUrl}${separator}t=${encodeURIComponent(token)}`;
  }

  logConfigurationHint(): void {
    if (!this.isConfigured()) {
      this.logger.warn(
        'DAILY_API_KEY manquante — appels vidéo en mode dégradé. Créez une clé sur https://dashboard.daily.co',
      );
    }
  }
}
