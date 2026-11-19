import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Product } from '@/lib/api/types';
import { formatCurrency } from '@/lib/format';

interface ProductTileProps {
  product: Product;
  quantity: number;
  busy: boolean;
  width: number | undefined;
  onAdd: (product: Product) => void;
}

function ProductTileComponent({ product, quantity, busy, width, onAdd }: ProductTileProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onAdd(product)}
      accessibilityRole="button"
      accessibilityLabel={`Agregar ${product.name}, ${formatCurrency(product.price)}${
        quantity > 0 ? `, ${quantity} en el pedido` : ''
      }`}
      accessibilityState={{ busy }}
      style={({ pressed }) => [
        styles.tile,
        {
          width,
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
      <View style={quantity > 0 ? styles.headerOffset : undefined}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={3}>
          {product.name}
        </Text>
        <Text style={[styles.category, { color: colors.muted }]} numberOfLines={1}>
          {product.categoryName}
        </Text>
      </View>
      <Text style={[styles.price, { color: colors.primary }]}>{formatCurrency(product.price)}</Text>
    </Pressable>
  );
}

export const ProductTile = React.memo(ProductTileComponent);

const styles = StyleSheet.create({
  tile: {
    position: 'relative',
    minHeight: 120,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  headerOffset: {
    paddingTop: 4,
  },
  qtyBadge: {
    position: 'absolute',
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
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  category: {
    fontSize: fontSize.xs,
  },
  price: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
