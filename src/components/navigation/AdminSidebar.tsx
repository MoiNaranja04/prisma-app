import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ThemedTextInput from "../../components/ui/ThemedTextInput";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { haptic } from "../../hooks/useHaptics";
import { supabase } from "../../services/supabase";

const SIDEBAR_RATIO = 1;
const SPRING_CONFIG = { damping: 22, stiffness: 220, mass: 0.8 };

type MenuItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  type: "navigate";
};

type InlineViewKey = "reports" | "employees" | "company" | "security";

type InlineBlock = {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Feather>["name"];
};

type ReportPeriodKey = "today" | "week" | "month" | "all";

type ReportSnapshot = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  totalSales: number;
  totalTransactions: number;
  bestSellingProduct: string;
  companyName: string;
};

const REPORT_PERIODS: Array<{ key: ReportPeriodKey; label: string }> = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "all", label: "General" },
];

const MENU_ITEMS: MenuItem[] = [
  { key: "reports", label: "Reportes", icon: "file-text", type: "navigate" },
  { key: "employees", label: "Empleados", icon: "users", type: "navigate" },
  { key: "company", label: "Empresa", icon: "briefcase", type: "navigate" },
  { key: "security", label: "Seguridad", icon: "shield", type: "navigate" },
];

const INLINE_VIEW_CONTENT: Record<
  InlineViewKey,
  {
    title: string;
    subtitle: string;
    blocks: InlineBlock[];
  }
> = {
  reports: {
    title: "Reportes",
    subtitle: "Resumen y exportacion",
    blocks: [
      {
        title: "Vista financiera",
        description: "Balance, ingresos y gastos del periodo",
        icon: "bar-chart-2",
      },
      {
        title: "Rendimiento",
        description: "Ventas, unidades y producto destacado",
        icon: "trending-up",
      },
      {
        title: "Exportar PDF",
        description: "Genera reporte para compartir o imprimir",
        icon: "download",
      },
    ],
  },
  employees: {
    title: "Empleados",
    subtitle: "Gestion del equipo",
    blocks: [
      {
        title: "Listado activo",
        description: "Consulta estado y acceso de cada perfil",
        icon: "users",
      },
      {
        title: "Roles y permisos",
        description: "Controla funciones para jefe y empleado",
        icon: "shield",
      },
      {
        title: "Actividad",
        description: "Revisa rendimiento y movimientos recientes",
        icon: "activity",
      },
    ],
  },
  company: {
    title: "Empresa",
    subtitle: "Datos y configuracion",
    blocks: [
      {
        title: "Informacion general",
        description: "Nombre, moneda y tipo de negocio",
        icon: "briefcase",
      },
      {
        title: "Preferencias",
        description: "Ajustes operativos de la compania",
        icon: "sliders",
      },
      {
        title: "Identidad",
        description: "Elementos visuales de la cuenta",
        icon: "layout",
      },
    ],
  },
  security: {
    title: "Seguridad",
    subtitle: "Acceso y proteccion",
    blocks: [
      {
        title: "Contrasena y acceso",
        description: "Actualiza credenciales y sesiones",
        icon: "lock",
      },
      {
        title: "Privacidad",
        description: "Controla proteccion y uso de datos",
        icon: "shield",
      },
      {
        title: "Cerrar sesion",
        description: "Salir de forma segura en este dispositivo",
        icon: "log-out",
      },
    ],
  },
};

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

interface AdminSidebarProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userRole: string;
  userId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  companyCurrency?: string | null;
  companyBusinessType?: string | null;
  companyInviteCode?: string | null;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  reportSnapshots?: Record<ReportPeriodKey, ReportSnapshot>;
  onExportReport?: (period: ReportPeriodKey) => void | Promise<void>;
  onCompanyUpdated?: (payload: { name: string; currency: string }) => void;
}

export function AdminSidebar({
  visible,
  onClose,
  userName,
  userEmail,
  userRole,
  userId,
  companyId,
  companyName,
  companyCurrency,
  companyBusinessType,
  companyInviteCode,
  onNavigate,
  onLogout,
  reportSnapshots,
  onExportReport,
  onCompanyUpdated,
}: AdminSidebarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { isDark, colors, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const progress = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeInlineView, setActiveInlineView] = useState<InlineViewKey | null>(
    null,
  );
  const [reportPeriod, setReportPeriod] = useState<ReportPeriodKey>("all");
  const [employees, setEmployees] = useState<
    { id: string; user_id: string; name: string; role: string }[]
  >([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [companyNameInput, setCompanyNameInput] = useState(companyName ?? "");
  const [companyCurrencyInput, setCompanyCurrencyInput] = useState(
    companyCurrency ?? "",
  );
  const [savingCompany, setSavingCompany] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const sidebarWidth = screenWidth * SIDEBAR_RATIO;

  const pendingNavigationRef = React.useRef<string | null>(null);
  const navigationFallbackTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const handleAnimationEnd = useCallback(() => {
    setIsMounted(false);
    setActiveInlineView(null);
    setReportPeriod("all");
    if (navigationFallbackTimeoutRef.current) {
      clearTimeout(navigationFallbackTimeoutRef.current);
      navigationFallbackTimeoutRef.current = null;
    }
    if (pendingNavigationRef.current) {
      const screen = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      onNavigate(screen);
    }
  }, [onNavigate]);

  const queueSidebarNavigation = useCallback(
    (screen: string) => {
      pendingNavigationRef.current = screen;
      onClose();
      if (navigationFallbackTimeoutRef.current) {
        clearTimeout(navigationFallbackTimeoutRef.current);
      }
      navigationFallbackTimeoutRef.current = setTimeout(() => {
        if (pendingNavigationRef.current === screen) {
          pendingNavigationRef.current = null;
          onNavigate(screen);
        }
        navigationFallbackTimeoutRef.current = null;
      }, 320);
    },
    [onClose, onNavigate],
  );

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      progress.value = withSpring(1, SPRING_CONFIG);
    } else {
      progress.value = withTiming(
        0,
        { duration: 220, easing: Easing.out(Easing.ease) },
        (finished) => {
          if (finished) {
            runOnJS(handleAnimationEnd)();
          }
        },
      );
    }
  }, [visible, progress, handleAnimationEnd]);

  useEffect(
    () => () => {
      if (navigationFallbackTimeoutRef.current) {
        clearTimeout(navigationFallbackTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setCompanyNameInput(companyName ?? "");
  }, [companyName]);

  useEffect(() => {
    setCompanyCurrencyInput(companyCurrency ?? "");
  }, [companyCurrency]);

  useEffect(() => {
    if (!companyId || userRole !== "admin" || activeInlineView !== "employees") {
      return;
    }
    let isActive = true;
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const { data } = await supabase
          .from("company_users")
          .select("id, user_id, name, role")
          .eq("company_id", companyId)
          .order("role", { ascending: true })
          .order("name", { ascending: true });
        if (isActive) {
          setEmployees(data ?? []);
        }
      } finally {
        if (isActive) {
          setLoadingEmployees(false);
        }
      }
    };
    void loadEmployees();
    return () => {
      isActive = false;
    };
  }, [activeInlineView, companyId, userRole]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    pointerEvents: progress.value > 0.01 ? ("auto" as const) : ("none" as const),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-sidebarWidth, 0]) },
    ],
  }));

  const createItemStyle = (index: number) =>
    useAnimatedStyle(() => ({
      opacity: interpolate(
        progress.value,
        [0.3 + index * 0.06, 0.5 + index * 0.06],
        [0, 1],
        "clamp",
      ),
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0.3 + index * 0.06, 0.5 + index * 0.06],
            [-12, 0],
            "clamp",
          ),
        },
      ],
    }));

  const itemStyles = MENU_ITEMS.map((_, i) => createItemStyle(i));
  const logoutStyle = createItemStyle(MENU_ITEMS.length);

  const handleItemPress = useCallback(
    (item: MenuItem) => {
      haptic.light();
      if (item.key === "reports") {
        setReportPeriod("all");
      }
      setActiveInlineView(item.key as InlineViewKey);
    },
    [],
  );

  const handleProfilePress = useCallback(() => {
    haptic.light();
    setShowProfileModal(true);
  }, []);

  const handleLogoutPress = useCallback(() => {
    haptic.warning();
    onLogout();
  }, [onLogout]);

  const handleInlineReportExportPress = useCallback(() => {
    haptic.light();
    if (onExportReport) {
      onExportReport(reportPeriod);
      return;
    }
    queueSidebarNavigation("reports");
  }, [onExportReport, queueSidebarNavigation, reportPeriod]);

  const handleCopyInviteCode = useCallback(() => {
    if (!companyInviteCode) return;
    if (typeof Clipboard?.setString === "function") {
      Clipboard.setString(companyInviteCode);
      showToast("Codigo copiado al portapapeles", "success");
    }
  }, [companyInviteCode, showToast]);

  const handleSaveCompany = useCallback(async () => {
    if (!companyId || !companyNameInput.trim() || savingCompany) return;
    setSavingCompany(true);
    try {
      const payload = {
        name: companyNameInput.trim(),
        currency: companyCurrencyInput.trim() || companyCurrency || "",
      };
      const { error } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", companyId);
      if (error) throw error;
      onCompanyUpdated?.(payload);
      showToast("Datos de empresa actualizados", "success");
    } catch {
      showToast("Error al actualizar empresa. Intenta nuevamente.", "error");
    } finally {
      setSavingCompany(false);
    }
  }, [
    companyCurrency,
    companyCurrencyInput,
    companyId,
    companyNameInput,
    onCompanyUpdated,
    savingCompany,
    showToast,
  ]);

  const handleChangePassword = useCallback(async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      showToast("La contrasena debe tener al menos 6 caracteres", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Las contrasenas no coinciden", "error");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast("Contrasena actualizada correctamente", "success");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast("Error al cambiar la contrasena. Intenta nuevamente.", "error");
    } finally {
      setSavingPassword(false);
    }
  }, [confirmPassword, newPassword, showToast]);

  const initial = (userName || "?")[0].toUpperCase();
  const roleLabel = userRole === "admin" ? "Jefe" : "Empleado";
  const inlineContent = activeInlineView
    ? INLINE_VIEW_CONTENT[activeInlineView]
    : null;
  const isReportsInline = activeInlineView === "reports";
  const isEmployeesInline = activeInlineView === "employees";
  const isCompanyInline = activeInlineView === "company";
  const isSecurityInline = activeInlineView === "security";
  const admins = employees.filter((emp) => emp.role === "admin");
  const staff = employees.filter((emp) => emp.role !== "admin");
  const isModernDetailInline =
    isEmployeesInline || isCompanyInline || isSecurityInline;
  const inlineDetailMeta = useMemo(() => {
    if (isEmployeesInline) {
      return {
        eyebrow: "GESTION DE EQUIPO",
        headline: "Panel de empleados",
        description: "Control de perfiles, roles y actividad del personal.",
        statA: String(employees.length),
        statALabel: "Total",
        statB: `${admins.length}/${staff.length}`,
        statBLabel: "Jefe/Empleado",
      };
    }
    if (isCompanyInline) {
      return {
        eyebrow: "CONFIGURACION GENERAL",
        headline: "Panel de empresa",
        description: "Datos, preferencias y elementos de identidad visual.",
        statA: companyName ? "1" : "0",
        statALabel: "Empresa",
        statB: companyCurrencyInput || "-",
        statBLabel: "Moneda",
      };
    }
    return {
      eyebrow: "PROTECCION DE CUENTA",
      headline: "Panel de seguridad",
      description: "Acceso, privacidad y acciones de sesion segura.",
      statA: "2",
      statALabel: "Campos",
      statB: "1",
      statBLabel: "Sesion",
    };
  }, [
    admins.length,
    companyCurrencyInput,
    companyName,
    employees.length,
    isCompanyInline,
    isEmployeesInline,
    staff.length,
  ]);
  const fallbackReportSnapshots = useMemo<Record<ReportPeriodKey, ReportSnapshot>>(
    () => ({
      today: {
        balance: 420,
        totalIncome: 600,
        totalExpense: 180,
        totalSales: 3,
        totalTransactions: 5,
        bestSellingProduct: "Sueter",
        companyName: "Empresa",
      },
      week: {
        balance: 940,
        totalIncome: 1240,
        totalExpense: 300,
        totalSales: 7,
        totalTransactions: 11,
        bestSellingProduct: "Sueter",
        companyName: "Empresa",
      },
      month: {
        balance: 1355,
        totalIncome: 1700,
        totalExpense: 345,
        totalSales: 10,
        totalTransactions: 21,
        bestSellingProduct: "Sueter",
        companyName: "Empresa de Prueba",
      },
      all: {
        balance: 1355,
        totalIncome: 1700,
        totalExpense: 345,
        totalSales: 10,
        totalTransactions: 21,
        bestSellingProduct: "Sueter",
        companyName: "Empresa de Prueba",
      },
    }),
    [],
  );
  const effectiveReportSnapshots = reportSnapshots ?? fallbackReportSnapshots;
  const selectedReport = effectiveReportSnapshots[reportPeriod];
  const hasCompanyChanges =
    companyNameInput.trim() !== (companyName ?? "") ||
    companyCurrencyInput.trim() !== (companyCurrency ?? "");

  const profileCardBg = isDark ? colors.card : "rgba(15, 94, 60, 0.06)";
  const profileCardBorder = isDark ? colors.border : "rgba(15, 94, 60, 0.12)";

  if (!isMounted) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Cerrar menú"
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            width: sidebarWidth,
            backgroundColor: colors.bg,
            borderRightWidth: 0,
            borderRightColor: isDark
              ? "rgba(148,163,184,0.18)"
              : "rgba(15,23,42,0.08)",
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 18,
          },
          panelStyle,
        ]}
      >
        <ScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
        {!activeInlineView && (
        <>
        {/* Close button */}
        <View style={styles.closeRow}>
          <Pressable
            onPress={() => {
              haptic.light();
              onClose();
            }}
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: isDark ? colors.card : "#F3F4F6",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityLabel="Cerrar menú"
            accessibilityRole="button"
          >
            <Feather name="x" size={20} color={colors.textMuted} />
          </Pressable>
          <View
            style={[
              styles.topThemeControl,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
                borderColor: isDark
                  ? "rgba(148,163,184,0.24)"
                  : "rgba(15,23,42,0.10)",
              },
            ]}
          >
            <Feather
              name={isDark ? "moon" : "sun"}
              size={15}
              color={isDark ? "#CBD5E1" : "#475569"}
            />
            <Switch
              value={isDark}
              onValueChange={() => {
                haptic.selection();
                toggleTheme();
              }}
              trackColor={{
                false: "#D1D5DB",
                true:
                  Platform.OS === "ios"
                    ? colors.emerald
                    : "rgba(16,185,129,0.4)",
              }}
              thumbColor={
                Platform.OS === "ios"
                  ? "#FFFFFF"
                  : isDark
                    ? colors.emerald
                    : "#F9FAFB"
              }
              style={styles.topThemeSwitch}
              accessibilityLabel="Activar modo oscuro"
            />
          </View>
        </View>

        {/* Profile Card */}
        <Pressable
          style={({ pressed }) => [
            styles.profileCard,
            {
              backgroundColor: profileCardBg,
              borderColor: profileCardBorder,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.12 : 0.06,
              shadowRadius: 8,
              elevation: 2,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleProfilePress}
          accessibilityLabel="Ver perfil"
          accessibilityRole="button"
        >
          <View style={[styles.avatar, { backgroundColor: colors.emerald }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text
              style={[styles.profileName, { color: colors.text }]}
              numberOfLines={1}
            >
              {userName || "Usuario"}
            </Text>
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(15,94,60,0.1)",
                },
              ]}
            >
              <Text style={[styles.roleBadgeText, { color: colors.emerald }]}>
                {roleLabel}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
        </>
        )}

        {activeInlineView && inlineContent ? (
          <View style={styles.inlineSection}>
            {isReportsInline ? (
              <>
                <View style={[styles.inlineReportsHeader, { backgroundColor: colors.emerald }]}>
                  <Pressable
                    onPress={() => {
                      haptic.light();
                      setActiveInlineView(null);
                    }}
                    style={({ pressed }) => [
                      styles.inlineReportsBackBtn,
                      {
                        backgroundColor: "rgba(255,255,255,0.16)",
                        opacity: pressed ? 0.74 : 1,
                      },
                    ]}
                    accessibilityLabel="Volver al menu"
                    accessibilityRole="button"
                  >
                    <Feather name="arrow-left" size={18} color="#FFFFFF" />
                  </Pressable>
                  <Text style={styles.inlineReportsHeaderTitle}>Reportes</Text>
                  <View style={styles.inlineReportsBackBtnSpacer} />
                </View>

                <View style={styles.inlineReportsBody}>
                  <View
                    style={[
                      styles.inlineReportHeroCard,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                        borderColor: isDark
                          ? "rgba(148,163,184,0.20)"
                          : "rgba(15,23,42,0.08)",
                      },
                    ]}
                  >
                    <View style={[styles.inlineReportRibbon, { backgroundColor: colors.emerald }]} />
                    <View style={styles.inlineReportTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.inlineReportEyebrow,
                            { color: isDark ? "#94A3B8" : "#64748B" },
                          ]}
                        >
                          REPORTE FINANCIERO
                        </Text>
                        <Text
                          style={[
                            styles.inlineReportTitle,
                            { color: isDark ? "#E2E8F0" : "#0F172A" },
                          ]}
                        >
                          Balance del periodo
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.inlineReportBalance,
                        { color: isDark ? "#F8FAFC" : "#0F172A" },
                      ]}
                    >
                      ${selectedReport.balance.toFixed(2)}
                    </Text>

                    <View style={styles.inlineReportMetricsRow}>
                      <View
                        style={[
                          styles.inlineReportMetricCard,
                          {
                            backgroundColor: isDark
                              ? "rgba(22,101,52,0.24)"
                              : "rgba(22,101,52,0.10)",
                          },
                        ]}
                      >
                        <Feather name="arrow-up-right" size={13} color={colors.emerald} />
                        <View style={styles.inlineReportMetricTextWrap}>
                          <Text style={[styles.inlineReportMetricLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                            Ingresos
                          </Text>
                          <Text style={[styles.inlineReportMetricValue, { color: isDark ? "#E2E8F0" : "#0F172A" }]}>
                            ${selectedReport.totalIncome.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.inlineReportMetricCard,
                          {
                            backgroundColor: isDark
                              ? "rgba(148,163,184,0.10)"
                              : "#F1F5F9",
                          },
                        ]}
                      >
                        <Feather name="arrow-down-right" size={13} color="#EF4444" />
                        <View style={styles.inlineReportMetricTextWrap}>
                          <Text style={[styles.inlineReportMetricLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                            Gastos
                          </Text>
                          <Text style={[styles.inlineReportMetricValue, { color: isDark ? "#E2E8F0" : "#0F172A" }]}>
                            ${selectedReport.totalExpense.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.inlineReportMetaRow,
                        {
                          borderTopColor: isDark
                            ? "rgba(148,163,184,0.2)"
                            : "rgba(15,23,42,0.08)",
                        },
                      ]}
                    >
                      <View style={styles.inlineReportChipRow}>
                        <View style={[styles.inlineReportChip, { backgroundColor: isDark ? "rgba(22,101,52,0.22)" : "rgba(22,101,52,0.10)" }]}>
                          <Text style={[styles.inlineReportChipText, { color: colors.emerald }]}>
                            {REPORT_PERIODS.find((p) => p.key === reportPeriod)?.label ?? "General"}
                          </Text>
                        </View>
                        <View style={[styles.inlineReportChip, { backgroundColor: isDark ? "rgba(148,163,184,0.12)" : "#F1F5F9" }]}>
                          <Text style={[styles.inlineReportChipText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                            {selectedReport.totalSales} ventas
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.inlineReportCompany, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        {selectedReport.companyName}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.inlineReportPeriodCard,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                        borderColor: isDark
                          ? "rgba(148,163,184,0.20)"
                          : "rgba(15,23,42,0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.inlineReportSectionLabel,
                        { color: isDark ? "#94A3B8" : "#64748B" },
                      ]}
                    >
                      PERIODO DE REPORTE
                    </Text>
                    <View
                      style={[
                        styles.inlineReportPeriodFilters,
                        {
                          backgroundColor: isDark
                            ? "rgba(148,163,184,0.12)"
                            : "#F1F5F9",
                        },
                      ]}
                    >
                      {REPORT_PERIODS.map((period) => {
                        const isActive = reportPeriod === period.key;
                        return (
                          <Pressable
                            key={period.key}
                            style={({ pressed }) => [
                              styles.inlineReportPeriodChip,
                              isActive && [
                                styles.inlineReportPeriodChipActive,
                                { backgroundColor: colors.emerald },
                              ],
                              pressed && { opacity: 0.82 },
                            ]}
                            onPress={() => {
                              haptic.selection();
                              setReportPeriod(period.key);
                            }}
                            accessibilityLabel={`Periodo ${period.label}`}
                            accessibilityRole="button"
                          >
                            <Text
                              style={[
                                styles.inlineReportPeriodChipText,
                                {
                                  color: isActive
                                    ? "#FFFFFF"
                                    : isDark
                                      ? "#CBD5E1"
                                      : "#64748B",
                                },
                              ]}
                            >
                              {period.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.inlineReportSummaryCard,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                        borderColor: isDark
                          ? "rgba(148,163,184,0.20)"
                          : "rgba(15,23,42,0.08)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.inlineReportSummaryTitle,
                        { color: isDark ? "#E2E8F0" : "#0F172A" },
                      ]}
                    >
                      Resumen de ventas
                    </Text>
                    <View
                      style={[
                        styles.inlineReportSummaryTop,
                        {
                          backgroundColor: isDark
                            ? "rgba(148,163,184,0.12)"
                            : "#F1F5F9",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.inlineReportSummaryBadge,
                          {
                            backgroundColor: isDark
                              ? "rgba(22,101,52,0.22)"
                              : "rgba(22,101,52,0.10)",
                          },
                        ]}
                      >
                        <Feather name="award" size={14} color={colors.emerald} />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.inlineReportMetricLabel,
                            { color: isDark ? "#94A3B8" : "#64748B" },
                          ]}
                        >
                          Mas vendido
                        </Text>
                        <Text
                          style={[
                            styles.inlineReportSummaryProduct,
                            { color: isDark ? "#F8FAFC" : "#0F172A" },
                          ]}
                        >
                          {selectedReport.bestSellingProduct || "Sin ventas"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.inlineReportSummaryStatsRow}>
                      <View style={styles.inlineReportSummaryStatItem}>
                        <Text
                          style={[
                            styles.inlineReportSummaryStatValue,
                            { color: isDark ? "#F8FAFC" : "#0F172A" },
                          ]}
                        >
                          {selectedReport.totalTransactions}
                        </Text>
                        <Text
                          style={[
                            styles.inlineReportSummaryStatLabel,
                            { color: isDark ? "#94A3B8" : "#64748B" },
                          ]}
                        >
                          Movimientos
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.inlineReportSummaryDivider,
                          {
                            backgroundColor: isDark
                              ? "rgba(148,163,184,0.25)"
                              : "rgba(15,23,42,0.12)",
                          },
                        ]}
                      />
                      <View style={styles.inlineReportSummaryStatItem}>
                        <Text
                          style={[
                            styles.inlineReportSummaryStatValue,
                            { color: isDark ? "#F8FAFC" : "#0F172A" },
                          ]}
                        >
                          {selectedReport.totalSales}
                        </Text>
                        <Text
                          style={[
                            styles.inlineReportSummaryStatLabel,
                            { color: isDark ? "#94A3B8" : "#64748B" },
                          ]}
                        >
                          Registros venta
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.inlineOpenBtn,
                      styles.inlineReportOpenBtn,
                      {
                        backgroundColor: colors.emerald,
                        borderColor: colors.emerald,
                        opacity: pressed ? 0.84 : 1,
                      },
                    ]}
                    onPress={handleInlineReportExportPress}
                    accessibilityLabel="Exportar reporte PDF"
                    accessibilityRole="button"
                  >
                    <Feather name="download" size={16} color="#FFFFFF" />
                    <Text style={[styles.inlineOpenBtnText, { color: "#FFFFFF" }]}>
                      Exportar reporte PDF
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {isModernDetailInline && inlineContent ? (
                  <>
                    <View style={[styles.inlineReportsHeader, { backgroundColor: colors.emerald }]}>
                      <Pressable
                        onPress={() => {
                          haptic.light();
                          setActiveInlineView(null);
                        }}
                        style={({ pressed }) => [
                          styles.inlineReportsBackBtn,
                          {
                            backgroundColor: "rgba(255,255,255,0.16)",
                            opacity: pressed ? 0.74 : 1,
                          },
                        ]}
                        accessibilityLabel="Volver al menu"
                        accessibilityRole="button"
                      >
                        <Feather name="arrow-left" size={18} color="#FFFFFF" />
                      </Pressable>
                      <Text style={styles.inlineReportsHeaderTitle}>{inlineContent.title}</Text>
                      <View style={styles.inlineReportsBackBtnSpacer} />
                    </View>

                    <View style={styles.inlineReportsBody}>
                      {!isEmployeesInline && (
                        <View
                          style={[
                            styles.inlineDetailHeroCard,
                            {
                              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                              borderColor: isDark
                                ? "rgba(148,163,184,0.20)"
                                : "rgba(15,23,42,0.08)",
                            },
                          ]}
                        >
                          <View style={[styles.inlineReportRibbon, { backgroundColor: colors.emerald }]} />
                          <Text
                            style={[
                              styles.inlineReportEyebrow,
                              { color: isDark ? "#94A3B8" : "#64748B" },
                            ]}
                          >
                            {inlineDetailMeta.eyebrow}
                          </Text>
                          <Text
                            style={[
                              styles.inlineDetailHeroTitle,
                              { color: isDark ? "#E2E8F0" : "#0F172A" },
                            ]}
                          >
                            {inlineDetailMeta.headline}
                          </Text>
                          <Text
                            style={[
                              styles.inlineDetailHeroDescription,
                              { color: isDark ? "#94A3B8" : "#64748B" },
                            ]}
                          >
                            {inlineDetailMeta.description}
                          </Text>

                          <View style={styles.inlineDetailStatsRow}>
                            <View
                              style={[
                                styles.inlineDetailStatCard,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(22,101,52,0.24)"
                                    : "rgba(22,101,52,0.10)",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.inlineDetailStatValue,
                                  { color: isDark ? "#F8FAFC" : "#0F172A" },
                                ]}
                              >
                                {inlineDetailMeta.statA}
                              </Text>
                              <Text
                                style={[
                                  styles.inlineDetailStatLabel,
                                  { color: isDark ? "#94A3B8" : "#64748B" },
                                ]}
                              >
                                {inlineDetailMeta.statALabel}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.inlineDetailStatCard,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(148,163,184,0.10)"
                                    : "#F1F5F9",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.inlineDetailStatValue,
                                  { color: isDark ? "#F8FAFC" : "#0F172A" },
                                ]}
                              >
                                {inlineDetailMeta.statB}
                              </Text>
                              <Text
                                style={[
                                  styles.inlineDetailStatLabel,
                                  { color: isDark ? "#94A3B8" : "#64748B" },
                                ]}
                              >
                                {inlineDetailMeta.statBLabel}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {!isEmployeesInline && (
                        <View
                          style={[
                            styles.inlineDetailFeatureCard,
                            {
                              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                              borderColor: isDark
                                ? "rgba(148,163,184,0.20)"
                                : "rgba(15,23,42,0.08)",
                            },
                          ]}
                        >
                          {inlineContent.blocks.map((block, index) => (
                            <View
                              key={`${block.title}-${index}`}
                              style={[
                                styles.inlineBlock,
                                styles.inlineBlockCompact,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(255,255,255,0.02)"
                                    : "rgba(255,255,255,0.90)",
                                  borderColor: isDark
                                    ? "rgba(148,163,184,0.2)"
                                    : "rgba(15,23,42,0.1)",
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.inlineBlockIcon,
                                  {
                                    backgroundColor: isDark
                                      ? "rgba(16,185,129,0.16)"
                                      : "rgba(15,94,60,0.1)",
                                  },
                                ]}
                              >
                                <Feather name={block.icon} size={18} color={colors.emerald} />
                              </View>
                              <View style={styles.inlineBlockContent}>
                                <Text style={[styles.inlineBlockTitle, { color: colors.text }]}>
                                  {block.title}
                                </Text>
                                <Text
                                  style={[styles.inlineBlockDesc, { color: colors.textMuted }]}
                                >
                                  {block.description}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {isEmployeesInline && (
                        <>
                          <View
                            style={[
                              styles.inlineDetailFeatureCard,
                              {
                                backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                                borderColor: isDark
                                  ? "rgba(148,163,184,0.20)"
                                  : "rgba(15,23,42,0.08)",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.inlineFieldLabel,
                                { color: isDark ? "#94A3B8" : "#64748B" },
                              ]}
                            >
                              Codigo de invitacion
                            </Text>
                            <View
                              style={[
                                styles.inlineInviteCodeBox,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(148,163,184,0.10)"
                                    : "#F1F5F9",
                                  borderColor: isDark
                                    ? "rgba(148,163,184,0.18)"
                                    : "rgba(15,23,42,0.08)",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.inlineInviteCodeText,
                                  { color: isDark ? "#F8FAFC" : "#0F172A" },
                                ]}
                              >
                                {showInviteCode
                                  ? companyInviteCode || "Sin codigo"
                                  : "••••••••"}
                              </Text>
                              <View style={styles.inlineInviteActions}>
                                <Pressable
                                  onPress={() => setShowInviteCode((prev) => !prev)}
                                  style={[
                                    styles.inlineInviteActionBtn,
                                    {
                                      backgroundColor: isDark
                                        ? "rgba(255,255,255,0.08)"
                                        : "#FFFFFF",
                                    },
                                  ]}
                                >
                                  <Feather
                                    name={showInviteCode ? "eye-off" : "eye"}
                                    size={15}
                                    color={colors.emerald}
                                  />
                                </Pressable>
                                {showInviteCode && (
                                  <Pressable
                                    onPress={handleCopyInviteCode}
                                    style={[
                                      styles.inlineInviteActionBtn,
                                      {
                                        backgroundColor: isDark
                                          ? "rgba(255,255,255,0.08)"
                                          : "#FFFFFF",
                                      },
                                    ]}
                                  >
                                    <Feather name="copy" size={15} color={colors.emerald} />
                                  </Pressable>
                                )}
                              </View>
                            </View>
                          </View>

                          <View style={styles.inlineDetailStatsRow}>
                            <View
                              style={[
                                styles.inlineDetailStatCard,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(22,101,52,0.24)"
                                    : "rgba(22,101,52,0.10)",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.inlineDetailStatValue,
                                  { color: isDark ? "#F8FAFC" : "#0F172A" },
                                ]}
                              >
                                {employees.length}
                              </Text>
                              <Text
                                style={[
                                  styles.inlineDetailStatLabel,
                                  { color: isDark ? "#94A3B8" : "#64748B" },
                                ]}
                              >
                                Total
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.inlineDetailStatCard,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(148,163,184,0.10)"
                                    : "#F1F5F9",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.inlineDetailStatValue,
                                  { color: isDark ? "#F8FAFC" : "#0F172A" },
                                ]}
                              >
                                {admins.length}/{staff.length}
                              </Text>
                              <Text
                                style={[
                                  styles.inlineDetailStatLabel,
                                  { color: isDark ? "#94A3B8" : "#64748B" },
                                ]}
                              >
                                Jefe/Empleado
                              </Text>
                            </View>
                          </View>

                          <View
                            style={[
                              styles.inlineDetailFeatureCard,
                              {
                                backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                                borderColor: isDark
                                  ? "rgba(148,163,184,0.20)"
                                  : "rgba(15,23,42,0.08)",
                              },
                            ]}
                          >
                            {loadingEmployees ? (
                              <ActivityIndicator
                                size="small"
                                color={colors.textMuted}
                                style={styles.inlineLoading}
                              />
                            ) : employees.length === 0 ? (
                              <Text
                                style={[
                                  styles.inlineEmptyText,
                                  { color: isDark ? "#94A3B8" : "#64748B" },
                                ]}
                              >
                                Sin miembros aun
                              </Text>
                            ) : (
                              employees.map((emp, index) => (
                                <View
                                  key={emp.id}
                                  style={[
                                    styles.inlineEmployeeRow,
                                    index < employees.length - 1 && {
                                      borderBottomWidth: 1,
                                      borderBottomColor: isDark
                                        ? "rgba(148,163,184,0.16)"
                                        : "rgba(15,23,42,0.06)",
                                    },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.inlineEmployeeAvatar,
                                      {
                                        backgroundColor:
                                          emp.role === "admin"
                                            ? colors.emerald
                                            : isDark
                                              ? "#475569"
                                              : "#94A3B8",
                                      },
                                    ]}
                                  >
                                    <Text style={styles.inlineEmployeeAvatarText}>
                                      {(emp.name || "?")[0].toUpperCase()}
                                    </Text>
                                  </View>
                                  <View style={styles.inlineEmployeeInfo}>
                                    <Text
                                      style={[
                                        styles.inlineEmployeeName,
                                        { color: isDark ? "#F8FAFC" : "#0F172A" },
                                      ]}
                                    >
                                      {emp.name || "Sin nombre"}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.inlineEmployeeRole,
                                        { color: isDark ? "#94A3B8" : "#64748B" },
                                      ]}
                                    >
                                      {emp.role === "admin" ? "Administrador" : "Empleado"}
                                    </Text>
                                  </View>
                                  {emp.user_id === userId && (
                                    <View
                                      style={[
                                        styles.inlineYouBadge,
                                        { backgroundColor: colors.emerald },
                                      ]}
                                    >
                                      <Text style={styles.inlineYouBadgeText}>Tu</Text>
                                    </View>
                                  )}
                                </View>
                              ))
                            )}
                          </View>
                        </>
                      )}

                      {isCompanyInline && (
                        <View
                          style={[
                            styles.inlineDetailFeatureCard,
                            {
                              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                              borderColor: isDark
                                ? "rgba(148,163,184,0.20)"
                                : "rgba(15,23,42,0.08)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.inlineFieldLabel,
                              { color: isDark ? "#94A3B8" : "#64748B" },
                            ]}
                          >
                            Nombre de empresa
                          </Text>
                          <ThemedTextInput
                            style={[
                              styles.inlineInput,
                              {
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                                color: colors.text,
                              },
                            ]}
                            value={companyNameInput}
                            onChangeText={setCompanyNameInput}
                            placeholder="Nombre de empresa"
                            placeholderTextColor={colors.textMuted}
                            selectionColor="transparent"
                            underlineColorAndroid="transparent"
                          />

                          <Text
                            style={[
                              styles.inlineFieldLabel,
                              { color: isDark ? "#94A3B8" : "#64748B" },
                            ]}
                          >
                            Tipo de negocio
                          </Text>
                          <View
                            style={[
                              styles.inlineReadOnlyField,
                              {
                                backgroundColor: isDark
                                  ? "rgba(148,163,184,0.10)"
                                  : "#F1F5F9",
                                borderColor: isDark
                                  ? "rgba(148,163,184,0.20)"
                                  : "rgba(15,23,42,0.08)",
                              },
                            ]}
                          >
                            <Feather name="briefcase" size={16} color={colors.textMuted} />
                            <Text
                              style={[
                                styles.inlineReadOnlyText,
                                { color: isDark ? "#E2E8F0" : "#0F172A" },
                              ]}
                            >
                              {companyBusinessType || "-"}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.inlineFieldLabel,
                              { color: isDark ? "#94A3B8" : "#64748B" },
                            ]}
                          >
                            Moneda
                          </Text>
                          <ThemedTextInput
                            style={[
                              styles.inlineInput,
                              {
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                                color: colors.text,
                              },
                            ]}
                            value={companyCurrencyInput}
                            onChangeText={setCompanyCurrencyInput}
                            placeholder="USD, VES, etc."
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="characters"
                            selectionColor="transparent"
                            underlineColorAndroid="transparent"
                          />

                          {hasCompanyChanges && (
                            <Pressable
                              style={({ pressed }) => [
                                styles.inlinePrimaryBtn,
                                { backgroundColor: colors.emerald, opacity: pressed ? 0.86 : 1 },
                              ]}
                              onPress={handleSaveCompany}
                              disabled={savingCompany}
                              accessibilityLabel="Guardar cambios de empresa"
                              accessibilityRole="button"
                            >
                              {savingCompany ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <Feather name="save" size={16} color="#FFFFFF" />
                                  <Text style={styles.inlinePrimaryBtnText}>Guardar cambios</Text>
                                </>
                              )}
                            </Pressable>
                          )}
                        </View>
                      )}

                      {isSecurityInline && (
                        <View
                          style={[
                            styles.inlineDetailFeatureCard,
                            {
                              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                              borderColor: isDark
                                ? "rgba(148,163,184,0.20)"
                                : "rgba(15,23,42,0.08)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.inlineFieldLabel,
                              { color: isDark ? "#94A3B8" : "#64748B" },
                            ]}
                          >
                            Nueva contrasena
                          </Text>
                          <ThemedTextInput
                            style={[
                              styles.inlineInput,
                              {
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                                color: colors.text,
                              },
                            ]}
                            placeholder="Nueva contrasena"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                            selectionColor="transparent"
                            underlineColorAndroid="transparent"
                          />
                          <Text
                            style={[
                              styles.inlineFieldLabel,
                              { color: isDark ? "#94A3B8" : "#64748B" },
                            ]}
                          >
                            Confirmar contrasena
                          </Text>
                          <ThemedTextInput
                            style={[
                              styles.inlineInput,
                              {
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                                color: colors.text,
                              },
                            ]}
                            placeholder="Confirmar contrasena"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            selectionColor="transparent"
                            underlineColorAndroid="transparent"
                          />
                          <Pressable
                            style={({ pressed }) => [
                              styles.inlinePrimaryBtn,
                              { backgroundColor: colors.emerald, opacity: pressed ? 0.86 : 1 },
                            ]}
                            onPress={handleChangePassword}
                            disabled={savingPassword}
                            accessibilityLabel="Guardar nueva contrasena"
                            accessibilityRole="button"
                          >
                            {savingPassword ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Feather name="lock" size={16} color="#FFFFFF" />
                                <Text style={styles.inlinePrimaryBtnText}>
                                  Guardar contrasena
                                </Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      )}

                      {isSecurityInline && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.inlineSecurityExit,
                            {
                              backgroundColor: isDark
                                ? "rgba(239,68,68,0.06)"
                                : "rgba(180,35,24,0.03)",
                              borderColor: isDark
                                ? "rgba(239,68,68,0.24)"
                                : "rgba(180,35,24,0.14)",
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                          onPress={handleLogoutPress}
                          accessibilityLabel="Cerrar sesion"
                          accessibilityRole="button"
                        >
                          <View
                            style={[
                              styles.menuIconWrap,
                              {
                                backgroundColor: isDark
                                  ? "rgba(239,68,68,0.12)"
                                  : "rgba(180,35,24,0.08)",
                              },
                            ]}
                          >
                            <Feather name="log-out" size={18} color={colors.danger} />
                          </View>
                          <Text style={[styles.menuLabel, { color: colors.danger }]}>
                            Cerrar sesion
                          </Text>
                        </Pressable>
                      )}

                    </View>
                  </>
                ) : null}
              </>
            )}
          </View>
        ) : (
          <>
        {/* Menu Items */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, index) => {
            const pressedBg = isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)";

            return (
              <Animated.View key={item.key} style={itemStyles[index]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(255,255,255,0.78)",
                      borderWidth: 1,
                      borderColor: isDark
                        ? "rgba(148,163,184,0.18)"
                        : "rgba(15,23,42,0.08)",
                    },
                    pressed && { backgroundColor: pressedBg },
                  ]}
                  onPress={() => handleItemPress(item)}
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.menuIconWrap,
                      {
                        backgroundColor: isDark
                          ? "rgba(148,163,184,0.12)"
                          : "#F3F4F6",
                      },
                    ]}
                  >
                    <Feather
                      name={item.icon}
                      size={18}
                      color={colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Logout — anclado al fondo */}
        <Animated.View style={logoutStyle}>
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              styles.logoutItem,
              {
                backgroundColor: isDark
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(180,35,24,0.03)",
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(239,68,68,0.24)"
                  : "rgba(180,35,24,0.14)",
              },
              pressed && {
                backgroundColor: isDark
                  ? "rgba(239,68,68,0.08)"
                  : "rgba(180,35,24,0.04)",
              },
            ]}
            onPress={handleLogoutPress}
            accessibilityLabel="Cerrar sesión"
            accessibilityRole="button"
          >
            <View
              style={[
                styles.menuIconWrap,
                {
                  backgroundColor: isDark
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(180,35,24,0.08)",
                },
              ]}
            >
              <Feather name="log-out" size={18} color={colors.danger} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.danger }]}>
              Cerrar sesión
            </Text>
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Prisma Captus
          </Text>
          <Text style={[styles.footerVersion, { color: colors.textMuted }]}>
            v{APP_VERSION}
          </Text>
        </View>
          </>
        )}
        </ScrollView>
      </Animated.View>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowProfileModal(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.card },
            ]}
            onPress={() => {}}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Mi perfil
              </Text>
              <Pressable
                onPress={() => setShowProfileModal(false)}
                style={({ pressed }) => [
                  styles.modalCloseBtn,
                  {
                    backgroundColor: isDark ? colors.bg : "#F3F4F6",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Avatar + name */}
            <View style={styles.modalProfileSection}>
              <View style={[styles.modalAvatar, { backgroundColor: colors.emerald }]}>
                <Text style={styles.modalAvatarText}>{initial}</Text>
              </View>
              <Text style={[styles.modalProfileName, { color: colors.text }]}>
                {userName || "Usuario"}
              </Text>
              <View
                style={[
                  styles.modalRoleBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(15,94,60,0.1)",
                  },
                ]}
              >
                <Text style={[styles.modalRoleBadgeText, { color: colors.emerald }]}>
                  {roleLabel}
                </Text>
              </View>
            </View>

            {/* Info rows */}
            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            <View style={styles.modalInfoRow}>
              <View style={[styles.modalInfoIcon, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(15,94,60,0.08)" }]}>
                <Feather name="user" size={16} color={colors.emerald} />
              </View>
              <View style={styles.modalInfoContent}>
                <Text style={[styles.modalInfoLabel, { color: colors.textMuted }]}>Nombre</Text>
                <Text style={[styles.modalInfoValue, { color: colors.text }]}>{userName || "Sin nombre"}</Text>
              </View>
            </View>

            <View style={styles.modalInfoRow}>
              <View style={[styles.modalInfoIcon, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(15,94,60,0.08)" }]}>
                <Feather name="mail" size={16} color={colors.emerald} />
              </View>
              <View style={styles.modalInfoContent}>
                <Text style={[styles.modalInfoLabel, { color: colors.textMuted }]}>Email</Text>
                <Text style={[styles.modalInfoValue, { color: colors.text }]}>{userEmail || "—"}</Text>
              </View>
            </View>

            <View style={styles.modalInfoRow}>
              <View style={[styles.modalInfoIcon, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(15,94,60,0.08)" }]}>
                <Feather name="shield" size={16} color={colors.emerald} />
              </View>
              <View style={styles.modalInfoContent}>
                <Text style={[styles.modalInfoLabel, { color: colors.textMuted }]}>Rol</Text>
                <Text style={[styles.modalInfoValue, { color: colors.text }]}>
                  {userRole === "admin" ? "Administrador" : "Empleado"}
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    zIndex: 100,
  },
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 101,
    paddingHorizontal: 20,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 14,
  },
  panelScroll: {
    flex: 1,
  },
  panelScrollContent: {
    flexGrow: 1,
    paddingBottom: 4,
  },
  closeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 28,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 5,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  menuSection: {
    flex: 1,
    paddingTop: 4,
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  logoutItem: {
    marginTop: 8,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  topThemeControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 4,
    minHeight: 36,
  },
  topThemeSwitch: {
    transform: [{ scale: 0.86 }],
  },
  footer: {
    alignItems: "center",
    paddingTop: 12,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  footerVersion: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 2,
    opacity: 0.6,
  },
  inlineSection: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 8,
  },
  inlineReportsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 14,
  },
  inlineReportsBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineReportsBackBtnSpacer: {
    width: 34,
    height: 34,
  },
  inlineReportsHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  inlineReportsBody: {
    flex: 1,
    paddingBottom: 14,
    gap: 12,
  },
  inlineDetailHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  inlineReportHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  inlineReportRibbon: {
    width: 44,
    height: 4,
    borderRadius: 40,
    marginBottom: 10,
  },
  inlineReportTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  inlineDetailHeroTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  inlineDetailHeroDescription: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 8,
  },
  inlineDetailStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  inlineDetailStatCard: {
    flex: 1,
    borderRadius: 12,
    minHeight: 78,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  inlineDetailStatValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  inlineDetailStatLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  inlineReportEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  inlineReportTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  inlineReportBalance: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.7,
    marginTop: 10,
  },
  inlineReportMetricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  inlineReportMetricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineReportMetricTextWrap: {
    flex: 1,
  },
  inlineReportMetricLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  inlineReportMetricValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  inlineReportMetaRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  inlineReportChipRow: {
    flexDirection: "row",
    gap: 6,
  },
  inlineReportChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inlineReportChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  inlineReportCompany: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  inlineReportPeriodCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  inlineReportSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  inlineReportPeriodFilters: {
    marginTop: 10,
    borderRadius: 14,
    padding: 4,
    flexDirection: "row",
  },
  inlineReportPeriodChip: {
    flex: 1,
    borderRadius: 10,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineReportPeriodChipActive: {
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 2,
  },
  inlineReportPeriodChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  inlineReportPeriodChipTextActive: {
    color: "#FFFFFF",
  },
  inlineReportSummaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  inlineReportSummaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  inlineReportSummaryTop: {
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineReportSummaryBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineReportSummaryProduct: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: -0.2,
  },
  inlineReportSummaryStatsRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  inlineReportSummaryStatItem: {
    flex: 1,
    alignItems: "center",
  },
  inlineReportSummaryStatValue: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  inlineReportSummaryStatLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  inlineReportSummaryDivider: {
    width: 1,
    height: 44,
  },
  inlineDetailFeatureCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  inlineInviteCodeBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  inlineInviteCodeText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 2,
    flexShrink: 1,
  },
  inlineInviteActions: {
    flexDirection: "row",
    gap: 8,
  },
  inlineInviteActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineLoading: {
    marginVertical: 10,
  },
  inlineEmptyText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 12,
  },
  inlineEmployeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  inlineEmployeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineEmployeeAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  inlineEmployeeInfo: {
    flex: 1,
  },
  inlineEmployeeName: {
    fontSize: 14,
    fontWeight: "700",
  },
  inlineEmployeeRole: {
    fontSize: 12,
    marginTop: 1,
  },
  inlineYouBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineYouBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  inlineFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 2,
  },
  inlineInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inlineReadOnlyField: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineReadOnlyText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  inlinePrimaryBtn: {
    marginTop: 10,
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  inlinePrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  inlineHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  inlineBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  inlineTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  inlineSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  inlineBlocks: {
    gap: 10,
  },
  inlineBlock: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  inlineBlockCompact: {
    minHeight: 68,
  },
  inlineBlockIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  inlineBlockContent: {
    flex: 1,
  },
  inlineBlockTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  inlineBlockDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  inlineSecurityExit: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 62,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  inlineOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 52,
    marginTop: 14,
    gap: 8,
  },
  inlineOpenBtnText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  inlineReportOpenBtn: {
    minHeight: 56,
    marginTop: 14,
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },

  /* Profile Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalProfileSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalAvatarText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
  },
  modalProfileName: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  modalRoleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalRoleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  modalDivider: {
    height: 1,
    marginBottom: 16,
    opacity: 0.5,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  modalInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalInfoContent: {
    flex: 1,
  },
  modalInfoLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  modalInfoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
});
