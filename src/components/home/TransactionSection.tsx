import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FloatingModal } from "../ui/FloatingModal";
import ThemedTextInput from "../ui/ThemedTextInput";
import { useTheme } from "../../context/ThemeContext";
import type { SaleItem } from "../../lib/sales";
import type { Category, TransactionType } from "../../lib/transactions";

interface TransactionForm {
  amount: string;
  type: TransactionType;
  categoryId: string | null;
  description: string;
  date: string;
}

interface TransactionDisplay {
  id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  transaction_date: string;
  category_name?: string | null;
}

interface Props {
  role: "admin" | "employee";
  form: TransactionForm;
  onUpdateField: (key: keyof TransactionForm, value: any) => void;
  filteredCategories: Category[];
  allCategories?: Category[];
  onCreateCategory?: (name: string, type: TransactionType) => Promise<Category>;
  isFormValid: boolean;
  saving: boolean;
  onSave: () => void;
  transactions: TransactionDisplay[];
  loadingData: boolean;
  getSaleItems: (description: string) => SaleItem[];
  getDisplayDescription: (description: string) => string;
  getSaleSeller?: (description: string) => string | null;
  onViewHistory?: () => void;
}

const WEEK_DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MONTHS_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function TransactionSection({
  role,
  form,
  onUpdateField,
  filteredCategories,
  allCategories = [],
  onCreateCategory,
  isFormValid,
  saving,
  onSave,
  transactions,
  loadingData,
  getSaleItems,
  getDisplayDescription,
  getSaleSeller,
}: Props) {
  const { colors, isDark } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateDraft, setDateDraft] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showAllModal, setShowAllModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryError, setNewCategoryError] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const listFade = useRef(new Animated.Value(1)).current;
  const listSlide = useRef(new Animated.Value(0)).current;
  const dateValueFade = useRef(new Animated.Value(1)).current;
  const categoryInputAnim = useRef(new Animated.Value(0)).current;
  const categoryInsertFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    listFade.setValue(0.4);
    listSlide.setValue(6);
    Animated.parallel([
      Animated.timing(listFade, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(listSlide, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [transactions, listFade, listSlide]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "Seleccionar fecha";
    const [y, m, d] = dateStr.split("-").map(Number);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${d} ${months[m - 1]} ${y}`;
  };

  const parseDateValue = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const toIsoDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleSave = () => {
    onSave();
    setShowFormModal(false);
  };

  const openDateModal = () => {
    const initialDate = normalizeDate(parseDateValue(form.date));
    setDateDraft(initialDate);
    setCalendarMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    setShowDatePicker(true);
  };

  const closeDateModal = () => {
    setShowDatePicker(false);
  };

  const confirmDate = () => {
    const nextDate = toIsoDate(dateDraft);
    Animated.sequence([
      Animated.timing(dateValueFade, { toValue: 0.45, duration: 100, useNativeDriver: true }),
      Animated.timing(dateValueFade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    onUpdateField("date", nextDate);
    closeDateModal();
  };

  const monthLabel = `${MONTHS_FULL[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}`;
  const today = normalizeDate(new Date());
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return {
        date: day,
        inCurrentMonth: day.getMonth() === month,
      };
    });
  }, [calendarMonth]);

  const changeCalendarMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleSelectCalendarDate = (selectedDate: Date) => {
    const normalized = normalizeDate(selectedDate);
    setDateDraft(normalized);
    if (
      normalized.getMonth() !== calendarMonth.getMonth() ||
      normalized.getFullYear() !== calendarMonth.getFullYear()
    ) {
      setCalendarMonth(new Date(normalized.getFullYear(), normalized.getMonth(), 1));
    }
  };

  useEffect(() => {
    Animated.timing(categoryInputAnim, {
      toValue: showNewCategoryInput ? 1 : 0,
      duration: showNewCategoryInput ? 220 : 180,
      useNativeDriver: true,
    }).start();
  }, [showNewCategoryInput, categoryInputAnim]);

  const handleCreateCategoryInline = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setNewCategoryError("El nombre no puede estar vacío");
      return;
    }

    const duplicated = allCategories.some(
      (cat) =>
        cat.type === form.type &&
        cat.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicated) {
      setNewCategoryError("La categoría ya existe");
      return;
    }

    if (!onCreateCategory || creatingCategory) return;

    setCreatingCategory(true);
    setNewCategoryError("");
    try {
      const created = await onCreateCategory(trimmed, form.type);
      onUpdateField("categoryId", created.id);
      setNewCategoryName("");
      setShowNewCategoryInput(false);
      categoryInsertFade.setValue(0);
      Animated.timing(categoryInsertFade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } catch {
      setNewCategoryError("No se pudo crear la categoría");
    } finally {
      setCreatingCategory(false);
    }
  };

  const cardBg = isDark ? colors.card : "#FFFFFF";
  const inputBg = isDark ? "#111827" : "#F9FAFB";

  const renderTransaction = (tx: TransactionDisplay) => {
    const isIncome = tx.type === "income";
    const amountNum = Number(tx.amount) || 0;
    const rawDescription = tx.description?.trim() ?? "";
    const displayDescription = getDisplayDescription(rawDescription);
    const items = getSaleItems(rawDescription);
    const seller = getSaleSeller?.(rawDescription) ?? null;

    return (
      <View key={tx.id} style={[styles.txRow, { backgroundColor: cardBg }]}>
        {/* Accent bar */}
        <View style={[styles.txAccent, { backgroundColor: isIncome ? "#10B981" : "#EF4444" }]} />

        <View
          style={[
            styles.txIcon,
            {
              backgroundColor: isIncome
                ? (isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5")
                : (isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2"),
            },
          ]}
        >
          <Feather
            name={isIncome ? "arrow-up-right" : "arrow-down-right"}
            size={16}
            color={isIncome ? "#10B981" : "#EF4444"}
          />
        </View>

        <View style={styles.txContent}>
          <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
            {displayDescription}
          </Text>
          <View style={styles.txMetaRow}>
            {tx.category_name && (
              <View style={[styles.txCatBadge, { backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "#ECFDF5" }]}>
                <Text style={[styles.txCat, { color: colors.emerald }]}>{tx.category_name}</Text>
              </View>
            )}
            <Text style={[styles.txDate, { color: colors.textMuted }]}>{tx.transaction_date}</Text>
            {seller && <Text style={[styles.txSeller, { color: colors.textMuted }]}> · {seller}</Text>}
          </View>
          {items.length > 0 && (
            <View style={styles.txItems}>
              {items.map((item, idx) => (
                <View key={idx} style={[styles.txItemPill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
                  <Text style={[styles.txItemText, { color: colors.textMuted }]}>
                    {item.product_name} x{item.quantity}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={[styles.txAmount, { color: isIncome ? "#10B981" : "#EF4444" }]}>
          {isIncome ? "+" : "-"}${amountNum.toFixed(2)}
        </Text>
      </View>
    );
  };

  if (role !== "admin") return null;

  const formContent = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
      {/* Type toggle */}
      <View style={[styles.typeToggle, { backgroundColor: isDark ? colors.bg : "#F1F5F4" }]}>
        <TouchableOpacity
          style={[styles.typeBtn, form.type === "income" && styles.typeBtnActiveIncome]}
          onPress={() => { onUpdateField("type", "income"); onUpdateField("categoryId", null); }}
          activeOpacity={0.7}
        >
          <Feather name="trending-up" size={14} color={form.type === "income" ? "#FFF" : "#6B7280"} />
          <Text style={[styles.typeBtnText, { color: form.type === "income" ? "#FFF" : "#6B7280" }]}>Ingreso</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, form.type === "expense" && styles.typeBtnActiveExpense]}
          onPress={() => { onUpdateField("type", "expense"); onUpdateField("categoryId", null); }}
          activeOpacity={0.7}
        >
          <Feather name="trending-down" size={14} color={form.type === "expense" ? "#FFF" : "#6B7280"} />
          <Text style={[styles.typeBtnText, { color: form.type === "expense" ? "#FFF" : "#6B7280" }]}>Gasto</Text>
        </TouchableOpacity>
      </View>

      {/* Amount */}
      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Monto</Text>
      <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: colors.emerald }]}>
        <Text style={[styles.inputPrefix, { color: colors.textMuted }]}>$</Text>
        <ThemedTextInput
          style={[styles.inputField, { color: colors.text }]}
          value={form.amount}
          onChangeText={(v) => onUpdateField("amount", v)}
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
          selectionColor="transparent"
          underlineColorAndroid="transparent"
        />
      </View>

      {/* Category */}
      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Categoría</Text>
      <Animated.View style={[styles.catRow, { opacity: categoryInsertFade }]}>
        {filteredCategories.map((cat) => {
          const isActive = form.categoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [
                styles.catPill,
                {
                  backgroundColor: isActive
                    ? "#166534"
                    : (isDark ? "#1E293B" : "#F1F5F9"),
                },
                pressed && styles.catPillPressed,
              ]}
              onPress={() => onUpdateField("categoryId", isActive ? null : cat.id)}
            >
              <Text
                style={[
                  styles.catPillText,
                  { color: isActive ? "#FFFFFF" : (isDark ? "#CBD5E1" : "#475569") },
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          style={({ pressed }) => [
            styles.catPill,
            styles.catNewPill,
            { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" },
            pressed && styles.catPillPressed,
          ]}
          onPress={() => {
            setShowNewCategoryInput((v) => !v);
            setNewCategoryError("");
          }}
        >
          <Text style={styles.catNewPillText}>+ Nueva</Text>
        </Pressable>
      </Animated.View>

      {filteredCategories.length === 0 && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>Sin categorías para este tipo</Text>
      )}

      <Animated.View
        style={[
          styles.inlineCategoryWrap,
          {
            opacity: categoryInputAnim,
            transform: [
              {
                translateY: categoryInputAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-6, 0],
                }),
              },
            ],
            maxHeight: categoryInputAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 90],
            }),
          },
        ]}
      >
        <View style={styles.inlineCategoryRow}>
          <ThemedTextInput
            style={[
              styles.inlineCategoryInput,
              {
                backgroundColor: isDark ? "#111827" : "#FFFFFF",
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={newCategoryName}
            onChangeText={(v) => {
              setNewCategoryName(v);
              if (newCategoryError) setNewCategoryError("");
            }}
            placeholder="Nombre categoría"
            placeholderTextColor={isDark ? "#94A3B8" : "#94A3B8"}
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />
          <TouchableOpacity
            style={[styles.inlineCategoryBtn, creatingCategory && styles.inlineCategoryBtnDisabled]}
            onPress={handleCreateCategoryInline}
            disabled={creatingCategory}
            activeOpacity={0.8}
          >
            {creatingCategory ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.inlineCategoryBtnText}>Agregar</Text>
            )}
          </TouchableOpacity>
        </View>
        {!!newCategoryError && (
          <Text style={styles.inlineCategoryError}>{newCategoryError}</Text>
        )}
      </Animated.View>

      {/* Description */}
      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Descripción</Text>
      <ThemedTextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: colors.emerald, color: colors.text }]}
        value={form.description}
        onChangeText={(v) => onUpdateField("description", v)}
        placeholder="Opcional"
        placeholderTextColor="#9CA3AF"
        selectionColor="transparent"
        underlineColorAndroid="transparent"
      />

      {/* Date */}
      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Fecha</Text>
      <TouchableOpacity
        style={[
          styles.input,
          styles.dateRow,
          {
            backgroundColor: inputBg,
            borderColor: colors.emerald,
          },
          showDatePicker && styles.dateRowActive,
        ]}
        onPress={openDateModal}
        activeOpacity={0.7}
      >
        <Feather name="calendar" size={14} color={colors.textMuted} />
        <Animated.Text style={[styles.dateText, { color: colors.text, opacity: dateValueFade }]}>
          {formatDisplayDate(form.date)}
        </Animated.Text>
      </TouchableOpacity>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, (!isFormValid || saving) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!isFormValid || saving}
        activeOpacity={0.7}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Feather name="check" size={16} color="#FFF" />
            <Text style={styles.saveBtnText}>Guardar movimiento</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <>
      {/* ── New Transaction Button ── */}
      <TouchableOpacity
        style={[styles.newTxBtn, { backgroundColor: cardBg }]}
        onPress={() => setShowFormModal(true)}
        activeOpacity={0.7}
      >
        <View>
          <Text style={[styles.newTxBtnTitle, { color: colors.text }]}>Nuevo movimiento</Text>
          <Text style={[styles.newTxBtnSub, { color: colors.textMuted }]}>Registrar ingreso o gasto</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* ── Form Modal ── */}
      <FloatingModal
        visible={showFormModal}
        onRequestClose={() => setShowFormModal(false)}
        cardStyle={[styles.floatingModalCard, { backgroundColor: isDark ? "#0F172A" : "#FFFFFF" }]}
      >
        <View style={styles.modalShell}>
          <View style={[styles.modalBar, { borderBottomColor: colors.border, backgroundColor: cardBg }]}>
            <Text style={[styles.modalBarTitle, { color: colors.text }]}>Nuevo movimiento</Text>
            <TouchableOpacity onPress={() => setShowFormModal(false)} style={styles.modalClose} activeOpacity={0.7}>
              <View style={[styles.modalCloseCircle, { backgroundColor: isDark ? colors.bg : "#F3F4F6" }]}>
                <Feather name="x" size={18} color={colors.text} />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.formModalBody}>
            {formContent}
          </View>
        </View>
      </FloatingModal>

      <FloatingModal
        visible={showDatePicker}
        onRequestClose={closeDateModal}
        cardStyle={[
          styles.dateModalCard,
          {
            backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
            borderColor: isDark ? "#1E293B" : "#E2E8F0",
          },
        ]}
      >
        <View style={styles.dateModalBody}>
          <View style={[styles.dateHeaderRow, { borderBottomColor: isDark ? "#1E293B" : "#E2E8F0" }]}>
            <TouchableOpacity
              style={[styles.dateNavBtn, { backgroundColor: isDark ? "#111827" : "#F8FAFC" }]}
              onPress={() => changeCalendarMonth(-1)}
              activeOpacity={0.8}
            >
              <Feather name="chevron-left" size={16} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.dateMonthLabel, { color: colors.text }]}>{monthLabel}</Text>
            <TouchableOpacity
              style={[styles.dateNavBtn, { backgroundColor: isDark ? "#111827" : "#F8FAFC" }]}
              onPress={() => changeCalendarMonth(1)}
              activeOpacity={0.8}
            >
              <Feather name="chevron-right" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateWeekRow}>
            {WEEK_DAYS.map((dayLabel) => (
              <Text key={dayLabel} style={[styles.dateWeekDay, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                {dayLabel}
              </Text>
            ))}
          </View>

          <View style={styles.dateGrid}>
            {calendarDays.map(({ date, inCurrentMonth }) => {
              const selected = isSameDate(date, dateDraft);
              const isToday = isSameDate(date, today);
              return (
                <Pressable
                  key={toIsoDate(date)}
                  onPress={() => handleSelectCalendarDate(date)}
                  style={({ pressed }) => [
                    styles.dateCell,
                    selected && styles.dateCellSelected,
                    !inCurrentMonth && styles.dateCellOutside,
                    isToday && !selected && {
                      borderWidth: 1,
                      borderColor: isDark ? "#334155" : "#CBD5E1",
                    },
                    pressed && styles.dateCellPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateCellText,
                      { color: selected ? "#FFFFFF" : (inCurrentMonth ? colors.text : (isDark ? "#64748B" : "#94A3B8")) },
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.dateConfirmBtn}
            onPress={confirmDate}
            activeOpacity={0.8}
          >
            <Text style={styles.dateConfirmBtnText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </FloatingModal>

      {/* ── Transaction List ── */}
      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: colors.text }]}>Movimientos recientes</Text>
        {loadingData && <ActivityIndicator size="small" color={colors.emerald} />}
      </View>

      {!loadingData && transactions.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
            <Feather name="inbox" size={24} color="#D1D5DB" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin movimientos</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Los movimientos que registres aparecerán aquí</Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: listFade, transform: [{ translateY: listSlide }] }}>
          {transactions.slice(0, 10).map(renderTransaction)}
          {transactions.length > 10 && (
            <TouchableOpacity
              style={[styles.viewAllBtn, { backgroundColor: cardBg }]}
              onPress={() => setShowAllModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="list" size={14} color={colors.emerald} />
              <Text style={[styles.viewAllText, { color: colors.emerald }]}>
                Ver todas ({transactions.length})
              </Text>
              <Feather name="chevron-right" size={14} color={colors.emerald} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* ── All Transactions Modal ── */}
      <FloatingModal
        visible={showAllModal}
        onRequestClose={() => setShowAllModal(false)}
        cardStyle={[styles.floatingModalCard, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}
      >
        <View style={styles.modalShell}>
          <View style={[styles.modalBar, { borderBottomColor: colors.border, backgroundColor: cardBg }]}>
            <Text style={[styles.modalBarTitle, { color: colors.text }]}>Transacciones</Text>
            <TouchableOpacity onPress={() => setShowAllModal(false)} style={styles.modalClose} activeOpacity={0.7}>
              <View style={[styles.modalCloseCircle, { backgroundColor: isDark ? colors.bg : "#F3F4F6" }]}>
                <Feather name="x" size={18} color={colors.text} />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={[styles.modalCount, { color: colors.textMuted }]}>{transactions.length} registros</Text>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {transactions.map(renderTransaction)}
          </ScrollView>
        </View>
      </FloatingModal>
    </>
  );
}

const styles = StyleSheet.create({
  /* ── New Tx Button ── */
  newTxBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  newTxBtnTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  newTxBtnSub: {
    fontSize: 12,
    marginTop: 2,
  },

  /* ── Form (inside modal) ── */
  formModalBody: {
    flex: 1,
  },
  formScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  typeToggle: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
  },
  typeBtnActiveIncome: {
    backgroundColor: "#166534",
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBtnActiveExpense: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 14,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 4,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateRowActive: {
    borderColor: "#166534",
    shadowColor: "rgba(22,101,52,0.2)",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 2,
  },
  dateText: {
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 6,
  },
  catRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catPill: {
    height: 32,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  catPillPressed: {
    transform: [{ scale: 0.97 }],
  },
  catPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  catNewPill: {
    borderWidth: 0,
  },
  catNewPillText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
  },
  inlineCategoryWrap: {
    overflow: "hidden",
  },
  inlineCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  inlineCategoryInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  inlineCategoryBtn: {
    height: 38,
    borderRadius: 12,
    backgroundColor: "#166534",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineCategoryBtnDisabled: {
    opacity: 0.7,
  },
  inlineCategoryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  inlineCategoryError: {
    marginTop: 6,
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "500",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#166534",
    borderRadius: 14,
    height: 50,
    marginTop: 24,
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },

  /* ── List ── */
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  emptyState: {
    borderRadius: 18,
    paddingVertical: 36,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 12,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    height: 44,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* ── Transaction Row ── */
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
    overflow: "hidden",
  },
  txAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txContent: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  txMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  txCatBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  txCat: {
    fontSize: 10,
    fontWeight: "700",
  },
  txDate: {
    fontSize: 11,
    fontWeight: "500",
  },
  txSeller: {
    fontSize: 11,
  },
  txItems: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  txItemPill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  txItemText: {
    fontSize: 10,
    fontWeight: "500",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: -0.3,
  },

  /* ── Modal ── */
  floatingModalCard: {
    width: "100%",
    height: "86%",
  },
  modalShell: {
    flex: 1,
  },
  modalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalBarTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  modalClose: { padding: 4 },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCount: { fontSize: 12, fontWeight: "500", paddingHorizontal: 20, paddingTop: 10, letterSpacing: 0.3 },
  dateModalCard: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 28,
  },
  dateModalBody: {
    padding: 16,
    gap: 10,
  },
  dateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  dateNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dateMonthLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  dateWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  dateWeekDay: {
    width: "14.285%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dateCell: {
    width: "14.285%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCellPressed: {
    transform: [{ scale: 0.97 }],
  },
  dateCellSelected: {
    backgroundColor: "#166534",
  },
  dateCellOutside: {
    opacity: 0.55,
  },
  dateCellText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateConfirmBtn: {
    backgroundColor: "#166534",
    borderRadius: 16,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  dateConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
