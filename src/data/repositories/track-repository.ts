import { ITrackRepository } from '../../domain/repositories/i-track-repository';
import { Track } from '../../domain/entities/track';
import { TrackDao } from '../local/track-dao';
import { MediaStoreScanner } from '../local/scanner/mediastore-scanner';
import { FolderManager } from '../local/scanner/folder-manager';

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

  public async updateArtwork(trackId: string, artworkUri: string): Promise<void> {
    return this.trackDao.updateArtwork(trackId, artworkUri);
  }

  public async deleteTrack(trackId: string): Promise<void> {
    return this.trackDao.deleteTrack(trackId);
  }

  public async updateMetadata(
    trackId: string,
    meta: {
      title?: string;
      artistName?: string | null;
      albumTitle?: string | null;
      genre?: string | null;
      year?: number | null;
    }
  ): Promise<void> {
    return this.trackDao.updateMetadata(trackId, meta);
  }

  public async scanAndSaveTracks(
    onProgress?: (current: number, total: number) => void
  ): Promise<Track[]> {
    const excluded = await FolderManager.getExcludedFolders().catch(() => []);
    const scannedTracks = await this.scanner.scanAudioAssets(onProgress, excluded);
    if (scannedTracks.length > 0) {
      await this.trackDao.insertBatch(scannedTracks);
    }

    // Re-scan user-configured SAF folders as well
    const safFolders = await FolderManager.getScannedFolders().catch(() => []);
    for (const folder of safFolders) {
      await FolderManager.scanSafFolder(folder.uri, folder.label).catch(() => {});
    }

    return this.getAllTracks();
  }
}
