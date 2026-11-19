import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fontSize, fontWeight, palette, radii, spacing, tableStatusColor, tableStatusLabel } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency } from '@/lib/format';
import type { TableSnapshotItem } from '@/lib/realtime/socket';

interface TableTileProps {
  table: TableSnapshotItem;
  width: number;
  onPress: (tableId: string) => void;
}

function TableTileComponent({ table, width, onPress }: TableTileProps) {
  const { colors } = useTheme();
  const statusColor = tableStatusColor(table.status, colors);
  const statusLabel = tableStatusLabel(table.status);

  const summary = table.hasActiveOrder
    ? `${table.itemCount ?? 0} ítems, ${formatCurrency(table.currentOrderTotal ?? 0)}`
    : 'sin pedido';

  return (
    <Pressable
      onPress={() => onPress(table.id)}
      accessibilityRole="button"
      accessibilityLabel={`Mesa ${table.number}, ${statusLabel}, ${summary}`}
      accessibilityHint="Abre el pedido de la mesa"
      style={({ pressed }) => [
        styles.tile,
        {
          width,
          backgroundColor: statusColor,
          borderColor: statusColor,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.top}>
        <Text style={[styles.number, { color: palette.white }]}>{table.number}</Text>
        <View style={[styles.statusPill, { backgroundColor: 'rgba(255, 255, 255, 0.22)' }]}>
          <Text style={[styles.statusPillText, { color: palette.white }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        {table.hasActiveOrder ? (
          <>
            <Text style={[styles.total, { color: palette.white }]} numberOfLines={1}>
              {formatCurrency(table.currentOrderTotal ?? 0)}
            </Text>
            <Text style={[styles.meta, { color: palette.white }]} numberOfLines={1}>
              {table.itemCount ?? 0} ítems
              {table.createdByName ? ` · ${table.createdByName}` : ''}
            </Text>
          </>
        ) : (
          <Text style={[styles.meta, { color: palette.white }]} numberOfLines={1}>
            {table.status === 'AVAILABLE' ? 'Sin pedido' : statusLabel}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export const TableTile = React.memo(TableTileComponent);

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 2,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  number: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  statusPillText: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.semibold,
  },
  bottom: {
    gap: 2,
  },
  total: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  meta: {
    fontSize: fontSize.xs,
  },
});
