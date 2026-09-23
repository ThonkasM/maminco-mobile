import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useOrientationLock } from '@/hooks/use-orientation-lock';
import { useAuth } from '@/providers/auth-provider';

export default function PosLayout() {
  const { status, user, isManager } = useAuth();

  // Waiters may work with the device in landscape.
  useOrientationLock(null);

  if (status === 'loading') return null;
  if (!user) return <Redirect href="/login" />;
  if (isManager) return <Redirect href="/(manager)" />;

  // Order/payment screens are pushed above the tabs, so the tab bar is hidden
  // while a table's detail is open.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="orders/[tableId]" />
      <Stack.Screen name="payments/[tableId]" />
    </Stack>
  );
}
