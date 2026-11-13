export interface Track {
  id: string;
  title: string;
  artistId?: string | null;
  artistName?: string | null;
  albumId?: string | null;
  albumTitle?: string | null;
  duration: number; // in milliseconds
  uri: string;
  artworkUri?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  bitrate?: number | null;
  sampleRate?: number | null;
  codec?: string | null;
  trackNumber?: number;
  discNumber?: number;
  year?: number | null;
  genre?: string | null;
  dateAdded: number;
  lastPlayed?: number | null;
  playCount: number;
  isFavorite: boolean;
  sourceType: 'local' | 'stream';
  folderPath?: string | null;
  lyricsLrc?: string | null;
  isCorrupt?: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';

