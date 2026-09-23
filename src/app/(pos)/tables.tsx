import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, EmptyState, Screen, Skeleton } from '@/components/ui';
import {
  fontSize,
  fontWeight,
  radii,
  spacing,
  tableStatusColor,
  tableStatusLabel,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAsync } from '@/hooks/use-async';
import { useTablesRealtime } from '@/hooks/use-tables-realtime';
import { areasApi } from '@/lib/api';
import { formatCurrency } from '@/lib/format';

export default function PosTablesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { tables, loading, connected, refresh } = useTablesRealtime();
  const { data: areas, loading: areasLoading } = useAsync(() => areasApi.getActiveAreas(), []);

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAreaId && areas && areas.length > 0) {
      setSelectedAreaId(areas[0].id);
    }
  }, [areas, selectedAreaId]);

  const visibleTables = useMemo(
    () => (selectedAreaId ? tables.filter((table) => table.areaId === selectedAreaId) : tables),
    [tables, selectedAreaId],
  );

  const openOrder = (tableId: string) => {
    router.push(`/(pos)/orders/${tableId}`);
  };

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Mesas</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Toca una mesa para abrir su pedido
            </Text>
          </View>
          <Badge
            label={connected ? 'En vivo' : 'Sin conexión'}
            tone={connected ? 'success' : 'neutral'}
          />
        </View>

        {areasLoading ? (
          <Skeleton height={36} width="70%" />
        ) : areas && areas.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.areaList}
          >
            {areas.map((area) => {
              const active = area.id === selectedAreaId;
              return (
                <Pressable
                  key={area.id}
                  onPress={() => setSelectedAreaId(area.id)}
                  style={[
                    styles.areaChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.areaChipText, { color: active ? colors.onPrimary : colors.text }]}
                  >
                    {area.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.body}>
        {loading && tables.length === 0 ? (
          <View style={styles.grid}>
            <Skeleton height={110} style={styles.tile} />
            <Skeleton height={110} style={styles.tile} />
            <Skeleton height={110} style={styles.tile} />
            <Skeleton height={110} style={styles.tile} />
          </View>
        ) : visibleTables.length === 0 ? (
          <EmptyState
            icon="restaurant-outline"
            title="Sin mesas en esta área"
            description="Verifica que el backend esté emitiendo el estado de las mesas."
            actionLabel="Actualizar"
            onAction={refresh}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {visibleTables.map((table) => {
              const statusColor = tableStatusColor(table.status, colors);
              return (
                <Pressable
                  key={table.id}
                  onPress={() => openOrder(table.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      backgroundColor: colors.surface,
                      borderColor: statusColor,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={styles.tileTop}>
                    <Text style={[styles.tileNumber, { color: colors.text }]}>{table.number}</Text>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                  </View>
                  <Text style={[styles.tileStatus, { color: statusColor }]}>
                    {tableStatusLabel(table.status)}
                  </Text>
                  {table.hasActiveOrder ? (
                    <Text style={[styles.tileMeta, { color: colors.muted }]} numberOfLines={1}>
                      {formatCurrency(table.currentOrderTotal ?? 0)} · {table.itemCount ?? 0} ítems
                    </Text>
                  ) : (
                    <Text style={[styles.tileMeta, { color: colors.muted }]}>Sin pedido</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        {(['AVAILABLE', 'OCCUPIED', 'RESERVED'] as const).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: tableStatusColor(status, colors) }]} />
            <Text style={[styles.legendText, { color: colors.muted }]}>
              {tableStatusLabel(status)}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  areaList: {
    gap: spacing.sm,
  },
  areaChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  areaChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  body: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tileStatus: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  tileMeta: {
    fontSize: fontSize.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendText: {
    fontSize: fontSize.xs,
  },
});
