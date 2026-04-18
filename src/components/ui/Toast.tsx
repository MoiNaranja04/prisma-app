import { Feather } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { C } from "../../constants/colors";

export type ToastType = "success" | "error" | "info";

interface Props {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
}

const ICON_MAP: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: "check-circle",
  error: "x-circle",
  info: "info",
};

const COLOR_MAP: Record<ToastType, string> = {
  success: C.emerald,
  error: C.danger,
  info: C.cyan,
};

const BG_MAP: Record<ToastType, string> = {
  success: "rgba(16,185,129,0.15)",
  error: "rgba(248,113,113,0.15)",
  info: "rgba(34,211,238,0.15)",
};

export function Toast({ message, type, visible, onHide }: Props) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onHide, 3000);
    return () => clearTimeout(timer);
  }, [visible, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.container,
        { backgroundColor: BG_MAP[type], borderColor: COLOR_MAP[type] },
      ]}
    >
      <Feather name={ICON_MAP[type]} size={18} color={COLOR_MAP[type]} />
      <Text style={[styles.text, { color: COLOR_MAP[type] }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
});
