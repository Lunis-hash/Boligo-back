import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Sons haute qualité légers (CDN Cloudflare)
const SOUND_EFFECTS: Record<string, string> = {
  likeSent: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Soft pop / chime
  likeReceived: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Gentle bell chime
  match: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Magical harp chime
  option: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Subtle click
  message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Message ping
};

/**
 * Service centralisé pour les retours sonores et vibrations (Soft Audio & Haptic Feedback).
 * Fonctionne à 100% sur Mobile (iOS/Android via expo-av) et sur Web.
 */
class SoundService {
  private isSoundEnabled: boolean = true;
  private isHapticsEnabled: boolean = true;
  private isAudioConfigured: boolean = false;

  constructor() {
    this.configureAudioSession();
  }

  private async configureAudioSession() {
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        this.isAudioConfigured = true;
      }
    } catch (e) {
      console.log('⚠️ [SoundService] Erreur config audio session:', e);
    }
  }

  /**
   * Active ou désactive le son
   */
  setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
  }

  /**
   * Active ou désactive les vibrations haptiques
   */
  setHapticsEnabled(enabled: boolean) {
    this.isHapticsEnabled = enabled;
  }

  /**
   * Joue un son natif via expo-av (Android / iOS)
   */
  private async playNativeSound(soundKey: string, volume: number = 0.8) {
    if (!this.isSoundEnabled) return;

    try {
      if (!this.isAudioConfigured) {
        await this.configureAudioSession();
      }

      const soundUri = SOUND_EFFECTS[soundKey];
      if (!soundUri) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { shouldPlay: true, volume }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (err) {
      // Fallback synthétiseur web si erreur de lecture
      this.playSoftTone([523, 659, 880], 250);
    }
  }

  /**
   * Synthétiseur Web Audio API de secours (Web)
   */
  private playSoftTone(frequencies: number[], durationMs: number = 300, type: OscillatorType = 'sine') {
    if (!this.isSoundEnabled) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();

        frequencies.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);

          gain.gain.setValueAtTime(0.01, ctx.currentTime + index * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + index * 0.08 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + (durationMs / 1000));

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + index * 0.08);
          osc.stop(ctx.currentTime + index * 0.08 + (durationMs / 1000) + 0.1);
        });
      } catch (e) {}
    }
  }

  /**
   * 1. Déclenché lors de l'envoi d'un Like / Connexion
   */
  async playLikeSent() {
    if (this.isHapticsEnabled) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
    }

    if (Platform.OS !== 'web') {
      await this.playNativeSound('likeSent', 0.85);
    } else {
      this.playSoftTone([659.25, 880], 250, 'sine');
    }
  }

  /**
   * 2. Déclenché lorsqu'un nouveau Like est reçu
   */
  async playLikeReceived() {
    if (this.isHapticsEnabled) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    }

    if (Platform.OS !== 'web') {
      await this.playNativeSound('likeReceived', 0.9);
    } else {
      this.playSoftTone([1046.50, 783.99], 350, 'sine');
    }
  }

  /**
   * 3. Déclenché lors d'un Match / Célébration Harmonie
   */
  async playMatchCelebration() {
    if (this.isHapticsEnabled) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (e) {}
    }

    if (Platform.OS !== 'web') {
      await this.playNativeSound('match', 1.0);
    } else {
      this.playSoftTone([523.25, 659.25, 783.99, 1046.50], 500, 'sine');
    }
  }

  /**
   * 4. Déclenché lors du clic sur un bouton / choix d'option
   */
  async playOptionSelect() {
    if (this.isHapticsEnabled) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }

    if (Platform.OS !== 'web') {
      await this.playNativeSound('option', 0.5);
    } else {
      this.playSoftTone([440], 100, 'triangle');
    }
  }

  /**
   * 5. Déclenché à la réception d'un message instantané
   */
  async playMessageReceived() {
    if (this.isHapticsEnabled) {
      try {
        await Haptics.selectionAsync();
      } catch (e) {}
    }

    if (Platform.OS !== 'web') {
      await this.playNativeSound('message', 0.8);
    } else {
      this.playSoftTone([587.33, 880], 200, 'sine');
    }
  }
}

export const soundService = new SoundService();
export default soundService;
