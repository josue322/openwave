import { Platform } from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  requestNotificationPermissionsAsync,
  preload,
  AudioPlayer,
  AudioStatus,
} from 'expo-audio';
import {
  IAudioEngine,
  AudioTrackMetadata,
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
  private currentVolume: number = 1.0;
  private currentSpeed: number = 1.0;
  private lockScreenActive: boolean = false;

  private async configureAudioMode(): Promise<void> {
    if (this.isConfigured) return;
    try {
      if (Platform.OS === 'android' && typeof requestNotificationPermissionsAsync === 'function') {
        await requestNotificationPermissionsAsync().catch(() => {});
      }

      await setAudioModeAsync({
        shouldPlayInBackground: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      this.isConfigured = true;
    } catch (err) {
      console.warn('Failed to configure audio mode for background playback:', err);
    }
  }

  private sanitizeMetadata(metadata?: AudioTrackMetadata) {
    if (!metadata) return undefined;
    const artwork =
      metadata.artworkUrl &&
      (metadata.artworkUrl.startsWith('http://') ||
        metadata.artworkUrl.startsWith('https://') ||
        metadata.artworkUrl.startsWith('file://'))
        ? metadata.artworkUrl
        : undefined;

    return {
      title: metadata.title || 'OpenWave',
      artist: metadata.artist || 'Artista desconocido',
      albumTitle: metadata.albumTitle || undefined,
      artworkUrl: artwork,
    };
  }

  private isRunningInExpoGo(): boolean {
    try {
      const g = globalThis as any;
      if (g?.expo?.modules?.ExpoGo) {
        return true;
      }
      if (typeof process !== 'undefined' && process.env?.JEST_WORKER_ID) {
        return false;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const constantsMod = require('expo-constants');
      const constants = constantsMod?.default ?? constantsMod;
      return (
        constants?.appOwnership === 'expo' ||
        constants?.executionEnvironment === 'storeClient'
      );
    } catch {
      return false;
    }
  }

  private applyLockScreen(metadata?: AudioTrackMetadata): void {
    if (!this.player) return;
    // Expo Go does not include the app.json `enableBackgroundPlayback` service manifest entry;
    // calling setActiveForLockScreen(true) triggers native jsLogger.error red-screen overlays.
    if (Platform.OS === 'android' && this.isRunningInExpoGo()) {
      return;
    }
    const cleanMeta = this.sanitizeMetadata(metadata);
    try {
      if (!this.lockScreenActive && typeof this.player.setActiveForLockScreen === 'function') {
        this.player.setActiveForLockScreen(true, cleanMeta, {
          showSeekForward: true,
          showSeekBackward: true,
          showNextTrack: true,
          showPreviousTrack: true,
          seekForwardIntervalSeconds: 10,
          seekBackwardIntervalSeconds: 10,
        });
        this.lockScreenActive = true;
      } else if (
        cleanMeta &&
        this.lockScreenActive &&
        typeof this.player.updateLockScreenMetadata === 'function'
      ) {
        this.player.updateLockScreenMetadata(cleanMeta);
      }
    } catch (err) {
      console.warn('LockScreen metadata configuration skipped:', err);
    }
  }

  public updateMetadata(metadata: AudioTrackMetadata): void {
    if (!this.player || !this.lockScreenActive) return;
    if (Platform.OS === 'android' && this.isRunningInExpoGo()) return;
    const cleanMeta = this.sanitizeMetadata(metadata);
    if (!cleanMeta) return;
    try {
      if (typeof this.player.updateLockScreenMetadata === 'function') {
        this.player.updateLockScreenMetadata(cleanMeta);
      }
    } catch (err) {
      console.warn('Failed to update lock screen metadata:', err);
    }
  }

  public async load(
    uri: string,
    shouldPlayImmediately: boolean = false,
    metadata?: AudioTrackMetadata
  ): Promise<void> {
    const token = ++this.loadToken;
    await this.configureAudioMode();

    // If the SAME track is already loaded, restart it from 0 ("al presionar la musica tiene que reiniciar")
    if (this.player && this.currentUri === uri) {
      try {
        await this.player.seekTo(0);
        this.applyLockScreen(metadata);
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
      // Create new audio player keeping audio session active across temporary pauses
      const newPlayer = createAudioPlayer(uri, {
        updateInterval: 250,
        keepAudioSessionActive: true,
      });

      if (token !== this.loadToken) {
        // Obsolete player created during fast clicking
        try {
          newPlayer.pause();
          newPlayer.remove();
        } catch (e) {}
        return;
      }

      this.player = newPlayer;
      this.player.volume = this.currentVolume;
      if (this.currentSpeed !== 1.0) {
        try {
          this.player.setPlaybackRate(this.currentSpeed);
        } catch (e) {}
      }

      this.applyLockScreen(metadata);

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
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (!this.player) return;
    this.player.volume = this.currentVolume;
  }

  public async setPlaybackSpeed(speed: number): Promise<void> {
    this.currentSpeed = Math.max(0.25, Math.min(2.0, speed));
    if (!this.player) return;
    this.player.setPlaybackRate(this.currentSpeed);
  }

  public async preloadTrack(uri: string): Promise<void> {
    if (!uri || uri.startsWith('content://')) return;
    try {
      if (typeof preload === 'function') {
        await preload(uri, { preferredForwardBufferDuration: 15 });
      }
    } catch {
      // Preload optimization is strictly best-effort
    }
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
        if (this.lockScreenActive && typeof this.player.clearLockScreenControls === 'function') {
          this.player.clearLockScreenControls();
        }
      } catch (e) {}
      this.lockScreenActive = false;

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
