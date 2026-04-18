import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/src/lib/supabase";

type HomeRoute = "/dashboard" | "/login" | "/pos";

export default function IndexScreen() {
  const { colors } = useTheme();
  const [target, setTarget] = useState<HomeRoute | null>(null);

  useEffect(() => {
    let active = true;

    const resolveHomeRoute = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session?.user) {
        setTarget("/login");
        return;
      }

      const { data: relation } = await supabase
        .from("company_users")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active) return;

      setTarget(relation?.role === "employee" ? "/pos" : "/dashboard");
    };

    void resolveHomeRoute();

    return () => {
      active = false;
    };
  }, []);

  if (!target) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.emerald} />
      </View>
    );
  }

  return <Redirect href={target} />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
