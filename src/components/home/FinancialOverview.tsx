import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
              <Feather name="download" size={14} color="#FFFFFF" />
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
                  color="#0F5E3C"
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
                  color="#B42318"
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
                  color="#0F5E3C"
                  style={styles.summaryIcon}
                />
                <Text style={styles.summaryLabel}>Balance</Text>
                <Text style={[styles.summaryValue, styles.summaryBalance]}>
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
              color="#0F5E3C"
              style={styles.dashIcon}
            />
            <Text style={styles.dashValue}>{dashboard.totalSales}</Text>
            <Text style={styles.dashLabel}>Ventas</Text>
          </View>
          <View style={[styles.dashItem, styles.dashItemCenter]}>
            <Feather
              name="package"
              size={16}
              color="#0F5E3C"
              style={styles.dashIcon}
            />
            <Text style={styles.dashValue}>{dashboard.totalUnitsSold}</Text>
            <Text style={styles.dashLabel}>Unidades</Text>
          </View>
          <View style={styles.dashItem}>
            <Feather
              name="award"
              size={16}
              color="#0F5E3C"
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
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
    borderColor: "#0F5E3C",
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: {
    backgroundColor: "#0F5E3C",
    borderColor: "#0F5E3C",
  },
  filterChipText: {
    color: "#0F5E3C",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  btnExport: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#111111",
    backgroundColor: "#111111",
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
  },
  btnExportText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  stateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E9EF",
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionSubtitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 14,
    marginTop: 2,
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
    borderColor: "#E6E9EF",
  },
  summaryIcon: {
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#0F5E3C",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryIncome: {
    color: "#0F5E3C",
  },
  summaryExpense: {
    color: "#B42318",
  },
  summaryBalance: {
    color: "#111111",
  },
  stateDivider: {
    height: 1,
    backgroundColor: "#E6E9EF",
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
    borderColor: "#E6E9EF",
  },
  dashIcon: {
    marginBottom: 4,
  },
  dashValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111111",
  },
  dashBest: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
  },
  dashLabel: {
    fontSize: 12,
    color: "#0F5E3C",
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 4,
    letterSpacing: 1,
    textAlign: "center",
  },
});
