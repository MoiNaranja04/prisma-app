import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FinancialOverview } from "../../src/components/home/FinancialOverview";
import { TransactionSection } from "../../src/components/home/TransactionSection";
import {
  SkeletonSummaryCard,
  SkeletonTransactionCard,
} from "../../src/components/ui/Skeleton";
import { C } from "../../src/constants/colors";
import { useToast } from "../../src/context/ToastContext";
import { useCompany } from "../../src/hooks/useCompany";
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
  getCategoriesByCompany,
  getTransactionsByCompany,
} from "../../src/services/transactions";
import { generateReportHTML } from "../../src/utils/reportGenerator";

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

  if (filter === "today") {
    return { startDate: today, endDate: today };
  }

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

export default function DashboardScreen() {
  const router = useRouter();
  const { company, role, userId, loading: loadingCompany } = useCompany();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
  const [showInviteCode, setShowInviteCode] = useState(false);

  const companyIdRef = useRef<string | null>(null);

  const updateField = (key: keyof typeof INITIAL_FORM, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => setForm({ ...INITIAL_FORM, date: todayLocal() });

  const parsedAmount = parseFloat(form.amount);
  const isFormValid = !isNaN(parsedAmount) && parsedAmount > 0 && !!company;

  const reloadTransactions = useCallback(async (companyId: string) => {
    try {
      const data = await getTransactionsByCompany(companyId);
      setTransactions(data);
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

  const filteredTransactions = useMemo(() => {
    if (dateFilter === "all") return transactions;
    const range = getDateRange(dateFilter);
    if (!range) return transactions;
    return transactions.filter((tx) => {
      const raw = tx.transaction_date || tx.created_at || "";
      if (!raw) return false;
      const d = toLocalDateStr(raw);
      if (!d) return false;
      if (range.startDate && d < range.startDate) return false;
      if (range.endDate && d > range.endDate) return false;
      return true;
    });
  }, [transactions, dateFilter]);

  const filteredSummary = useMemo<FinancialSummary>(() => {
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
    const completed = sales.filter((s) => {
      if (s.status !== "completed") return false;
      if (role === "employee" && userId && s.sold_by) {
        return s.sold_by === userId;
      }
      return true;
    });

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
  }, [sales, role, userId]);

  const handleDateFilter = useCallback((key: DateFilterKey) => {
    setDateFilter(key);
  }, []);

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
      showToast(e?.message ?? "Error desconocido", "error");
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

      const cancelSaleMatch = rawDescription.match(
        /^Cancelaci[oó]n venta #([a-zA-Z0-9-]+)/i,
      );
      if (cancelSaleMatch) {
        const saleId = cancelSaleMatch[1];
        const relatedSale = sales.find((sale) => sale.id === saleId);
        const displayName = getSaleCustomerName(relatedSale);
        return displayName
          ? `Venta cancelada - ${displayName}`
          : "Venta cancelada";
      }

      const ventaMatch = rawDescription.match(/^Venta #([a-zA-Z0-9-]+)/i);
      if (ventaMatch) {
        const saleId = ventaMatch[1];
        const relatedSale = sales.find((sale) => sale.id === saleId);
        const displayName = getSaleCustomerName(relatedSale);
        return displayName ? `Venta - ${displayName}` : "Venta en tienda";
      }

      return rawDescription;
    },
    [sales, getSaleCustomerName],
  );

  const getSaleItems = useCallback(
    (rawDescription: string): SaleItem[] => {
      const ventaMatch = rawDescription.match(/^Venta #([a-zA-Z0-9-]+)/i);
      return ventaMatch
        ? (sales.find((s) => s.id === ventaMatch[1])?.items ?? [])
        : [];
    },
    [sales],
  );

  const handleExportPDF = useCallback(async () => {
    if (!company) return;
    try {
      const html = generateReportHTML({
        companyName: company.name,
        dateFilterLabel: DATE_FILTER_LABELS[dateFilter] || "General",
        summary: filteredSummary,
        dashboard,
        transactions: filteredTransactions,
        sales,
      });
      if (Platform.OS === "web") {
        const printWin = window.open("", "_blank");
        if (printWin) {
          printWin.document.write(html);
          printWin.document.close();
          printWin.focus();
          printWin.print();
        }
        const viewWin = window.open("", "_blank");
        if (viewWin) {
          viewWin.document.write(html);
          viewWin.document.close();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Reporte Prisma",
        });
      }
    } catch (e: any) {
      showToast(e?.message ?? "Error generando reporte", "error");
    }
  }, [
    company,
    dateFilter,
    filteredSummary,
    dashboard,
    filteredTransactions,
    sales,
    showToast,
  ]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  if (loadingCompany) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={C.emerald} />
        <Text style={styles.loadingText}>Cargando empresa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Control financiero inteligente</Text>
        </View>

        {company && (
          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <Text style={styles.cardLabel}>EMPRESA</Text>
            <Text style={styles.cardTitle}>{company.name}</Text>
            <View style={styles.cardRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{company.business_type}</Text>
              </View>
              <View style={[styles.chip, styles.chipCyan]}>
                <Text style={[styles.chipText, styles.chipTextCyan]}>
                  {company.currency}
                </Text>
              </View>
            </View>
            {role === "admin" && company.invite_code && (
              <View style={styles.inviteCodeRow}>
                <Text style={styles.inviteCodeLabel}>CODIGO INVITACION:</Text>
                <Text style={styles.inviteCodeValue}>
                  {showInviteCode ? company.invite_code : "••••••"}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowInviteCode((v) => !v)}
                  activeOpacity={0.7}
                  style={styles.inviteEyeBtn}
                >
                  <Feather
                    name={showInviteCode ? "eye-off" : "eye"}
                    size={16}
                    color={C.gold}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

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

            <TransactionSection
              role={role}
              form={form}
              onUpdateField={updateField}
              filteredCategories={filteredCategories}
              isFormValid={isFormValid}
              saving={saving}
              onSave={handleSave}
              transactions={filteredTransactions}
              loadingData={loadingData}
              getSaleItems={getSaleItems}
              getDisplayDescription={getDisplayDescription}
              onViewHistory={() => router.push("/sales")}
            />
          </>
        )}

        <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
          <Feather name="log-out" size={14} color={C.textMuted} />
          <Text style={styles.btnLogoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: C.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  scroll: {
    padding: 20,
    paddingBottom: 34,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  logo: {
    width: 130,
    height: 50,
  },
  tagline: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: C.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: C.emerald,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardLabel: {
    fontSize: 10,
    color: C.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    backgroundColor: "#134e2a",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    color: C.emeraldLight,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  chipCyan: {
    backgroundColor: "#0e3a42",
  },
  chipTextCyan: {
    color: C.cyan,
  },
  inviteCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  inviteCodeLabel: {
    color: C.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  inviteCodeValue: {
    color: C.gold,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 3,
  },
  inviteEyeBtn: {
    marginLeft: 6,
    padding: 4,
  },
  btnLogout: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnLogoutText: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
});
