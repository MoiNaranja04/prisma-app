import { supabase } from "./supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Sale {
  id: string;
  company_id: string;
  customer_name: string;
  customer_id: string | null;
  sold_by: string | null;
  status: "completed" | "cancelled";
  total_amount: number;
  created_at: string;
}

export interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

// ─── Servicios ────────────────────────────────────────────────────────────────

/**
 * Crea una venta con sus items llamando a la función RPC `create_sale_with_items`.
 * Toda la lógica de negocio (descuento de stock, cálculo de total) se ejecuta en la BD.
 */
export async function createSaleWithItems(
  companyId: string,
  customerName: string,
  items: CartItem[],
  customerId?: string | null,
): Promise<string> {
  const p_items = items.map((i) => ({
    product_id: i.productId,
    quantity: i.quantity,
  }));

  // Intentar con 4 params (versión nueva con p_customer_id)
  let result = await supabase.rpc("create_sale_with_items", {
    p_company_id: companyId,
    p_customer_name: customerName,
    p_items: p_items,
    p_customer_id: customerId ?? null,
  });

  // Si falla por función no encontrada, intentar con 3 params (versión vieja)
  if (result.error && result.error.message.includes("not find")) {
    if (__DEV__) console.warn("RPC 4-params falló:", result.error.message);
    result = await supabase.rpc("create_sale_with_items", {
      p_company_id: companyId,
      p_customer_name: customerName,
      p_items: p_items,
    });
  }

  if (result.error) {
    if (__DEV__) console.error("Error RPC create_sale_with_items:", result.error);
    throw new Error(result.error.message);
  }

  const raw = result.data as Record<string, unknown>;
  const saleId = String(raw?.id ?? "");

  // Si usamos la versión vieja (3 params), vincular cliente con UPDATE
  if (customerId && saleId) {
    await supabase
      .from("sales")
      .update({ customer_id: customerId })
      .eq("id", saleId);
  }

  return saleId;
}

/**
 * Devuelve todas las ventas de una empresa, ordenadas por fecha descendente.
 */
export async function getSalesByCompany(companyId: string): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // La columna en la tabla se llama "total"
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    company_id: String(row.company_id),
    customer_name: String(row.customer_name),
    customer_id: (row.customer_id as string) ?? null,
    sold_by: (row.sold_by as string) ?? null,
    status: (row.status as Sale["status"]) ?? "completed",
    total_amount: Number(row.total ?? 0),
    created_at: String(row.created_at),
  }));
}

/**
 * Devuelve todas las ventas de una empresa con sus items y nombre de producto.
 */
export async function getSalesWithItems(
  companyId: string,
): Promise<SaleWithItems[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*, products(name))")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const rawItems = (row.sale_items as Record<string, unknown>[]) ?? [];
    return {
      id: String(row.id),
      company_id: String(row.company_id),
      customer_name: String(row.customer_name),
      customer_id: (row.customer_id as string) ?? null,
      sold_by: (row.sold_by as string) ?? null,
      status: (row.status as Sale["status"]) ?? "completed",
      total_amount: Number((row as Record<string, unknown>).total ?? 0),
      created_at: String(row.created_at),
      items: rawItems.map((item) => ({
        product_id: String(item.product_id),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price ?? item.price ?? 0),
        product_name: String(
          (item.products as Record<string, unknown>)?.name ??
            "Producto eliminado",
        ),
      })),
    };
  });
}

/**
 * Cancela una venta llamando al RPC `cancel_sale`.
 * Devuelve stock, cambia status y registra transacción de gasto.
 */
export async function cancelSale(saleId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_sale", {
    p_sale_id: saleId,
  });

  if (error) throw new Error(error.message);
}
