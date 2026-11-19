import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setAuthToken } from '@/lib/api/client';
import { notificationsApi } from '@/lib/api';

let fetchMock: ReturnType<typeof vi.fn>;

function ok(body: unknown) {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(body), { status: 200 }));
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setAuthToken('t');
});

describe('notifications api', () => {
  it('lists the inbox with the bearer token and a limit', async () => {
    ok({ unread: 1, items: [] });
    const inbox = await notificationsApi.getMine(20);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/notifications/mine?limit=20');
    expect(init.headers.Authorization).toBe('Bearer t');
    expect(inbox.unread).toBe(1);
  });

  it('marks one and all notifications as read with POST', async () => {
    ok({ ok: true });
    await notificationsApi.markRead('n/1');
    await notificationsApi.markAllRead();
    const calls = fetchMock.mock.calls.map(([url, init]) => [init.method, url]);
    expect(calls).toEqual([
      ['POST', 'http://localhost:3000/api/notifications/n%2F1/read'],
      ['POST', 'http://localhost:3000/api/notifications/read-all'],
    ]);
  });

  it('reads the push config', async () => {
    ok({ webPublicKey: null, channels: ['EXPO'] });
    const config = await notificationsApi.getPushConfig();
    expect(fetchMock.mock.calls[0][0]).toContain('/api/notifications/push/config');
    expect(config.channels).toEqual(['EXPO']);
  });

  it('registers and removes an Expo token', async () => {
    ok({ ok: true });
    await notificationsApi.subscribePush({ kind: 'EXPO', endpoint: 'ExponentPushToken[abc]' });
    await notificationsApi.unsubscribePush('ExponentPushToken[abc]');
    const [subscribe, unsubscribe] = fetchMock.mock.calls;
    expect(subscribe[1].method).toBe('POST');
    expect(subscribe[0]).toContain('/api/notifications/push/subscriptions');
    expect(JSON.parse(subscribe[1].body)).toEqual({
      kind: 'EXPO',
      endpoint: 'ExponentPushToken[abc]',
    });
    expect(unsubscribe[1].method).toBe('DELETE');
    expect(JSON.parse(unsubscribe[1].body)).toEqual({ endpoint: 'ExponentPushToken[abc]' });
  });
});
