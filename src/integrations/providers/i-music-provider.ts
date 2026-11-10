import { Track } from '../../domain/entities/track';

export interface ProviderCapabilities {
  canSearch: boolean;
  canStream: boolean;
  hasPlaylists: boolean;
  licenseType: 'Creative Commons' | 'Public Domain' | 'Royalty Free' | 'Open Source';
}

export interface IMusicProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly capabilities: ProviderCapabilities;

  /**
   * Searches for openly licensed tracks by keyword.
   */
  search(query: string): Promise<Track[]>;

  /**
   * Fetches curated or trending tracks from the open catalog.
   */
  getFeaturedTracks(): Promise<Track[]>;

  /**
   * Resolves the direct streaming URL for a track.
   */
  resolveStreamUrl(trackId: string): Promise<string>;
}
