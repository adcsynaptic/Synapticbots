import { useThemeStore } from '../state/theme-store';
import { neon, themeColors } from './web-tokens';

export function useThemeTokens() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const colors = themeColors[themeKey];

  // RN-friendly derived tokens (kept close to web intent).
  return {
    themeKey,
    colors,
    neon,
    border: 'rgba(0, 229, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    glassBg: neon.glassBg,
    glassBorder: neon.glassBorder,
  };
}

