import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AdminScreenHeader from "../../src/components/ui/AdminScreenHeader";
import { InventorySection } from "../../src/components/home/InventorySection";
import { useCart } from "../../src/context/CartContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useToast } from "../../src/context/ToastContext";
import { useCompany } from "../../src/hooks/useCompany";
import {
  type ProductCategory,
  createCategory,
  getCategoriesByCompany,
  toggleCategory,
  updateCategory,
} from "../../src/services/categories";
import {
  Product,
  createProduct,
  deleteProduct,
  getProductsByCompany,
  updateProduct,
} from "../../src/services/products";

const INITIAL_PRODUCT_FORM = {
  name: "",
  price: "",
  stock: "",
  categoryId: "",
};

export default function InventoryScreen() {
  const { company, role, loading } = useCompany();
  const { showToast } = useToast();
  const { cart, addToCart: ctxAddToCart } = useCart();
  const { colors, isDark } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    stock: "",
    description: "",
    categoryId: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [savingCategoryEdit, setSavingCategoryEdit] = useState(false);
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(10)).current;

  const companyIdRef = useRef<string | null>(null);

  const loadData = useCallback(async (companyId: string) => {
    setLoadingData(true);
    try {
      const [prods, cats] = await Promise.all([
        getProductsByCompany(companyId),
        getCategoriesByCompany(companyId),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e: any) {
      if (__DEV__) console.error("Error cargando datos:", e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    if (companyIdRef.current === company.id) return;
    companyIdRef.current = company.id;
    loadData(company.id);
  }, [company, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!company?.id) return;
      loadData(company.id);
    }, [company?.id, loadData]),
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [cardFade, cardSlide]);

  const updateProductField = (key: string, value: string) =>
    setProductForm((prev) => ({ ...prev, [key]: value }));

  const parsedPrice = parseFloat(productForm.price);
  const parsedStock = productForm.stock ? parseFloat(productForm.stock) : 0;
  const isProductFormValid =
    productForm.name.trim().length > 0 &&
    !isNaN(parsedPrice) &&
    parsedPrice > 0 &&
    !!company;

  const handleSaveProduct = useCallback(async () => {
    if (!company?.id || !isProductFormValid || savingProduct) return;

    setSavingProduct(true);
    try {
      await createProduct({
        companyId: company.id,
        name: productForm.name.trim(),
        price: parsedPrice,
        stock: parsedStock || undefined,
        categoryId: productForm.categoryId || undefined,
      });
      setProductForm(INITIAL_PRODUCT_FORM);
      await loadData(company.id);
      showToast("Producto creado correctamente", "success");
    } catch (e: any) {
      showToast("Ocurrió un error al guardar el producto. Verifica los datos e intenta otra vez.", "error");
    } finally {
      setSavingProduct(false);
    }
  }, [
    company,
    isProductFormValid,
    savingProduct,
    productForm,
    parsedPrice,
    parsedStock,
    loadData,
    showToast,
  ]);

  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      description: product.description ?? "",
      categoryId: product.category_id ?? "",
    });
  }, []);

  const parsedEditPrice = parseFloat(editForm.price);
  const isEditFormValid =
    editForm.name.trim().length > 0 &&
    !isNaN(parsedEditPrice) &&
    parsedEditPrice > 0;

  const handleSaveEdit = useCallback(async () => {
    if (!editingProduct || !isEditFormValid || savingEdit) return;

    setSavingEdit(true);
    try {
      await updateProduct(editingProduct.id, {
        name: editForm.name.trim(),
        price: parsedEditPrice,
        stock: editForm.stock ? parseFloat(editForm.stock) : 0,
        description: editForm.description.trim() || undefined,
        category_id: editForm.categoryId || null,
      });
      setEditingProduct(null);
      if (company?.id) await loadData(company.id);
      showToast("Producto actualizado", "success");
    } catch (e: any) {
      showToast("Hubo un error al actualizar el producto. Inténtalo nuevamente.", "error");
    } finally {
      setSavingEdit(false);
    }
  }, [
    editingProduct,
    isEditFormValid,
    savingEdit,
    editForm,
    parsedEditPrice,
    company,
    loadData,
    showToast,
  ]);

  const handleAddToCartFromInventory = useCallback(
    (product: Product) => {
      ctxAddToCart(product, showToast);
    },
    [ctxAddToCart, showToast],
  );

  // ─── Category Handlers ───
  const handleSaveCategory = useCallback(async () => {
    if (!company?.id || !categoryName.trim() || savingCategory) return;
    setSavingCategory(true);
    try {
      await createCategory({ companyId: company.id, name: categoryName.trim() });
      setCategoryName("");
      const cats = await getCategoriesByCompany(company.id);
      setCategories(cats);
      showToast("Categoría creada", "success");
    } catch {
      showToast("Error al crear la categoría", "error");
    } finally {
      setSavingCategory(false);
    }
  }, [company, categoryName, savingCategory, showToast]);

  const handleSaveCategoryEdit = useCallback(async () => {
    if (!editingCategory || !editCategoryName.trim() || savingCategoryEdit) return;
    setSavingCategoryEdit(true);
    try {
      await updateCategory(editingCategory.id, { name: editCategoryName.trim() });
      setEditingCategory(null);
      if (company?.id) {
        const cats = await getCategoriesByCompany(company.id);
        setCategories(cats);
      }
      showToast("Categoría actualizada", "success");
    } catch {
      showToast("Error al actualizar la categoría", "error");
    } finally {
      setSavingCategoryEdit(false);
    }
  }, [editingCategory, editCategoryName, savingCategoryEdit, company, showToast]);

  const handleToggleCategory = useCallback(async (catId: string, isActive: boolean) => {
    try {
      await toggleCategory(catId, isActive);
      if (company?.id) {
        const cats = await getCategoriesByCompany(company.id);
        setCategories(cats);
      }
    } catch {
      showToast("Error al cambiar estado de la categoría", "error");
    }
  }, [company, showToast]);

  const handleDeleteProduct = useCallback(async () => {
    if (!editingProduct || deletingProduct) return;

    setDeletingProduct(true);
    try {
      await deleteProduct(editingProduct.id);
      setEditingProduct(null);
      if (company?.id) await loadData(company.id);
      showToast("Producto eliminado correctamente", "success");
    } catch (e: any) {
      showToast("Hubo un error al eliminar el producto. Inténtalo nuevamente.", "error");
    } finally {
      setDeletingProduct(false);
    }
  }, [editingProduct, deletingProduct, company, loadData, showToast]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={colors.emerald} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando inventario...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminScreenHeader
          title="Inventario"
          roleLabel={role === "admin" ? "Jefe" : "Empleado"}
          subtitle="Gestiona productos, categorías y stock"
        />

        {loadingData && (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        )}

        <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>
          <InventorySection
            role={role}
            products={products}
            cart={cart}
            productForm={productForm}
            onUpdateProductField={updateProductField}
            isProductFormValid={isProductFormValid}
            savingProduct={savingProduct}
            onSaveProduct={handleSaveProduct}
            onAddToCart={handleAddToCartFromInventory}
            editingProduct={editingProduct}
            editForm={editForm}
            onEditFormChange={setEditForm}
            isEditFormValid={isEditFormValid}
            savingEdit={savingEdit}
            onSaveEdit={handleSaveEdit}
            onOpenEditModal={openEditModal}
            onCloseEditModal={() => setEditingProduct(null)}
            deletingProduct={deletingProduct}
            onDeleteProduct={handleDeleteProduct}
            categories={categories}
            categoryName={categoryName}
            onCategoryNameChange={setCategoryName}
            savingCategory={savingCategory}
            onSaveCategory={handleSaveCategory}
            editingCategory={editingCategory}
            editCategoryName={editCategoryName}
            onEditCategoryNameChange={setEditCategoryName}
            savingCategoryEdit={savingCategoryEdit}
            onSaveCategoryEdit={handleSaveCategoryEdit}
            onOpenEditCategory={(cat) => {
              setEditingCategory(cat);
              setEditCategoryName(cat.name);
            }}
            onCloseEditCategory={() => setEditingCategory(null)}
            onToggleCategory={handleToggleCategory}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingInline: {
    marginBottom: 8,
    marginTop: 8,
    alignItems: "flex-start",
  },
});
