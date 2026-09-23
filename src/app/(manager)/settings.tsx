import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Badge, Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useErrorNotification } from '@/hooks/use-error-notification';
import { useTheme } from '@/hooks/use-theme';
import { isForbidden, systemApi } from '@/lib/api';
import type {
  SystemConfig,
  SystemLogEntry,
  SystemStatus,
} from '@/lib/api/system';
import { formatDateTime, formatNumber, formatTime, formatUptime, getErrorMessage } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { useFeedback } from '@/providers/feedback-provider';

interface SettingsBundle {
  status: SystemStatus;
  config: SystemConfig | null;
  logs: SystemLogEntry[];
}

const LEVELS: { value: string | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Warn' },
  { value: 'log', label: 'Info' },
  { value: 'debug', label: 'Debug' },
];

function logTone(level: string): BadgeTone {
  switch (level.toLowerCase()) {
    case 'error':
      return 'danger';
    case 'warn':
      return 'warning';
    case 'debug':
    case 'verbose':
      return 'neutral';
    default:
      return 'info';
  }
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      {children ?? (
        <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

function ReachBadge({ reachable }: { reachable: boolean }) {
  return (
    <Badge label={reachable ? 'Operativo' : 'Sin conexión'} tone={reachable ? 'success' : 'danger'} />
  );
}

export default function ManagerSettingsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { notify } = useFeedback();
  const [level, setLevel] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMINISTRATOR';

  const { data, error, loading, refreshing, refresh } = useAsync<SettingsBundle>(async () => {
    const status = await systemApi.getStatus();
    if (!isAdmin) return { status, config: null, logs: [] };

    try {
      const [config, logs] = await Promise.all([
        systemApi.getConfig(),
        systemApi.getLogs(50, level ?? undefined),
      ]);
      return { status, config, logs: logs.data };
    } catch (err) {
      if (isForbidden(err)) {
        notify('error', 'No tienes permisos para ver la configuración ni los registros.');
      } else {
        notify('error', getErrorMessage(err));
      }
      return { status, config: null, logs: [] };
    }
  }, [isAdmin, level]);

  useErrorNotification(error, Boolean(data));

  const status = data?.status ?? null;
  const config = data?.config ?? null;
  const logs = data?.logs ?? [];

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refresh}>
      <BackButton />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Sistema</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Estado de los servicios e información del servidor
        </Text>
      </View>

      {loading ? (
        <View style={styles.stack}>
          <Skeleton height={140} />
          <Skeleton height={140} />
          <Skeleton height={140} />
        </View>
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="No se pudo cargar el estado"
          description={error}
          actionLabel="Reintentar"
          onAction={refresh}
        />
      ) : status ? (
        <>
          <Card title="Servidor">
            <InfoRow label="Estado">
              <Badge
                label={status.server.status}
                tone={status.server.status === 'ok' ? 'success' : 'warning'}
              />
            </InfoRow>
            <InfoRow label="Tiempo activo" value={formatUptime(status.server.uptimeSeconds)} />
            <InfoRow label="Node" value={status.server.nodeVersion} />
            <InfoRow label="Entorno" value={status.server.environment} />
            <InfoRow
              label="Memoria"
              value={`${formatNumber(status.server.memory.heapUsedMb)} / ${formatNumber(
                status.server.memory.rssMb,
              )} MB`}
            />
          </Card>

          <Card title="Base de datos" style={styles.section}>
            <InfoRow label="Estado">
              <ReachBadge reachable={status.database.reachable} />
            </InfoRow>
            <InfoRow
              label="Latencia"
              value={status.database.latencyMs != null ? `${status.database.latencyMs} ms` : '—'}
            />
          </Card>

          <Card title="Servicio de IA" style={styles.section}>
            <InfoRow label="Estado">
              <ReachBadge reachable={status.ai.reachable} />
            </InfoRow>
            <InfoRow label="URL" value={status.ai.url} />
          </Card>

          <Card title="Impresión" style={styles.section}>
            <InfoRow label="Estado">
              <ReachBadge reachable={status.printing.reachable} />
            </InfoRow>
            <InfoRow
              label="Impresora por defecto"
              value={status.printing.detail.defaultPrinter ?? '—'}
            />
            <InfoRow
              label="Impresoras"
              value={`${formatNumber(status.printing.detail.printers.length)} registradas`}
            />
          </Card>

          <Card title="Tiempo real" style={styles.section}>
            <InfoRow
              label="Clientes conectados"
              value={formatNumber(status.realtime.clients)}
            />
            <InfoRow label="Última lectura" value={formatTime(status.timestamp)} />
          </Card>

          {isAdmin ? (
            <>
              <Card title="Configuración" style={styles.section}>
                {config ? (
                  <>
                    <InfoRow label="Entorno" value={config.environment} />
                    <InfoRow label="Puerto" value={String(config.port)} />
                    <InfoRow label="Ruta base" value={config.apiBasePath} />
                    <InfoRow label="IA habilitada">
                      <Badge
                        label={config.aiEnabled ? 'Sí' : 'No'}
                        tone={config.aiEnabled ? 'success' : 'neutral'}
                      />
                    </InfoRow>
                    <InfoRow label="URL de IA" value={config.aiServiceUrl} />
                    <InfoRow label="Orígenes CORS" value={config.corsOrigins.join(', ')} />
                  </>
                ) : (
                  <Text style={[styles.note, { color: colors.muted }]}>
                    No se pudo cargar la configuración.
                  </Text>
                )}
              </Card>

              <Card title="Registros del servidor" style={styles.section}>
                <View style={styles.chips}>
                  {LEVELS.map((option) => {
                    const active = option.value === level;
                    return (
                      <Pressable
                        key={option.label}
                        onPress={() => setLevel(option.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? colors.primary : colors.surfaceAlt,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipLabel,
                            { color: active ? colors.onPrimary : colors.text },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {logs.length === 0 ? (
                  <Text style={[styles.note, { color: colors.muted }]}>
                    No hay registros para el filtro seleccionado.
                  </Text>
                ) : (
                  logs.map((entry, index) => (
                    <View key={`${entry.timestamp}-${index}`} style={styles.logRow}>
                      <View style={styles.logHeader}>
                        <Badge label={entry.level} tone={logTone(entry.level)} />
                        <Text style={[styles.logTime, { color: colors.muted }]}>
                          {formatDateTime(entry.timestamp)}
                        </Text>
                      </View>
                      <Text style={[styles.logMessage, { color: colors.text }]}>
                        {entry.message}
                      </Text>
                      {entry.context ? (
                        <Text style={[styles.logContext, { color: colors.muted }]} numberOfLines={2}>
                          {entry.context}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </Card>
            </>
          ) : (
            <Card title="Configuración y registros" style={styles.section}>
              <Text style={[styles.note, { color: colors.muted }]}>
                Solo los administradores pueden ver la configuración y los registros del servidor.
              </Text>
            </Card>
          )}
        </>
      ) : (
        <EmptyState
          icon="server-outline"
          title="Sin información"
          description="No se recibió el estado del servidor."
          actionLabel="Reintentar"
          onAction={refresh}
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.sm,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  note: {
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  logRow: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  logTime: {
    fontSize: fontSize.xs,
  },
  logMessage: {
    fontSize: fontSize.sm,
  },
  logContext: {
    fontSize: fontSize.xs,
  },
});
