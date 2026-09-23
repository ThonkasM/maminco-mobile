import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator fontsLoaded={fontsLoaded} />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colors, isDark } = useTheme();
  const { status, user, isManager } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();
  const ready = fontsLoaded && status !== 'loading';

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    const root = segments[0];
    const atRoot = segments.length === 0;
    const onLogin = root === 'login';

    if (!user) {
      if (!onLogin) router.replace('/login');
      return;
    }

    if (onLogin) {
      router.replace(isManager ? '/(manager)' : '/(pos)/tables');
      return;
    }

    if (isManager) {
      if (root === '(pos)') router.replace('/(manager)');
    } else if (root === '(manager)' || atRoot) {
      router.replace('/(pos)/tables');
    }
  }, [ready, user, isManager, segments, router]);

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(pos)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
