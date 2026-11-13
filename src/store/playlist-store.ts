import { create } from 'zustand';
import { Playlist, PlaylistWithTracks } from '../domain/entities/playlist';
import { PlaylistDao } from '../data/local/playlist-dao';
import { Track } from '../domain/entities/track';

export type SmartPlaylistRuleType =
  | 'favorites'
  | 'recent_added'
  | 'recent_played'
  | 'most_played'
  | 'unplayed';

export interface SmartPlaylistConfig {
  id: SmartPlaylistRuleType;
  name: string;
  description: string;
}

export const SYSTEM_SMART_PLAYLISTS: SmartPlaylistConfig[] = [
  {
    id: 'favorites',
    name: 'Mis Favoritas',
    description: 'Todas las canciones marcadas con corazón',
  },
  {
    id: 'most_played',
    name: 'Más Reproducidas',
    description: 'Tu Top canciones más escuchadas',
  },
  {
    id: 'recent_added',
    name: 'Añadidas Recientemente',
    description: 'Últimas incorporaciones a tu biblioteca',
  },
  {
    id: 'recent_played',
    name: 'Reproducidas Recientemente',
    description: 'Canciones que escuchaste hace poco',
  },
  {
    id: 'unplayed',
    name: 'Sin Reproducir',
    description: 'Joyas ocultas aún por descubrir',
  },
];

export function evaluateSmartPlaylist(rule: SmartPlaylistRuleType, tracks: Track[]): Track[] {
  switch (rule) {
    case 'favorites':
      return tracks.filter((t) => t.isFavorite);
    case 'most_played':
      return [...tracks]
        .filter((t) => (t.playCount || 0) > 0)
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 50);
    case 'recent_added':
      return [...tracks].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0)).slice(0, 50);
    case 'recent_played':
      return [...tracks]
        .filter((t) => Boolean(t.lastPlayed))
        .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
        .slice(0, 50);
    case 'unplayed':
      return tracks.filter((t) => (t.playCount || 0) === 0);
    default:
      return tracks;
  }
}

interface PlaylistState {
  playlists: Playlist[];
  activePlaylist: PlaylistWithTracks | null;
  isLoading: boolean;

  loadPlaylists: () => Promise<void>;
  createPlaylist: (
    name: string,
    description?: string,
    isSmart?: boolean,
    smartRulesJson?: string
  ) => Promise<Playlist>;
  updatePlaylist: (
    id: string,
    patch: { name?: string; description?: string | null; artworkUri?: string | null }
  ) => Promise<void>;
  selectPlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
}

const playlistDao = new PlaylistDao();

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  activePlaylist: null,
  isLoading: false,

  loadPlaylists: async () => {
    set({ isLoading: true });
    try {
      const playlists = await playlistDao.getAllPlaylists();
      set({ playlists });
    } finally {
      set({ isLoading: false });
    }
  },

  createPlaylist: async (name, description, isSmart = false, smartRulesJson) => {
    const newPl = await playlistDao.createPlaylist(name, description, isSmart, smartRulesJson);
    set((state) => ({ playlists: [newPl, ...state.playlists] }));
    return newPl;
  },

  updatePlaylist: async (id, patch) => {
    await playlistDao.updatePlaylist(id, patch);
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      activePlaylist:
        state.activePlaylist && state.activePlaylist.id === id
          ? { ...state.activePlaylist, ...patch }
          : state.activePlaylist,
    }));
  },

  selectPlaylist: async (id) => {
    set({ isLoading: true });
    try {
      const pl = await playlistDao.getPlaylistWithTracks(id);
      set({ activePlaylist: pl });
    } finally {
      set({ isLoading: false });
    }
  },

  addTrackToPlaylist: async (playlistId, trackId) => {
    await playlistDao.addTrack(playlistId, trackId);
    await get().loadPlaylists();
    if (get().activePlaylist?.id === playlistId) {
      await get().selectPlaylist(playlistId);
    }
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    await playlistDao.removeTrack(playlistId, trackId);
    set((state) => {
      if (!state.activePlaylist || state.activePlaylist.id !== playlistId) return state;
      const filtered = state.activePlaylist.tracks.filter((t) => t.id !== trackId);
      return {
        activePlaylist: {
          ...state.activePlaylist,
          tracks: filtered,
          trackCount: filtered.length,
        },
      };
    });
    await get().loadPlaylists();
  },

  reorderPlaylistTracks: async (playlistId, fromIndex, toIndex) => {
    const active = get().activePlaylist;
    if (!active || active.id !== playlistId) return;
    if (
      fromIndex < 0 ||
      fromIndex >= active.tracks.length ||
      toIndex < 0 ||
      toIndex >= active.tracks.length
    ) {
      return;
    }

    const updated = [...active.tracks];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    set({
      activePlaylist: {
        ...active,
        tracks: updated,
      },
    });

    await playlistDao.reorderTracks(
      playlistId,
      updated.map((t) => t.id)
    );
  },

  deletePlaylist: async (playlistId) => {
    await playlistDao.deletePlaylist(playlistId);
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== playlistId),
      activePlaylist: state.activePlaylist?.id === playlistId ? null : state.activePlaylist,
    }));
  },
}));
