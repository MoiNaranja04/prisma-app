import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { C } from "../../constants/colors";
import type { Product } from "../../services/products";
import type { Customer } from "../../services/customers";

interface CartItemUI {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface CustomerForm {
  name: string;
  phone: string;
  document: string;
  documentType: string;
}

const DOC_TYPES = ["V", "J", "E"] as const;

interface Props {
  role: "admin" | "employee";
  cart: CartItemUI[];
  products: Product[];
  cartTotal: number;
  isConfirmingSale: boolean;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onConfirmSale: () => void;
  // Cliente
  customers: Customer[];
  selectedCustomerId: string | null;
  onOpenCustomerModal: () => void;
  // Modal cliente
  customerModalVisible: boolean;
  customerModalMode: "list" | "form";
  onSetCustomerModalMode: (mode: "list" | "form") => void;
  onCloseCustomerModal: () => void;
  onSelectCustomer: (id: string | null) => void;
  onOpenCustomerForm: (customer?: Customer) => void;
  editingCustomer: Customer | null;
  customerForm: CustomerForm;
  onCustomerFormChange: (form: CustomerForm) => void;
  isCustomerFormValid: boolean;
  savingCustomer: boolean;
  onSaveCustomer: () => void;
  onDeleteCustomer: (id: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function CartSection({
  role,
  cart,
  products,
  cartTotal,
  isConfirmingSale,
  onUpdateQuantity,
  onConfirmSale,
  customers,
  selectedCustomerId,
  onOpenCustomerModal,
  customerModalVisible,
  customerModalMode,
  onSetCustomerModalMode,
  onCloseCustomerModal,
  onSelectCustomer,
  onOpenCustomerForm,
  editingCustomer,
  customerForm,
  onCustomerFormChange,
  isCustomerFormValid,
  savingCustomer,
  onSaveCustomer,
  onDeleteCustomer,
  showToast,
}: Props) {
  return (
    <>
      <View style={styles.formCard}>
        <Text style={styles.sectionSubtitle}>Carrito</Text>

        {cart.length === 0 ? (
          <Text style={styles.cartEmptyText}>
            Sin productos en el carrito
          </Text>
        ) : (
          <>
            {cart.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              const stock = product ? Number(product.stock) : 0;
              const atMax = item.quantity >= stock;

              return (
                <View key={item.productId} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      ${item.price.toFixed(2)} c/u
                    </Text>
                    {atMax && (
                      <Text style={styles.cartStockWarning}>
                        Stock máximo alcanzado ({stock})
                      </Text>
                    )}
                  </View>

                  <View style={styles.cartQtyRow}>
                    <TouchableOpacity
                      style={styles.cartQtyBtn}
                      onPress={() =>
                        onUpdateQuantity(item.productId, item.quantity - 1)
                      }
                      activeOpacity={0.7}
                    >
                      <Feather name="minus" size={14} color={C.text} />
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.cartQtyValue,
                        atMax && styles.cartQtyValueMax,
                      ]}
                    >
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.cartQtyBtn,
                        atMax && styles.cartQtyBtnDisabled,
                      ]}
                      onPress={() => {
                        if (atMax) {
                          showToast(
                            `No hay más unidades de "${item.name}". Stock: ${stock}`,
                            "error",
                          );
                        } else {
                          onUpdateQuantity(item.productId, item.quantity + 1);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather name="plus" size={14} color={atMax ? C.textMuted : C.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cartItemSubtotal}>
                    ${item.subtotal.toFixed(2)}
                  </Text>
                </View>
              );
            })}

            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>Total</Text>
              <Text style={styles.cartTotalValue}>
                ${cartTotal.toFixed(2)}
              </Text>
            </View>
          </>
        )}

        {/* Selector de cliente */}
        <Text style={styles.formLabel}>Cliente</Text>
        <TouchableOpacity
          style={styles.customerSelector}
          onPress={onOpenCustomerModal}
          activeOpacity={0.8}
        >
          <Text style={styles.customerSelectorText}>
            {selectedCustomerId
              ? (customers.find((c) => c.id === selectedCustomerId)?.name ??
                "Venta en tienda")
              : "Venta en tienda"}
          </Text>
          <Feather name="chevron-right" size={18} color={C.violet} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btnSave,
            { backgroundColor: C.violet, shadowColor: C.violet },
            (cart.length === 0 || isConfirmingSale) && styles.btnSaveDisabled,
          ]}
          onPress={onConfirmSale}
          disabled={cart.length === 0 || isConfirmingSale}
          activeOpacity={0.8}
        >
          {isConfirmingSale ? (
            <ActivityIndicator size="small" color={C.bg} />
          ) : (
            <View style={styles.btnRow}>
              <Feather name="check" size={14} color={C.bg} />
              <Text style={styles.btnSaveText}>Confirmar venta</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal clientes */}
      <Modal
        visible={customerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (customerModalMode === "form") {
            onSetCustomerModalMode("list");
          } else {
            onCloseCustomerModal();
          }
        }}
      >
        <View style={styles.cmOverlay}>
          <View style={styles.cmContainer}>
            {customerModalMode === "list" ? (
              <>
                <Text style={styles.cmTitle}>Seleccionar cliente</Text>

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

                <ScrollView
                  style={styles.cmList}
                  showsVerticalScrollIndicator={false}
                >
                  {customers.map((cust) => {
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
                  })}
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
                  onPress={onCloseCustomerModal}
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
                <TextInput
                  style={styles.formInput}
                  value={customerForm.name}
                  onChangeText={(v) =>
                    onCustomerFormChange({ ...customerForm, name: v })
                  }
                  placeholder="Nombre del cliente"
                  placeholderTextColor="#3a6b50"
                />

                <Text style={styles.formLabel}>Teléfono</Text>
                <TextInput
                  style={styles.formInput}
                  value={customerForm.phone}
                  onChangeText={(v) =>
                    onCustomerFormChange({ ...customerForm, phone: v })
                  }
                  placeholder="Ej: 0412-1234567"
                  placeholderTextColor="#3a6b50"
                  keyboardType="phone-pad"
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
                  <TextInput
                    style={[styles.formInput, styles.docInput]}
                    value={customerForm.document}
                    onChangeText={(v) =>
                      onCustomerFormChange({ ...customerForm, document: v })
                    }
                    placeholder="27456981"
                    placeholderTextColor="#3a6b50"
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.btnSave,
                    { backgroundColor: C.violet, shadowColor: C.violet },
                    (!isCustomerFormValid || savingCustomer) &&
                      styles.btnSaveDisabled,
                  ]}
                  onPress={onSaveCustomer}
                  disabled={!isCustomerFormValid || savingCustomer}
                  activeOpacity={0.8}
                >
                  {savingCustomer ? (
                    <ActivityIndicator size="small" color={C.bg} />
                  ) : (
                    <Text style={styles.btnSaveText}>
                      {editingCustomer ? "Guardar cambios" : "Crear cliente"}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cmBtnClose}
                  onPress={() => onSetCustomerModalMode("list")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cmBtnCloseText}>Volver</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
    padding: 18,
    marginBottom: 24,
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
  btnSave: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
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
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cartEmptyText: {
    color: "#3a6b50",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
  },
  cartItemPrice: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  cartQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 10,
  },
  cartQtyBtn: {
    backgroundColor: C.violet,
    borderRadius: 8,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  cartQtyBtnText: {
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
  },
  cartQtyValue: {
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center",
  },
  cartItemSubtotal: {
    color: C.violet,
    fontSize: 14,
    fontWeight: "700",
    minWidth: 70,
    textAlign: "right",
  },
  cartTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 14,
    marginTop: 6,
  },
  cartTotalLabel: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cartTotalValue: {
    color: C.violet,
    fontSize: 22,
    fontWeight: "800",
  },
  cartStockWarning: {
    color: C.danger,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  cartQtyValueMax: {
    color: C.danger,
  },
  cartQtyBtnDisabled: {
    backgroundColor: "#1a2e24",
  },
  cartQtyBtnTextDisabled: {
    color: C.textMuted,
  },
  customerSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
  },
  customerSelectorText: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
  },
  cmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 16,
  },
  cmContainer: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    maxHeight: "85%",
  },
  cmTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
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
