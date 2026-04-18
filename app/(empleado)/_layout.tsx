import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTheme } from "@/src/context/ThemeContext";
import { useCompany } from "@/src/hooks/useCompany";

export default function EmployeeLayout() {
  const { role, loading } = useCompany();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.emerald} />
      </View>
    );
  }

  if (role !== "employee") {
    return <Redirect href="/dashboard" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
