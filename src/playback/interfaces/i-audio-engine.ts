export interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isBuffering: boolean;
  didJustFinish: boolean;
  error?: string | null;
}

export type PlaybackStatusListener = (status: PlaybackStatus) => void;

export interface IAudioEngine {
  /**
   * Loads an audio track from a local file URI or remote URL.
   */
  load(uri: string, shouldPlayImmediately?: boolean): Promise<void>;

  /**
   * Starts or resumes playback.
   */
  play(): Promise<void>;

  /**
   * Pauses active playback without releasing the audio player.
   */
  pause(): Promise<void>;

  /**
   * Stops playback and resets the position to 0.
   */
  stop(): Promise<void>;

  /**
   * Seeks to a specific timestamp in milliseconds.
   */
  seekTo(positionMs: number): Promise<void>;

  /**
   * Sets the playback volume (0.0 to 1.0).
   */
  setVolume(volume: number): Promise<void>;

  /**
   * Sets the playback rate/speed (e.g. 1.0 = normal, 1.25, 1.5, etc.).
   */
  setPlaybackSpeed(speed: number): Promise<void>;

  /**
   * Releases resources, unloading the current audio asset from memory.
   */
  unload(): Promise<void>;

  /**
   * Subscribes a listener to playback status changes (position, play/pause, finish).
   * Returns an unsubscribe function.
   */
  onStatusUpdate(listener: PlaybackStatusListener): () => void;
}
