import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, icon, containerStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.muted }]}>{label}</Text> : null}
      <View style={[styles.field, { backgroundColor: colors.surfaceAlt, borderColor }]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }, style]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
      </View>
      {error ? (
        <Text style={[styles.helper, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: colors.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },
  helper: {
    fontSize: fontSize.xs,
  },
});
