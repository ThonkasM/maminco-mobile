import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { User } from '@/lib/api/types';

const TOKEN_KEY = 'maminco.auth.token';
const PROFILE_KEY = 'maminco.auth.profile';
const LEGACY_KEY = 'maminco.auth';

export interface StoredSession {
  token: string;
  user: User;
}

let secureAvailable: boolean | null = null;

async function isSecureAvailable(): Promise<boolean> {
  if (secureAvailable === null) {
    secureAvailable = await SecureStore.isAvailableAsync().catch(() => false);
  }
  return secureAvailable;
}

async function readToken(): Promise<string | null> {
  if (await isSecureAvailable()) return SecureStore.getItemAsync(TOKEN_KEY);
  return null;
}

async function writeToken(token: string): Promise<void> {
  if (await isSecureAvailable()) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function removeToken(): Promise<void> {
  if (await isSecureAvailable()) await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

function parseUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as User;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

async function migrateLegacySession(): Promise<StoredSession | null> {
  const raw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    const legacy = JSON.parse(raw) as Partial<StoredSession>;
    if (legacy?.token && legacy?.user?.id) {
      await saveSession({ token: legacy.token, user: legacy.user });
      await AsyncStorage.removeItem(LEGACY_KEY);
      return { token: legacy.token, user: legacy.user };
    }
  } catch {
    // malformed legacy entry: discard it below
  }
  await AsyncStorage.removeItem(LEGACY_KEY);
  return null;
}

export async function loadSession(): Promise<StoredSession | null> {
  const [token, profile] = await Promise.all([readToken(), AsyncStorage.getItem(PROFILE_KEY)]);
  const user = parseUser(profile);
  if (token && user) return { token, user };
  return migrateLegacySession();
}

export async function saveSession(session: StoredSession): Promise<void> {
  await writeToken(session.token);
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(session.user));
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    removeToken(),
    AsyncStorage.removeItem(PROFILE_KEY),
    AsyncStorage.removeItem(LEGACY_KEY),
  ]);
}
