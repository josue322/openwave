import * as MediaLibrary from 'expo-media-library';
import { Track } from '../../../domain/entities/track';

export interface ScanProgressCallback {
  (current: number, total: number): void;
}

export class MediaStoreScanner {
  /**
   * Scans all audio assets stored on the device using Android MediaStore / Expo MediaLibrary.
   */
  public async scanAudioAssets(onProgress?: ScanProgressCallback): Promise<Track[]> {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permiso de acceso a la biblioteca multimedia denegado.');
    }

    const tracks: Track[] = [];
    let hasNextPage = true;
    let endCursor: string | undefined = undefined;
    let totalAssets = 0;

    while (hasNextPage) {
      const response = await MediaLibrary.getAssetsAsync({
        mediaType: 'audio',
        first: 100,
        after: endCursor,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });

      if (totalAssets === 0 && response.totalCount) {
        totalAssets = response.totalCount;
      }

      for (const asset of response.assets) {
        // Filter out short sounds (< 10 seconds: ringtones, notifications, sound effects)
        if (asset.duration && asset.duration < 10) {
          continue;
        }

        const durationMs = Math.round((asset.duration || 0) * 1000);
        const title = this.cleanFileName(asset.filename);

        tracks.push({
          id: asset.id,
          title: title,
          duration: durationMs,
          uri: asset.uri,
          mimeType: this.guessMimeType(asset.filename),
          dateAdded: asset.creationTime || Date.now(),
          playCount: 0,
          isFavorite: false,
          sourceType: 'local',
        });
      }

      if (onProgress) {
        onProgress(tracks.length, totalAssets || tracks.length);
      }

      hasNextPage = response.hasNextPage;
      endCursor = response.endCursor;
    }

    return tracks;
  }

  private cleanFileName(fileName: string): string {
    const withoutExt = fileName.replace(/\.[^/.]+$/, '');
    return withoutExt.replace(/^[0-9\s-_.]+/, '').trim() || withoutExt;
  }

  private guessMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp3':
        return 'audio/mpeg';
      case 'flac':
        return 'audio/flac';
      case 'wav':
        return 'audio/wav';
      case 'm4a':
      case 'aac':
        return 'audio/mp4';
      case 'ogg':
        return 'audio/ogg';
      case 'opus':
        return 'audio/opus';
      default:
        return 'audio/*';
    }
  }
}
