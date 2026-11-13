import {
  IAudioEngine,
  AudioTrackMetadata,
  PlaybackStatus,
} from '../interfaces/i-audio-engine';
import { ExpoAudioAdapter } from '../engine/expo-audio-adapter';
import { Media3AudioAdapter } from '../engine/media3-audio-adapter';
import {
  OpenWaveNativeBridge,
  NativeHeadphoneEvent,
  NativeWidgetActionEvent,
  NativeRemoteCommandEvent,
} from '../native/openwave-native-bridge';
import { QueueManager } from '../queue/queue-manager';
import { Track, RepeatMode } from '../../domain/entities/track';
import { usePlayerStore } from '../../store/player-store';
import { useLibraryStore } from '../../store/library-store';
import { useSettingsStore } from '../../store/settings-store';
import { TrackDao } from '../../data/local/track-dao';
import { PlaybackSessionDao } from '../../data/local/playback-session-dao';
import { ProviderRegistry } from '../../integrations/providers/provider-registry';
import { ErrorLogger } from '../../core/errors/error-logger';

export class PlaybackService {
  private static instance: PlaybackService | null = null;
  private engine: IAudioEngine;
  private queueManager: QueueManager;
  private trackDao: TrackDao;
  private sessionDao: PlaybackSessionDao;
  private unsubscribeStatus: (() => void) | null = null;
  private unsubscribeNativeEvents: (() => void)[] = [];
  private isAdvancing: boolean = false;
  private recordedTrackId: string | null = null;
  private preloadedTrackId: string | null = null;
  private lastSessionSaveAt: number = 0;
  private lastWidgetKey: string = '';
  private sleepTimeout: ReturnType<typeof setTimeout> | null = null;

  private constructor(engine?: IAudioEngine) {
    this.engine =
      engine ||
      (OpenWaveNativeBridge.isNativeAvailable()
        ? new Media3AudioAdapter()
        : new ExpoAudioAdapter());
    this.queueManager = new QueueManager();
    this.trackDao = new TrackDao();
    this.sessionDao = new PlaybackSessionDao();
    this.setupListeners();
  }

  public static getInstance(engine?: IAudioEngine): PlaybackService {
    if (!PlaybackService.instance) {
      PlaybackService.instance = new PlaybackService(engine);
    }
    return PlaybackService.instance;
  }

  public getQueueManager(): QueueManager {
    return this.queueManager;
  }

  public getAudioEngine(): IAudioEngine {
    return this.engine;
  }

  private toEngineMetadata(track: Track): AudioTrackMetadata {
    return {
      title: track.title,
      artist: track.artistName || 'Artista desconocido',
      albumTitle: track.albumTitle || undefined,
      artworkUrl: track.artworkUri || undefined,
    };
  }

  private setupListeners(): void {
    if (this.unsubscribeStatus) {
      this.unsubscribeStatus();
    }
    this.unsubscribeNativeEvents.forEach((u) => u());
    this.unsubscribeNativeEvents = [];

    this.unsubscribeStatus = this.engine.onStatusUpdate((status: PlaybackStatus) => {
      this.handleStatusUpdate(status);
    });

    this.unsubscribeNativeEvents.push(
      OpenWaveNativeBridge.subscribeEvent<NativeHeadphoneEvent>(
        'onHeadphoneEvent',
        (evt) => {
          const settings = useSettingsStore.getState();
          const player = usePlayerStore.getState();
          if (!evt.connected && settings.pauseOnHeadphoneDisconnect && player.isPlaying) {
            this.engine.pause().catch(() => {});
            player.setIsPlaying(false);
            this.persistSessionSnapshot().catch(() => {});
          } else if (
            evt.connected &&
            settings.resumeOnHeadphoneConnect &&
            player.currentTrack &&
            !player.isPlaying
          ) {
            this.engine.play().catch(() => {});
            player.setIsPlaying(true);
          }
        }
      ),
      OpenWaveNativeBridge.subscribeEvent<NativeWidgetActionEvent>(
        'onWidgetAction',
        (evt) => {
          if (evt.action === 'prev') {
            this.skipPrevious().catch(() => {});
          } else if (evt.action === 'play_pause') {
            this.togglePlayPause().catch(() => {});
          } else if (evt.action === 'next') {
            this.skipNext().catch(() => {});
          }
        }
      ),
      OpenWaveNativeBridge.subscribeEvent<NativeRemoteCommandEvent>(
        'onRemoteCommand',
        (evt) => {
          if (evt.command === 'prev') {
            this.skipPrevious().catch(() => {});
          } else if (evt.command === 'next') {
            this.skipNext().catch(() => {});
          }
        }
      )
    );
  }

  private syncNativeWidget(isPlayingOverride?: boolean): void {
    const store = usePlayerStore.getState();
    const track = store.currentTrack;
    const isPlaying = isPlayingOverride ?? store.isPlaying;
    const title = track?.title || 'OPENWAVE';
    const artist = track?.artistName || 'Toca para abrir tu música';
    const artworkUri = track?.artworkUri || '';
    const key = `${track?.id || 'none'}|${title}|${artist}|${artworkUri}|${isPlaying}`;
    if (key === this.lastWidgetKey) return;
    this.lastWidgetKey = key;
    OpenWaveNativeBridge.updateWidgetState({
      title,
      artist,
      artworkUri: artworkUri || undefined,
      isPlaying,
    });
  }

  private async handleStatusUpdate(status: PlaybackStatus): Promise<void> {
    const store = usePlayerStore.getState();
    const activeTrack = store.currentTrack;

    store.setIsPlaying(status.isPlaying);
    store.setIsBuffering(Boolean(status.isBuffering));
    store.setPosition(status.positionMs);
    this.syncNativeWidget(status.isPlaying);

    if (status.error) {
      store.setPlaybackError(status.error);
    }

    if (status.durationMs > 0 && status.durationMs !== store.durationMs) {
      store.setDuration(status.durationMs);
    }

    // Record playback count & history once a track crosses 5s of playback (or finishes shorter tracks)
    if (
      activeTrack &&
      this.recordedTrackId !== activeTrack.id &&
      ((status.isPlaying && status.positionMs >= 5000) || status.didJustFinish)
    ) {
      this.recordedTrackId = activeTrack.id;
      this.recordTrackPlay(activeTrack, status.positionMs).catch(() => {});
    }

    // Periodic throttled session snapshot (every 5 seconds while playing)
    if (status.isPlaying && Date.now() - this.lastSessionSaveAt >= 5000) {
      this.persistSessionSnapshot(status.positionMs).catch(() => {});
    }

    // Sleep timer countdown expiration safety check
    if (store.sleepTimerEndTime && Date.now() >= store.sleepTimerEndTime) {
      await this.pauseForSleepTimer();
      return;
    }

    // Gapless preloading: preload upcoming track during final 8 seconds
    const settings = useSettingsStore.getState();
    if (
      settings.gaplessPlayback &&
      status.isPlaying &&
      status.durationMs > 12000 &&
      status.durationMs - status.positionMs <= 8000
    ) {
      const upcomingIndex = this.queueManager.getCurrentIndex() + 1;
      const q = this.queueManager.getQueue();
      const upcoming = upcomingIndex < q.length ? q[upcomingIndex] : null;
      if (upcoming && this.preloadedTrackId !== upcoming.id) {
        this.preloadedTrackId = upcoming.id;
        this.engine.preloadTrack?.(upcoming.uri).catch(() => {});
      }
    }

    // Auto-advance or stop at end of track
    if (status.didJustFinish && !this.isAdvancing) {
      if (store.sleepAfterCurrentTrack) {
        await this.pauseForSleepTimer();
        return;
      }

      this.isAdvancing = true;
      try {
        await this.skipNext();
      } finally {
        this.isAdvancing = false;
      }
    }
  }

  private async recordTrackPlay(track: Track, positionMs: number): Promise<void> {
    try {
      await this.trackDao.recordPlayback(track.id, positionMs);
      const nextCount = (track.playCount || 0) + 1;
      const now = Date.now();
      useLibraryStore.getState().updateTrack(track.id, {
        playCount: nextCount,
        lastPlayed: now,
      });
      usePlayerStore.getState().updateTrackInQueue(track.id, {
        playCount: nextCount,
        lastPlayed: now,
      });
    } catch (err) {
      // Ignored if DB unavailable (e.g. unit tests)
    }
  }

  public async persistSessionSnapshot(overridePositionMs?: number): Promise<void> {
    this.lastSessionSaveAt = Date.now();
    const store = usePlayerStore.getState();
    try {
      await this.sessionDao.saveSession({
        trackId: store.currentTrack?.id || null,
        queueIds: this.queueManager.getQueue().map((t) => t.id),
        positionMs: overridePositionMs ?? store.positionMs,
        shuffle: this.queueManager.getIsShuffled(),
        repeatMode: this.queueManager.getRepeatMode(),
        playbackSpeed: store.playbackSpeed,
        volume: store.volume,
      });
    } catch {
      // Safe no-op in mocked environments
    }
  }

  /**
   * Restores last saved queue, track, speed, volume and exact playback position without auto-playing.
   */
  public async restoreSession(availableTracks: Track[]): Promise<boolean> {
    if (availableTracks.length === 0) return false;

    try {
      const saved = await this.sessionDao.getSession();
      if (!saved || !saved.trackId) return false;

      const trackMap = new Map(availableTracks.map((t) => [t.id, t]));
      const restoredQueue = saved.queueIds
        .map((id) => trackMap.get(id))
        .filter((t): t is Track => Boolean(t));

      const targetTrack = trackMap.get(saved.trackId);
      if (!targetTrack) return false;

      const finalQueue = restoredQueue.length > 0 ? restoredQueue : [targetTrack];
      const startIndex = Math.max(
        0,
        finalQueue.findIndex((t) => t.id === targetTrack.id)
      );

      this.queueManager.setRepeatMode(saved.repeatMode);
      this.queueManager.setQueue(finalQueue, startIndex);
      if (saved.shuffle && !this.queueManager.getIsShuffled()) {
        this.queueManager.toggleShuffle();
      }

      const store = usePlayerStore.getState();
      store.setShuffle(this.queueManager.getIsShuffled());
      store.setRepeatMode(saved.repeatMode);
      store.setVolume(saved.volume);
      store.setPlaybackSpeed(saved.playbackSpeed);
      store.setQueue(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());
      store.setTrack(targetTrack);
      store.setPosition(saved.positionMs);
      store.setIsPlaying(false);

      await this.engine.setVolume(saved.volume);
      await this.engine.setPlaybackSpeed(saved.playbackSpeed);
      await this.engine.load(targetTrack.uri, false, this.toEngineMetadata(targetTrack));
      if (saved.positionMs > 0) {
        await this.engine.seekTo(saved.positionMs);
        store.setPosition(saved.positionMs);
      }
      store.setIsPlaying(false);
      return true;
    } catch (err) {
      console.warn('Could not restore previous playback session:', err);
      return false;
    }
  }

  private async loadAndPlayResolvedTrack(track: Track, shouldPlay: boolean = true): Promise<void> {
    const store = usePlayerStore.getState();
    this.recordedTrackId = null;
    store.setPlaybackError(null);
    store.setIsBuffering(track.sourceType === 'stream');
    store.setQueue(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());
    store.setTrack(track);
    store.setPosition(0);

    try {
      const resolved = await ProviderRegistry.getInstance().resolveTrackForPlayback(
        track,
        store.streamQuality
      );
      if (resolved.uri !== track.uri) {
        store.updateTrackInQueue(track.id, { uri: resolved.uri, bitrate: resolved.bitrate });
      }
      await this.engine.load(resolved.uri, shouldPlay, this.toEngineMetadata(resolved));
      store.setIsPlaying(shouldPlay);
      store.setIsBuffering(false);
      this.applySoftwareFadeInIfEnabled(store.volume).catch(() => {});
      this.persistSessionSnapshot(0).catch(() => {});
    } catch (firstErr: any) {
      if (track.sourceType === 'stream') {
        try {
          await new Promise((r) => setTimeout(r, 900));
          const retryResolved = await ProviderRegistry.getInstance().resolveTrackForPlayback(
            track,
            'standard'
          );
          await this.engine.load(
            retryResolved.uri,
            shouldPlay,
            this.toEngineMetadata(retryResolved)
          );
          store.setIsPlaying(shouldPlay);
          store.setIsBuffering(false);
          return;
        } catch (retryErr: any) {
          ErrorLogger.log('PlaybackService.stream', retryErr?.message || 'Stream error').catch(() => {});
          store.setIsPlaying(false);
          store.setIsBuffering(false);
          store.setPlaybackError(
            retryErr?.message || 'Error de conexión al reproducir pista online.'
          );
          return;
        }
      }

      ErrorLogger.log('PlaybackService.local', firstErr?.message || 'Load error').catch(() => {});
      console.error('Playback error loading track:', track.uri, firstErr);
      store.setIsPlaying(false);
      store.setIsBuffering(false);
      store.setPlaybackError(
        firstErr?.message || 'El archivo de audio no se pudo abrir o está dañado.'
      );
    }
  }

  private async applySoftwareFadeInIfEnabled(targetVol: number): Promise<void> {
    const crossfadeSec = useSettingsStore.getState().crossfadeSeconds;
    if (!crossfadeSec || crossfadeSec <= 0) return;

    const fadeMs = Math.min(crossfadeSec * 1000, 4000);
    const steps = 6;
    const stepMs = fadeMs / steps;
    await this.engine.setVolume(Math.min(targetVol, targetVol * 0.25));
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, stepMs));
      if (!usePlayerStore.getState().isPlaying) break;
      await this.engine.setVolume((targetVol * i) / steps);
    }
  }

  /**
   * Starts playback of a specific track, optionally providing a full queue context.
   */
  public async playTrack(track: Track, newQueue?: Track[], startIndex?: number): Promise<void> {
    if (newQueue && newQueue.length > 0) {
      const idx =
        startIndex !== undefined ? startIndex : newQueue.findIndex((t) => t.id === track.id);
      this.queueManager.setQueue(newQueue, idx >= 0 ? idx : 0);
    } else {
      const currentQueue = this.queueManager.getQueue();
      const existingIdx = currentQueue.findIndex((t) => t.id === track.id);
      if (existingIdx >= 0) {
        this.queueManager.setQueue(currentQueue, existingIdx);
      } else {
        this.queueManager.setQueue([track], 0);
      }
    }

    const current = this.queueManager.getCurrentTrack() || track;
    await this.loadAndPlayResolvedTrack(current, true);
  }

  public async togglePlayPause(): Promise<void> {
    const store = usePlayerStore.getState();
    const currentTrack = store.currentTrack;

    if (!currentTrack) {
      const queue = this.queueManager.getQueue();
      if (queue.length > 0) {
        await this.playTrack(queue[0]);
      }
      return;
    }

    if (store.isPlaying) {
      await this.engine.pause();
      store.setIsPlaying(false);
      this.persistSessionSnapshot().catch(() => {});
    } else {
      await this.engine.play();
      store.setIsPlaying(true);
    }
  }

  public async skipNext(): Promise<void> {
    const nextTrack = this.queueManager.getNextTrack();
    const store = usePlayerStore.getState();

    if (!nextTrack) {
      // Check Auto-Play Similar Songs when queue finishes cleanly
      const autoSimilar = useSettingsStore.getState().autoPlaySimilar;
      const current = store.currentTrack;
      if (autoSimilar && current) {
        const all = useLibraryStore.getState().tracks;
        const queuedIds = new Set(this.queueManager.getQueue().map((t) => t.id));
        const candidates = all.filter(
          (t) =>
            !queuedIds.has(t.id) &&
            t.id !== current.id &&
            ((current.genre && t.genre === current.genre) ||
              (current.artistName && t.artistName === current.artistName))
        );
        const fallback = candidates.length > 0 ? candidates : all.filter((t) => !queuedIds.has(t.id));
        if (fallback.length > 0) {
          const picked = fallback[Math.floor(Math.random() * fallback.length)];
          this.appendToQueue([picked]);
          const nextAuto = this.queueManager.getNextTrack();
          if (nextAuto) {
            await this.loadAndPlayResolvedTrack(nextAuto, true);
            return;
          }
        }
      }

      await this.engine.stop();
      store.setIsPlaying(false);
      this.persistSessionSnapshot(0).catch(() => {});
      return;
    }

    await this.loadAndPlayResolvedTrack(nextTrack, true);
  }

  public async skipPrevious(): Promise<void> {
    const store = usePlayerStore.getState();
    const prevTrack = this.queueManager.getPreviousTrack(store.positionMs);

    if (!prevTrack) {
      await this.engine.seekTo(0);
      store.setPosition(0);
      this.persistSessionSnapshot(0).catch(() => {});
      return;
    }

    await this.loadAndPlayResolvedTrack(prevTrack, true);
  }

  public async seekTo(positionMs: number): Promise<void> {
    const clamped = Math.max(0, positionMs);
    await this.engine.seekTo(clamped);
    usePlayerStore.getState().setPosition(clamped);
    this.persistSessionSnapshot(clamped).catch(() => {});
  }

  public async seekRelative(offsetMs: number): Promise<void> {
    const store = usePlayerStore.getState();
    const maxDuration = store.durationMs > 0 ? store.durationMs : Infinity;
    const newPos = Math.max(0, Math.min(maxDuration, store.positionMs + offsetMs));
    await this.seekTo(newPos);
  }

  public toggleShuffle(): boolean {
    const isShuffled = this.queueManager.toggleShuffle();
    const store = usePlayerStore.getState();
    store.setShuffle(isShuffled);
    store.syncQueueState(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());
    this.persistSessionSnapshot().catch(() => {});
    return isShuffled;
  }

  public cycleRepeatMode(): RepeatMode {
    const mode = this.queueManager.cycleRepeatMode();
    const store = usePlayerStore.getState();
    store.setRepeatMode(mode);
    this.persistSessionSnapshot().catch(() => {});
    return mode;
  }

  public async setVolume(volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, volume));
    await this.engine.setVolume(clamped);
    usePlayerStore.getState().setVolume(clamped);
    this.persistSessionSnapshot().catch(() => {});
  }

  public async setPlaybackSpeed(speed: number): Promise<void> {
    const clamped = Math.max(0.25, Math.min(2.0, speed));
    await this.engine.setPlaybackSpeed(clamped);
    usePlayerStore.getState().setPlaybackSpeed(clamped);
    this.persistSessionSnapshot().catch(() => {});
  }

  public insertNext(track: Track): void {
    const wasEmpty = this.queueManager.getQueue().length === 0;
    this.queueManager.insertNext(track);
    if (wasEmpty) {
      this.playTrack(track).catch(() => {});
      return;
    }
    usePlayerStore
      .getState()
      .syncQueueState(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());
    this.persistSessionSnapshot().catch(() => {});
  }

  public appendToQueue(tracks: Track[]): void {
    const wasEmpty = this.queueManager.getQueue().length === 0;
    this.queueManager.appendToQueue(tracks);
    if (wasEmpty && tracks.length > 0) {
      this.playTrack(tracks[0], tracks, 0).catch(() => {});
      return;
    }
    usePlayerStore
      .getState()
      .syncQueueState(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());
    this.persistSessionSnapshot().catch(() => {});
  }

  public reorderQueue(fromIndex: number, toIndex: number): void {
    this.queueManager.reorder(fromIndex, toIndex);
    usePlayerStore
      .getState()
      .syncQueueState(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());
    this.persistSessionSnapshot().catch(() => {});
  }

  public removeFromQueue(index: number): void {
    const wasCurrent = index === this.queueManager.getCurrentIndex();
    this.queueManager.removeAt(index);
    const updated = this.queueManager.getQueue();
    const nextIndex = this.queueManager.getCurrentIndex();
    usePlayerStore.getState().syncQueueState(updated, nextIndex);

    if (updated.length === 0) {
      this.clearQueue().catch(() => {});
      return;
    }

    if (wasCurrent && nextIndex >= 0 && nextIndex < updated.length) {
      const nextTrack = updated[nextIndex];
      usePlayerStore.getState().setTrack(nextTrack);
      this.engine.load(nextTrack.uri, usePlayerStore.getState().isPlaying, this.toEngineMetadata(nextTrack)).catch(() => {});
    }
    this.persistSessionSnapshot().catch(() => {});
  }

  public async clearQueue(): Promise<void> {
    this.queueManager.setQueue([], 0);
    await this.engine.unload();
    const store = usePlayerStore.getState();
    store.syncQueueState([], -1);
    store.setTrack(null);
    store.setIsPlaying(false);
    this.syncNativeWidget(false);
    this.persistSessionSnapshot(0).catch(() => {});
  }

  public updateActiveTrackMetadata(track: Track): void {
    const current = usePlayerStore.getState().currentTrack;
    if (current && current.id === track.id) {
      this.engine.updateMetadata?.(this.toEngineMetadata(track));
      this.syncNativeWidget();
    }
  }

  public startSleepTimer(option: number | 'end_of_track'): void {
    this.cancelSleepTimer();
    const store = usePlayerStore.getState();

    if (option === 'end_of_track') {
      store.setSleepTimer(null, true);
      return;
    }

    if (option > 0) {
      const delayMs = option * 60 * 1000;
      const endTime = Date.now() + delayMs;
      store.setSleepTimer(endTime, false);
      this.sleepTimeout = setTimeout(() => {
        this.pauseForSleepTimer().catch(() => {});
      }, delayMs);
    }
  }

  public cancelSleepTimer(): void {
    if (this.sleepTimeout) {
      clearTimeout(this.sleepTimeout);
      this.sleepTimeout = null;
    }
    usePlayerStore.getState().setSleepTimer(null, false);
  }

  private async pauseForSleepTimer(): Promise<void> {
    this.cancelSleepTimer();
    const store = usePlayerStore.getState();
    if (store.isPlaying) {
      await this.engine.pause();
      store.setIsPlaying(false);
      this.persistSessionSnapshot().catch(() => {});
    }
  }

  public destroy(): void {
    this.cancelSleepTimer();
    if (this.unsubscribeStatus) {
      this.unsubscribeStatus();
      this.unsubscribeStatus = null;
    }
    this.unsubscribeNativeEvents.forEach((u) => u());
    this.unsubscribeNativeEvents = [];
    this.engine.unload();
    PlaybackService.instance = null;
  }
}
