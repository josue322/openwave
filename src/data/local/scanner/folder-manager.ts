import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../../../core/database/connection';
import { Track } from '../../../domain/entities/track';
import { TrackDao } from '../track-dao';
import { useLibraryStore } from '../../../store/library-store';

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.aac', '.m4a', '.ogg', '.opus'];

export interface ScannedFolderRecord {
  uri: string;
  label: string;
  addedAt: number;
}

export class FolderManager {
  private static trackDao = new TrackDao();

  public static async getExcludedFolders(): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ path: string }>(
      'SELECT path FROM excluded_folders ORDER BY created_at DESC'
    );
    return rows.map((r) => r.path);
  }

  public static async addExcludedFolder(path: string): Promise<void> {
    const clean = path.trim();
    if (!clean) return;
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR IGNORE INTO excluded_folders (path, created_at) VALUES (?, ?)',
      clean,
      Date.now()
    );
  }

  public static async removeExcludedFolder(path: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM excluded_folders WHERE path = ?', path);
  }

  public static async getScannedFolders(): Promise<ScannedFolderRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT uri, label, added_at as addedAt FROM scanned_folders ORDER BY added_at DESC'
    );
    return rows.map((r) => ({
      uri: r.uri,
      label: r.label || 'Carpeta local',
      addedAt: r.addedAt || Date.now(),
    }));
  }

  public static async removeScannedFolder(uri: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM scanned_folders WHERE uri = ?', uri);
  }

  /**
   * Opens Android Storage Access Framework directory picker to import all audio files in a folder.
   */
  public static async pickAndImportFolder(): Promise<{ folderLabel: string; importedCount: number }> {
    const { StorageAccessFramework } = FileSystem;
    const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permission.granted || !permission.directoryUri) {
      return { folderLabel: '', importedCount: 0 };
    }

    const dirUri = permission.directoryUri;
    const folderLabel = this.extractFolderLabel(dirUri);
    const db = await getDatabase();

    await db.runAsync(
      'INSERT OR REPLACE INTO scanned_folders (uri, label, added_at) VALUES (?, ?, ?)',
      dirUri,
      folderLabel,
      Date.now()
    );

    const imported = await this.scanSafFolder(dirUri, folderLabel);
    return { folderLabel, importedCount: imported.length };
  }

  public static async scanSafFolder(dirUri: string, folderLabel: string): Promise<Track[]> {
    const { StorageAccessFramework } = FileSystem;
    const excluded = await this.getExcludedFolders();
    if (excluded.some((ex) => dirUri.toLowerCase().includes(ex.toLowerCase()))) {
      return [];
    }

    const entries = await StorageAccessFramework.readDirectoryAsync(dirUri);
    const tracks: Track[] = [];

    for (const fileUri of entries) {
      const decodedName = this.decodeSafFilename(fileUri);
      const lower = decodedName.toLowerCase();
      const matchedExt = AUDIO_EXTENSIONS.find((ext) => lower.endsWith(ext));
      if (!matchedExt) continue;

      const cleanTitle = decodedName.replace(/\.[^/.]+$/, '').replace(/^[0-9\s-_.]+/, '').trim() || decodedName;

      tracks.push({
        id: `saf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        title: cleanTitle,
        artistName: 'Música Local',
        albumTitle: folderLabel,
        duration: 180000,
        uri: fileUri,
        mimeType: this.extToMime(matchedExt),
        dateAdded: Date.now(),
        playCount: 0,
        isFavorite: false,
        sourceType: 'local',
        folderPath: folderLabel,
      });
    }

    if (tracks.length > 0) {
      await this.trackDao.insertBatch(tracks);
      const all = await this.trackDao.getAllTracks();
      const favs = await this.trackDao.getFavorites();
      useLibraryStore.getState().setTracks(all);
      useLibraryStore.getState().setFavorites(favs);
    }

    return tracks;
  }

  private static extractFolderLabel(dirUri: string): string {
    try {
      const decoded = decodeURIComponent(dirUri);
      const segments = decoded.split(/[:/]/).filter(Boolean);
      return segments[segments.length - 1] || 'Carpeta Musical';
    } catch {
      return 'Carpeta Musical';
    }
  }

  private static decodeSafFilename(fileUri: string): string {
    try {
      const decoded = decodeURIComponent(fileUri);
      const segments = decoded.split('/');
      const last = segments[segments.length - 1] || decoded;
      const colonParts = last.split(':');
      return colonParts[colonParts.length - 1] || last;
    } catch {
      return fileUri;
    }
  }

  private static extToMime(ext: string): string {
    switch (ext) {
      case '.mp3':
        return 'audio/mpeg';
      case '.flac':
        return 'audio/flac';
      case '.wav':
        return 'audio/wav';
      case '.m4a':
      case '.aac':
        return 'audio/mp4';
      case '.ogg':
        return 'audio/ogg';
      case '.opus':
        return 'audio/opus';
      default:
        return 'audio/*';
    }
  }
}

