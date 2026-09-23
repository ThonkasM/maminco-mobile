/**
 * Shared props for the platform-split chart components.
 *
 * The `.tsx` (web) and `.native.tsx` variants must expose the exact same
 * surface so screens can import them without platform branches.
 */

export type SalesForecastPoint = {
  label: string;
  model: number;
  baseline: number;
};

export interface SalesForecastChartProps {
  data: SalesForecastPoint[];
  height?: number;
  modelColor?: string;
  baselineColor?: string;
}

export type PeakHourPoint = {
  label: string;
  value: number;
};

export interface PeakHoursChartProps {
  data: PeakHourPoint[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
}
