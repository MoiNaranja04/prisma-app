import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { C } from "../../constants/colors";
import type { FinancialSummary } from "../../services/transactions";

type DateFilterKey = "today" | "week" | "month" | "all";

const DATE_FILTER_OPTIONS: { key: DateFilterKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "all", label: "Todo" },
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
  summary,
  dashboard,
  onExportPDF,
}: Props) {
  return (
    <>
      {role === "admin" && (
        <View style={styles.controlsRow}>
          <View style={styles.filterRow}>
            {DATE_FILTER_OPTIONS.map((opt) => {
              const isActive = dateFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => onDateFilter(opt.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {onExportPDF && (
            <TouchableOpacity
              style={styles.btnExport}
              onPress={onExportPDF}
              activeOpacity={0.8}
            >
              <Feather name="download" size={14} color={C.emerald} />
              <Text style={styles.btnExportText}>Exportar reporte</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.stateCard}>
        <Text style={styles.sectionSubtitle}>Estado general</Text>

        {role === "admin" && (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Feather
                  name="trending-up"
                  size={14}
                  color={C.emeraldLight}
                  style={styles.summaryIcon}
                />
                <Text style={styles.summaryLabel}>Ingresos</Text>
                <Text style={[styles.summaryValue, styles.summaryIncome]}>
                  ${summary.totalIncome.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.summaryItem, styles.summaryItemCenter]}>
                <Feather
                  name="trending-down"
                  size={14}
                  color={C.danger}
                  style={styles.summaryIcon}
                />
                <Text style={styles.summaryLabel}>Gastos</Text>
                <Text style={[styles.summaryValue, styles.summaryExpense]}>
                  ${summary.totalExpense.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Feather
                  name="dollar-sign"
                  size={14}
                  color={summary.balance >= 0 ? C.emeraldLight : C.danger}
                  style={styles.summaryIcon}
                />
                <Text style={styles.summaryLabel}>Balance</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    summary.balance >= 0
                      ? styles.summaryIncome
                      : styles.summaryExpense,
                  ]}
                >
                  ${summary.balance.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.stateDivider} />
          </>
        )}

        <View style={styles.dashRow}>
          <View style={styles.dashItem}>
            <Feather
              name="shopping-bag"
              size={16}
              color={C.gold}
              style={styles.dashIcon}
            />
            <Text style={styles.dashValue}>{dashboard.totalSales}</Text>
            <Text style={styles.dashLabel}>Ventas</Text>
          </View>
          <View style={[styles.dashItem, styles.dashItemCenter]}>
            <Feather
              name="package"
              size={16}
              color={C.gold}
              style={styles.dashIcon}
            />
            <Text style={styles.dashValue}>{dashboard.totalUnitsSold}</Text>
            <Text style={styles.dashLabel}>Unidades</Text>
          </View>
          <View style={styles.dashItem}>
            <Feather
              name="award"
              size={16}
              color={C.gold}
              style={styles.dashIcon}
            />
            <Text style={styles.dashBest} numberOfLines={2}>
              {dashboard.bestSellingProduct}
            </Text>
            <Text style={styles.dashLabel}>Mas vendido</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.inputBg,
  },
  filterChipActive: {
    backgroundColor: C.emerald,
    borderColor: C.emerald,
  },
  filterChipText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: C.bg,
  },
  btnExport: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: C.emerald,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnExportText: {
    color: C.emerald,
    fontSize: 13,
    fontWeight: "600",
  },
  stateCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 20,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.textMuted,
    marginBottom: 14,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: "row",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryItemCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
  },
  summaryIcon: {
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryIncome: {
    color: C.emeraldLight,
  },
  summaryExpense: {
    color: C.danger,
  },
  stateDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  dashRow: {
    flexDirection: "row",
  },
  dashItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dashItemCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
  },
  dashIcon: {
    marginBottom: 4,
  },
  dashValue: {
    fontSize: 22,
    fontWeight: "800",
    color: C.gold,
  },
  dashBest: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gold,
    textAlign: "center",
  },
  dashLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
