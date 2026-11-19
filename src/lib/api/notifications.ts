import { apiFetch } from './client';

export type NotificationType = 'ANNOUNCEMENT' | 'PRICE_UPDATE' | 'MENU_UPDATE' | 'SYSTEM_ALERT';

export type PushChannelKind = 'WEB' | 'EXPO';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationsInbox {
  unread: number;
  items: AppNotification[];
}

export interface PushConfig {
  webPublicKey: string | null;
  channels: PushChannelKind[];
}

export interface SubscribePushInput {
  kind: PushChannelKind;
  endpoint: string;
}

/** GET /api/notifications/mine */
export function getMine(limit = 50): Promise<NotificationsInbox> {
  return apiFetch<NotificationsInbox>(`/api/notifications/mine?limit=${limit}`);
}

/** POST /api/notifications/:id/read */
export function markRead(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  });
}

/** POST /api/notifications/read-all */
export function markAllRead(): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>('/api/notifications/read-all', { method: 'POST' });
}

/** GET /api/notifications/push/config */
export function getPushConfig(): Promise<PushConfig> {
  return apiFetch<PushConfig>('/api/notifications/push/config');
}

/** POST /api/notifications/push/subscriptions */
export function subscribePush(input: SubscribePushInput): Promise<unknown> {
  return apiFetch<unknown>('/api/notifications/push/subscriptions', {
    method: 'POST',
    body: input,
  });
}

/** DELETE /api/notifications/push/subscriptions */
export function unsubscribePush(endpoint: string): Promise<unknown> {
  return apiFetch<unknown>('/api/notifications/push/subscriptions', {
    method: 'DELETE',
    body: { endpoint },
  });
}
