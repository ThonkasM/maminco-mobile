import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const MIN_COLUMNS = 3;
const MAX_TILE_WIDTH = 132;

export default function PosTablesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const gridGap = spacing.md;
  const availableWidth = width - insets.left - insets.right - spacing.lg * 2;
  // At least 3 columns; add more on wide screens so tiles never grow huge.
  const columns = Math.max(
    MIN_COLUMNS,
    Math.ceil((availableWidth + gridGap) / (MAX_TILE_WIDTH + gridGap)),
  );
  const tileWidth = (availableWidth - gridGap * (columns - 1)) / columns;
  const { tables, loading, connected, refresh } = useTablesRealtime();
  const { data: areas, loading: areasLoading, refresh: refreshAreas } = useAsync(
    () => areasApi.getActiveAreas(),
    [],
  );

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!areas || areas.length === 0) return;
    if (!selectedAreaId || !areas.some((area) => area.id === selectedAreaId)) {
      setSelectedAreaId(areas[0].id);
    }
  }, [areas, selectedAreaId]);

  const visibleTables = useMemo(
    () => (selectedAreaId ? tables.filter((table) => table.areaId === selectedAreaId) : tables),
    [tables, selectedAreaId],
  );

  const showSkeleton = loading && tables.length === 0;
  const showEmpty = !showSkeleton && visibleTables.length === 0;

  // Re-fetches areas (REST) and re-subscribes to the tables socket, so a table
  // or area created meanwhile shows up.
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), refreshAreas()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, refreshAreas]);

  const openOrder = (tableId: string) => {
    router.push(`/(pos)/orders/${tableId}`);
  };

  return (
    <Screen edges={['top', 'left', 'right']} padded={false}>
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

        <View style={styles.legend}>
          {(['AVAILABLE', 'OCCUPIED', 'RESERVED'] as const).map((status) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: tableStatusColor(status, colors) }]} />
              <Text style={[styles.legendText, { color: colors.muted }]}>
                {tableStatusLabel(status)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={[
            styles.gridContainer,
            { paddingBottom: spacing.xxl + insets.bottom },
            showEmpty && styles.gridContainerEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {showSkeleton ? (
            <View style={styles.grid}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  style={{ width: tileWidth, height: tileWidth, borderRadius: radii.lg }}
                />
              ))}
            </View>
          ) : showEmpty ? (
            <EmptyState
              icon="restaurant-outline"
              title="Sin mesas en esta área"
              description="Desliza hacia abajo para actualizar mesas y áreas."
              actionLabel="Actualizar"
              onAction={handleRefresh}
            />
          ) : (
            <View style={styles.grid}>
              {visibleTables.map((table) => {
              const statusColor = tableStatusColor(table.status, colors);
              return (
                <Pressable
                  key={table.id}
                  onPress={() => openOrder(table.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      width: tileWidth,
                      backgroundColor: colors.surface,
                      borderColor: statusColor,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={styles.tileTop}>
                    <Text style={[styles.tileNumber, { color: colors.text }]}>{table.number}</Text>
                    <View style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}>
                      <Text style={[styles.statusPillText, { color: statusColor }]}>
                        {tableStatusLabel(table.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tileBottom}>
                    {table.hasActiveOrder ? (
                      <>
                        <Text style={[styles.tileTotal, { color: colors.text }]} numberOfLines={1}>
                          {formatCurrency(table.currentOrderTotal ?? 0)}
                        </Text>
                        <Text style={[styles.tileMeta, { color: colors.muted }]} numberOfLines={1}>
                          {table.itemCount ?? 0} ítems
                          {table.createdByName ? ` · ${table.createdByName}` : ''}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.tileMeta, { color: colors.muted }]} numberOfLines={1}>
                        {table.status === 'AVAILABLE' ? 'Sin pedido' : tableStatusLabel(table.status)}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
              })}
            </View>
          )}
        </ScrollView>
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
  gridContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  gridContainerEmpty: {
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: 2,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  tileNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  tileBottom: {
    gap: 2,
  },
  tileTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tileMeta: {
    fontSize: fontSize.xs,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xs,
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
