import {
  AudioTrackMetadata,
  IAudioEngine,
  PlaybackStatus,
  PlaybackStatusListener,
} from '../interfaces/i-audio-engine';
import {
  NativePlaybackStatusEvent,
  OpenWaveNativeBridge,
} from '../native/openwave-native-bridge';

/**
 * Hardware/Media3 IAudioEngine adapter communicating with the native
 * OpenWaveMediaService (ExoPlayer + MediaLibrarySession + Hardware AudioEffect DSP).
 * Used automatically in Development Builds and APK releases; ExpoAudioAdapter stays
 * active as fallback when running inside Expo Go.
 */
export class Media3AudioAdapter implements IAudioEngine {
  private listeners: Set<PlaybackStatusListener> = new Set();
  private unsubscribeNative: (() => void) | null = null;
  private currentVolume = 1.0;
  private currentSpeed = 1.0;

  private ensureSubscribed(): void {
    if (this.unsubscribeNative) return;
    this.unsubscribeNative = OpenWaveNativeBridge.subscribeEvent<NativePlaybackStatusEvent>(
      'onPlaybackStatus',
      (evt) => {
        const normalized: PlaybackStatus = {
          isLoaded: Boolean(evt?.isLoaded),
          isPlaying: Boolean(evt?.isPlaying),
          positionMs: Math.max(0, Number(evt?.positionMillis ?? 0)),
          durationMs: Math.max(0, Number(evt?.durationMillis ?? 0)),
          isBuffering: Boolean(evt?.isBuffering),
          didJustFinish: Boolean(evt?.didJustFinish),
          error: evt?.error ?? null,
        };
        this.listeners.forEach((cb) => {
          try {
            cb(normalized);
          } catch {}
        });
      }
    );
  }

  async load(
    uri: string,
    shouldPlayImmediately = true,
    metadata?: AudioTrackMetadata
  ): Promise<void> {
    this.ensureSubscribed();
    await OpenWaveNativeBridge.loadTrack(uri, shouldPlayImmediately, metadata);
    if (this.currentVolume !== 1.0) {
      await OpenWaveNativeBridge.setVolume(this.currentVolume);
    }
    if (this.currentSpeed !== 1.0) {
      await OpenWaveNativeBridge.setPlaybackSpeed(this.currentSpeed);
    }
  }

  updateMetadata(metadata: AudioTrackMetadata): void {
    OpenWaveNativeBridge.updateMetadata(metadata).catch(() => {});
  }

  async play(): Promise<void> {
    this.ensureSubscribed();
    await OpenWaveNativeBridge.play();
  }

  async pause(): Promise<void> {
    await OpenWaveNativeBridge.pause();
  }

  async stop(): Promise<void> {
    await OpenWaveNativeBridge.stop();
  }

  async seekTo(positionMs: number): Promise<void> {
    await OpenWaveNativeBridge.seekTo(positionMs);
  }

  async setVolume(volume: number): Promise<void> {
    this.currentVolume = Math.min(1, Math.max(0, volume));
    await OpenWaveNativeBridge.setVolume(this.currentVolume);
  }

  async setPlaybackSpeed(speed: number): Promise<void> {
    this.currentSpeed = Math.min(3, Math.max(0.25, speed));
    await OpenWaveNativeBridge.setPlaybackSpeed(this.currentSpeed);
  }

  async preloadTrack(_uri: string): Promise<void> {
    // ExoPlayer prepares media streams asynchronously with native cache buffering
  }

  async unload(): Promise<void> {
    await OpenWaveNativeBridge.stop();
    if (this.unsubscribeNative) {
      this.unsubscribeNative();
      this.unsubscribeNative = null;
    }
  }

  onStatusUpdate(listener: PlaybackStatusListener): () => void {
    this.ensureSubscribed();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

