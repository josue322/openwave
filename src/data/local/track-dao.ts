import { getDatabase } from '../../core/database/connection';
import { Track } from '../../domain/entities/track';

export class TrackDao {
  public async insertBatch(tracks: Track[]): Promise<number> {
    if (tracks.length === 0) return 0;

    const db = await getDatabase();
    let insertedCount = 0;

    await db.withTransactionAsync(async () => {
      const statement = await db.prepareAsync(`
        INSERT OR REPLACE INTO tracks (
          id, title, artist_id, album_id, duration, uri, mime_type,
          file_size, bitrate, sample_rate, codec, track_number,
          disc_number, year, genre, date_added, last_played,
          play_count, is_favorite, source_type
        ) VALUES (
          $id, $title, $artistId, $albumId, $duration, $uri, $mimeType,
          $fileSize, $bitrate, $sampleRate, $codec, $trackNumber,
          $discNumber, $year, $genre, $dateAdded, $lastPlayed,
          $playCount, $isFavorite, $sourceType
        )
      `);

      try {
        for (const track of tracks) {
          await statement.executeAsync({
            $id: track.id,
            $title: track.title,
            $artistId: track.artistId || null,
            $albumId: track.albumId || null,
            $duration: track.duration,
            $uri: track.uri,
            $mimeType: track.mimeType || null,
            $fileSize: track.fileSize || null,
            $bitrate: track.bitrate || null,
            $sampleRate: track.sampleRate || null,
            $codec: track.codec || null,
            $trackNumber: track.trackNumber || 0,
            $discNumber: track.discNumber || 1,
            $year: track.year || null,
            $genre: track.genre || null,
            $dateAdded: track.dateAdded || Date.now(),
            $lastPlayed: track.lastPlayed || null,
            $playCount: track.playCount || 0,
            $isFavorite: track.isFavorite ? 1 : 0,
            $sourceType: track.sourceType || 'local',
          });
          insertedCount++;
        }
      } finally {
        await statement.finalizeAsync();
      }
    });

    return insertedCount;
  }

  public async getAllTracks(): Promise<Track[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      SELECT 
        t.*,
        a.name as artistName,
        al.title as albumTitle,
        al.artwork_uri as artworkUri
      FROM tracks t
      LEFT JOIN artists a ON t.artist_id = a.id
      LEFT JOIN albums al ON t.album_id = al.id
      ORDER BY t.title COLLATE NOCASE ASC
    `);

    return rows.map(this.mapRowToTrack);
  }

  public async getFavorites(): Promise<Track[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      SELECT 
        t.*,
        a.name as artistName,
        al.title as albumTitle,
        al.artwork_uri as artworkUri
      FROM tracks t
      LEFT JOIN artists a ON t.artist_id = a.id
      LEFT JOIN albums al ON t.album_id = al.id
      WHERE t.is_favorite = 1
      ORDER BY t.title COLLATE NOCASE ASC
    `);

    return rows.map(this.mapRowToTrack);
  }

  public async toggleFavorite(trackId: string, isFavorite: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE tracks SET is_favorite = ? WHERE id = ?',
      isFavorite ? 1 : 0,
      trackId
    );
  }

  public async searchTracks(query: string): Promise<Track[]> {
    const db = await getDatabase();
    const searchTerm = `%${query.trim()}%`;
    const rows = await db.getAllAsync<any>(
      `
      SELECT 
        t.*,
        a.name as artistName,
        al.title as albumTitle,
        al.artwork_uri as artworkUri
      FROM tracks t
      LEFT JOIN artists a ON t.artist_id = a.id
      LEFT JOIN albums al ON t.album_id = al.id
      WHERE t.title LIKE ? OR a.name LIKE ? OR al.title LIKE ?
      ORDER BY t.title COLLATE NOCASE ASC
      LIMIT 100
    `,
      searchTerm,
      searchTerm,
      searchTerm
    );

    return rows.map(this.mapRowToTrack);
  }

  public async recordPlayback(trackId: string, positionMs: number = 0): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE tracks SET play_count = play_count + 1, last_played = ? WHERE id = ?`,
        now,
        trackId
      );
      await db.runAsync(
        `INSERT INTO play_history (track_id, played_at, position) VALUES (?, ?, ?)`,
        trackId,
        now,
        positionMs
      );
    });
  }

  private mapRowToTrack(row: any): Track {
    return {
      id: row.id,
      title: row.title,
      artistId: row.artist_id,
      artistName: row.artistName || null,
      albumId: row.album_id,
      albumTitle: row.albumTitle || null,
      duration: row.duration,
      uri: row.uri,
      artworkUri: row.artworkUri || null,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      bitrate: row.bitrate,
      sampleRate: row.sample_rate,
      codec: row.codec,
      trackNumber: row.track_number,
      discNumber: row.disc_number,
      year: row.year,
      genre: row.genre,
      dateAdded: row.date_added,
      lastPlayed: row.last_played,
      playCount: row.play_count || 0,
      isFavorite: row.is_favorite === 1,
      sourceType: row.source_type || 'local',
    };
  }
}
