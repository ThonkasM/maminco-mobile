import { apiFetch } from './client';

/** Response DTOs for the `/api/system/*` endpoints. */

export interface SystemMemory {
  rssMb: number;
  heapUsedMb: number;
}

export interface SystemServerStatus {
  status: string;
  startedAt: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
  memory: SystemMemory;
}

export interface SystemDatabaseStatus {
  reachable: boolean;
  latencyMs: number | null;
}

export interface SystemAiStatus {
  reachable: boolean;
  url: string;
}

export interface SystemPrintingStatus {
  reachable: boolean;
  detail: {
    printers: string[];
    defaultPrinter: string | null;
  };
}

export interface SystemRealtimeStatus {
  clients: number;
}

export interface SystemStatus {
  server: SystemServerStatus;
  database: SystemDatabaseStatus;
  ai: SystemAiStatus;
  printing: SystemPrintingStatus;
  realtime: SystemRealtimeStatus;
  timestamp: string;
}

export interface SystemLogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
}

export interface SystemLogsResponse {
  data: SystemLogEntry[];
}

export interface SystemConfig {
  environment: string;
  port: number;
  apiBasePath: string;
  corsOrigins: string[];
  aiServiceUrl: string;
  aiEnabled: boolean;
  startedAt: string;
}

/** GET /api/system/status */
export function getStatus(): Promise<SystemStatus> {
  return apiFetch<SystemStatus>('/api/system/status');
}

/** GET /api/system/logs?limit=&level= */
export function getLogs(limit = 50, level?: string): Promise<SystemLogsResponse> {
  const query = level ? `?limit=${limit}&level=${level}` : `?limit=${limit}`;
  return apiFetch<SystemLogsResponse>(`/api/system/logs${query}`);
}

/** GET /api/system/config */
export function getConfig(): Promise<SystemConfig> {
  return apiFetch<SystemConfig>('/api/system/config');
}
