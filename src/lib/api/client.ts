import { Platform } from 'react-native';

const DEFAULT_BASE_URL =
  Platform.select({ android: 'http://10.0.2.2:3000', default: 'http://localhost:3000' }) ??
  'http://localhost:3000';

function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('EXPO_PUBLIC_API_URL is required in production builds.');
  }
  return DEFAULT_BASE_URL;
}

/** Backend base URL, without a trailing slash and without the `/api` suffix. */
export const API_BASE = resolveBaseUrl().replace(/\/+$/, '');

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Registered by `AuthProvider` so a 401 response can force a logout. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Attach the bearer token. Defaults to `true`. */
  auth?: boolean;
}

const RETRY_DELAYS_MS = [400, 1200, 2800];
const RETRYABLE_STATUS = new Set([502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * ms * 0.3);
}

function isAborted(signal: AbortSignal | null | undefined): boolean {
  return signal?.aborted === true;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const message = record.message;
    if (Array.isArray(message)) {
      return message.filter((item) => typeof item === 'string').join('\n') || fallback;
    }
    if (typeof message === 'string' && message) return message;
    if (typeof record.error === 'string' && record.error) return record.error;
  }
  return fallback;
}

/**
 * Thin `fetch` wrapper: prefixes `API_BASE`, injects JSON headers and the
 * bearer token, normalises errors into `ApiError` and logs out on 401.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...((headers as Record<string, string> | undefined) ?? {}),
  };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (auth && authToken) finalHeaders.Authorization = `Bearer ${authToken}`;

  const method = (rest.method ?? 'GET').toUpperCase();
  const maxRetries = method === 'GET' ? RETRY_DELAYS_MS.length : 0;
  const init: RequestInit = {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  let response: Response | undefined;
  for (let attempt = 0; ; attempt++) {
    try {
      response = await fetch(`${API_BASE}${path}`, init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= maxRetries) break;
    } catch (error) {
      if (attempt >= maxRetries || isAborted(rest.signal)) {
        throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0, error);
      }
    }
    await sleep(jitter(RETRY_DELAYS_MS[attempt]));
    if (isAborted(rest.signal)) {
      throw new ApiError('Solicitud cancelada.', 0);
    }
  }

  if (!response) throw new ApiError('No se pudo conectar con el servidor.', 0);

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError('Tu sesión expiró. Inicia sesión nuevamente.', 401, payload);
  }

  if (!response.ok) {
    throw new ApiError(
      extractMessage(payload, `Error ${response.status}`),
      response.status,
      payload,
    );
  }

  return payload as T;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 401);
}
