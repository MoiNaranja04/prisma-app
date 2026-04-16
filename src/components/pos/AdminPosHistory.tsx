import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { C } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useCompany } from "../../hooks/useCompany";
import { Customer, getCustomersByCompany } from "../../services/customers";
import { getProductsByCompany } from "../../services/products";
import {
    SaleItem,
    SaleWithItems,
    cancelSale,
    getSalesWithItems,
} from "../../services/sales";
import { supabase } from "../../services/supabase";
import {
    Category,
    Transaction,
    TransactionType,
    getCategoriesByCompany,
    getTransactionsByCompany,
} from "../../services/transactions";
import { DistributionChart } from "../ui/DistributionChart"; // Reusing distribution chart
import { FloatingModal } from "../ui/FloatingModal";


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

export function AdminPosHistory() {
    const { company, role, userId, loading } = useCompany();
    const { showToast } = useToast();
    const { colors, isDark } = useTheme();
    const [sales, setSales] = useState<SaleWithItems[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [saleToCancel, setSaleToCancel] = useState<SaleWithItems | null>(null);

    const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");
    const [txTypeFilter, setTxTypeFilter] = useState<TxTypeFilter>("all");
    const [sellerFilter, setSellerFilter] = useState<SellerFilter>("all");

    const [activeTab, setActiveTab] = useState<"ventas" | "transacciones">("ventas");

    const companyIdRef = useRef<string | null>(null);

    const loadData = useCallback(async (companyId: string) => {
        setLoadingData(true);
        try {
            const [salesRes, custRes, txRes, catRes] = await Promise.allSettled([
                getSalesWithItems(companyId),
                getCustomersByCompany(companyId),
                getTransactionsByCompany(companyId),
                getCategoriesByCompany(companyId),
            ]);

            if (salesRes.status === "fulfilled") setSales(salesRes.value);
            if (custRes.status === "fulfilled") setCustomers(custRes.value);
            if (txRes.status === "fulfilled") setTransactions(txRes.value);
            if (catRes.status === "fulfilled") setCategories(catRes.value);
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
            .channel(`sales-history-pos-${companyId}`)
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
        let data = sales.filter((sale) => inDateRange(sale.created_at, dateFilter));

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
    }, [sales, dateFilter, role, sellerFilter, userId]);

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

        const chartColors = [
            "#0F5E3C",
            "#10B981",
            "#34D399",
            "#6EE7B7",
            "#A7F3D0",
            "#047857",
            "#065F46",
        ];

        const sorted = Object.entries(productCounts)
            .map(([id, data]) => ({ ...data, id }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5)
            .map((item, index) => ({
                label: item.name,
                value: item.qty,
                color: chartColors[index % chartColors.length]
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
            const byDate = inDateRange(tx.transaction_date || tx.created_at || "", dateFilter);
            const byType = txTypeFilter === "all" ? true : tx.type === txTypeFilter;
            return byDate && byType;
        });
    }, [transactions, dateFilter, txTypeFilter]);

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
        <View style={styles.block}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Historial</Text>
                {loadingData && <ActivityIndicator size="small" color={C.textMuted} />}
            </View>

            {/* Date Filter (Shared) */}
            <View style={styles.filterWrap}>
                {DATE_FILTERS.map((f) => {
                    const isActive = dateFilter === f.key;
                    return (
                        <TouchableOpacity
                            key={`date-${f.key}`}
                            style={[
                                styles.filterChip,
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
                            onPress={() => setDateFilter(f.key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    { color: isActive ? "#FFFFFF" : isDark ? colors.textMuted : "#6B7280" },
                                ]}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={[styles.tabContainer, { backgroundColor: isDark ? colors.bg : "#F1F5F4" }]}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === "ventas" && styles.tabBtnActive]}
                    onPress={() => setActiveTab("ventas")}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[
                            styles.tabText,
                            { color: "#6B7280" },
                            activeTab === "ventas" && styles.tabTextActive,
                        ]}
                    >
                        Ventas
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === "transacciones" && styles.tabBtnActive]}
                    onPress={() => setActiveTab("transacciones")}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[
                            styles.tabText,
                            { color: "#6B7280" },
                            activeTab === "transacciones" && styles.tabTextActive,
                        ]}
                    >
                        Transacciones
                    </Text>
                </TouchableOpacity>
            </View>


            {activeTab === "ventas" ? (
                <View style={styles.contentWrap}>
                    {/* Vendedor Filter */}
                    {role === "admin" && (
                        <View style={[styles.filterWrap, { marginBottom: 16 }]}>
                            <Text style={styles.sellerLabel}>Vendedor:</Text>

                            {/* Todos */}
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: sellerFilter === "all"
                                            ? "#166534"
                                            : isDark ? colors.card : "#FFFFFF",
                                    },
                                    sellerFilter !== "all" && {
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 3,
                                        elevation: 1,
                                    },
                                ]}
                                onPress={() => setSellerFilter("all")}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        { color: sellerFilter === "all" ? "#FFFFFF" : isDark ? colors.textMuted : "#6B7280" },
                                    ]}
                                >
                                    Todos
                                </Text>
                            </TouchableOpacity>

                            {/* Jefe */}
                            <TouchableOpacity
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: sellerFilter === "admin"
                                            ? "#166534"
                                            : isDark ? colors.card : "#FFFFFF",
                                    },
                                    sellerFilter !== "admin" && {
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 3,
                                        elevation: 1,
                                    },
                                ]}
                                onPress={() => setSellerFilter("admin")}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        { color: sellerFilter === "admin" ? "#FFFFFF" : isDark ? colors.textMuted : "#6B7280" },
                                    ]}
                                >
                                    Jefe
                                </Text>
                            </TouchableOpacity>

                            {/* Empleados */}
                            {employeesList.map((emp) => {
                                const isActive = sellerFilter === emp.id;
                                return (
                                    <TouchableOpacity
                                        key={emp.id}
                                        style={[
                                            styles.filterChip,
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
                                        onPress={() => setSellerFilter(emp.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[
                                                styles.filterChipText,
                                                { color: isActive ? "#FFFFFF" : isDark ? colors.textMuted : "#6B7280" },
                                            ]}
                                        >
                                            {emp.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Dashboard-like Chart for Products */}
                    {chartData.products.length > 0 && (
                        <View style={styles.chartCard}>
                            <DistributionChart
                                data={chartData.products}
                                title="Ventas por Producto"
                                total={chartData.total}
                            />
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
            ) : (
                <View style={styles.contentWrap}>
                    <View style={styles.filterWrap}>
                        {TX_TYPE_FILTERS.map((f) => {
                            const isActive = txTypeFilter === f.key;
                            return (
                                <TouchableOpacity
                                    key={`tx-type-${f.key}`}
                                    style={[
                                        styles.filterChip,
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
                                    onPress={() => setTxTypeFilter(f.key)}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.filterChipText,
                                            { color: isActive ? "#FFFFFF" : isDark ? colors.textMuted : "#6B7280" },
                                        ]}
                                    >
                                        {f.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
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
            )}
        </View>
    );
}

const styles = StyleSheet.create({
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: 0.5,
        color: C.text,
    },
    filterWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 8,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        height: 38,
        paddingHorizontal: 16,
    },
    filterChipActive: {},
    filterChipText: {
        fontSize: 12,
        fontWeight: "600",
    },
    filterChipTextActive: {},
    sellerLabel: {
        fontSize: 13,
        color: C.textMuted,
        fontWeight: "600",
        alignSelf: "center",
        marginRight: 4,
    },
    tabContainer: {
        flexDirection: "row",
        borderRadius: 12,
        padding: 3,
        marginBottom: 16,
        alignSelf: "center",
    },
    tabBtn: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 10,
    },
    tabBtnActive: {
        backgroundColor: "#166534",
    },
    tabText: {
        fontSize: 13,
        fontWeight: "600",
    },
    tabTextActive: {
        color: "#FFFFFF",
    },
    contentWrap: {
        gap: 12,
    },
    chartCard: {
        marginBottom: 16,
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
        padding: 16,
        gap: 6,
    },
    saleTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    saleCustomer: {
        color: C.text,
        fontSize: 15,
        fontWeight: "600",
        flex: 1,
        marginRight: 10,
    },
    saleAmount: {
        color: C.violet,
        fontSize: 16,
        fontWeight: "700",
    },
    saleAmountCancelled: {
        color: C.textMuted,
        textDecorationLine: "line-through",
    },
    saleMeta: {
        color: C.textMuted,
        fontSize: 12,
    },
    sellerMeta: {
        color: C.emerald,
        fontSize: 12,
        fontWeight: "500",
    },
    itemsList: {
        marginTop: 4,
        gap: 2,
    },
    itemText: {
        color: "#6B7280",
        fontSize: 12,
    },
    cancelledBadge: {
        color: C.danger,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1,
        marginTop: 8,
    },
    cancelBtn: {
        alignSelf: "flex-start",
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#F9FAFB",
    },
    cancelBtnDisabled: {
        opacity: 0.5,
    },
    cancelBtnText: {
        color: C.textMuted,
        fontSize: 12,
        fontWeight: "600",
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
        fontSize: 15,
        fontWeight: "600",
        flex: 1,
        marginRight: 10,
    },
    txAmount: {
        fontSize: 16,
        fontWeight: "700",
    },
    incomeAmount: {
        color: C.emerald,
    },
    expenseAmount: {
        color: C.danger,
    },
    txCategory: {
        color: "#6B7280",
        fontSize: 12,
        fontWeight: "500",
    },
    cancelCard: {
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 340,
    },
    cancelTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: C.text,
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 22,
    },
    cancelActions: {
        flexDirection: "row",
        gap: 12,
    },
    cancelActionBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelActionClose: {
        backgroundColor: C.inputBg,
        borderWidth: 1,
        borderColor: C.border,
    },
    cancelActionCloseText: {
        color: C.textMuted,
        fontSize: 14,
        fontWeight: "600",
    },
    cancelActionConfirm: {
        backgroundColor: C.danger,
        shadowColor: C.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    cancelActionConfirmText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
});
