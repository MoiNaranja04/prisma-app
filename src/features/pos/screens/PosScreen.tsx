import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminPosHistory } from "@/src/components/pos/AdminPosHistory";
import { CartBottomSheet } from "@/src/components/pos/CartBottomSheet";
import { CustomerModal } from "@/src/components/pos/CustomerModal";
import { ProfileModal } from "@/src/components/pos/ProfileModal";
import ThemedTextInput from "@/src/components/ui/ThemedTextInput";
import { C } from "@/src/constants/colors";
import { useCart } from "@/src/context/CartContext";
import { useTheme } from "@/src/context/ThemeContext";
import { useToast } from "@/src/context/ToastContext";
import { useCompany } from "@/src/hooks/useCompany";
import { type ProductCategory, getCategoriesByCompany } from "@/src/lib/categories";
import {
  Customer,
  createCustomer,
  deleteCustomer,
  getCustomersByCompany,
  seedExampleCustomers,
  updateCustomer,
} from "@/src/lib/customers";
import { Product, getProductsByCompany } from "@/src/lib/products";
import { createSaleWithItems } from "@/src/lib/sales";
import { supabase } from "@/src/lib/supabase";
export default function PosScreen() {
  const router = useRouter();
  const { company, role, loading } = useCompany();
  const { showToast } = useToast();
  const { colors, isDark } = useTheme();
  const { cart, addToCart: ctxAddToCart, updateQuantity: ctxUpdateQuantity, cartTotal, clearCart } = useCart();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Employee-specific state
  const [employeeName, setEmployeeName] = useState("");
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const companyIdRef = useRef<string | null>(null);
  const isEmployee = role === "employee";

  // Load employee name
  useEffect(() => {
    if (!isEmployee) return;
    const loadName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("company_users")
          .select("name")
          .eq("user_id", user.id)
          .maybeSingle();
        setEmployeeName(data?.name ?? user.email?.split("@")[0] ?? "");
      } catch {
        // ignore
      }
    };
    loadName();
  }, [isEmployee]);

  const loadData = useCallback(async (companyId: string) => {
    setLoadingData(true);
    try {
      const [prodRes, custRes, catRes] = await Promise.allSettled([
        getProductsByCompany(companyId),
        getCustomersByCompany(companyId),
        getCategoriesByCompany(companyId),
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
      if (catRes.status === "fulfilled") setCategories(catRes.value);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const reloadProducts = useCallback(async (companyId: string) => {
    try {
      const data = await getProductsByCompany(companyId);
      setProducts(data);
    } catch (error: unknown) {
      if (__DEV__) console.error("Error recargando productos:", error);
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
      ctxAddToCart(product, showToast);
    },
    [ctxAddToCart, showToast],
  );

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategoryId) {
      filtered = filtered.filter(p => p.category_id === selectedCategoryId);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
    }
    return filtered;
  }, [products, searchQuery, selectedCategoryId]);

  // Only show active categories that have at least 1 product
  const visibleCategories = useMemo(() => {
    const activeCats = categories.filter(c => c.is_active);
    return activeCats.filter(cat =>
      products.some(p => p.category_id === cat.id)
    );
  }, [categories, products]);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      ctxUpdateQuantity(productId, quantity, products, showToast);
    },
    [ctxUpdateQuantity, products, showToast],
  );

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const categoriesWithProducts = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    filteredProducts.forEach(p => {
      const catId = p.category_id || "uncategorized";
      if (!grouped.has(catId)) grouped.set(catId, []);
      grouped.get(catId)!.push(p);
    });

    return [
      ...categories.map(c => ({
        id: c.id,
        name: c.name,
        products: grouped.get(c.id) || []
      })).filter(c => c.products.length > 0),
      ...(grouped.has("uncategorized") && grouped.get("uncategorized")!.length > 0
        ? [{ id: "uncategorized", name: "Sin categoría", products: grouped.get("uncategorized")! }]
        : [])
    ];
  }, [filteredProducts, categories]);

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
      clearCart();
      setSelectedCustomerId(null);
      await reloadProducts(company.id);
      showToast("La venta se registró correctamente", "success");
    } catch (error: unknown) {
      if (__DEV__) console.error("Error en venta:", error);
      showToast("Hubo un problema al procesar la venta. Verifícala e intenta nuevamente.", "error");
    } finally {
      setIsConfirmingSale(false);
    }
  }, [
    clearCart,
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
        showToast("✓ Cliente editado con éxito", "success");
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
        showToast("✓ Nuevo cliente registrado con éxito", "success");
      }
      setCustomerModalVisible(false);
      setCustomerModalMode("list");
      setEditingCustomer(null);
      setCustomerForm({ name: "", phone: "", document: "", documentType: "V" });
    } catch {
      showToast("Hubo un problema al guardar el cliente. Revisa los datos e intenta nuevamente.", "error");
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
        showToast("Cliente eliminado", "success");
      } catch {
        showToast("Ocurrió un error al intentar borrar el cliente. Intenta nuevamente.", "error");
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

  // ─── Employee Layout ───
  if (isEmployee) {
    return (
      <View style={styles.root}>
        {/* Employee Header */}
        <View style={styles.employeeHeader}>
          <Text style={styles.headerName}>{employeeName || "Empleado"}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push("/sales")}
              activeOpacity={0.7}
            >
              <Feather name="clock" size={22} color={C.emerald} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setProfileModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>
                  {(employeeName || "?")[0].toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.employeeSearchWrap}>
          <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
            <Feather name="search" size={16} color={searchFocused ? "#166534" : "#6B7280"} />
            <ThemedTextInput
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category chips */}
        {visibleCategories.length > 0 && (
          <FlatList
            horizontal
            data={[{ id: null, name: "Todos" } as { id: string | null; name: string }, ...visibleCategories]}
            keyExtractor={(item) => item.id ?? "all"}
            showsHorizontalScrollIndicator={false}
            style={styles.categoryChipList}
            contentContainerStyle={styles.categoryChipContent}
            renderItem={({ item }) => {
              const isSelected = selectedCategoryId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                  onPress={() => setSelectedCategoryId(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Product list */}
        {loadingData && filteredProducts.length === 0 && (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={C.textMuted} />
          </View>
        )}

        <FlatList
          data={filteredProducts}
          keyExtractor={(p) => p.id}
          style={styles.employeeFlatList}
          contentContainerStyle={styles.employeeProductList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !loadingData ? (
              <Text style={styles.emptyText}>
                {searchQuery ? "No se encontraron productos" : "Sin productos en inventario"}
              </Text>
            ) : null
          }
          renderItem={({ item: p }) => {
            const dbStock = Number(p.stock);
            const cartQty = cart.find((item) => item.productId === p.id)?.quantity ?? 0;
            const available = dbStock - cartQty;
            const outOfStock = available <= 0;
            return (
              <View style={styles.productRow}>
                <View style={styles.productRowBody}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productMeta}>
                    Disponible: {available > 0 ? available : 0} · ${Number(p.price).toFixed(2)}
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
                    {outOfStock ? "SIN STOCK" : "Agregar"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />

        {/* Cart Bottom Sheet */}
        <CartBottomSheet
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
          showToast={showToast}
        />

        {/* Customer Modal */}
        <CustomerModal
          visible={customerModalVisible}
          mode={customerModalMode}
          onSetMode={setCustomerModalMode}
          onClose={() => setCustomerModalVisible(false)}
          role={role}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={selectCustomerFromModal}
          onOpenCustomerForm={openCustomerForm}
          editingCustomer={editingCustomer}
          customerForm={customerForm}
          onCustomerFormChange={setCustomerForm}
          isCustomerFormValid={isCustomerFormValid}
          savingCustomer={savingCustomer}
          onSaveCustomer={handleSaveCustomer}
          onDeleteCustomer={handleDeleteCustomer}
        />

        {/* Profile Modal */}
        <ProfileModal
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
          userName={employeeName}
          role={role}
        />
      </View>
    );
  }

  // ─── Admin Layout ───
  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: Math.max(insets.top, 10) + 12 + 80 }, // Compensate for the absolute header height + extra separation
        ]}
        showsVerticalScrollIndicator={false}
      >

        {loadingData && (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        )}

        <View style={[styles.productPickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.sectionSubtitle}>Productos</Text>

          <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.textMuted} />
            <ThemedTextInput
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              selectionColor="transparent"
              underlineColorAndroid="transparent"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchQuery ? "No se encontraron productos" : "Sin productos en inventario"}
            </Text>
          ) : (
            <View style={styles.accordionContainer}>
              {categoriesWithProducts.map(cat => {
                const isExpanded = expandedCategories.has(cat.id);
                return (
                  <View key={cat.id} style={styles.categoryAccordionSection}>
                    <TouchableOpacity
                      style={[styles.categoryAccordionHeader, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}
                      onPress={() => toggleCategory(cat.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryAccordionTitle}>{cat.name} ({cat.products.length})</Text>
                      <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.categoryAccordionContent}>
                        {cat.products.map((p) => {
                          const dbStock = Number(p.stock);
                          const cartQty = cart.find((item) => item.productId === p.id)?.quantity ?? 0;
                          const available = dbStock - cartQty;
                          const outOfStock = available <= 0;
                          return (
                            <View key={p.id} style={styles.productRow}>
                              <View style={styles.productRowBody}>
                                <Text style={styles.productName}>{p.name}</Text>
                                <Text style={styles.productMetaCat}>{cat.name}</Text>
                                <Text style={styles.productMeta}>
                                  Disponible: {available > 0 ? available : 0} · ${Number(p.price).toFixed(2)}
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
                                  {outOfStock ? "SIN STOCK" : "Agregar"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.blockSpace} />

        <AdminPosHistory />
      </ScrollView>

      {/* Admin Integrated Header (absolute, placed last to be on top) */}
      <LinearGradient
        colors={isDark ? ["#064E3B", "#0F766E"] : ["#166534", "#15803D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.adminIntegratedHeader, { paddingTop: Math.max(insets.top, 10) + 12 }]}
      >
        <View style={styles.adminIntegratedHeaderTop}>
          <View>
            <Text style={styles.adminIntegratedHeaderTitle}>Punto de Venta</Text>
            <Text style={styles.adminIntegratedHeaderSubtitle}>Registra ventas y consulta historial</Text>
          </View>
          <View style={styles.adminHeaderBadge}>
            <Text style={styles.adminHeaderBadgeText}>Jefe</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Floating Cart (Bottom Sheet style) */}
      <CartBottomSheet
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
        showToast={showToast}
        inline={false}
        autoExpandOnAdd={true}
        isFab={false}
      />

      {/* Customer Modal */}
      <CustomerModal
        visible={customerModalVisible}
        mode={customerModalMode}
        onSetMode={setCustomerModalMode}
        onClose={() => setCustomerModalVisible(false)}
        role={role}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={selectCustomerFromModal}
        onOpenCustomerForm={openCustomerForm}
        editingCustomer={editingCustomer}
        customerForm={customerForm}
        onCustomerFormChange={setCustomerForm}
        isCustomerFormValid={isCustomerFormValid}
        savingCustomer={savingCustomer}
        onSaveCustomer={handleSaveCustomer}
        onDeleteCustomer={handleDeleteCustomer}
      />
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
    paddingBottom: 100, // Extra padding so History doesn't get covered by floating bar
  },
  loadingInline: {
    marginBottom: 14,
    marginTop: 10,
    alignItems: "flex-start",
  },

  // ─── Employee Header ───
  employeeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 8,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // ─── Employee Search ───
  employeeSearchWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: C.bg,
  },
  employeeFlatList: {
    flex: 1,
  },
  employeeProductList: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 140,
  },

  // ─── Product Picker (admin) ───
  productPickerCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  searchContainerFocused: {
    borderColor: "#166534",
    shadowColor: "rgba(22,101,52,0.15)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
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
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  productRowBody: {
    flex: 1,
    paddingRight: 10,
  },
  productName: {
    color: C.text,
    fontSize: 16,
    fontWeight: "600",
  },
  productMeta: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.cyan,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 36,
  },
  addBtnDisabled: {
    backgroundColor: "#F2F4F7",
  },
  addBtnText: {
    color: C.bg,
    fontSize: 14,
    fontWeight: "500",
  },
  addBtnTextDisabled: {
    color: C.textMuted,
  },
  blockSpace: {
    height: 10,
  },

  // ─── Category Chips ───
  categoryChipList: {
    maxHeight: 40,
    flexGrow: 0,
  },
  categoryChipContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F2F4F7",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipSelected: {
    backgroundColor: C.emerald,
    borderColor: C.emerald,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryChipTextSelected: {
    color: "#FFF",
  },

  // ─── Admin Pos Styles ───
  adminIntegratedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 100,
  },
  adminIntegratedHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adminIntegratedHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  adminIntegratedHeaderSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  adminHeaderBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminHeaderBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  accordionContainer: {
    marginTop: 8,
    gap: 12,
  },
  categoryAccordionSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  categoryAccordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  categoryAccordionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  categoryAccordionContent: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: "#FFFFFF",
  },
  productMetaCat: {
    fontSize: 11,
    color: C.violet,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 2,
  },
});
