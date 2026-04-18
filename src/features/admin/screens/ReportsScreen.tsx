import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SecondaryScreenHeader } from "@/src/components/ui/SecondaryScreenHeader";
import { useTheme } from "@/src/context/ThemeContext";
import { useToast } from "@/src/context/ToastContext";
import { useCompany } from "@/src/hooks/useCompany";
import { SaleWithItems, getSalesWithItems } from "@/src/lib/sales";
import {
  DateRange,
  FinancialSummary,
  Transaction,
  getTransactionsByCompany,
} from "@/src/lib/transactions";
import { generateReportHTML } from "@/src/utils/reportGenerator";

type DateFilterKey = "today" | "week" | "month" | "all";

const DATE_FILTERS: { key: DateFilterKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "all", label: "General" },
];

function toLocalDateStr(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return "";
}

function getDateRange(filter: DateFilterKey): DateRange | undefined {
  if (filter === "all") return undefined;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = `${yyyy}-${mm}-${dd}`;

  if (filter === "today") return { startDate: today, endDate: today };

  if (filter === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const my = monday.getFullYear();
    const mmm = String(monday.getMonth() + 1).padStart(2, "0");
    const mdd = String(monday.getDate()).padStart(2, "0");
    return { startDate: `${my}-${mmm}-${mdd}`, endDate: today };
  }

  return { startDate: `${yyyy}-${mm}-01`, endDate: today };
}

export default function ReportsScreen() {
  const { company, loading } = useCompany();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");

  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [cardFade, cardSlide]);

  const loadData = useCallback(async (companyId: string) => {
    setLoadingData(true);
    try {
      const [txRes, salesRes] = await Promise.allSettled([
        getTransactionsByCompany(companyId),
        getSalesWithItems(companyId),
      ]);

      if (txRes.status === "fulfilled") setTransactions(txRes.value);
      if (salesRes.status === "fulfilled") setSales(salesRes.value);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!company?.id) return;
      loadData(company.id);
    }, [company?.id, loadData]),
  );

  const filteredTransactions = useMemo(() => {
    if (dateFilter === "all") return transactions;
    const range = getDateRange(dateFilter);
    if (!range) return transactions;

    return transactions.filter((tx) => {
      const d = toLocalDateStr(tx.transaction_date || tx.created_at || "");
      if (!d) return false;
      return !(range.startDate && d < range.startDate) && !(range.endDate && d > range.endDate);
    });
  }, [transactions, dateFilter]);

  const filteredSales = useMemo(() => {
    if (dateFilter === "all") return sales;
    const range = getDateRange(dateFilter);
    if (!range) return sales;

    return sales.filter((s) => {
      const d = toLocalDateStr(s.created_at);
      if (!d) return false;
      return !(range.startDate && d < range.startDate) && !(range.endDate && d > range.endDate);
    });
  }, [sales, dateFilter]);

  const summary = useMemo<FinancialSummary>(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of filteredTransactions) {
      const amount = Number(tx.amount) || 0;
      if (tx.type === "income") totalIncome += amount;
      else totalExpense += amount;
    }

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [filteredTransactions]);

  const dashboard = useMemo(() => {
    const completed = filteredSales.filter((s) => s.status === "completed");
    const totalSales = completed.length;
    let totalUnitsSold = 0;
    const productCounts: Record<string, { name: string; qty: number }> = {};

    for (const sale of completed) {
      for (const item of sale.items) {
        totalUnitsSold += item.quantity;
        if (!productCounts[item.product_id]) {
          productCounts[item.product_id] = { name: item.product_name, qty: 0 };
        }
        productCounts[item.product_id].qty += item.quantity;
      }
    }

    const best = Object.values(productCounts).sort((a, b) => b.qty - a.qty)[0];

    return {
      totalSales,
      totalUnitsSold,
      bestSellingProduct: best?.name ?? "Sin ventas",
    };
  }, [filteredSales]);

  const currentFilterLabel = DATE_FILTERS.find((f) => f.key === dateFilter)?.label ?? "General";

  const handleExportPDF = useCallback(async () => {
    if (!company || exporting) return;

    setExporting(true);
    try {
      const filterLabel = DATE_FILTERS.find((f) => f.key === dateFilter)?.label ?? "General";

      const html = generateReportHTML({
        companyName: company.name,
        dateFilterLabel: filterLabel,
        summary,
        dashboard,
        transactions: filteredTransactions,
        sales,
      });

      if (Platform.OS === "web") {
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(html);
          w.document.close();
          w.focus();
          w.print();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Reporte Prisma",
        });
      }

      showToast("Reporte generado correctamente", "success");
    } catch {
      showToast("Hubo un problema al generar el reporte.", "error");
    } finally {
      setExporting(false);
    }
  }, [company, exporting, dateFilter, summary, dashboard, filteredTransactions, sales, showToast]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.bg }]}> 
        <ActivityIndicator size="large" color={colors.emerald} />
      </View>
    );
  }

  const heroCardBg = isDark ? "#0F172A" : "#FFFFFF";
  const heroPrimaryText = isDark ? "#F8FAFC" : "#0F172A";
  const heroSecondaryText = isDark ? "#94A3B8" : "#64748B";
  const heroAccent = "#166534";
  const heroAccentSoft = isDark ? "rgba(22,101,52,0.28)" : "rgba(22,101,52,0.10)";
  const heroSurfaceSoft = isDark ? "rgba(148,163,184,0.10)" : "#F8FAFC";
  const heroDividerColor = isDark ? "rgba(148,163,184,0.22)" : "rgba(15,23,42,0.10)";
  const heroBorderColor = isDark ? "rgba(148,163,184,0.22)" : "rgba(15,23,42,0.08)";
  const heroExportBg = isDark ? "rgba(148,163,184,0.10)" : "#FFFFFF";
  const heroExportIcon = heroAccent;

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}> 
      <SecondaryScreenHeader title="Reportes" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
          <View style={[styles.heroCard, { backgroundColor: heroCardBg, borderColor: heroBorderColor }]}> 
            <View style={[styles.heroRibbon, { backgroundColor: heroAccent }]} />

            <View style={styles.heroTop}>
              <View style={styles.heroTitleWrap}>
                <Text style={[styles.heroEyebrow, { color: heroSecondaryText }]}>Reporte financiero</Text>
                <Text style={[styles.heroTitle, { color: heroPrimaryText }]}>Balance del periodo</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.heroExportBtn,
                  {
                    backgroundColor: heroExportBg,
                    borderColor: heroDividerColor,
                  },
                ]}
                onPress={handleExportPDF}
                disabled={exporting || loadingData}
                activeOpacity={0.75}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={heroExportIcon} />
                ) : (
                  <Feather name="download" size={16} color={heroExportIcon} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.heroBalanceAmount, { color: heroPrimaryText }]}>${summary.balance.toFixed(2)}</Text>

            <View style={styles.heroStatsRow}>
              <View style={[styles.heroStatPill, { backgroundColor: heroAccentSoft }]}> 
                <View style={[styles.heroMetricDot, { backgroundColor: isDark ? "rgba(22,101,52,0.38)" : "rgba(22,101,52,0.18)" }]}> 
                  <Feather name="arrow-up-right" size={14} color="#166534" />
                </View>
                <View style={styles.heroStatTextWrap}>
                  <Text style={[styles.heroMetricLabel, { color: heroSecondaryText }]}>Ingresos</Text>
                  <Text style={[styles.heroMetricValue, { color: heroPrimaryText }]}>${summary.totalIncome.toFixed(2)}</Text>
                </View>
              </View>

              <View style={[styles.heroStatPill, { backgroundColor: heroSurfaceSoft }]}> 
                <View style={[styles.heroMetricDot, { backgroundColor: isDark ? "rgba(248,113,113,0.24)" : "rgba(248,113,113,0.12)" }]}> 
                  <Feather name="arrow-down-right" size={14} color="#F87171" />
                </View>
                <View style={styles.heroStatTextWrap}>
                  <Text style={[styles.heroMetricLabel, { color: heroSecondaryText }]}>Gastos</Text>
                  <Text style={[styles.heroMetricValue, { color: heroPrimaryText }]}>${summary.totalExpense.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.heroMetaRow, { borderTopColor: heroDividerColor }]}> 
              <View style={styles.heroChips}>
                <View style={[styles.heroChip, { backgroundColor: heroAccentSoft }]}>
                  <Text style={[styles.heroChipText, { color: heroAccent }]}>{currentFilterLabel}</Text>
                </View>
                <View style={[styles.heroChip, { backgroundColor: heroSurfaceSoft }]}>
                  <Text style={[styles.heroChipText, { color: heroSecondaryText }]}>{dashboard.totalSales} ventas</Text>
                </View>
              </View>

              <Text style={[styles.heroCompanyName, { color: heroSecondaryText }]} numberOfLines={1}>
                {company?.name ?? "Empresa"}
              </Text>
            </View>
          </View>

          <View style={[styles.filterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.filterTitle, { color: colors.textMuted }]}>Periodo de reporte</Text>
            <View style={[styles.filterRow, { backgroundColor: isDark ? colors.bg : "#F1F5F4" }]}>
              {DATE_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterBtn, dateFilter === f.key && { backgroundColor: colors.emerald }]}
                  onPress={() => setDateFilter(f.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterBtnText,
                      { color: colors.textMuted },
                      dateFilter === f.key && { color: "#FFFFFF" },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View
                style={[
                  styles.statsIcon,
                  { backgroundColor: isDark ? "rgba(59,130,246,0.18)" : "rgba(37,99,235,0.10)" },
                ]}
              >
                <Feather name="shopping-bag" size={16} color={isDark ? "#93C5FD" : "#2563EB"} />
              </View>
              <Text style={[styles.statsLabel, { color: colors.textMuted }]}>Ventas completadas</Text>
              <Text style={[styles.statsValue, { color: colors.text }]}>{dashboard.totalSales}</Text>
            </View>

            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View
                style={[
                  styles.statsIcon,
                  { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.12)" },
                ]}
              >
                <Feather name="package" size={16} color={colors.emerald} />
              </View>
              <Text style={[styles.statsLabel, { color: colors.textMuted }]}>Unidades vendidas</Text>
              <Text style={[styles.statsValue, { color: colors.text }]}>{dashboard.totalUnitsSold}</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Resumen de ventas</Text>
            <View style={[styles.bestProduct, { backgroundColor: isDark ? colors.bg : "#F7F9FB" }]}>
              <Feather name="award" size={16} color={colors.emerald} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.bestLabel, { color: colors.textMuted }]}>Mas vendido</Text>
                <Text style={[styles.bestValue, { color: colors.text }]}>{dashboard.bestSellingProduct}</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{filteredTransactions.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Movimientos</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{filteredSales.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Registros venta</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.emerald }]}
            onPress={handleExportPDF}
            disabled={exporting || loadingData}
            activeOpacity={0.7}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="download" size={18} color="#FFFFFF" />
                <Text style={styles.exportBtnText}>Exportar reporte PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },

  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  heroRibbon: {
    width: 44,
    height: 4,
    borderRadius: 99,
    marginBottom: 12,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  heroBalanceAmount: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 6,
  },
  heroExportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  heroStatPill: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroStatTextWrap: {
    flex: 1,
  },
  heroMetricDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMetricLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  heroMetricValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  heroMetaRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heroCompanyName: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  heroChips: {
    flexDirection: "row",
    gap: 6,
  },
  heroChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroChipText: {
    fontSize: 11,
    fontWeight: "700",
  },

  filterCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  filterBtnText: { fontSize: 13, fontWeight: "700" },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  statsIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.4 },
  statLabel: { fontSize: 12, fontWeight: "500", marginTop: 4 },
  statDivider: { width: 1, height: 40 },
  bestProduct: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
  },
  bestLabel: { fontSize: 11, fontWeight: "500" },
  bestValue: { fontSize: 14, fontWeight: "700", marginTop: 2 },

  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exportBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
