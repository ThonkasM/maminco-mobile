import { Redirect, Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React from 'react';

import { useOrientationLock } from '@/hooks/use-orientation-lock';
import { useAuth } from '@/providers/auth-provider';

export default function ManagerLayout() {
  const { status, user, isManager } = useAuth();

  // The manager experience stays in portrait.
  useOrientationLock(ScreenOrientation.OrientationLock.PORTRAIT_UP);

  if (status === 'loading') return null;
  if (!user) return <Redirect href="/login" />;
  if (!isManager) return <Redirect href="/(pos)/tables" />;

  // The analysis screens (metrics/forecast/ai/settings) are pushed above the
  // tabs, so the tab bar is not visible while they are open.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="metrics" />
      <Stack.Screen name="forecast" />
      <Stack.Screen name="ai" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
