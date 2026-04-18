import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { C } from "../../constants/colors";
import type { Customer } from "../../lib/customers";
import type { Product } from "../../lib/products";
import { CustomerModal } from "../pos/CustomerModal";

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
                      <Feather name="minus" size={14} color="#FFFFFF" />
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
                      <Feather name="plus" size={14} color={atMax ? C.textMuted : "#FFFFFF"} />
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

      <CustomerModal
        visible={customerModalVisible}
        mode={customerModalMode}
        onSetMode={onSetCustomerModalMode}
        onClose={onCloseCustomerModal}
        role={role}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={onSelectCustomer}
        onOpenCustomerForm={onOpenCustomerForm}
        editingCustomer={editingCustomer}
        customerForm={customerForm}
        onCustomerFormChange={onCustomerFormChange}
        isCustomerFormValid={isCustomerFormValid}
        savingCustomer={savingCustomer}
        onSaveCustomer={onSaveCustomer}
        onDeleteCustomer={onDeleteCustomer}
      />
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
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
    shadowColor: "#000",
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
    backgroundColor: "#F2F4F7",
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
});
