import { Track } from './track';

export interface Playlist {
  id: string;
  name: string;
  description?: string | null;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  isSmartPlaylist: boolean;
  smartRulesJson?: string | null;
  trackCount?: number;
}

export interface PlaylistWithTracks extends Playlist {
  tracks: Track[];
}
