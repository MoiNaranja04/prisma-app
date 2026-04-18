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
import { SecondaryScreenHeader } from "@/src/components/ui/SecondaryScreenHeader";
import ThemedTextInput from "@/src/components/ui/ThemedTextInput";
import { useTheme } from "@/src/context/ThemeContext";
import { useToast } from "@/src/context/ToastContext";
import { useCompany } from "@/src/hooks/useCompany";
import { supabase } from "@/src/lib/supabase";

export default function CompanyScreen() {
  const { company, loading } = useCompany();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [companyCurrency, setCompanyCurrency] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);

  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardFade, cardSlide]);

  useEffect(() => {
    if (company) {
      setCompanyName(company.name);
      setCompanyCurrency(company.currency);
    }
  }, [company]);

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

  if (loading) {
    return (
      <View
        style={[styles.root, styles.centered, { backgroundColor: colors.bg }]}
      >
        <ActivityIndicator size="large" color={colors.emerald} />
      </View>
    );
  }

  const hasChanges =
    companyName.trim() !== (company?.name ?? "") ||
    companyCurrency.trim() !== (company?.currency ?? "");

  return (
    <View
      style={[styles.root, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}
    >
      <SecondaryScreenHeader title="Empresa" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}
        >
          {/* Company info card */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Company avatar */}
            <View style={styles.companyHeader}>
              <View
                style={[
                  styles.companyAvatar,
                  { backgroundColor: colors.emerald },
                ]}
              >
                <Feather name="briefcase" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.companyDisplayName, { color: colors.text }]}
                >
                  {company?.name ?? "Mi empresa"}
                </Text>
                <Text style={[styles.companyType, { color: colors.textMuted }]}>
                  {company?.business_type ?? "Negocio"}
                </Text>
              </View>
            </View>

            {/* Edit fields */}
            <View style={styles.fieldGroup}>
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
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                Tipo de negocio
              </Text>
              <View
                style={[
                  styles.readOnlyField,
                  {
                    backgroundColor: isDark ? colors.bg : "#F7F9FB",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather name="briefcase" size={16} color={colors.textMuted} />
                <Text style={[styles.readOnlyText, { color: colors.text }]}>
                  {company?.business_type ?? "—"}
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
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
            </View>

            {hasChanges && (
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
                    <Feather name="save" size={16} color="#FFF" />
                    <Text style={styles.saveBtnText}>Guardar cambios</Text>
                  </>
                )}
              </TouchableOpacity>
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
    padding: 20,
    marginBottom: 20,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  companyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  companyDisplayName: { fontSize: 18, fontWeight: "700" },
  companyType: { fontSize: 13, marginTop: 3, textTransform: "capitalize" },
  fieldGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  readOnlyText: {
    fontSize: 15,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
