import { create } from 'zustand';
import { Playlist, PlaylistWithTracks } from '../domain/entities/playlist';
import { PlaylistDao } from '../data/local/playlist-dao';

interface PlaylistState {
  playlists: Playlist[];
  activePlaylist: PlaylistWithTracks | null;
  isLoading: boolean;

  loadPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  selectPlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
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

  createPlaylist: async (name, description) => {
    const newPl = await playlistDao.createPlaylist(name, description);
    set((state) => ({ playlists: [newPl, ...state.playlists] }));
    return newPl;
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
  },

  deletePlaylist: async (playlistId) => {
    await playlistDao.deletePlaylist(playlistId);
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== playlistId),
      activePlaylist: state.activePlaylist?.id === playlistId ? null : state.activePlaylist,
    }));
  },
}));
