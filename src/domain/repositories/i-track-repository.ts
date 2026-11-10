import { Track } from '../entities/track';

export interface ITrackRepository {
  getAllTracks(): Promise<Track[]>;
  getFavorites(): Promise<Track[]>;
  toggleFavorite(trackId: string, isFavorite: boolean): Promise<void>;
  searchTracks(query: string): Promise<Track[]>;
  recordPlayback(trackId: string, positionMs?: number): Promise<void>;
  scanAndSaveTracks(onProgress?: (current: number, total: number) => void): Promise<Track[]>;
}
