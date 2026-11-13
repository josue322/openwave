import * as FileSystem from 'expo-file-system/legacy';

export interface StorageUsageReport {
  musicBytes: number;
  downloadsBytes: number;
  artworkBytes: number;
  cacheBytes: number;
  totalBytes: number;
}

async function getFolderSizeBytes(dirUri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(dirUri);
    if (!info.exists || !info.isDirectory) return 0;

    const items = await FileSystem.readDirectoryAsync(dirUri);
    let total = 0;
    for (const name of items) {
      const child = `${dirUri.endsWith('/') ? dirUri : `${dirUri}/`}${name}`;
      const childInfo = await FileSystem.getInfoAsync(child);
      if (childInfo.exists) {
        if (childInfo.isDirectory) {
          total += await getFolderSizeBytes(child);
        } else if ('size' in childInfo && typeof childInfo.size === 'number') {
          total += childInfo.size;
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export async function calculateAppStorageUsage(): Promise<StorageUsageReport> {
  const doc = FileSystem.documentDirectory || '';
  const cache = FileSystem.cacheDirectory || '';

  const [musicBytes, downloadsBytes, artworkBytes, cacheBytes] = await Promise.all([
    getFolderSizeBytes(`${doc}openwave_music/`),
    getFolderSizeBytes(`${doc}openwave_downloads/`),
    getFolderSizeBytes(`${doc}artworks/`),
    getFolderSizeBytes(cache),
  ]);

  return {
    musicBytes,
    downloadsBytes,
    artworkBytes,
    cacheBytes,
    totalBytes: musicBytes + downloadsBytes + artworkBytes + cacheBytes,
  };
}

/**
 * Safely deletes temporary files inside cacheDirectory without touching user music or artworks.
 */
export async function clearAppCache(): Promise<number> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return 0;

  try {
    const before = await getFolderSizeBytes(cacheDir);
    const items = await FileSystem.readDirectoryAsync(cacheDir);
    for (const item of items) {
      await FileSystem.deleteAsync(`${cacheDir}${item}`, { idempotent: true }).catch(() => {});
    }
    return before;
  } catch {
    return 0;
  }
}

