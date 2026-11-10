import {
  createAudioPlayer,
  setAudioModeAsync,
  AudioPlayer,
  AudioStatus,
} from 'expo-audio';
import {
  IAudioEngine,
  PlaybackStatus,
  PlaybackStatusListener,
} from '../interfaces/i-audio-engine';

export class ExpoAudioAdapter implements IAudioEngine {
  private player: AudioPlayer | null = null;
  private currentUri: string | null = null;
  private listeners: Set<PlaybackStatusListener> = new Set();
  private isConfigured: boolean = false;
  private subscription: { remove: () => void } | null = null;

  private async configureAudioMode(): Promise<void> {
    if (this.isConfigured) return;
    try {
      await setAudioModeAsync({
        shouldPlayInBackground: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'duckOthers',
      });
      this.isConfigured = true;
    } catch (err) {
      console.warn('Failed to configure audio mode for background playback:', err);
    }
  }

  public async load(uri: string, shouldPlayImmediately: boolean = false): Promise<void> {
    await this.configureAudioMode();

    if (this.player && this.currentUri === uri) {
      if (shouldPlayImmediately) {
        this.player.play();
      }
      return;
    }

    // Clean up previous subscription and player
    this.cleanupCurrentPlayer();

    this.currentUri = uri;

    try {
      // updateInterval of 250ms for smooth progress bar updates
      this.player = createAudioPlayer(uri, { updateInterval: 250 });

      this.subscription = this.player.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => {
          this.emitStatus({
            isLoaded: status.isLoaded,
            isPlaying: status.playing,
            positionMs: Math.round(status.currentTime * 1000),
            durationMs: Math.round(status.duration * 1000),
            isBuffering: status.isBuffering,
            didJustFinish: status.didJustFinish,
          });
        }
      );

      if (shouldPlayImmediately) {
        this.player.play();
      }
    } catch (err: any) {
      this.emitStatus({
        isLoaded: false,
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        isBuffering: false,
        didJustFinish: false,
        error: err?.message || 'Error cargando archivo de audio',
      });
      throw err;
    }
  }

  public async play(): Promise<void> {
    if (!this.player) {
      throw new Error('No audio track loaded');
    }
    this.player.play();
  }

  public async pause(): Promise<void> {
    if (!this.player) return;
    this.player.pause();
  }

  public async stop(): Promise<void> {
    if (!this.player) return;
    this.player.pause();
    await this.player.seekTo(0);
  }

  public async seekTo(positionMs: number): Promise<void> {
    if (!this.player) return;
    const seconds = Math.max(0, positionMs / 1000);
    await this.player.seekTo(seconds);
  }

  public async setVolume(volume: number): Promise<void> {
    if (!this.player) return;
    this.player.volume = Math.max(0, Math.min(1, volume));
  }

  public async setPlaybackSpeed(speed: number): Promise<void> {
    if (!this.player) return;
    this.player.setPlaybackRate(speed);
  }

  public async unload(): Promise<void> {
    this.cleanupCurrentPlayer();
    this.currentUri = null;
  }

  public onStatusUpdate(listener: PlaybackStatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private cleanupCurrentPlayer(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (this.player) {
      try {
        this.player.remove();
      } catch (e) {
        // Ignored if already removed
      }
      this.player = null;
    }
  }

  private emitStatus(status: PlaybackStatus): void {
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (e) {
        console.error('Error in playback status listener:', e);
      }
    }
  }
}
