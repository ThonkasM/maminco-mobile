import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { BarChart, type BarDatum } from '@/components/bar-chart';
import { KpiTile } from '@/components/kpi-tile';
import { Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAsync } from '@/hooks/use-async';
import { useErrorNotification } from '@/hooks/use-error-notification';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';

export default function ManagerMetricsScreen() {
  const { colors } = useTheme();
  const { data, error, loading, refreshing, refresh } = useAsync(
    () => reportsApi.getTodayTopProducts(8),
    [],
  );

  useErrorNotification(error, Boolean(data));

  const bars: BarDatum[] = (data ?? []).map((product) => ({
    label: product.productName,
    value: product.totalRevenue,
  }));

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refresh}>
      <BackButton />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Métricas</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Ingresos por producto del día de hoy
        </Text>
      </View>

      {loading ? (
        <View style={styles.stack}>
          <Skeleton height={180} />
          <Skeleton height={120} />
        </View>
      ) : error ? (
        <EmptyState
          icon="bar-chart-outline"
          title="Sin métricas disponibles"
          description={error}
          actionLabel="Reintentar"
          onAction={refresh}
        />
      ) : bars.length === 0 ? (
        <EmptyState
          icon="bar-chart-outline"
          title="Aún no hay datos"
          description="Cuando se cierren órdenes hoy, aquí verás el ranking de productos."
        />
      ) : (
        <>
          <Card title="Ingresos por producto" subtitle="Top 8 del día">
            <BarChart data={bars} color={colors.primary} formatValue={formatCurrency} />
          </Card>

          <View style={styles.grid}>
            <KpiTile
              label="Producto líder"
              value={bars[0]?.label ?? '—'}
              hint={formatCurrency(bars[0]?.value)}
              icon="trophy-outline"
              tone="accent"
            />
            <KpiTile
              label="Ingresos top 8"
              value={formatCurrency(bars.reduce((sum, item) => sum + item.value, 0))}
              icon="cash-outline"
              tone="success"
            />
          </View>

          <Card title="Unidades vendidas" subtitle="Top 8 del día" style={styles.section}>
            <BarChart
              data={(data ?? []).map((product) => ({
                label: product.productName,
                value: product.quantitySold,
              }))}
              color={colors.accent}
              formatValue={(value) => `${formatNumber(value)} u.`}
            />
          </Card>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.lg,
  },
});
