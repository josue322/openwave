import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { TrackDao } from '../../data/local/track-dao';
import { PlaylistDao } from '../../data/local/playlist-dao';
import { useLibraryStore } from '../../store/library-store';
import { usePlayerStore } from '../../store/player-store';
import { PlaybackService } from '../../playback/service/playback-service';

export class ArtworkManager {
  private static trackDao = new TrackDao();
  private static playlistDao = new PlaylistDao();

  /**
   * Shared resilient image picker + permanent internal storage helper
   * with multi-layer fallbacks for Xiaomi/MIUI and Android Scoped Storage.
   */
  public static async pickAndStoreImage(filePrefix: string): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: false,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const sourceUri = asset.uri;

    const artworksDir = `${FileSystem.documentDirectory}artworks/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(artworksDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(artworksDir, { intermediates: true });
      }
    } catch {
      // Directory creation fallback
    }

    const ext = asset.name?.split('.').pop() || 'jpg';
    const safePrefix = filePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    const permanentUri = `${artworksDir}${safePrefix}_${Date.now()}.${ext}`;

    // Strategy 1: Standard copyAsync
    try {
      await FileSystem.copyAsync({
        from: sourceUri,
        to: permanentUri,
      });
      return permanentUri;
    } catch (copyErr) {
      console.warn('copyAsync failed, executing fetch + writeAsString fallback:', copyErr);

      // Strategy 2: Fetch via ContentResolver / OkHttp into Base64
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

        return permanentUri;
      } catch (fallbackErr) {
        console.warn('Fallback write failed, using direct sourceUri:', fallbackErr);
        // Strategy 3: Use sourceUri directly
        return sourceUri;
      }
    }
  }

  /**
   * Picks an image and assigns it to a single track permanently.
   */
  public static async pickAndSaveArtwork(trackId: string): Promise<string | null> {
    const savedUri = await this.pickAndStoreImage(trackId);
    if (!savedUri) return null;

    await this.trackDao.updateArtwork(trackId, savedUri);
    useLibraryStore.getState().updateTrack(trackId, { artworkUri: savedUri });
    usePlayerStore.getState().updateTrackInQueue(trackId, { artworkUri: savedUri });

    const updatedActive = usePlayerStore.getState().currentTrack;
    if (updatedActive && updatedActive.id === trackId) {
      PlaybackService.getInstance().updateActiveTrackMetadata(updatedActive);
    }

    return savedUri;
  }

  /**
   * Picks an image and assigns it to all tracks belonging to an album.
   */
  public static async pickAndSaveAlbumArtwork(albumTitle: string): Promise<string | null> {
    const savedUri = await this.pickAndStoreImage(`album_${albumTitle}`);
    if (!savedUri) return null;

    await this.trackDao.updateAlbumArtwork(albumTitle, savedUri);
    const { tracks } = useLibraryStore.getState();
    for (const t of tracks) {
      if ((t.albumTitle || 'Sin álbum') === albumTitle) {
        useLibraryStore.getState().updateTrack(t.id, { artworkUri: savedUri });
        usePlayerStore.getState().updateTrackInQueue(t.id, { artworkUri: savedUri });
      }
    }
    return savedUri;
  }

  /**
   * Picks an image and assigns it as a playlist's custom artwork.
   */
  public static async pickAndSavePlaylistArtwork(playlistId: string): Promise<string | null> {
    const savedUri = await this.pickAndStoreImage(`pl_${playlistId}`);
    if (!savedUri) return null;

    await this.playlistDao.updatePlaylist(playlistId, { artworkUri: savedUri });
    return savedUri;
  }
}
