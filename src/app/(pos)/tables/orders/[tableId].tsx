import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAsync } from '@/hooks/use-async';
import { categoriesApi, ordersApi, productsApi } from '@/lib/api';
import type { Order, OrderStatus, Product } from '@/lib/api/types';
import { formatCurrency, getErrorMessage, orderStatusLabel, toNumber } from '@/lib/format';
import {
  getOrdersSocket,
  joinTable,
  leaveTable,
  type OrderStatusChangedEvent,
} from '@/lib/realtime/socket';
import { useAuth } from '@/providers/auth-provider';
import { useFeedback } from '@/providers/feedback-provider';

interface CartLine {
  product: Product;
  quantity: number;
}

export default function PosOrderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, session } = useAuth();
  const { notify, confirm } = useFeedback();
  const params = useLocalSearchParams<{ tableId: string }>();
  const tableId = typeof params.tableId === 'string' ? params.tableId : params.tableId?.[0];

  const { data: categories, loading: categoriesLoading } = useAsync(
    () => categoriesApi.getActiveCategories(),
    [],
  );
  const { data: products, loading: productsLoading } = useAsync(
    () => productsApi.getAvailableProducts(),
    [],
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  // Live updates for the table's active order.
  useEffect(() => {
    if (!session?.token || !tableId) return;
    const socket = getOrdersSocket(session.token);
    joinTable(socket, tableId);

    const onItemEvent = () => void reloadOrder();
    const onStatusEvent = (_event: OrderStatusChangedEvent) => void reloadOrder();

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
  }, [session?.token, tableId, reloadOrder]);

  const filteredProducts = useMemo(() => {
    const all = products ?? [];
    if (!selectedCategoryId) return all;
    return all.filter((product) => product.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const cartLines: CartLine[] = useMemo(() => {
    const all = products ?? [];
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = all.find((item) => item.id === productId);
        return product ? { product, quantity } : null;
      })
      .filter((line): line is CartLine => line !== null);
  }, [cart, products]);

  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce(
    (sum, line) => sum + toNumber(line.product.price) * line.quantity,
    0,
  );

  const addToCart = (product: Product) =>
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] ?? 0) + 1 }));

  const removeFromCart = (product: Product) =>
    setCart((prev) => {
      const next = { ...prev };
      const quantity = (next[product.id] ?? 0) - 1;
      if (quantity <= 0) delete next[product.id];
      else next[product.id] = quantity;
      return next;
    });

  const submitCart = async () => {
    if (!user || !tableId || cartLines.length === 0) return;
    const creating = !order;
    setSubmitting(true);
    try {
      if (!order) {
        const created = await ordersApi.createOrder({
          tableId,
          createdById: user.id,
          initialItems: cartLines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
        });
        setOrder(created);
      } else {
        for (const line of cartLines) {
          await ordersApi.addOrderItem(order.id, {
            productId: line.product.id,
            quantity: line.quantity,
          });
        }
        await reloadOrder();
      }
      setCart({});
      notify('success', creating ? 'Orden creada correctamente' : 'Productos agregados a la orden');
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const changeItemQuantity = async (itemId: string, quantity: number) => {
    if (!order) return;
    setSubmitting(true);
    try {
      if (quantity <= 0) await ordersApi.removeOrderItem(order.id, itemId);
      else await ordersApi.updateOrderItem(order.id, itemId, { quantity });
      await reloadOrder();
    } catch (err) {
      notify('error', getErrorMessage(err));
    } finally {
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
    router.push(`/(pos)/tables/payments/${tableId}`);
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Screen
        scroll
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {order?.tableName ?? 'Mesa'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
              {order
                ? `Orden ${order.orderNumber} · ${orderStatusLabel(order.status)}`
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

        {order ? (
          <Card title="Pedido actual" subtitle={`${order.itemCount} ítems`} style={styles.section}>
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
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => changeItemQuantity(item.id, item.quantity - 1)}
                      style={[styles.stepBtn, { borderColor: colors.border }]}
                      disabled={submitting}
                    >
                      <Ionicons name="remove" size={16} color={colors.text} />
                    </Pressable>
                    <Text style={[styles.stepValue, { color: colors.text }]}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => changeItemQuantity(item.id, item.quantity + 1)}
                      style={[styles.stepBtn, { borderColor: colors.border }]}
                      disabled={submitting}
                    >
                      <Ionicons name="add" size={16} color={colors.text} />
                    </Pressable>
                  </View>
                  <Text style={[styles.itemSubtotal, { color: colors.primary }]}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
              ))
            )}

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.muted }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {formatCurrency(order.total)}
              </Text>
            </View>

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
          </Card>
        ) : null}

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

        {productsLoading ? (
          <View style={styles.productGrid}>
            <Skeleton height={100} style={styles.productTile} />
            <Skeleton height={100} style={styles.productTile} />
          </View>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon="fast-food-outline"
            title="Sin productos"
            description="No hay productos disponibles en esta categoría."
          />
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => {
              const quantity = cart[product.id] ?? 0;
              return (
                <Pressable
                  key={product.id}
                  onPress={() => addToCart(product)}
                  style={({ pressed }) => [
                    styles.productTile,
                    {
                      backgroundColor: colors.surface,
                      borderColor: quantity > 0 ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={styles.productTop}>
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                      {product.name}
                    </Text>
                    {quantity > 0 ? <Badge label={`x${quantity}`} tone="primary" /> : null}
                  </View>
                  <Text style={[styles.productCategory, { color: colors.muted }]} numberOfLines={1}>
                    {product.categoryName}
                  </Text>
                  <View style={styles.productBottom}>
                    <Text style={[styles.productPrice, { color: colors.primary }]}>
                      {formatCurrency(product.price)}
                    </Text>
                    <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                      <Ionicons name="add" size={16} color={colors.onPrimary} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {cartLines.length > 0 ? (
          <Card title="Por enviar" subtitle={`${cartCount} ítems`} style={styles.section}>
            {cartLines.map((line) => (
              <View key={line.product.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                    {line.product.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.muted }]}>
                    {formatCurrency(toNumber(line.product.price) * line.quantity)}
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => removeFromCart(line.product)}
                    style={[styles.stepBtn, { borderColor: colors.border }]}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </Pressable>
                  <Text style={[styles.stepValue, { color: colors.text }]}>{line.quantity}</Text>
                  <Pressable
                    onPress={() => addToCart(line.product)}
                    style={[styles.stepBtn, { borderColor: colors.border }]}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            ))}
            <Button
              title={order ? 'Agregar a la orden' : 'Crear orden'}
              icon="send-outline"
              fullWidth
              loading={submitting}
              onPress={submitCart}
              style={styles.submit}
            />
          </Card>
        ) : null}
      </Screen>

      {cartLines.length > 0 ? (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <View style={styles.bottomInfo}>
            <Text style={[styles.bottomLabel, { color: colors.muted }]}>{cartCount} ítems</Text>
            <Text style={[styles.bottomTotal, { color: colors.text }]}>
              {formatCurrency(cartTotal)}
            </Text>
          </View>
          <Button title="Enviar pedido" icon="send" loading={submitting} onPress={submitCart} />
        </View>
      ) : null}
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
    gap: 2,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  itemMeta: {
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
  itemSubtotal: {
    minWidth: 72,
    textAlign: 'right',
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
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  productTile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 140,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xs,
  },
  productTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  productName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  productCategory: {
    fontSize: fontSize.xs,
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  productPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submit: {
    marginTop: spacing.md,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomInfo: {
    gap: 2,
  },
  bottomLabel: {
    fontSize: fontSize.xs,
  },
  bottomTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});
