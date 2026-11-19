import { describe, expect, it } from 'vitest';

import {
  audienceForRole,
  inboxRouteForRole,
  parsePushData,
  resolveNotificationRoute,
} from '@/features/notifications/navigation';

describe('audienceForRole', () => {
  it('maps every role to its route group', () => {
    expect(audienceForRole('ADMINISTRATOR')).toBe('manager');
    expect(audienceForRole('MANAGER')).toBe('manager');
    expect(audienceForRole('CASHIER')).toBe('pos');
    expect(audienceForRole('WAITER')).toBe('pos');
    expect(audienceForRole('COOK')).toBe('kitchen');
    expect(audienceForRole(null)).toBeNull();
  });

  it('exposes one inbox per group', () => {
    expect(inboxRouteForRole('MANAGER')).toBe('/(manager)/notifications');
    expect(inboxRouteForRole('WAITER')).toBe('/(pos)/notifications');
    expect(inboxRouteForRole('COOK')).toBe('/(kitchen)/notifications');
  });
});

describe('resolveNotificationRoute', () => {
  it('translates the web tables path per role', () => {
    expect(resolveNotificationRoute('/pos/tables', 'WAITER')).toBe('/(pos)/tables');
    expect(resolveNotificationRoute('/pos/tables', 'MANAGER')).toBe('/(manager)/tables');
  });

  it('opens a POS order by table id', () => {
    expect(resolveNotificationRoute('/pos/orders/abc-123', 'CASHIER')).toBe(
      '/(pos)/orders/abc-123',
    );
  });

  it('ignores query, hash, trailing slash and absolute urls', () => {
    expect(resolveNotificationRoute('/pos/tables/?x=1#y', 'WAITER')).toBe('/(pos)/tables');
    expect(resolveNotificationRoute('https://app.maminco.lat/dashboard', 'ADMINISTRATOR')).toBe(
      '/(manager)',
    );
  });

  it('falls back to the inbox for missing, unknown or foreign routes', () => {
    expect(resolveNotificationRoute(null, 'WAITER')).toBe('/(pos)/notifications');
    expect(resolveNotificationRoute('/products', 'MANAGER')).toBe('/(manager)/notifications');
    expect(resolveNotificationRoute('/dashboard', 'WAITER')).toBe('/(pos)/notifications');
    expect(resolveNotificationRoute('/pos/orders/x', 'COOK')).toBe('/(kitchen)/notifications');
    expect(resolveNotificationRoute('/kitchen', 'COOK')).toBe('/(kitchen)/kitchen');
  });

  it('returns null without a role', () => {
    expect(resolveNotificationRoute('/pos/tables', null)).toBeNull();
  });
});

describe('parsePushData', () => {
  it('extracts url and notification id', () => {
    expect(parsePushData({ url: '/pos/tables', notificationId: 'n1' })).toEqual({
      url: '/pos/tables',
      notificationId: 'n1',
    });
  });

  it('tolerates malformed payloads', () => {
    expect(parsePushData(undefined)).toEqual({ url: null, notificationId: null });
    expect(parsePushData({ url: 5, notificationId: '' })).toEqual({
      url: null,
      notificationId: null,
    });
  });
});
