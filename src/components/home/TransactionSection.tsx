import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { C } from "../../constants/colors";
import type { SaleItem } from "../../services/sales";
import type { Category, TransactionType } from "../../services/transactions";

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
}

interface Props {
  role: "admin" | "employee";
  form: TransactionForm;
  onUpdateField: (key: keyof TransactionForm, value: any) => void;
  filteredCategories: Category[];
  isFormValid: boolean;
  saving: boolean;
  onSave: () => void;
  transactions: TransactionDisplay[];
  loadingData: boolean;
  getSaleItems: (description: string) => SaleItem[];
  getDisplayDescription: (description: string) => string;
  onViewHistory?: () => void;
}

export function TransactionSection({
  role,
  form,
  onUpdateField,
  filteredCategories,
  isFormValid,
  saving,
  onSave,
  transactions,
  loadingData,
  getSaleItems,
  getDisplayDescription,
  onViewHistory,
}: Props) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "Seleccionar fecha";
    const [y, m, d] = dateStr.split("-").map(Number);
    const months = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    return `${d} ${months[m - 1]} ${y}`;
  };

  const parseDateValue = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const renderTransaction = (tx: TransactionDisplay) => {
    const isIncome = tx.type === "income";
    const amountNum = Number(tx.amount) || 0;
    const rawDescription = tx.description?.trim() ?? "";
    const displayDescription = getDisplayDescription(rawDescription);
    const items = getSaleItems(rawDescription);

    return (
      <View key={tx.id} style={styles.txCard}>
        <View
          style={[
            styles.txAccent,
            isIncome ? styles.txAccentIncome : styles.txAccentExpense,
          ]}
        />
        <View style={styles.txBody}>
          <Text style={styles.txDescription}>{displayDescription}</Text>
          <Text style={styles.txDate}>{tx.transaction_date}</Text>
          {items.length > 0 && (
            <View style={styles.txItemsList}>
              {items.map((item, idx) => (
                <Text key={idx} style={styles.txItemText}>
                  - {item.product_name} x{item.quantity}
                </Text>
              ))}
            </View>
          )}
        </View>
        <Text
          style={[
            styles.txAmount,
            isIncome ? styles.txAmountIncome : styles.txAmountExpense,
          ]}
        >
          {isIncome ? "+" : "-"}${amountNum.toFixed(2)}
        </Text>
      </View>
    );
  };

  if (role !== "admin") return null;

  return (
    <>
      <View style={styles.formCard}>
        <Text style={styles.sectionSubtitle}>Registrar movimiento</Text>

        <Text style={styles.formLabel}>Tipo</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              form.type === "income" && styles.typeBtnIncomeActive,
            ]}
            onPress={() => {
              onUpdateField("type", "income");
              onUpdateField("categoryId", null);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.typeBtnContent}>
              <Feather
                name="trending-up"
                size={14}
                color={form.type === "income" ? C.bg : C.textMuted}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  form.type === "income" && styles.typeBtnTextActive,
                ]}
              >
                Ingreso
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              form.type === "expense" && styles.typeBtnExpenseActive,
            ]}
            onPress={() => {
              onUpdateField("type", "expense");
              onUpdateField("categoryId", null);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.typeBtnContent}>
              <Feather
                name="trending-down"
                size={14}
                color={form.type === "expense" ? C.bg : C.textMuted}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  form.type === "expense" && styles.typeBtnTextActive,
                ]}
              >
                Gasto
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.formLabel}>Monto</Text>
        <TextInput
          style={styles.formInput}
          value={form.amount}
          onChangeText={(v) => onUpdateField("amount", v)}
          placeholder="0.00"
          placeholderTextColor="#3a6b50"
          keyboardType="decimal-pad"
        />

        <Text style={styles.formLabel}>Categoria</Text>
        {filteredCategories.length === 0 ? (
          <Text style={styles.formHint}>Sin categorias para este tipo</Text>
        ) : (
          <View style={styles.catRow}>
            {filteredCategories.map((cat) => {
              const isActive = form.categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, isActive && styles.catChipActive]}
                  onPress={() =>
                    onUpdateField("categoryId", isActive ? null : cat.id)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      isActive && styles.catChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.formLabel}>Descripcion (opcional)</Text>
        <TextInput
          style={styles.formInput}
          value={form.description}
          onChangeText={(v) => onUpdateField("description", v)}
          placeholder="Ej: Venta del dia"
          placeholderTextColor="#3a6b50"
        />

        <Text style={styles.formLabel}>Fecha</Text>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Feather name="calendar" size={14} color={C.textMuted} />
          <Text style={styles.dateSelectorText}>
            {formatDisplayDate(form.date)}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={parseDateValue(form.date)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_event, selectedDate) => {
              setShowDatePicker(Platform.OS === "ios");
              if (selectedDate) {
                const y = selectedDate.getFullYear();
                const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
                const d = String(selectedDate.getDate()).padStart(2, "0");
                onUpdateField("date", `${y}-${m}-${d}`);
              }
            }}
            themeVariant="dark"
          />
        )}

        <TouchableOpacity
          style={[
            styles.btnSave,
            (!isFormValid || saving) && styles.btnSaveDisabled,
          ]}
          onPress={onSave}
          disabled={!isFormValid || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={C.bg} />
          ) : (
            <View style={styles.typeBtnContent}>
              <Feather name="save" size={14} color={C.bg} />
              <Text style={styles.btnSaveText}>Guardar transaccion</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionSubtitle}>Últimos 10 movimientos</Text>
        {loadingData && <ActivityIndicator size="small" color={C.emerald} />}
      </View>

      {!loadingData && transactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Sin transacciones aun</Text>
        </View>
      ) : (
        <>
          {transactions.slice(0, 10).map(renderTransaction)}
          {transactions.length > 10 && (
            <TouchableOpacity
              style={styles.btnViewAll}
              onPress={() => setShowAllModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="list" size={14} color={C.emerald} />
              <Text style={styles.btnViewAllText}>
                Ver todas ({transactions.length})
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {onViewHistory && (
        <TouchableOpacity
          style={styles.btnHistory}
          onPress={onViewHistory}
          activeOpacity={0.8}
        >
          <Feather name="clock" size={14} color={C.textMuted} />
          <Text style={styles.btnHistoryText}>Ver historial completo</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showAllModal}
        animationType="slide"
        onRequestClose={() => setShowAllModal(false)}
      >
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Todas las transacciones</Text>
            <TouchableOpacity
              onPress={() => setShowAllModal(false)}
              activeOpacity={0.7}
              style={styles.modalCloseBtn}
            >
              <Feather name="x" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalCount}>
            {transactions.length} transacciones
          </Text>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {transactions.map(renderTransaction)}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 18,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
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
  formLabel: {
    color: C.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: C.text,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
  },
  dateSelectorText: {
    color: C.text,
    fontSize: 15,
  },
  formHint: {
    color: "#3a6b50",
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.inputBg,
  },
  typeBtnIncomeActive: {
    backgroundColor: C.emerald,
    borderColor: C.emerald,
  },
  typeBtnExpenseActive: {
    backgroundColor: C.danger,
    borderColor: C.danger,
  },
  typeBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeBtnText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  typeBtnTextActive: {
    color: C.bg,
  },
  catRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.inputBg,
  },
  catChipActive: {
    backgroundColor: C.emerald,
    borderColor: C.emerald,
  },
  catChipText: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  catChipTextActive: {
    color: C.bg,
  },
  btnSave: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnSaveDisabled: {
    backgroundColor: "#134e2a",
    shadowOpacity: 0,
  },
  btnSaveText: {
    color: "#0a1a12",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 30,
    alignItems: "center",
    marginBottom: 24,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 14,
  },
  btnViewAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: C.emerald,
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 12,
  },
  btnViewAllText: {
    color: C.emerald,
    fontSize: 13,
    fontWeight: "600",
  },
  btnHistory: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  btnHistoryText: {
    color: C.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  modalFull: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCount: {
    color: C.textMuted,
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    letterSpacing: 0.5,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  txCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  txAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  txAccentIncome: {
    backgroundColor: C.emerald,
  },
  txAccentExpense: {
    backgroundColor: C.danger,
  },
  txBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  txDescription: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
  },
  txDate: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  txItemsList: {
    marginTop: 6,
  },
  txItemText: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
    paddingRight: 14,
  },
  txAmountIncome: {
    color: C.emeraldLight,
  },
  txAmountExpense: {
    color: C.danger,
  },
});
