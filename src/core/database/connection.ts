import * as SQLite from 'expo-sqlite';
import {
  SCHEMA_V1,
  SCHEMA_V3,
  SCHEMA_V4_TABLES,
  SCHEMA_V4_COLUMNS,
} from './schema';

const DB_NAME = 'openwave.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // Enable foreign keys and Write-Ahead Logging (WAL) for high performance
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync('PRAGMA journal_mode = WAL;');

    await initMigrations(db);
    dbInstance = db;
    return db;
  })();

  try {
    return await dbInitPromise;
  } catch (err) {
    dbInitPromise = null;
    dbInstance = null;
    throw err;
  }
}

async function initMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Metadata table for database versioning
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM _migrations'
  );

  const currentVersion = row?.version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(SCHEMA_V1);
    await db.runAsync(
      'INSERT OR IGNORE INTO _migrations (version, applied_at) VALUES (?, ?)',
      1,
      Date.now()
    );
  }

  if (currentVersion < 2) {
    try {
      await db.execAsync('ALTER TABLE tracks ADD COLUMN artwork_uri TEXT;');
    } catch (e) {
      // Column might already exist in fresh table creations
    }
    await db.runAsync(
      'INSERT OR IGNORE INTO _migrations (version, applied_at) VALUES (?, ?)',
      2,
      Date.now()
    );
  }

  if (currentVersion < 3) {
    await db.execAsync(SCHEMA_V3);
    await db.runAsync(
      'INSERT OR IGNORE INTO _migrations (version, applied_at) VALUES (?, ?)',
      3,
      Date.now()
    );
  }

  if (currentVersion < 4) {
    for (const stmt of SCHEMA_V4_COLUMNS) {
      try {
        await db.execAsync(stmt);
      } catch {
        // Ignore if column already exists
      }
    }
    await db.execAsync(SCHEMA_V4_TABLES);
    await db.runAsync(
      'INSERT OR IGNORE INTO _migrations (version, applied_at) VALUES (?, ?)',
      4,
      Date.now()
    );
  }
}

