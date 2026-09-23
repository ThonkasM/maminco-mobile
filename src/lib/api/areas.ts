import { apiFetch } from './client';
import type { Area, Paginated } from './types';

/** GET /api/areas/public/active (no auth required) */
export function getActiveAreas(): Promise<Area[]> {
  return apiFetch<Area[]>('/api/areas/public/active', { auth: false });
}

/** GET /api/areas?page=1&limit=100 (ADMINISTRATOR only) */
export function getAreas(page = 1, limit = 100): Promise<Paginated<Area>> {
  return apiFetch<Paginated<Area>>(`/api/areas?page=${page}&limit=${limit}`);
}
