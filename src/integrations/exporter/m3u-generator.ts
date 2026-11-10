import { Track } from '../../domain/entities/track';

export class M3uGenerator {
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
