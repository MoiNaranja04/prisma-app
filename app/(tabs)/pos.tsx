import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CartSection } from "../../src/components/home/CartSection";
import { C } from "../../src/constants/colors";
import { useToast } from "../../src/context/ToastContext";
import { useCompany } from "../../src/hooks/useCompany";
import {
  Customer,
  createCustomer,
  deleteCustomer,
  getCustomersByCompany,
  seedExampleCustomers,
  updateCustomer,
} from "../../src/services/customers";
import { Product, getProductsByCompany } from "../../src/services/products";
import { createSaleWithItems } from "../../src/services/sales";

interface CartItemUI {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export default function PosScreen() {
  const { company, role, loading } = useCompany();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [cart, setCart] = useState<CartItemUI[]>([]);
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState<"list" | "form">(
    "list",
  );
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    document: "",
    documentType: "V",
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const companyIdRef = useRef<string | null>(null);

  const loadData = useCallback(async (companyId: string) => {
    setLoadingData(true);
    try {
      const [prodRes, custRes] = await Promise.allSettled([
        getProductsByCompany(companyId),
        getCustomersByCompany(companyId),
      ]);
      if (prodRes.status === "fulfilled") setProducts(prodRes.value);
      if (custRes.status === "fulfilled") {
        if (custRes.value.length === 0) {
          try {
            const seeded = await seedExampleCustomers(companyId);
            setCustomers(seeded);
          } catch {
            setCustomers([]);
          }
        } else {
          setCustomers(custRes.value);
        }
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  const reloadProducts = useCallback(async (companyId: string) => {
    try {
      const data = await getProductsByCompany(companyId);
      setProducts(data);
    } catch (e: any) {
      if (__DEV__) console.error("Error recargando productos:", e);
    }
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    if (companyIdRef.current === company.id) return;
    companyIdRef.current = company.id;
    loadData(company.id);
  }, [company, loadData]);

  const addToCart = useCallback(
    (product: Product) => {
      const stock = Number(product.stock);
      if (stock <= 0) {
        showToast(`"${product.name}" no tiene stock disponible`, "error");
        return;
      }

      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          if (existing.quantity >= stock) {
            showToast(
              `Solo hay ${stock} unidad(es) de "${product.name}"`,
              "error",
            );
            return prev;
          }
          return prev.map((i) =>
            i.productId === product.id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  subtotal: (i.quantity + 1) * i.price,
                }
              : i,
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: 1,
            subtotal: Number(product.price),
          },
        ];
      });
    },
    [showToast],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) => prev.filter((i) => i.productId !== productId));
        return;
      }

      const product = products.find((p) => p.id === productId);
      const stock = product ? Number(product.stock) : Infinity;

      if (quantity > stock) {
        showToast(`Solo hay ${stock} unidad(es) de "${product?.name}"`, "error");
        return;
      }

      setCart((prev) =>
        prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity, subtotal: quantity * i.price }
            : i,
        ),
      );
    },
    [products, showToast],
  );

  const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);

  const handleConfirmSale = useCallback(async () => {
    if (!company?.id) {
      showToast("No se encontró la empresa. Reinicia la app.", "error");
      return;
    }
    if (cart.length === 0) {
      showToast("Agrega productos al carrito antes de confirmar", "error");
      return;
    }
    if (isConfirmingSale) return;

    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        showToast(`"${item.name}" ya no existe en el inventario`, "error");
        return;
      }
      const stock = Number(product.stock);
      if (stock <= 0) {
        showToast(`"${item.name}" no tiene stock disponible`, "error");
        return;
      }
      if (item.quantity > stock) {
        showToast(`Solo hay ${stock} unidad(es) de "${item.name}"`, "error");
        return;
      }
    }

    setIsConfirmingSale(true);
    try {
      const customer = customers.find((c) => c.id === selectedCustomerId);
      const customerName = customer?.name ?? "Venta mostrador";
      const items = cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
      await createSaleWithItems(
        company.id,
        customerName,
        items,
        selectedCustomerId,
      );
      setCart([]);
      setSelectedCustomerId(null);
      await reloadProducts(company.id);
      showToast("La venta se registró correctamente", "success");
    } catch (e: any) {
      if (__DEV__) console.error("Error en venta:", e);
      showToast(e?.message ?? "Error desconocido", "error");
    } finally {
      setIsConfirmingSale(false);
    }
  }, [
    company,
    cart,
    isConfirmingSale,
    products,
    customers,
    selectedCustomerId,
    reloadProducts,
    showToast,
  ]);

  const openCustomerModal = useCallback(() => {
    setCustomerModalMode("list");
    setEditingCustomer(null);
    setCustomerForm({ name: "", phone: "", document: "", documentType: "V" });
    setCustomerModalVisible(true);
  }, []);

  const openCustomerForm = useCallback((customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      const doc = customer.document ?? "";
      const docMatch = doc.match(/^([VJE])-(.+)$/i);
      setCustomerForm({
        name: customer.name,
        phone: customer.phone ?? "",
        documentType: docMatch ? docMatch[1].toUpperCase() : "V",
        document: docMatch ? docMatch[2] : doc,
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({ name: "", phone: "", document: "", documentType: "V" });
    }
    setCustomerModalMode("form");
  }, []);

  const isCustomerFormValid = customerForm.name.trim().length > 0;

  const handleSaveCustomer = useCallback(async () => {
    if (!company?.id || !isCustomerFormValid || savingCustomer) return;

    setSavingCustomer(true);
    try {
      const docNum = customerForm.document.trim();
      const fullDocument = docNum
        ? `${customerForm.documentType}-${docNum}`
        : null;

      let savedCustomer: Customer;
      if (editingCustomer) {
        savedCustomer = await updateCustomer(editingCustomer.id, {
          name: customerForm.name.trim(),
          phone: customerForm.phone.trim() || null,
          document: fullDocument,
        });
        setCustomers((prev) =>
          prev
            .map((c) => (c.id === savedCustomer.id ? savedCustomer : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } else {
        savedCustomer = await createCustomer({
          companyId: company.id,
          name: customerForm.name.trim(),
          phone: customerForm.phone.trim() || undefined,
          document: fullDocument || undefined,
        });
        setCustomers((prev) =>
          [...prev, savedCustomer].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSelectedCustomerId(savedCustomer.id);
      }
      setCustomerModalVisible(false);
      setCustomerModalMode("list");
      setEditingCustomer(null);
      setCustomerForm({ name: "", phone: "", document: "", documentType: "V" });
    } catch (e: any) {
      showToast(e?.message ?? "Error desconocido", "error");
    } finally {
      setSavingCustomer(false);
    }
  }, [
    company,
    isCustomerFormValid,
    savingCustomer,
    editingCustomer,
    customerForm,
    showToast,
  ]);

  const handleDeleteCustomer = useCallback(
    async (customerId: string) => {
      if (!company?.id) return;
      try {
        await deleteCustomer(customerId);
        setCustomers((prev) => prev.filter((c) => c.id !== customerId));
        if (selectedCustomerId === customerId) setSelectedCustomerId(null);
      } catch (e: any) {
        showToast(e?.message ?? "Error desconocido", "error");
      }
    },
    [company, selectedCustomerId, showToast],
  );

  const selectCustomerFromModal = useCallback((customerId: string | null) => {
    setSelectedCustomerId(customerId);
    setCustomerModalVisible(false);
  }, []);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={C.emerald} />
        <Text style={styles.loadingText}>Cargando empresa...</Text>
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

        <View style={styles.productPickerCard}>
          <Text style={styles.sectionSubtitle}>Productos rápidos</Text>
          {products.length === 0 ? (
            <Text style={styles.emptyText}>Sin productos en inventario</Text>
          ) : (
            products.map((p) => {
              const outOfStock = Number(p.stock) <= 0;
              return (
                <View key={p.id} style={styles.productRow}>
                  <View style={styles.productRowBody}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productMeta}>
                      Stock: {Number(p.stock).toFixed(0)} · ${Number(p.price).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      outOfStock && styles.addBtnDisabled,
                    ]}
                    disabled={outOfStock}
                    onPress={() => addToCart(p)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={outOfStock ? "x" : "plus"}
                      size={12}
                      color={outOfStock ? C.textMuted : C.bg}
                    />
                    <Text
                      style={[
                        styles.addBtnText,
                        outOfStock && styles.addBtnTextDisabled,
                      ]}
                    >
                      {outOfStock ? "Sin stock" : "Agregar"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.blockSpace} />

        <CartSection
          role={role}
          cart={cart}
          products={products}
          cartTotal={cartTotal}
          isConfirmingSale={isConfirmingSale}
          onUpdateQuantity={updateQuantity}
          onConfirmSale={handleConfirmSale}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onOpenCustomerModal={openCustomerModal}
          customerModalVisible={customerModalVisible}
          customerModalMode={customerModalMode}
          onSetCustomerModalMode={setCustomerModalMode}
          onCloseCustomerModal={() => setCustomerModalVisible(false)}
          onSelectCustomer={selectCustomerFromModal}
          onOpenCustomerForm={openCustomerForm}
          editingCustomer={editingCustomer}
          customerForm={customerForm}
          onCustomerFormChange={setCustomerForm}
          isCustomerFormValid={isCustomerFormValid}
          savingCustomer={savingCustomer}
          onSaveCustomer={handleSaveCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          showToast={showToast}
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
    marginBottom: 14,
    marginTop: 10,
    alignItems: "flex-start",
  },
  productPickerCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    shadowColor: C.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
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
  emptyText: {
    color: C.textMuted,
    fontSize: 13,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  productRowBody: {
    flex: 1,
    paddingRight: 10,
  },
  productName: {
    color: C.text,
    fontSize: 14,
    fontWeight: "700",
  },
  productMeta: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.cyan,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnDisabled: {
    backgroundColor: "#1a2e24",
  },
  addBtnText: {
    color: C.bg,
    fontSize: 12,
    fontWeight: "700",
  },
  addBtnTextDisabled: {
    color: C.textMuted,
  },
  blockSpace: {
    height: 10,
  },
});
