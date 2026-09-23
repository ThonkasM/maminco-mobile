import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { fontSize, fontWeight, palette, radii, spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; font: number }> = {
  sm: { height: 36, paddingHorizontal: spacing.md, font: fontSize.sm },
  md: { height: 46, paddingHorizontal: spacing.lg, font: fontSize.md },
  lg: { height: 54, paddingHorizontal: spacing.xl, font: fontSize.lg },
};

function variantColors(
  variant: ButtonVariant,
  colors: ThemeColors,
): { background: string; border: string; content: string } {
  switch (variant) {
    case 'primary':
      return { background: colors.primary, border: colors.primary, content: colors.onPrimary };
    case 'accent':
      return { background: colors.accent, border: colors.accent, content: colors.onAccent };
    case 'secondary':
      return { background: colors.surfaceAlt, border: colors.surfaceAlt, content: colors.text };
    case 'outline':
      return { background: 'transparent', border: colors.border, content: colors.text };
    case 'ghost':
      return { background: 'transparent', border: 'transparent', content: colors.primary };
    case 'danger':
      return { background: colors.danger, border: colors.danger, content: palette.white };
    default:
      return { background: colors.primary, border: colors.primary, content: colors.onPrimary };
  }
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const { background, border, content } = variantColors(variant, colors);
  const dims = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: dims.height,
          paddingHorizontal: dims.paddingHorizontal,
          backgroundColor: background,
          borderColor: border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={content} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' ? (
            <Ionicons name={icon} size={dims.font + 3} color={content} />
          ) : null}
          <Text style={[styles.label, { color: content, fontSize: dims.font }]} numberOfLines={1}>
            {title}
          </Text>
          {icon && iconPosition === 'right' ? (
            <Ionicons name={icon} size={dims.font + 3} color={content} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontWeight: fontWeight.semibold,
  },
});
