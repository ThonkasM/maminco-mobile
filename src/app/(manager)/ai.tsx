import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { PeakHoursChart } from '@/components/charts/peak-hours-chart';
import { SalesForecastChart } from '@/components/charts/sales-forecast-chart';
import type { PeakHourPoint, SalesForecastPoint } from '@/components/charts/types';
import { KpiTile } from '@/components/kpi-tile';
import { Badge, Button, Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useErrorNotification } from '@/hooks/use-error-notification';
import { useTheme } from '@/hooks/use-theme';
import { aiApi } from '@/lib/api';
import type {
  AiAnomalies,
  AiHealth,
  AiMetricsSummary,
  AiPeakHours,
  AiProductForecast,
  AiSalesForecast,
} from '@/lib/api/ai';
import { formatCurrency, formatNumber, getErrorMessage } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { useFeedback } from '@/providers/feedback-provider';

interface AiBundle {
  health: AiHealth | null;
  metrics: AiMetricsSummary | null;
  sales: AiSalesForecast | null;
  peak: AiPeakHours | null;
  products: AiProductForecast | null;
  anomalies: AiAnomalies | null;
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
}

function reasonOf(payload: { reason: string | null } | null, fallback: string): string {
  return payload?.reason || fallback;
}

export default function ManagerAiScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { notify } = useFeedback();
  const [training, setTraining] = useState(false);

  const isAdmin = user?.role === 'ADMINISTRATOR';

  const { data, error, loading, refreshing, refresh } = useAsync<AiBundle>(async () => {
    const [health, metrics, sales, peak, products, anomalies] = await Promise.all([
      aiApi.getHealth().catch(() => null),
      aiApi.getMetricsSummary().catch(() => null),
      aiApi.getSalesForecast(7).catch(() => null),
      aiApi.getPeakHours().catch(() => null),
      aiApi.getProductForecast(7, 5).catch(() => null),
      aiApi.getAnomalies().catch(() => null),
    ]);
    return { health, metrics, sales, peak, products, anomalies };
  }, []);

  useErrorNotification(error, Boolean(data));

  const handleTrain = async () => {
    setTraining(true);
    try {
      await aiApi.train();
      notify('success', 'Reentrenamiento solicitado. El modelo se actualizará en breve.');
      await refresh();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setTraining(false);
    }
  };

  const health = data?.health ?? null;
  const metrics = data?.metrics ?? null;
  const sales = data?.sales ?? null;
  const peak = data?.peak ?? null;
  const products = data?.products ?? null;
  const anomalies = data?.anomalies ?? null;

  const healthOk =
    health != null &&
    typeof health.status === 'string' &&
    ['ok', 'healthy', 'up', 'ready'].includes(health.status.toLowerCase());
  const healthBadge = health == null
    ? { tone: 'danger' as const, label: 'Sin conexión' }
    : healthOk
      ? { tone: 'success' as const, label: 'Servicio activo' }
      : { tone: 'warning' as const, label: health.status ?? 'Desconocido' };

  const forecastPoints: SalesForecastPoint[] = (sales?.forecast ?? []).map((point, index) => ({
    label: shortDate(point.date),
    model: sales?.model_forecast?.[index] ?? point.predicted_sales ?? 0,
    baseline: sales?.baseline_forecast?.[index] ?? 0,
  }));

  const peakPoints: PeakHourPoint[] = (peak?.profile ?? []).map((entry) => ({
    label: `${entry.hour}:00`,
    value: entry.avg_orders,
  }));

  const hasMetrics = metrics != null && !metrics.insufficient_data;
  const hasForecast = sales != null && !sales.insufficient_data && forecastPoints.length > 0;
  const hasPeak = peak != null && !peak.insufficient_data && peakPoints.length > 0;
  const hasProducts = products != null && !products.insufficient_data && products.forecast.length > 0;
  const hasAnomalies =
    anomalies != null && !anomalies.insufficient_data && anomalies.anomalies.length > 0;
  const hasAnyData = hasMetrics || hasForecast || hasPeak || hasProducts || hasAnomalies;

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refresh}>
      <BackButton />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Inteligencia artificial</Text>
          <Badge label={healthBadge.label} tone={healthBadge.tone} />
        </View>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Métricas del modelo y predicciones de ventas
        </Text>
      </View>

      {loading ? (
        <View style={styles.stack}>
          <Skeleton height={120} />
          <Skeleton height={220} />
          <Skeleton height={180} />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="No se pudo cargar la IA"
          description={error}
          actionLabel="Reintentar"
          onAction={refresh}
        />
      ) : !hasAnyData ? (
        <EmptyState
          icon="sparkles-outline"
          title="Sin datos del servicio de IA"
          description={reasonOf(
            metrics,
            'El servicio de IA aún no está disponible o no hay histórico suficiente.',
          )}
          actionLabel="Reintentar"
          onAction={refresh}
        />
      ) : (
        <>
          {hasMetrics && metrics ? (
            <View style={styles.grid}>
              <KpiTile
                label="Días de histórico"
                value={formatNumber(metrics.days)}
                hint={metrics.last_date ? `Hasta ${shortDate(metrics.last_date)}` : undefined}
                icon="calendar-outline"
                tone="info"
              />
              <KpiTile
                label="Ventas totales"
                value={formatCurrency(metrics.total_sales)}
                icon="cash-outline"
                tone="success"
              />
              <KpiTile
                label="Promedio diario"
                value={formatCurrency(metrics.average_daily_sales)}
                hint={`${formatNumber(metrics.total_orders)} órdenes`}
                icon="trending-up-outline"
                tone="primary"
              />
              <KpiTile
                label="MAE del modelo"
                value={formatCurrency(metrics.sales_model_mae)}
                hint={`Base ${formatCurrency(metrics.baseline_mae)}`}
                icon="analytics-outline"
                tone="accent"
              />
              <KpiTile
                label="Modelo elegido"
                value={metrics.sales_model_chosen ?? '—'}
                hint={`${formatNumber(metrics.products_fitted)} productos ajustados`}
                icon="cube-outline"
                tone="warning"
              />
            </View>
          ) : null}

          <Card
            title="Pronóstico de ventas"
            subtitle="Próximos 7 días · modelo vs. base"
            style={styles.section}
          >
            {hasForecast ? (
              <SalesForecastChart
                data={forecastPoints}
                modelColor={colors.primary}
                baselineColor={colors.muted}
              />
            ) : (
              <EmptyState
                icon="analytics-outline"
                title="Sin pronóstico"
                description={reasonOf(
                  sales,
                  'No hay histórico suficiente para proyectar ventas.',
                )}
              />
            )}
          </Card>

          <Card title="Horas pico" subtitle="Promedio de órdenes por hora" style={styles.section}>
            {hasPeak ? (
              <PeakHoursChart
                data={peakPoints}
                color={colors.accent}
                formatValue={(value) => value.toFixed(1)}
              />
            ) : (
              <EmptyState
                icon="time-outline"
                title="Sin horas pico"
                description={reasonOf(
                  peak,
                  'No hay suficientes días observados para calcular el perfil horario.',
                )}
              />
            )}
          </Card>

          <Card title="Demanda por producto" subtitle="Top 5 proyectado" style={styles.section}>
            {hasProducts && products ? (
              products.forecast.map((product) => (
                <View key={product.product_id} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {product.product_name}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.muted }]} numberOfLines={1}>
                      {product.category_name} · {product.chosen ?? 'modelo'}
                    </Text>
                  </View>
                  <Text style={[styles.rowValue, { color: colors.primary }]}>
                    {formatNumber(product.predicted_quantity)} u.
                  </Text>
                </View>
              ))
            ) : (
              <EmptyState
                icon="cube-outline"
                title="Sin demanda proyectada"
                description={reasonOf(
                  products,
                  'Aún no se puede proyectar la demanda por producto.',
                )}
              />
            )}
          </Card>

          <Card title="Anomalías" subtitle="Desviaciones detectadas" style={styles.section}>
            {hasAnomalies && anomalies ? (
              anomalies.anomalies.map((anomaly, index) => (
                <View key={`${anomaly.date}-${index}`} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {shortDate(anomaly.date)}
                    </Text>
                    <Text style={[styles.rowMeta, { color: colors.muted }]} numberOfLines={1}>
                      {anomaly.direction} · z {Number(anomaly.z_score).toFixed(2)}
                    </Text>
                  </View>
                  <Badge
                    label={anomaly.direction}
                    tone={anomaly.direction === 'down' ? 'danger' : 'warning'}
                  />
                  <Text style={[styles.rowValue, { color: colors.text }]}>
                    {formatCurrency(anomaly.value)}
                  </Text>
                </View>
              ))
            ) : (
              <EmptyState
                icon="pulse-outline"
                title="Sin anomalías"
                description={reasonOf(
                  anomalies,
                  'No se detectaron anomalías en el período analizado.',
                )}
              />
            )}
          </Card>

          {isAdmin ? (
            <Card
              title="Reentrenamiento"
              subtitle="Vuelve a ajustar los modelos con los datos más recientes"
              style={styles.section}
            >
              <Button
                title="Reentrenar"
                icon="refresh-outline"
                loading={training}
                onPress={handleTrain}
                fullWidth
              />
            </Card>
          ) : null}
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
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
  },
  section: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  rowMeta: {
    fontSize: fontSize.xs,
  },
  rowValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
