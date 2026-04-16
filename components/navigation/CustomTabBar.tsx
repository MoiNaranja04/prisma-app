import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../../src/context/CartContext";
import { useTheme } from "../../src/context/ThemeContext";

const ANIMATION_DURATION = 200;
const BAR_HORIZONTAL_PADDING = 12;
const ACTIVE_INDICATOR_INSET = 4;

const EMPLOYEE_ROUTES = ["index", "performance", "customers"];
const ADMIN_ROUTES = ["dashboard", "pos", "inventory", "customers"];

const ICON_BY_ROUTE: Record<
  string,
  React.ComponentProps<typeof Feather>["name"]
> = {
  dashboard: "home",
  index: "shopping-cart",
  pos: "shopping-cart",
  inventory: "package",
  customers: "users",
  settings: "settings",
  performance: "bar-chart-2",
};

type TabItemProps = {
  routeName: string;
  routeKey: string;
  isFocused: boolean;
  activeColor: string;
  inactiveColor: string;
  badgeBg: string;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

function TabItem({
  routeName,
  routeKey,
  isFocused,
  activeColor,
  inactiveColor,
  badgeBg,
  onPress,
  onLongPress,
  badgeCount,
  accessibilityLabel,
  testID,
}: TabItemProps & { badgeCount?: number }) {
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
          color={isFocused ? activeColor : inactiveColor}
        />
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={[styles.badgeContainer, { backgroundColor: badgeBg }]}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

type CustomTabBarProps = BottomTabBarProps & {
  role?: "admin" | "employee";
};

export function CustomTabBar({
  state,
  descriptors,
  navigation,
  role,
}: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const { cartItemCount } = useCart();
  const { isDark, colors } = useTheme();

  const allowedRoutes = role === "employee" ? EMPLOYEE_ROUTES : ADMIN_ROUTES;

  const visibleRoutes = useMemo(() => {
    const filtered = state.routes.filter((route) => {
      if (!allowedRoutes.includes(route.name)) return false;
      const options = descriptors[route.key]?.options;
      const href = (options as { href?: unknown } | undefined)?.href;
      if (href === null) return false;
      return true;
    });
    return filtered.sort(
      (a, b) =>
        allowedRoutes.indexOf(a.name) - allowedRoutes.indexOf(b.name),
    );
  }, [state.routes, descriptors, allowedRoutes]);

  const activeVisibleIndex = useMemo(
    () =>
      Math.max(
        0,
        visibleRoutes.findIndex(
          (route) => route.key === state.routes[state.index]?.key,
        ),
      ),
    [visibleRoutes, state.index, state.routes],
  );

  const tabWidth =
    barWidth > 0 && visibleRoutes.length > 0
      ? (barWidth - BAR_HORIZONTAL_PADDING * 2) / visibleRoutes.length
      : 0;

  const indicatorX = useSharedValue(BAR_HORIZONTAL_PADDING + ACTIVE_INDICATOR_INSET);

  useEffect(() => {
    if (!tabWidth || visibleRoutes.length === 0) return;
    const newX =
      BAR_HORIZONTAL_PADDING +
      activeVisibleIndex * tabWidth +
      ACTIVE_INDICATOR_INSET;
    indicatorX.value = withTiming(newX, { duration: ANIMATION_DURATION });
  }, [activeVisibleIndex, indicatorX, tabWidth, barWidth, visibleRoutes.length]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: Math.max(tabWidth - ACTIVE_INDICATOR_INSET * 2, 0),
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const activeColor = colors.emerald;
  const inactiveColor = colors.textMuted;
  const activeTabBg = isDark ? "rgba(148, 163, 184, 0.20)" : "#EDEFF2";
  const barBg = isDark ? "#1E293B" : "#FFFFFF";
  const barBorder = isDark ? "#334155" : "#E6E9EF";

  return (
    <View
      style={[
        styles.outerContainer,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View
        style={[
          styles.barContainer,
          {
            backgroundColor: barBg,
            borderColor: barBorder,
            shadowOpacity: isDark ? 0.18 : 0.08,
            elevation: isDark ? 5 : 3,
          },
        ]}
        onLayout={handleLayout}
      >
        <Animated.View
          style={[
            styles.activeIndicator,
            { backgroundColor: activeTabBg },
            indicatorStyle,
          ]}
        />
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route) => {
            const { options } = descriptors[route.key];
            const isFocused =
              state.index ===
              state.routes.findIndex((r) => r.key === route.key);

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
                activeColor={activeColor}
                inactiveColor={inactiveColor}
                badgeBg={activeColor}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                badgeCount={
                  route.name === "pos" || route.name === "index"
                    ? cartItemCount
                    : undefined
                }
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
    borderRadius: 20,
    borderWidth: 1,
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
    justifyContent: "flex-start",
    flex: 1,
    zIndex: 2,
  },
  activeIndicator: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: 14,
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
  badgeContainer: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
