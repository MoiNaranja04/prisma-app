import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { ProductCategory } from "../../lib/categories";
import { C } from "../../constants/colors";
import type { CartItemUI } from "../../context/CartContext";
import type { Product } from "../../lib/products";
import { FloatingModal } from "../ui/FloatingModal";
import ThemedTextInput from "../ui/ThemedTextInput";

interface ProductForm {
  name: string;
  price: string;
  stock: string;
  categoryId: string;
}

interface EditForm {
  name: string;
  price: string;
  stock: string;
  description: string;
  categoryId: string;
}

interface Props {
  role: "admin" | "employee";
  products: Product[];
  cart: CartItemUI[];
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
  deletingProduct?: boolean;
  onDeleteProduct?: () => void;
  // Categorías
  categories: ProductCategory[];
  categoryName: string;
  onCategoryNameChange: (name: string) => void;
  savingCategory: boolean;
  onSaveCategory: () => void;
  editingCategory: ProductCategory | null;
  editCategoryName: string;
  onEditCategoryNameChange: (name: string) => void;
  savingCategoryEdit: boolean;
  onSaveCategoryEdit: () => void;
  onOpenEditCategory: (cat: ProductCategory) => void;
  onCloseEditCategory: () => void;
  onToggleCategory: (catId: string, isActive: boolean) => void;
}

export function InventorySection({
  role,
  products,
  cart,
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
  deletingProduct,
  onDeleteProduct,
  categories,
  categoryName,
  onCategoryNameChange,
  savingCategory,
  onSaveCategory,
  editingCategory,
  editCategoryName,
  onEditCategoryNameChange,
  savingCategoryEdit,
  onSaveCategoryEdit,
  onOpenEditCategory,
  onCloseEditCategory,
  onToggleCategory,
}: Props) {
  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <>
      {/* Gestión de categorías */}
      {role === "admin" && (
        <View style={styles.formCard}>
          <Text style={styles.sectionSubtitle}>Categorías</Text>

          <View style={styles.catCreateRow}>
            <ThemedTextInput
              style={[styles.formInput, styles.catInput]}
              value={categoryName}
              onChangeText={onCategoryNameChange}
              placeholder="Nueva categoría"
              placeholderTextColor="#98A2B3"
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />
            <TouchableOpacity
              style={[
                styles.catCreateBtn,
                (!categoryName.trim() || savingCategory) && styles.btnSaveDisabled,
              ]}
              onPress={onSaveCategory}
              disabled={!categoryName.trim() || savingCategory}
              activeOpacity={0.8}
            >
              {savingCategory ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="plus" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {categories.length > 0 && (
            <View style={styles.catList}>
              {categories.map((cat) => (
                <View
                  key={cat.id}
                  style={[styles.catRow, !cat.is_active && styles.catRowInactive]}
                >
                  {editingCategory?.id === cat.id ? (
                    <View style={styles.catEditRow}>
                      <ThemedTextInput
                        style={[styles.formInput, styles.catEditInput]}
                        value={editCategoryName}
                        onChangeText={onEditCategoryNameChange}
                        autoFocus
                        selectionColor="transparent"
                        underlineColorAndroid="transparent"
                      />
                      <TouchableOpacity
                        style={styles.catEditBtn}
                        onPress={onSaveCategoryEdit}
                        disabled={!editCategoryName.trim() || savingCategoryEdit}
                        activeOpacity={0.7}
                      >
                        <Feather name="check" size={16} color={C.emerald} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.catEditBtn}
                        onPress={onCloseEditCategory}
                        activeOpacity={0.7}
                      >
                        <Feather name="x" size={16} color={C.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.catName, !cat.is_active && styles.catNameInactive]}>
                        {cat.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.catActionBtn}
                        onPress={() => onToggleCategory(cat.id, !cat.is_active)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name={cat.is_active ? "eye" : "eye-off"}
                          size={14}
                          color={cat.is_active ? C.emerald : C.textMuted}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.catActionBtn}
                        onPress={() => onOpenEditCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <Feather name="edit-2" size={14} color={C.textMuted} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Formulario nuevo producto */}
      {role === "admin" && (
        <View style={styles.formCard}>
          <Text style={styles.sectionSubtitle}>Productos</Text>

          <Text style={styles.formLabel}>Nombre</Text>
          <ThemedTextInput
            style={styles.formInput}
            value={productForm.name}
            onChangeText={(v) => onUpdateProductField("name", v)}
            placeholder="Nombre del producto"
            placeholderTextColor="#98A2B3"
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />

          <Text style={styles.formLabel}>Precio</Text>
          <ThemedTextInput
            style={styles.formInput}
            value={productForm.price}
            onChangeText={(v) => onUpdateProductField("price", v)}
            placeholder="0.00"
            placeholderTextColor="#98A2B3"
            keyboardType="decimal-pad"
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />

          <Text style={styles.formLabel}>Stock inicial (opcional)</Text>
          <ThemedTextInput
            style={styles.formInput}
            value={productForm.stock}
            onChangeText={(v) => onUpdateProductField("stock", v)}
            placeholder="0"
            placeholderTextColor="#98A2B3"
            keyboardType="decimal-pad"
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />

          {activeCategories.length > 0 && (
            <>
              <Text style={styles.formLabel}>Categoría (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catChipsScroll}>
                <TouchableOpacity
                  style={[styles.catChip, !productForm.categoryId && styles.catChipSelected]}
                  onPress={() => onUpdateProductField("categoryId", "")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catChipText, !productForm.categoryId && styles.catChipTextSelected]}>
                    Sin categoría
                  </Text>
                </TouchableOpacity>
                {activeCategories.map((cat) => {
                  const selected = productForm.categoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, selected && styles.catChipSelected]}
                      onPress={() => onUpdateProductField("categoryId", cat.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.catChipText, selected && styles.catChipTextSelected]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

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
          const dbStock = Number(p.stock);
          const cartQty = cart.find((item) => item.productId === p.id)?.quantity ?? 0;
          const availableStock = dbStock - cartQty;
          const outOfStock = availableStock <= 0;
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
                    Stock: {Math.max(0, availableStock).toFixed(0)}
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
      <FloatingModal
        visible={editingProduct !== null}
        onRequestClose={onCloseEditModal}
        cardStyle={styles.modalContainer}
      >
          <View>
            <Text style={styles.sectionSubtitle}>Editar producto</Text>

            <Text style={styles.formLabel}>Nombre</Text>
            <ThemedTextInput
              style={styles.formInput}
              value={editForm.name}
              onChangeText={(v) =>
                onEditFormChange({ ...editForm, name: v })
              }
              placeholder="Nombre del producto"
              placeholderTextColor="#98A2B3"
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />

            <Text style={styles.formLabel}>Precio</Text>
            <ThemedTextInput
              style={styles.formInput}
              value={editForm.price}
              onChangeText={(v) =>
                onEditFormChange({ ...editForm, price: v })
              }
              placeholder="0.00"
              placeholderTextColor="#98A2B3"
              keyboardType="decimal-pad"
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />

            <Text style={styles.formLabel}>Stock</Text>
            <ThemedTextInput
              style={styles.formInput}
              value={editForm.stock}
              onChangeText={(v) =>
                onEditFormChange({ ...editForm, stock: v })
              }
              placeholder="0"
              placeholderTextColor="#98A2B3"
              keyboardType="decimal-pad"
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />

            <Text style={styles.formLabel}>Descripción (opcional)</Text>
            <ThemedTextInput
              style={styles.formInput}
              value={editForm.description}
              onChangeText={(v) =>
                onEditFormChange({ ...editForm, description: v })
              }
              placeholder="Descripción del producto"
              placeholderTextColor="#98A2B3"
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />

            {activeCategories.length > 0 && (
              <>
                <Text style={styles.formLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catChipsScroll}>
                  <TouchableOpacity
                    style={[styles.catChip, !editForm.categoryId && styles.catChipSelected]}
                    onPress={() => onEditFormChange({ ...editForm, categoryId: "" })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.catChipText, !editForm.categoryId && styles.catChipTextSelected]}>
                      Sin categoría
                    </Text>
                  </TouchableOpacity>
                  {activeCategories.map((cat) => {
                    const selected = editForm.categoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catChip, selected && styles.catChipSelected]}
                        onPress={() => onEditFormChange({ ...editForm, categoryId: cat.id })}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.catChipText, selected && styles.catChipTextSelected]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

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

            {role === "admin" && onDeleteProduct && (
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={onDeleteProduct}
                disabled={deletingProduct}
                activeOpacity={0.8}
              >
                {deletingProduct ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.btnDeleteText}>Eliminar producto</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onCloseEditModal}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
      </FloatingModal>
    </>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: C.textMuted,
    marginBottom: 12,
    marginTop: 2,
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
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: C.text,
  },
  btnSave: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  btnSaveCyan: {
    backgroundColor: C.cyan,
    shadowColor: C.cyan,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
    borderRadius: 10,
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
    borderRadius: 10,
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
    backgroundColor: "#F2F4F7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  btnAddCartDisabledText: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  modalContainer: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 20,
    width: "100%",
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
  btnDelete: {
    backgroundColor: C.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  btnDeleteText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // ─── Categorías ───
  catCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catInput: {
    flex: 1,
  },
  catCreateBtn: {
    backgroundColor: C.emerald,
    borderRadius: 10,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  catList: {
    marginTop: 12,
    gap: 6,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  catRowInactive: {
    opacity: 0.5,
  },
  catName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  catNameInactive: {
    color: C.textMuted,
  },
  catActionBtn: {
    padding: 6,
    marginLeft: 4,
  },
  catEditRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  catEditInput: {
    flex: 1,
    paddingVertical: 6,
  },
  catEditBtn: {
    padding: 6,
  },

  // ─── Category Chips (forms) ───
  catChipsScroll: {
    marginTop: 6,
    marginBottom: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  catChipSelected: {
    backgroundColor: C.emerald,
    borderColor: C.emerald,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.text,
  },
  catChipTextSelected: {
    color: "#FFFFFF",
  },
});




