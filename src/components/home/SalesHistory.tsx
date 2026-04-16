import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FloatingModal } from "../ui/FloatingModal";
import { useTheme } from "../../context/ThemeContext";
import type { Customer } from "../../services/customers";
import type { SaleWithItems } from "../../services/sales";

interface Props {
  role: "admin" | "employee";
  sales: SaleWithItems[];
  customers: Customer[];
  loadingData: boolean;
  cancellingId: string | null;
  onCancelSale: (sale: SaleWithItems) => void;
  saleToCancel: SaleWithItems | null;
  isCancellingSelectedSale: boolean;
  onCloseCancelModal: () => void;
  onConfirmCancel: (saleId: string) => void;
}

export function SalesHistory({
  role,
  sales,
  customers,
  loadingData,
  cancellingId,
  onCancelSale,
  saleToCancel,
  isCancellingSelectedSale,
  onCloseCancelModal,
  onConfirmCancel,
}: Props) {
  const { colors, isDark } = useTheme();
  const [showAllModal, setShowAllModal] = useState(false);

  const listFade = useRef(new Animated.Value(0)).current;
  const listSlide = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    listFade.setValue(0);
    listSlide.setValue(8);
    Animated.parallel([
      Animated.timing(listFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(listSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [sales, listFade, listSlide]);

  const cardBg = isDark ? colors.card : "#FFFFFF";

  const renderSale = (sale: SaleWithItems) => {
    const isCancelled = sale.status === "cancelled";
    const isCancelling = cancellingId === sale.id;
    const total = Number(sale.total_amount) || 0;

    const customerName = sale.customer_id
      ? (customers.find((c) => c.id === sale.customer_id)?.name ?? sale.customer_name)
      : sale.customer_name === "Venta mostrador"
        ? "Venta en tienda"
        : sale.customer_name;

    return (
      <View
        key={sale.id}
        style={[
          styles.saleCard,
          { backgroundColor: cardBg },
          isCancelled && styles.saleCardCancelled,
        ]}
      >
        {/* Icon */}
        <View
          style={[
            styles.saleIcon,
            {
              backgroundColor: isCancelled
                ? (isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2")
                : (isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5"),
            },
          ]}
        >
          <Feather
            name={isCancelled ? "x-circle" : "shopping-bag"}
            size={16}
            color={isCancelled ? "#EF4444" : "#10B981"}
          />
        </View>

        {/* Content */}
        <View style={styles.saleContent}>
          <Text
            style={[
              styles.saleName,
              { color: colors.text },
              isCancelled && styles.saleCancelledText,
            ]}
            numberOfLines={1}
          >
            {customerName}
          </Text>
          <View style={styles.saleMeta}>
            <Text style={[styles.saleDate, { color: colors.textMuted }]}>
              {new Date(sale.created_at).toLocaleDateString()}
            </Text>
            {isCancelled && (
              <View style={styles.cancelBadge}>
                <Text style={styles.cancelBadgeText}>CANCELADA</Text>
              </View>
            )}
          </View>
          {sale.items.length > 0 && (
            <View style={styles.saleItems}>
              {sale.items.map((item, idx) => (
                <View key={idx} style={[styles.saleItemPill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
                  <Text style={[styles.saleItemText, { color: colors.textMuted }]}>
                    {item.product_name} x{item.quantity}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Price + Actions */}
        <View style={styles.salePriceCol}>
          <Text
            style={[
              styles.salePrice,
              { color: isCancelled ? colors.textMuted : colors.emerald },
              isCancelled && styles.salePriceCancelled,
            ]}
          >
            ${total.toFixed(2)}
          </Text>
          {isCancelled && (
            <Text style={styles.saleRefundLabel}>Reembolsado</Text>
          )}
          {sale.status === "completed" && role === "admin" && (
            <TouchableOpacity
              style={[styles.btnCancelSale, isCancelling && styles.btnCancelSaleDisabled]}
              onPress={() => onCancelSale(sale)}
              disabled={isCancelling}
              activeOpacity={0.7}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text style={styles.btnCancelSaleText}>Cancelar</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Últimas ventas</Text>
        {loadingData && <ActivityIndicator size="small" color={colors.emerald} />}
      </View>

      {sales.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: cardBg }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
            <Feather name="shopping-cart" size={22} color="#D1D5DB" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin ventas aún</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Las ventas realizadas aparecerán aquí</Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: listFade, transform: [{ translateY: listSlide }] }}>
          {sales.slice(0, 10).map(renderSale)}
          {sales.length > 10 && (
            <TouchableOpacity
              style={[styles.btnViewAll, { backgroundColor: cardBg }]}
              onPress={() => setShowAllModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="list" size={14} color={colors.emerald} />
              <Text style={[styles.btnViewAllText, { color: colors.emerald }]}>
                Ver todas ({sales.length})
              </Text>
              <Feather name="chevron-right" size={14} color={colors.emerald} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Modal: todas las ventas */}
      <FloatingModal
        visible={showAllModal}
        onRequestClose={() => setShowAllModal(false)}
        cardStyle={[styles.floatingModalCard, { backgroundColor: isDark ? colors.bg : "#F0F4F3" }]}
      >
        <View style={styles.modalShell}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Todas las ventas</Text>
            <TouchableOpacity onPress={() => setShowAllModal(false)} activeOpacity={0.7} style={styles.modalCloseBtn}>
              <View style={[styles.modalCloseCircle, { backgroundColor: isDark ? colors.bg : "#F3F4F6" }]}>
                <Feather name="x" size={18} color={colors.text} />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={[styles.modalCount, { color: colors.textMuted }]}>{sales.length} ventas</Text>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            {sales.map(renderSale)}
          </ScrollView>
        </View>
      </FloatingModal>

      {/* Modal confirmar cancelación */}
      <FloatingModal
        visible={saleToCancel !== null}
        onRequestClose={() => { if (!isCancellingSelectedSale) onCloseCancelModal(); }}
        dismissOnBackdropPress={false}
        cardStyle={[styles.cancelCard, { backgroundColor: cardBg }]}
      >
          <View>
            <View style={[styles.cancelIconWrap, { backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2" }]}>
              <Feather name="alert-triangle" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.cancelTitle, { color: colors.text }]}>
              ¿Cancelar esta venta?
            </Text>
            <Text style={[styles.cancelDesc, { color: colors.textMuted }]}>
              Esta acción reembolsará el monto y no se puede deshacer.
            </Text>
            <View style={styles.cancelActions}>
              <TouchableOpacity
                style={[styles.cancelBtnBase, styles.cancelBtnNo, { backgroundColor: isDark ? colors.bg : "#F3F4F6" }]}
                onPress={onCloseCancelModal}
                disabled={isCancellingSelectedSale}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnNoText, { color: colors.text }]}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtnBase, styles.cancelBtnYes, isCancellingSelectedSale && styles.cancelBtnDisabled]}
                onPress={() => saleToCancel && onConfirmCancel(saleToCancel.id)}
                disabled={isCancellingSelectedSale}
                activeOpacity={0.7}
              >
                {isCancellingSelectedSale ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.cancelBtnYesText}>Sí, cancelar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
      </FloatingModal>
    </>
  );
}

const styles = StyleSheet.create({
  /* ── Header ── */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  /* ── Empty ── */
  emptyBox: {
    borderRadius: 18,
    paddingVertical: 36,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 12,
  },

  /* ── Sale Card ── */
  saleCard: {
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  saleCardCancelled: {
    opacity: 0.55,
  },
  saleIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  saleContent: {
    flex: 1,
  },
  saleName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 3,
  },
  saleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saleDate: {
    fontSize: 10,
  },
  saleCancelledText: {
    textDecorationLine: "line-through",
  },
  cancelBadge: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  cancelBadgeText: {
    color: "#EF4444",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  saleItems: {
    marginTop: 5,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  saleItemPill: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saleItemText: {
    fontSize: 10,
  },

  /* ── Price / Cancel ── */
  salePriceCol: {
    alignItems: "flex-end",
    gap: 4,
    marginLeft: 6,
  },
  salePrice: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  salePriceCancelled: {
    textDecorationLine: "line-through",
  },
  saleRefundLabel: {
    color: "#EF4444",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  btnCancelSale: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  btnCancelSaleDisabled: {
    opacity: 0.5,
  },
  btnCancelSaleText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "700",
  },

  /* ── View All ── */
  btnViewAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    height: 44,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  btnViewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* ── Modal Full ── */
  floatingModalCard: {
    width: "100%",
    height: "86%",
  },
  modalShell: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCount: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 20,
    paddingTop: 10,
    letterSpacing: 0.3,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* ── Cancel Confirmation Modal ── */
  cancelCard: {
    width: "100%",
    maxWidth: 380,
    padding: 24,
    alignItems: "center",
  },
  cancelIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  cancelTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  cancelDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  cancelActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  cancelBtnBase: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelBtnNo: {},
  cancelBtnNoText: {
    fontSize: 14,
    fontWeight: "700",
  },
  cancelBtnYes: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelBtnYesText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelBtnDisabled: {
    opacity: 0.6,
  },
});
