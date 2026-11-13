import { ImportedTrackMetadata } from '../spotify/spotify-json-parser';

export class TakeoutCsvParser {
  /**
   * Parses CSV files exported from:
   * - Google Takeout / YouTube Music CSV playlists
   * - Exportify (Spotify -> CSV: Track Name, Artist Name(s), Album Name, Duration (ms))
   * - TuneMyMusic / Soundiiz / generic CSV playlists
   */
  public static parseCsv(csvContent: string): ImportedTrackMetadata[] {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headerCols = this.parseCsvRow(lines[0]).map((c) => c.toLowerCase().trim());

    const findColIndex = (patterns: string[], fallbackIdx: number): number => {
      const idx = headerCols.findIndex((h) => patterns.some((p) => h.includes(p)));
      return idx >= 0 ? idx : fallbackIdx;
    };

    const hasRecognizedHeader = headerCols.some((h) =>
      ['title', 'track', 'song', 'name', 'título', 'titulo', 'nombre', 'canción', 'cancion'].some((p) =>
        h.includes(p)
      )
    );

    const titleIdx = hasRecognizedHeader
      ? findColIndex(['track name', 'song title', 'track title', 'title', 'name', 'título', 'titulo', 'cancion', 'canción', 'nombre'], 0)
      : 0;
    const artistIdx = hasRecognizedHeader
      ? findColIndex(['artist', 'artista', 'author', 'channel'], -1)
      : 1;
    const albumIdx = hasRecognizedHeader
      ? findColIndex(['album', 'álbum'], -1)
      : 2;
    const durationIdx = hasRecognizedHeader
      ? findColIndex(['duration (ms)', 'duration_ms', 'duration'], -1)
      : -1;

    const results: ImportedTrackMetadata[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvRow(lines[i]);
      const title = cols[titleIdx]?.trim();
      if (!title) continue;

      const artist = artistIdx >= 0 ? cols[artistIdx]?.trim() || undefined : undefined;
      const album = albumIdx >= 0 ? cols[albumIdx]?.trim() || undefined : undefined;

      let durationMs: number | undefined;
      if (durationIdx >= 0 && cols[durationIdx]) {
        const rawDur = cols[durationIdx].trim();
        const num = Number(rawDur);
        if (!Number.isNaN(num) && num > 0) {
          // Heuristic: > 1000 likely already ms (Exportify); <= 1000 seconds -> convert to ms
          durationMs = num > 1000 ? Math.round(num) : Math.round(num * 1000);
        }
      }

      results.push({
        title,
        artist,
        album,
        durationMs,
      });
    }

    return results;
  }

  private static parseCsvRow(row: string): string[] {
    const entries: string[] = [];
    let insideQuotes = false;
    let current = '';

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (insideQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        entries.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    entries.push(current.trim());

    return entries.map((s) => s.replace(/^"|"$/g, ''));
  }
}
