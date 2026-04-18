import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { ProductLineChart } from "@/src/components/ui/ProductLineChart";
import { APP_LOGO } from "@/src/constants/assets";
import { useTheme } from "@/src/context/ThemeContext";
import { useCompany } from "@/src/hooks/useCompany";
import {
    SaleWithItems,
    getSalesWithItems,
} from "@/src/lib/sales";
import { supabase } from "@/src/lib/supabase";

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

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
}

const chartColors = ['#0F5E3C', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#047857', '#065F46'];

export default function PerformanceScreen() {
    const { company, userId, loading: loadingCompany } = useCompany();
    const { colors, isDark, toggleTheme } = useTheme();
    const [sales, setSales] = useState<SaleWithItems[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilterKey>("all");

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
            Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(cardSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
    }, [cardFade, cardSlide]);

    const loadData = useCallback(async (companyId: string) => {
        setLoadingData(true);
        try {
            const data = await getSalesWithItems(companyId);
            setSales(data);
        } catch (e: any) {
            if (__DEV__) console.error("Error cargando rendimiento:", e);
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
            .channel(`performance-live-${companyId}`)
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

    const filteredSales = useMemo(() => {
        let data = sales.filter((s) => s.status === "completed" && s.sold_by === userId);

        if (dateFilter !== "all") {
            const range = getDateRange(dateFilter);
            if (range) {
                data = data.filter((s) => {
                    const d = toLocalDateStr(s.created_at);
                    if (!d) return false;
                    return d >= range.startDate && d <= range.endDate;
                });
            }
        }

        return data;
    }, [sales, dateFilter, userId]);

    const metrics = useMemo(() => {
        const totalSales = filteredSales.length;
        let totalUnitsSold = 0;
        let totalRevenue = 0;
        const productCounts: Record<string, { name: string; qty: number }> = {};

        for (const sale of filteredSales) {
            totalRevenue += Number(sale.total_amount) || 0;
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
            totalRevenue,
            bestSellingProduct: best?.name ?? "Sin ventas",
        };
    }, [filteredSales]);

    const chartData = useMemo(() => {
        const productTotals: Record<string, number> = {};

        for (const sale of filteredSales) {
            for (const item of sale.items) {
                productTotals[item.product_name] = (productTotals[item.product_name] || 0) + item.quantity;
            }
        }

        const data = Object.entries(productTotals)
            .map(([label, value], index) => ({
                label,
                value,
                color: chartColors[index % chartColors.length],
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);

        const total = filteredSales.reduce((sum, s) => sum + Number(s.total_amount), 0);

        return { data, total };
    }, [filteredSales]);

    const bgColor = isDark ? colors.bg : "#F0F4F3";

    if (loadingCompany) {
        return (
            <View style={[styles.root, styles.centered, { backgroundColor: bgColor }]}>
                <ActivityIndicator size="large" color={colors.emerald} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.root, { backgroundColor: bgColor }]}>
            <Animated.ScrollView
                contentContainerStyle={styles.scroll}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                {/* Top Bar */}
                <Animated.View style={[styles.topBar, { paddingTop: headerPadding }]}>
                    <Image
                        source={APP_LOGO}
                        style={styles.logoSmall}
                        resizeMode="contain"
                    />
                    <TouchableOpacity
                        onPress={() => { toggleTheme(); }}
                        style={[styles.themeBtn, { backgroundColor: isDark ? colors.card : "#FFFFFF" }]}
                        activeOpacity={0.7}
                    >
                        <Feather name={isDark ? "sun" : "moon"} size={18} color={colors.emerald} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Greeting */}
                <Text style={[styles.greeting, { color: isDark ? "#9CA3AF" : "#374151" }]}>
                    {getGreeting()}, aquí está tu rendimiento
                </Text>

                {/* Hero Card con métricas */}
                <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
                    <LinearGradient
                        colors={isDark ? ["#064E3B", "#0F766E"] : ["#166534", "#15803D"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroTop}>
                            <View>
                                <Text style={styles.heroLabel}>Total vendido</Text>
                                <Text style={styles.heroBalanceAmount}>${metrics.totalRevenue.toFixed(2)}</Text>
                            </View>
                        </View>

                        {/* Métricas */}
                        <View style={styles.heroMetrics}>
                            <View style={styles.heroMetricItem}>
                                <View style={styles.heroMetricDot}>
                                    <Feather name="shopping-bag" size={14} color="#4ADE80" />
                                </View>
                                <View>
                                    <Text style={styles.heroMetricLabel}>Ventas</Text>
                                    <Text style={styles.heroMetricValue}>{metrics.totalSales}</Text>
                                </View>
                            </View>
                            <View style={styles.heroMetricDivider} />
                            <View style={styles.heroMetricItem}>
                                <View style={[styles.heroMetricDot, { backgroundColor: "rgba(248,113,113,0.35)" }]}>
                                    <Feather name="package" size={14} color="#F87171" />
                                </View>
                                <View>
                                    <Text style={styles.heroMetricLabel}>Unidades</Text>
                                    <Text style={styles.heroMetricValue}>{metrics.totalUnitsSold}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Producto más vendido */}
                        {metrics.bestSellingProduct !== "Sin ventas" && (
                            <View style={styles.heroCompany}>
                                <Text style={styles.heroCompanyName}>🏆 {metrics.bestSellingProduct}</Text>
                                <View style={styles.heroChips}>
                                    <View style={[styles.heroChip, { backgroundColor: "rgba(134,239,172,0.3)" }]}>
                                        <Text style={styles.heroChipText}>Más vendido</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* Filtros de fecha */}
                <Animated.View style={[styles.filterRow, { opacity: cardFade }]}>
                    {DATE_FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[
                                styles.filterChip,
                                dateFilter === f.key && styles.filterChipActive,
                            ]}
                            onPress={() => setDateFilter(f.key)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    dateFilter === f.key && styles.filterChipTextActive,
                                ]}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>

                {loadingData && sales.length === 0 && (
                    <View style={styles.loadingInline}>
                        <ActivityIndicator size="small" color={colors.textMuted} />
                    </View>
                )}

                {/* Chart */}
                {chartData.data.length > 0 && (
                    <Animated.View
                        style={[styles.chartCard, { backgroundColor: colors.card, opacity: cardFade, transform: [{ translateY: cardSlide }] }]}
                    >
                        <ProductLineChart
                            data={chartData.data}
                            title="Mis ventas por producto"
                            total={chartData.total}
                            totalLabel="Total:"
                        />
                    </Animated.View>
                )}

                {/* Empty state */}
                {!loadingData && filteredSales.length === 0 && (
                    <Animated.View style={[styles.emptyCard, { backgroundColor: colors.card, opacity: cardFade }]}>
                        <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
                            <Feather name="bar-chart-2" size={32} color="#D1D5DB" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin ventas aún</Text>
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            Las ventas que registres aparecerán aquí
                        </Text>
                    </Animated.View>
                )}
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { justifyContent: "center", alignItems: "center" },
    loadingText: { fontSize: 14, marginTop: 12 },
    scroll: { paddingHorizontal: 20, paddingBottom: 40 },

    /* Top Bar */
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 16,
        marginBottom: 4,
    },
    logoSmall: { width: 100, height: 36 },
    themeBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },

    /* Greeting */
    greeting: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 20,
        marginBottom: 20,
        letterSpacing: -0.2,
    },

    /* Hero Card */
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
    },

    /* Filters */
    filterRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 20,
        flexWrap: "wrap",
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E6E9EF",
    },
    filterChipActive: {
        backgroundColor: "#166534",
        borderColor: "#166534",
    },
    filterChipText: {
        color: "#6B7280",
        fontSize: 13,
        fontWeight: "600",
    },
    filterChipTextActive: {
        color: "#FFFFFF",
    },

    loadingInline: {
        marginBottom: 14,
        alignItems: "flex-start",
    },

    /* Chart */
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

    /* Empty */
    emptyCard: {
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    emptyIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "700",
    },
    emptyText: {
        fontSize: 13,
        textAlign: "center",
    },
});
