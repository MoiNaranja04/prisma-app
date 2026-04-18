import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

const VISIBLE_ADMIN_ROUTES = new Set([
  "dashboard",
  "inventory",
  "sales",
  "customers",
  "performance",
  "settings",
]);

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const visibleRoutes = state.routes.filter((route) =>
    VISIBLE_ADMIN_ROUTES.has(route.name),
  );

  const colors = {
    bg: isDark ? "#121212" : "#ffffff",
    border: isDark ? "#2a2a2a" : "#e5e7eb",
    active: isDark ? "#4ade80" : "#10b981",
    inactive: isDark ? "#888888" : "#64748b",
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingBottom: Platform.OS === "ios" ? insets.bottom : 10,
        },
      ]}
    >
      {visibleRoutes.map((route) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.routes[state.index]?.key === route.key;

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

        let iconName: keyof typeof Ionicons.glyphMap = "home";
        if (route.name === "dashboard") iconName = "stats-chart";
        if (route.name === "inventory") iconName = "cube";
        if (route.name === "sales") iconName = "receipt";
        if (route.name === "customers") iconName = "people";
        if (route.name === "performance") iconName = "trending-up";
        if (route.name === "settings") iconName = "settings";

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={isFocused ? colors.active : colors.inactive}
            />
            <Text
              style={[
                styles.label,
                { color: isFocused ? colors.active : colors.inactive },
              ]}
            >
              {label as string}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600",
  },
});
