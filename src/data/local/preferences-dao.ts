import { getDatabase } from '../../core/database/connection';

export class PreferencesDao {
  public async setPreference(key: string, value: unknown): Promise<void> {
    const db = await getDatabase();
    const serialized = JSON.stringify(value);
    await db.runAsync(
      'INSERT OR REPLACE INTO app_preferences (key, value) VALUES (?, ?)',
      key,
      serialized
    );
  }

  public async getAllPreferences(): Promise<Record<string, unknown>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_preferences'
    );
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        map[row.key] = JSON.parse(row.value);
      } catch {
        map[row.key] = row.value;
      }
    }
    return map;
  }

  public async clearAllPreferences(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM app_preferences');
  }
}

