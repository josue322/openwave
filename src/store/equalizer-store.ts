import { create } from 'zustand';

export interface EqualizerBand {
  frequency: string;
  gain: number; // -10 dB to +10 dB
}

export type EqualizerPresetName =
  | 'Flat'
  | 'Rock'
  | 'Pop'
  | 'Jazz'
  | 'Electronic'
  | 'Bass Boost'
  | 'Vocal';

export const EQUALIZER_PRESETS: Record<EqualizerPresetName, number[]> = {
  Flat: [0, 0, 0, 0, 0],
  Rock: [4, 2, -1, 3, 5],
  Pop: [-1, 2, 4, 2, -1],
  Jazz: [3, 2, 0, 2, 3],
  Electronic: [5, 3, 0, 2, 4],
  'Bass Boost': [6, 4, 1, 0, 0],
  Vocal: [-2, 1, 5, 3, -1],
};

interface EqualizerState {
  enabled: boolean;
  selectedPreset: EqualizerPresetName | 'Custom';
  bands: EqualizerBand[];
  bassBoost: number; // 0 to 100
  virtualizer: number; // 0 to 100

  setEnabled: (enabled: boolean) => void;
  setBandGain: (index: number, gain: number) => void;
  applyPreset: (preset: EqualizerPresetName) => void;
  setBassBoost: (level: number) => void;
  setVirtualizer: (level: number) => void;
}

const DEFAULT_FREQUENCIES = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

export const useEqualizerStore = create<EqualizerState>((set) => ({
  enabled: false,
  selectedPreset: 'Flat',
  bands: DEFAULT_FREQUENCIES.map((freq) => ({ frequency: freq, gain: 0 })),
  bassBoost: 0,
  virtualizer: 0,

  setEnabled: (enabled) => set({ enabled }),

  setBandGain: (index, gain) =>
    set((state) => {
      const updated = [...state.bands];
      if (index >= 0 && index < updated.length) {
        updated[index] = { ...updated[index], gain: Math.max(-10, Math.min(10, gain)) };
      }
      return { bands: updated, selectedPreset: 'Custom' };
    }),

  applyPreset: (preset) =>
    set(() => {
      const gains = EQUALIZER_PRESETS[preset] || [0, 0, 0, 0, 0];
      const updatedBands = DEFAULT_FREQUENCIES.map((freq, i) => ({
        frequency: freq,
        gain: gains[i] ?? 0,
      }));
      return { selectedPreset: preset, bands: updatedBands };
    }),

  setBassBoost: (bassBoost) => set({ bassBoost: Math.max(0, Math.min(100, bassBoost)) }),
  setVirtualizer: (virtualizer) =>
    set({ virtualizer: Math.max(0, Math.min(100, virtualizer)) }),
}));
