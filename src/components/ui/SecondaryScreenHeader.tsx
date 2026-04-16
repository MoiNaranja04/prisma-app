import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

interface SecondaryScreenHeaderProps {
  title: string;
}

export function SecondaryScreenHeader({ title }: SecondaryScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark ? ["#064E3B", "#0F766E"] : ["#166534", "#15803D"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {/* Spacer to center title */}
        <View style={styles.spacer} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginLeft: 14,
  },
  spacer: {
    width: 36,
  },
});
