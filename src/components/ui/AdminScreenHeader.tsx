import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface AdminScreenHeaderProps {
  title: string;
  roleLabel?: string;
  subtitle?: string;
}

export default function AdminScreenHeader({
  title,
  subtitle,
}: AdminScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "500",
  },
});
