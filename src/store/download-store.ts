import { create } from 'zustand';
import { Track } from '../domain/entities/track';

export type DownloadStatus = 'downloading' | 'paused' | 'completed' | 'error';

export interface DownloadItem {
  track: Track;
  destinationUri: string;
  progress: number; // 0.0 to 1.0
  bytesWritten: number;
  bytesTotal: number;
  status: DownloadStatus;
  error?: string;
}

interface DownloadState {
  items: Record<string, DownloadItem>;
  totalBytesUsed: number;

  upsertItem: (trackId: string, item: DownloadItem) => void;
  updateProgress: (trackId: string, bytesWritten: number, bytesTotal: number) => void;
  setStatus: (trackId: string, status: DownloadStatus, error?: string) => void;
  removeItem: (trackId: string) => void;
  setTotalBytesUsed: (bytes: number) => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  items: {},
  totalBytesUsed: 0,

  upsertItem: (trackId, item) =>
    set((state) => ({
      items: { ...state.items, [trackId]: item },
    })),

  updateProgress: (trackId, bytesWritten, bytesTotal) =>
    set((state) => {
      const existing = state.items[trackId];
      if (!existing) return state;
      const progress = bytesTotal > 0 ? Math.min(1, bytesWritten / bytesTotal) : 0;
      return {
        items: {
          ...state.items,
          [trackId]: {
            ...existing,
            bytesWritten,
            bytesTotal,
            progress,
          },
        },
      };
    }),

  setStatus: (trackId, status, error) =>
    set((state) => {
      const existing = state.items[trackId];
      if (!existing) return state;
      return {
        items: {
          ...state.items,
          [trackId]: {
            ...existing,
            status,
            error,
          },
        },
      };
    }),

  removeItem: (trackId) =>
    set((state) => {
      const next = { ...state.items };
      delete next[trackId];
      return { items: next };
    }),

  setTotalBytesUsed: (totalBytesUsed) => set({ totalBytesUsed }),
}));

