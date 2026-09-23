import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontSize, fontWeight, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './Button';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'restaurant-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={28} color={colors.muted} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="outline" size="sm" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    maxWidth: 280,
  },
});
