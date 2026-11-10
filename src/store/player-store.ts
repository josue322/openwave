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

  // Actions
  setTrack: (track: Track | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPosition: (positionMs: number) => void;
  setDuration: (durationMs: number) => void;
  setQueue: (queue: Track[], startIndex?: number) => void;
  togglePlayPause: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  setVolume: (volume: number) => void;
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

  setTrack: (track) =>
    set({
      currentTrack: track,
      positionMs: 0,
      durationMs: track ? track.duration : 0,
    }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
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

  togglePlayPause: () => {
    const { isPlaying, currentTrack } = get();
    if (!currentTrack) return;
    set({ isPlaying: !isPlaying });
  },

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  cycleRepeatMode: () =>
    set((state) => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const nextIndex = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      return { repeatMode: modes[nextIndex] };
    }),

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
}));

