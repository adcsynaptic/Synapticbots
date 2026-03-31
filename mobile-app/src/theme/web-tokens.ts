export const neon = {
  // From `app/globals.css` (CYBERPUNK PALETTE)
  cyan: '#00E5FF',
  cyanDim: '#00B8CC',
  cyanGlow: 'rgba(0, 229, 255, 0.35)',
  amber: '#FFB300',
  amberDim: '#CC8F00',
  amberGlow: 'rgba(255, 179, 0, 0.35)',
  emerald: '#00FF88',
  emeraldDim: '#00CC6A',
  emeraldGlow: 'rgba(0, 255, 136, 0.35)',
  danger: '#FF3B5C',
  dangerGlow: 'rgba(255, 59, 92, 0.35)',
  violet: '#A78BFA',
  violetGlow: 'rgba(167, 139, 250, 0.35)',
  // Typography (from `app/globals.css`)
  fontMono: 'JetBrains Mono',
  fontUi: 'Inter',
  // Glass + shadows (from `app/globals.css`)
  glassBg: 'rgba(10, 15, 26, 0.75)',
  glassBorder: 'rgba(0, 229, 255, 0.10)',
  shadowCard: '0 8px 32px rgba(0, 0, 0, 0.6)', // RN doesn't support full CSS shadow, keep for reference
};

export const typography = {
  // From `app/globals.css`
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
};

export type ThemeKey = 'ocean' | 'cyber' | 'emerald' | 'gold';

export const themeColors: Record<
  ThemeKey,
  {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
    background: string;
    surface: string;
    surfaceLight: string;
    text: string;
    textSecondary: string;
    success: string;
    danger: string;
    warning: string;
  }
> = {
  ocean: {
    primary: '#0891B2',
    primaryDark: '#0E7490',
    primaryLight: '#06B6D4',
    accent: '#22D3EE',
    background: '#0A0E1A',
    surface: '#111827',
    surfaceLight: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  cyber: {
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    primaryLight: '#A78BFA',
    accent: '#EC4899',
    background: '#0F0A1C',
    surface: '#1A1625',
    surfaceLight: '#2D2438',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  emerald: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#10B981',
    accent: '#34D399',
    background: '#0A1410',
    surface: '#1C2824',
    surfaceLight: '#2D3F38',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  gold: {
    primary: '#D97706',
    primaryDark: '#B45309',
    primaryLight: '#F59E0B',
    accent: '#FBBF24',
    background: '#1A1410',
    surface: '#2D2419',
    surfaceLight: '#3F3524',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
};

