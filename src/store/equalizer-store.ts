import { create } from 'zustand';
import { PreferencesDao } from '../data/local/preferences-dao';
import { useSettingsStore } from './settings-store';
import { OpenWaveNativeBridge } from '../playback/native/openwave-native-bridge';

export interface EqualizerBand {
  frequency: string;
  gain: number; // -10 dB to +10 dB
}

export type EqualizerPresetName =
  | 'Plano'
  | 'Rock'
  | 'Pop'
  | 'Clásica'
  | 'Jazz'
  | 'Electrónica'
  | 'Hip-Hop'
  | 'Graves'
  | 'Vocal'
  | 'Flat';

export const EQUALIZER_PRESETS: Record<EqualizerPresetName, number[]> = {
  Plano: [0, 0, 0, 0, 0],
  Flat: [0, 0, 0, 0, 0],
  Rock: [4, 2, -1, 3, 5],
  Pop: [-1, 2, 4, 2, -1],
  Clásica: [3, 1, -1, 2, 4],
  Jazz: [3, 2, 0, 2, 3],
  'Electrónica': [5, 3, 0, 2, 4],
  'Hip-Hop': [5, 4, 0, 1, 3],
  Graves: [6, 4, 1, 0, 0],
  Vocal: [-2, 1, 5, 3, -1],
};

export const SPANISH_PRESETS: EqualizerPresetName[] = [
  'Plano',
  'Rock',
  'Pop',
  'Clásica',
  'Jazz',
  'Electrónica',
  'Hip-Hop',
  'Graves',
  'Vocal',
];

export interface SavedEqProfile {
  name: string;
  gains: number[];
  bassBoost: number;
  trebleBoost: number;
  surround: number;
  virtualizer: number;
  balance: number;
  preampGain: number;
}

interface EqualizerState {
  enabled: boolean;
  selectedPreset: string;
  bands: EqualizerBand[];
  bassBoost: number; // 0 to 100
  trebleBoost: number; // 0 to 100
  surround: number; // 0 to 100
  virtualizer: number; // 0 to 100
  balance: number; // -100 (L) to +100 (R)
  preampGain: number; // -6 to +6 dB
  customProfiles: SavedEqProfile[];

  setEnabled: (enabled: boolean) => void;
  setBandGain: (index: number, gain: number) => void;
  applyPreset: (preset: EqualizerPresetName) => void;
  setBassBoost: (level: number) => void;
  setTrebleBoost: (level: number) => void;
  setSurround: (level: number) => void;
  setVirtualizer: (level: number) => void;
  setBalance: (balance: number) => void;
  setPreampGain: (gain: number) => void;
  saveCustomProfile: (name: string) => Promise<void>;
  applyCustomProfile: (profile: SavedEqProfile) => void;
  deleteCustomProfile: (name: string) => Promise<void>;
  loadSavedEqState: () => Promise<void>;
}

const DEFAULT_FREQUENCIES = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];
const prefsDao = new PreferencesDao();
const EQ_PREF_KEY = 'equalizer_state_v2';

function pushDspToNative(state: EqualizerState, normalizeVolumeOverride?: boolean): void {
  const normalizeVolume =
    normalizeVolumeOverride !== undefined
      ? normalizeVolumeOverride
      : useSettingsStore.getState().normalizeVolume;

  OpenWaveNativeBridge.applyDspConfig({
    enabled: state.enabled,
    bandGainsDb: state.bands.map((b) => b.gain),
    bassBoost: state.bassBoost,
    trebleBoost: state.trebleBoost,
    surround: state.surround,
    virtualizer: state.virtualizer,
    balance: state.balance,
    preampGainDb: state.preampGain,
    normalizeVolume,
  }).catch(() => {});
}

async function persistEqSnapshot(state: EqualizerState): Promise<void> {
  pushDspToNative(state);
  try {
    await prefsDao.setPreference(EQ_PREF_KEY, {
      enabled: state.enabled,
      selectedPreset: state.selectedPreset,
      gains: state.bands.map((b) => b.gain),
      bassBoost: state.bassBoost,
      trebleBoost: state.trebleBoost,
      surround: state.surround,
      virtualizer: state.virtualizer,
      balance: state.balance,
      preampGain: state.preampGain,
      customProfiles: state.customProfiles,
    });
  } catch {}
}

useSettingsStore.subscribe((state, prev) => {
  if (state.normalizeVolume !== prev.normalizeVolume) {
    pushDspToNative(useEqualizerStore.getState(), state.normalizeVolume);
  }
});

export const useEqualizerStore = create<EqualizerState>((set, get) => ({
  enabled: false,
  selectedPreset: 'Plano',
  bands: DEFAULT_FREQUENCIES.map((freq) => ({ frequency: freq, gain: 0 })),
  bassBoost: 0,
  trebleBoost: 0,
  surround: 0,
  virtualizer: 0,
  balance: 0,
  preampGain: 0,
  customProfiles: [],

  setEnabled: (enabled) => {
    set({ enabled });
    persistEqSnapshot(get()).catch(() => {});
  },

  setBandGain: (index, gain) =>
    set((state) => {
      const updated = [...state.bands];
      if (index >= 0 && index < updated.length) {
        updated[index] = { ...updated[index], gain: Math.max(-10, Math.min(10, gain)) };
      }
      const next = { ...state, bands: updated, selectedPreset: 'Personalizado' };
      persistEqSnapshot(next).catch(() => {});
      return { bands: updated, selectedPreset: 'Personalizado' };
    }),

  applyPreset: (preset) =>
    set((state) => {
      const canonical = preset === 'Flat' ? 'Plano' : preset;
      const gains = EQUALIZER_PRESETS[canonical] || EQUALIZER_PRESETS[preset] || [0, 0, 0, 0, 0];
      const updatedBands = DEFAULT_FREQUENCIES.map((freq, i) => ({
        frequency: freq,
        gain: gains[i] ?? 0,
      }));
      const next = { ...state, selectedPreset: canonical, bands: updatedBands };
      persistEqSnapshot(next).catch(() => {});
      return { selectedPreset: canonical, bands: updatedBands };
    }),

  setBassBoost: (bassBoost) => {
    const clamped = Math.max(0, Math.min(100, bassBoost));
    set({ bassBoost: clamped });
    persistEqSnapshot(get()).catch(() => {});
  },

  setTrebleBoost: (trebleBoost) => {
    const clamped = Math.max(0, Math.min(100, trebleBoost));
    set({ trebleBoost: clamped });
    persistEqSnapshot(get()).catch(() => {});
  },

  setSurround: (surround) => {
    const clamped = Math.max(0, Math.min(100, surround));
    set({ surround: clamped });
    persistEqSnapshot(get()).catch(() => {});
  },

  setVirtualizer: (virtualizer) => {
    const clamped = Math.max(0, Math.min(100, virtualizer));
    set({ virtualizer: clamped });
    persistEqSnapshot(get()).catch(() => {});
  },

  setBalance: (balance) => {
    const clamped = Math.max(-100, Math.min(100, balance));
    set({ balance: clamped });
    persistEqSnapshot(get()).catch(() => {});
  },

  setPreampGain: (preampGain) => {
    const clamped = Math.max(-6, Math.min(6, preampGain));
    set({ preampGain: clamped });
    persistEqSnapshot(get()).catch(() => {});
  },

  saveCustomProfile: async (name) => {
    const clean = name.trim();
    if (!clean) return;
    const s = get();
    const profile: SavedEqProfile = {
      name: clean,
      gains: s.bands.map((b) => b.gain),
      bassBoost: s.bassBoost,
      trebleBoost: s.trebleBoost,
      surround: s.surround,
      virtualizer: s.virtualizer,
      balance: s.balance,
      preampGain: s.preampGain,
    };
    const filtered = s.customProfiles.filter((p) => p.name.toLowerCase() !== clean.toLowerCase());
    const updatedProfiles = [profile, ...filtered];
    set({ customProfiles: updatedProfiles, selectedPreset: clean });
    await persistEqSnapshot({ ...s, customProfiles: updatedProfiles, selectedPreset: clean });
  },

  applyCustomProfile: (profile) => {
    const updatedBands = DEFAULT_FREQUENCIES.map((freq, i) => ({
      frequency: freq,
      gain: profile.gains[i] ?? 0,
    }));
    set({
      selectedPreset: profile.name,
      bands: updatedBands,
      bassBoost: profile.bassBoost,
      trebleBoost: profile.trebleBoost,
      surround: profile.surround,
      virtualizer: profile.virtualizer,
      balance: profile.balance,
      preampGain: profile.preampGain,
    });
    persistEqSnapshot(get()).catch(() => {});
  },

  deleteCustomProfile: async (name) => {
    const updated = get().customProfiles.filter((p) => p.name !== name);
    set({ customProfiles: updated });
    await persistEqSnapshot({ ...get(), customProfiles: updated });
  },

  loadSavedEqState: async () => {
    try {
      const all = await prefsDao.getAllPreferences();
      const saved = all[EQ_PREF_KEY] as any;
      if (!saved || typeof saved !== 'object') return;
      const gains: number[] = Array.isArray(saved.gains) ? saved.gains : [0, 0, 0, 0, 0];
      set({
        enabled: Boolean(saved.enabled),
        selectedPreset: saved.selectedPreset || 'Plano',
        bands: DEFAULT_FREQUENCIES.map((freq, i) => ({ frequency: freq, gain: gains[i] ?? 0 })),
        bassBoost: Number(saved.bassBoost) || 0,
        trebleBoost: Number(saved.trebleBoost) || 0,
        surround: Number(saved.surround) || 0,
        virtualizer: Number(saved.virtualizer) || 0,
        balance: Number(saved.balance) || 0,
        preampGain: Number(saved.preampGain) || 0,
        customProfiles: Array.isArray(saved.customProfiles) ? saved.customProfiles : [],
      });
      pushDspToNative(get());
    } catch {}
  },
}));
