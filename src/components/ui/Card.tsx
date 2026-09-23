import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { fontSize, fontWeight, radii, shadow, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CardProps extends ViewProps {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  padded?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  title,
  subtitle,
  footer,
  padded = true,
  elevated = false,
  style,
  children,
  ...rest
}: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: padded ? spacing.lg : 0,
        },
        elevated && shadow.card,
        style,
      ]}
      {...rest}
    >
      {title || subtitle ? (
        <View style={styles.header}>
          {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
          ) : null}
        </View>
      ) : null}
      {children}
      {footer ? <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
