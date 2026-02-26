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
                color={form.type === "income" ? "#FFFFFF" : "#0F5E3C"}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  form.type === "income"
                    ? styles.typeBtnTextIncomeActive
                    : styles.typeBtnTextIncome,
                ]}
              >
                Ingreso
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              styles.typeBtnExpense,
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
                color={form.type === "expense" ? "#FFFFFF" : "#B42318"}
              />
              <Text
                style={[
                  styles.typeBtnText,
                  form.type === "expense"
                    ? styles.typeBtnTextExpenseActive
                    : styles.typeBtnTextExpense,
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
          placeholderTextColor="#98A2B3"
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
          placeholderTextColor="#98A2B3"
        />

        <Text style={styles.formLabel}>Fecha</Text>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Feather name="calendar" size={14} color="#0F5E3C" />
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
            themeVariant="light"
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
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.typeBtnContent}>
              <Feather name="save" size={14} color="#FFFFFF" />
              <Text style={styles.btnSaveText}>Guardar transaccion</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionSubtitle}>Ultimos 10 movimientos</Text>
        {loadingData && <ActivityIndicator size="small" color="#0F5E3C" />}
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
              <Feather name="list" size={14} color="#0F5E3C" />
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
          <Feather name="clock" size={14} color="#FFFFFF" />
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
              <Feather name="x" size={22} color="#111111" />
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E9EF",
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionSubtitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 14,
    marginTop: 2,
  },
  formLabel: {
    color: "#0F5E3C",
    fontWeight: "600",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E9EF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111111",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E9EF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateSelectorText: {
    color: "#111111",
    fontSize: 15,
  },
  formHint: {
    color: "#667085",
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
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E9EF",
    backgroundColor: "#FFFFFF",
  },
  typeBtnIncomeActive: {
    backgroundColor: "#0F5E3C",
    borderColor: "#0F5E3C",
  },
  typeBtnExpense: {
    backgroundColor: "#FFFFFF",
    borderColor: "#B42318",
  },
  typeBtnExpenseActive: {
    backgroundColor: "#B42318",
    borderColor: "#B42318",
  },
  typeBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  typeBtnTextIncome: {
    color: "#0F5E3C",
  },
  typeBtnTextIncomeActive: {
    color: "#FFFFFF",
  },
  typeBtnTextExpense: {
    color: "#B42318",
  },
  typeBtnTextExpenseActive: {
    color: "#FFFFFF",
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
    borderColor: "#0F5E3C",
    backgroundColor: "#FFFFFF",
  },
  catChipActive: {
    backgroundColor: "#0F5E3C",
    borderColor: "#0F5E3C",
  },
  catChipText: {
    color: "#0F5E3C",
    fontSize: 12,
    fontWeight: "600",
  },
  catChipTextActive: {
    color: "#FFFFFF",
  },
  btnSave: {
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111111",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  btnSaveDisabled: {
    backgroundColor: "#D0D5DD",
    borderColor: "#D0D5DD",
  },
  btnSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E9EF",
    borderRadius: 16,
    paddingVertical: 30,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    color: "#667085",
    fontSize: 14,
  },
  btnViewAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#0F5E3C",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 44,
    marginBottom: 12,
  },
  btnViewAllText: {
    color: "#0F5E3C",
    fontSize: 13,
    fontWeight: "600",
  },
  btnHistory: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#111111",
    backgroundColor: "#111111",
    borderRadius: 12,
    height: 46,
    marginBottom: 8,
  },
  btnHistoryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  modalFull: {
    flex: 1,
    backgroundColor: "#F7F9FB",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E9EF",
  },
  modalTitle: {
    color: "#111111",
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCount: {
    color: "#0F5E3C",
    fontWeight: "600",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E9EF",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  txAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  txAccentIncome: {
    backgroundColor: "#0F5E3C",
  },
  txAccentExpense: {
    backgroundColor: "#B42318",
  },
  txBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  txDescription: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "600",
  },
  txDate: {
    color: "#667085",
    fontSize: 11,
    marginTop: 2,
  },
  txItemsList: {
    marginTop: 6,
  },
  txItemText: {
    color: "#667085",
    fontSize: 11,
    lineHeight: 16,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
    paddingRight: 14,
  },
  txAmountIncome: {
    color: "#0F5E3C",
  },
  txAmountExpense: {
    color: "#B42318",
  },
});
