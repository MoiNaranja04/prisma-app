import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Clipboard,
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
import { supabase } from "@/src/lib/supabase";

export default function EmployeesScreen() {
  const { company, role, userId, loading } = useCompany();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<
    { id: string; user_id: string; name: string; role: string }[]
  >([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);

  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [cardFade, cardSlide]);

  useEffect(() => {
    if (!company?.id || role !== "admin") return;

    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const { data } = await supabase
          .from("company_users")
          .select("id, user_id, name, role")
          .eq("company_id", company.id)
          .order("role", { ascending: true })
          .order("name", { ascending: true });
        setEmployees(data ?? []);
      } catch {} finally { setLoadingEmployees(false); }
    };
    loadEmployees();
  }, [company?.id, role]);

  const handleCopyInviteCode = useCallback(() => {
    if (!company?.invite_code) return;
    try {
      Clipboard.setString(company.invite_code);
      showToast("Código copiado al portapapeles", "success");
    } catch {}
  }, [company, showToast]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.emerald} />
      </View>
    );
  }

  const admins = employees.filter((e) => e.role === "admin");
  const staff = employees.filter((e) => e.role !== "admin");

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}>
      <SecondaryScreenHeader title="Empleados" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
          {/* Invite code card */}
          {company?.invite_code && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.inviteHeader}>
                <View style={[styles.inviteIconWrap, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(15,94,60,0.08)" }]}>
                  <Feather name="link" size={18} color={colors.emerald} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inviteTitle, { color: colors.text }]}>Código de invitación</Text>
                  <Text style={[styles.inviteSubtitle, { color: colors.textMuted }]}>
                    Comparte este código para que empleados se unan
                  </Text>
                </View>
              </View>
              <View style={[styles.codeBox, { backgroundColor: isDark ? colors.bg : "#F7F9FB", borderColor: colors.border }]}>
                <Text style={[styles.codeText, { color: colors.text }]}>
                  {showInviteCode ? company.invite_code : "••••••••"}
                </Text>
                <View style={styles.codeActions}>
                  <TouchableOpacity
                    onPress={() => setShowInviteCode((v) => !v)}
                    style={[styles.codeBtn, { backgroundColor: isDark ? colors.card : "#FFFFFF" }]}
                    activeOpacity={0.7}
                  >
                    <Feather name={showInviteCode ? "eye-off" : "eye"} size={16} color={colors.emerald} />
                  </TouchableOpacity>
                  {showInviteCode && (
                    <TouchableOpacity
                      onPress={handleCopyInviteCode}
                      style={[styles.codeBtn, { backgroundColor: isDark ? colors.card : "#FFFFFF" }]}
                      activeOpacity={0.7}
                    >
                      <Feather name="copy" size={16} color={colors.emerald} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Team stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: colors.emerald }]}>{employees.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: colors.emerald }]}>{admins.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Jefes</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: colors.emerald }]}>{staff.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Empleados</Text>
            </View>
          </View>

          {/* Employee list */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.emerald }]}>EQUIPO</Text>

            {loadingEmployees ? (
              <ActivityIndicator size="small" color={colors.textMuted} style={{ marginTop: 8 }} />
            ) : employees.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin miembros aún</Text>
            ) : (
              employees.map((emp, index) => (
                <View
                  key={emp.id}
                  style={[
                    styles.employeeRow,
                    index < employees.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : "#F0F0F0" },
                  ]}
                >
                  <View
                    style={[
                      styles.employeeAvatar,
                      { backgroundColor: emp.role === "admin" ? colors.emerald : (isDark ? "#475569" : "#94A3B8") },
                    ]}
                  >
                    <Text style={styles.employeeAvatarText}>
                      {(emp.name || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.employeeName, { color: colors.text }]}>
                      {emp.name || "Sin nombre"}
                    </Text>
                    <Text style={[styles.employeeRole, { color: colors.textMuted }]}>
                      {emp.role === "admin" ? "Administrador" : "Empleado"}
                    </Text>
                  </View>
                  {emp.user_id === userId && (
                    <View style={[styles.youBadge, { backgroundColor: colors.emerald }]}>
                      <Text style={styles.youBadgeText}>Tú</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  inviteIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteTitle: { fontSize: 15, fontWeight: "700" },
  inviteSubtitle: { fontSize: 12, marginTop: 2 },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  codeText: { fontSize: 18, fontWeight: "800", letterSpacing: 3 },
  codeActions: { flexDirection: "row", gap: 8 },
  codeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  statNumber: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500", marginTop: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 14,
  },
  emptyText: { fontSize: 13, marginTop: 4 },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  employeeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  employeeAvatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  employeeName: { fontSize: 15, fontWeight: "600" },
  employeeRole: { fontSize: 12, marginTop: 2 },
  youBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  youBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
});
