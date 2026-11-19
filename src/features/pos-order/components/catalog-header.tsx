import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Input, Skeleton } from '@/components/ui';
import { fontSize, fontWeight, radii, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/lib/api/types';

interface CategoryChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const CategoryChip = React.memo(function CategoryChip({ label, active, onPress }: CategoryChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Categoría ${label}`}
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.text }]}>{label}</Text>
    </Pressable>
  );
});

interface CatalogHeaderProps {
  categories: Category[] | null;
  categoriesLoading: boolean;
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  query: string;
  onChangeQuery: (value: string) => void;
}

export function CatalogHeader({
  categories,
  categoriesLoading,
  selectedCategoryId,
  onSelectCategory,
  query,
  onChangeQuery,
}: CatalogHeaderProps) {
  const { colors } = useTheme();

  return (
    <View>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        Catálogo
      </Text>

      {categoriesLoading ? (
        <Skeleton height={36} width="80%" />
      ) : categories && categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        >
          <CategoryChip
            label="Todo"
            active={selectedCategoryId === null}
            onPress={() => onSelectCategory(null)}
          />
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.name}
              active={category.id === selectedCategoryId}
              onPress={() => onSelectCategory(category.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <Input
        icon="search-outline"
        placeholder="Buscar producto"
        value={query}
        onChangeText={onChangeQuery}
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={styles.search}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  search: {
    marginBottom: spacing.md,
  },
});
