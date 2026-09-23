import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Bar, CartesianChart } from 'victory-native';

import { useTheme } from '@/hooks/use-theme';

import type { PeakHoursChartProps } from './types';

/**
 * Native peak-hours chart backed by Victory Native XL (Skia). Each bar is the
 * average order volume for an hour of the day.
 */
export function PeakHoursChart({
  data,
  height = 200,
  color,
}: PeakHoursChartProps) {
  const { colors } = useTheme();

  const barColor = color ?? colors.accent;

  if (data.length === 0) return null;

  return (
    <View style={[styles.container, { height }]}>
      <CartesianChart
        data={data}
        xKey="label"
        yKeys={['value']}
        domainPadding={{ left: 12, right: 12, top: 16 }}
      >
        {({ points, chartBounds }) => (
          <Bar
            points={points.value}
            chartBounds={chartBounds}
            color={barColor}
            roundedCorners={{ topLeft: 4, topRight: 4 }}
          />
        )}
      </CartesianChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
