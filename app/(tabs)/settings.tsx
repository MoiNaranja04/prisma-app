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
  View
} from "react-native";
import AdminScreenHeader from "../../src/components/ui/AdminScreenHeader";
import { FloatingModal } from "../../src/components/ui/FloatingModal";
import ThemedTextInput from "../../src/components/ui/ThemedTextInput";
import { useTheme } from "../../src/context/ThemeContext";
import { useToast } from "../../src/context/ToastContext";
import { useCompany } from "../../src/hooks/useCompany";
import { supabase } from "../../src/services/supabase";

export default function SettingsScreen() {
  const { company, role, userId, loading } = useCompany();
  const { showToast } = useToast();
  const { colors, isDark } = useTheme();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Logout
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Company edit (admin)
  const [companyName, setCompanyName] = useState("");
  const [companyCurrency, setCompanyCurrency] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);

  // Employees list (admin)
  const [employees, setEmployees] = useState<
    { id: string; user_id: string; name: string; role: string }[]
  >([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const loadProfile = async () => {
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
      } catch {
        // ignore
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (company) {
      setCompanyName(company.name);
      setCompanyCurrency(company.currency);
    }
  }, [company]);

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
      } catch {
        // ignore
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, [company?.id, role]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [cardFade, cardSlide]);

  const handleChangePassword = useCallback(async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      showToast("Contraseña actualizada correctamente", "success");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast("Error al cambiar la contraseña. Intenta nuevamente.", "error");
    } finally {
      setSavingPassword(false);
    }
  }, [newPassword, confirmPassword, showToast]);

  const handleSaveCompany = useCallback(async () => {
    if (!company?.id || !companyName.trim()) return;

    setSavingCompany(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: companyName.trim(),
          currency: companyCurrency.trim() || company.currency,
        })
        .eq("id", company.id);

      if (error) throw error;
      showToast("Datos de empresa actualizados", "success");
    } catch {
      showToast("Error al actualizar empresa. Intenta nuevamente.", "error");
    } finally {
      setSavingCompany(false);
    }
  }, [company, companyName, companyCurrency, showToast]);

  const confirmLogout = useCallback(async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
  }, []);

  const handleCopyInviteCode = useCallback(() => {
    if (!company?.invite_code) return;
    try {
      Clipboard.setString(company.invite_code);
      showToast("Código copiado al portapapeles", "success");
    } catch {
      // fallback: just show code
    }
  }, [company, showToast]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.emerald} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Cargando...
        </Text>
      </View>
    );
  }

  const hasCompanyChanges =
    companyName.trim() !== (company?.name ?? "") ||
    companyCurrency.trim() !== (company?.currency ?? "");

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminScreenHeader
          title="Ajustes"
          roleLabel={role === "admin" ? "Jefe" : "Empleado"}
          subtitle="Perfil, empresa, equipo y seguridad"
        />

        <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
          {/* ─── PERFIL ─── */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardAccent, { backgroundColor: colors.emerald }]} />
            <Text style={[styles.sectionLabel, { color: colors.emerald }]}>PERFIL</Text>

            {loadingProfile ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Feather name="user" size={16} color={colors.textMuted} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Nombre</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{userName}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="shield" size={16} color={colors.textMuted} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Rol</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {role === "admin" ? "Administrador" : "Empleado"}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="mail" size={16} color={colors.textMuted} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{userEmail}</Text>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border }]}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="lock" size={14} color={colors.emerald} />
              <Text style={[styles.actionBtnText, { color: colors.emerald }]}>
                Cambiar contraseña
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => setShowLogoutModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="log-out" size={14} color="#B42318" />
              <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>

          {/* ─── EMPRESA (solo admin) ─── */}
          {role === "admin" && company && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardAccent, { backgroundColor: colors.emerald }]} />
            <Text style={[styles.sectionLabel, { color: colors.emerald }]}>EMPRESA</Text>

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              Nombre de empresa
            </Text>
            <ThemedTextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Nombre de empresa"
              placeholderTextColor={colors.textMuted}
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />

            <View style={styles.infoRow}>
              <Feather name="briefcase" size={16} color={colors.textMuted} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Tipo de negocio
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {company.business_type}
                </Text>
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
              Moneda
            </Text>
            <ThemedTextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={companyCurrency}
              onChangeText={setCompanyCurrency}
              placeholder="USD, VES, etc."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />

            {hasCompanyChanges && (
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.emerald }]}
                onPress={handleSaveCompany}
                disabled={savingCompany}
                activeOpacity={0.7}
              >
                {savingCompany ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Feather name="save" size={14} color="#FFF" />
                    <Text style={styles.saveBtnText}>Guardar cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Código de invitación */}
            <View style={styles.inviteSection}>
              <Text style={[styles.inviteLabel, { color: colors.emerald }]}>
                CÓDIGO INVITACIÓN
              </Text>
              <View style={styles.inviteRow}>
                <Text style={[styles.inviteCode, { color: colors.text }]}>
                  {showInviteCode ? company.invite_code : "••••••"}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowInviteCode((v) => !v)}
                  style={styles.inviteIconBtn}
                >
                  <Feather
                    name={showInviteCode ? "eye-off" : "eye"}
                    size={16}
                    color={colors.emerald}
                  />
                </TouchableOpacity>
                {showInviteCode && (
                  <TouchableOpacity
                    onPress={handleCopyInviteCode}
                    style={styles.inviteIconBtn}
                  >
                    <Feather name="copy" size={16} color={colors.emerald} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Lista de empleados */}
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.emerald, marginTop: 18 },
              ]}
            >
              EQUIPO
            </Text>
            {loadingEmployees ? (
              <ActivityIndicator
                size="small"
                color={colors.textMuted}
                style={{ marginTop: 8 }}
              />
            ) : employees.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Sin miembros
              </Text>
            ) : (
              employees.map((emp) => (
                <View
                  key={emp.id}
                  style={[styles.employeeRow, { borderBottomColor: colors.border }]}
                >
                  <View
                    style={[
                      styles.employeeAvatar,
                      {
                        backgroundColor:
                          emp.role === "admin" ? colors.emerald : colors.cyan,
                      },
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
                    <View
                      style={[styles.youBadge, { backgroundColor: colors.emerald }]}
                    >
                      <Text style={styles.youBadgeText}>Tú</Text>
                    </View>
                  )}
                </View>
              ))
            )}
            </View>
          )}
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal cambiar contraseña */}
      <FloatingModal
        visible={showPasswordModal}
        onRequestClose={() => setShowPasswordModal(false)}
        cardStyle={[
          styles.modalContainer,
          { backgroundColor: colors.card },
        ]}
      >
          <View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Cambiar contraseña
            </Text>

            <ThemedTextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                  marginBottom: 12,
                },
              ]}
              placeholder="Nueva contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />
            <ThemedTextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                  marginBottom: 16,
                },
              ]}
              placeholder="Confirmar contraseña"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.emerald, borderColor: colors.emerald }]}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalBtnTextPrimary}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
      </FloatingModal>

      {/* Modal logout */}
      <FloatingModal
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
        cardStyle={[
          styles.modalContainer,
          { backgroundColor: colors.card },
        ]}
      >
          <View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Cerrar sesión
            </Text>
            <Text style={[styles.modalText, { color: colors.textMuted }]}>
              ¿Estás seguro de que quieres cerrar sesión?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDestructive]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalBtnTextDestructive}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
      </FloatingModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEE4E2",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  logoutBtnText: {
    color: "#B42318",
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  inviteSection: {
    marginTop: 18,
  },
  inviteLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inviteCode: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 3,
  },
  inviteIconBtn: {
    padding: 4,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 4,
  },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  employeeAvatarText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "600",
  },
  employeeRole: {
    fontSize: 12,
    marginTop: 1,
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  youBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  modalContainer: {
    padding: 24,
    width: "100%",
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalBtnTextPrimary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  modalBtnDestructive: {
    backgroundColor: "#B42318",
    borderColor: "#B42318",
  },
  modalBtnTextDestructive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
