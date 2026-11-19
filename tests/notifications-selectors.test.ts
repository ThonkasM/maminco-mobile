import { describe, expect, it } from 'vitest';

import {
  countUnread,
  formatBadgeCount,
  formatRelativeTime,
  markAllItemsRead,
  markItemRead,
  notificationTypeLabel,
  notificationTypeTone,
} from '@/features/notifications/selectors';
import type { AppNotification } from '@/lib/api/notifications';

function item(id: string, readAt: string | null = null): AppNotification {
  return {
    id,
    type: 'ANNOUNCEMENT',
    title: 't',
    body: 'b',
    url: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    readAt,
  };
}

describe('unread selectors', () => {
  const items = [item('a'), item('b', '2026-01-02T00:00:00.000Z'), item('c')];

  it('counts unread items', () => {
    expect(countUnread(items)).toBe(2);
    expect(countUnread([])).toBe(0);
  });

  it('marks a single item read without touching the others', () => {
    const next = markItemRead(items, 'a', '2026-02-01T00:00:00.000Z');
    expect(next.find((n) => n.id === 'a')?.readAt).toBe('2026-02-01T00:00:00.000Z');
    expect(next.find((n) => n.id === 'b')?.readAt).toBe('2026-01-02T00:00:00.000Z');
    expect(countUnread(next)).toBe(1);
  });

  it('marks everything read', () => {
    expect(countUnread(markAllItemsRead(items, '2026-02-01T00:00:00.000Z'))).toBe(0);
  });

  it('formats the badge count', () => {
    expect(formatBadgeCount(0)).toBeUndefined();
    expect(formatBadgeCount(-1)).toBeUndefined();
    expect(formatBadgeCount(7)).toBe('7');
    expect(formatBadgeCount(120)).toBe('99+');
  });
});

describe('presentation helpers', () => {
  it('labels and tones notification types', () => {
    expect(notificationTypeLabel('PRICE_UPDATE')).toBe('Precios');
    expect(notificationTypeLabel('SYSTEM_ALERT')).toBe('Alerta');
    expect(notificationTypeTone('SYSTEM_ALERT')).toBe('danger');
    expect(notificationTypeTone('ANNOUNCEMENT')).toBe('primary');
  });

  it('formats relative time in Spanish', () => {
    const now = new Date('2026-03-10T12:00:00.000Z').getTime();
    const ago = (ms: number) => new Date(now - ms).toISOString();
    expect(formatRelativeTime(ago(10_000), now)).toBe('Ahora');
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe('Hace 5 min');
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe('Hace 3 h');
    expect(formatRelativeTime(ago(30 * 3_600_000), now)).toBe('Ayer');
    expect(formatRelativeTime(ago(3 * 86_400_000), now)).toBe('Hace 3 días');
    expect(formatRelativeTime('nope', now)).toBe('—');
  });
});
