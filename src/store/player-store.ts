import { create } from 'zustand';
import { Track, RepeatMode } from '../domain/entities/track';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  queue: Track[];
  queueIndex: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
  playbackSpeed: number;
  sleepTimerEndTime: number | null;
  sleepAfterCurrentTrack: boolean;
  isBuffering: boolean;
  streamQuality: 'high' | 'standard';
  playbackError: string | null;

  // Actions
  setTrack: (track: Track | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsBuffering: (isBuffering: boolean) => void;
  setStreamQuality: (quality: 'high' | 'standard') => void;
  setPlaybackError: (error: string | null) => void;
  setPosition: (positionMs: number) => void;
  setDuration: (durationMs: number) => void;
  setQueue: (queue: Track[], startIndex?: number) => void;
  syncQueueState: (queue: Track[], queueIndex: number) => void;
  togglePlayPause: () => void;
  toggleShuffle: () => void;
  setShuffle: (shuffle: boolean) => void;
  cycleRepeatMode: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  skipNext: () => void;
  skipPrevious: () => void;
  setVolume: (volume: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSleepTimer: (endTimeMs: number | null, afterCurrent?: boolean) => void;
  updateTrackInQueue: (trackId: string, patch: Partial<Track>) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  positionMs: 0,
  durationMs: 0,
  queue: [],
  queueIndex: -1,
  shuffle: false,
  repeatMode: 'off',
  volume: 1.0,
  playbackSpeed: 1.0,
  sleepTimerEndTime: null,
  sleepAfterCurrentTrack: false,
  isBuffering: false,
  streamQuality: 'high',
  playbackError: null,

  setTrack: (track) =>
    set({
      currentTrack: track,
      positionMs: 0,
      durationMs: track ? track.duration : 0,
    }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsBuffering: (isBuffering) => set({ isBuffering }),
  setStreamQuality: (streamQuality) => set({ streamQuality }),
  setPlaybackError: (playbackError) => set({ playbackError }),
  setPosition: (positionMs) => set({ positionMs }),
  setDuration: (durationMs) => set({ durationMs }),

  setQueue: (queue, startIndex = 0) => {
    const validIndex = startIndex >= 0 && startIndex < queue.length ? startIndex : 0;
    const initialTrack = queue[validIndex] ?? null;
    set({
      queue,
      queueIndex: validIndex,
      currentTrack: initialTrack,
      positionMs: 0,
      durationMs: initialTrack?.duration ?? 0,
    });
  },

  syncQueueState: (queue, queueIndex) => {
    set({ queue, queueIndex });
  },

  togglePlayPause: () => {
    const { isPlaying, currentTrack } = get();
    if (!currentTrack) return;
    set({ isPlaying: !isPlaying });
  },

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  setShuffle: (shuffle) => set({ shuffle }),

  cycleRepeatMode: () =>
    set((state) => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const nextIndex = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      return { repeatMode: modes[nextIndex] };
    }),
  setRepeatMode: (repeatMode) => set({ repeatMode }),

  skipNext: () => {
    const { queue, queueIndex, repeatMode } = get();
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      set({ positionMs: 0, isPlaying: true });
      return;
    }

    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    set({
      queueIndex: nextIndex,
      currentTrack: nextTrack,
      positionMs: 0,
      durationMs: nextTrack.duration,
      isPlaying: true,
    });
  },

  skipPrevious: () => {
    const { queue, queueIndex, positionMs } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart the current track
    if (positionMs > 3000) {
      set({ positionMs: 0 });
      return;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : 0;
    const prevTrack = queue[prevIndex];
    set({
      queueIndex: prevIndex,
      currentTrack: prevTrack,
      positionMs: 0,
      durationMs: prevTrack.duration,
      isPlaying: true,
    });
  },

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: Math.max(0.25, Math.min(2.0, speed)) }),
  setSleepTimer: (endTimeMs, afterCurrent = false) =>
    set({ sleepTimerEndTime: endTimeMs, sleepAfterCurrentTrack: afterCurrent }),
  updateTrackInQueue: (trackId, patch) =>
    set((state) => ({
      currentTrack:
        state.currentTrack && state.currentTrack.id === trackId
          ? { ...state.currentTrack, ...patch }
          : state.currentTrack,
      queue: state.queue.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
    })),
}));

