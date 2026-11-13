import { create } from 'zustand';
import { PreferencesDao } from '../data/local/preferences-dao';
import { usePlayerStore } from './player-store';

export type ThemeMode = 'dark' | 'light';
export type AppLanguage = 'es' | 'en';

export interface AppSettings {
  themeMode: ThemeMode;
  accentColor: string;
  dynamicArtworkColor: boolean;
  language: AppLanguage;
  gaplessPlayback: boolean;
  crossfadeSeconds: number;
  normalizeVolume: boolean;
  autoPlaySimilar: boolean;
  pauseOnHeadphoneDisconnect: boolean;
  resumeOnHeadphoneConnect: boolean;
  autoScanOnLaunch: boolean;
  streamQuality: 'high' | 'standard';
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: 'dark',
  accentColor: '#00E5FF',
  dynamicArtworkColor: true,
  language: 'es',
  gaplessPlayback: true,
  crossfadeSeconds: 0,
  normalizeVolume: false,
  autoPlaySimilar: false,
  pauseOnHeadphoneDisconnect: true,
  resumeOnHeadphoneConnect: false,
  autoScanOnLaunch: false,
  streamQuality: 'high',
};

interface SettingsState extends AppSettings {
  isHydrated: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetDefaults: () => Promise<void>;
}

const prefsDao = new PreferencesDao();
const PREF_KEY = 'app_settings_v1';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_APP_SETTINGS,
  isHydrated: false,

  loadSettings: async () => {
    try {
      const all = await prefsDao.getAllPreferences();
      const saved = all[PREF_KEY] as Partial<AppSettings> | undefined;
      if (saved && typeof saved === 'object') {
        const merged = { ...DEFAULT_APP_SETTINGS, ...saved };
        set({ ...merged, isHydrated: true });
        usePlayerStore.getState().setStreamQuality(merged.streamQuality);
        return;
      }
    } catch {}
    set({ isHydrated: true });
  },

  updateSetting: async (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    if (key === 'streamQuality') {
      usePlayerStore.getState().setStreamQuality(value as 'high' | 'standard');
    }
    try {
      const current = get();
      const snapshot: AppSettings = {
        themeMode: current.themeMode,
        accentColor: current.accentColor,
        dynamicArtworkColor: current.dynamicArtworkColor,
        language: current.language,
        gaplessPlayback: current.gaplessPlayback,
        crossfadeSeconds: current.crossfadeSeconds,
        normalizeVolume: current.normalizeVolume,
        autoPlaySimilar: current.autoPlaySimilar,
        pauseOnHeadphoneDisconnect: current.pauseOnHeadphoneDisconnect,
        resumeOnHeadphoneConnect: current.resumeOnHeadphoneConnect,
        autoScanOnLaunch: current.autoScanOnLaunch,
        streamQuality: current.streamQuality,
      };
      await prefsDao.setPreference(PREF_KEY, snapshot);
    } catch {}
  },

  resetDefaults: async () => {
    set({ ...DEFAULT_APP_SETTINGS });
    usePlayerStore.getState().setStreamQuality(DEFAULT_APP_SETTINGS.streamQuality);
    try {
      await prefsDao.setPreference(PREF_KEY, DEFAULT_APP_SETTINGS);
    } catch {}
  },
}));

