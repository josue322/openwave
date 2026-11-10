import { create } from 'zustand';
import { ArtistProfile, ArtistRelease, ArtistStats } from '../domain/entities/artist-profile';
import { Track } from '../domain/entities/track';

interface ArtistProfileState {
  currentProfile: ArtistProfile | null;
  releases: ArtistRelease[];
  stats: ArtistStats | null;
  isLoading: boolean;

  setProfile: (profile: ArtistProfile) => void;
  setReleases: (releases: ArtistRelease[]) => void;
  publishRelease: (release: ArtistRelease) => void;
  loadArtistDetails: (artistId: string) => Promise<void>;
}

export const useArtistProfileStore = create<ArtistProfileState>((set, get) => ({
  currentProfile: null,
  releases: [],
  stats: null,
  isLoading: false,

  setProfile: (profile) => set({ currentProfile: profile }),
  setReleases: (releases) => set({ releases }),

  publishRelease: (release) => {
    set((state) => ({
      releases: [release, ...state.releases],
    }));
  },

  loadArtistDetails: async (artistId: string) => {
    set({ isLoading: true });
    try {
      // Sample mock data for independent creator showcase
      const sampleProfile: ArtistProfile = {
        id: artistId,
        stageName: 'Wave Studio Indie',
        bio: 'Productor y compositor independiente creando paisajes sonoros bajo licencias Creative Commons.',
        isVerified: true,
        genres: ['Ambient', 'Lo-Fi', 'Electronic'],
        licenseModel: 'Creative Commons',
        totalPlays: 1420,
      };

      const sampleTracks: Track[] = [
        {
          id: `indie_track_${artistId}_1`,
          title: 'Ocean Echoes',
          artistName: 'Wave Studio Indie',
          albumTitle: 'First Horizon EP',
          duration: 195000,
          uri: 'file:///sample/echoes.mp3',
          dateAdded: Date.now(),
          playCount: 42,
          isFavorite: false,
          sourceType: 'local',
        },
      ];

      const sampleRelease: ArtistRelease = {
        id: `rel_${artistId}`,
        artistId,
        title: 'First Horizon EP',
        releaseType: 'ep',
        releaseDate: Date.now(),
        tracks: sampleTracks,
        licenseDetails: 'CC BY-SA 4.0 - Atribución Compartir Igual',
      };

      set({
        currentProfile: sampleProfile,
        releases: [sampleRelease],
        stats: {
          artistId,
          totalPlays: 1420,
          uniqueDaysPlayed: 24,
          topTrackId: sampleTracks[0].id,
          topTrackTitle: sampleTracks[0].title,
        },
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
