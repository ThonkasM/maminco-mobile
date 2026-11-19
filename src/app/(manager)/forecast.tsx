import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { BarChart, type BarDatum } from '@/components/bar-chart';
import { Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import { fonts, fontSize, fontWeight, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { aiApi, isNotFound } from '@/lib/api';
import type { AiSalesForecastPoint } from '@/lib/api/ai';
import { formatCurrency, getErrorMessage } from '@/lib/format';
import { useErrorNotification } from '@/hooks/use-error-notification';

type ForecastState = 'loading' | 'ready' | 'empty' | 'error';

export default function ManagerForecastScreen() {
  const { colors } = useTheme();
  const [state, setState] = useState<ForecastState>('loading');
  const [points, setPoints] = useState<AiSalesForecastPoint[]>([]);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setMessage('');
    try {
      const response = await aiApi.getSalesForecast(7);
      if (response.insufficient_data || response.forecast.length === 0) {
        setState('empty');
        setMessage('El modelo no devolvió datos para los próximos días.');
        return;
      }
      setPoints(response.forecast);
      setState('ready');
    } catch (err) {
      if (isNotFound(err)) {
        setState('empty');
        setMessage('El servicio de pronósticos aún no está disponible.');
        return;
      }
      setState('error');
      setMessage(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useErrorNotification(state === 'error' ? message : null, points.length > 0);

  const bars: BarDatum[] = points.map((point) => ({
    label: new Date(point.date).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
    value: point.predicted_sales,
  }));

  return (
    <Screen scroll refreshing={state === 'loading'} onRefresh={load}>
      <BackButton />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Pronóstico</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Proyección de ventas a 7 días (IA)
        </Text>
      </View>

      {state === 'loading' ? (
        <View style={styles.stack}>
          <Skeleton height={180} />
          <Skeleton height={80} />
        </View>
      ) : state === 'ready' ? (
        <>
          <Card title="Ventas proyectadas" subtitle="Próximos 7 días">
            <BarChart data={bars} color={colors.accent} formatValue={formatCurrency} />
          </Card>
          <Card title="Total proyectado" style={styles.section}>
            <Text style={[styles.total, { color: colors.primary }]}>
              {formatCurrency(bars.reduce((sum, item) => sum + item.value, 0))}
            </Text>
            <Text style={[styles.totalHint, { color: colors.muted }]}>
              Suma de la proyección para el horizonte seleccionado.
            </Text>
          </Card>
        </>
      ) : state === 'error' ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="No se pudo obtener el pronóstico"
          description={message}
          actionLabel="Reintentar"
          onAction={load}
        />
      ) : (
        <EmptyState
          icon="analytics-outline"
          title="Sin datos"
          description={message || 'El servicio de pronósticos aún no está disponible.'}
          actionLabel="Reintentar"
          onAction={load}
        />
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
  section: {
    marginTop: spacing.lg,
  },
  total: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  totalHint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
