import * as DocumentPicker from 'expo-document-picker';
import { Track } from '../../domain/entities/track';
import { TrackDao } from '../../data/local/track-dao';
import { useLibraryStore } from '../../store/library-store';

export class LocalFileImporter {
  private static trackDao = new TrackDao();

  /**
   * Opens the native Android file picker to select one or more local audio files
   * (e.g. from Downloads, Bluetooth, Music folder, WhatsApp Audio, SD Card).
   */
  public static async pickAndImportAudioFiles(): Promise<Track[]> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: false,
      multiple: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    const newTracks: Track[] = [];

    for (const asset of result.assets) {
      const cleanTitle = this.extractTitleFromFilename(asset.name);

      const track: Track = {
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        title: cleanTitle,
        artistName: 'Música Local',
        albumTitle: 'Descargas',
        duration: 180000, // Default duration estimate until audio player reads header
        uri: asset.uri,
        mimeType: asset.mimeType || 'audio/mpeg',
        fileSize: asset.size,
        dateAdded: Date.now(),
        playCount: 0,
        isFavorite: false,
        sourceType: 'local',
      };

      newTracks.push(track);
    }

    if (newTracks.length > 0) {
      await this.trackDao.insertBatch(newTracks);
      const all = await this.trackDao.getAllTracks();
      const favs = await this.trackDao.getFavorites();

      useLibraryStore.getState().setTracks(all);
      useLibraryStore.getState().setFavorites(favs);
    }

    return newTracks;
  }

  private static extractTitleFromFilename(filename: string): string {
    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    return withoutExt.replace(/^[0-9\s-_.]+/, '').trim() || withoutExt;
  }
}
