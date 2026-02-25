import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { C } from "../../constants/colors";
import type { SaleWithItems } from "../../services/sales";
import type { Customer } from "../../services/customers";

interface Props {
  role: "admin" | "employee";
  sales: SaleWithItems[];
  customers: Customer[];
  loadingData: boolean;
  cancellingId: string | null;
  onCancelSale: (sale: SaleWithItems) => void;
  // Modal cancelación
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
  const [showAllModal, setShowAllModal] = useState(false);

  const renderSale = (sale: SaleWithItems) => {
    const isCancelled = sale.status === "cancelled";
    const isCancelling = cancellingId === sale.id;
    const total = Number(sale.total_amount) || 0;

    return (
      <View
        key={sale.id}
        style={[
          styles.saleCard,
          isCancelled && styles.saleCardCancelled,
        ]}
      >
        <View
          style={[
            styles.txAccent,
            { backgroundColor: isCancelled ? C.danger : C.violet },
          ]}
        />
        <View style={styles.txBody}>
          <Text
            style={[
              styles.txDescription,
              isCancelled && styles.saleCancelledText,
            ]}
          >
            {sale.customer_id
              ? (customers.find((c) => c.id === sale.customer_id)
                  ?.name ?? sale.customer_name)
              : sale.customer_name === "Venta mostrador"
                ? "Venta en tienda"
                : sale.customer_name}
          </Text>
          <Text style={styles.txDate}>
            {new Date(sale.created_at).toLocaleDateString()}
          </Text>
          {sale.items.length > 0 && (
            <View style={styles.txItemsList}>
              {sale.items.map((item, idx) => (
                <Text key={idx} style={styles.txItemText}>
                  • {item.product_name} x{item.quantity}
                </Text>
              ))}
            </View>
          )}
          {isCancelled && (
            <Text style={styles.saleCancelledBadge}>CANCELADA</Text>
          )}
        </View>
        <View style={styles.salePriceCol}>
          <Text
            style={[
              styles.salePrice,
              isCancelled && styles.salePriceCancelled,
            ]}
          >
            ${total.toFixed(2)}
          </Text>
          {isCancelled && (
            <Text style={styles.saleRefundLabel}>Reembolsado</Text>
          )}
        </View>
        {sale.status === "completed" && role === "admin" && (
          <TouchableOpacity
            style={[
              styles.btnCancelSale,
              isCancelling && styles.btnCancelSaleDisabled,
            ]}
            onPress={() => onCancelSale(sale)}
            disabled={isCancelling}
            activeOpacity={0.7}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={C.danger} />
            ) : (
              <View style={styles.btnRow}>
                <Feather name="x" size={12} color={C.danger} />
                <Text style={styles.btnCancelSaleText}>Cancelar</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Últimas 10 ventas</Text>
        {loadingData && <ActivityIndicator size="small" color={C.violet} />}
      </View>

      {sales.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Sin ventas aún</Text>
        </View>
      ) : (
        <>
          {sales.slice(0, 10).map(renderSale)}
          {sales.length > 10 && (
            <TouchableOpacity
              style={styles.btnViewAll}
              onPress={() => setShowAllModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="list" size={14} color={C.violet} />
              <Text style={styles.btnViewAllText}>
                Ver todas ({sales.length})
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Modal: todas las ventas */}
      <Modal
        visible={showAllModal}
        animationType="slide"
        onRequestClose={() => setShowAllModal(false)}
      >
        <View style={styles.modalFull}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Todas las ventas</Text>
            <TouchableOpacity
              onPress={() => setShowAllModal(false)}
              activeOpacity={0.7}
              style={styles.modalCloseBtn}
            >
              <Feather name="x" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalCount}>
            {sales.length} ventas
          </Text>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sales.map(renderSale)}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal confirmar cancelación */}
      <Modal
        visible={saleToCancel !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isCancellingSelectedSale) onCloseCancelModal();
        }}
      >
        <View style={styles.cancelSaleOverlay}>
          <View style={styles.cancelSaleCard}>
            <Text style={styles.cancelSaleTitle}>
              ¿Seguro que quieres cancelar esta venta?
            </Text>
            <View style={styles.cancelSaleActions}>
              <TouchableOpacity
                style={[
                  styles.cancelSaleBtnBase,
                  styles.cancelSaleBtnClose,
                  isCancellingSelectedSale && styles.cancelSaleBtnDisabled,
                ]}
                onPress={onCloseCancelModal}
                disabled={isCancellingSelectedSale}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelSaleBtnCloseText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cancelSaleBtnBase,
                  styles.cancelSaleBtnConfirm,
                  isCancellingSelectedSale && styles.cancelSaleBtnDisabled,
                ]}
                onPress={() =>
                  saleToCancel && onConfirmCancel(saleToCancel.id)
                }
                disabled={isCancellingSelectedSale}
                activeOpacity={0.8}
              >
                {isCancellingSelectedSale ? (
                  <ActivityIndicator size="small" color={C.text} />
                ) : (
                  <Text style={styles.cancelSaleBtnConfirmText}>
                    Sí, cancelar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    color: C.textMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
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
  saleCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  saleCardCancelled: {
    opacity: 0.5,
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
  txItemsList: {
    marginTop: 6,
  },
  txItemText: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  saleCancelledText: {
    color: C.textMuted,
    textDecorationLine: "line-through",
  },
  saleCancelledBadge: {
    color: C.danger,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },
  btnCancelSale: {
    backgroundColor: "rgba(248,113,113,0.15)",
    borderWidth: 1,
    borderColor: C.danger,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
  },
  btnCancelSaleDisabled: {
    opacity: 0.5,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  btnCancelSaleText: {
    color: C.danger,
    fontSize: 11,
    fontWeight: "700",
  },
  salePriceCol: {
    alignItems: "flex-end",
    marginRight: 8,
  },
  salePrice: {
    fontSize: 15,
    fontWeight: "700",
    color: C.violet,
  },
  salePriceCancelled: {
    color: C.textMuted,
    textDecorationLine: "line-through",
  },
  saleRefundLabel: {
    color: C.danger,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cancelSaleOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cancelSaleCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
  },
  cancelSaleTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  cancelSaleActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelSaleBtnBase: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelSaleBtnClose: {
    backgroundColor: "#233b2d",
    borderColor: "#355845",
  },
  cancelSaleBtnCloseText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  cancelSaleBtnConfirm: {
    backgroundColor: "rgba(248,113,113,0.2)",
    borderColor: C.danger,
  },
  cancelSaleBtnConfirmText: {
    color: C.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  cancelSaleBtnDisabled: {
    opacity: 0.6,
  },
  btnViewAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.violet,
    borderRadius: 10,
    marginBottom: 10,
  },
  btnViewAllText: {
    color: C.violet,
    fontSize: 13,
    fontWeight: "700",
  },
  modalFull: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCount: {
    color: C.textMuted,
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
});
