import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import type { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { CartProvider } from "@/src/context/CartContext";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { ToastProvider } from "@/src/context/ToastContext";
import { supabase } from "@/src/lib/supabase";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (active) {
        setSession(data.session);
        setIsLoading(false);
      }
    };

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (active) {
          setSession(nextSession);
        }
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const rootSegment = segments[0];
    const inAuthGroup = rootSegment === "(auth)";
    const inProtectedArea =
      rootSegment === "(admin)" ||
      rootSegment === "(empleado)" ||
      rootSegment === "security" ||
      rootSegment === "modal";

    if (!session && inProtectedArea) {
      router.replace("/login");
      return;
    }

    if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [isLoading, router, segments, session]);

  return (
    <NavThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <ThemeProvider>
        <ToastProvider>
          <CartProvider>
            {isLoading ? (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color="#0F5E3C" />
              </View>
            ) : (
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(admin)" />
                <Stack.Screen name="(empleado)" />
                <Stack.Screen name="security" />
                <Stack.Screen name="modal" options={{ presentation: "modal" }} />
              </Stack>
            )}
            <StatusBar style="auto" />
          </CartProvider>
        </ToastProvider>
      </ThemeProvider>
    </NavThemeProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
});
