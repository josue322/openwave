import { getDatabase } from '../../core/database/connection';
import { Track } from '../../domain/entities/track';

const BASE_TRACK_SELECT = `
  SELECT 
    t.*,
    COALESCE(t.artist_name, a.name) as artistName,
    COALESCE(t.album_title, al.title) as albumTitle,
    COALESCE(t.artwork_uri, al.artwork_uri) as artworkUri
  FROM tracks t
  LEFT JOIN artists a ON t.artist_id = a.id
  LEFT JOIN albums al ON t.album_id = al.id
`;

export interface PlayHistoryEntry {
  id: number;
  playedAt: number;
  position: number;
  track: Track;
}

export class TrackDao {
  public async insertBatch(tracks: Track[]): Promise<number> {
    if (tracks.length === 0) return 0;

    const db = await getDatabase();
    let insertedCount = 0;

    await db.withTransactionAsync(async () => {
      const existingRows = await db.getAllAsync<{ id: string; uri: string }>(
        'SELECT id, uri FROM tracks'
      );
      const existingUris = new Set(existingRows.map((r) => r.uri));
      const existingIds = new Set(existingRows.map((r) => r.id));

      const insertStmt = await db.prepareAsync(`
        INSERT INTO tracks (
          id, title, artist_id, album_id, duration, uri, mime_type,
          file_size, bitrate, sample_rate, codec, track_number,
          disc_number, year, genre, date_added, last_played,
          play_count, is_favorite, source_type, artwork_uri,
          artist_name, album_title, folder_path, lyrics_lrc, is_corrupt
        ) VALUES (
          $id, $title, $artistId, $albumId, $duration, $uri, $mimeType,
          $fileSize, $bitrate, $sampleRate, $codec, $trackNumber,
          $discNumber, $year, $genre, $dateAdded, $lastPlayed,
          $playCount, $isFavorite, $sourceType, $artworkUri,
          $artistName, $albumTitle, $folderPath, $lyricsLrc, $isCorrupt
        )
      `);

      try {
        for (const track of tracks) {
          if (existingUris.has(track.uri) || existingIds.has(track.id)) {
            // Preserve existing user metadata (favorites, play count, custom cover, playlists)
            continue;
          }

          await insertStmt.executeAsync({
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
            $artworkUri: track.artworkUri || null,
            $artistName: track.artistName || null,
            $albumTitle: track.albumTitle || null,
            $folderPath: track.folderPath || null,
            $lyricsLrc: track.lyricsLrc || null,
            $isCorrupt: track.isCorrupt ? 1 : 0,
          });
          existingUris.add(track.uri);
          existingIds.add(track.id);
          insertedCount++;
        }
      } finally {
        await insertStmt.finalizeAsync();
      }
    });

    return insertedCount;
  }

  public async getAllTracks(): Promise<Track[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      ${BASE_TRACK_SELECT}
      ORDER BY t.title COLLATE NOCASE ASC
    `);

    return rows.map((r) => this.mapRowToTrack(r));
  }

  public async getFavorites(): Promise<Track[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      ${BASE_TRACK_SELECT}
      WHERE t.is_favorite = 1
      ORDER BY t.title COLLATE NOCASE ASC
    `);

    return rows.map((r) => this.mapRowToTrack(r));
  }

  public async toggleFavorite(trackId: string, isFavorite: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE tracks SET is_favorite = ? WHERE id = ?',
      isFavorite ? 1 : 0,
      trackId
    );
  }

  public async updateArtwork(trackId: string, artworkUri: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE tracks SET artwork_uri = ? WHERE id = ?',
      artworkUri,
      trackId
    );
  }

  public async updateAlbumArtwork(albumTitle: string, artworkUri: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE tracks SET artwork_uri = ? WHERE COALESCE(album_title, \'\') = ?',
      artworkUri,
      albumTitle
    );
  }

  public async updateMetadata(
    trackId: string,
    meta: {
      title?: string;
      artistName?: string | null;
      albumTitle?: string | null;
      genre?: string | null;
      year?: number | null;
    }
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE tracks
       SET title = COALESCE(?, title),
           artist_name = ?,
           album_title = ?,
           genre = ?,
           year = ?
       WHERE id = ?`,
      meta.title !== undefined ? meta.title.trim() || null : null,
      meta.artistName !== undefined ? meta.artistName?.trim() || null : null,
      meta.albumTitle !== undefined ? meta.albumTitle?.trim() || null : null,
      meta.genre !== undefined ? meta.genre?.trim() || null : null,
      meta.year ?? null,
      trackId
    );
  }

  public async updateLyrics(trackId: string, lyricsLrc: string | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE tracks SET lyrics_lrc = ? WHERE id = ?', lyricsLrc, trackId);
  }

  public async markCorrupt(trackId: string, isCorrupt: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE tracks SET is_corrupt = ? WHERE id = ?',
      isCorrupt ? 1 : 0,
      trackId
    );
  }

  public async deleteTrack(trackId: string): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM playlist_tracks WHERE track_id = ?', trackId);
      await db.runAsync('DELETE FROM play_history WHERE track_id = ?', trackId);
      await db.runAsync('DELETE FROM tracks WHERE id = ?', trackId);
    });
  }

  public async searchTracks(query: string): Promise<Track[]> {
    const db = await getDatabase();
    const searchTerm = `%${query.trim()}%`;
    const rows = await db.getAllAsync<any>(
      `
      ${BASE_TRACK_SELECT}
      WHERE t.title LIKE ?
         OR COALESCE(t.artist_name, a.name, '') LIKE ?
         OR COALESCE(t.album_title, al.title, '') LIKE ?
         OR COALESCE(t.genre, '') LIKE ?
         OR t.uri LIKE ?
      ORDER BY t.title COLLATE NOCASE ASC
      LIMIT 150
    `,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm
    );

    return rows.map((r) => this.mapRowToTrack(r));
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
        Math.max(0, Math.round(positionMs))
      );
    });
  }

  public async getPlayHistory(limit: number = 100): Promise<PlayHistoryEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `
      SELECT
        ph.id as historyId,
        ph.played_at as playedAt,
        ph.position as historyPosition,
        t.*,
        COALESCE(t.artist_name, a.name) as artistName,
        COALESCE(t.album_title, al.title) as albumTitle,
        COALESCE(t.artwork_uri, al.artwork_uri) as artworkUri
      FROM play_history ph
      JOIN tracks t ON ph.track_id = t.id
      LEFT JOIN artists a ON t.artist_id = a.id
      LEFT JOIN albums al ON t.album_id = al.id
      ORDER BY ph.played_at DESC
      LIMIT ?
    `,
      limit
    );

    return rows.map((row) => ({
      id: row.historyId,
      playedAt: row.playedAt,
      position: row.historyPosition || 0,
      track: this.mapRowToTrack(row),
    }));
  }

  private mapRowToTrack(row: any): Track {
    return {
      id: row.id,
      title: row.title,
      artistId: row.artist_id,
      artistName: row.artistName || row.artist_name || null,
      albumId: row.album_id,
      albumTitle: row.albumTitle || row.album_title || null,
      duration: row.duration,
      uri: row.uri,
      artworkUri: row.artworkUri || row.artwork_uri || null,
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
      folderPath: row.folder_path || null,
      lyricsLrc: row.lyrics_lrc || null,
      isCorrupt: row.is_corrupt === 1,
    };
  }
}
