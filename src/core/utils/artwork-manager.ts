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
   */
  public static async pickAndSaveArtwork(trackId: string): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    // Ensure persistent artworks folder
    const artworksDir = `${FileSystem.documentDirectory}artworks/`;
    const dirInfo = await FileSystem.getInfoAsync(artworksDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(artworksDir, { intermediates: true });
    }

    // Generate permanent destination path
    const ext = asset.name?.split('.').pop() || 'jpg';
    const permanentUri = `${artworksDir}${trackId}_${Date.now()}.${ext}`;

    // Copy image file to permanent app storage
    await FileSystem.copyAsync({
      from: asset.uri,
      to: permanentUri,
    });

    // Update SQLite database
    await this.trackDao.updateArtwork(trackId, permanentUri);

    // Update Zustand library store
    const { tracks, favorites } = useLibraryStore.getState();
    const updatedTracks = tracks.map((t) =>
      t.id === trackId ? { ...t, artworkUri: permanentUri } : t
    );
    const updatedFavorites = favorites.map((t) =>
      t.id === trackId ? { ...t, artworkUri: permanentUri } : t
    );

    useLibraryStore.getState().setTracks(updatedTracks);
    useLibraryStore.getState().setFavorites(updatedFavorites);

    // Update current playing track in Player store if active
    const currentTrack = usePlayerStore.getState().currentTrack;
    if (currentTrack && currentTrack.id === trackId) {
      usePlayerStore.getState().setTrack({
        ...currentTrack,
        artworkUri: permanentUri,
      });
    }

    return permanentUri;
  }
}
