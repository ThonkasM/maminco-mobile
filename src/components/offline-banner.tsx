import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, fontWeight, palette, spacing } from '@/constants/theme';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useTheme } from '@/hooks/use-theme';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors.warning, paddingTop: insets.top + spacing.xs }]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={palette.darkGray} />
      <Text style={styles.text}>Sin conexión. Los cambios se sincronizarán al reconectar.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  text: {
    color: palette.darkGray,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
