import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontSize, fontWeight, radii, spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Card } from './ui';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface KpiTileProps {
  label: string;
  value: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
}

export function KpiTile({ label, value, hint, icon, tone = 'primary' }: KpiTileProps) {
  const { colors } = useTheme();
  const accent = colors[tone as keyof ThemeColors];

  return (
    <Card style={styles.tile} padded>
      <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: colors.muted }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 150,
    gap: spacing.xs,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  hint: {
    fontSize: fontSize.xs,
  },
});
