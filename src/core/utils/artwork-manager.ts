import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { TrackDao } from '../../data/local/track-dao';
import { useLibraryStore } from '../../store/library-store';
import { usePlayerStore } from '../../store/player-store';

export class ArtworkManager {
  private static trackDao = new TrackDao();

  /**
   * Prompts the user to pick an image from their device gallery or files
   * and saves it permanently as the artwork/cover for the given track.
   * Includes multi-layer fallbacks for Xiaomi/MIUI and Android Scoped Storage.
   */
  public static async pickAndSaveArtwork(trackId: string): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: false, // Prevents MIUI/Android cache sandbox read errors
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const sourceUri = asset.uri;

    // Ensure persistent artworks directory exists
    const artworksDir = `${FileSystem.documentDirectory}artworks/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(artworksDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(artworksDir, { intermediates: true });
      }
    } catch (e) {
      // Directory creation fallback
    }

    const ext = asset.name?.split('.').pop() || 'jpg';
    const permanentUri = `${artworksDir}${trackId}_${Date.now()}.${ext}`;

    let savedUri: string = sourceUri;

    // Strategy 1: Attempt standard copyAsync
    try {
      await FileSystem.copyAsync({
        from: sourceUri,
        to: permanentUri,
      });
      savedUri = permanentUri;
    } catch (copyErr) {
      console.warn('copyAsync failed, executing fetch + writeAsString fallback:', copyErr);

      // Strategy 2: Fetch through Android ContentResolver / OkHttp into Base64
      try {
        const response = await fetch(sourceUri);
        const blob = await response.blob();

        const base64DataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const rawBase64 = base64DataUrl.includes(',')
          ? base64DataUrl.split(',')[1]
          : base64DataUrl;

        await FileSystem.writeAsStringAsync(permanentUri, rawBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        savedUri = permanentUri;
      } catch (fallbackErr) {
        console.warn('Fallback write failed, using direct sourceUri:', fallbackErr);
        // Strategy 3: Use sourceUri directly so the image always renders
        savedUri = sourceUri;
      }
    }

    // Persist to SQLite database
    await this.trackDao.updateArtwork(trackId, savedUri);

    // Update Zustand library store
    const { tracks, favorites } = useLibraryStore.getState();
    const updatedTracks = tracks.map((t) =>
      t.id === trackId ? { ...t, artworkUri: savedUri } : t
    );
    const updatedFavorites = favorites.map((t) =>
      t.id === trackId ? { ...t, artworkUri: savedUri } : t
    );

    useLibraryStore.getState().setTracks(updatedTracks);
    useLibraryStore.getState().setFavorites(updatedFavorites);

    // Update current playing track in Player store if active
    const currentTrack = usePlayerStore.getState().currentTrack;
    if (currentTrack && currentTrack.id === trackId) {
      usePlayerStore.getState().setTrack({
        ...currentTrack,
        artworkUri: savedUri,
      });
    }

    return savedUri;
  }
}
