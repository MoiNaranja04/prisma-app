import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import type { FinancialSummary } from "../../services/transactions";

type DateFilterKey = "today" | "week" | "month" | "all";

const DATE_FILTER_OPTIONS: { key: DateFilterKey; label: string; icon: string }[] = [
  { key: "today", label: "Hoy", icon: "clock" },
  { key: "week", label: "Semana", icon: "calendar" },
  { key: "month", label: "Mes", icon: "bar-chart-2" },
  { key: "all", label: "Todo", icon: "layers" },
];

interface DashboardData {
  totalSales: number;
  totalUnitsSold: number;
  bestSellingProduct: string;
}

interface Props {
  role: "admin" | "employee";
  dateFilter: DateFilterKey;
  onDateFilter: (key: DateFilterKey) => void;
  summary: FinancialSummary;
  dashboard: DashboardData;
  onExportPDF?: () => void;
}

export function FinancialOverview({
  role,
  dateFilter,
  onDateFilter,
  dashboard,
}: Props) {
  const { colors, isDark } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(12);
    scaleAnim.setValue(0.97);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [dateFilter, fadeAnim, slideAnim, scaleAnim]);

  return (
    <>
      {/* ── Filter Pills ── */}
      {role === "admin" && (
        <View style={styles.filterRow}>
          {DATE_FILTER_OPTIONS.map((opt) => {
            const isActive = dateFilter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? "#166534"
                      : isDark ? colors.card : "#FFFFFF",
                  },
                  !isActive && {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1,
                  },
                ]}
                onPress={() => onDateFilter(opt.key)}
                activeOpacity={0.7}
              >
                <Feather
                  name={opt.icon as any}
                  size={12}
                  color={isActive ? "rgba(255,255,255,0.85)" : "#9CA3AF"}
                  style={styles.filterIcon}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? "#FFFFFF" : isDark ? colors.textMuted : "#6B7280" },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Stats Row ── */}
      <Animated.View
        style={[
          styles.statsRow,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Ventas */}
        <View style={[styles.statCard, { backgroundColor: isDark ? colors.card : "#FFFFFF" }]}>
          <View style={[styles.statIconWrap, { backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5" }]}>
            <Feather name="shopping-bag" size={16} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{dashboard.totalSales}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ventas</Text>
        </View>

        {/* Unidades */}
        <View style={[styles.statCard, { backgroundColor: isDark ? colors.card : "#FFFFFF" }]}>
          <View style={[styles.statIconWrap, { backgroundColor: isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF" }]}>
            <Feather name="package" size={16} color="#3B82F6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{dashboard.totalUnitsSold}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Unidades</Text>
        </View>

        {/* Top producto */}
        <View style={[styles.statCard, { backgroundColor: isDark ? colors.card : "#FFFFFF" }]}>
          <View style={[styles.statIconWrap, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FFFBEB" }]}>
            <Feather name="award" size={16} color="#F59E0B" />
          </View>
          <Text style={[styles.statBest, { color: colors.text }]} numberOfLines={2}>
            {dashboard.bestSellingProduct}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Top producto</Text>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  /* ── Filters ── */
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  filterPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    height: 38,
    gap: 5,
  },
  filterIcon: {
    marginTop: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  statBest: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
