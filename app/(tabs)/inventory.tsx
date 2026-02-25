import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { InventorySection } from "../../src/components/home/InventorySection";
import { C } from "../../src/constants/colors";
import { useToast } from "../../src/context/ToastContext";
import { useCompany } from "../../src/hooks/useCompany";
import {
  Product,
  createProduct,
  getProductsByCompany,
  updateProduct,
} from "../../src/services/products";

const INITIAL_PRODUCT_FORM = {
  name: "",
  price: "",
  stock: "",
};

export default function InventoryScreen() {
  const { company, role, loading } = useCompany();
  const { showToast } = useToast();
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
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const companyIdRef = useRef<string | null>(null);

  const loadProducts = useCallback(async (companyId: string) => {
    setLoadingData(true);
    try {
      const data = await getProductsByCompany(companyId);
      setProducts(data);
    } catch (e: any) {
      if (__DEV__) console.error("Error cargando productos:", e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    if (companyIdRef.current === company.id) return;
    companyIdRef.current = company.id;
    loadProducts(company.id);
  }, [company, loadProducts]);

  const updateProductField = (key: keyof typeof INITIAL_PRODUCT_FORM, value: string) =>
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
      });
      setProductForm(INITIAL_PRODUCT_FORM);
      await loadProducts(company.id);
      showToast("Producto creado correctamente", "success");
    } catch (e: any) {
      showToast(e?.message ?? "Error desconocido", "error");
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
    loadProducts,
    showToast,
  ]);

  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      description: product.description ?? "",
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
      });
      setEditingProduct(null);
      if (company?.id) await loadProducts(company.id);
      showToast("Producto actualizado", "success");
    } catch (e: any) {
      showToast(e?.message ?? "Error desconocido", "error");
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
    loadProducts,
    showToast,
  ]);

  const handleAddToCartFromInventory = useCallback(
    (product: Product) => {
      showToast(`"${product.name}" agregado. Completa la venta en POS`, "info");
    },
    [showToast],
  );

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={C.emerald} />
        <Text style={styles.loadingText}>Cargando inventario...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loadingData && (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={C.textMuted} />
          </View>
        )}

        <InventorySection
          role={role}
          products={products}
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
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: C.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingInline: {
    marginBottom: 8,
    marginTop: 8,
    alignItems: "flex-start",
  },
});
