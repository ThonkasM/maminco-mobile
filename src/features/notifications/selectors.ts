import type { AppNotification, NotificationType } from '@/lib/api/notifications';

export function countUnread(items: readonly AppNotification[]): number {
  return items.reduce((total, item) => (item.readAt ? total : total + 1), 0);
}

export function formatBadgeCount(unread: number): string | undefined {
  if (!Number.isFinite(unread) || unread <= 0) return undefined;
  return unread > 99 ? '99+' : String(Math.floor(unread));
}

export function markItemRead(
  items: readonly AppNotification[],
  id: string,
  readAt: string,
): AppNotification[] {
  return items.map((item) => (item.id === id && !item.readAt ? { ...item, readAt } : item));
}

export function markAllItemsRead(
  items: readonly AppNotification[],
  readAt: string,
): AppNotification[] {
  return items.map((item) => (item.readAt ? item : { ...item, readAt }));
}

export type NotificationTone = 'primary' | 'warning' | 'info' | 'danger';

export function notificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'ANNOUNCEMENT':
      return 'Aviso';
    case 'PRICE_UPDATE':
      return 'Precios';
    case 'MENU_UPDATE':
      return 'Menú';
    case 'SYSTEM_ALERT':
      return 'Alerta';
    default:
      return 'Aviso';
  }
}

export function notificationTypeTone(type: NotificationType): NotificationTone {
  switch (type) {
    case 'PRICE_UPDATE':
      return 'warning';
    case 'MENU_UPDATE':
      return 'info';
    case 'SYSTEM_ALERT':
      return 'danger';
    case 'ANNOUNCEMENT':
    default:
      return 'primary';
  }
}

export function formatRelativeTime(
  iso: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!iso) return '—';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '—';
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(time).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
}
