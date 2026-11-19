import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TableTile } from '@/components/table-tile';
import { Badge, EmptyState, Screen, Skeleton } from '@/components/ui';
import {
  dotSize,
  fonts,
  fontSize,
  fontWeight,
  radii,
  spacing,
  tableStatusColor,
  tableStatusLabel,
} from '@/constants/theme';
import type { TableSnapshotItem } from '@/lib/realtime/socket';
import { useTheme } from '@/hooks/use-theme';
import { useAsync } from '@/hooks/use-async';
import { useTablesRealtime } from '@/hooks/use-tables-realtime';
import { areasApi } from '@/lib/api';

const MIN_COLUMNS = 3;
const MAX_TILE_WIDTH = 132;

const keyExtractor = (table: TableSnapshotItem) => table.id;

function RowSeparator() {
  return <View style={styles.separator} />;
}

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

  // Refresh areas/tables when returning to the tab (e.g. after an order), so a
  // table or area created meanwhile shows up. The first focus is skipped.
  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      void refresh();
      void refreshAreas();
    }, [refresh, refreshAreas]),
  );

  const openOrder = useCallback(
    (tableId: string) => {
      router.push(`/(pos)/orders/${tableId}`);
    },
    [router],
  );

  const renderTable = useCallback(
    ({ item }: { item: TableSnapshotItem }) => (
      <TableTile table={item} width={tileWidth} onPress={openOrder} />
    ),
    [tileWidth, openOrder],
  );

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
                  accessibilityRole="button"
                  accessibilityLabel={`Área ${area.name}`}
                  accessibilityState={{ selected: active }}
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
        <FlatList
          key={columns}
          data={showSkeleton ? [] : visibleTables}
          keyExtractor={keyExtractor}
          renderItem={renderTable}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          ItemSeparatorComponent={RowSeparator}
          contentContainerStyle={[
            styles.gridContainer,
            { paddingBottom: spacing.xxl + insets.bottom },
            (showSkeleton || showEmpty) && styles.gridContainerEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={columns * 4}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            showSkeleton ? (
              <View style={styles.row}>
                {Array.from({ length: columns * 2 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    style={{ width: tileWidth, height: tileWidth, borderRadius: radii.lg }}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon="restaurant-outline"
                title="Sin mesas en esta área"
                description="Desliza hacia abajo para actualizar mesas y áreas."
                actionLabel="Actualizar"
                onAction={handleRefresh}
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
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
    fontFamily: fonts.display,
    fontWeight: 'normal',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
  dot: {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
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
