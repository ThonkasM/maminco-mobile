import type { UserRole } from '@/lib/api/types';

export type NotificationAudience = 'manager' | 'pos' | 'kitchen';

export const INBOX_ROUTES: Record<NotificationAudience, string> = {
  manager: '/(manager)/notifications',
  pos: '/(pos)/notifications',
  kitchen: '/(kitchen)/notifications',
};

const STATIC_ROUTES: Record<NotificationAudience, Record<string, string>> = {
  manager: {
    '/dashboard': '/(manager)',
    '/tables': '/(manager)/tables',
    '/pos/tables': '/(manager)/tables',
    '/communication/notifications': INBOX_ROUTES.manager,
    '/notifications': INBOX_ROUTES.manager,
    '/(manager)': '/(manager)',
    '/(manager)/tables': '/(manager)/tables',
    '/(manager)/profile': '/(manager)/profile',
    '/(manager)/notifications': INBOX_ROUTES.manager,
    '/(manager)/metrics': '/(manager)/metrics',
    '/(manager)/forecast': '/(manager)/forecast',
  },
  pos: {
    '/pos/tables': '/(pos)/tables',
    '/tables': '/(pos)/tables',
    '/communication/notifications': INBOX_ROUTES.pos,
    '/notifications': INBOX_ROUTES.pos,
    '/(pos)/tables': '/(pos)/tables',
    '/(pos)/profile': '/(pos)/profile',
    '/(pos)/notifications': INBOX_ROUTES.pos,
  },
  kitchen: {
    '/kitchen': '/(kitchen)/kitchen',
    '/(kitchen)/kitchen': '/(kitchen)/kitchen',
    '/communication/notifications': INBOX_ROUTES.kitchen,
    '/notifications': INBOX_ROUTES.kitchen,
    '/(kitchen)/notifications': INBOX_ROUTES.kitchen,
  },
};

const POS_ORDER_PATTERN = /^\/(?:pos|\(pos\))\/orders\/([A-Za-z0-9-]+)$/;

export function audienceForRole(role: UserRole | null | undefined): NotificationAudience | null {
  switch (role) {
    case 'ADMINISTRATOR':
    case 'MANAGER':
      return 'manager';
    case 'CASHIER':
    case 'WAITER':
      return 'pos';
    case 'COOK':
      return 'kitchen';
    default:
      return null;
  }
}

export function inboxRouteForRole(role: UserRole | null | undefined): string | null {
  const audience = audienceForRole(role);
  return audience ? INBOX_ROUTES[audience] : null;
}

function normalizePath(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  let path = trimmed;
  const schemeMatch = /^[a-z][a-z0-9+.-]*:\/\/[^/]*(\/.*)?$/i.exec(trimmed);
  if (schemeMatch) path = schemeMatch[1] ?? '/';
  const cut = path.search(/[?#]/);
  if (cut >= 0) path = path.slice(0, cut);
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path;
}

/**
 * Maps a notification `url` (web or app path) to an existing route for the
 * role. Unknown paths fall back to the role's inbox; roles without an app
 * experience resolve to `null`.
 */
export function resolveNotificationRoute(
  url: string | null | undefined,
  role: UserRole | null | undefined,
): string | null {
  const audience = audienceForRole(role);
  if (!audience) return null;
  const inbox = INBOX_ROUTES[audience];
  if (!url) return inbox;
  const path = normalizePath(url);
  if (!path) return inbox;

  const direct = STATIC_ROUTES[audience][path];
  if (direct) return direct;

  if (audience === 'pos') {
    const match = POS_ORDER_PATTERN.exec(path);
    if (match) return `/(pos)/orders/${match[1]}`;
  }
  return inbox;
}

export interface PushPayload {
  url: string | null;
  notificationId: string | null;
}

export function parsePushData(data: unknown): PushPayload {
  if (!data || typeof data !== 'object') return { url: null, notificationId: null };
  const record = data as Record<string, unknown>;
  return {
    url: typeof record.url === 'string' && record.url ? record.url : null,
    notificationId:
      typeof record.notificationId === 'string' && record.notificationId
        ? record.notificationId
        : null,
  };
}
