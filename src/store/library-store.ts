import { create } from 'zustand';
import { Track } from '../domain/entities/track';
import { OpenWaveNativeBridge } from '../playback/native/openwave-native-bridge';

function syncAutoCatalog(tracks: Track[]): void {
  OpenWaveNativeBridge.syncAndroidAutoCatalog(tracks);
}

interface LibraryState {
  tracks: Track[];
  favorites: Track[];
  isScanning: boolean;
  scanProgress: number; // 0 to 100
  totalTracks: number;

  setTracks: (tracks: Track[]) => void;
  setFavorites: (favorites: Track[]) => void;
  setIsScanning: (isScanning: boolean) => void;
  setScanProgress: (scanProgress: number) => void;
  toggleFavorite: (trackId: string) => void;
  updateTrack: (trackId: string, patch: Partial<Track>) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  tracks: [],
  favorites: [],
  isScanning: false,
  scanProgress: 0,
  totalTracks: 0,

  setTracks: (tracks) => {
    syncAutoCatalog(tracks);
    set({ tracks, totalTracks: tracks.length });
  },
  setFavorites: (favorites) => set({ favorites }),
  setIsScanning: (isScanning) => set({ isScanning }),
  setScanProgress: (scanProgress) => set({ scanProgress }),

  toggleFavorite: (trackId) =>
    set((state) => {
      const updatedTracks = state.tracks.map((t) =>
        t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t
      );
      const updatedFavorites = updatedTracks.filter((t) => t.isFavorite);
      syncAutoCatalog(updatedTracks);
      return { tracks: updatedTracks, favorites: updatedFavorites };
    }),

  updateTrack: (trackId, patch) =>
    set((state) => {
      const updatedTracks = state.tracks.map((t) =>
        t.id === trackId ? { ...t, ...patch } : t
      );
      const updatedFavorites = updatedTracks.filter((t) => t.isFavorite);
      syncAutoCatalog(updatedTracks);
      return { tracks: updatedTracks, favorites: updatedFavorites };
    }),
}));

