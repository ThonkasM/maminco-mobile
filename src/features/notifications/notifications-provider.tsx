import * as Notifications from 'expo-notifications';
import { useRootNavigationState, useRouter, type Href } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { notificationsApi } from '@/lib/api';
import type { AppNotification } from '@/lib/api/notifications';
import { getErrorMessage } from '@/lib/format';
import { configureForegroundHandler, registerForPush } from '@/lib/notifications/push';
import { useAuth } from '@/providers/auth-provider';

import { parsePushData, resolveNotificationRoute } from './navigation';
import { markAllItemsRead, markItemRead } from './selectors';

interface NotificationsContextValue {
  items: AppNotification[];
  unread: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  open: (item: Pick<AppNotification, 'id' | 'url'>) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

configureForegroundHandler();

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const role = user?.role ?? null;
  const userId = user?.id ?? null;
  const authenticated = status === 'authenticated' && userId !== null;

  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (loadedRef.current) setRefreshing(true);
    else setLoading(true);
    try {
      const inbox = await notificationsApi.getMine();
      setItems(inbox.items);
      setUnread(inbox.unread);
      setError(null);
      loadedRef.current = true;
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) {
      loadedRef.current = false;
      setItems([]);
      setUnread(0);
      setError(null);
      return;
    }
    void refresh();
  }, [authenticated, userId, refresh]);

  useEffect(() => {
    if (!authenticated) return;
    void registerForPush();
  }, [authenticated, userId]);

  const itemsRef = useRef<AppNotification[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const markRead = useCallback(
    async (id: string) => {
      const target = itemsRef.current.find((item) => item.id === id);
      if (target?.readAt) return;
      if (!target) {
        try {
          await notificationsApi.markRead(id);
        } finally {
          await refresh();
        }
        return;
      }
      const readAt = new Date().toISOString();
      setItems((current) => markItemRead(current, id, readAt));
      setUnread((count) => Math.max(0, count - 1));
      try {
        await notificationsApi.markRead(id);
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    const readAt = new Date().toISOString();
    setItems((current) => markAllItemsRead(current, readAt));
    setUnread(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      await refresh();
    }
  }, [refresh]);

  const navigateTo = useCallback(
    (url: string | null | undefined) => {
      const route = resolveNotificationRoute(url, role);
      if (route) router.push(route as Href);
    },
    [role, router],
  );

  const open = useCallback(
    (item: Pick<AppNotification, 'id' | 'url'>) => {
      void markRead(item.id);
      navigateTo(item.url);
    },
    [markRead, navigateTo],
  );

  useEffect(() => {
    if (!authenticated) return;
    const received = Notifications.addNotificationReceivedListener(() => {
      void refresh();
    });
    return () => received.remove();
  }, [authenticated, refresh]);

  const handledResponseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authenticated || !navigationReady) return;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const requestId = response.notification.request.identifier;
      if (handledResponseRef.current === requestId) return;
      handledResponseRef.current = requestId;
      const payload = parsePushData(response.notification.request.content.data);
      if (payload.notificationId) void markRead(payload.notificationId);
      navigateTo(payload.url);
    };
    handle(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    return () => subscription.remove();
  }, [authenticated, navigationReady, markRead, navigateTo]);

  const value = useMemo<NotificationsContextValue>(
    () => ({ items, unread, loading, refreshing, error, refresh, markRead, markAllRead, open }),
    [items, unread, loading, refreshing, error, refresh, markRead, markAllRead, open],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de <NotificationsProvider>.');
  }
  return context;
}
