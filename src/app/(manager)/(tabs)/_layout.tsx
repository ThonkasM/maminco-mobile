import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import FloatingTabBar from '@/components/floating-tab-bar';
import { useTheme } from '@/hooks/use-theme';

type IoniconName = keyof typeof Ionicons.glyphMap;
type SfIcon = SFSymbol | { default?: SFSymbol; selected: SFSymbol };

const TABS: { name: string; title: string; icon: IoniconName; sf: SfIcon }[] = [
  {
    name: 'index',
    title: 'Panel',
    icon: 'grid-outline',
    sf: { default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' },
  },
  {
    name: 'tables',
    title: 'Mesas',
    icon: 'restaurant-outline',
    sf: { default: 'tablecells', selected: 'tablecells.fill' },
  },
  {
    name: 'profile',
    title: 'Perfil',
    icon: 'person-outline',
    sf: { default: 'person', selected: 'person.fill' },
  },
];

export default function ManagerTabsLayout() {
  const { colors } = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <NativeTabs tintColor={colors.primary}>
        {TABS.map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name}>
            <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={tab.sf} />
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
