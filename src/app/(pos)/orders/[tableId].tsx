import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, EmptyState, Input, Screen, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { categoriesApi, ordersApi, productsApi } from '@/lib/api';
import type { Order, OrderStatus, Product } from '@/lib/api/types';
import { formatCurrency, getErrorMessage, orderStatusLabel } from '@/lib/format';
import {
  getOrdersSocket,
  joinTable,
  leaveTable,
  type OrderStatusChangedEvent,
} from '@/lib/realtime/socket';
import { useAuth } from '@/providers/auth-provider';
import { useFeedback } from '@/providers/feedback-provider';

const PORTRAIT_COLUMNS = 2;
const LANDSCAPE_COLUMNS = 3;

export default function PosOrderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user, session } = useAuth();
  const { notify, confirm } = useFeedback();
  const params = useLocalSearchParams<{ tableId: string }>();
  const tableId = typeof params.tableId === 'string' ? params.tableId : params.tableId?.[0];

  const isLandscape = width > height;
  const columns = isLandscape ? LANDSCAPE_COLUMNS : PORTRAIT_COLUMNS;

  const {
    data: categories,
    loading: categoriesLoading,
    refreshing: categoriesRefreshing,
    refresh: refreshCategories,
  } = useAsync(() => categoriesApi.getActiveCategories(), []);
  const {
    data: products,
    loading: productsLoading,
    refreshing: productsRefreshing,
    refresh: refreshProducts,
  } = useAsync(() => productsApi.getAvailableProducts(), []);

  const [order, setOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingAdds, setPendingAdds] = useState<Record<string, boolean>>({});
  const [gridWidth, setGridWidth] = useState(0);
  // Synchronous locks: state updates are async, so rapid taps in the same tick
  // could otherwise send stale quantities / create duplicate lines.
  const pendingRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);

  // Charging and cancelling are restricted to CASHIER+ on the backend, so the
  // waiter only sees add/remove product actions.
  const canCharge =
    user?.role === 'ADMINISTRATOR' || user?.role === 'MANAGER' || user?.role === 'CASHIER';

  const tileWidth =
    gridWidth > 0 ? (gridWidth - spacing.md * (columns - 1)) / columns : undefined;

  const reloadOrder = useCallback(async () => {
    if (!tableId) return;
    try {
      const active = await ordersApi.getActiveOrderByTable(tableId);
      setOrder(active);
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setOrderLoading(false);
    }
  }, [tableId, notify]);

  useEffect(() => {
    void reloadOrder();
  }, [reloadOrder]);

  const [orderRefreshing, setOrderRefreshing] = useState(false);

  // Pull-to-refresh reloads the catalog (categories + products) and the order.
  // `useAsync.refresh` only triggers the fetch, so its own `refreshing` flags
  // keep the spinner visible until the data arrives.
  const handleRefresh = useCallback(async () => {
    setOrderRefreshing(true);
    try {
      await Promise.all([refreshCategories(), refreshProducts(), reloadOrder()]);
    } finally {
      setOrderRefreshing(false);
    }
  }, [refreshCategories, refreshProducts, reloadOrder]);

  const refreshing = categoriesRefreshing || productsRefreshing || orderRefreshing;

  // Refresh the catalog and order when the screen regains focus (e.g. coming
  // back from the payment screen), so price/availability changes show up. The
  // first focus is skipped because useAsync already fetched on mount.
  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true;
        return;
      }
      void refreshCategories();
      void refreshProducts();
      void reloadOrder();
    }, [refreshCategories, refreshProducts, reloadOrder]),
  );

  // Live updates for the table's active order.
  useEffect(() => {
    if (!session?.token || !tableId) return;
    const socket = getOrdersSocket(session.token);
    joinTable(socket, tableId);

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

    socket.on('order:item:added', onItemEvent);
    socket.on('order:item:removed', onItemEvent);
    socket.on('order:item:updated', onItemEvent);
    socket.on('order:status:changed', onStatusEvent);

    return () => {
      leaveTable(socket, tableId);
      socket.off('order:item:added', onItemEvent);
      socket.off('order:item:removed', onItemEvent);
      socket.off('order:item:updated', onItemEvent);
      socket.off('order:status:changed', onStatusEvent);
    };
  }, [session?.token, tableId, reloadOrder, notify, router, setOrder]);

  const filteredProducts = useMemo(() => {
    const all = products ?? [];
    const byCategory = selectedCategoryId
      ? all.filter((product) => product.categoryId === selectedCategoryId)
      : all;
    const term = query.trim().toLowerCase();
    if (!term) return byCategory;
    return byCategory.filter((product) => product.name.toLowerCase().includes(term));
  }, [products, selectedCategoryId, query]);

  const orderQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of order?.items ?? []) {
      map[item.productId] = (map[item.productId] ?? 0) + item.quantity;
    }
    return map;
  }, [order]);

  // Tapping a product adds one unit straight to the current order (no cart /
  // send step). Each product is locked while its request is in flight so rapid
  // taps cannot create duplicate lines.
  const addProduct = async (product: Product) => {
    if (!user || !tableId || pendingRef.current.has(product.id)) return;
    pendingRef.current.add(product.id);
    setPendingAdds((prev) => ({ ...prev, [product.id]: true }));
    try {
      if (!order) {
        const created = await ordersApi.createOrder({
          tableId,
          createdById: user.id,
          initialItems: [{ productId: product.id, quantity: 1 }],
        });
        setOrder(created);
      } else {
        const existing = order.items.find((item) => item.productId === product.id);
        if (existing) {
          await ordersApi.updateOrderItem(order.id, existing.id, {
            quantity: existing.quantity + 1,
          });
        } else {
          await ordersApi.addOrderItem(order.id, { productId: product.id, quantity: 1 });
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
  };

  const changeItemQuantity = async (itemId: string, quantity: number) => {
    if (!order || busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    try {
      if (quantity <= 0) await ordersApi.removeOrderItem(order.id, itemId);
      else await ordersApi.updateOrderItem(order.id, itemId, { quantity });
      await reloadOrder();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const changeStatus = async (status: OrderStatus) => {
    if (!order) return;
    setSubmitting(true);
    try {
      await ordersApi.changeOrderStatus(order.id, { status });
      await reloadOrder();
      notify('success', status === 'CANCELLED' ? 'Orden cancelada' : 'Orden actualizada');
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const requestCancelOrder = async () => {
    const ok = await confirm({
      title: 'Cancelar orden',
      message:
        'Se marcará la orden como cancelada y la mesa volverá a estar libre. Esta acción no se puede deshacer.',
      confirmText: 'Sí, cancelar',
      cancelText: 'Volver',
      destructive: true,
    });
    if (ok) await changeStatus('CANCELLED');
  };

  const goToPayment = () => {
    if (!tableId) return;
    router.push(`/(pos)/payments/${tableId}`);
  };

  if (orderLoading && categoriesLoading && productsLoading) {
    return (
      <Screen>
        <Skeleton height={120} />
        <View style={styles.gap} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {order ? `Mesa ${order.tableName}` : 'Mesa'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
          {order
            ? `${order.serviceType} · Orden ${order.orderNumber} · ${orderStatusLabel(order.status)}`
            : 'Nueva orden'}
        </Text>
      </View>
      {order ? (
        <Badge
          label={orderStatusLabel(order.status)}
          tone={order.status === 'DRAFT' ? 'warning' : order.status === 'CLOSED' ? 'success' : 'danger'}
        />
      ) : null}
    </View>
  );

  const catalog = (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Catálogo</Text>

      {categoriesLoading ? (
        <Skeleton height={36} width="80%" />
      ) : categories && categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          <Pressable
            onPress={() => setSelectedCategoryId(null)}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategoryId === null ? colors.primary : colors.surface,
                borderColor: selectedCategoryId === null ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategoryId === null ? colors.onPrimary : colors.text },
              ]}
            >
              Todo
            </Text>
          </Pressable>
          {categories.map((category) => {
            const active = category.id === selectedCategoryId;
            return (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.categoryText, { color: active ? colors.onPrimary : colors.text }]}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Input
        icon="search-outline"
        placeholder="Buscar producto"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={styles.search}
      />

      {productsLoading ? (
        <View style={styles.productGrid}>
          <Skeleton height={120} style={[styles.productTile, { width: tileWidth ?? 160 }]} />
          <Skeleton height={120} style={[styles.productTile, { width: tileWidth ?? 160 }]} />
        </View>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon="fast-food-outline"
          title="Sin productos"
          description="No hay productos disponibles en esta categoría."
        />
      ) : (
        <View
          style={styles.productGrid}
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        >
          {filteredProducts.map((product) => {
            const quantity = orderQuantities[product.id] ?? 0;
            const busy = pendingAdds[product.id] ?? false;
            return (
              <Pressable
                key={product.id}
                onPress={() => addProduct(product)}
                style={({ pressed }) => [
                  styles.productTile,
                  {
                    width: tileWidth,
                    backgroundColor: colors.surface,
                    borderColor: quantity > 0 ? colors.primary : colors.border,
                    opacity: busy ? 0.6 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {quantity > 0 ? (
                  <View style={styles.qtyBadge}>
                    <Badge label={`x${quantity}`} tone="primary" />
                  </View>
                ) : null}
                <View style={quantity > 0 ? styles.productHeaderOffset : undefined}>
                  <Text
                    style={[styles.productName, { color: colors.text }]}
                    numberOfLines={3}
                  >
                    {product.name}
                  </Text>
                  <Text style={[styles.productCategory, { color: colors.muted }]} numberOfLines={1}>
                    {product.categoryName}
                  </Text>
                </View>
                <Text style={[styles.productPrice, { color: colors.primary }]}>
                  {formatCurrency(product.price)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  const orderPanel = (
    <>
      {order ? (
        <Card
          title="Pedido actual"
          subtitle={`${order.itemCount} ítems · Abierta por ${order.createdByName}`}
          style={[styles.section, styles.clip]}
        >
          {order.items.length === 0 ? (
            <Text style={[styles.muted, { color: colors.muted }]}>
              Aún no hay productos en esta orden.
            </Text>
          ) : (
            order.items.map((item) => (
              <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.muted }]}>
                    {formatCurrency(item.unitPrice)} c/u
                  </Text>
                  <View style={styles.itemEditorRow}>
                    <Ionicons name="person-outline" size={11} color={colors.muted} />
                    <Text style={[styles.itemEditor, { color: colors.muted }]} numberOfLines={1}>
                      {item.addedByName}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <Text style={[styles.itemSubtotal, { color: colors.primary }]}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => changeItemQuantity(item.id, item.quantity - 1)}
                      hitSlop={8}
                      style={[styles.stepBtn, { borderColor: colors.border }]}
                      disabled={submitting}
                    >
                      <Ionicons name="remove" size={16} color={colors.text} />
                    </Pressable>
                    <Text style={[styles.stepValue, { color: colors.text }]}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => changeItemQuantity(item.id, item.quantity + 1)}
                      hitSlop={8}
                      style={[styles.stepBtn, { borderColor: colors.border }]}
                      disabled={submitting}
                    >
                      <Ionicons name="add" size={16} color={colors.text} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.muted }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {formatCurrency(order.total)}
            </Text>
          </View>

          {canCharge ? (
            <View style={styles.orderActions}>
              <Button
                title="Cobrar"
                icon="card-outline"
                onPress={goToPayment}
                disabled={order.items.length === 0}
                style={styles.flex}
              />
              <Button
                title="Cancelar orden"
                variant="outline"
                icon="close-circle-outline"
                onPress={requestCancelOrder}
                loading={submitting}
                style={styles.flex}
              />
            </View>
          ) : null}
        </Card>
      ) : (
        <Card title="Pedido actual" style={[styles.section, styles.clip]}>
          <Text style={[styles.muted, { color: colors.muted }]}>
            Esta mesa no tiene una orden abierta. Agrega productos del catálogo para crearla.
          </Text>
        </Card>
      )}

    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Screen
        scroll={!isLandscape}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={
          isLandscape ? undefined : { paddingBottom: spacing.xxl + insets.bottom }
        }
      >
        {header}

        {isLandscape ? (
          <View style={styles.split}>
            <ScrollView
              style={styles.pane}
              contentContainerStyle={[styles.paneContent, { paddingBottom: spacing.xxl + insets.bottom }]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            >
              {orderPanel}
            </ScrollView>
            <ScrollView
              style={styles.pane}
              contentContainerStyle={[styles.paneContent, { paddingBottom: spacing.xxl + insets.bottom }]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
            >
              {catalog}
            </ScrollView>
          </View>
        ) : (
          <>
            {orderPanel}
            {catalog}
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  split: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  pane: {
    flex: 1,
  },
  paneContent: {
    flexGrow: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  clip: {
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  muted: {
    fontSize: fontSize.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  itemMeta: {
    fontSize: fontSize.xs,
  },
  itemEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemEditor: {
    flexShrink: 1,
    fontSize: fontSize.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepValue: {
    minWidth: 20,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  itemSubtotal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.md,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  orderActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  flex: {
    flex: 1,
  },
  categoryList: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  search: {
    marginBottom: spacing.md,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  productTile: {
    position: 'relative',
    minHeight: 120,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  productHeaderOffset: {
    // Push the text below the corner badge so it never overlaps the name.
    paddingTop: 4,
  },
  qtyBadge: {
    position: 'absolute',
    // Intentionally overhangs the card's top-right corner so it reads as a
    // badge "stamped" on top of the tile.
    top: -6,
    right: -6,
    zIndex: 2,
    borderRadius: radii.pill,
    ...Platform.select({
      web: { boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.25)' },
      default: {
        elevation: 3,
        shadowColor: '#000000',
        shadowOpacity: 0.25,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
    }),
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  productCategory: {
    fontSize: fontSize.xs,
  },
  productPrice: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
