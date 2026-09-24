import { apiFetch } from './client';

/** Known feature-flag keys (kept in sync with the backend seed). */
export const FEATURE_KEYS = {
  waiterCanRemoveProducts: 'waiter_can_remove_products',
} as const;

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
}

/** GET /api/features/evaluate → `{ [key]: enabled }` */
export function evaluateFeatures(): Promise<Record<string, boolean>> {
  return apiFetch<Record<string, boolean>>('/api/features/evaluate');
}
