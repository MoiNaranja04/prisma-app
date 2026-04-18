import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomTabBar } from "@/src/components/navigation/CustomTabBar";
import { useTheme } from "@/src/context/ThemeContext";
import { useCompany } from "@/src/hooks/useCompany";

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { role, loading } = useCompany();
  const { colors } = useTheme();
  const tabBarOverlayHeight = 64 + Math.max(insets.bottom, 8);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.emerald} />
      </View>
    );
  }

  if (role !== "admin") {
    return <Redirect href="/pos" />;
  }

  return (
    <Tabs
      initialRouteName="dashboard"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.bg,
          paddingBottom: tabBarOverlayHeight,
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Inicio" }} />
      <Tabs.Screen name="inventory" options={{ title: "Inventario" }} />
      <Tabs.Screen name="sales" options={{ title: "Ventas" }} />
      <Tabs.Screen name="customers" options={{ title: "Clientes" }} />
      <Tabs.Screen name="performance" options={{ title: "Metricas" }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes" }} />
      <Tabs.Screen name="company" options={{ href: null }} />
      <Tabs.Screen name="employees" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
