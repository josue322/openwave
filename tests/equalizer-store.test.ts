import { useEqualizerStore, EQUALIZER_PRESETS } from '../src/store/equalizer-store';

describe('useEqualizerStore', () => {
  beforeEach(() => {
    useEqualizerStore.setState({
      enabled: false,
      selectedPreset: 'Flat',
      bands: [
        { frequency: '60Hz', gain: 0 },
        { frequency: '230Hz', gain: 0 },
        { frequency: '910Hz', gain: 0 },
        { frequency: '3.6kHz', gain: 0 },
        { frequency: '14kHz', gain: 0 },
      ],
      bassBoost: 0,
      virtualizer: 0,
    });
  });

  test('applyPreset updates gains matching the preset configuration', () => {
    useEqualizerStore.getState().applyPreset('Rock');

    const state = useEqualizerStore.getState();
    expect(state.selectedPreset).toBe('Rock');
    expect(state.bands[0].gain).toBe(EQUALIZER_PRESETS.Rock[0]);
    expect(state.bands[4].gain).toBe(EQUALIZER_PRESETS.Rock[4]);
  });

  test('setBandGain adjusts specific frequency band and changes preset to Personalizado', () => {
    useEqualizerStore.getState().applyPreset('Plano');
    useEqualizerStore.getState().setBandGain(0, 6);

    const state = useEqualizerStore.getState();
    expect(state.bands[0].gain).toBe(6);
    expect(state.selectedPreset).toBe('Personalizado');
  });

  test('setBandGain clamps gains within -10dB to +10dB', () => {
    useEqualizerStore.getState().setBandGain(0, 20);
    expect(useEqualizerStore.getState().bands[0].gain).toBe(10);

    useEqualizerStore.getState().setBandGain(0, -35);
    expect(useEqualizerStore.getState().bands[0].gain).toBe(-10);
  });

  test('setBassBoost clamps value between 0 and 100', () => {
    useEqualizerStore.getState().setBassBoost(50);
    expect(useEqualizerStore.getState().bassBoost).toBe(50);

    useEqualizerStore.getState().setBassBoost(150);
    expect(useEqualizerStore.getState().bassBoost).toBe(100);

    useEqualizerStore.getState().setBassBoost(-20);
    expect(useEqualizerStore.getState().bassBoost).toBe(0);
  });
});
