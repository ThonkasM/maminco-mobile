import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAsync } from '@/hooks/use-async';
import { useRealtimeResume } from '@/hooks/use-realtime-resume';
import { categoriesApi, featuresApi, ordersApi, productsApi } from '@/lib/api';
import type { Order, OrderStatus, Product } from '@/lib/api/types';
import { getErrorMessage } from '@/lib/format';
import {
  getOrdersSocket,
  joinTable,
  leaveTable,
  type OrderStatusChangedEvent,
} from '@/lib/realtime/socket';
import { useAuth } from '@/providers/auth-provider';
import { useFeedback } from '@/providers/feedback-provider';

export function usePosOrder(tableId: string | undefined) {
  const router = useRouter();
  const { user, session } = useAuth();
  const { notify, confirm } = useFeedback();

  const categories = useAsync(() => categoriesApi.getActiveCategories(), []);
  const products = useAsync(() => productsApi.getAvailableProducts(), []);
  const featureFlags = useAsync(() => featuresApi.evaluateFeatures(), []);
  const canRemoveProducts = featureFlags.data?.waiter_can_remove_products ?? true;

  const [order, setOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderRefreshing, setOrderRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAdds, setPendingAdds] = useState<Record<string, boolean>>({});

  const orderRef = useRef<Order | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const canCharge =
    user?.role === 'ADMINISTRATOR' || user?.role === 'MANAGER' || user?.role === 'CASHIER';

  const reloadOrder = useCallback(async () => {
    if (!tableId) return;
    try {
      setOrder(await ordersApi.getActiveOrderByTable(tableId));
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setOrderLoading(false);
    }
  }, [tableId, notify]);

  useEffect(() => {
    void reloadOrder();
  }, [reloadOrder]);

  const refreshCategories = categories.refresh;
  const refreshProducts = products.refresh;
  const refreshFlags = featureFlags.refresh;
  const refreshCatalog = useCallback(async () => {
    await Promise.all([refreshCategories(), refreshProducts(), refreshFlags()]);
  }, [refreshCategories, refreshProducts, refreshFlags]);

  const handleRefresh = useCallback(async () => {
    setOrderRefreshing(true);
    try {
      await Promise.all([refreshCatalog(), reloadOrder()]);
    } finally {
      setOrderRefreshing(false);
    }
  }, [refreshCatalog, reloadOrder]);

  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      void refreshCatalog();
      void reloadOrder();
    }, [refreshCatalog, reloadOrder]),
  );

  useEffect(() => {
    if (!session?.token || !tableId) return;
    const socket = getOrdersSocket(session.token);
    const onConnect = () => joinTable(socket, tableId);
    const onItemEvent = () => void reloadOrder();
    const onStatusEvent = (event: OrderStatusChangedEvent) => {
      if (event.newStatus === 'CLOSED' || event.newStatus === 'CANCELLED') {
        notify(
          'info',
          event.newStatus === 'CANCELLED'
            ? 'La orden fue cancelada por otro usuario'
            : 'La orden fue cerrada por otro usuario',
        );
        setOrder(null);
        router.replace('/(pos)/tables');
        return;
      }
      void reloadOrder();
    };

    socket.on('connect', onConnect);
    socket.on('order:item:added', onItemEvent);
    socket.on('order:item:removed', onItemEvent);
    socket.on('order:item:updated', onItemEvent);
    socket.on('order:status:changed', onStatusEvent);
    if (socket.connected) onConnect();

    return () => {
      if (socket.connected) leaveTable(socket, tableId);
      socket.off('connect', onConnect);
      socket.off('order:item:added', onItemEvent);
      socket.off('order:item:removed', onItemEvent);
      socket.off('order:item:updated', onItemEvent);
      socket.off('order:status:changed', onStatusEvent);
    };
  }, [session?.token, tableId, reloadOrder, notify, router]);

  useRealtimeResume(() => {
    void reloadOrder();
  }, Boolean(session?.token && tableId));

  const orderQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of order?.items ?? []) {
      map[item.productId] = (map[item.productId] ?? 0) + item.quantity;
    }
    return map;
  }, [order]);

  const addProduct = useCallback(
    async (product: Product) => {
      if (!user || !tableId || pendingRef.current.has(product.id)) return;
      pendingRef.current.add(product.id);
      setPendingAdds((prev) => ({ ...prev, [product.id]: true }));
      try {
        const current = orderRef.current;
        if (!current) {
          setOrder(
            await ordersApi.createOrder({
              tableId,
              createdById: user.id,
              initialItems: [{ productId: product.id, quantity: 1 }],
            }),
          );
        } else {
          const existing = current.items.find((item) => item.productId === product.id);
          if (existing) {
            await ordersApi.updateOrderItem(current.id, existing.id, {
              quantity: existing.quantity + 1,
            });
          } else {
            await ordersApi.addOrderItem(current.id, { productId: product.id, quantity: 1 });
          }
          await reloadOrder();
        }
      } catch (err) {
        notify('error', getErrorMessage(err));
      } finally {
        pendingRef.current.delete(product.id);
        setPendingAdds((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
      }
    },
    [user, tableId, reloadOrder, notify],
  );

  const changeItemQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const current = orderRef.current;
      if (!current || busyRef.current) return;
      busyRef.current = true;
      setSubmitting(true);
      try {
        if (quantity <= 0) await ordersApi.removeOrderItem(current.id, itemId);
        else await ordersApi.updateOrderItem(current.id, itemId, { quantity });
        await reloadOrder();
      } catch (err) {
        notify('error', getErrorMessage(err));
      } finally {
        busyRef.current = false;
        setSubmitting(false);
      }
    },
    [reloadOrder, notify],
  );

  const changeStatus = useCallback(
    async (status: OrderStatus) => {
      const current = orderRef.current;
      if (!current) return;
      setSubmitting(true);
      try {
        await ordersApi.changeOrderStatus(current.id, { status });
        await reloadOrder();
        notify('success', status === 'CANCELLED' ? 'Orden cancelada' : 'Orden actualizada');
      } catch (err) {
        notify('error', getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [reloadOrder, notify],
  );

  const requestCancelOrder = useCallback(async () => {
    const ok = await confirm({
      title: 'Cancelar orden',
      message:
        'Se marcará la orden como cancelada y la mesa volverá a estar libre. Esta acción no se puede deshacer.',
      confirmText: 'Sí, cancelar',
      cancelText: 'Volver',
      destructive: true,
    });
    if (ok) await changeStatus('CANCELLED');
  }, [confirm, changeStatus]);

  const goToPayment = useCallback(() => {
    if (tableId) router.push(`/(pos)/payments/${tableId}`);
  }, [router, tableId]);

  return {
    categories: categories.data,
    categoriesLoading: categories.loading,
    products: products.data,
    productsLoading: products.loading,
    order,
    orderLoading,
    refreshing: categories.refreshing || products.refreshing || orderRefreshing,
    submitting,
    pendingAdds,
    orderQuantities,
    canCharge,
    canRemoveProducts,
    handleRefresh,
    addProduct,
    changeItemQuantity,
    requestCancelOrder,
    goToPayment,
  };
}
