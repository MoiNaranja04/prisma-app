import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_COLOR = "#0F5E3C";
const INACTIVE_COLOR = "#9CA3AF";
const ACTIVE_TAB_BG = "#EDEFF2";
const ANIMATION_DURATION = 200;
const BAR_HORIZONTAL_PADDING = 12;
const ACTIVE_INDICATOR_INSET = 4;

const ICON_BY_ROUTE: Record<string, React.ComponentProps<typeof Feather>["name"]> =
  {
    index: "home",
    pos: "shopping-cart",
    inventory: "package",
    sales: "clock",
    customers: "users",
  };

type TabItemProps = {
  routeName: string;
  routeKey: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

function TabItem({
  routeName,
  routeKey,
  isFocused,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}: TabItemProps) {
  const scale = useSharedValue(isFocused ? 1.05 : 1);

  useEffect(() => {
    scale.value = withTiming(isFocused ? 1.05 : 1, {
      duration: ANIMATION_DURATION,
    });
  }, [isFocused, scale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconName = ICON_BY_ROUTE[routeName] ?? "circle";

  return (
    <Pressable
      key={routeKey}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      hitSlop={8}
    >
      <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
        <Feather
          name={iconName}
          size={22}
          color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
      </Animated.View>
    </Pressable>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route) => {
        const options = descriptors[route.key]?.options;
        const href = (options as { href?: unknown } | undefined)?.href;
        if (href === null) return false;
        return route.name !== "dashboard";
      }),
    [descriptors, state.routes],
  );

  const activeVisibleIndex = useMemo(
    () =>
      Math.max(
        0,
        visibleRoutes.findIndex((route) => route.key === state.routes[state.index]?.key),
      ),
    [visibleRoutes, state.index, state.routes],
  );

  const tabWidth =
    barWidth > 0 && visibleRoutes.length > 0
      ? (barWidth - BAR_HORIZONTAL_PADDING * 2) / visibleRoutes.length
      : 0;

  const indicatorX = useSharedValue(BAR_HORIZONTAL_PADDING + ACTIVE_INDICATOR_INSET);

  useEffect(() => {
    if (!tabWidth) return;
    indicatorX.value = withTiming(
      BAR_HORIZONTAL_PADDING +
        ACTIVE_INDICATOR_INSET +
        activeVisibleIndex * tabWidth,
      { duration: ANIMATION_DURATION },
    );
  }, [activeVisibleIndex, indicatorX, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: Math.max(tabWidth - ACTIVE_INDICATOR_INSET * 2, 0),
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.outerContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.barContainer} onLayout={handleLayout}>
        <Animated.View style={[styles.activeIndicator, indicatorStyle]} />
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === state.routes.findIndex((r) => r.key === route.key);

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabItem
                key={route.key}
                routeName={route.name}
                routeKey={route.key}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    zIndex: 20,
  },
  barContainer: {
    height: 64,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: BAR_HORIZONTAL_PADDING,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    zIndex: 2,
  },
  activeIndicator: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: 14,
    backgroundColor: ACTIVE_TAB_BG,
    zIndex: 1,
  },
  tabButton: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
