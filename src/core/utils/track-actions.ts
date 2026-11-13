import { Share, Alert } from 'react-native';
import { Track } from '../../domain/entities/track';
import { TrackDao } from '../../data/local/track-dao';
import { useLibraryStore } from '../../store/library-store';
import { usePlayerStore } from '../../store/player-store';

const trackDao = new TrackDao();

/**
 * Toggles favorite status across SQLite, useLibraryStore, and usePlayerStore atomically.
 */
export async function toggleFavoritePersisted(track: Track): Promise<boolean> {
  const nextFav = !track.isFavorite;
  const { tracks } = useLibraryStore.getState();
  const existsInLibrary = tracks.some((t) => t.id === track.id);

  if (!existsInLibrary) {
    const newTrack: Track = { ...track, isFavorite: nextFav };
    await trackDao.insertBatch([newTrack]).catch(() => {});
    const all = await trackDao.getAllTracks().catch(() => [newTrack, ...tracks]);
    const favs = all.filter((t) => t.isFavorite);
    useLibraryStore.getState().setTracks(all);
    useLibraryStore.getState().setFavorites(favs);
  } else {
    useLibraryStore.getState().updateTrack(track.id, { isFavorite: nextFav });
  }

  usePlayerStore.getState().updateTrackInQueue(track.id, { isFavorite: nextFav });

  try {
    await trackDao.toggleFavorite(track.id, nextFav);
  } catch (err) {
    console.error('Error persisting favorite status in SQLite:', err);
  }

  return nextFav;
}

export async function ensureTrackInDatabase(track: Track): Promise<void> {
  const exists = useLibraryStore.getState().tracks.some((t) => t.id === track.id);
  if (!exists) {
    await trackDao.insertBatch([track]).catch(() => {});
    const all = await trackDao.getAllTracks().catch(() => [track, ...useLibraryStore.getState().tracks]);
    useLibraryStore.getState().setTracks(all);
  }
}

/**
 * Shares track title/artist or streaming URL using the native Android share sheet.
 */
export async function shareTrack(track: Track): Promise<void> {
  try {
    const artist = track.artistName || 'Artista desconocido';
    const message =
      track.sourceType === 'stream'
        ? `Escucha "${track.title}" de ${artist} en OpenWave:\n${track.uri}`
        : `Estoy escuchando "${track.title}" de ${artist} en OpenWave 🎵`;

    await Share.share({
      title: track.title,
      message,
    });
  } catch (err: any) {
    Alert.alert('Error al compartir', err?.message || 'No se pudo compartir esta pista.');
  }
}

/**
 * Formats byte size into human-readable MB/KB.
 */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return 'Desconocido';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
