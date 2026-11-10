export const colors = {
  // Backgrounds
  background: '#0A0D14',
  surface: '#121722',
  surfaceElevated: '#1A2130',
  surfaceHighlight: '#242D40',

  // Brand / Accents
  primary: '#00E5FF',          // Vibrant Wave Cyan
  primaryMuted: 'rgba(0, 229, 255, 0.15)',
  secondary: '#00C896',        // Wave Emerald
  accent: '#7928CA',           // Deep Violet

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Borders & Dividers
  border: '#1E293B',
  borderLight: '#334155',

  // Player Specific
  progressBarBackground: '#1E293B',
  progressBarFill: '#00E5FF',
  miniPlayerBackground: 'rgba(18, 23, 34, 0.95)',
} as const;

export type Colors = typeof colors;

