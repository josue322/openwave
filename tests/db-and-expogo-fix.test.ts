const mockExecAsync = jest.fn().mockResolvedValue(undefined);
const mockGetFirstAsync = jest.fn().mockResolvedValue({ version: 0 });
const mockRunAsync = jest.fn().mockResolvedValue(undefined);
const mockOpenDatabaseAsync = jest.fn(async () => {
  // Simulate async SQLite initialization latency
  await new Promise((r) => setTimeout(r, 15));
  return {
    execAsync: mockExecAsync,
    getFirstAsync: mockGetFirstAsync,
    runAsync: mockRunAsync,
  };
});

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args: any[]) => (mockOpenDatabaseAsync as any)(...args),
}));

const mockSetActiveForLockScreen = jest.fn();
const mockUpdateLockScreenMetadata = jest.fn();
const mockPlayer = {
  volume: 1,
  duration: 180,
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  seekTo: jest.fn().mockResolvedValue(undefined),
  setPlaybackRate: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  setActiveForLockScreen: mockSetActiveForLockScreen,
  updateLockScreenMetadata: mockUpdateLockScreenMetadata,
  clearLockScreenControls: jest.fn(),
};

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  requestNotificationPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  preload: jest.fn().mockResolvedValue(undefined),
}));

import { getDatabase } from '../src/core/database/connection';
import { ExpoAudioAdapter } from '../src/playback/engine/expo-audio-adapter';

describe('Database migration concurrency & Expo Go lock screen safety', () => {
  const globalAny = globalThis as any;
  const originalExpo = globalAny.expo;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalExpo === undefined) {
      delete globalAny.expo;
    } else {
      globalAny.expo = originalExpo;
    }
  });

  it('serializes concurrent getDatabase() calls so migrations run exactly once with INSERT OR IGNORE', async () => {
    const [db1, db2, db3] = await Promise.all([
      getDatabase(),
      getDatabase(),
      getDatabase(),
    ]);

    expect(db1).toBe(db2);
    expect(db2).toBe(db3);
    expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(mockGetFirstAsync).toHaveBeenCalledTimes(1);

    const insertSqls = mockRunAsync.mock.calls.map((c) => c[0] as string);
    expect(insertSqls.length).toBeGreaterThan(0);
    for (const sql of insertSqls) {
      expect(sql).toContain('INSERT OR IGNORE INTO _migrations');
    }
  });

  it('skips setActiveForLockScreen on Android inside Expo Go to avoid jsLogger service binding errors', async () => {
    globalAny.expo = { modules: { ExpoGo: { expoVersion: '58.0.0' } } };

    const adapter = new ExpoAudioAdapter();
    await adapter.load('file:///music/demo.mp3', true, {
      title: 'Demo Song',
      artist: 'Demo Artist',
    });

    expect(mockPlayer.play).toHaveBeenCalled();
    expect(mockSetActiveForLockScreen).not.toHaveBeenCalled();
    expect(mockUpdateLockScreenMetadata).not.toHaveBeenCalled();

    adapter.updateMetadata({ title: 'Updated' });
    expect(mockUpdateLockScreenMetadata).not.toHaveBeenCalled();
  });

  it('enables lock screen controls outside Expo Go (e.g. compiled native APK fallback)', async () => {
    delete globalAny.expo;

    const adapter = new ExpoAudioAdapter();
    await adapter.load('file:///music/demo.mp3', false, {
      title: 'DevBuild Song',
      artist: 'OpenWave',
    });

    expect(mockSetActiveForLockScreen).toHaveBeenCalledTimes(1);
  });
});
