import React, { createContext, useCallback, useContext, useState } from "react";
import type { Product } from "../services/products";
import { haptic } from "../hooks/useHaptics";

export interface CartItemUI {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
}

interface CartContextValue {
    cart: CartItemUI[];
    addToCart: (product: Product, showToast: (msg: string, type: "success" | "error" | "info") => void) => void;
    updateQuantity: (productId: string, quantity: number, products: Product[], showToast: (msg: string, type: "error") => void) => void;
    clearCart: () => void;
    cartTotal: number;
    cartItemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItemUI[]>([]);

    const addToCart = useCallback(
        (product: Product, showToast: (msg: string, type: "success" | "error" | "info") => void) => {
            const stock = Number(product.stock);
            if (stock <= 0) {
                showToast(`"${product.name}" no tiene stock disponible`, "error");
                return;
            }

setCart((prev) => {
                const existing = prev.find((i) => i.productId === product.id);
                if (existing) {
                    if (existing.quantity >= stock) {
                        showToast(`Solo hay ${stock} unidad(es) de "${product.name}"`, "error");
                        haptic.error();
                        return prev;
                    }
                    showToast(`+1 ${product.name} al carrito`, "success");
                    haptic.medium();
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
showToast(`Agregado "${product.name}" al carrito`, "success");
                    haptic.success();
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
        [],
    );

    const updateQuantity = useCallback(
        (
            productId: string,
            quantity: number,
            products: Product[],
            showToast: (msg: string, type: "error") => void,
        ) => {
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
        [],
    );

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
    const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                updateQuantity,
                clearCart,
                cartTotal,
                cartItemCount,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}
