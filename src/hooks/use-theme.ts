import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from '@/constants/theme';

export type ThemeScheme = 'light' | 'dark';

export interface Theme {
  scheme: ThemeScheme;
  isDark: boolean;
  colors: ThemeColors;
}

/**
 * Resolves the active color scheme into semantic Maminco tokens.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const resolved: ThemeScheme = scheme === 'dark' ? 'dark' : 'light';
  return {
    scheme: resolved,
    isDark: resolved === 'dark',
    colors: resolved === 'dark' ? darkColors : lightColors,
  };
}
