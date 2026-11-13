import { getDatabase } from '../database/connection';

export interface ErrorLogEntry {
  id: number;
  level: string;
  source: string;
  message: string;
  createdAt: number;
}

export class ErrorLogger {
  public static async log(
    source: string,
    message: string,
    level: 'ERROR' | 'WARN' | 'INFO' = 'ERROR'
  ): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'INSERT INTO error_logs (level, source, message, created_at) VALUES (?, ?, ?, ?)',
        level,
        source,
        message.slice(0, 1000),
        Date.now()
      );
    } catch {
      // Safe fallback if DB not ready
    }
  }

  public static async getLogs(limit: number = 50): Promise<ErrorLogEntry[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(
        'SELECT id, level, source, message, created_at as createdAt FROM error_logs ORDER BY id DESC LIMIT ?',
        limit
      );
      return rows;
    } catch {
      return [];
    }
  }

  public static async clearLogs(): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM error_logs');
    } catch {}
  }
}

