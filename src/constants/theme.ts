/**
 * Maminco design tokens.
 *
 * The palette is brand-locked: dark green, dark gray, yellow and orange.
 * Screens must consume the semantic tokens exposed by `useTheme()` instead of
 * hardcoding hex values. See `docs/DESIGN.md` for the rules.
 */

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
}

export const lightColors: ThemeColors = {
  background: '#f4f5f3',
  surface: '#ffffff',
  surfaceAlt: '#eceee9',
  text: '#191919',
  muted: '#6b7280',
  primary: '#143f29',
  onPrimary: '#ffffff',
  accent: '#fcbe28',
  onAccent: '#191919',
  border: '#e0e3dd',
  success: '#1f8a4c',
  warning: '#d98314',
  danger: '#c0392b',
  info: '#2563eb',
};

export const darkColors: ThemeColors = {
  background: '#191919',
  surface: '#232323',
  surfaceAlt: '#2c2c2c',
  text: '#f5f5f5',
  muted: '#a1a1a1',
  primary: '#2f8f5f',
  onPrimary: '#06120c',
  accent: '#fcbe28',
  onAccent: '#191919',
  border: '#333333',
  success: '#3ecf7a',
  warning: '#fcbe28',
  danger: '#ff6b6b',
  info: '#60a5fa',
};

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
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
