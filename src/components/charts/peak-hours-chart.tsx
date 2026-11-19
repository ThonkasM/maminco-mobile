import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { PeakHoursChartProps } from './types';

/**
 * Web fallback for the peak-hours chart: vertical bars built from plain Views.
 * Native builds resolve `.native.tsx` instead.
 */
export function PeakHoursChart({
  data,
  height = 200,
  color,
  formatValue,
}: PeakHoursChartProps) {
  const { colors } = useTheme();

  if (data.length === 0) return null;

  const barColor = color ?? colors.primary;
  const max = Math.max(1, ...data.map((point) => point.value));

  return (
    <View style={[styles.container, { height }]}>
      {data.map((item, index) => (
        <View key={`${item.label}-${index}`} style={styles.column}>
          <Text style={[styles.value, { color: colors.muted }]} numberOfLines={1}>
            {formatValue ? formatValue(item.value) : String(item.value)}
          </Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
            <View style={{ flex: Math.max(max - item.value, 0.001) }} />
            <View
              style={{
                flex: Math.max(item.value, 0.001),
                backgroundColor: barColor,
                borderTopLeftRadius: radii.sm,
                borderTopRightRadius: radii.sm,
              }}
            />
          </View>
          <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  column: {
    flex: 1,
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  value: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  track: {
    flex: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
