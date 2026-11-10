import { Track } from './track';

export interface ArtistProfile {
  id: string;
  stageName: string;
  bio?: string | null;
  avatarUri?: string | null;
  headerUri?: string | null;
  isVerified: boolean;
  genres: string[];
  websiteUrl?: string | null;
  licenseModel: 'Creative Commons' | 'Direct Authorization' | 'Public Domain';
  totalPlays: number;
}

export type ReleaseType = 'single' | 'ep' | 'album';

export interface ArtistRelease {
  id: string;
  artistId: string;
  title: string;
  releaseType: ReleaseType;
  coverUri?: string | null;
  releaseDate: number;
  tracks: Track[];
  licenseDetails: string;
}

export interface ArtistStats {
  artistId: string;
  totalPlays: number;
  uniqueDaysPlayed: number;
  topTrackId?: string | null;
  topTrackTitle?: string | null;
}

