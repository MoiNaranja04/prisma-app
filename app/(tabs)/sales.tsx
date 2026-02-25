import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { C } from "../../src/constants/colors";
import { useToast } from "../../src/context/ToastContext";
import { useCompany } from "../../src/hooks/useCompany";
import { Customer, getCustomersByCompany } from "../../src/services/customers";
import { getProductsByCompany } from "../../src/services/products";
import {
  SaleItem,
  SaleWithItems,
  cancelSale,
  getSalesWithItems,
} from "../../src/services/sales";
import {
  Transaction,
  TransactionType,
  getTransactionsByCompany,
} from "../../src/services/transactions";

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

export default function SalesScreen() {
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

  const sellerOptions = useMemo(() => {
    const ids = Array.from(new Set(sales.map((s) => s.sold_by).filter(Boolean))) as string[];
    return ids.map((id) => ({ id, label: `Vendedor ${id.slice(0, 8)}` }));
  }, [sales]);

  const filteredSales = useMemo(() => {
    let data = sales.filter((sale) => inDateRange(sale.created_at, salesDateFilter));

    if (role === "admin") {
      if (sellerFilter === "none") {
        data = data.filter((sale) => !sale.sold_by);
      } else if (sellerFilter !== "all") {
        data = data.filter((sale) => sale.sold_by === sellerFilter);
      }
    }

    return data;
  }, [sales, salesDateFilter, role, sellerFilter]);

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

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={C.emerald} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loadingData && (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={C.textMuted} />
          </View>
        )}

        <View style={styles.block}>
          <Text style={styles.sectionSubtitle}>Ventas</Text>
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

          {role === "admin" && (
            <View style={styles.filterWrap}>
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
                  sellerFilter === "none" && styles.filterChipActive,
                ]}
                onPress={() => setSellerFilter("none")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    sellerFilter === "none" && styles.filterChipTextActive,
                  ]}
                >
                  Sin vendedor
                </Text>
              </TouchableOpacity>

              {sellerOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.filterChip,
                    sellerFilter === opt.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSellerFilter(opt.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      sellerFilter === opt.id && styles.filterChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

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
                      <Text style={styles.saleCustomer}>{customerName}</Text>
                      <Text style={[styles.saleAmount, isCancelled && styles.saleAmountCancelled]}>
                        ${Number(sale.total_amount).toFixed(2)}
                      </Text>
                    </View>

                    <Text style={styles.saleMeta}>
                      {new Date(sale.created_at).toLocaleString()}
                    </Text>
                    {sale.sold_by && (
                      <Text style={styles.saleMeta}>
                        Vendedor: {sale.sold_by === userId ? "Yo" : sale.sold_by.slice(0, 8)}
                      </Text>
                    )}

                    {sale.items.length > 0 && (
                      <View style={styles.itemsList}>
                        {sale.items.map((item, idx) => (
                          <Text key={`${sale.id}-${idx}`} style={styles.itemText}>
                            - {item.product_name} x{item.quantity}
                          </Text>
                        ))}
                      </View>
                    )}

                    {isCancelled && <Text style={styles.cancelledBadge}>CANCELADA</Text>}

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
              const description = getDisplayDescription(rawDescription);
              const saleItems = getSaleItems(rawDescription);
              return (
                <View key={tx.id} style={styles.txCard}>
                  <View
                    style={[
                      styles.saleAccent,
                      { backgroundColor: isIncome ? C.emerald : C.danger },
                    ]}
                  />
                  <View style={styles.saleBody}>
                    <View style={styles.saleTopRow}>
                      <Text style={styles.txDescription}>{description}</Text>
                      <Text
                        style={[
                          styles.txAmount,
                          isIncome ? styles.incomeAmount : styles.expenseAmount,
                        ]}
                      >
                        {isIncome ? "+" : "-"}${amount.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.saleMeta}>
                      {tx.transaction_date || new Date(tx.created_at).toLocaleDateString()}
                    </Text>
                    {saleItems.length > 0 && (
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
      </ScrollView>

      {saleToCancel && (
        <View style={styles.cancelOverlay}>
          <View style={styles.cancelCard}>
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
                onPress={() => executeCancelSale(saleToCancel.id)}
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
        </View>
      )}
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
    paddingBottom: 44,
    gap: 18,
  },
  loadingInline: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  block: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 12,
    shadowColor: C.emerald,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
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
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.inputBg,
  },
  filterChipActive: {
    borderColor: C.emerald,
    backgroundColor: "#134e2a",
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
    borderRadius: 14,
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
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.inputBg,
  },
  txDescription: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
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
  cancelOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  cancelCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
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
    backgroundColor: "#24322b",
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
});
