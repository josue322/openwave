// Native module resolution checks Expo JSI global first, then Expo runtime API safely
export interface NativePlaybackStatusEvent {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish: boolean;
  isBuffering: boolean;
  audioSessionId?: number;
  error?: string | null;
}

export interface NativeHeadphoneEvent {
  connected: boolean;
  deviceType: 'wired' | 'bluetooth' | 'audio_becoming_noisy' | string;
  deviceName: string;
}

export interface NativeWidgetActionEvent {
  action: 'prev' | 'play_pause' | 'next' | string;
}

export interface NativeRemoteCommandEvent {
  command: 'prev' | 'next' | string;
}

export interface NativeDspConfig {
  enabled: boolean;
  bandGainsDb: number[];
  bassBoost: number; // 0..100
  trebleBoost: number; // 0..100
  surround: number; // 0..100
  virtualizer: number; // 0..100
  balance: number; // -100..+100
  preampGainDb: number; // -6..+6
  normalizeVolume: boolean;
}

export interface ExtractedNativeMetadata {
  title?: string | null;
  artistName?: string | null;
  albumTitle?: string | null;
  genre?: string | null;
  year?: number | null;
  duration?: number | null;
  bitrate?: number | null;
  sampleRate?: number | null;
  mimeType?: string | null;
  artworkUri?: string | null;
  fileSize?: number | null;
  isCorrupt?: boolean;
}

export interface Id3WriteResult {
  success: boolean;
  message: string;
}

export interface CastStatus {
  available: boolean;
  connected: boolean;
  state: string;
  deviceName?: string | null;
  reason?: string;
}

export interface CastTrackResult {
  started: boolean;
  message?: string;
  deviceName?: string;
  needsDevicePicker?: boolean;
  requiresHttpSource?: boolean;
}

export interface AndroidAutoCatalogTrack {
  id: string;
  title: string;
  artistName?: string | null;
  albumTitle?: string | null;
  uri: string;
  artworkUri?: string | null;
  isFavorite?: boolean;
}

export interface WidgetStatePayload {
  title: string;
  artist: string;
  artworkUri?: string | null;
  isPlaying: boolean;
}

interface RawOpenWaveNativeModule {
  isNativeAvailable?: () => boolean;
  loadTrack: (
    uri: string,
    shouldPlay: boolean,
    title: string | null,
    artist: string | null,
    album: string | null,
    artworkUri: string | null
  ) => Promise<boolean>;
  updateMetadata: (
    title: string | null,
    artist: string | null,
    album: string | null,
    artworkUri: string | null
  ) => Promise<boolean>;
  play: () => Promise<boolean>;
  pause: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  seekTo: (positionMs: number) => Promise<boolean>;
  setVolume: (volume: number) => Promise<boolean>;
  setPlaybackSpeed: (speed: number) => Promise<boolean>;
  applyDspConfig: (payload: NativeDspConfig) => Promise<{ applied: boolean }>;
  extractMetadata: (uri: string) => Promise<ExtractedNativeMetadata>;
  writeId3Tags: (
    uri: string,
    title: string | null,
    artist: string | null,
    album: string | null,
    genre: string | null,
    artworkUri: string | null
  ) => Promise<Id3WriteResult>;
  updateWidgetState: (
    title: string,
    artist: string,
    artworkUri: string | null,
    isPlaying: boolean
  ) => boolean;
  syncAndroidAutoCatalog: (catalogJson: string) => boolean;
  getCastState: () => Promise<CastStatus>;
  openCastPicker: () => Promise<boolean>;
  castTrack: (
    uri: string,
    title: string,
    artist: string,
    album: string,
    artworkUri: string | null,
    positionMs: number
  ) => Promise<CastTrackResult>;
  stopCast: () => Promise<boolean>;
  addListener?: (eventName: string, listener: (event: any) => void) => { remove: () => void };
}

function getNativeModule(): RawOpenWaveNativeModule | null {
  try {
    const g = globalThis as any;
    const jsiModule = g?.expo?.modules?.OpenWaveNative;
    if (jsiModule) {
      return jsiModule as RawOpenWaveNativeModule;
    }

    // Avoid loading expo runtime entrypoint side-effects inside Node/Jest unit tests
    if (typeof process !== 'undefined' && process.env?.JEST_WORKER_ID) {
      return null;
    }

    // Static string require for Metro compatibility in Expo Go / Dev Build / APK
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoPkg = require('expo');
    return expoPkg?.requireOptionalNativeModule?.('OpenWaveNative') ?? null;
  } catch {
    return null;
  }
}

export const OpenWaveNativeBridge = {
  isNativeAvailable(): boolean {
    const mod = getNativeModule();
    if (!mod) return false;
    try {
      return typeof mod.isNativeAvailable === 'function' ? Boolean(mod.isNativeAvailable()) : true;
    } catch {
      return false;
    }
  },

  async loadTrack(
    uri: string,
    shouldPlay = true,
    metadata?: { title?: string; artist?: string; albumTitle?: string; artworkUrl?: string }
  ): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    return mod.loadTrack(
      uri,
      shouldPlay,
      metadata?.title ?? null,
      metadata?.artist ?? null,
      metadata?.albumTitle ?? null,
      metadata?.artworkUrl ?? null
    );
  },

  async updateMetadata(metadata: {
    title?: string;
    artist?: string;
    albumTitle?: string;
    artworkUrl?: string;
  }): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    return mod.updateMetadata(
      metadata.title ?? null,
      metadata.artist ?? null,
      metadata.albumTitle ?? null,
      metadata.artworkUrl ?? null
    );
  },

  async play(): Promise<boolean> {
    const mod = getNativeModule();
    return mod ? mod.play() : false;
  },

  async pause(): Promise<boolean> {
    const mod = getNativeModule();
    return mod ? mod.pause() : false;
  },

  async stop(): Promise<boolean> {
    const mod = getNativeModule();
    return mod ? mod.stop() : false;
  },

  async seekTo(positionMs: number): Promise<boolean> {
    const mod = getNativeModule();
    return mod ? mod.seekTo(Math.max(0, positionMs)) : false;
  },

  async setVolume(volume: number): Promise<boolean> {
    const mod = getNativeModule();
    return mod ? mod.setVolume(Math.min(1, Math.max(0, volume))) : false;
  },

  async setPlaybackSpeed(speed: number): Promise<boolean> {
    const mod = getNativeModule();
    return mod ? mod.setPlaybackSpeed(Math.min(3, Math.max(0.25, speed))) : false;
  },

  async applyDspConfig(config: NativeDspConfig): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    try {
      const res = await mod.applyDspConfig(config);
      return Boolean(res?.applied);
    } catch {
      return false;
    }
  },

  async extractMetadata(uri: string): Promise<ExtractedNativeMetadata | null> {
    const mod = getNativeModule();
    if (!mod) return null;
    try {
      return await mod.extractMetadata(uri);
    } catch {
      return null;
    }
  },

  async writeId3Tags(
    uri: string,
    tags: {
      title?: string;
      artist?: string;
      album?: string;
      genre?: string;
      artworkUri?: string | null;
    }
  ): Promise<Id3WriteResult | null> {
    const mod = getNativeModule();
    if (!mod) return null;
    try {
      return await mod.writeId3Tags(
        uri,
        tags.title ?? null,
        tags.artist ?? null,
        tags.album ?? null,
        tags.genre ?? null,
        tags.artworkUri ?? null
      );
    } catch {
      return null;
    }
  },

  updateWidgetState(state: WidgetStatePayload): void {
    const mod = getNativeModule();
    if (!mod) return;
    try {
      mod.updateWidgetState(
        state.title || 'OPENWAVE',
        state.artist || 'Artista desconocido',
        state.artworkUri ?? null,
        Boolean(state.isPlaying)
      );
    } catch {
      // Widget refresh is best-effort
    }
  },

  syncAndroidAutoCatalog(tracks: AndroidAutoCatalogTrack[]): void {
    const mod = getNativeModule();
    if (!mod) return;
    try {
      const minimal = tracks.slice(0, 1000).map((t) => ({
        id: t.id,
        title: t.title,
        artistName: t.artistName ?? 'Artista desconocido',
        albumTitle: t.albumTitle ?? 'Álbum desconocido',
        uri: t.uri,
        artworkUri: t.artworkUri ?? '',
        isFavorite: Boolean(t.isFavorite),
      }));
      mod.syncAndroidAutoCatalog(JSON.stringify(minimal));
    } catch {
      // Best-effort catalog serialization
    }
  },

  async getCastState(): Promise<CastStatus> {
    const mod = getNativeModule();
    if (!mod) {
      return {
        available: false,
        connected: false,
        state: 'expo_go_fallback',
        deviceName: null,
        reason: 'Google Cast requiere Development Build o APK compilado con el módulo nativo.',
      };
    }
    try {
      return await mod.getCastState();
    } catch {
      return {
        available: false,
        connected: false,
        state: 'error',
        deviceName: null,
        reason: 'No se pudo consultar el estado de Chromecast.',
      };
    }
  },

  async openCastPicker(): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    try {
      return await mod.openCastPicker();
    } catch {
      return false;
    }
  },

  async castTrack(params: {
    uri: string;
    title: string;
    artist: string;
    album: string;
    artworkUri?: string | null;
    positionMs?: number;
  }): Promise<CastTrackResult> {
    const mod = getNativeModule();
    if (!mod) {
      return {
        started: false,
        message: 'Chromecast requiere el Development Build o APK compilado de OpenWave.',
      };
    }
    try {
      return await mod.castTrack(
        params.uri,
        params.title,
        params.artist,
        params.album,
        params.artworkUri ?? null,
        params.positionMs ?? 0
      );
    } catch {
      return {
        started: false,
        message: 'No se pudo iniciar la transmisión Chromecast.',
      };
    }
  },

  async stopCast(): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    try {
      return await mod.stopCast();
    } catch {
      return false;
    }
  },

  subscribeEvent<T>(eventName: string, listener: (payload: T) => void): () => void {
    const mod = getNativeModule();
    if (!mod || typeof mod.addListener !== 'function') {
      return () => {};
    }
    try {
      const sub = mod.addListener(eventName, listener);
      return () => {
        try {
          sub?.remove();
        } catch {}
      };
    } catch {
      return () => {};
    }
  },
};
