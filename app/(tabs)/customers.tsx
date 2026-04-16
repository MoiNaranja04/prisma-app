import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../../src/context/ThemeContext";
import { useCompany } from "../../src/hooks/useCompany";
import {
    CustomerStats,
    getCustomerStats,
} from "../../src/services/customers";

export default function CustomersScreen() {
    const { company, loading } = useCompany();
    const { colors, isDark, toggleTheme } = useTheme();
    const [stats, setStats] = useState<CustomerStats[]>([]);
    const companyIdRef = useRef<string | null>(null);
    const cardFade = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(10)).current;
    const scrollY = useRef(new Animated.Value(0)).current;

    const headerPadding = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [16, 6],
        extrapolate: "clamp",
    });

    const loadStats = useCallback(async (companyId: string) => {
        try {
            const data = await getCustomerStats(companyId);
            setStats(data);
        } catch (e: any) {
            if (__DEV__) console.error("Error cargando stats de clientes:", e);
        }
    }, []);

    useEffect(() => {
        if (!company?.id) return;
        if (companyIdRef.current === company.id) return;
        companyIdRef.current = company.id;
        loadStats(company.id);
    }, [company, loadStats]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(cardFade, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(cardSlide, { toValue: 0, duration: 320, useNativeDriver: true }),
        ]).start();
    }, [cardFade, cardSlide]);

    const bgColor = isDark ? colors.bg : "#F0F4F3";

    if (loading) {
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
                        source={require("../../assets/images/logo.png")}
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

                {/* Title */}
                <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
                    <Text style={[styles.screenTitle, { color: colors.text }]}>Clientes</Text>
                    <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
                        {stats.length} cliente{stats.length !== 1 ? "s" : ""} registrado{stats.length !== 1 ? "s" : ""}
                    </Text>
                </Animated.View>

                {/* Stats Summary */}
                {stats.length > 0 && (
                    <Animated.View style={[styles.statsCard, { backgroundColor: colors.card, opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
                        <View style={styles.statsRow}>
                            <View style={styles.statsItem}>
                                <View style={[styles.statsIcon, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                                    <Feather name="users" size={18} color={colors.emerald} />
                                </View>
                                <Text style={[styles.statsValue, { color: colors.text }]}>{stats.length}</Text>
                                <Text style={[styles.statsLabel, { color: colors.textMuted }]}>Total</Text>
                            </View>
                            <View style={styles.statsDivider} />
                            <View style={styles.statsItem}>
                                <View style={[styles.statsIcon, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                                    <Feather name="shopping-bag" size={18} color={colors.emerald} />
                                </View>
                                <Text style={[styles.statsValue, { color: colors.text }]}>
                                    {stats.reduce((acc, c) => acc + c.total_sales, 0)}
                                </Text>
                                <Text style={[styles.statsLabel, { color: colors.textMuted }]}>Compras</Text>
                            </View>
                            <View style={styles.statsDivider} />
                            <View style={styles.statsItem}>
                                <View style={[styles.statsIcon, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                                    <Feather name="dollar-sign" size={18} color={colors.emerald} />
                                </View>
                                <Text style={[styles.statsValue, { color: colors.text }]}>
                                    ${stats.reduce((acc, c) => acc + c.total_spent, 0).toFixed(0)}
                                </Text>
                                <Text style={[styles.statsLabel, { color: colors.textMuted }]}>Ingresos</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Clients List */}
                <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
                    {stats.length === 0 ? (
                        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
                                <Feather name="users" size={32} color="#D1D5DB" />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin clientes</Text>
                            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                Los clientes que atiendas aparecerán aquí
                            </Text>
                        </View>
                    ) : (
                        stats.map((cust) => {
                            const hasSpent = cust.total_spent > 0;

                            return (
                                <View key={cust.customer_id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={[styles.accent, { backgroundColor: hasSpent ? colors.emerald : colors.border }]} />
                                    <View style={styles.cardBody}>
                                        <Text style={[styles.cardName, { color: colors.text }]}>{cust.name}</Text>
                                        <View style={styles.cardRow}>
                                            <View style={styles.cardStat}>
                                                <Text style={[styles.cardStatLabel, { color: colors.textMuted }]}>Total gastado</Text>
                                                <Text
                                                    style={[
                                                        styles.cardStatValue,
                                                        { color: colors.text },
                                                        hasSpent && { color: colors.emerald },
                                                    ]}
                                                >
                                                    ${cust.total_spent.toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={styles.cardStat}>
                                                <Text style={[styles.cardStatLabel, { color: colors.textMuted }]}>Compras</Text>
                                                <Text style={[styles.cardStatValue, { color: colors.text }]}>
                                                    {cust.total_sales}
                                                </Text>
                                            </View>
                                            <View style={styles.cardStat}>
                                                <Text style={[styles.cardStatLabel, { color: colors.textMuted }]}>Ultima compra</Text>
                                                <Text style={[styles.cardStatValue, { color: colors.text }]}>
                                                    {cust.last_purchase ?? "—"}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </Animated.View>
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

    /* Title */
    screenTitle: {
        fontSize: 22,
        fontWeight: "700",
        marginTop: 20,
        marginBottom: 4,
    },
    screenSubtitle: {
        fontSize: 14,
        marginBottom: 20,
    },

    /* Stats Card */
    statsCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    statsItem: {
        flex: 1,
        alignItems: "center",
    },
    statsIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    statsValue: {
        fontSize: 20,
        fontWeight: "800",
    },
    statsLabel: {
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 2,
    },
    statsDivider: {
        width: 1,
        height: 50,
        backgroundColor: "#E6E9EF",
    },

    /* Empty */
    emptyBox: {
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderStyle: "dashed",
    },
    emptyIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: { fontSize: 16, fontWeight: "700" },
    emptyText: { fontSize: 13, textAlign: "center" },

    /* Card */
    card: {
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: "row",
        marginBottom: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    accent: {
        width: 4,
        alignSelf: "stretch",
    },
    cardBody: {
        flex: 1,
        padding: 16,
    },
    cardName: {
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 10,
    },
    cardRow: {
        flexDirection: "row",
    },
    cardStat: {
        flex: 1,
    },
    cardStatLabel: {
        fontSize: 10,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginBottom: 2,
    },
    cardStatValue: { fontSize: 13, fontWeight: "600" },
});
