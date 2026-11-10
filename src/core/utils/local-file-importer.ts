import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Track } from '../../domain/entities/track';
import { TrackDao } from '../../data/local/track-dao';
import { useLibraryStore } from '../../store/library-store';
import { usePlayerStore } from '../../store/player-store';

export class LocalFileImporter {
  private static trackDao = new TrackDao();
  private static MUSIC_DIR = `${FileSystem.documentDirectory}openwave_music/`;

  /**
   * Opens the native Android file picker to select one or more local audio files
   * (e.g. from Downloads, Bluetooth, Music folder, WhatsApp Audio, SD Card)
   * and copies them to permanent internal app storage so they stay forever.
   * Includes graceful fallback for Android/MIUI permissions.
   */
  public static async pickAndImportAudioFiles(): Promise<Track[]> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: false, // Prevents MIUI/Android cache sandbox read errors
      multiple: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    // Ensure permanent music directory exists
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.MUSIC_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.MUSIC_DIR, { intermediates: true });
      }
    } catch (e) {
      // Directory creation fallback
    }

    const newTracks: Track[] = [];

    for (const asset of result.assets) {
      const cleanTitle = this.extractTitleFromFilename(asset.name);
      const uniqueId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const safeFilename = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const permanentUri = `${this.MUSIC_DIR}${uniqueId}_${safeFilename}`;
      let finalAudioUri = asset.uri;

      try {
        // Attempt to copy audio file into permanent app sandbox storage
        await FileSystem.copyAsync({
          from: asset.uri,
          to: permanentUri,
        });
        finalAudioUri = permanentUri;
      } catch (copyErr) {
        console.warn('copyAsync failed for audio file, falling back to direct URI:', copyErr);
        finalAudioUri = asset.uri;
      }

      const track: Track = {
        id: uniqueId,
        title: cleanTitle,
        artistName: 'Música Local',
        albumTitle: 'Mis Descargas',
        duration: 180000, // Initial estimate until playback engine reads actual duration
        uri: finalAudioUri, // Permanent or content:// URI that is readable by expo-audio
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

  /**
   * Permanently deletes a track from the device and database ("hasta que yo las quite")
   */
  public static async deleteTrackPermanently(track: Track): Promise<void> {
    try {
      // 1. Delete physical audio file if it is in internal storage
      if (track.uri && track.uri.startsWith('file://')) {
        await FileSystem.deleteAsync(track.uri, { idempotent: true });
      }

      // 2. Delete custom artwork if stored locally
      if (track.artworkUri && track.artworkUri.startsWith('file://')) {
        await FileSystem.deleteAsync(track.artworkUri, { idempotent: true });
      }

      // 3. Delete from SQLite database
      await this.trackDao.deleteTrack(track.id);

      // 4. Update library store
      const { tracks, favorites } = useLibraryStore.getState();
      const updatedTracks = tracks.filter((t) => t.id !== track.id);
      const updatedFavorites = favorites.filter((t) => t.id !== track.id);

      useLibraryStore.getState().setTracks(updatedTracks);
      useLibraryStore.getState().setFavorites(updatedFavorites);

      // 5. If this track is currently loaded/playing, clear it
      const currentTrack = usePlayerStore.getState().currentTrack;
      if (currentTrack && currentTrack.id === track.id) {
        usePlayerStore.getState().setTrack(null);
        usePlayerStore.getState().setIsPlaying(false);
      }
    } catch (err) {
      console.error('Error deleting track permanently:', err);
      throw err;
    }
  }

  private static extractTitleFromFilename(filename: string): string {
    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    return withoutExt.replace(/^[0-9\s-_.]+/, '').trim() || withoutExt;
  }
}
