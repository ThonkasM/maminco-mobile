import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import {
  fonts,
  fontSize,
  fontWeight,
  radii,
  spacing,
  tableStatusColor,
  tableStatusLabel,
  type ThemeColors,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { countByStatus, useTablesRealtime } from '@/hooks/use-tables-realtime';
import { useErrorNotification } from '@/hooks/use-error-notification';
import type { TableStatus } from '@/lib/api/types';
import type { TableSnapshotItem } from '@/lib/realtime/socket';

const STATUS_ORDER: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED'];

type AreaGroup = [areaName: string, tables: TableSnapshotItem[]];

const areaKey = ([areaName]: AreaGroup) => areaName;

const AreaCard = React.memo(function AreaCard({
  areaName,
  tables,
  colors,
}: {
  areaName: string;
  tables: TableSnapshotItem[];
  colors: ThemeColors;
}) {
  return (
    <Card title={areaName} subtitle={`${tables.length} mesas`} style={styles.section}>
      <View style={styles.chips}>
        {tables.map((table) => (
          <View
            key={table.id}
            accessible
            accessibilityLabel={`Mesa ${table.number}, ${tableStatusLabel(table.status)}, ${
              table.itemCount ? `${table.itemCount} ítems` : 'sin pedido'
            }`}
            style={[styles.chip, { borderColor: tableStatusColor(table.status, colors) }]}
          >
            <Text style={[styles.chipNumber, { color: colors.text }]}>{table.number}</Text>
            <Text style={[styles.chipMeta, { color: colors.muted }]}>
              {table.itemCount ? `${table.itemCount} ítems` : 'Sin pedido'}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
});

export default function ManagerTablesScreen() {
  const { colors } = useTheme();
  const { tables, loading, error, connected, refresh } = useTablesRealtime();

  useErrorNotification(error, tables.length > 0);

  const counts = useMemo(() => countByStatus(tables), [tables]);
  const byArea = useMemo(() => {
    const groups = new Map<string, TableSnapshotItem[]>();
    for (const table of tables) {
      const key = table.areaName ?? 'Sin área';
      const current = groups.get(key) ?? [];
      current.push(table);
      groups.set(key, current);
    }
    return Array.from(groups.entries()) as AreaGroup[];
  }, [tables]);

  const renderArea = useCallback(
    ({ item: [areaName, areaTables] }: { item: AreaGroup }) => (
      <AreaCard areaName={areaName} tables={areaTables} colors={colors} />
    ),
    [colors],
  );

  const showSkeleton = loading && tables.length === 0;
  const showError = !showSkeleton && Boolean(error) && tables.length === 0;

  const header = (
    <View>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Ocupación</Text>
          <Badge
            label={connected ? 'En vivo' : 'Desconectado'}
            tone={connected ? 'success' : 'neutral'}
          />
        </View>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Estado de mesas en tiempo real
        </Text>
      </View>

      {tables.length > 0 ? (
        <View style={styles.summary}>
          {STATUS_ORDER.map((status) => (
            <Card key={status} style={styles.summaryTile}>
              <Text style={[styles.summaryValue, { color: tableStatusColor(status, colors) }]}>
                {counts[status] ?? 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                {status === 'AVAILABLE'
                  ? 'Libres'
                  : status === 'OCCUPIED'
                    ? 'Ocupadas'
                    : 'Reservadas'}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={byArea}
        keyExtractor={areaKey}
        renderItem={renderArea}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          showSkeleton ? (
            <View style={styles.stack}>
              <Skeleton height={90} />
              <Skeleton height={140} />
            </View>
          ) : showError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="No se pudo cargar la ocupación"
              description={error ?? undefined}
              actionLabel="Reintentar"
              onAction={refresh}
            />
          ) : (
            <EmptyState
              icon="restaurant-outline"
              title="Sin mesas"
              description="Conecta el terminal con el backend para ver el estado de las mesas."
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
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
  stack: {
    gap: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  section: {
    marginTop: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minWidth: 72,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    gap: 2,
  },
  chipNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  chipMeta: {
    fontSize: fontSize.xs,
  },
});
