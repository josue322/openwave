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
  private loadToken: number = 0;

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
    const token = ++this.loadToken;
    await this.configureAudioMode();

    // If the SAME track is already loaded, restart it from 0 ("al presionar la musica tiene que reiniciar")
    if (this.player && this.currentUri === uri) {
      try {
        await this.player.seekTo(0);
        this.emitStatus({
          isLoaded: true,
          isPlaying: shouldPlayImmediately,
          positionMs: 0,
          durationMs: this.player.duration ? Math.round(this.player.duration * 1000) : 0,
          isBuffering: false,
          didJustFinish: false,
        });
        if (shouldPlayImmediately) {
          this.player.play();
        }
      } catch (e) {
        console.warn('Error restarting current track:', e);
      }
      return;
    }

    // Immediately stop and destroy previous player so tracks NEVER overlap ("evitar cruzarse las musicas")
    this.cleanupCurrentPlayer();

    if (token !== this.loadToken) {
      return; // A newer load was initiated
    }

    this.currentUri = uri;

    try {
      // Create new audio player with 250ms updateInterval
      const newPlayer = createAudioPlayer(uri, { updateInterval: 250 });

      if (token !== this.loadToken) {
        // Obsolete player created during fast clicking
        try {
          newPlayer.pause();
          newPlayer.remove();
        } catch (e) {}
        return;
      }

      this.player = newPlayer;

      this.subscription = this.player.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => {
          if (token === this.loadToken) {
            this.emitStatus({
              isLoaded: status.isLoaded,
              isPlaying: status.playing,
              positionMs: Math.round(status.currentTime * 1000),
              durationMs: Math.round(status.duration * 1000),
              isBuffering: status.isBuffering,
              didJustFinish: status.didJustFinish,
            });
          }
        }
      );

      if (shouldPlayImmediately) {
        this.player.play();
      }
    } catch (err: any) {
      if (token === this.loadToken) {
        this.emitStatus({
          isLoaded: false,
          isPlaying: false,
          positionMs: 0,
          durationMs: 0,
          isBuffering: false,
          didJustFinish: false,
          error: err?.message || 'Error cargando archivo de audio',
        });
      }
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
    try {
      this.player.pause();
      await this.player.seekTo(0);
    } catch (e) {}
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
      try {
        this.subscription.remove();
      } catch (e) {}
      this.subscription = null;
    }
    if (this.player) {
      try {
        // Crucial: explicitly pause native audio player before removal to stop background sound
        this.player.pause();
      } catch (e) {}
      try {
        this.player.remove();
      } catch (e) {}
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
