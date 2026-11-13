jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import { parseLrc, getActiveLyricIndex } from '../src/core/utils/lrc-parser';
import { useEqualizerStore, EQUALIZER_PRESETS } from '../src/store/equalizer-store';
import { useSettingsStore, DEFAULT_APP_SETTINGS } from '../src/store/settings-store';
import { ProviderRegistry } from '../src/integrations/providers/provider-registry';

describe('LRC Lyrics Parser, Extended Equalizer, Settings Store & Open Providers', () => {
  test('parseLrc extracts synced timestamps accurately and ignores LRC header tags', () => {
    const sample = `
[ti:OpenWave Anthem]
[ar:Indie Creator]
[00:05.00] First line
[00:12.50] Second line
[00:25.100] Third line
`;
    const lines = parseLrc(sample);
    expect(lines.length).toBe(3);
    expect(lines[0]).toEqual({ timeMs: 5000, text: 'First line' });
    expect(lines[1]).toEqual({ timeMs: 12500, text: 'Second line' });
    expect(lines[2]).toEqual({ timeMs: 25100, text: 'Third line' });

    expect(getActiveLyricIndex(lines, 3000)).toBe(-1);
    expect(getActiveLyricIndex(lines, 6000)).toBe(0);
    expect(getActiveLyricIndex(lines, 14000)).toBe(1);
    expect(getActiveLyricIndex(lines, 30000)).toBe(2);
  });

  test('parseLrc preserves unsynced plain lyrics cleanly', () => {
    const lines = parseLrc('Line one\nLine two');
    expect(lines.length).toBe(2);
    expect(lines[0].timeMs).toBeNull();
    expect(lines[1].text).toBe('Line two');
  });

  test('useEqualizerStore supports Clásica, Hip-Hop and clamps balance, treble, surround and preamp', () => {
    const eq = useEqualizerStore.getState();
    eq.applyPreset('Hip-Hop');
    expect(useEqualizerStore.getState().selectedPreset).toBe('Hip-Hop');
    expect(useEqualizerStore.getState().bands[0].gain).toBe(EQUALIZER_PRESETS['Hip-Hop'][0]);

    eq.applyPreset('Clásica');
    expect(useEqualizerStore.getState().selectedPreset).toBe('Clásica');

    eq.setBalance(-150);
    expect(useEqualizerStore.getState().balance).toBe(-100);
    eq.setBalance(180);
    expect(useEqualizerStore.getState().balance).toBe(100);

    eq.setPreampGain(12);
    expect(useEqualizerStore.getState().preampGain).toBe(6);
    eq.setPreampGain(-12);
    expect(useEqualizerStore.getState().preampGain).toBe(-6);

    eq.setTrebleBoost(140);
    expect(useEqualizerStore.getState().trebleBoost).toBe(100);
    eq.setSurround(-10);
    expect(useEqualizerStore.getState().surround).toBe(0);
  });

  test('useSettingsStore updates theme/language cleanly and resets to defaults', async () => {
    await useSettingsStore.getState().updateSetting('themeMode', 'light');
    await useSettingsStore.getState().updateSetting('language', 'en');
    expect(useSettingsStore.getState().themeMode).toBe('light');
    expect(useSettingsStore.getState().language).toBe('en');

    await useSettingsStore.getState().resetDefaults();
    expect(useSettingsStore.getState().themeMode).toBe(DEFAULT_APP_SETTINGS.themeMode);
    expect(useSettingsStore.getState().language).toBe(DEFAULT_APP_SETTINGS.language);
  });

  test('ProviderRegistry includes both CreativeCommons and InternetArchive providers', () => {
    const registry = ProviderRegistry.getInstance();
    expect(registry.getProvider('cc_open_catalog')).toBeDefined();
    expect(registry.getProvider('internet_archive_cc')).toBeDefined();
  });
});

