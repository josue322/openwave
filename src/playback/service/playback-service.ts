import { IAudioEngine, PlaybackStatus } from '../interfaces/i-audio-engine';
import { ExpoAudioAdapter } from '../engine/expo-audio-adapter';
import { QueueManager } from '../queue/queue-manager';
import { Track, RepeatMode } from '../../domain/entities/track';
import { usePlayerStore } from '../../store/player-store';

export class PlaybackService {
  private static instance: PlaybackService | null = null;
  private engine: IAudioEngine;
  private queueManager: QueueManager;
  private unsubscribeStatus: (() => void) | null = null;
  private isAdvancing: boolean = false;

  private constructor(engine?: IAudioEngine) {
    this.engine = engine || new ExpoAudioAdapter();
    this.queueManager = new QueueManager();
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

  private setupListeners(): void {
    if (this.unsubscribeStatus) {
      this.unsubscribeStatus();
    }

    this.unsubscribeStatus = this.engine.onStatusUpdate((status: PlaybackStatus) => {
      this.handleStatusUpdate(status);
    });
  }

  private async handleStatusUpdate(status: PlaybackStatus): Promise<void> {
    const store = usePlayerStore.getState();

    store.setIsPlaying(status.isPlaying);
    store.setPosition(status.positionMs);

    if (status.durationMs > 0 && status.durationMs !== store.durationMs) {
      store.setDuration(status.durationMs);
    }

    // Auto-advance to next track when playback finishes
    if (status.didJustFinish && !this.isAdvancing) {
      this.isAdvancing = true;
      try {
        await this.skipNext();
      } finally {
        this.isAdvancing = false;
      }
    }
  }

  /**
   * Starts playback of a specific track, optionally providing a full queue context.
   */
  public async playTrack(track: Track, newQueue?: Track[], startIndex?: number): Promise<void> {
    if (newQueue && newQueue.length > 0) {
      const idx = startIndex !== undefined ? startIndex : newQueue.findIndex((t) => t.id === track.id);
      this.queueManager.setQueue(newQueue, idx >= 0 ? idx : 0);
    } else if (this.queueManager.getQueue().length === 0) {
      this.queueManager.setQueue([track], 0);
    }

    const current = this.queueManager.getCurrentTrack() || track;
    const store = usePlayerStore.getState();

    store.setTrack(current);
    store.setQueue(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());

    try {
      await this.engine.load(current.uri, true);
      store.setIsPlaying(true);
    } catch (err) {
      console.error('Playback error loading track:', current.uri, err);
      store.setIsPlaying(false);
    }
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
    } else {
      await this.engine.play();
      store.setIsPlaying(true);
    }
  }

  public async skipNext(): Promise<void> {
    const nextTrack = this.queueManager.getNextTrack();
    const store = usePlayerStore.getState();

    if (!nextTrack) {
      await this.engine.stop();
      store.setIsPlaying(false);
      return;
    }

    store.setTrack(nextTrack);
    store.setQueue(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());

    try {
      await this.engine.load(nextTrack.uri, true);
      store.setIsPlaying(true);
    } catch (err) {
      console.error('Error skipping to next track:', err);
      store.setIsPlaying(false);
    }
  }

  public async skipPrevious(): Promise<void> {
    const store = usePlayerStore.getState();
    const prevTrack = this.queueManager.getPreviousTrack(store.positionMs);

    if (!prevTrack) {
      await this.engine.seekTo(0);
      store.setPosition(0);
      return;
    }

    store.setTrack(prevTrack);
    store.setQueue(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());

    try {
      await this.engine.load(prevTrack.uri, true);
      store.setIsPlaying(true);
    } catch (err) {
      console.error('Error skipping to previous track:', err);
      store.setIsPlaying(false);
    }
  }

  public async seekTo(positionMs: number): Promise<void> {
    await this.engine.seekTo(positionMs);
    usePlayerStore.getState().setPosition(positionMs);
  }

  public async seekRelative(offsetMs: number): Promise<void> {
    const store = usePlayerStore.getState();
    const newPos = Math.max(0, Math.min(store.durationMs || Infinity, store.positionMs + offsetMs));
    await this.seekTo(newPos);
  }

  public toggleShuffle(): boolean {
    const isShuffled = this.queueManager.toggleShuffle();
    const store = usePlayerStore.getState();
    store.toggleShuffle();
    store.setQueue(this.queueManager.getQueue(), this.queueManager.getCurrentIndex());
    return isShuffled;
  }

  public cycleRepeatMode(): RepeatMode {
    const mode = this.queueManager.cycleRepeatMode();
    const store = usePlayerStore.getState();
    store.cycleRepeatMode();
    return mode;
  }

  public async setVolume(volume: number): Promise<void> {
    await this.engine.setVolume(volume);
    usePlayerStore.getState().setVolume(volume);
  }

  public destroy(): void {
    if (this.unsubscribeStatus) {
      this.unsubscribeStatus();
      this.unsubscribeStatus = null;
    }
    this.engine.unload();
    PlaybackService.instance = null;
  }
}
