export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    artwork_uri TEXT,
    biography TEXT
);

CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    artist_id TEXT,
    artwork_uri TEXT,
    release_year INTEGER,
    FOREIGN KEY(artist_id) REFERENCES artists(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    artist_id TEXT,
    album_id TEXT,
    duration INTEGER NOT NULL,
    uri TEXT NOT NULL UNIQUE,
    mime_type TEXT,
    file_size INTEGER,
    bitrate INTEGER,
    sample_rate INTEGER,
    codec TEXT,
    track_number INTEGER DEFAULT 0,
    disc_number INTEGER DEFAULT 1,
    year INTEGER,
    genre TEXT,
    date_added INTEGER NOT NULL,
    last_played INTEGER,
    play_count INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    source_type TEXT DEFAULT 'local',
    FOREIGN KEY(artist_id) REFERENCES artists(id) ON DELETE SET NULL,
    FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_favorite INTEGER DEFAULT 0,
    is_smart_playlist INTEGER DEFAULT 0,
    smart_rules_json TEXT
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, track_id),
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id TEXT NOT NULL,
    played_at INTEGER NOT NULL,
    position INTEGER DEFAULT 0,
    FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    total_items INTEGER DEFAULT 0,
    imported_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS external_track_references (
    id TEXT PRIMARY KEY NOT NULL,
    track_id TEXT,
    import_job_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    external_id TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    match_status TEXT NOT NULL,
    FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE SET NULL,
    FOREIGN KEY(import_job_id) REFERENCES import_jobs(id) ON DELETE CASCADE
);

-- Fast lookup indices
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_is_favorite ON tracks(is_favorite);
CREATE INDEX IF NOT EXISTS idx_tracks_date_added ON tracks(date_added DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON tracks(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_pos ON playlist_tracks(playlist_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_history_played_at ON play_history(played_at DESC);
`;

