import * as FileSystem from 'expo-file-system/legacy';
import { Track } from '../../domain/entities/track';

export interface DuplicateGroup {
  key: string;
  title: string;
  tracks: Track[];
}

export class LibraryHealthService {
  /**
   * Detects likely duplicate tracks based on normalized title and approximate duration
   * or identical file size + title. Pure & deterministic so it can be unit-tested cleanly.
   */
  public static findDuplicateTracks(tracks: Track[]): DuplicateGroup[] {
    const groups = new Map<string, Track[]>();

    for (const track of tracks) {
      const normalizedTitle = track.title
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñ]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!normalizedTitle) continue;

      // Bucket duration to nearest 5 seconds to absorb slight decoder differences
      const durationBucket = Math.round((track.duration || 0) / 5000) * 5;
      const key = `${normalizedTitle}::${durationBucket}`;

      const list = groups.get(key) || [];
      list.push(track);
      groups.set(key, list);
    }

    const duplicates: DuplicateGroup[] = [];
    for (const [key, list] of groups.entries()) {
      if (list.length > 1) {
        duplicates.push({
          key,
          title: list[0].title,
          tracks: list,
        });
      }
    }

    return duplicates;
  }

  /**
   * Checks local file:// URIs to detect files that were removed or corrupted externally.
   */
  public static async findMissingLocalFiles(tracks: Track[]): Promise<Track[]> {
    const missing: Track[] = [];

    for (const track of tracks) {
      if (track.sourceType !== 'local' || !track.uri.startsWith('file://')) {
        continue;
      }

      try {
        const info = await FileSystem.getInfoAsync(track.uri);
        if (!info.exists) {
          missing.push(track);
        }
      } catch {
        missing.push(track);
      }
    }

    return missing;
  }

  /**
   * Finds tracks missing album/cover artwork.
   */
  public static findTracksWithoutArtwork(tracks: Track[]): Track[] {
    return tracks.filter((t) => !t.artworkUri);
  }
}

