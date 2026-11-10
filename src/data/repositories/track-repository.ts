import { ITrackRepository } from '../../domain/repositories/i-track-repository';
import { Track } from '../../domain/entities/track';
import { TrackDao } from '../local/track-dao';
import { MediaStoreScanner } from '../local/scanner/mediastore-scanner';

export class TrackRepository implements ITrackRepository {
  private trackDao: TrackDao;
  private scanner: MediaStoreScanner;

  constructor(trackDao?: TrackDao, scanner?: MediaStoreScanner) {
    this.trackDao = trackDao || new TrackDao();
    this.scanner = scanner || new MediaStoreScanner();
  }

  public async getAllTracks(): Promise<Track[]> {
    return this.trackDao.getAllTracks();
  }

  public async getFavorites(): Promise<Track[]> {
    return this.trackDao.getFavorites();
  }

  public async toggleFavorite(trackId: string, isFavorite: boolean): Promise<void> {
    return this.trackDao.toggleFavorite(trackId, isFavorite);
  }

  public async searchTracks(query: string): Promise<Track[]> {
    return this.trackDao.searchTracks(query);
  }

  public async recordPlayback(trackId: string, positionMs: number = 0): Promise<void> {
    return this.trackDao.recordPlayback(trackId, positionMs);
  }

  public async scanAndSaveTracks(
    onProgress?: (current: number, total: number) => void
  ): Promise<Track[]> {
    const scannedTracks = await this.scanner.scanAudioAssets(onProgress);
    if (scannedTracks.length > 0) {
      await this.trackDao.insertBatch(scannedTracks);
    }
    return this.getAllTracks();
  }
}
