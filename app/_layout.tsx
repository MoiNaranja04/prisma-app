import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import type { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ToastProvider } from "../src/context/ToastContext";
import { supabase } from "../src/services/supabase";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔹 Cargar sesión inicial
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🔹 Redirección automática
  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0];
    const inAuthGroup =
      currentRoute === "login" ||
      currentRoute === "register" ||
      currentRoute === "join";

    if (!session && !inAuthGroup) {
      router.replace("/login");
    }

    if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, segments, isLoading, router]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="join" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" />
        </Stack>
        <StatusBar style="auto" />
      </ToastProvider>
    </ThemeProvider>
  );
}
