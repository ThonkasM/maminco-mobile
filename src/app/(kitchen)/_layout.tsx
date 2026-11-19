import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useOrientationLock } from '@/hooks/use-orientation-lock';
import { useAuth } from '@/providers/auth-provider';

export default function KitchenLayout() {
  const { status, user } = useAuth();

  // The kitchen screen reads as a dashboard; keep it in landscape.
  useOrientationLock(null);

  if (status === 'loading') return null;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'COOK' && user.role !== 'MANAGER' && user.role !== 'ADMINISTRATOR') {
    return <Redirect href="/(pos)/tables" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="kitchen" />
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
