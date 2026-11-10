import { Track, RepeatMode } from '../../domain/entities/track';

export class QueueManager {
  private originalList: Track[] = [];
  private currentQueue: Track[] = [];
  private currentIndex: number = -1;
  private isShuffled: boolean = false;
  private repeatMode: RepeatMode = 'off';

  /**
   * Initializes or replaces the queue with a new list of tracks.
   */
  public setQueue(tracks: Track[], startIndex: number = 0): Track | null {
    this.originalList = [...tracks];
    this.currentQueue = [...tracks];

    if (tracks.length === 0) {
      this.currentIndex = -1;
      return null;
    }

    const validIndex = startIndex >= 0 && startIndex < tracks.length ? startIndex : 0;
    this.currentIndex = validIndex;

    if (this.isShuffled) {
      this.applyShuffle();
    }

    return this.getCurrentTrack();
  }

  /**
   * Returns the currently playing track, or null if queue is empty.
   */
  public getCurrentTrack(): Track | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.currentQueue.length) {
      return this.currentQueue[this.currentIndex];
    }
    return null;
  }

  public getQueue(): Track[] {
    return [...this.currentQueue];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  public setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
  }

  public cycleRepeatMode(): RepeatMode {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(this.repeatMode) + 1) % modes.length;
    this.repeatMode = modes[nextIdx];
    return this.repeatMode;
  }

  public getIsShuffled(): boolean {
    return this.isShuffled;
  }

  /**
   * Toggles shuffle mode.
   * When enabled, the current track is retained as position 0 and remaining tracks are randomized.
   * When disabled, the original order is restored and current index points to the playing track.
   */
  public toggleShuffle(): boolean {
    this.isShuffled = !this.isShuffled;
    const activeTrack = this.getCurrentTrack();

    if (this.isShuffled) {
      this.applyShuffle();
    } else {
      // Restore original queue order
      this.currentQueue = [...this.originalList];
      if (activeTrack) {
        const originalIndex = this.currentQueue.findIndex((t) => t.id === activeTrack.id);
        this.currentIndex = originalIndex !== -1 ? originalIndex : 0;
      }
    }

    return this.isShuffled;
  }

  /**
   * Determines and advances to the next track in the queue based on repeat mode.
   * Returns null if end of queue is reached and repeat is off.
   */
  public getNextTrack(): Track | null {
    if (this.currentQueue.length === 0) return null;

    if (this.repeatMode === 'one') {
      return this.getCurrentTrack();
    }

    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.currentQueue.length) {
      if (this.repeatMode === 'all') {
        this.currentIndex = 0;
        return this.getCurrentTrack();
      }
      return null; // End of queue
    }

    this.currentIndex = nextIndex;
    return this.getCurrentTrack();
  }

  /**
   * Moves to the previous track in the queue.
   */
  public getPreviousTrack(currentPositionMs: number = 0): Track | null {
    if (this.currentQueue.length === 0) return null;

    // Standard audio player UX: if > 3 seconds into track, repeat from beginning
    if (currentPositionMs > 3000) {
      return this.getCurrentTrack();
    }

    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
    } else if (this.repeatMode === 'all') {
      this.currentIndex = this.currentQueue.length - 1;
    }

    return this.getCurrentTrack();
  }

  /**
   * Inserts a track directly after the currently playing track.
   */
  public insertNext(track: Track): void {
    if (this.currentQueue.length === 0) {
      this.setQueue([track], 0);
      return;
    }

    const insertIndex = this.currentIndex + 1;
    this.currentQueue.splice(insertIndex, 0, track);
    this.originalList.push(track);
  }

  /**
   * Appends tracks to the end of the queue.
   */
  public appendToQueue(tracks: Track[]): void {
    if (this.currentQueue.length === 0) {
      this.setQueue(tracks, 0);
      return;
    }

    this.currentQueue.push(...tracks);
    this.originalList.push(...tracks);
  }

  /**
   * Removes a track at a specific index from the queue.
   */
  public removeAt(index: number): boolean {
    if (index < 0 || index >= this.currentQueue.length) return false;

    const removed = this.currentQueue.splice(index, 1)[0];
    const origIndex = this.originalList.findIndex((t) => t.id === removed.id);
    if (origIndex !== -1) {
      this.originalList.splice(origIndex, 1);
    }

    if (index < this.currentIndex) {
      this.currentIndex -= 1;
    } else if (index === this.currentIndex) {
      if (this.currentIndex >= this.currentQueue.length) {
        this.currentIndex = this.currentQueue.length - 1;
      }
    }

    return true;
  }

  /**
   * Reorders items in the queue (e.g. via Drag & Drop).
   */
  public reorder(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      fromIndex >= this.currentQueue.length ||
      toIndex < 0 ||
      toIndex >= this.currentQueue.length
    ) {
      return;
    }

    const currentTrack = this.getCurrentTrack();
    const [movedItem] = this.currentQueue.splice(fromIndex, 1);
    this.currentQueue.splice(toIndex, 0, movedItem);

    if (currentTrack) {
      this.currentIndex = this.currentQueue.findIndex((t) => t.id === currentTrack.id);
    }
  }

  /**
   * Fisher-Yates shuffle algorithm keeping current track in position 0.
   */
  private applyShuffle(): void {
    if (this.currentQueue.length <= 1) return;

    const activeTrack = this.getCurrentTrack();
    const remaining = this.currentQueue.filter((_, idx) => idx !== this.currentIndex);

    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    this.currentQueue = activeTrack ? [activeTrack, ...remaining] : remaining;
    this.currentIndex = 0;
  }
}
