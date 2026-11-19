import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Badge, Button, EmptyState, Screen } from '@/components/ui';
import { fonts, fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AppNotification } from '@/lib/api/notifications';

import { useNotifications } from './notifications-provider';
import { formatRelativeTime, notificationTypeLabel, notificationTypeTone } from './selectors';

interface NotificationsScreenProps {
  onClose?: () => void;
}

const keyExtractor = (item: AppNotification) => item.id;

export function NotificationsScreen({ onClose }: NotificationsScreenProps) {
  const { colors } = useTheme();
  const { items, unread, loading, refreshing, error, refresh, markAllRead, open } =
    useNotifications();

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const isUnread = !item.readAt;
      return (
        <Pressable
          onPress={() => open(item)}
          accessibilityRole="button"
          accessibilityLabel={`${isUnread ? 'No leída. ' : ''}${item.title}`}
          style={({ pressed }) => [
            styles.item,
            {
              backgroundColor: isUnread ? colors.surface : colors.surfaceAlt,
              borderColor: isUnread ? colors.primary : colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={styles.itemHeader}>
            <Badge
              label={notificationTypeLabel(item.type)}
              tone={notificationTypeTone(item.type)}
            />
            <View style={styles.itemMeta}>
              <Text style={[styles.time, { color: colors.muted }]}>
                {formatRelativeTime(item.createdAt)}
              </Text>
              {isUnread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
            </View>
          </View>
          <Text
            style={[
              styles.itemTitle,
              { color: colors.text, fontWeight: isUnread ? fontWeight.bold : fontWeight.medium },
            ]}
          >
            {item.title}
          </Text>
          <Text style={[styles.itemBody, { color: colors.muted }]}>{item.body}</Text>
        </Pressable>
      );
    },
    [colors, open],
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Notificaciones</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {unread > 0 ? `${unread} sin leer` : 'Todo al día'}
          </Text>
        </View>
        {onClose ? (
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            hitSlop={8}
            style={({ pressed }) => [
              styles.close,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      {unread > 0 ? (
        <Button
          title="Marcar todas como leídas"
          variant="outline"
          size="sm"
          icon="checkmark-done-outline"
          onPress={() => void markAllRead()}
        />
      ) : null}
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <Screen padded={false}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={[styles.list, onClose ? null : styles.listWithTabs]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="No se pudieron cargar las notificaciones"
              description="Revisa la conexión con el servidor e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => void refresh()}
            />
          ) : (
            <EmptyState
              icon="notifications-off-outline"
              title="Sin notificaciones"
              description="Cuando haya avisos para ti aparecerán aquí."
            />
          )
        }
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.display,
    fontWeight: 'normal',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listWithTabs: {
    paddingBottom: 110,
  },
  separator: {
    height: spacing.sm,
  },
  item: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: {
    fontSize: fontSize.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTitle: {
    fontSize: fontSize.md,
  },
  itemBody: {
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
});
