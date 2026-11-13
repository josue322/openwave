import { useMemo } from 'react';
import { useSettingsStore } from '../store/settings-store';
import { usePlayerStore } from '../store/player-store';

export interface DynamicPalette {
  mode: 'dark' | 'light';
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  secondary: string;
  border: string;
  error: string;
  warning: string;
}

const ARTWORK_ACCENT_POOL = ['#00E5FF', '#38BDF8', '#10B981', '#A855F7', '#F472B6', '#F59E0B'];

/**
 * Deterministic chromatic accent extractor based on artwork URI / album identity
 * when "Adapt colors to artwork" is enabled.
 */
function pickDynamicAccentForTrack(seed: string, fallbackAccent: string): string {
  if (!seed) return fallbackAccent;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ARTWORK_ACCENT_POOL[hash % ARTWORK_ACCENT_POOL.length];
}

export function useThemeColors(): DynamicPalette {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const dynamicArtworkColor = useSettingsStore((s) => s.dynamicArtworkColor);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return useMemo(() => {
    const resolvedAccent =
      dynamicArtworkColor && currentTrack?.artworkUri
        ? pickDynamicAccentForTrack(currentTrack.artworkUri, accentColor)
        : accentColor;

    if (themeMode === 'light') {
      return {
        mode: 'light',
        background: '#F4F7FB',
        surface: '#FFFFFF',
        surfaceElevated: '#E8EEF7',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#64748B',
        primary: resolvedAccent === '#00E5FF' ? '#0284C7' : resolvedAccent,
        secondary: '#059669',
        border: '#E2E8F0',
        error: '#DC2626',
        warning: '#D97706',
      };
    }

    return {
      mode: 'dark',
      background: '#090C15',
      surface: '#121722',
      surfaceElevated: '#1A2130',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      primary: resolvedAccent,
      secondary: '#00C896',
      border: 'rgba(255, 255, 255, 0.08)',
      error: '#EF4444',
      warning: '#F59E0B',
    };
  }, [themeMode, accentColor, dynamicArtworkColor, currentTrack?.artworkUri]);
}

