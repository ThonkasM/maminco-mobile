import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KpiTile } from '@/components/kpi-tile';
import { Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAsync } from '@/hooks/use-async';
import { useErrorNotification } from '@/hooks/use-error-notification';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';

type IoniconName = keyof typeof Ionicons.glyphMap;

const ANALYTICS: { href: string; title: string; subtitle: string; icon: IoniconName }[] = [
  {
    href: '/(manager)/metrics',
    title: 'Métricas',
    subtitle: 'Ingresos y unidades por producto',
    icon: 'stats-chart-outline',
  },
  {
    href: '/(manager)/forecast',
    title: 'Pronóstico',
    subtitle: 'Proyección de ventas a 7 días',
    icon: 'trending-up-outline',
  },
  {
    href: '/(manager)/ai',
    title: 'Inteligencia artificial',
    subtitle: 'Modelo, demanda y anomalías',
    icon: 'sparkles-outline',
  },
];

export default function ManagerDashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, error, loading, refreshing, refresh } = useAsync(
    () => reportsApi.getDailyReport(5),
    [],
  );

  useErrorNotification(error, Boolean(data));

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

          <Card title="Análisis" subtitle="Reportes y predicciones" style={styles.section}>
            {ANALYTICS.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={[styles.navIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.navText}>
                  <Text style={[styles.navTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.navSubtitle, { color: colors.muted }]}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            ))}
          </Card>

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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    flex: 1,
    gap: 2,
  },
  navTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  navSubtitle: {
    fontSize: fontSize.xs,
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
