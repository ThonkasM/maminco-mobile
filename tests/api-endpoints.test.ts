import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setAuthToken } from '@/lib/api/client';
import { aiApi, authApi, featuresApi, ordersApi } from '@/lib/api';
import { FEATURE_KEYS } from '@/lib/api/features';

let fetchMock: ReturnType<typeof vi.fn>;

function ok(body: unknown) {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(body), { status: 200 }));
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setAuthToken('t');
});

describe('auth api', () => {
  it('posts credentials without the bearer token', async () => {
    ok({ accessToken: 'a', user: { id: '1' } });
    await authApi.login({ email: 'a@b.c', password: 'secret' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.c', password: 'secret' });
  });
});

describe('orders api', () => {
  it('builds list queries with defaults and filters', async () => {
    ok({ data: [] });
    await ordersApi.getOrders({ status: 'DRAFT', onlyOpen: false, tableId: 't1' });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/api/orders');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('status')).toBe('DRAFT');
    expect(url.searchParams.get('onlyOpen')).toBe('false');
    expect(url.searchParams.get('tableId')).toBe('t1');
  });

  it('returns null when a table has no active order', async () => {
    ok(null);
    expect(await ordersApi.getActiveOrderByTable('t1')).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toContain('/api/orders/table/t1/active');
  });

  it('uses the right verbs for item operations', async () => {
    ok({});
    await ordersApi.addOrderItem('o1', { productId: 'p', quantity: 2 });
    await ordersApi.updateOrderItem('o1', 'i1', { quantity: 3 });
    await ordersApi.removeOrderItem('o1', 'i1');
    await ordersApi.changeOrderStatus('o1', { status: 'CLOSED' });
    const calls = fetchMock.mock.calls.map(([url, init]) => [init.method, url]);
    expect(calls).toEqual([
      ['POST', 'http://localhost:3000/api/orders/o1/items'],
      ['PATCH', 'http://localhost:3000/api/orders/o1/items/i1'],
      ['DELETE', 'http://localhost:3000/api/orders/o1/items/i1'],
      ['PATCH', 'http://localhost:3000/api/orders/o1/status'],
    ]);
  });
});

describe('features api', () => {
  it('exposes the contract flag keys', () => {
    expect(FEATURE_KEYS.waiterCanRemoveProducts).toBe('waiter_can_remove_products');
    expect(FEATURE_KEYS.digitalKitchen).toBe('digital_kitchen');
  });

  it('evaluates flags and lets callers default a missing waiter flag to true', async () => {
    ok({ digital_kitchen: true });
    const flags = await featuresApi.evaluateFeatures();
    expect(flags.waiter_can_remove_products ?? true).toBe(true);
    ok({ waiter_can_remove_products: false });
    const off = await featuresApi.evaluateFeatures();
    expect(off.waiter_can_remove_products ?? true).toBe(false);
  });
});

describe('ai forecast', () => {
  it('requests the sales forecast with a horizon', async () => {
    ok({ forecast: [] });
    await aiApi.getSalesForecast(14);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/ai/forecast/sales?horizon=14');
  });
});
