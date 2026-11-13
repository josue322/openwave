import { getDatabase } from '../../core/database/connection';
import { RepeatMode } from '../../domain/entities/track';

export interface SavedPlaybackSession {
  trackId: string | null;
  queueIds: string[];
  positionMs: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playbackSpeed: number;
  volume: number;
  updatedAt: number;
}

const SESSION_ROW_ID = 'default';

export class PlaybackSessionDao {
  /**
   * Persists the active playback session so playback can resume cleanly on app relaunch.
   */
  public async saveSession(session: Omit<SavedPlaybackSession, 'updatedAt'>): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    const queueIdsJson = JSON.stringify(session.queueIds);

    await db.runAsync(
      `INSERT OR REPLACE INTO playback_session (
        id, track_id, queue_ids_json, position_ms, shuffle, repeat_mode, playback_speed, volume, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      SESSION_ROW_ID,
      session.trackId,
      queueIdsJson,
      Math.max(0, Math.round(session.positionMs)),
      session.shuffle ? 1 : 0,
      session.repeatMode,
      session.playbackSpeed,
      session.volume,
      now
    );
  }

  /**
   * Retrieves the last saved playback session, if any exists.
   */
  public async getSession(): Promise<SavedPlaybackSession | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM playback_session WHERE id = ?`,
      SESSION_ROW_ID
    );

    if (!row) return null;

    let queueIds: string[] = [];
    if (row.queue_ids_json) {
      try {
        const parsed = JSON.parse(row.queue_ids_json);
        if (Array.isArray(parsed)) {
          queueIds = parsed.filter((item): item is string => typeof item === 'string');
        }
      } catch {
        queueIds = [];
      }
    }

    const repeatMode: RepeatMode =
      row.repeat_mode === 'all' || row.repeat_mode === 'one' ? row.repeat_mode : 'off';

    return {
      trackId: row.track_id || null,
      queueIds,
      positionMs: typeof row.position_ms === 'number' ? row.position_ms : 0,
      shuffle: row.shuffle === 1,
      repeatMode,
      playbackSpeed:
        typeof row.playback_speed === 'number' && row.playback_speed > 0
          ? row.playback_speed
          : 1.0,
      volume: typeof row.volume === 'number' ? Math.max(0, Math.min(1, row.volume)) : 1.0,
      updatedAt: row.updated_at || Date.now(),
    };
  }
}

