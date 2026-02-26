import { Tabs } from "expo-router";
import React from "react";
import { CustomTabBar } from "../../components/navigation/CustomTabBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarOverlayHeight = 64 + Math.max(insets.bottom, 8);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: "#F7F9FB",
          paddingBottom: tabBarOverlayHeight,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: "Ventas",
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventario",
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Historial",
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Clientes",
        }}
      />

      <Tabs.Screen name="dashboard" options={{ href: null }} />
    </Tabs>
  );
}
