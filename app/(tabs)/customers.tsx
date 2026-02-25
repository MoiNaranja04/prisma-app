import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CustomerStats,
  getCustomerStats,
} from "../../src/services/customers";
import { C } from "../../src/constants/colors";
import { useCompany } from "../../src/hooks/useCompany";

export default function CustomersScreen() {
  const { company, loading } = useCompany();
  const [stats, setStats] = useState<CustomerStats[]>([]);
  const companyIdRef = useRef<string | null>(null);

  // ─── Cargar stats ───────────────────────────────────────────────────────
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

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={C.emerald} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionSubtitle}>
          {stats.length} cliente{stats.length !== 1 ? "s" : ""} registrado
          {stats.length !== 1 ? "s" : ""}
        </Text>

        {/* Lista */}
        {stats.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Sin clientes registrados</Text>
          </View>
        ) : (
          stats.map((cust) => {
            const hasSpent = cust.total_spent > 0;

            return (
              <View key={cust.customer_id} style={styles.card}>
                <View style={[styles.accent, hasSpent && styles.accentActive]} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{cust.name}</Text>
                  <View style={styles.cardRow}>
                    <View style={styles.cardStat}>
                      <Text style={styles.cardStatLabel}>Total gastado</Text>
                      <Text
                        style={[
                          styles.cardStatValue,
                          hasSpent && styles.cardStatValueGreen,
                        ]}
                      >
                        ${cust.total_spent.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.cardStat}>
                      <Text style={styles.cardStatLabel}>Compras</Text>
                      <Text style={styles.cardStatValue}>
                        {cust.total_sales}
                      </Text>
                    </View>
                    <View style={styles.cardStat}>
                      <Text style={styles.cardStatLabel}>Ultima compra</Text>
                      <Text style={styles.cardStatValue}>
                        {cust.last_purchase ?? "Sin compras"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
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
    paddingBottom: 40,
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

  // Empty
  emptyBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 14,
  },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: C.emerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  accent: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: C.border,
  },
  accentActive: {
    backgroundColor: C.emerald,
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  cardName: {
    color: C.text,
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
    color: C.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  cardStatValue: {
    color: C.text,
    fontSize: 13,
    fontWeight: "600",
  },
  cardStatValueGreen: {
    color: C.emeraldLight,
  },
});
