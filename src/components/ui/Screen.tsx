import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  refreshing,
  onRefresh,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const { colors } = useTheme();

  const inner = padded ? [styles.padded, contentContainerStyle] : contentContainerStyle;

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safe, { backgroundColor: colors.background }, style]}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, inner]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padded: {
    padding: spacing.lg,
  },
});
