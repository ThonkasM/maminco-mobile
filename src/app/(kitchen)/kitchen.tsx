import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { KitchenOrderCard } from '@/components/kitchen-order-card';
import { NotificationsBell } from '@/features/notifications/notifications-bell';
import { Badge, EmptyState, Screen } from '@/components/ui';
import { dotSize, fonts, fontSize, fontWeight, spacing, type ThemeColors } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useRealtimeResume } from '@/hooks/use-realtime-resume';
import { useTheme } from '@/hooks/use-theme';
import { featuresApi, ordersApi } from '@/lib/api';
import type { Order, OrderKitchenStatus } from '@/lib/api/types';
import { getErrorMessage } from '@/lib/format';
import {
  getOrdersSocket,
  subscribeKitchen,
  unsubscribeKitchen,
  type OrderKitchenStatusChangedEvent,
} from '@/lib/realtime/socket';
import { useAuth } from '@/providers/auth-provider';
import { useFeedback } from '@/providers/feedback-provider';

type KitchenRow =
  | { type: 'header'; key: string; status: OrderKitchenStatus; label: string; count: number }
  | { type: 'order'; key: string; order: Order; status: OrderKitchenStatus };

const rowKey = (row: KitchenRow) => row.key;

interface KitchenData {
  enabled: boolean;
  orders: Order[];
}

const COLUMNS: { status: OrderKitchenStatus; label: string }[] = [
  { status: 'PENDING', label: 'Pendiente' },
  { status: 'PREPARING', label: 'En preparación' },
  { status: 'READY', label: 'Listo' },
];

function columnColor(status: OrderKitchenStatus, colors: ThemeColors): string {
  switch (status) {
    case 'PENDING':
      return colors.warning;
    case 'PREPARING':
      return colors.primary;
    case 'READY':
      return colors.success;
    default:
      return colors.muted;
  }
}

export default function KitchenScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { notify } = useFeedback();
  const token = session?.token;

  const { data, loading, error, refreshing, refresh, setData } = useAsync<KitchenData>(async () => {
    const flags = await featuresApi.evaluateFeatures();
    const enabled = flags[featuresApi.FEATURE_KEYS.digitalKitchen] === true;
    if (!enabled) return { enabled: false, orders: [] };
    const orders = await ordersApi.getKitchenOrders();
    return { enabled: true, orders };
  }, []);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const refreshRef = useRef(refresh);
  const dataRef = useRef(data);
  useEffect(() => {
    refreshRef.current = refresh;
    dataRef.current = data;
  }, [refresh, data]);

  useEffect(() => {
    if (!token || !data?.enabled) return;
    const socket = getOrdersSocket(token);
    const onEvent = () => void refreshRef.current();
    const onKitchenStatus = ({ orderId, kitchenStatus }: OrderKitchenStatusChangedEvent) => {
      const current = dataRef.current;
      if (!current) return;
      setData({
        ...current,
        orders: current.orders.map((item) =>
          item.id === orderId ? { ...item, kitchenStatus } : item,
        ),
      });
    };
    const onConnect = () => subscribeKitchen(socket);

    socket.on('order:created', onEvent);
    socket.on('order:item:added', onEvent);
    socket.on('order:item:removed', onEvent);
    socket.on('order:item:updated', onEvent);
    socket.on('order:status:changed', onEvent);
    socket.on('order:kitchen-status:changed', onKitchenStatus);
    socket.on('kitchen:orders:snapshot', onEvent);
    socket.on('connect', onConnect);
    if (socket.connected) subscribeKitchen(socket);

    return () => {
      unsubscribeKitchen(socket);
      socket.off('order:created', onEvent);
      socket.off('order:item:added', onEvent);
      socket.off('order:item:removed', onEvent);
      socket.off('order:item:updated', onEvent);
      socket.off('order:status:changed', onEvent);
      socket.off('order:kitchen-status:changed', onKitchenStatus);
      socket.off('kitchen:orders:snapshot', onEvent);
      socket.off('connect', onConnect);
    };
  }, [token, data?.enabled, setData]);

  useRealtimeResume(() => {
    void refreshRef.current();
  }, Boolean(token) && Boolean(data?.enabled));

  const changeStatus = useCallback(
    async (orderId: string, status: OrderKitchenStatus) => {
      const current = dataRef.current;
      if (current) {
        setData({
          ...current,
          orders: current.orders.map((item) =>
            item.id === orderId ? { ...item, kitchenStatus: status } : item,
          ),
        });
      }
      try {
        await ordersApi.updateKitchenStatus(orderId, status);
      } catch (err) {
        notify('error', getErrorMessage(err));
        await refreshRef.current();
      }
    },
    [setData, notify],
  );

  const orders = data?.orders;
  const rows = useMemo<KitchenRow[]>(() => {
    const result: KitchenRow[] = [];
    for (const column of COLUMNS) {
      const columnOrders = (orders ?? []).filter((order) => order.kitchenStatus === column.status);
      if (columnOrders.length === 0) continue;
      result.push({
        type: 'header',
        key: `header-${column.status}`,
        status: column.status,
        label: column.label,
        count: columnOrders.length,
      });
      for (const order of columnOrders) {
        result.push({ type: 'order', key: order.id, order, status: column.status });
      }
    }
    return result;
  }, [orders]);

  const renderRow = useCallback(
    ({ item }: { item: KitchenRow }) => {
      const accent = columnColor(item.status, colors);
      if (item.type === 'header') {
        return (
          <View style={styles.sectionHeader} accessibilityRole="header">
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.sectionCount, { color: colors.muted }]}>{item.count}</Text>
          </View>
        );
      }
      return (
        <KitchenOrderCard
          order={item.order}
          accent={accent}
          now={now}
          onChangeStatus={changeStatus}
        />
      );
    },
    [colors, now, changeStatus],
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <EmptyState
          icon="cloud-offline-outline"
          title="No se pudieron cargar las órdenes"
          description="Revisa la conexión con el servidor e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={() => void refresh()}
        />
      </Screen>
    );
  }

  if (!data.enabled) {
    return (
      <Screen>
        <EmptyState
          icon="restaurant-outline"
          title="Cocina Digitalizada no está habilitada"
          description="Pide a un administrador que active la función “Cocina Digitalizada”."
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Cocina</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {data.orders.length} orden{data.orders.length === 1 ? '' : 'es'} abierta
              {data.orders.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Badge label="En vivo" tone="info" />
            <NotificationsBell />
          </View>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={rowKey}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-outline"
            title="Sin órdenes abiertas"
            description="Cuando entre una orden aparecerá aquí automáticamente."
          />
        }
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  list: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: dotSize,
    height: dotSize,
    borderRadius: dotSize / 2,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: fontSize.sm,
    marginLeft: 'auto',
  },
});
