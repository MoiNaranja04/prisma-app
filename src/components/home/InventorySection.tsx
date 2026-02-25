import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { C } from "../../constants/colors";
import type { Product } from "../../services/products";

interface ProductForm {
  name: string;
  price: string;
  stock: string;
}

interface EditForm {
  name: string;
  price: string;
  stock: string;
  description: string;
}

interface Props {
  role: "admin" | "employee";
  products: Product[];
  productForm: ProductForm;
  onUpdateProductField: (key: keyof ProductForm, value: string) => void;
  isProductFormValid: boolean;
  savingProduct: boolean;
  onSaveProduct: () => void;
  onAddToCart: (product: Product) => void;
  editingProduct: Product | null;
  editForm: EditForm;
  onEditFormChange: (form: EditForm) => void;
  isEditFormValid: boolean;
  savingEdit: boolean;
  onSaveEdit: () => void;
  onOpenEditModal: (product: Product) => void;
  onCloseEditModal: () => void;
}

export function InventorySection({
  role,
  products,
  productForm,
  onUpdateProductField,
  isProductFormValid,
  savingProduct,
  onSaveProduct,
  onAddToCart,
  editingProduct,
  editForm,
  onEditFormChange,
  isEditFormValid,
  savingEdit,
  onSaveEdit,
  onOpenEditModal,
  onCloseEditModal,
}: Props) {
  return (
    <>
      {/* Formulario nuevo producto */}
      {role === "admin" && (
        <View style={styles.formCard}>
          <Text style={styles.sectionSubtitle}>Productos</Text>

          <Text style={styles.formLabel}>Nombre</Text>
          <TextInput
            style={styles.formInput}
            value={productForm.name}
            onChangeText={(v) => onUpdateProductField("name", v)}
            placeholder="Nombre del producto"
            placeholderTextColor="#3a6b50"
          />

          <Text style={styles.formLabel}>Precio</Text>
          <TextInput
            style={styles.formInput}
            value={productForm.price}
            onChangeText={(v) => onUpdateProductField("price", v)}
            placeholder="0.00"
            placeholderTextColor="#3a6b50"
            keyboardType="decimal-pad"
          />

          <Text style={styles.formLabel}>Stock inicial (opcional)</Text>
          <TextInput
            style={styles.formInput}
            value={productForm.stock}
            onChangeText={(v) => onUpdateProductField("stock", v)}
            placeholder="0"
            placeholderTextColor="#3a6b50"
            keyboardType="decimal-pad"
          />

          <TouchableOpacity
            style={[
              styles.btnSave,
              styles.btnSaveCyan,
              (!isProductFormValid || savingProduct) && styles.btnSaveDisabled,
            ]}
            onPress={onSaveProduct}
            disabled={!isProductFormValid || savingProduct}
            activeOpacity={0.8}
          >
            {savingProduct ? (
              <ActivityIndicator size="small" color={C.bg} />
            ) : (
              <Text style={styles.btnSaveText}>Crear producto</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de productos */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionSubtitle}>Inventario</Text>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Sin productos aún</Text>
        </View>
      ) : (
        products.map((p) => {
          const outOfStock = Number(p.stock) <= 0;
          return (
            <View
              key={p.id}
              style={[
                styles.txCard,
                outOfStock && styles.productCardOutOfStock,
              ]}
            >
              <View
                style={[
                  styles.txAccent,
                  { backgroundColor: outOfStock ? C.danger : C.cyan },
                ]}
              />
              <View style={styles.txBody}>
                <Text
                  style={[
                    styles.txDescription,
                    outOfStock && styles.productNameOutOfStock,
                  ]}
                >
                  {p.name}
                </Text>
                {outOfStock ? (
                  <Text style={styles.outOfStockBadge}>SIN STOCK</Text>
                ) : (
                  <Text style={styles.txDate}>
                    Stock: {Number(p.stock).toFixed(0)}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: outOfStock ? C.textMuted : C.cyan },
                ]}
              >
                ${Number(p.price).toFixed(2)}
              </Text>
              {role === "admin" && (
                <TouchableOpacity
                  style={styles.btnEditProduct}
                  onPress={() => onOpenEditModal(p)}
                  activeOpacity={0.7}
                >
                  <Feather name="edit-2" size={11} color={C.bg} />
                </TouchableOpacity>
              )}
              {outOfStock ? (
                <View style={styles.btnAddCartDisabled}>
                  <Feather name="alert-circle" size={12} color={C.textMuted} />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.btnAddCart}
                  onPress={() => onAddToCart(p)}
                  activeOpacity={0.7}
                >
                  <View style={styles.btnRow}>
                    <Feather name="plus" size={12} color={C.bg} />
                    <Text style={styles.btnAddCartText}>Agregar</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}

      {/* Modal editar producto */}
      <Modal
        visible={editingProduct !== null}
        transparent
        animationType="fade"
        onRequestClose={onCloseEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.sectionSubtitle}>Editar producto</Text>

            <Text style={styles.formLabel}>Nombre</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.name}
              onChangeText={(v) =>
                onEditFormChange({ ...editForm, name: v })
              }
              placeholder="Nombre del producto"
              placeholderTextColor="#3a6b50"
            />

            <Text style={styles.formLabel}>Precio</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.price}
              onChangeText={(v) =>
                onEditFormChange({ ...editForm, price: v })
              }
              placeholder="0.00"
              placeholderTextColor="#3a6b50"
              keyboardType="decimal-pad"
            />

            <Text style={styles.formLabel}>Stock</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.stock}
              onChangeText={(v) =>
                onEditFormChange({ ...editForm, stock: v })
              }
              placeholder="0"
              placeholderTextColor="#3a6b50"
              keyboardType="decimal-pad"
            />

            <Text style={styles.formLabel}>Descripción (opcional)</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.description}
              onChangeText={(v) =>
                onEditFormChange({ ...editForm, description: v })
              }
              placeholder="Descripción del producto"
              placeholderTextColor="#3a6b50"
            />

            <TouchableOpacity
              style={[
                styles.btnSave,
                styles.btnSaveCyan,
                (!isEditFormValid || savingEdit) && styles.btnSaveDisabled,
              ]}
              onPress={onSaveEdit}
              disabled={!isEditFormValid || savingEdit}
              activeOpacity={0.8}
            >
              {savingEdit ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <Text style={styles.btnSaveText}>Guardar cambios</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onCloseEditModal}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
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
  btnSaveCyan: {
    backgroundColor: C.cyan,
    shadowColor: C.cyan,
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
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
    paddingRight: 14,
  },
  btnEditProduct: {
    backgroundColor: C.gold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  btnEditProductText: {
    color: C.bg,
    fontSize: 11,
    fontWeight: "700",
  },
  btnAddCart: {
    backgroundColor: C.cyan,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  btnAddCartText: {
    color: C.bg,
    fontSize: 11,
    fontWeight: "700",
  },
  productCardOutOfStock: {
    opacity: 0.5,
  },
  productNameOutOfStock: {
    color: C.textMuted,
  },
  outOfStockBadge: {
    color: C.danger,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },
  btnAddCartDisabled: {
    backgroundColor: "#1a2e24",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  btnAddCartDisabledText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },
  btnCancel: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnCancelText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
});
