import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fontSize, fontWeight, palette, radii, spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Explicit background override (e.g. a table status color). */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

function toneColors(tone: BadgeTone, colors: ThemeColors): { background: string; text: string } {
  switch (tone) {
    case 'primary':
      return { background: colors.primary, text: colors.onPrimary };
    case 'accent':
      return { background: colors.accent, text: colors.onAccent };
    case 'success':
      return { background: colors.success, text: palette.white };
    case 'warning':
      return { background: colors.warning, text: palette.white };
    case 'danger':
      return { background: colors.danger, text: palette.white };
    case 'info':
      return { background: colors.info, text: palette.white };
    case 'neutral':
    default:
      return { background: colors.surfaceAlt, text: colors.text };
  }
}

export function Badge({ label, tone = 'neutral', color, style }: BadgeProps) {
  const { colors } = useTheme();
  const resolved = toneColors(tone, colors);
  const background = color ?? resolved.background;

  return (
    <View style={[styles.badge, { backgroundColor: background }, style]}>
      <Text style={[styles.label, { color: resolved.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
