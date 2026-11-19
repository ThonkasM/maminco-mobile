import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  apiFetch,
  isForbidden,
  isNotFound,
  setAuthToken,
  setUnauthorizedHandler,
} from '@/lib/api/client';

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), { status });
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('expected rejection');
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setAuthToken(null);
  setUnauthorizedHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('apiFetch', () => {
  it('prefixes the base URL and sends JSON headers', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const result = await apiFetch<{ ok: boolean }>('/api/ping');
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/ping');
    expect(init.headers.Accept).toBe('application/json');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('adds the bearer token when set and auth is not disabled', async () => {
    setAuthToken('tok');
    fetchMock.mockImplementation(async () => jsonResponse(200, {}));
    await apiFetch('/api/a');
    await apiFetch('/api/b', { auth: false });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it('serialises bodies as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: '1' }));
    await apiFetch('/api/x', { method: 'POST', body: { a: 1 } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe('{"a":1}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('returns null for empty bodies', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200));
    expect(await apiFetch('/api/empty')).toBeNull();
  });

  it('throws ApiError with the backend message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { message: ['a', 'b'] }));
    const error = await rejection(apiFetch('/api/bad', { method: 'POST' }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe('a\nb');
  });

  it('falls back to a generic message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, 'oops'));
    const error = await rejection(apiFetch('/api/c', { method: 'POST' }));
    expect(error.message).toBe('Error 409');
  });

  it('calls the unauthorized handler on 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'x' }));
    const error = await rejection(apiFetch('/api/secure'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(error.status).toBe(401);
  });

  it('wraps network failures without retrying non-GET requests', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'));
    const error = await rejection(apiFetch('/api/post', { method: 'POST' }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries GET on 503 and then succeeds', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200, { ok: 1 }));
    const promise = apiFetch('/api/retry');
    await vi.runAllTimersAsync();
    expect(await promise).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('error predicates', () => {
  it('detects 404 and forbidden errors', () => {
    expect(isNotFound(new ApiError('x', 404))).toBe(true);
    expect(isNotFound(new Error('x'))).toBe(false);
    expect(isForbidden(new ApiError('x', 403))).toBe(true);
    expect(isForbidden(new ApiError('x', 401))).toBe(true);
    expect(isForbidden(new ApiError('x', 500))).toBe(false);
  });
});
