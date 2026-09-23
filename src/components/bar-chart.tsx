import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface BarDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  color?: string;
  formatValue?: (value: number) => string;
}

/**
 * Dependency-light horizontal bar chart built from plain Views.
 * Bars share remaining space with `flex`, so no percentage maths is needed.
 */
export function BarChart({ data, color, formatValue }: BarChartProps) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((item) => item.value));

  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      {data.map((item, index) => (
        <View key={`${item.label}-${index}`} style={styles.row}>
          <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
            <View style={{ flex: Math.max(item.value, 0.001), backgroundColor: color ?? colors.primary }} />
            <View style={{ flex: Math.max(max - item.value, 0.001) }} />
          </View>
          <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
            {formatValue ? formatValue(item.value) : String(item.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    width: 96,
    fontSize: fontSize.xs,
  },
  track: {
    flex: 1,
    height: 14,
    borderRadius: radii.pill,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  value: {
    width: 72,
    textAlign: 'right',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
