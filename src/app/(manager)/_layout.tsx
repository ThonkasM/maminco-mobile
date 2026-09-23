import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function ManagerLayout() {
  const { colors } = useTheme();
  const { status, user, isManager } = useAuth();

  if (status === 'loading') return null;
  if (!user) return <Redirect href="/login" />;
  if (!isManager) return <Redirect href="/(pos)/tables" />;

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
        name="index"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: 'Métricas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: 'Pronóstico',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tables"
        options={{
          title: 'Mesas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
