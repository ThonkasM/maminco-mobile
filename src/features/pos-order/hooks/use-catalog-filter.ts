import { useMemo, useState } from 'react';

import type { Product } from '@/lib/api/types';

export function useCatalogFilter(products: Product[] | null) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const all = products ?? [];
    const byCategory = selectedCategoryId
      ? all.filter((product) => product.categoryId === selectedCategoryId)
      : all;
    const term = query.trim().toLowerCase();
    if (!term) return byCategory;
    return byCategory.filter((product) => product.name.toLowerCase().includes(term));
  }, [products, selectedCategoryId, query]);

  return { selectedCategoryId, setSelectedCategoryId, query, setQuery, filteredProducts };
}
