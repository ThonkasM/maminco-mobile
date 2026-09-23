import { apiFetch } from './client';
import type { Category, Paginated } from './types';

/** GET /api/categories/public/active (no auth required) */
export function getActiveCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories/public/active', { auth: false });
}

/** GET /api/categories?page=1&limit=100 (ADMINISTRATOR only) */
export function getCategories(page = 1, limit = 100): Promise<Paginated<Category>> {
  return apiFetch<Paginated<Category>>(`/api/categories?page=${page}&limit=${limit}`);
}
