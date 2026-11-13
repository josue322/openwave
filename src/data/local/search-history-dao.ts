import { getDatabase } from '../../core/database/connection';

export class SearchHistoryDao {
  public async saveQuery(query: string): Promise<void> {
    const clean = query.trim();
    if (clean.length < 2) return;
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO search_history (query, searched_at) VALUES (?, ?)',
      clean,
      Date.now()
    );
  }

  public async getRecentQueries(limit: number = 12): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ query: string }>(
      'SELECT query FROM search_history ORDER BY searched_at DESC LIMIT ?',
      limit
    );
    return rows.map((r) => r.query);
  }

  public async deleteQuery(query: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM search_history WHERE query = ?', query);
  }

  public async clearHistory(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM search_history');
  }
}

