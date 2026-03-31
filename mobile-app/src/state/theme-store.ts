import { create } from 'zustand';
import type { ThemeKey } from '../theme/web-tokens';

type ThemeState = {
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
};

// MVP: keep default theme identical to web provider initial theme ("ocean").
export const useThemeStore = create<ThemeState>((set) => ({
  themeKey: 'ocean',
  setThemeKey: (key) => set({ themeKey: key }),
}));

