import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { KpiTile } from '@/components/kpi-tile';
import { Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAsync } from '@/hooks/use-async';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';

export default function ManagerDashboardScreen() {
  const { colors } = useTheme();
  const { data, error, loading, refreshing, refresh } = useAsync(
    () => reportsApi.getDailyReport(5),
    [],
  );

  const sales = data?.sales;
  const topProducts = data?.topProducts ?? [];

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Panel de hoy</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Resumen de ventas y actividad del día
        </Text>
      </View>

      {loading ? (
        <View style={styles.grid}>
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="No se pudieron cargar los reportes"
          description={error}
          actionLabel="Reintentar"
          onAction={refresh}
        />
      ) : (
        <>
          <View style={styles.grid}>
            <KpiTile
              label="Ventas de hoy"
              value={formatCurrency(sales?.totalSales)}
              icon="cash-outline"
              tone="success"
            />
            <KpiTile
              label="Órdenes cerradas"
              value={formatNumber(sales?.totalOrders)}
              icon="receipt-outline"
              tone="primary"
            />
            <KpiTile
              label="Ticket promedio"
              value={formatCurrency(sales?.averageOrderValue)}
              icon="pricetag-outline"
              tone="accent"
            />
            <KpiTile
              label="Propinas"
              value={formatCurrency(sales?.totalTips)}
              icon="heart-outline"
              tone="info"
            />
          </View>

          <Card title="Detalle" subtitle="Descuentos y tipo de servicio" style={styles.section}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Descuentos</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatCurrency(sales?.totalDiscount)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Órdenes en mesa</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatNumber(sales?.mesaOrders)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Órdenes virtuales</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatNumber(sales?.virtualOrders)}
              </Text>
            </View>
          </Card>

          <Card title="Más vendidos" subtitle="Top 5 del día" style={styles.section}>
            {topProducts.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Aún no hay ventas registradas hoy.
              </Text>
            ) : (
              topProducts.map((product) => (
                <View key={product.productId} style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                      {product.productName}
                    </Text>
                    <Text style={[styles.productMeta, { color: colors.muted }]} numberOfLines={1}>
                      {product.categoryName} · {formatNumber(product.quantitySold)} vendidos
                    </Text>
                  </View>
                  <Text style={[styles.productRevenue, { color: colors.primary }]}>
                    {formatCurrency(product.totalRevenue)}
                  </Text>
                </View>
              ))
            )}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  productMeta: {
    fontSize: fontSize.xs,
  },
  productRevenue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
