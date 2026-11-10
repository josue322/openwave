import { ImportedTrackMetadata } from '../spotify/spotify-json-parser';

export class TakeoutCsvParser {
  /**
   * Parses Google Takeout YouTube Music CSV files.
   * Format typically: "Track Title","Artist Name","Album","Duration"
   */
  public static parseCsv(csvContent: string): ImportedTrackMetadata[] {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const header = lines[0].toLowerCase();
    const results: ImportedTrackMetadata[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = this.parseCsvRow(line);

      if (cols.length >= 1 && cols[0].trim()) {
        const title = cols[0].trim();
        const artist = cols.length > 1 ? cols[1].trim() : undefined;
        const album = cols.length > 2 ? cols[2].trim() : undefined;

        results.push({
          title,
          artist,
          album,
        });
      }
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
        insideQuotes = !insideQuotes;
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
