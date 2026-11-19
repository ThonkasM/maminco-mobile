import { Ionicons } from '@expo/vector-icons';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/offline-banner';
import { useTheme } from '@/hooks/use-theme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { FeedbackProvider } from '@/providers/feedback-provider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font, Anton_400Regular });

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <FeedbackProvider>
              <RootNavigator fontsLoaded={fontsLoaded} />
            </FeedbackProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colors, isDark } = useTheme();
  const { status, user, isManager } = useAuth();
  const isCook = user?.role === 'COOK';
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
      router.replace(
        isCook ? '/(kitchen)/kitchen' : isManager ? '/(manager)' : '/(pos)/tables',
      );
      return;
    }

    if (isCook) {
      if (root !== '(kitchen)') router.replace('/(kitchen)/kitchen');
      return;
    }

    if (isManager) {
      if (root === '(pos)' || root === '(kitchen)') router.replace('/(manager)');
    } else if (root === '(manager)' || root === '(kitchen)' || atRoot) {
      router.replace('/(pos)/tables');
    }
  }, [ready, user, isCook, isManager, segments, router]);

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(pos)" />
        <Stack.Screen name="(kitchen)" />
      </Stack>
    </ThemeProvider>
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
