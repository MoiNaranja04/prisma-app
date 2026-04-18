import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AdminScreenHeader from "@/src/components/ui/AdminScreenHeader";
import { FloatingModal } from "@/src/components/ui/FloatingModal";
import { HorizontalBarChart } from "@/src/components/ui/HorizontalBarChart";
import { C } from "@/src/constants/colors";
import { useTheme } from "@/src/context/ThemeContext";
import { useToast } from "@/src/context/ToastContext";
import { useCompany } from "@/src/hooks/useCompany";
import { Customer, getCustomersByCompany } from "@/src/lib/customers";
import { getProductsByCompany } from "@/src/lib/products";
import {
  SaleItem,
  SaleWithItems,
  cancelSale,
  getSalesWithItems,
} from "@/src/lib/sales";
import { supabase } from "@/src/lib/supabase";
import {
  Transaction,
  TransactionType,
  getTransactionsByCompany,
} from "@/src/lib/transactions";

type DateFilterKey = "today" | "week" | "month" | "all";
type TxTypeFilter = "all" | TransactionType;
type SellerFilter = "all" | "none" | string;

function toLocalDateStr(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return "";
}

function getDateRange(filter: DateFilterKey): { startDate: string; endDate: string } | null {
  if (filter === "all") return null;

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

function inDateRange(raw: string, filter: DateFilterKey): boolean {
  if (filter === "all") return true;
  const range = getDateRange(filter);
  if (!range) return true;
  const d = toLocalDateStr(raw);
  if (!d) return false;
  return d >= range.startDate && d <= range.endDate;
}

const DATE_FILTERS: { key: DateFilterKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "all", label: "General" },
];

const TX_TYPE_FILTERS: { key: TxTypeFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "income", label: "Ingreso" },
  { key: "expense", label: "Gasto" },
];

export function SalesHistoryContent() {
  const { company, role, userId, loading } = useCompany();
  const { showToast } = useToast();
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [saleToCancel, setSaleToCancel] = useState<SaleWithItems | null>(null);

  const [salesDateFilter, setSalesDateFilter] = useState<DateFilterKey>("all");
  const [txDateFilter, setTxDateFilter] = useState<DateFilterKey>("all");
  const [txTypeFilter, setTxTypeFilter] = useState<TxTypeFilter>("all");
  const [sellerFilter, setSellerFilter] = useState<SellerFilter>("all");

  const companyIdRef = useRef<string | null>(null);

  const loadData = useCallback(async (companyId: string) => {
    setLoadingData(true);
    try {
      const [salesRes, custRes, txRes] = await Promise.allSettled([
        getSalesWithItems(companyId),
        getCustomersByCompany(companyId),
        getTransactionsByCompany(companyId),
      ]);

      if (salesRes.status === "fulfilled") setSales(salesRes.value);
      if (custRes.status === "fulfilled") setCustomers(custRes.value);
      if (txRes.status === "fulfilled") setTransactions(txRes.value);
    } catch (e: any) {
      if (__DEV__) console.error("Error cargando historial:", e);
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
      .channel(`sales-history-live-${companyId}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, loadData]);

  const filteredSales = useMemo(() => {
    let data = sales.filter((sale) => inDateRange(sale.created_at, salesDateFilter));

    if (role === "admin") {
      if (sellerFilter === "none") {
        data = data.filter((sale) => !sale.sold_by);
      } else if (sellerFilter !== "all") {
        data = data.filter((sale) => sale.sold_by === sellerFilter);
      }
    } else if (role === "employee" && userId) {
      data = data.filter((sale) => sale.sold_by === userId);
    }

    return data;
  }, [sales, salesDateFilter, role, sellerFilter, userId]);

  // Datos para gráfico de productos más vendidos
  const chartData = useMemo(() => {
    const productCounts: Record<string, { name: string; qty: number }> = {};
    let totalSalesCount = 0;

    const completedSales = filteredSales.filter((s) => s.status === "completed");
    totalSalesCount = completedSales.length;

    for (const sale of completedSales) {
      for (const item of sale.items) {
        if (!productCounts[item.product_id]) {
          productCounts[item.product_id] = { name: item.product_name, qty: 0 };
        }
        productCounts[item.product_id].qty += item.quantity;
      }
    }

    const sorted = Object.entries(productCounts)
      .map(([id, data]) => ({ ...data, id }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((item, index) => ({
        label: item.name,
        value: item.qty,
        isTop: index === 0,
      }));

    return { products: sorted, total: totalSalesCount };
  }, [filteredSales]);

  // Lista de empleados para el selector
  const employeesList = useMemo(() => {
    const sellersMap = new Map<string, string>();
    for (const sale of sales) {
      if (sale.sold_by && sale.employee_name) {
        sellersMap.set(sale.sold_by, sale.employee_name);
      }
    }
    return Array.from(sellersMap.entries()).map(([id, label]) => ({ id, label }));
  }, [sales]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const byDate = inDateRange(tx.transaction_date || tx.created_at || "", txDateFilter);
      const byType = txTypeFilter === "all" ? true : tx.type === txTypeFilter;
      return byDate && byType;
    });
  }, [transactions, txDateFilter, txTypeFilter]);

  const getSaleCustomerName = useCallback(
    (sale: SaleWithItems): string => {
      if (sale.customer_id) {
        const fromCustomer = customers.find((c) => c.id === sale.customer_id)?.name;
        if (fromCustomer) return fromCustomer;
      }
      const fallback = sale.customer_name?.trim();
      if (!fallback || fallback === "Venta mostrador") return "Venta en tienda";
      return fallback;
    },
    [customers],
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
        if (!relatedSale) return "Venta cancelada";
        const displayName = getSaleCustomerName(relatedSale);
        return displayName ? `Venta cancelada - ${displayName}` : "Venta cancelada";
      }

      const saleMatch = rawDescription.match(/^Venta #([a-zA-Z0-9-]+)/i);
      if (saleMatch) {
        const saleId = saleMatch[1];
        const relatedSale = sales.find((sale) => sale.id === saleId);
        if (!relatedSale) return "Venta en tienda";
        return `Venta - ${getSaleCustomerName(relatedSale)}`;
      }

      return rawDescription;
    },
    [sales, getSaleCustomerName],
  );

  const getSaleItems = useCallback(
    (rawDescription: string): SaleItem[] => {
      const saleMatch = rawDescription.match(/^Venta #([a-zA-Z0-9-]+)/i);
      return saleMatch ? (sales.find((s) => s.id === saleMatch[1])?.items ?? []) : [];
    },
    [sales],
  );

  const getSaleSeller = useCallback(
    (rawDescription: string): string | null => {
      const match = rawDescription.match(/^(?:Venta|Cancelaci[oó]n venta) #([a-zA-Z0-9-]+)/i);
      if (!match) return null;
      const sale = sales.find((s) => s.id === match[1]);
      if (!sale?.sold_by) return null;
      if (sale.employee_role === "admin") return "Jefe";
      return sale.employee_name ?? null;
    },
    [sales],
  );

  const handleCancelSale = useCallback(
    (sale: SaleWithItems) => {
      if (cancellingId) return;
      setSaleToCancel(sale);
    },
    [cancellingId],
  );

  const executeCancelSale = useCallback(
    async (saleId: string) => {
      setCancellingId(saleId);
      try {
        await cancelSale(saleId);
        if (company?.id) {
          await Promise.allSettled([getProductsByCompany(company.id), loadData(company.id)]);
        }
        showToast("Venta cancelada correctamente", "success");
      } catch (e: any) {
        if (__DEV__) console.error("[CANCEL] Error en cancelSale:", e);
        showToast(e?.message ?? "Error al cancelar", "error");
      } finally {
        setCancellingId(null);
        setSaleToCancel(null);
      }
    },
    [company, loadData, showToast],
  );

  const isCancellingSelectedSale = !!saleToCancel && cancellingId === saleToCancel.id;

  if (loading || !company?.id) return null;

  return (
    <View style={{ gap: 18 }}>
      {loadingData && (
        <View style={styles.loadingInline}>
          <ActivityIndicator size="small" color={C.textMuted} />
        </View>
      )}

      <View style={styles.block}>
        <Text style={styles.sectionSubtitle}>Ventas</Text>

        {/* Selector de fecha */}
        <View style={styles.filterWrap}>
          {DATE_FILTERS.map((f) => (
            <TouchableOpacity
              key={`sales-${f.key}`}
              style={[
                styles.filterChip,
                salesDateFilter === f.key && styles.filterChipActive,
              ]}
              onPress={() => setSalesDateFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  salesDateFilter === f.key && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selector de vendedor (solo admin) */}
        {role === "admin" && (
          <View style={[styles.filterWrap, { marginTop: 8 }]}>
            <Text style={styles.sellerLabel}>Vendedor:</Text>
            <TouchableOpacity
              style={[
                styles.filterChip,
                sellerFilter === "all" && styles.filterChipActive,
              ]}
              onPress={() => setSellerFilter("all")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  sellerFilter === "all" && styles.filterChipTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                sellerFilter === "admin" && styles.filterChipActive,
              ]}
              onPress={() => setSellerFilter("admin")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  sellerFilter === "admin" && styles.filterChipTextActive,
                ]}
              >
                Jefe
              </Text>
            </TouchableOpacity>

            {employeesList.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={[
                  styles.filterChip,
                  sellerFilter === emp.id && styles.filterChipActive,
                ]}
                onPress={() => setSellerFilter(emp.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sellerFilter === emp.id && styles.filterChipTextActive,
                  ]}
                >
                  {emp.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Gráfico de productos más vendidos */}
        <View style={styles.chartCard}>
          <HorizontalBarChart
            data={chartData.products}
            title="Productos más vendidos"
            totalLabel="Total ventas:"
            totalValue={chartData.total}
            color={C.emerald}
          />
        </View>

        {filteredSales.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Sin ventas para estos filtros</Text>
          </View>
        ) : (
          filteredSales.map((sale) => {
            const isCancelled = sale.status === "cancelled";
            const isCancelling = cancellingId === sale.id;
            const canCancel = sale.status === "completed" && role === "admin";
            const customerName = getSaleCustomerName(sale);
            const compactCancelledCard = role === "employee" && isCancelled;

            return (
              <View key={sale.id} style={[styles.saleCard, isCancelled && styles.saleCardCancelled]}>
                <View
                  style={[
                    styles.saleAccent,
                    { backgroundColor: isCancelled ? C.danger : C.violet },
                  ]}
                />
                <View style={styles.saleBody}>
                  <View style={styles.saleTopRow}>
                    <Text style={styles.saleCustomer}>
                      {compactCancelledCard ? "Venta cancelada" : customerName}
                    </Text>
                    <Text style={[styles.saleAmount, isCancelled && styles.saleAmountCancelled]}>
                      ${Number(sale.total_amount).toFixed(2)}
                    </Text>
                  </View>

                  <Text style={styles.saleMeta}>
                    {new Date(sale.created_at).toLocaleString()}
                  </Text>
                  {!compactCancelledCard && sale.sold_by && (
                    <Text style={styles.sellerMeta}>
                      Vendedor: {sale.employee_role === "admin" ? "Jefe" : (sale.employee_name || "Empleado")}
                    </Text>
                  )}

                  {!compactCancelledCard && sale.items.length > 0 && (
                    <View style={styles.itemsList}>
                      {sale.items.map((item, idx) => (
                        <Text key={`${sale.id}-${idx}`} style={styles.itemText}>
                          - {item.product_name} x{item.quantity}
                        </Text>
                      ))}
                    </View>
                  )}

                  {isCancelled && !compactCancelledCard && <Text style={styles.cancelledBadge}>CANCELADA</Text>}

                  {canCancel && (
                    <TouchableOpacity
                      style={[styles.cancelBtn, isCancelling && styles.cancelBtnDisabled]}
                      onPress={() => handleCancelSale(sale)}
                      disabled={isCancelling}
                      activeOpacity={0.8}
                    >
                      {isCancelling ? (
                        <ActivityIndicator size="small" color={C.text} />
                      ) : (
                        <Text style={styles.cancelBtnText}>Cancelar venta</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionSubtitle}>Transacciones</Text>

        <View style={styles.filterWrap}>
          {DATE_FILTERS.map((f) => (
            <TouchableOpacity
              key={`tx-date-${f.key}`}
              style={[styles.filterChip, txDateFilter === f.key && styles.filterChipActive]}
              onPress={() => setTxDateFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  txDateFilter === f.key && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterWrap}>
          {TX_TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={`tx-type-${f.key}`}
              style={[styles.filterChip, txTypeFilter === f.key && styles.filterChipActive]}
              onPress={() => setTxTypeFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  txTypeFilter === f.key && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Sin transacciones para estos filtros</Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => {
            const amount = Number(tx.amount) || 0;
            const isIncome = tx.type === "income";
            const rawDescription = tx.description || "";
            const isCancelSaleTx = /^Cancelaci[oó]n venta #([a-zA-Z0-9-]+)/i.test(
              rawDescription,
            );
            const compactCancelledTx = role === "employee" && isCancelSaleTx;
            const description = getDisplayDescription(rawDescription);
            const saleItems = getSaleItems(rawDescription);
            const seller = getSaleSeller(rawDescription);
            return (
              <View key={tx.id} style={styles.txCard}>
                <View
                  style={[
                    styles.saleAccent,
                    {
                      backgroundColor: compactCancelledTx
                        ? C.danger
                        : isIncome
                          ? C.emerald
                          : C.danger,
                    },
                  ]}
                />
                <View style={styles.saleBody}>
                  <View style={styles.saleTopRow}>
                    <Text style={styles.txDescription}>
                      {compactCancelledTx ? "Venta cancelada" : description}
                    </Text>
                    <Text
                      style={[
                        styles.txAmount,
                        compactCancelledTx
                          ? styles.expenseAmount
                          : isIncome
                            ? styles.incomeAmount
                            : styles.expenseAmount,
                      ]}
                    >
                      {compactCancelledTx ? "-" : isIncome ? "+" : "-"}${amount.toFixed(2)}
                    </Text>
                  </View>
                  {!compactCancelledTx && tx.category_name && (
                    <Text style={styles.txCategory}>{tx.category_name}</Text>
                  )}
                  <Text style={styles.saleMeta}>
                    {tx.transaction_date || new Date(tx.created_at).toLocaleDateString()}
                  </Text>
                  {!compactCancelledTx && seller && (
                    <Text style={styles.sellerMeta}>Vendedor: {seller}</Text>
                  )}
                  {!compactCancelledTx && saleItems.length > 0 && (
                    <View style={styles.itemsList}>
                      {saleItems.map((item, idx) => (
                        <Text key={`${tx.id}-${idx}`} style={styles.itemText}>
                          - {item.product_name} x{item.quantity}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
      <FloatingModal
        visible={!!saleToCancel}
        onRequestClose={() => setSaleToCancel(null)}
        dismissOnBackdropPress={false}
        cardStyle={styles.cancelCard}
      >
          <View>
            <Text style={styles.cancelTitle}>¿Seguro que quieres cancelar esta venta?</Text>
            <View style={styles.cancelActions}>
              <TouchableOpacity
                style={[styles.cancelActionBtn, styles.cancelActionClose]}
                onPress={() => setSaleToCancel(null)}
                disabled={isCancellingSelectedSale}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelActionCloseText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelActionBtn, styles.cancelActionConfirm]}
                onPress={() => saleToCancel && executeCancelSale(saleToCancel.id)}
                disabled={isCancellingSelectedSale}
                activeOpacity={0.8}
              >
                {isCancellingSelectedSale ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <Text style={styles.cancelActionConfirmText}>Sí, cancelar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
      </FloatingModal>
    </View>
  );
}

export default function SalesScreen() {
  const { role, loading } = useCompany();
  const { colors, isDark } = useTheme();
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [cardFade, cardSlide]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={colors.emerald} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminScreenHeader
          title="Ventas"
          roleLabel={role === "admin" ? "Jefe" : "Empleado"}
          subtitle="Historial, cancelaciones y transacciones"
        />
        <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
          <SalesHistoryContent />
        </Animated.View>
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
    paddingHorizontal: 20,
    paddingBottom: 44,
    gap: 18,
  },
  loadingInline: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  block: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.inputBg,
  },
  filterChipActive: {
    borderColor: C.emerald,
    backgroundColor: "rgba(15, 94, 60, 0.1)",
  },
  filterChipText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: C.emeraldLight,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 13,
  },
  saleCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: C.inputBg,
  },
  saleCardCancelled: {
    opacity: 0.85,
  },
  saleAccent: {
    width: 4,
  },
  saleBody: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  saleTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  saleCustomer: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  saleAmount: {
    color: C.violet,
    fontSize: 14,
    fontWeight: "800",
  },
  saleAmountCancelled: {
    color: C.textMuted,
    textDecorationLine: "line-through",
  },
  saleMeta: {
    color: C.textMuted,
    fontSize: 11,
  },
  sellerMeta: {
    color: C.text,
    fontSize: 11,
    fontWeight: "600",
  },
  itemsList: {
    gap: 2,
    marginTop: 2,
  },
  itemText: {
    color: C.text,
    fontSize: 12,
  },
  cancelledBadge: {
    color: C.danger,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  cancelBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.danger,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  cancelBtnDisabled: {
    opacity: 0.6,
  },
  cancelBtnText: {
    color: C.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  txCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: C.inputBg,
  },
  txDescription: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  txCategory: {
    color: C.emerald,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  txAmount: {
    fontSize: 13,
    fontWeight: "800",
  },
  incomeAmount: {
    color: C.emeraldLight,
  },
  expenseAmount: {
    color: C.danger,
  },
  cancelCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 14,
  },
  cancelTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  cancelActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelActionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelActionClose: {
    backgroundColor: "#F2F4F7",
  },
  cancelActionConfirm: {
    backgroundColor: C.danger,
  },
  cancelActionCloseText: {
    color: C.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },
  cancelActionConfirmText: {
    color: C.text,
    fontWeight: "800",
    fontSize: 13,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sellerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
    marginRight: 8,
    alignSelf: "center",
  },
});
