import { OpenWaveNativeBridge } from '../src/playback/native/openwave-native-bridge';
import { Media3AudioAdapter } from '../src/playback/engine/media3-audio-adapter';

describe('OpenWaveNativeBridge & Media3AudioAdapter', () => {
  const globalAny = globalThis as any;
  const originalExpo = globalAny.expo;

  beforeEach(() => {
    delete globalAny.expo;
  });

  afterAll(() => {
    if (originalExpo === undefined) {
      delete globalAny.expo;
    } else {
      globalAny.expo = originalExpo;
    }
  });

  it('gracefully falls back without throwing when running in Expo Go (native module absent)', async () => {

    expect(OpenWaveNativeBridge.isNativeAvailable()).toBe(false);
    expect(await OpenWaveNativeBridge.loadTrack('file:///song.mp3')).toBe(false);
    expect(await OpenWaveNativeBridge.play()).toBe(false);
    expect(await OpenWaveNativeBridge.extractMetadata('file:///song.mp3')).toBeNull();
    expect(
      await OpenWaveNativeBridge.writeId3Tags('file:///song.mp3', { title: 'Test' })
    ).toBeNull();

    const castState = await OpenWaveNativeBridge.getCastState();
    expect(castState.available).toBe(false);
    expect(castState.state).toBe('expo_go_fallback');

    const castRes = await OpenWaveNativeBridge.castTrack({
      uri: 'https://example.com/audio.mp3',
      title: 'Test',
      artist: 'Artist',
      album: 'Album',
    });
    expect(castRes.started).toBe(false);

    // Non-throwing no-ops for Widget and Android Auto catalog
    OpenWaveNativeBridge.updateWidgetState({
      title: 'Track 1',
      artist: 'Artist 1',
      isPlaying: true,
    });
    OpenWaveNativeBridge.syncAndroidAutoCatalog([
      { id: '1', title: 'Track 1', uri: 'file:///song.mp3', isFavorite: true },
    ]);
  });

  it('routes Media3 playback, hardware DSP payload, and Android Auto serialization when native module exists', async () => {
    const listeners: Record<string, (payload: any) => void> = {};
    const mockNative = {
      isNativeAvailable: jest.fn(() => true),
      loadTrack: jest.fn(async () => true),
      updateMetadata: jest.fn(async () => true),
      play: jest.fn(async () => true),
      pause: jest.fn(async () => true),
      stop: jest.fn(async () => true),
      seekTo: jest.fn(async () => true),
      setVolume: jest.fn(async () => true),
      setPlaybackSpeed: jest.fn(async () => true),
      applyDspConfig: jest.fn(async () => ({ applied: true })),
      syncAndroidAutoCatalog: jest.fn(() => true),
      updateWidgetState: jest.fn(() => true),
      addListener: jest.fn((eventName: string, cb: (payload: any) => void) => {
        listeners[eventName] = cb;
        return { remove: jest.fn() };
      }),
    };
    globalAny.expo = {
      modules: {
        OpenWaveNative: mockNative,
      },
    };

    expect(OpenWaveNativeBridge.isNativeAvailable()).toBe(true);

    const dspApplied = await OpenWaveNativeBridge.applyDspConfig({
      enabled: true,
      bandGainsDb: [4, 2, -1, 3, 5],
      bassBoost: 65,
      trebleBoost: 40,
      surround: 50,
      virtualizer: 30,
      balance: -25,
      preampGainDb: 2.5,
      normalizeVolume: true,
    });
    expect(dspApplied).toBe(true);
    expect(mockNative.applyDspConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        bassBoost: 65,
        balance: -25,
        normalizeVolume: true,
      })
    );

    OpenWaveNativeBridge.syncAndroidAutoCatalog([
      {
        id: 't1',
        title: 'Mi Canción',
        artistName: 'Banda X',
        albumTitle: 'Disco 1',
        uri: 'file:///music/track1.mp3',
        isFavorite: true,
      },
    ]);
    expect(mockNative.syncAndroidAutoCatalog).toHaveBeenCalledTimes(1);
    const firstArg = (mockNative.syncAndroidAutoCatalog.mock.calls as any[][])[0]?.[0] as string;
    const parsedCatalog = JSON.parse(firstArg);
    expect(parsedCatalog[0]).toMatchObject({
      id: 't1',
      title: 'Mi Canción',
      artistName: 'Banda X',
      isFavorite: true,
    });

    const adapter = new Media3AudioAdapter();
    const statusSpy = jest.fn();
    const unsub = adapter.onStatusUpdate(statusSpy);

    await adapter.load('file:///music/track1.mp3', true, {
      title: 'Mi Canción',
      artist: 'Banda X',
      albumTitle: 'Disco 1',
    });
    expect(mockNative.loadTrack).toHaveBeenCalledWith(
      'file:///music/track1.mp3',
      true,
      'Mi Canción',
      'Banda X',
      'Disco 1',
      null
    );

    // Emit native Media3 playback status and verify field normalization
    listeners.onPlaybackStatus({
      isLoaded: true,
      isPlaying: true,
      positionMillis: 12500,
      durationMillis: 240000,
      didJustFinish: false,
      isBuffering: false,
    });

    expect(statusSpy).toHaveBeenCalledWith({
      isLoaded: true,
      isPlaying: true,
      positionMs: 12500,
      durationMs: 240000,
      didJustFinish: false,
      isBuffering: false,
      error: null,
    });

    unsub();
    await adapter.unload();
    expect(mockNative.stop).toHaveBeenCalled();
  });
});
