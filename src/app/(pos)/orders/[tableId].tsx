import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Screen, Skeleton } from '@/components/ui';
import { radii, spacing } from '@/constants/theme';
import { CatalogHeader } from '@/features/pos-order/components/catalog-header';
import { OrderHeader, OrderPanel } from '@/features/pos-order/components/order-panel';
import { ProductTile } from '@/features/pos-order/components/product-tile';
import { useCatalogFilter } from '@/features/pos-order/hooks/use-catalog-filter';
import { usePosOrder } from '@/features/pos-order/hooks/use-pos-order';
import { useTheme } from '@/hooks/use-theme';
import type { Product } from '@/lib/api/types';

const PORTRAIT_COLUMNS = 2;
const LANDSCAPE_COLUMNS = 3;

const keyExtractor = (product: Product) => product.id;

function RowSeparator() {
  return <View style={styles.separator} />;
}

export default function PosOrderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ tableId: string }>();
  const tableId = typeof params.tableId === 'string' ? params.tableId : params.tableId?.[0];

  const isLandscape = width > height;
  const columns = isLandscape ? LANDSCAPE_COLUMNS : PORTRAIT_COLUMNS;
  const [listWidth, setListWidth] = useState(0);
  const tileWidth =
    listWidth > 0 ? (listWidth - spacing.md * (columns - 1)) / columns : undefined;

  const pos = usePosOrder(tableId);
  const catalog = useCatalogFilter(pos.products);
  const { addProduct, orderQuantities, pendingAdds } = pos;

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => setListWidth(event.nativeEvent.layout.width),
    [],
  );

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductTile
        product={item}
        quantity={orderQuantities[item.id] ?? 0}
        busy={pendingAdds[item.id] ?? false}
        width={tileWidth}
        onAdd={addProduct}
      />
    ),
    [orderQuantities, pendingAdds, tileWidth, addProduct],
  );

  if (pos.orderLoading && pos.categoriesLoading && pos.productsLoading) {
    return (
      <Screen>
        <Skeleton height={120} />
        <View style={styles.gap} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  const bottomPadding = spacing.xxl + insets.bottom;
  const refreshControl = (
    <RefreshControl
      refreshing={pos.refreshing}
      onRefresh={pos.handleRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  const orderPanel = (
    <OrderPanel
      order={pos.order}
      canCharge={pos.canCharge}
      canRemoveProducts={pos.canRemoveProducts}
      submitting={pos.submitting}
      onChangeQuantity={pos.changeItemQuantity}
      onCharge={pos.goToPayment}
      onCancel={pos.requestCancelOrder}
    />
  );

  const catalogHeader = (
    <CatalogHeader
      categories={pos.categories}
      categoriesLoading={pos.categoriesLoading}
      selectedCategoryId={catalog.selectedCategoryId}
      onSelectCategory={catalog.setSelectedCategoryId}
      query={catalog.query}
      onChangeQuery={catalog.setQuery}
    />
  );

  const productList = (header: React.ReactElement) => (
    <FlatList
      key={columns}
      data={pos.productsLoading ? [] : catalog.filteredProducts}
      keyExtractor={keyExtractor}
      renderItem={renderProduct}
      numColumns={columns}
      columnWrapperStyle={styles.row}
      ItemSeparatorComponent={RowSeparator}
      ListHeaderComponent={header}
      ListEmptyComponent={
        pos.productsLoading ? (
          <View style={styles.row}>
            <Skeleton height={120} style={[styles.skeletonTile, { width: tileWidth ?? 160 }]} />
            <Skeleton height={120} style={[styles.skeletonTile, { width: tileWidth ?? 160 }]} />
          </View>
        ) : (
          <EmptyState
            icon="fast-food-outline"
            title="Sin productos"
            description="No hay productos disponibles en esta categoría."
          />
        )
      }
      onLayout={handleLayout}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      initialNumToRender={columns * 4}
      windowSize={7}
      refreshControl={refreshControl}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Screen>
        <OrderHeader order={pos.order} onBack={() => router.back()} />

        {isLandscape ? (
          <View style={styles.split}>
            <ScrollView
              style={styles.pane}
              contentContainerStyle={{ paddingBottom: bottomPadding }}
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
            >
              {orderPanel}
            </ScrollView>
            <View style={styles.pane}>{productList(catalogHeader)}</View>
          </View>
        ) : (
          productList(
            <View>
              {orderPanel}
              {catalogHeader}
            </View>,
          )
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
  split: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  pane: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
  skeletonTile: {
    borderRadius: radii.md,
  },
});
