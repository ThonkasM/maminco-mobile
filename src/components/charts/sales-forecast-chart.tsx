import React, { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { SalesForecastChartProps } from './types';

const PADDING_X = spacing.md;
const PADDING_Y = spacing.sm;
const LEGEND_HEIGHT = 20;
const LABELS_HEIGHT = 18;
const STROKE = 2;
const DOT_SIZE = 8;

function pointAt(
  index: number,
  value: number,
  count: number,
  innerWidth: number,
  innerHeight: number,
  max: number,
) {
  const step = count > 1 ? innerWidth / (count - 1) : 0;
  const ratio = max > 0 ? value / max : 0;
  return {
    x: PADDING_X + step * index,
    y: PADDING_Y + innerHeight - ratio * innerHeight,
  };
}

/**
 * Web fallback for the sales forecast chart: a dependency-light line chart
 * drawn with plain Views. Native builds resolve `.native.tsx` instead.
 */
export function SalesForecastChart({
  data,
  height = 220,
  modelColor,
  baselineColor,
}: SalesForecastChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const model = modelColor ?? colors.primary;
  const baseline = baselineColor ?? colors.muted;

  if (data.length === 0) return null;

  const plotHeight = Math.max(0, height - LEGEND_HEIGHT - LABELS_HEIGHT);
  const innerWidth = Math.max(0, width - PADDING_X * 2);
  const innerHeight = Math.max(0, plotHeight - PADDING_Y * 2);
  const max = Math.max(1, ...data.map((point) => Math.max(point.model, point.baseline)));

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const renderSeries = (key: 'model' | 'baseline', color: string) => (
    <>
      {data.slice(0, -1).map((_, index) => {
        const from = pointAt(index, data[index][key], data.length, innerWidth, innerHeight, max);
        const to = pointAt(index + 1, data[index + 1][key], data.length, innerWidth, innerHeight, max);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <View
            key={`${key}-segment-${index}`}
            style={{
              position: 'absolute',
              left: (from.x + to.x) / 2 - length / 2,
              top: (from.y + to.y) / 2 - STROKE / 2,
              width: length,
              height: STROKE,
              borderRadius: STROKE / 2,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
      {data.map((point, index) => {
        const position = pointAt(index, point[key], data.length, innerWidth, innerHeight, max);
        return (
          <View
            key={`${key}-dot-${index}`}
            style={{
              position: 'absolute',
              left: position.x - DOT_SIZE / 2,
              top: position.y - DOT_SIZE / 2,
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: color,
              borderWidth: 2,
              borderColor: colors.surface,
            }}
          />
        );
      })}
    </>
  );

  return (
    <View style={[styles.container, { height }]} onLayout={handleLayout}>
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: model }]} />
        <Text style={[styles.legendLabel, { color: colors.muted }]}>Modelo</Text>
        <View style={[styles.legendDot, { backgroundColor: baseline }]} />
        <Text style={[styles.legendLabel, { color: colors.muted }]}>Base</Text>
      </View>

      <View style={{ height: plotHeight }}>
        {width > 0 ? (
          <>
            {renderSeries('baseline', baseline)}
            {renderSeries('model', model)}
          </>
        ) : null}
      </View>

      <View style={styles.labels}>
        {data.map((point, index) => (
          <Text
            key={`label-${point.label}-${index}`}
            style={[styles.axisLabel, { color: colors.muted }]}
            numberOfLines={1}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  legend: {
    height: LEGEND_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    marginLeft: spacing.sm,
  },
  legendLabel: {
    fontSize: fontSize.xs,
  },
  labels: {
    height: LABELS_HEIGHT,
    flexDirection: 'row',
  },
  axisLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
