import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAsync } from '@/hooks/use-async';
import { ordersApi, paymentsApi } from '@/lib/api';
import type { Order, PaymentProcessResult } from '@/lib/api/types';
import { getErrorMessage, parseMoney, toNumber } from '@/lib/format';
import {
  getOrdersSocket,
  joinTable,
  leaveTable,
  type OrderStatusChangedEvent,
} from '@/lib/realtime/socket';
import { useAuth } from '@/providers/auth-provider';
import { useFeedback } from '@/providers/feedback-provider';

export function usePayment(tableId: string | undefined) {
  const router = useRouter();
  const { notify } = useFeedback();
  const { session } = useAuth();

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
        if (!active) return;
        setOrder(activeOrder);
        const orderTotal = toNumber(activeOrder?.total);
        setAmount((current) => current || (orderTotal > 0 ? orderTotal.toFixed(2) : ''));
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

  const selectedMethod = useMemo(
    () => (methods ?? []).find((method) => method.id === methodId) ?? null,
    [methods, methodId],
  );

  const process = useCallback(
    async (isExtraTip?: boolean) => {
      if (!order || !methodId) return;
      const amountReceived = parseMoney(amount);
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

  return {
    methods,
    selectedMethod,
    methodId,
    setMethodId,
    amount,
    setAmount,
    order,
    total,
    loading: orderLoading || methodsLoading,
    submitting,
    error,
    result,
    isCompleted: result?.status === 'COMPLETED',
    needsTipConfirmation: result?.status === 'PENDING_CONFIRMATION',
    process,
  };
}
