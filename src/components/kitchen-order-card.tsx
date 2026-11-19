import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card } from '@/components/ui';
import { fontSize, palette, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Order, OrderKitchenStatus } from '@/lib/api/types';

const NEXT: Partial<Record<OrderKitchenStatus, { to: OrderKitchenStatus; label: string }>> = {
  PENDING: { to: 'PREPARING', label: 'Empezar' },
  PREPARING: { to: 'READY', label: 'Marcar listo' },
};

const PREVIOUS: Partial<Record<OrderKitchenStatus, { to: OrderKitchenStatus; label: string }>> = {
  PREPARING: { to: 'PENDING', label: 'Volver' },
  READY: { to: 'PREPARING', label: 'Volver' },
};

interface KitchenOrderCardProps {
  order: Order;
  accent: string;
  now: number;
  onChangeStatus: (orderId: string, status: OrderKitchenStatus) => void;
}

function KitchenOrderCardComponent({ order, accent, now, onChangeStatus }: KitchenOrderCardProps) {
  const { colors } = useTheme();
  const next = NEXT[order.kitchenStatus];
  const previous = PREVIOUS[order.kitchenStatus];
  const notes = order.items.filter((item) => item.notes);
  const minutes = Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60_000));

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.table, { color: colors.text }]}>Mesa {order.tableName}</Text>
        <Badge label={`#${order.orderNumber}`} tone="neutral" />
      </View>

      <View style={styles.items}>
        {order.items.map((item) => (
          <Text key={item.id} style={[styles.item, { color: colors.text }]}>
            <Text style={[styles.itemQty, { color: accent }]}>{item.quantity}× </Text>
            {item.productName}
          </Text>
        ))}
        {order.items.length === 0 ? (
          <Text style={[styles.item, { color: colors.muted }]}>Sin items</Text>
        ) : null}
      </View>

      {notes.length > 0 ? (
        <View style={[styles.notes, { backgroundColor: colors.warning }]}>
          {notes.map((item) => (
            <Text key={item.id} style={[styles.note, { color: palette.white }]}>
              {item.productName}: {item.notes}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.meta} accessible accessibilityLabel={`${minutes} minutos de espera`}>
        <Ionicons name="time-outline" size={13} color={colors.muted} />
        <Text style={[styles.metaText, { color: colors.muted }]}>{minutes} min</Text>
      </View>

      <View style={styles.actions}>
        {previous ? (
          <Button
            title={previous.label}
            variant="secondary"
            size="sm"
            icon="arrow-undo-outline"
            style={styles.action}
            onPress={() => onChangeStatus(order.id, previous.to)}
          />
        ) : null}
        {next ? (
          <Button
            title={next.label}
            variant="primary"
            size="sm"
            icon={next.to === 'READY' ? 'checkmark-outline' : 'play-outline'}
            style={styles.action}
            onPress={() => onChangeStatus(order.id, next.to)}
          />
        ) : null}
      </View>
    </Card>
  );
}

export const KitchenOrderCard = React.memo(KitchenOrderCardComponent);

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  table: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  items: {
    gap: spacing.xs,
  },
  item: {
    fontSize: fontSize.md,
  },
  itemQty: {
    fontWeight: fontWeight.bold,
  },
  notes: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  note: {
    fontSize: fontSize.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    flex: 1,
  },
});
