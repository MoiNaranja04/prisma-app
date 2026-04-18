import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { C } from "../../constants/colors";
import type { Customer } from "../../lib/customers";
import { FloatingModal } from "../ui/FloatingModal";
import ThemedTextInput from "../ui/ThemedTextInput";

interface CustomerForm {
  name: string;
  phone: string;
  document: string;
  documentType: string;
}

const DOC_TYPES = ["V", "J", "E"] as const;

interface Props {
  visible: boolean;
  mode: "list" | "form";
  onSetMode: (mode: "list" | "form") => void;
  onClose: () => void;
  role: "admin" | "employee";
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string | null) => void;
  onOpenCustomerForm: (customer?: Customer) => void;
  editingCustomer: Customer | null;
  customerForm: CustomerForm;
  onCustomerFormChange: (form: CustomerForm) => void;
  isCustomerFormValid: boolean;
  savingCustomer: boolean;
  onSaveCustomer: () => void;
  onDeleteCustomer: (id: string) => void;
}

export function CustomerModal({
  visible,
  mode,
  onSetMode,
  onClose,
  role,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenCustomerForm,
  editingCustomer,
  customerForm,
  onCustomerFormChange,
  isCustomerFormValid,
  savingCustomer,
  onSaveCustomer,
  onDeleteCustomer,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.document && c.document.toLowerCase().includes(query))
    );
  }, [customers, searchQuery]);

  return (
    <FloatingModal
      visible={visible}
      onRequestClose={() => {
        if (mode === "form") {
          onSetMode("list");
        } else {
          onClose();
        }
      }}
      cardStyle={styles.cmContainer}
    >
      <View>
        {mode === "list" ? (
          <>
            <Text style={styles.cmTitle}>Seleccionar cliente</Text>

            <View style={styles.searchContainer}>
              <Feather name="search" size={16} color={C.textMuted} />
              <ThemedTextInput
                style={styles.searchInput}
                placeholder="Buscar cliente..."
                placeholderTextColor={C.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                selectionColor="transparent"
                underlineColorAndroid="transparent"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Feather name="x" size={16} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {!searchQuery && (
              <TouchableOpacity
                style={[
                  styles.cmCard,
                  selectedCustomerId === null && styles.cmCardActive,
                ]}
                onPress={() => onSelectCustomer(null)}
                activeOpacity={0.8}
              >
                <View style={styles.cmCardBody}>
                  <Text style={styles.cmCardName}>Venta general</Text>
                  <Text style={styles.cmCardSub}>
                    Sin cliente registrado
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <ScrollView
              style={styles.cmList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredCustomers.length === 0 ? (
                <Text style={styles.emptyText}>No se encontraron clientes</Text>
              ) : (
                filteredCustomers.map((cust) => {
                  const isActive = selectedCustomerId === cust.id;
                  return (
                    <TouchableOpacity
                      key={cust.id}
                      style={[
                        styles.cmCard,
                        isActive && styles.cmCardActive,
                      ]}
                      onPress={() => onSelectCustomer(cust.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cmCardBody}>
                        <Text style={styles.cmCardName}>{cust.name}</Text>
                        {cust.phone && (
                          <Text style={styles.cmCardDetail}>
                            {cust.phone}
                          </Text>
                        )}
                        {cust.document && (
                          <Text style={styles.cmCardDetail}>
                            {cust.document}
                          </Text>
                        )}
                      </View>
                      <View style={styles.cmCardActions}>
                        <TouchableOpacity
                          style={styles.cmBtnEdit}
                          onPress={() => onOpenCustomerForm(cust)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.cmBtnEditText}>Editar</Text>
                        </TouchableOpacity>
                        {role === "admin" && (
                          <TouchableOpacity
                            style={styles.cmBtnDelete}
                            onPress={() => onDeleteCustomer(cust.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.cmBtnDeleteText}>
                              Eliminar
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.cmBtnCreate}
              onPress={() => onOpenCustomerForm()}
              activeOpacity={0.8}
            >
              <Text style={styles.cmBtnCreateText}>
                + Crear nuevo cliente
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cmBtnClose}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cmBtnCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.cmTitle}>
              {editingCustomer ? "Editar cliente" : "Nuevo cliente"}
            </Text>

            <Text style={styles.formLabel}>Nombre *</Text>
            <ThemedTextInput
              style={styles.formInput}
              value={customerForm.name}
              onChangeText={(v) =>
                onCustomerFormChange({ ...customerForm, name: v })
              }
              placeholder="Nombre del cliente"
              placeholderTextColor="#98A2B3"
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />

            <Text style={styles.formLabel}>Teléfono</Text>
            <ThemedTextInput
              style={styles.formInput}
              value={customerForm.phone}
              onChangeText={(v) =>
                onCustomerFormChange({ ...customerForm, phone: v })
              }
              placeholder="Ej: 0412-1234567"
              placeholderTextColor="#98A2B3"
              keyboardType="phone-pad"
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />

            <Text style={styles.formLabel}>Cédula / RIF</Text>
            <View style={styles.docRow}>
              {DOC_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.docTypeBtn,
                    customerForm.documentType === t &&
                    styles.docTypeBtnActive,
                  ]}
                  onPress={() =>
                    onCustomerFormChange({
                      ...customerForm,
                      documentType: t,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.docTypeBtnText,
                      customerForm.documentType === t &&
                      styles.docTypeBtnTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
              <ThemedTextInput
                style={[styles.formInput, styles.docInput]}
                value={customerForm.document}
                onChangeText={(v) =>
                  onCustomerFormChange({ ...customerForm, document: v })
                }
                placeholder="27456981"
                placeholderTextColor="#98A2B3"
                keyboardType="numeric"
                selectionColor="transparent"
                underlineColorAndroid="transparent"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.btnSave,
                (!isCustomerFormValid || savingCustomer) &&
                styles.btnSaveDisabled,
              ]}
              onPress={onSaveCustomer}
              disabled={!isCustomerFormValid || savingCustomer}
              activeOpacity={0.8}
            >
              {savingCustomer ? (
                <ActivityIndicator size="small" color={C.card} />
              ) : (
                <Text style={styles.btnSaveText}>
                  {editingCustomer ? "Guardar cambios" : "Crear cliente"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cmBtnClose}
              onPress={() => onSetMode("list")}
              activeOpacity={0.8}
            >
              <Text style={styles.cmBtnCloseText}>Volver</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </FloatingModal>
  );
}

const styles = StyleSheet.create({
  cmContainer: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    width: "100%",
    maxHeight: "85%",
  },
  cmTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    padding: 0,
  },
  emptyText: {
    color: C.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
  cmList: {
    maxHeight: 300,
    marginBottom: 12,
  },
  cmCard: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  cmCardActive: {
    borderColor: C.violet,
    backgroundColor: "rgba(139,92,246,0.1)",
  },
  cmCardBody: {
    flex: 1,
  },
  cmCardName: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
  },
  cmCardSub: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  cmCardDetail: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  cmCardActions: {
    flexDirection: "row",
    gap: 6,
  },
  cmBtnEdit: {
    backgroundColor: C.gold,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cmBtnEditText: {
    color: C.bg,
    fontSize: 10,
    fontWeight: "700",
  },
  cmBtnDelete: {
    backgroundColor: "rgba(248,113,113,0.15)",
    borderWidth: 1,
    borderColor: C.danger,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cmBtnDeleteText: {
    color: C.danger,
    fontSize: 10,
    fontWeight: "700",
  },
  cmBtnCreate: {
    backgroundColor: C.violet,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  cmBtnCreateText: {
    color: C.bg,
    fontSize: 14,
    fontWeight: "700",
  },
  cmBtnClose: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  cmBtnCloseText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "500",
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
  btnSave: {
    backgroundColor: C.violet,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    shadowColor: C.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 6,
  },
  btnSaveDisabled: {
    backgroundColor: "#F2F4F7",
    shadowOpacity: 0,
  },
  btnSaveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  docTypeBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.inputBg,
  },
  docTypeBtnActive: {
    backgroundColor: C.violet,
    borderColor: C.violet,
  },
  docTypeBtnText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  docTypeBtnTextActive: {
    color: C.bg,
  },
  docInput: {
    flex: 1,
  },
});
