import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FinancialOverview } from "../../src/components/home/FinancialOverview";
import { TransactionSection } from "../../src/components/home/TransactionSection";
import { AdminSidebar } from "../../src/components/navigation/AdminSidebar";
import { DistributionChart } from "../../src/components/ui/DistributionChart";
import { FloatingModal } from "../../src/components/ui/FloatingModal";
import { ProductLineChart } from "../../src/components/ui/ProductLineChart";
import {
  SkeletonSummaryCard,
  SkeletonTransactionCard,
} from "../../src/components/ui/Skeleton";
import { useTheme } from "../../src/context/ThemeContext";
import { useToast } from "../../src/context/ToastContext";
import { useCompany } from "../../src/hooks/useCompany";
import { haptic } from "../../src/hooks/useHaptics";
import {
  SaleItem,
  SaleWithItems,
  getSalesWithItems,
} from "../../src/services/sales";
import { supabase } from "../../src/services/supabase";
import {
  Category,
  DateRange,
  FinancialSummary,
  Transaction,
  TransactionType,
  createTransaction,
  createCategory as createTransactionCategory,
  getCategoriesByCompany,
  getTransactionsByCompany,
} from "../../src/services/transactions";
import { generateReportHTML } from "../../src/utils/reportGenerator";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function todayLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function toLocalDateStr(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return "";
}

const INITIAL_FORM = {
  amount: "",
  type: "income" as TransactionType,
  categoryId: null as string | null,
  description: "",
  date: todayLocal(),
};

type DateFilterKey = "today" | "week" | "month" | "all";

const DATE_FILTER_LABELS: Record<string, string> = {
  today: "Hoy",
  week: "Semana",
  month: "Mes",
  all: "General",
};

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

/* ── Animated balance counter ── */
function AnimatedBalance({
  value,
  dateFilter,
}: {
  value: number;
  dateFilter: string;
}) {
  const displayRef = useRef(value);
  const opacity = useRef(new Animated.Value(1)).current;
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    opacity.setValue(0.3);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
    const start = displayRef.current;
    const end = value;
    const duration = 350;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(tick);
      else {
        displayRef.current = end;
        setDisplayValue(end);
      }
    };
    if (Math.abs(end - start) > 0.01) requestAnimationFrame(tick);
    else setDisplayValue(end);
  }, [value, dateFilter, opacity]);

  return (
    <Animated.Text style={[styles.heroBalanceAmount, { opacity }]}>
      ${displayValue.toFixed(2)}
    </Animated.Text>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { company, role, userId, loading: loadingCompany } = useCompany();
  const { showToast } = useToast();
  const { isDark, colors } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [chartTypeFilter, setChartTypeFilter] = useState<"income" | "expense">(
    "income",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const companyIdRef = useRef<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(12)).current;

  const headerPadding = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [16, 6],
    extrapolate: "clamp",
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardFade, cardSlide]);

  // Load user name for sidebar
  useEffect(() => {
    const loadUserName = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setUserEmail(user.email ?? "");
        const { data } = await supabase
          .from("company_users")
          .select("name")
          .eq("user_id", user.id)
          .maybeSingle();
        setUserName(data?.name ?? user.email?.split("@")[0] ?? "");
      } catch {}
    };
    loadUserName();
  }, []);

  const updateField = (key: keyof typeof INITIAL_FORM, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const resetForm = () => setForm({ ...INITIAL_FORM, date: todayLocal() });
  const parsedAmount = parseFloat(form.amount);
  const isFormValid = !isNaN(parsedAmount) && parsedAmount > 0 && !!company;

  const reloadTransactions = useCallback(async (companyId: string) => {
    try {
      setTransactions(await getTransactionsByCompany(companyId));
    } catch (e: any) {
      if (__DEV__) console.error("Error recargando transacciones:", e);
    }
  }, []);

  const loadData = useCallback(async (companyId: string) => {
    setLoadingData(true);
    try {
      const [txRes, catRes, salesRes] = await Promise.allSettled([
        getTransactionsByCompany(companyId),
        getCategoriesByCompany(companyId),
        getSalesWithItems(companyId),
      ]);
      if (txRes.status === "fulfilled") setTransactions(txRes.value);
      if (catRes.status === "fulfilled") setCategories(catRes.value);
      if (salesRes.status === "fulfilled") setSales(salesRes.value);
    } catch (e: any) {
      if (__DEV__) console.error("Error cargando dashboard:", e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    if (companyIdRef.current === company.id) return;
    companyIdRef.current = company.id;
    loadData(company.id);
  }, [company, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!company?.id) return;
      loadData(company.id);
    }, [company?.id, loadData]),
  );

  useEffect(() => {
    if (!company?.id) return;
    const companyId = company.id;
    const channel = supabase
      .channel(`dashboard-live-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `company_id=eq.${companyId}`,
        },
        () => loadData(companyId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `company_id=eq.${companyId}`,
        },
        () => loadData(companyId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, loadData]);

  const getTransactionsForFilter = useCallback(
    (filter: DateFilterKey): Transaction[] => {
      if (filter === "all") return transactions;
      const range = getDateRange(filter);
      if (!range) return transactions;
      return transactions.filter((tx) => {
        const raw = tx.transaction_date || tx.created_at || "";
        if (!raw) return false;
        const d = toLocalDateStr(raw);
        if (!d) return false;
        return (
          !(range.startDate && d < range.startDate) &&
          !(range.endDate && d > range.endDate)
        );
      });
    },
    [transactions],
  );

  const getSalesForFilter = useCallback(
    (filter: DateFilterKey): SaleWithItems[] => {
      if (filter === "all") return sales;
      const range = getDateRange(filter);
      if (!range) return sales;
      return sales.filter((s) => {
        const d = toLocalDateStr(s.created_at);
        if (!d) return false;
        return (
          !(range.startDate && d < range.startDate) &&
          !(range.endDate && d > range.endDate)
        );
      });
    },
    [sales],
  );

  const getSummaryFromTransactions = useCallback(
    (txs: Transaction[]): FinancialSummary => {
      let totalIncome = 0;
      let totalExpense = 0;
      for (const tx of txs) {
        const amount = Number(tx.amount) || 0;
        if (tx.type === "income") totalIncome += amount;
        else totalExpense += amount;
      }
      return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
    },
    [],
  );

  const getDashboardFromSales = useCallback((salesSlice: SaleWithItems[]) => {
    const completed = salesSlice.filter((s) => s.status === "completed");
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
  }, []);

  const filteredTransactions = useMemo(
    () => getTransactionsForFilter(dateFilter),
    [dateFilter, getTransactionsForFilter],
  );

  const filteredSales = useMemo(
    () => getSalesForFilter(dateFilter),
    [dateFilter, getSalesForFilter],
  );

  const filteredSummary = useMemo(
    () => getSummaryFromTransactions(filteredTransactions),
    [filteredTransactions, getSummaryFromTransactions],
  );

  const dashboard = useMemo(
    () => getDashboardFromSales(filteredSales),
    [filteredSales, getDashboardFromSales],
  );

  const sidebarReportSnapshots = useMemo(() => {
    const filters: DateFilterKey[] = ["today", "week", "month", "all"];
    return filters.reduce(
      (acc, filter) => {
        const txs = getTransactionsForFilter(filter);
        const salesSlice = getSalesForFilter(filter);
        const summary = getSummaryFromTransactions(txs);
        const dashboardData = getDashboardFromSales(salesSlice);
        acc[filter] = {
          balance: summary.balance,
          totalIncome: summary.totalIncome,
          totalExpense: summary.totalExpense,
          totalSales: dashboardData.totalSales,
          totalTransactions: txs.length,
          bestSellingProduct: dashboardData.bestSellingProduct,
          companyName: company?.name ?? "Empresa",
        };
        return acc;
      },
      {} as Record<
        DateFilterKey,
        {
          balance: number;
          totalIncome: number;
          totalExpense: number;
          totalSales: number;
          totalTransactions: number;
          bestSellingProduct: string;
          companyName: string;
        }
      >,
    );
  }, [
    company?.name,
    getDashboardFromSales,
    getSalesForFilter,
    getSummaryFromTransactions,
    getTransactionsForFilter,
  ]);

  const chartColors = useMemo(
    () => [
      "#0F5E3C",
      "#10B981",
      "#34D399",
      "#6EE7B7",
      "#A7F3D0",
      "#047857",
      "#065F46",
    ],
    [],
  );

  const donutChartData = useMemo(() => {
    if (role === "admin") {
      const filteredTx = filteredTransactions.filter(
        (tx) => tx.type === chartTypeFilter,
      );
      const categoryTotals: Record<string, number> = {};
      let totalAmount = 0;
      for (const tx of filteredTx) {
        const catName = tx.category_id
          ? (categories.find((c) => c.id === tx.category_id)?.name ??
            "Sin categoría")
          : "Sin categoría";
        const amount = Number(tx.amount) || 0;
        categoryTotals[catName] = (categoryTotals[catName] || 0) + amount;
        totalAmount += amount;
      }
      return {
        data: Object.entries(categoryTotals)
          .map(([label, value], index) => ({
            label,
            value,
            color: chartColors[index % chartColors.length],
          }))
          .sort((a, b) => b.value - a.value),
        total: totalAmount,
        title:
          chartTypeFilter === "income"
            ? "Ingresos por categoría"
            : "Gastos por categoría",
        isExpense: chartTypeFilter === "expense",
      };
    } else {
      const mySales = filteredSales.filter(
        (s) => s.status === "completed" && s.sold_by === userId,
      );
      const productTotals: Record<string, number> = {};
      for (const sale of mySales)
        for (const item of sale.items)
          productTotals[item.product_name] =
            (productTotals[item.product_name] || 0) + item.quantity;
      return {
        data: Object.entries(productTotals)
          .map(([label, value], index) => ({
            label,
            value,
            color: chartColors[index % chartColors.length],
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 7),
        total: mySales.reduce((sum, s) => sum + Number(s.total_amount), 0),
        title: "Mis ventas por producto",
        isExpense: false,
      };
    }
  }, [
    role,
    userId,
    chartTypeFilter,
    filteredTransactions,
    filteredSales,
    categories,
  ]);

  const handleDateFilter = useCallback(
    (key: DateFilterKey) => setDateFilter(key),
    [],
  );

  const handleSave = useCallback(async () => {
    if (!company?.id || !isFormValid || saving) return;
    setSaving(true);
    try {
      await createTransaction({
        companyId: company.id,
        categoryId: form.categoryId,
        amount: parsedAmount,
        type: form.type,
        description: form.description,
        transactionDate: form.date,
      });
      resetForm();
      await reloadTransactions(company.id);
    } catch (e: any) {
      if (__DEV__) console.error("Error guardando transaccion:", e);
      showToast(
        "No pudimos guardar el movimiento. Revisa los datos e intenta nuevamente.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }, [
    company,
    isFormValid,
    saving,
    form,
    parsedAmount,
    reloadTransactions,
    showToast,
  ]);

  const handleCreateCategory = useCallback(
    async (name: string, type: TransactionType): Promise<Category> => {
      if (!company?.id) {
        throw new Error("No se encontró la empresa");
      }

      const created = await createTransactionCategory({
        companyId: company.id,
        name: name.trim(),
        type,
      });

      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );

      return created;
    },
    [company?.id],
  );

  const getSaleCustomerName = useCallback(
    (sale: SaleWithItems | undefined): string | undefined => {
      if (!sale) return undefined;
      const cn = sale.customer_name?.trim();
      return cn === "Venta mostrador" ? "Venta en tienda" : cn;
    },
    [],
  );

  const getDisplayDescription = useCallback(
    (rawDescription: string): string => {
      if (!rawDescription) return "Sin descripcion";
      const cancelMatch = rawDescription.match(
        /^Cancelaci[oó]n venta #([a-zA-Z0-9-]+)/i,
      );
      if (cancelMatch) {
        const s = sales.find((sale) => sale.id === cancelMatch[1]);
        const n = getSaleCustomerName(s);
        return n ? `Venta cancelada - ${n}` : "Venta cancelada";
      }
      const ventaMatch = rawDescription.match(/^Venta #([a-zA-Z0-9-]+)/i);
      if (ventaMatch) {
        const s = sales.find((sale) => sale.id === ventaMatch[1]);
        const n = getSaleCustomerName(s);
        return n ? `Venta - ${n}` : "Venta en tienda";
      }
      return rawDescription;
    },
    [sales, getSaleCustomerName],
  );

  const getSaleItems = useCallback(
    (rawDescription: string): SaleItem[] => {
      const m = rawDescription.match(/^Venta #([a-zA-Z0-9-]+)/i);
      return m ? (sales.find((s) => s.id === m[1])?.items ?? []) : [];
    },
    [sales],
  );

  const getSaleSeller = useCallback(
    (rawDescription: string): string | null => {
      const match = rawDescription.match(
        /^(?:Venta|Cancelaci[oó]n venta) #([a-zA-Z0-9-]+)/i,
      );
      if (!match) return null;
      const sale = sales.find((s) => s.id === match[1]);
      if (!sale?.sold_by) return null;
      return sale.employee_role === "admin"
        ? "Jefe"
        : (sale.employee_name ?? null);
    },
    [sales],
  );

  const exportReportByFilter = useCallback(
    async (filter: DateFilterKey) => {
      if (!company) return;
      try {
        const txs = getTransactionsForFilter(filter);
        const salesSlice = getSalesForFilter(filter);
        const summary = getSummaryFromTransactions(txs);
        const dashboardData = getDashboardFromSales(salesSlice);
        const html = generateReportHTML({
          companyName: company.name,
          dateFilterLabel: DATE_FILTER_LABELS[filter] || "General",
          summary,
          dashboard: dashboardData,
          transactions: txs,
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
      } catch {
        showToast("Hubo un problema al generar el reporte.", "error");
      }
    },
    [
      company,
      getDashboardFromSales,
      getSalesForFilter,
      getSummaryFromTransactions,
      getTransactionsForFilter,
      sales,
      showToast,
    ],
  );

  const handleExportPDF = useCallback(() => {
    void exportReportByFilter(dateFilter);
  }, [dateFilter, exportReportByFilter]);

  const handleSidebarNavigate = useCallback(
    (screen: string) => {
      router.push(`/${screen}` as any);
    },
    [router],
  );

  const handleSidebarLogout = useCallback(() => {
    setSidebarOpen(false);
    setShowLogoutModal(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
  }, []);

  const filteredCategories = categories.filter((c) => c.type === form.type);
  const bgColor = isDark ? colors.bg : "#F0F4F3";

  if (loadingCompany) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: bgColor }]}
      >
        <ActivityIndicator size="large" color={colors.emerald} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Cargando empresa...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Bar ── */}
        <Animated.View style={[styles.topBar, { paddingTop: headerPadding }]}>
          <TouchableOpacity
            onPress={() => {
              haptic.light();
              setSidebarOpen(true);
            }}
            style={[
              styles.menuBtn,
              { backgroundColor: isDark ? colors.card : "#FFFFFF" },
            ]}
            activeOpacity={0.7}
          >
            <Feather name="menu" size={20} color={colors.text} />
          </TouchableOpacity>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logoSmall}
            resizeMode="contain"
          />
        </Animated.View>

        {/* ── Greeting ── */}
        <Text
          style={[styles.greeting, { color: isDark ? "#9CA3AF" : "#374151" }]}
        >
          {getGreeting()}, Jefe
        </Text>

        {/* ── Hero Balance Card ── */}
        <Animated.View
          style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}
        >
          <LinearGradient
            colors={isDark ? ["#064E3B", "#0F766E"] : ["#166534", "#15803D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Balance actual</Text>
                <AnimatedBalance
                  value={filteredSummary.balance}
                  dateFilter={dateFilter}
                />
              </View>
              {role === "admin" && (
                <TouchableOpacity
                  onPress={handleExportPDF}
                  style={styles.heroExportBtn}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="download"
                    size={16}
                    color="rgba(255,255,255,0.9)"
                  />
                </TouchableOpacity>
              )}
            </View>
            {/* Mini ingresos/gastos */}
            <View style={styles.heroMetrics}>
              <View style={styles.heroMetricItem}>
                <View style={styles.heroMetricDot}>
                  <Feather name="arrow-up-right" size={14} color="#4ADE80" />
                </View>
                <View>
                  <Text style={styles.heroMetricLabel}>Ingresos</Text>
                  <Text style={styles.heroMetricValue}>
                    ${filteredSummary.totalIncome.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetricItem}>
                <View
                  style={[
                    styles.heroMetricDot,
                    { backgroundColor: "rgba(248,113,113,0.35)" },
                  ]}
                >
                  <Feather name="arrow-down-right" size={14} color="#F87171" />
                </View>
                <View>
                  <Text style={styles.heroMetricLabel}>Gastos</Text>
                  <Text style={styles.heroMetricValue}>
                    ${filteredSummary.totalExpense.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
            {/* Company info strip */}
            {company && (
              <View style={styles.heroCompany}>
                <Text style={styles.heroCompanyName}>{company.name}</Text>
                <View style={styles.heroChips}>
                  <View
                    style={[
                      styles.heroChip,
                      { backgroundColor: "rgba(134,239,172,0.3)" },
                    ]}
                  >
                    <Text style={styles.heroChipText}>
                      {company.business_type}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.heroChip,
                      { backgroundColor: "rgba(167,243,208,0.35)" },
                    ]}
                  >
                    <Text style={styles.heroChipText}>{company.currency}</Text>
                  </View>
                </View>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ── Loading skeleton ── */}
        {loadingData && transactions.length === 0 && (
          <>
            {role === "admin" && (
              <>
                <SkeletonSummaryCard />
                <SkeletonSummaryCard />
              </>
            )}
            {[1, 2, 3].map((i) => (
              <SkeletonTransactionCard key={`stx-${i}`} />
            ))}
          </>
        )}

        {/* ── Main content ── */}
        {(!loadingData || transactions.length > 0) && (
          <>
            <FinancialOverview
              role={role}
              dateFilter={dateFilter}
              onDateFilter={handleDateFilter}
              summary={filteredSummary}
              dashboard={dashboard}
              onExportPDF={role === "admin" ? handleExportPDF : undefined}
            />

            {/* Chart */}
            {role === "admin" && (
              <Animated.View
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: colors.card,
                    opacity: cardFade,
                    transform: [{ translateY: cardSlide }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.chartToggle,
                    { backgroundColor: isDark ? colors.bg : "#F1F5F4" },
                  ]}
                >
                  {(["income", "expense"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chartToggleBtn,
                        chartTypeFilter === type && styles.chartToggleBtnActive,
                      ]}
                      onPress={() => setChartTypeFilter(type)}
                    >
                      <Text
                        style={[
                          styles.chartToggleText,
                          { color: "#6B7280" },
                          chartTypeFilter === type &&
                            styles.chartToggleTextActive,
                        ]}
                      >
                        {type === "income" ? "Ingresos" : "Gastos"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {donutChartData.data.length > 0 ? (
                  <DistributionChart
                    data={donutChartData.data}
                    title={donutChartData.title}
                    total={donutChartData.total}
                    totalLabel={
                      donutChartData.isExpense
                        ? "Total gastos"
                        : "Total ingresos"
                    }
                  />
                ) : (
                  <Text style={[styles.emptyChart, { color: "#6B7280" }]}>
                    Sin {chartTypeFilter === "income" ? "ingresos" : "gastos"}{" "}
                    en este período
                  </Text>
                )}
              </Animated.View>
            )}

            {role === "employee" && donutChartData.data.length > 0 && (
              <View
                style={[styles.chartCard, { backgroundColor: colors.card }]}
              >
                <ProductLineChart
                  data={donutChartData.data}
                  title={donutChartData.title}
                  total={donutChartData.total}
                  totalLabel="Total:"
                />
              </View>
            )}

            <TransactionSection
              role={role}
              form={form}
              onUpdateField={updateField}
              filteredCategories={filteredCategories}
              allCategories={categories}
              onCreateCategory={handleCreateCategory}
              isFormValid={isFormValid}
              saving={saving}
              onSave={handleSave}
              transactions={filteredTransactions}
              loadingData={loadingData}
              getSaleItems={getSaleItems}
              getDisplayDescription={getDisplayDescription}
              getSaleSeller={getSaleSeller}
              onViewHistory={() => router.push("/sales")}
            />
          </>
        )}
      </Animated.ScrollView>

      {/* Sidebar */}
      <AdminSidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={userName}
        userEmail={userEmail}
        userRole={role ?? "employee"}
        userId={userId}
        companyId={company?.id}
        companyName={company?.name}
        companyCurrency={company?.currency}
        companyBusinessType={company?.business_type}
        companyInviteCode={company?.invite_code}
        onNavigate={handleSidebarNavigate}
        onLogout={handleSidebarLogout}
        reportSnapshots={sidebarReportSnapshots}
        onExportReport={(period) => {
          void exportReportByFilter(period);
        }}
      />

      {/* Modal logout */}
      <FloatingModal
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
        cardStyle={[
          {
            backgroundColor: colors.card,
            padding: 24,
            width: "100%",
            maxWidth: 320,
          },
        ]}
      >
        <View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 12,
              textAlign: "center",
              color: colors.text,
            }}
          >
            Cerrar sesión
          </Text>
          <Text
            style={{
              fontSize: 14,
              marginBottom: 20,
              textAlign: "center",
              color: colors.textMuted,
            }}
          >
            ¿Estás seguro de que quieres cerrar sesión?
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
              }}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.textMuted,
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: "#B42318",
                alignItems: "center",
              }}
              onPress={confirmLogout}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}
              >
                Cerrar sesión
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </FloatingModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 14, marginTop: 12 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  /* ── Top Bar ── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    marginBottom: 4,
  },
  logoSmall: { width: 100, height: 36 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  /* ── Greeting ── */
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 20,
    letterSpacing: -0.2,
    color: "#4B5563",
  },

  /* ── Hero Balance Card ── */
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  heroBalanceAmount: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroExportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroMetrics: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    padding: 14,
  },
  heroMetricItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroMetricDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(74,222,128,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroMetricLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "500",
  },
  heroMetricValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  heroMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 6,
  },
  heroCompany: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  heroCompanyName: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 15.5,
    fontWeight: "700",
    flex: 1,
  },
  heroChips: {
    flexDirection: "row",
    gap: 6,
  },
  heroChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroChipText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  /* ── Chart ── */
  chartCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartToggle: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    alignSelf: "center",
  },
  chartToggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chartToggleBtnActive: {
    backgroundColor: "#166534",
  },
  chartToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chartToggleTextActive: {
    color: "#FFFFFF",
  },
  emptyChart: {
    fontSize: 13,
    marginTop: 20,
    textAlign: "center",
  },
});
