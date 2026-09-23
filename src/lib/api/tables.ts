import { apiFetch } from './client';
import type { Paginated, Table, TableStatus } from './types';

export interface ListTablesParams {
  page?: number;
  limit?: number;
  areaId?: string;
  status?: TableStatus;
  number?: number;
}

/** GET /api/tables (ADMINISTRATOR only - may 403 for other roles). */
export function getTables(params: ListTablesParams = {}): Promise<Paginated<Table>> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 100));
  if (params.areaId) query.set('areaId', params.areaId);
  if (params.status) query.set('status', params.status);
  if (params.number !== undefined) query.set('number', String(params.number));
  return apiFetch<Paginated<Table>>(`/api/tables?${query.toString()}`);
}

/** GET /api/tables/area/:areaId */
export function getTablesByArea(areaId: string): Promise<Table[]> {
  return apiFetch<Table[]>(`/api/tables/area/${areaId}`);
}

/** PATCH /api/tables/:id/status */
export function changeTableStatus(id: string, status: TableStatus): Promise<Table> {
  return apiFetch<Table>(`/api/tables/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}
