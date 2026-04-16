import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomTabBar } from "../../components/navigation/CustomTabBar";
import { useTheme } from "../../src/context/ThemeContext";
import { useCompany } from "../../src/hooks/useCompany";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { role } = useCompany();
  const { colors } = useTheme();
  const isEmployee = role === "employee";
  const tabBarOverlayHeight = 64 + Math.max(insets.bottom, 8);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} role={role} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.bg,
          paddingBottom: tabBarOverlayHeight,
        },
      }}
    >
      {/* Employee: POS - Admin: Dashboard (handled in index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "POS",
          href: isEmployee ? undefined : null,
        }}
      />

      {/* Admin: Dashboard (visible) */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Inicio",
          href: isEmployee ? null : undefined,
        }}
      />

      {/* Employee Tab 2: Mi rendimiento (hidden for admin) */}
      <Tabs.Screen
        name="performance"
        options={{
          title: "Mi rendimiento",
          href: isEmployee ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          title: "Clientes",
        }}
      />

      {/* Admin only tabs */}
      <Tabs.Screen
        name="pos"
        options={{
          title: "Ventas",
          href: isEmployee ? null : undefined,
        }}
      />

      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventario",
          href: isEmployee ? null : undefined,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Configuración",
          href: null,
        }}
      />

      {/* Hidden tabs (both roles) */}
      <Tabs.Screen name="sales" options={{ href: null }} />
    </Tabs>
  );
}
