import { getDatabase } from '../../core/database/connection';
import { Playlist, PlaylistWithTracks } from '../../domain/entities/playlist';
import { Track } from '../../domain/entities/track';

export class PlaylistDao {
  public async createPlaylist(
    name: string,
    description?: string,
    isSmartPlaylist: boolean = false
  ): Promise<Playlist> {
    const db = await getDatabase();
    const id = `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO playlists (id, name, description, created_at, updated_at, is_favorite, is_smart_playlist)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      id,
      name,
      description || null,
      now,
      now,
      isSmartPlaylist ? 1 : 0
    );

    return {
      id,
      name,
      description: description || null,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      isSmartPlaylist,
      trackCount: 0,
    };
  }

  public async getAllPlaylists(): Promise<Playlist[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`
      SELECT 
        p.*,
        COUNT(pt.track_id) as trackCount
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isFavorite: r.is_favorite === 1,
      isSmartPlaylist: r.is_smart_playlist === 1,
      smartRulesJson: r.smart_rules_json,
      trackCount: r.trackCount || 0,
    }));
  }

  public async getPlaylistWithTracks(playlistId: string): Promise<PlaylistWithTracks | null> {
    const db = await getDatabase();
    const plRow = await db.getFirstAsync<any>(
      `SELECT * FROM playlists WHERE id = ?`,
      playlistId
    );

    if (!plRow) return null;

    const trackRows = await db.getAllAsync<any>(
      `
      SELECT 
        t.*,
        a.name as artistName,
        al.title as albumTitle,
        al.artwork_uri as artworkUri,
        pt.position
      FROM playlist_tracks pt
      JOIN tracks t ON pt.track_id = t.id
      LEFT JOIN artists a ON t.artist_id = a.id
      LEFT JOIN albums al ON t.album_id = al.id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position ASC
    `,
      playlistId
    );

    const tracks: Track[] = trackRows.map((r) => ({
      id: r.id,
      title: r.title,
      artistId: r.artist_id,
      artistName: r.artistName || null,
      albumId: r.album_id,
      albumTitle: r.albumTitle || null,
      duration: r.duration,
      uri: r.uri,
      artworkUri: r.artworkUri || null,
      mimeType: r.mime_type,
      fileSize: r.file_size,
      bitrate: r.bitrate,
      sampleRate: r.sample_rate,
      codec: r.codec,
      trackNumber: r.track_number,
      discNumber: r.disc_number,
      year: r.year,
      genre: r.genre,
      dateAdded: r.date_added,
      lastPlayed: r.last_played,
      playCount: r.play_count || 0,
      isFavorite: r.is_favorite === 1,
      sourceType: r.source_type || 'local',
    }));

    return {
      id: plRow.id,
      name: plRow.name,
      description: plRow.description,
      createdAt: plRow.created_at,
      updatedAt: plRow.updated_at,
      isFavorite: plRow.is_favorite === 1,
      isSmartPlaylist: plRow.is_smart_playlist === 1,
      smartRulesJson: plRow.smart_rules_json,
      trackCount: tracks.length,
      tracks,
    };
  }

  public async addTrack(playlistId: string, trackId: string): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();

    await db.withTransactionAsync(async () => {
      const posRow = await db.getFirstAsync<{ maxPos: number }>(
        `SELECT COALESCE(MAX(position), -1) as maxPos FROM playlist_tracks WHERE playlist_id = ?`,
        playlistId
      );
      const nextPos = (posRow?.maxPos ?? -1) + 1;

      await db.runAsync(
        `INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at)
         VALUES (?, ?, ?, ?)`,
        playlistId,
        trackId,
        nextPos,
        now
      );

      await db.runAsync(
        `UPDATE playlists SET updated_at = ? WHERE id = ?`,
        now,
        playlistId
      );
    });
  }

  public async removeTrack(playlistId: string, trackId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?`,
      playlistId,
      trackId
    );
  }

  public async deletePlaylist(playlistId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM playlists WHERE id = ?`, playlistId);
  }
}
