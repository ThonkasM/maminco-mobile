import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, fontWeight, radii, spacing, palette } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BAR_PADDING = 6;
const TAB_GAP = 4;
const TAB_HEIGHT = 54;

/**
 * Floating pill tab bar used on Android and web (on iOS we render the native
 * tab bar so the system Liquid Glass treatment is applied). The active pill
 * slides between tabs with a spring animation.
 */
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const activeIndex = state.index;
  const tabCount = state.routes.length;
  const availableWidth = barWidth - BAR_PADDING * 2 - TAB_GAP * (tabCount - 1);
  const tabWidth = barWidth > 0 ? availableWidth / tabCount : 0;

  const pillTranslateX = useSharedValue(0);
  const pillOpacity = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      pillTranslateX.value = withSpring(activeIndex * (tabWidth + TAB_GAP), {
        damping: 24,
        stiffness: 280,
        mass: 0.8,
      });
      pillOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [activeIndex, tabWidth, pillTranslateX, pillOpacity]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillTranslateX.value }],
    width: tabWidth,
    opacity: pillOpacity.value,
  }));

  const handleBarLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.background,
          paddingLeft: spacing.lg + insets.left,
          paddingRight: spacing.lg + insets.right,
          paddingBottom: insets.bottom || spacing.sm,
        },
      ]}
    >
      <View
        onLayout={handleBarLayout}
        style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {tabWidth > 0 ? (
          <Animated.View style={[styles.pill, { backgroundColor: colors.accent }, pillStyle]} />
        ) : null}

        {state.routes.map((route, index) => {
          const isActive = index === activeIndex;
          const { options } = descriptors[route.key] ?? {};
          const label = typeof options?.title === 'string' ? options.title : route.name;
          const color = isActive ? colors.onAccent : colors.muted;
          const icon = options?.tabBarIcon?.({ focused: isActive, color, size: 22 });

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              onLongPress={() => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              }}
              android_ripple={{ color: 'transparent' }}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
              style={({ pressed }) => [
                styles.tabItem,
                { width: tabWidth, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {icon ?? <Ionicons name="ellipse-outline" size={22} color={color} />}
              {isActive ? (
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
                  <Text style={[styles.label, { color }]} numberOfLines={1}>
                    {label}
                  </Text>
                </Animated.View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TAB_GAP,
    width: '100%',
    maxWidth: 480,
    padding: BAR_PADDING,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    // `shadow*` is deprecated on web (react-native-web) in favour of `boxShadow`.
    ...Platform.select({
      web: { boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.18)' },
      default: {
        elevation: 8,
        shadowColor: palette.black,
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  pill: {
    position: 'absolute',
    top: BAR_PADDING,
    left: BAR_PADDING,
    bottom: BAR_PADDING,
    borderRadius: radii.xl - BAR_PADDING,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_HEIGHT,
    gap: spacing.xs / 2,
    borderRadius: radii.xl - BAR_PADDING,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
