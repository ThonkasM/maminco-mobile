/**
 * Maminco design tokens.
 *
 * The palette is brand-locked: dark green, dark gray, yellow and orange.
 * Screens must consume the semantic tokens exposed by `useTheme()` instead of
 * hardcoding hex values. See `docs/DESIGN.md` for the rules.
 */

import { Platform } from 'react-native';

export const palette = {
  darkGreen: '#143f29',
  darkGray: '#191919',
  yellow: '#fcbe28',
  orange: '#f26c1e',
  white: '#ffffff',
  black: '#000000',
} as const;

export interface ThemeColors {
  /** App background (behind screens). */
  background: string;
  /** Raised content surfaces: cards, sheets, tab bars. */
  surface: string;
  /** Subtle surface used for chips, table rows and inputs. */
  surfaceAlt: string;
  /** Primary readable text. */
  text: string;
  /** Secondary / helper text. */
  muted: string;
  /** Brand color used for primary actions. */
  primary: string;
  /** Text/icon color placed on top of `primary`. */
  onPrimary: string;
  /** Brand highlight (yellow). */
  accent: string;
  /** Text/icon color placed on top of `accent`. */
  onAccent: string;
  /** Hairlines and dividers. */
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Charcoal bars (tab bar, headers). */
  nav: string;
  /** Text/icon color placed on `nav`. */
  navForeground: string;
  /** Green for letters, buttons and active states on charcoal. */
  menuGreen: string;
  /** Leaf green used for the thin rule under charcoal headers. */
  leaf: string;
}

export const lightColors: ThemeColors = {
  background: '#faf7f0',
  surface: '#ffffff',
  surfaceAlt: '#f2ecdf',
  text: '#1a1713',
  muted: '#5a5348',
  primary: '#35701a',
  onPrimary: '#ffffff',
  accent: '#fcbe28',
  onAccent: '#191919',
  border: '#e5dccb',
  success: '#15803d',
  warning: '#b45309',
  danger: '#c62828',
  info: '#2563eb',
  nav: '#121212',
  navForeground: '#f4efe4',
  menuGreen: '#457e20',
  leaf: '#4c8f21',
};

export const darkColors: ThemeColors = {
  background: '#131110',
  surface: '#1b1815',
  surfaceAlt: '#221f1b',
  text: '#f1ece0',
  muted: '#a79f90',
  primary: '#417d1c',
  onPrimary: '#ffffff',
  accent: '#f2c14e',
  onAccent: '#191919',
  border: '#2f2a23',
  success: '#1d7f45',
  warning: '#b45309',
  danger: '#c0392b',
  info: '#60a5fa',
  nav: '#121212',
  navForeground: '#f4efe4',
  menuGreen: '#457e20',
  leaf: '#4c8f21',
};

/** Gradient for primary calls to action (dark text on top). */
export const gradients = {
  amberGradient: ['#fcbe28', '#f26c1e'] as const,
};

export const fonts = {
  display: 'Anton_400Regular',
} as const;

/** 4pt spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const fontSize = {
  xxs: 10,
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const dotSize = 10;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const shadow = {
  card: {
    // `shadow*` is deprecated on web (react-native-web) in favour of `boxShadow`.
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.06)' },
      default: {
        shadowColor: '#000000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      },
    }),
  },
} as const;

export type TableStatusLike = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';

export function tableStatusColor(status: TableStatusLike, colors: ThemeColors): string {
  switch (status) {
    case 'AVAILABLE':
      return colors.success;
    case 'OCCUPIED':
      return colors.danger;
    case 'RESERVED':
      return colors.warning;
    default:
      return colors.muted;
  }
}

export function tableStatusLabel(status: TableStatusLike): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Libre';
    case 'OCCUPIED':
      return 'Ocupada';
    case 'RESERVED':
      return 'Reservada';
    default:
      return status;
  }
}
