import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarChart, type BarDatum } from '@/components/bar-chart';
import { Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { forecastApi, isNotFound } from '@/lib/api';
import type { ForecastPoint } from '@/lib/api/types';
import { formatCurrency, getErrorMessage } from '@/lib/format';

type ForecastState = 'loading' | 'ready' | 'empty' | 'error';

export default function ManagerForecastScreen() {
  const { colors } = useTheme();
  const [state, setState] = useState<ForecastState>('loading');
  const [points, setPoints] = useState<ForecastPoint[]>([]);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setMessage('');
    try {
      const response = await forecastApi.getSalesForecast(7);
      const normalized = forecastApi.normalizeForecastPoints(response);
      if (normalized.length === 0) {
        setState('empty');
        setMessage('El modelo no devolvió datos para los próximos días.');
        return;
      }
      setPoints(normalized);
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

  const bars: BarDatum[] = points.map((point, index) => ({
    label: forecastApi.forecastPointLabel(point, index),
    value: forecastApi.forecastPointValue(point),
  }));

  return (
    <Screen scroll refreshing={state === 'loading'} onRefresh={load}>
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
    fontWeight: fontWeight.bold,
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
