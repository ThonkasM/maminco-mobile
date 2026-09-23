import { apiFetch } from './client';
import type { ForecastPoint, SalesForecast } from './types';

/**
 * GET /api/ai/forecast/sales?horizon=7
 *
 * The AI proxy may not be deployed yet, so callers must treat 404 as "sin datos"
 * (see `isNotFound`). The response shape is intentionally loose and normalised.
 */
export function getSalesForecast(horizon = 7): Promise<SalesForecast> {
  return apiFetch<SalesForecast>(`/api/ai/forecast/sales?horizon=${horizon}`);
}

/** Normalises the many possible forecast payload shapes into a point list. */
export function normalizeForecastPoints(response: SalesForecast | null): ForecastPoint[] {
  if (!response) return [];
  const candidates = response.points ?? response.data ?? response.forecast ?? [];
  if (!Array.isArray(candidates)) return [];
  return candidates.filter((point): point is ForecastPoint => !!point && typeof point === 'object');
}

export function forecastPointValue(point: ForecastPoint): number {
  const raw = point.value ?? point.predicted ?? point.predictedSales ?? 0;
  const parsed = typeof raw === 'string' ? Number(raw) : raw;
  return Number.isFinite(parsed) ? (parsed as number) : 0;
}

export function forecastPointLabel(point: ForecastPoint, index: number): string {
  if (point.label) return point.label;
  if (point.date) {
    const date = new Date(point.date);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
    }
  }
  return `Día ${index + 1}`;
}
