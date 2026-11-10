import { z } from 'zod';

export const SpotifyTrackSchema = z.object({
  trackName: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  artistName: z.string().optional(),
  artist: z.string().optional(),
  albumName: z.string().optional(),
  album: z.string().optional(),
  durationMs: z.number().optional(),
  msPlayed: z.number().optional(),
});

export interface ImportedTrackMetadata {
  title: string;
  artist?: string;
  album?: string;
  durationMs?: number;
}

export class SpotifyJsonParser {
  /**
   * Safely parses JSON exported from Spotify data package or web tools.
   */
  public static parse(jsonString: string): ImportedTrackMetadata[] {
    const raw = JSON.parse(jsonString);
    const items = Array.isArray(raw) ? raw : raw?.tracks || raw?.items || [];
    const results: ImportedTrackMetadata[] = [];

    for (const item of items) {
      const parsed = SpotifyTrackSchema.safeParse(item);
      if (parsed.success) {
        const data = parsed.data;
        const title = data.trackName || data.name || data.title;
        const artist = data.artistName || data.artist;
        const album = data.albumName || data.album;
        const durationMs = data.durationMs || data.msPlayed;

        if (title) {
          results.push({
            title: title.trim(),
            artist: artist?.trim(),
            album: album?.trim(),
            durationMs,
          });
        }
      }
    }

    return results;
  }
}
