import { DashPathEffect } from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import { useTheme } from '@/hooks/use-theme';

import type { SalesForecastChartProps } from './types';

/**
 * Native sales forecast chart backed by Victory Native XL (Skia). The solid
 * line is the chosen model, the dashed line is the baseline for comparison.
 */
export function SalesForecastChart({
  data,
  height = 220,
  modelColor,
  baselineColor,
}: SalesForecastChartProps) {
  const { colors } = useTheme();

  const model = modelColor ?? colors.primary;
  const baseline = baselineColor ?? colors.muted;

  if (data.length === 0) return null;

  return (
    <View style={[styles.container, { height }]}>
      <CartesianChart
        data={data}
        xKey="label"
        yKeys={['model', 'baseline']}
        domainPadding={{ left: 12, right: 12, top: 16 }}
      >
        {({ points }) => (
          <>
            <Line points={points.baseline} color={baseline} strokeWidth={2}>
              <DashPathEffect intervals={[6, 6]} />
            </Line>
            <Line points={points.model} color={model} strokeWidth={3} />
          </>
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
