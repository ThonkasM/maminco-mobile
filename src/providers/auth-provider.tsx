import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi, setAuthToken, setUnauthorizedHandler, MANAGER_ROLES } from '@/lib/api';
import { disconnectOrdersSocket } from '@/lib/realtime/socket';
import type { User, UserRole } from '@/lib/api/types';

const STORAGE_KEY = 'maminco.auth';

export interface Session {
  token: string;
  user: User;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  isManager: boolean;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isManagerRole(role: UserRole | undefined | null): boolean {
  return role != null && MANAGER_ROLES.includes(role);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const signOut = useCallback(async () => {
    setAuthToken(null);
    disconnectOrdersSocket();
    setSession(null);
    setStatus('unauthenticated');
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }, []);

  // A 401 from any request forces a logout.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Restore the persisted session on boot.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Session;
          if (parsed?.token && parsed?.user?.id) {
            setAuthToken(parsed.token);
            if (active) {
              setSession(parsed);
              setStatus('authenticated');
              return;
            }
          }
        }
      } catch {
        // Ignore malformed cache and fall through to unauthenticated.
      }
      if (active) setStatus('unauthenticated');
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const next: Session = { token: response.accessToken, user: response.user };
    setAuthToken(next.token);
    setSession(next);
    setStatus('authenticated');
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      role: session?.user.role ?? null,
      isManager: isManagerRole(session?.user.role),
      signIn,
      signOut,
    }),
    [session, status, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return context;
}
