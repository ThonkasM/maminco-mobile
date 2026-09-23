import { apiFetch } from './client';
import type { Paginated, Product } from './types';

export interface ListProductsParams {
  categoryId?: string;
  search?: string;
  limit?: number;
}

/** GET /api/products/public/available (no auth required) */
export function getAvailableProducts(params: ListProductsParams = {}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.search) query.set('search', params.search);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<Product[]>(`/api/products/public/available${suffix}`, { auth: false });
}

/** GET /api/products?page=1&limit=100 */
export function getProducts(page = 1, limit = 100): Promise<Paginated<Product>> {
  return apiFetch<Paginated<Product>>(`/api/products?page=${page}&limit=${limit}`);
}

/** GET /api/products/category/:categoryId */
export function getProductsByCategory(categoryId: string): Promise<Paginated<Product>> {
  return apiFetch<Paginated<Product>>(`/api/products/category/${categoryId}`);
}
