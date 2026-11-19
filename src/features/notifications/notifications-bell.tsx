import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontSize, fontWeight, palette, radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

import { inboxRouteForRole } from './navigation';
import { useNotifications } from './notifications-provider';
import { formatBadgeCount } from './selectors';

export function NotificationsBell() {
  const { colors } = useTheme();
  const router = useRouter();
  const { role } = useAuth();
  const { unread } = useNotifications();
  const badge = formatBadgeCount(unread);
  const route = inboxRouteForRole(role);

  if (!route) return null;

  return (
    <Pressable
      onPress={() => router.push(route as Href)}
      accessibilityRole="button"
      accessibilityLabel={badge ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name="notifications-outline" size={20} color={colors.text} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: palette.white,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
  },
});
