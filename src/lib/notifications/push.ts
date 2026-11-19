import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { notificationsApi } from '@/lib/api';

const CHANNEL_ID = 'default';
const BRAND_COLOR = '#0a5c33';

let registeredToken: string | null = null;

export function configureForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return (
    extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    undefined
  );
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Notificaciones',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: BRAND_COLOR,
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Asks for permission, obtains the Expo push token and registers it with the
 * backend. Returns the token, or `null` when push is unavailable (simulator,
 * denied permission, missing EAS project id or a failed request).
 */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  try {
    await ensureAndroidChannel();
    if (!(await ensurePermission())) return null;
    const projectId = resolveProjectId();
    if (!projectId) return null;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificationsApi.subscribePush({ kind: 'EXPO', endpoint: token });
    registeredToken = token;
    return token;
  } catch {
    return null;
  }
}

/** Removes this device's token from the backend. Needs the auth token still set. */
export async function unregisterFromPush(): Promise<void> {
  const token = registeredToken;
  if (!token) return;
  registeredToken = null;
  try {
    await notificationsApi.unsubscribePush(token);
  } catch {
    // The token is also pruned server-side when Expo reports it as gone.
  }
}
