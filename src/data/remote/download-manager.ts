import * as FileSystem from 'expo-file-system/legacy';
import { Track } from '../../domain/entities/track';
import { TrackDao } from '../local/track-dao';
import { useLibraryStore } from '../../store/library-store';
import { useDownloadStore } from '../../store/download-store';
import { ProviderRegistry } from '../../integrations/providers/provider-registry';
import { StreamQuality } from '../../integrations/providers/internet-archive-provider';

export class DownloadManager {
  private static DOWNLOADS_DIR = `${FileSystem.documentDirectory}openwave_downloads/`;
  private static resumables = new Map<string, FileSystem.DownloadResumable>();
  private static trackDao = new TrackDao();

  private static async ensureDirectory(): Promise<void> {
    const info = await FileSystem.getInfoAsync(this.DOWNLOADS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(this.DOWNLOADS_DIR, { intermediates: true });
    }
  }

  public static async startDownload(
    track: Track,
    quality: StreamQuality = 'high'
  ): Promise<Track | null> {
    await this.ensureDirectory();
    const resolved = await ProviderRegistry.getInstance().resolveTrackForPlayback(track, quality);

    if (!resolved.uri.startsWith('https://')) {
      throw new Error('Solo se permiten descargas HTTPS seguras bajo licencia abierta.');
    }

    const safeTitle = resolved.title.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40) || 'audio';
    const destUri = `${this.DOWNLOADS_DIR}dl_${resolved.id}_${safeTitle}.mp3`;

    const downloadResumable = FileSystem.createDownloadResumable(
      resolved.uri,
      destUri,
      {},
      (data) => {
        useDownloadStore
          .getState()
          .updateProgress(resolved.id, data.totalBytesWritten, data.totalBytesExpectedToWrite);
      }
    );

    this.resumables.set(resolved.id, downloadResumable);
    useDownloadStore.getState().upsertItem(resolved.id, {
      track: resolved,
      destinationUri: destUri,
      progress: 0,
      bytesWritten: 0,
      bytesTotal: 0,
      status: 'downloading',
    });

    try {
      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) {
        return null;
      }

      return await this.finalizeCompletedDownload(resolved, result.uri);
    } catch (err: any) {
      const currentStatus = useDownloadStore.getState().items[resolved.id]?.status;
      if (currentStatus !== 'paused') {
        useDownloadStore
          .getState()
          .setStatus(resolved.id, 'error', err?.message || 'Error en la descarga');
      }
      return null;
    }
  }

  public static async pauseDownload(trackId: string): Promise<void> {
    const res = this.resumables.get(trackId);
    if (!res) return;
    try {
      await res.pauseAsync();
      useDownloadStore.getState().setStatus(trackId, 'paused');
    } catch (err: any) {
      console.warn('Could not pause download:', err);
    }
  }

  public static async resumeDownload(trackId: string): Promise<Track | null> {
    const res = this.resumables.get(trackId);
    const item = useDownloadStore.getState().items[trackId];
    if (!res || !item) return null;

    useDownloadStore.getState().setStatus(trackId, 'downloading');
    try {
      const result = await res.resumeAsync();
      if (result && result.uri) {
        return await this.finalizeCompletedDownload(item.track, result.uri);
      }
      return null;
    } catch (err: any) {
      useDownloadStore
        .getState()
        .setStatus(trackId, 'error', err?.message || 'No se pudo reanudar');
      return null;
    }
  }

  public static async cancelDownload(trackId: string): Promise<void> {
    const res = this.resumables.get(trackId);
    const item = useDownloadStore.getState().items[trackId];
    if (res) {
      try {
        await res.cancelAsync();
      } catch {}
      this.resumables.delete(trackId);
    }
    if (item?.destinationUri) {
      await FileSystem.deleteAsync(item.destinationUri, { idempotent: true }).catch(() => {});
    }
    useDownloadStore.getState().removeItem(trackId);
    await this.calculateDiskUsage();
  }

  public static async calculateDiskUsage(): Promise<number> {
    try {
      await this.ensureDirectory();
      const files = await FileSystem.readDirectoryAsync(this.DOWNLOADS_DIR);
      let total = 0;
      for (const file of files) {
        const info = await FileSystem.getInfoAsync(`${this.DOWNLOADS_DIR}${file}`);
        if (info.exists && 'size' in info && typeof info.size === 'number') {
          total += info.size;
        }
      }
      useDownloadStore.getState().setTotalBytesUsed(total);
      return total;
    } catch {
      return 0;
    }
  }

  private static async finalizeCompletedDownload(
    sourceTrack: Track,
    localFileUri: string
  ): Promise<Track> {
    const fileInfo = await FileSystem.getInfoAsync(localFileUri);
    const size = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : sourceTrack.fileSize;

    const offlineTrack: Track = {
      ...sourceTrack,
      id: `dl_${sourceTrack.id}`,
      uri: localFileUri,
      fileSize: size || undefined,
      sourceType: 'local',
      folderPath: 'Descargas Online',
      dateAdded: Date.now(),
    };

    await this.trackDao.insertBatch([offlineTrack]);
    const all = await this.trackDao.getAllTracks();
    const favs = await this.trackDao.getFavorites();
    useLibraryStore.getState().setTracks(all);
    useLibraryStore.getState().setFavorites(favs);

    useDownloadStore.getState().setStatus(sourceTrack.id, 'completed');
    await this.calculateDiskUsage();
    return offlineTrack;
  }
}

