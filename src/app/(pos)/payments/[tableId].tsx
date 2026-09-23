import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Input, Screen, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAsync } from '@/hooks/use-async';
import { ordersApi, paymentsApi } from '@/lib/api';
import type { Order, PaymentProcessResult } from '@/lib/api/types';
import { formatCurrency, getErrorMessage, toNumber } from '@/lib/format';
import { useFeedback } from '@/providers/feedback-provider';
import { useAuth } from '@/providers/auth-provider';
import {
  getOrdersSocket,
  joinTable,
  leaveTable,
  type OrderStatusChangedEvent,
} from '@/lib/realtime/socket';

function methodIcon(code: string): keyof typeof Ionicons.glyphMap {
  const normalized = code.toUpperCase();
  if (normalized.includes('CASH') || normalized.includes('EFECT')) return 'cash-outline';
  if (normalized.includes('CARD') || normalized.includes('TARJ')) return 'card-outline';
  if (normalized.includes('TRANSFER')) return 'swap-horizontal-outline';
  return 'wallet-outline';
}

export default function PosPaymentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { notify } = useFeedback();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ tableId: string }>();
  const tableId = typeof params.tableId === 'string' ? params.tableId : params.tableId?.[0];

  const { data: methods, loading: methodsLoading } = useAsync(
    () => paymentsApi.getPaymentMethods(),
    [],
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentProcessResult | null>(null);

  const total = toNumber(order?.total);

  useEffect(() => {
    if (!tableId) return;
    let active = true;
    setOrderLoading(true);
    void (async () => {
      try {
        const activeOrder = await ordersApi.getActiveOrderByTable(tableId);
        if (active) setOrder(activeOrder);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setOrderLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tableId]);

  // If another user closes/cancels the order while charging, leave the screen.
  useEffect(() => {
    if (!session?.token || !tableId) return;
    const socket = getOrdersSocket(session.token);
    joinTable(socket, tableId);
    const onStatus = (event: OrderStatusChangedEvent) => {
      if (event.newStatus === 'CLOSED' || event.newStatus === 'CANCELLED') {
        notify('info', 'La orden fue cerrada por otro usuario');
        router.replace('/(pos)/tables');
      }
    };
    socket.on('order:status:changed', onStatus);
    return () => {
      socket.off('order:status:changed', onStatus);
      leaveTable(socket, tableId);
    };
  }, [session?.token, tableId, notify, router]);

  useEffect(() => {
    if (!methodId && methods && methods.length > 0) setMethodId(methods[0].id);
  }, [methods, methodId]);

  useEffect(() => {
    if (order && !amount) setAmount(total > 0 ? total.toFixed(2) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const selectedMethod = useMemo(
    () => (methods ?? []).find((method) => method.id === methodId) ?? null,
    [methods, methodId],
  );

  const process = useCallback(
    async (isExtraTip?: boolean) => {
      if (!order || !methodId) return;
      const amountReceived = Number(amount);
      if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
        notify('error', 'Ingresa un monto válido.');
        return;
      }
      setSubmitting(true);
      try {
        const response = await paymentsApi.processPayment(order.id, {
          paymentMethodId: methodId,
          amountReceived,
          ...(isExtraTip ? { isExtraTip: true } : {}),
        });
        setResult(response);
        if (response.status === 'ERROR') {
          notify('error', response.message);
        } else if (response.status === 'COMPLETED') {
          notify('success', 'Pago completado');
        }
      } catch (err) {
        notify('error', getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [order, methodId, amount, notify],
  );

  const isCompleted = result?.status === 'COMPLETED';
  const needsTipConfirmation = result?.status === 'PENDING_CONFIRMATION';

  if (orderLoading || methodsLoading) {
    return (
      <Screen>
        <Skeleton height={140} />
        <View style={styles.gap} />
        <Skeleton height={160} />
      </Screen>
    );
  }

  if (!order || order.status !== 'DRAFT' || order.items.length === 0) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Cobro</Text>
        </View>
        <EmptyState
          icon="receipt-outline"
          title="No hay orden abierta"
          description="Esta mesa no tiene una orden con productos por cobrar."
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {`Mesa ${order.tableName}`}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {order.serviceType} · Orden {order.orderNumber}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={[styles.error, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      <Card title="Resumen" subtitle={`${order.itemCount} ítems`} style={styles.section}>
        {order.items.map((item) => (
          <View key={item.id} style={styles.summaryRow}>
            <Text style={[styles.summaryName, { color: colors.text }]} numberOfLines={1}>
              {item.quantity}× {item.productName}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(item.subtotal)}
            </Text>
          </View>
        ))}
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.muted }]}>Total a pagar</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(total)}</Text>
        </View>
      </Card>

      {isCompleted ? (
        <Card style={styles.section}>
          <View style={styles.successHeader}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={[styles.successTitle, { color: colors.text }]}>Pago completado</Text>
          </View>
          <Text style={[styles.successMessage, { color: colors.muted }]}>{result?.message}</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryName, { color: colors.muted }]}>Cambio</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(result?.changeAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryName, { color: colors.muted }]}>Propina</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrency(result?.tipAmount ?? 0)}
            </Text>
          </View>
          <Button
            title="Volver a mesas"
            icon="grid-outline"
            fullWidth
            onPress={() => router.replace('/(pos)/tables')}
            style={styles.successButton}
          />
        </Card>
      ) : needsTipConfirmation ? (
        <Card style={styles.section}>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>
            ¿La diferencia es propina?
          </Text>
          <Text style={[styles.successMessage, { color: colors.muted }]}>{result?.message}</Text>
          <Text style={[styles.difference, { color: colors.accent }]}>
            {formatCurrency(result?.difference ?? 0)}
          </Text>
          <View style={styles.confirmActions}>
            <Button
              title="Sí, es propina"
              fullWidth
              loading={submitting}
              onPress={() => process(true)}
              style={styles.flex}
            />
            <Button
              title="No"
              variant="outline"
              fullWidth
              disabled={submitting}
              onPress={() => process(false)}
              style={styles.flex}
            />
          </View>
        </Card>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Método de pago</Text>
          <View style={styles.methods}>
            {(methods ?? []).map((method) => {
              const active = method.id === methodId;
              return (
                <Pressable
                  key={method.id}
                  onPress={() => setMethodId(method.id)}
                  style={[
                    styles.method,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={methodIcon(method.code)}
                    size={20}
                    color={active ? colors.onPrimary : colors.text}
                  />
                  <Text
                    style={[styles.methodText, { color: active ? colors.onPrimary : colors.text }]}
                    numberOfLines={1}
                  >
                    {method.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Card style={styles.section}>
            <Input
              label="Monto recibido"
              icon="cash-outline"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              hint={`Total: ${formatCurrency(total)}`}
            />
            <Button
              title={`Cobrar ${selectedMethod ? `con ${selectedMethod.name}` : ''}`.trim()}
              icon="checkmark-circle-outline"
              fullWidth
              size="lg"
              loading={submitting}
              onPress={() => process(false)}
              style={styles.payButton}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    height: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  summaryName: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: {
    fontSize: fontSize.md,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  method: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  methodText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  payButton: {
    marginTop: spacing.md,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  successTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  successMessage: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  successButton: {
    marginTop: spacing.lg,
  },
  confirmTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  difference: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
});
