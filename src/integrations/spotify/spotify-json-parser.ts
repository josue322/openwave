import { z } from 'zod';

export const SpotifyTrackSchema = z.object({
  trackName: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  track: z.union([
    z.string(),
    z.object({
      trackName: z.string().optional(),
      name: z.string().optional(),
      artistName: z.string().optional(),
      albumName: z.string().optional(),
    }),
  ]).optional(),
  artistName: z.string().optional(),
  artist: z.string().optional(),
  albumName: z.string().optional(),
  album: z.string().optional(),
  durationMs: z.number().optional(),
  msPlayed: z.number().optional(),
  ms_played: z.number().optional(),
  master_metadata_track_name: z.string().nullable().optional(),
  master_metadata_album_artist_name: z.string().nullable().optional(),
  master_metadata_album_album_name: z.string().nullable().optional(),
});

export interface ImportedTrackMetadata {
  title: string;
  artist?: string;
  album?: string;
  durationMs?: number;
}

export class SpotifyJsonParser {
  /**
   * Safely parses JSON exported from Spotify official Privacy Data packages:
   * - StreamingHistory_music_*.json (array of { trackName, artistName, msPlayed })
   * - Extended Streaming History (master_metadata_track_name, ...)
   * - YourLibrary.json ({ tracks: [{ artist, album, track }] })
   * - Playlist1.json ({ playlists: [{ name, items: [{ track: { trackName, artistName, albumName } }] }] })
   * - Generic { tracks } / { items } arrays
   */
  public static parse(jsonString: string): ImportedTrackMetadata[] {
    const raw = JSON.parse(jsonString);
    const items: any[] = [];

    if (Array.isArray(raw)) {
      items.push(...raw);
    } else if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.playlists)) {
        for (const pl of raw.playlists) {
          if (Array.isArray(pl?.items)) {
            items.push(...pl.items);
          }
        }
      }
      if (Array.isArray(raw.tracks)) {
        items.push(...raw.tracks);
      }
      if (Array.isArray(raw.items)) {
        items.push(...raw.items);
      }
    }

    const results: ImportedTrackMetadata[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const parsed = SpotifyTrackSchema.safeParse(item);
      if (!parsed.success) continue;

      const data = parsed.data;
      const nestedTrack = typeof data.track === 'object' && data.track !== null ? data.track : null;
      const trackString = typeof data.track === 'string' ? data.track : undefined;

      const title = (
        nestedTrack?.trackName ||
        nestedTrack?.name ||
        data.master_metadata_track_name ||
        data.trackName ||
        data.name ||
        data.title ||
        trackString
      )?.trim();

      if (!title) continue;

      const artist = (
        nestedTrack?.artistName ||
        data.master_metadata_album_artist_name ||
        data.artistName ||
        data.artist
      )?.trim();

      const album = (
        nestedTrack?.albumName ||
        data.master_metadata_album_album_name ||
        data.albumName ||
        data.album
      )?.trim();

      const durationMs = data.durationMs ?? data.msPlayed ?? data.ms_played;

      const dedupeKey = `${title.toLowerCase()}||${(artist || '').toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      results.push({
        title,
        artist,
        album,
        durationMs,
      });
    }

    return results;
  }
}
