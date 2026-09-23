import { apiFetch } from './client';
import type { DailyReport, DailySales, TopProduct } from './types';

interface Wrapped<T> {
  status: string;
  data: T;
  count?: number;
}

/** GET /api/reports/today/sales */
export async function getTodaySales(): Promise<DailySales> {
  const response = await apiFetch<Wrapped<DailySales>>('/api/reports/today/sales');
  return response.data;
}

/** GET /api/reports/today/top-products?limit=10 */
export async function getTodayTopProducts(limit = 10): Promise<TopProduct[]> {
  const response = await apiFetch<Wrapped<TopProduct[]>>(
    `/api/reports/today/top-products?limit=${limit}`,
  );
  return response.data;
}

/** GET /api/reports/today */
export async function getDailyReport(limit = 10): Promise<DailyReport> {
  const response = await apiFetch<Wrapped<DailyReport>>(`/api/reports/today?limit=${limit}`);
  return response.data;
}
