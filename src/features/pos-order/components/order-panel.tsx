import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Order, OrderItem } from '@/lib/api/types';
import { formatCurrency, orderStatusLabel } from '@/lib/format';

interface OrderItemRowProps {
  item: OrderItem;
  editable: boolean;
  disabled: boolean;
  onChangeQuantity: (itemId: string, quantity: number) => void;
}

const OrderItemRow = React.memo(function OrderItemRow({
  item,
  editable,
  disabled,
  onChangeQuantity,
}: OrderItemRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.itemRow, { borderBottomColor: colors.border }]}>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
          {item.productName}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.muted }]}>
          {formatCurrency(item.unitPrice)} c/u
        </Text>
        <View style={styles.itemEditorRow}>
          <Ionicons name="person-outline" size={11} color={colors.muted} />
          <Text style={[styles.itemEditor, { color: colors.muted }]} numberOfLines={1}>
            {item.addedByName}
          </Text>
        </View>
      </View>

      <View style={styles.itemRight}>
        <Text style={[styles.itemSubtotal, { color: colors.primary }]}>
          {formatCurrency(item.subtotal)}
        </Text>
        <View style={styles.stepper}>
          {editable ? (
            <>
              <Pressable
                onPress={() => onChangeQuantity(item.id, item.quantity - 1)}
                hitSlop={8}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Quitar una unidad de ${item.productName}`}
                style={[styles.stepBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="remove" size={16} color={colors.text} />
              </Pressable>
              <Text
                style={[styles.stepValue, { color: colors.text }]}
                accessibilityLabel={`${item.quantity} unidades`}
              >
                {item.quantity}
              </Text>
              <Pressable
                onPress={() => onChangeQuantity(item.id, item.quantity + 1)}
                hitSlop={8}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Agregar una unidad de ${item.productName}`}
                style={[styles.stepBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="add" size={16} color={colors.text} />
              </Pressable>
            </>
          ) : (
            <Text style={[styles.stepValue, { color: colors.muted }]}>{item.quantity}×</Text>
          )}
        </View>
      </View>
    </View>
  );
});

interface OrderHeaderProps {
  order: Order | null;
  onBack: () => void;
}

export function OrderHeader({ order, onBack }: OrderHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={8}
        style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {order ? `Mesa ${order.tableName}` : 'Mesa'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
          {order
            ? `${order.serviceType} · Orden ${order.orderNumber} · ${orderStatusLabel(order.status)}`
            : 'Nueva orden'}
        </Text>
      </View>
      {order ? (
        <Badge
          label={orderStatusLabel(order.status)}
          tone={order.status === 'DRAFT' ? 'warning' : order.status === 'CLOSED' ? 'success' : 'danger'}
        />
      ) : null}
    </View>
  );
}

interface OrderPanelProps {
  order: Order | null;
  canCharge: boolean;
  canRemoveProducts: boolean;
  submitting: boolean;
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onCharge: () => void;
  onCancel: () => void;
}

export function OrderPanel({
  order,
  canCharge,
  canRemoveProducts,
  submitting,
  onChangeQuantity,
  onCharge,
  onCancel,
}: OrderPanelProps) {
  const { colors } = useTheme();

  if (!order) {
    return (
      <Card title="Pedido actual" style={[styles.section, styles.clip]}>
        <Text style={[styles.muted, { color: colors.muted }]}>
          Esta mesa no tiene una orden abierta. Agrega productos del catálogo para crearla.
        </Text>
      </Card>
    );
  }

  return (
    <Card
      title="Pedido actual"
      subtitle={`${order.itemCount} ítems · Abierta por ${order.createdByName}`}
      style={[styles.section, styles.clip]}
    >
      {order.items.length === 0 ? (
        <Text style={[styles.muted, { color: colors.muted }]}>Aún no hay productos en esta orden.</Text>
      ) : (
        order.items.map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            editable={canRemoveProducts}
            disabled={submitting}
            onChangeQuantity={onChangeQuantity}
          />
        ))
      )}

      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: colors.muted }]}>Total</Text>
        <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(order.total)}</Text>
      </View>

      {canCharge ? (
        <View style={styles.orderActions}>
          <Button
            title="Cobrar"
            icon="card-outline"
            onPress={onCharge}
            disabled={order.items.length === 0}
            style={styles.flex}
          />
          <Button
            title="Cancelar orden"
            variant="outline"
            icon="close-circle-outline"
            onPress={onCancel}
            loading={submitting}
            style={styles.flex}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  clip: {
    overflow: 'hidden',
  },
  muted: {
    fontSize: fontSize.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  itemMeta: {
    fontSize: fontSize.xs,
  },
  itemEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemEditor: {
    flexShrink: 1,
    fontSize: fontSize.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepValue: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  itemSubtotal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.md,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  orderActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  flex: {
    flex: 1,
  },
});
