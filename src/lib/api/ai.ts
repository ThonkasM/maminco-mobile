import { apiFetch } from './client';

/** Response DTOs for the `/api/ai/*` proxy. Shapes are snake_case. */

export interface AiHealth {
  status?: string;
  service?: string;
  version?: string;
  models_loaded?: boolean;
  generated_at?: string;
  [key: string]: unknown;
}

export interface AiTopProduct {
  name: string;
  quantity: number;
}

export interface AiMetricsSummary {
  insufficient_data: boolean;
  reason: string | null;
  days: number;
  first_date: string | null;
  last_date: string | null;
  total_sales: number;
  total_orders: number;
  average_daily_sales: number;
  average_order_value: number;
  last_refresh: string | null;
  products_fitted: number;
  sales_model_chosen: string | null;
  sales_model_mae: number | null;
  baseline_mae: number | null;
  top_products: AiTopProduct[];
  generated_at: string;
}

export interface AiSalesForecastPoint {
  date: string;
  predicted_sales: number;
  weekday: string;
}

export interface AiSalesForecast {
  insufficient_data: boolean;
  reason: string | null;
  horizon: number;
  model_mae: number | null;
  baseline_mae: number | null;
  mape: number | null;
  chosen: string | null;
  history_days: number;
  last_history_date: string | null;
  forecast: AiSalesForecastPoint[];
  model_forecast: number[];
  baseline_forecast: number[];
  generated_at: string;
}

export interface AiPeakHourProfileEntry {
  hour: number;
  avg_orders: number;
  avg_sales: number;
  order_share: number;
  sales_share: number;
}

export interface AiPeakHours {
  insufficient_data: boolean;
  reason: string | null;
  days_observed: number;
  peak_hour: number | null;
  peak_avg_orders: number | null;
  top_hours: number[];
  profile: AiPeakHourProfileEntry[];
  generated_at: string;
}

export interface AiAnomaly {
  date: string;
  value: number;
  z_score: number;
  direction: string;
  methods: string[];
}

export interface AiAnomalies {
  insufficient_data: boolean;
  reason: string | null;
  method: string | null;
  median: number | null;
  iqr_lower: number | null;
  iqr_upper: number | null;
  count: number;
  anomalies: AiAnomaly[];
  generated_at: string;
}

export interface AiProductForecastEntry {
  product_id: string;
  product_name: string;
  category_name: string;
  predicted_quantity: number;
  average_daily_quantity: number;
  chosen: string | null;
  daily: number[];
  dates: string[];
}

export interface AiProductForecast {
  insufficient_data: boolean;
  reason: string | null;
  horizon: number;
  forecast: AiProductForecastEntry[];
  generated_at: string;
}

/** GET /api/ai/health */
export function getHealth(): Promise<AiHealth> {
  return apiFetch<AiHealth>('/api/ai/health');
}

/** GET /api/ai/metrics/summary */
export function getMetricsSummary(): Promise<AiMetricsSummary> {
  return apiFetch<AiMetricsSummary>('/api/ai/metrics/summary');
}

/** GET /api/ai/forecast/sales?horizon=7 */
export function getSalesForecast(horizon = 7): Promise<AiSalesForecast> {
  return apiFetch<AiSalesForecast>(`/api/ai/forecast/sales?horizon=${horizon}`);
}

/** GET /api/ai/forecast/products?horizon=7&limit=5 */
export function getProductForecast(horizon = 7, limit = 5): Promise<AiProductForecast> {
  return apiFetch<AiProductForecast>(
    `/api/ai/forecast/products?horizon=${horizon}&limit=${limit}`,
  );
}

/** GET /api/ai/forecast/peak-hours */
export function getPeakHours(): Promise<AiPeakHours> {
  return apiFetch<AiPeakHours>('/api/ai/forecast/peak-hours');
}

/** GET /api/ai/insights/anomalies */
export function getAnomalies(): Promise<AiAnomalies> {
  return apiFetch<AiAnomalies>('/api/ai/insights/anomalies');
}

/** POST /api/ai/train */
export function train(): Promise<unknown> {
  return apiFetch<unknown>('/api/ai/train', { method: 'POST' });
}
