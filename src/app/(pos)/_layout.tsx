import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function PosLayout() {
  const { colors } = useTheme();
  const { status, user, isManager } = useAuth();

  if (status === 'loading') return null;
  if (!user) return <Redirect href="/login" />;
  if (isManager) return <Redirect href="/(manager)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="tables"
        options={{
          title: 'Mesas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="orders/[tableId]" options={{ href: null }} />
      <Tabs.Screen name="payments/[tableId]" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
