import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing, tableStatusColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { countByStatus, useTablesRealtime } from '@/hooks/use-tables-realtime';
import { useErrorNotification } from '@/hooks/use-error-notification';
import type { TableStatus } from '@/lib/api/types';

const STATUS_ORDER: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED'];

export default function ManagerTablesScreen() {
  const { colors } = useTheme();
  const { tables, loading, error, connected, refresh } = useTablesRealtime();

  useErrorNotification(error, tables.length > 0);

  const counts = useMemo(() => countByStatus(tables), [tables]);
  const byArea = useMemo(() => {
    const groups = new Map<string, typeof tables>();
    for (const table of tables) {
      const key = table.areaName ?? 'Sin área';
      const current = groups.get(key) ?? [];
      current.push(table);
      groups.set(key, current);
    }
    return Array.from(groups.entries());
  }, [tables]);

  return (
    <Screen scroll refreshing={loading} onRefresh={refresh}>
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

      {loading && tables.length === 0 ? (
        <View style={styles.stack}>
          <Skeleton height={90} />
          <Skeleton height={140} />
        </View>
      ) : error && tables.length === 0 ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="No se pudo cargar la ocupación"
          description={error}
          actionLabel="Reintentar"
          onAction={refresh}
        />
      ) : tables.length === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="Sin mesas"
          description="Conecta el terminal con el backend para ver el estado de las mesas."
        />
      ) : (
        <>
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

          {byArea.map(([areaName, areaTables]) => (
            <Card
              key={areaName}
              title={areaName}
              subtitle={`${areaTables.length} mesas`}
              style={styles.section}
            >
              <View style={styles.chips}>
                {areaTables.map((table) => (
                  <View
                    key={table.id}
                    style={[
                      styles.chip,
                      { borderColor: tableStatusColor(table.status, colors) },
                    ]}
                  >
                    <Text style={[styles.chipNumber, { color: colors.text }]}>
                      {table.number}
                    </Text>
                    <Text style={[styles.chipMeta, { color: colors.muted }]}>
                      {table.itemCount ? `${table.itemCount} ítems` : 'Sin pedido'}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: fontWeight.bold,
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
