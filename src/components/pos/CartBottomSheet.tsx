import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../../constants/colors";
import type { Customer } from "../../services/customers";
import type { Product } from "../../services/products";

interface CartItemUI {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
}

interface Props {
    role: "admin" | "employee";
    cart: CartItemUI[];
    products: Product[];
    cartTotal: number;
    isConfirmingSale: boolean;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onConfirmSale: () => void;
    customers: Customer[];
    selectedCustomerId: string | null;
    onOpenCustomerModal: () => void;
    showToast: (message: string, type: "success" | "error" | "info") => void;
    inline?: boolean;
    autoExpandOnAdd?: boolean;
    isFab?: boolean;
}

const COLLAPSED_HEIGHT = 60;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const EXPANDED_HEIGHT = Math.min(SCREEN_HEIGHT * 0.55, 460);
const ANIMATION_DURATION = 280;
const TAB_BAR_HEIGHT = 64;

export function CartBottomSheet({
    cart,
    products,
    cartTotal,
    isConfirmingSale,
    onUpdateQuantity,
    onConfirmSale,
    customers,
    selectedCustomerId,
    onOpenCustomerModal,
    showToast,
    inline = false,
    autoExpandOnAdd = false,
    isFab = false,
}: Props) {
    const insets = useSafeAreaInsets();
    const expanded = useSharedValue(0);
    const isExpanded = useSharedValue(false);
    const prevTotalItems = useRef(0);

    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const tabBarBottom = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 16;

    const toggle = useCallback(() => {
        const toExpanded = !isExpanded.value;
        isExpanded.value = toExpanded;
        expanded.value = withTiming(toExpanded ? 1 : 0, {
            duration: ANIMATION_DURATION,
        });
    }, [expanded, isExpanded]);

    const collapse = useCallback(() => {
        isExpanded.value = false;
        expanded.value = withTiming(0, { duration: ANIMATION_DURATION });
    }, [expanded, isExpanded]);

    const expand = useCallback(() => {
        isExpanded.value = true;
        expanded.value = withTiming(1, { duration: ANIMATION_DURATION });
    }, [expanded, isExpanded]);

    useEffect(() => {
        if (cart.length === 0 && isExpanded.value) {
            collapse();
        } else if (autoExpandOnAdd && totalItems > prevTotalItems.current) {
            expand();
        }
        prevTotalItems.current = totalItems;
    }, [cart.length, totalItems, collapse, expand, isExpanded.value, autoExpandOnAdd]);

    const containerStyle = useAnimatedStyle(() => ({
        height: COLLAPSED_HEIGHT + expanded.value * (EXPANDED_HEIGHT - COLLAPSED_HEIGHT),
        width: isFab
            ? withTiming(isExpanded.value ? Dimensions.get("window").width - 32 : 60)
            : "100%",
        borderRadius: isFab && !isExpanded.value ? 30 : 20,
        right: isFab && !isExpanded.value ? 20 : 16,
    }));

    const expandedContentStyle = useAnimatedStyle(() => ({
        opacity: expanded.value,
        display: expanded.value > 0.1 ? "flex" : "none",
    }));

    const collapsedContentStyle = useAnimatedStyle(() => ({
        opacity: 1 - expanded.value,
        display: expanded.value < 0.9 ? "flex" : "none",
    }));

    const arrowStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${expanded.value * 180}deg` }],
    }));

    const selectedCustomerName = selectedCustomerId
        ? customers.find((c) => c.id === selectedCustomerId)?.name ?? "Venta en tienda"
        : "Venta en tienda";

    return (
        <Animated.View
            style={[
                styles.container,
                !inline && styles.containerAbsolute,
                !inline && { bottom: tabBarBottom },
                inline && styles.containerInline,
                isFab && !inline && styles.fabContainer,
                containerStyle,
            ]}
        >
            {/* Collapsed Bar */}
            {/* Collapsed Bar / FAB Icon */}
            <Animated.View style={[styles.collapsedBar, collapsedContentStyle, isFab && styles.fabCollapsedBar]}>
                <Pressable
                    style={[styles.collapsedContent, isFab && styles.fabCollapsedContent]}
                    onPress={toggle}
                    hitSlop={12}
                >
                    {isFab ? (
                        <View style={styles.fabIconContainer}>
                            <Feather name="shopping-cart" size={24} color="#FFF" />
                            {totalItems > 0 && (
                                <View style={styles.fabBadge}>
                                    <Text style={styles.fabBadgeText}>{totalItems}</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <>
                            <View style={styles.collapsedLeft}>
                                <View style={styles.badge}>
                                    <Feather name="shopping-cart" size={22} color="#FFF" />
                                    {totalItems > 0 && (
                                        <View style={styles.badgeCount}>
                                            <Text style={styles.badgeCountText}>{totalItems}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.collapsedTotal}>
                                    ${cartTotal.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.collapsedRight}>
                                <Text style={styles.collapsedLabel}>
                                    {totalItems} {totalItems === 1 ? "item" : "items"}
                                </Text>
                                <Animated.View style={arrowStyle}>
                                    <Feather name="chevron-up" size={20} color={C.text} />
                                </Animated.View>
                            </View>
                        </>
                    )}
                </Pressable>
            </Animated.View>

            {/* Expanded Content */}
            <Animated.View style={[styles.expandedWrapper, expandedContentStyle]}>
                <View style={styles.expandedHeader}>
                    <Text style={styles.expandedTitle}>Carrito</Text>
                    <TouchableOpacity onPress={collapse} activeOpacity={0.7}>
                        <Feather name="chevron-down" size={22} color={C.textMuted} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.cartList}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {cart.length === 0 ? (
                        <Text style={styles.emptyText}>Sin productos en el carrito</Text>
                    ) : (
                        cart.map((item) => {
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
                                                Stock máximo ({stock})
                                            </Text>
                                        )}
                                    </View>

                                    <View style={styles.qtyRow}>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() =>
                                                onUpdateQuantity(item.productId, item.quantity - 1)
                                            }
                                            activeOpacity={0.7}
                                        >
                                            <Feather
                                                name={item.quantity === 1 ? "trash-2" : "minus"}
                                                size={13}
                                                color="#FFF"
                                            />
                                        </TouchableOpacity>
                                        <Text style={[styles.qtyValue, atMax && styles.qtyValueMax]}>
                                            {item.quantity}
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.qtyBtn, atMax && styles.qtyBtnDisabled]}
                                            onPress={() => {
                                                if (atMax) {
                                                    showToast(
                                                        `No hay más unidades de "${item.name}". Stock: ${stock}`,
                                                        "error"
                                                    );
                                                } else {
                                                    onUpdateQuantity(item.productId, item.quantity + 1);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Feather
                                                name="plus"
                                                size={13}
                                                color={atMax ? C.textMuted : "#FFF"}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.cartItemSubtotal}>
                                        ${item.subtotal.toFixed(2)}
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                <TouchableOpacity
                    style={styles.customerSelector}
                    onPress={onOpenCustomerModal}
                    activeOpacity={0.8}
                >
                    <View style={styles.customerLeft}>
                        <Feather name="user" size={14} color={C.violet} />
                        <Text style={styles.customerText}>{selectedCustomerName}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={C.violet} />
                </TouchableOpacity>

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL</Text>
                    <Text style={styles.totalValue}>${cartTotal.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.confirmBtn,
                        (cart.length === 0 || isConfirmingSale) && styles.confirmBtnDisabled,
                    ]}
                    onPress={onConfirmSale}
                    disabled={cart.length === 0 || isConfirmingSale}
                    activeOpacity={0.8}
                >
                    {isConfirmingSale ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <View style={styles.confirmRow}>
                            <Feather name="check" size={16} color="#FFF" />
                            <Text style={styles.confirmText}>Confirmar venta</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        shadowColor: "rgba(0,0,0,0.04)",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: C.border,
        zIndex: 40,
        overflow: "hidden",
    },
    containerAbsolute: {
        position: "absolute",
        left: 16,
        right: 16,
        elevation: 10,
        zIndex: 1000,
    },
    fabContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: C.emerald,
        shadowColor: C.emerald,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 12,
        left: undefined, // Let right handle it
    },
    fabCollapsedBar: {
        backgroundColor: "transparent",
        height: 60,
    },
    fabCollapsedContent: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 0,
    },
    fabIconContainer: {
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    fabBadge: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: C.danger,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: C.emerald,
    },
    fabBadgeText: {
        color: "#FFF",
        fontSize: 10,
        fontWeight: "800",
    },
    containerInline: {
        position: "relative",
        borderRadius: 20,
        shadowOffset: { width: 0, height: 4 },
    },

    collapsedBar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: COLLAPSED_HEIGHT,
    },
    collapsedContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    collapsedLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    badge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: C.violet,
        alignItems: "center",
        justifyContent: "center",
    },
    badgeCount: {
        position: "absolute",
        top: -5,
        right: -5,
        backgroundColor: C.emerald,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    badgeCountText: {
        color: "#FFF",
        fontSize: 10,
        fontWeight: "700",
    },
    collapsedTotal: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
    },
    collapsedRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    collapsedLabel: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "600",
    },

    expandedWrapper: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    expandedHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    expandedTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: C.text,
    },
    cartList: {
        flex: 1,
        marginBottom: 6,
    },
    emptyText: {
        color: C.textMuted,
        fontSize: 13,
        textAlign: "center",
        paddingVertical: 16,
    },

    cartItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: C.inputBg,
        borderRadius: 10,
        padding: 10,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: C.border,
    },
    cartItemInfo: {
        flex: 1,
    },
    cartItemName: {
        color: C.text,
        fontSize: 13,
        fontWeight: "600",
    },
    cartItemPrice: {
        color: C.textMuted,
        fontSize: 11,
        marginTop: 1,
    },
    cartStockWarning: {
        color: C.danger,
        fontSize: 10,
        fontWeight: "700",
        marginTop: 2,
    },
    qtyRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginHorizontal: 8,
    },
    qtyBtn: {
        backgroundColor: C.violet,
        borderRadius: 7,
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    qtyBtnDisabled: {
        backgroundColor: "#F2F4F7",
    },
    qtyValue: {
        color: C.text,
        fontSize: 14,
        fontWeight: "700",
        minWidth: 18,
        textAlign: "center",
    },
    qtyValueMax: {
        color: C.danger,
    },
    cartItemSubtotal: {
        color: C.violet,
        fontSize: 13,
        fontWeight: "700",
        minWidth: 56,
        textAlign: "right",
    },

    customerSelector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.inputBg,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    customerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    customerText: {
        color: C.text,
        fontSize: 13,
        fontWeight: "600",
    },

    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: C.border,
    },
    totalLabel: {
        color: C.textMuted,
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 1,
    },
    totalValue: {
        color: C.violet,
        fontSize: 20,
        fontWeight: "800",
    },

    confirmBtn: {
        backgroundColor: C.violet,
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: "center",
        shadowColor: C.violet,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    confirmBtnDisabled: {
        backgroundColor: "#F2F4F7",
        shadowOpacity: 0,
    },
    confirmRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    confirmText: {
        color: "#FFF",
        fontSize: 15,
        fontWeight: "700",
    },
});
