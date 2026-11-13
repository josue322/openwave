import { Track } from '../../domain/entities/track';
import { ImportedTrackMetadata } from '../spotify/spotify-json-parser';

export class M3uGenerator {
  /**
   * Parses extended M3U / M3U8 playlist files into track metadata entries.
   */
  public static parseM3u(m3uContent: string): ImportedTrackMetadata[] {
    const lines = m3uContent.split(/\r?\n/).map((l) => l.trim());
    const results: ImportedTrackMetadata[] = [];
    let pendingMeta: ImportedTrackMetadata | null = null;

    for (const line of lines) {
      if (!line || line.startsWith('#EXTM3U') || line.startsWith('#PLAYLIST:')) {
        continue;
      }

      if (line.startsWith('#EXTINF:')) {
        const commaIndex = line.indexOf(',');
        const headerPart = commaIndex >= 0 ? line.slice(8, commaIndex) : line.slice(8);
        const seconds = Number(headerPart.split(' ')[0]);
        const label = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : '';

        let artist: string | undefined;
        let title = label;
        const dashIdx = label.indexOf(' - ');
        if (dashIdx > 0) {
          artist = label.slice(0, dashIdx).trim();
          title = label.slice(dashIdx + 3).trim();
        }

        pendingMeta = {
          title: title || label,
          artist,
          durationMs: !isNaN(seconds) && seconds > 0 ? Math.round(seconds * 1000) : undefined,
        };
      } else if (!line.startsWith('#')) {
        if (pendingMeta && pendingMeta.title) {
          results.push(pendingMeta);
          pendingMeta = null;
        } else {
          // Bare URI line without preceding #EXTINF
          const fileName = line.split('/').pop()?.replace(/\.[^/.]+$/, '') || line;
          results.push({ title: decodeURIComponent(fileName) });
        }
      }
    }

    if (pendingMeta && pendingMeta.title) {
      results.push(pendingMeta);
    }

    return results;
  }

  /**
   * Generates a standard UTF-8 extended M3U playlist file content.
   */
  public static generateM3u(playlistName: string, tracks: Track[]): string {
    const lines: string[] = [
      '#EXTM3U',
      `#PLAYLIST:${playlistName}`,
      '',
    ];

    for (const track of tracks) {
      const durationSeconds = Math.max(0, Math.floor(track.duration / 1000));
      const artist = track.artistName || 'Unknown Artist';
      const title = track.title;

      // Extended M3U info directive
      lines.push(`#EXTINF:${durationSeconds},${artist} - ${title}`);
      lines.push(track.uri);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generates a portable JSON representation of the playlist.
   */
  public static generateJson(playlistName: string, description: string | undefined, tracks: Track[]): string {
    const payload = {
      app: 'OpenWave',
      version: '1.1',
      exportedAt: new Date().toISOString(),
      playlist: {
        name: playlistName,
        description: description || null,
        totalTracks: tracks.length,
        tracks: tracks.map((t) => ({
          title: t.title,
          artist: t.artistName || null,
          album: t.albumTitle || null,
          durationMs: t.duration,
          year: t.year || null,
          genre: t.genre || null,
        })),
      },
    };

    return JSON.stringify(payload, null, 2);
  }
}
