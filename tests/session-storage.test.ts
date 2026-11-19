import { beforeEach, describe, expect, it, vi } from 'vitest';

const secure = new Map<string, string>();
const plain = new Map<string, string>();
let secureAvailable = true;

vi.mock('expo-secure-store', () => ({
  isAvailableAsync: async () => secureAvailable,
  getItemAsync: async (key: string) => secure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => void secure.set(key, value),
  deleteItemAsync: async (key: string) => void secure.delete(key),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => plain.get(key) ?? null,
    setItem: async (key: string, value: string) => void plain.set(key, value),
    removeItem: async (key: string) => void plain.delete(key),
  },
}));

const user = {
  id: 'u1',
  email: 'a@b.c',
  name: 'Ana',
  role: 'WAITER' as const,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  secure.clear();
  plain.clear();
  secureAvailable = true;
  vi.resetModules();
});

describe('session storage', () => {
  it('stores the token in secure store and the profile in async storage', async () => {
    const { saveSession, loadSession } = await import('@/lib/storage/session-storage');
    await saveSession({ token: 'tok', user });
    expect(secure.get('maminco.auth.token')).toBe('tok');
    expect(plain.has('maminco.auth.token')).toBe(false);
    expect(await loadSession()).toEqual({ token: 'tok', user });
  });

  it('never persists the token in async storage when secure store is unavailable', async () => {
    secureAvailable = false;
    const { saveSession, loadSession } = await import('@/lib/storage/session-storage');
    await saveSession({ token: 'tok', user });
    expect(secure.size).toBe(0);
    expect(plain.has('maminco.auth.token')).toBe(false);
    expect(await loadSession()).toBeNull();
  });

  it('returns null when nothing is stored', async () => {
    const { loadSession } = await import('@/lib/storage/session-storage');
    expect(await loadSession()).toBeNull();
  });

  it('migrates a legacy session and removes the legacy key', async () => {
    plain.set('maminco.auth', JSON.stringify({ token: 'old', user }));
    const { loadSession } = await import('@/lib/storage/session-storage');
    expect(await loadSession()).toEqual({ token: 'old', user });
    expect(plain.has('maminco.auth')).toBe(false);
    expect(secure.get('maminco.auth.token')).toBe('old');
  });

  it('discards a malformed legacy entry', async () => {
    plain.set('maminco.auth', '{bad');
    const { loadSession } = await import('@/lib/storage/session-storage');
    expect(await loadSession()).toBeNull();
    expect(plain.has('maminco.auth')).toBe(false);
  });

  it('clears everything', async () => {
    const { saveSession, clearSession, loadSession } = await import(
      '@/lib/storage/session-storage'
    );
    await saveSession({ token: 'tok', user });
    await clearSession();
    expect(secure.size).toBe(0);
    expect(plain.size).toBe(0);
    expect(await loadSession()).toBeNull();
  });
});
