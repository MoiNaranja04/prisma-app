import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FloatingModal } from "@/src/components/ui/FloatingModal";
import { SecondaryScreenHeader } from "@/src/components/ui/SecondaryScreenHeader";
import ThemedTextInput from "@/src/components/ui/ThemedTextInput";
import { useTheme } from "@/src/context/ThemeContext";
import { useToast } from "@/src/context/ToastContext";
import { useCompany } from "@/src/hooks/useCompany";
import { supabase } from "@/src/lib/supabase";

export default function SecurityScreen() {
  const { loading } = useCompany();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast("Contraseña actualizada correctamente", "success");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast("Error al cambiar la contraseña. Intenta nuevamente.", "error");
    } finally { setSavingPassword(false); }
  }, [newPassword, confirmPassword, showToast]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.emerald} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}>
      <SecondaryScreenHeader title="Seguridad" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
          {/* Security actions */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.emerald }]}>SEGURIDAD</Text>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.6}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(15,94,60,0.08)" }]}>
                <Feather name="lock" size={18} color={colors.emerald} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Cambiar contraseña</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>
                  Actualiza tu contraseña de acceso
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Password modal */}
      <FloatingModal
        visible={showPasswordModal}
        onRequestClose={() => setShowPasswordModal(false)}
        cardStyle={[styles.modalContainer, { backgroundColor: colors.card }]}
      >
        <View>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Cambiar contraseña</Text>
          <ThemedTextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
            placeholder="Nueva contraseña"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />
          <ThemedTextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, marginBottom: 16 }]}
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
              onPress={() => { setShowPasswordModal(false); setNewPassword(""); setConfirmPassword(""); }}
            >
              <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Cancelar</Text>
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontSize: 15, fontWeight: "600" },
  actionSubtitle: { fontSize: 12, marginTop: 2 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  modalContainer: { padding: 24, width: "100%", maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
  },
  modalBtnText: { fontSize: 14, fontWeight: "600" },
  modalBtnTextPrimary: { fontSize: 14, fontWeight: "600", color: "#FFF" },
});
