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
  employee_name?: string | null;
  employee_role?: string | null;
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

  // Usar versión con rate limiting
  let result = await supabase.rpc("create_sale_with_items_ratelimited", {
    p_company_id: companyId,
    p_customer_name: customerName,
    p_items: p_items,
    p_customer_id: customerId ?? null,
  });

  // Fallback: si no existe la función con rate limiting, usar la original
  if (result.error && result.error.message.includes("not find")) {
    if (__DEV__) console.warn("RPC ratelimited no existe, usando original");
    result = await supabase.rpc("create_sale_with_items", {
      p_company_id: companyId,
      p_customer_name: customerName,
      p_items: p_items,
      p_customer_id: customerId ?? null,
    });
  }

  if (result.error) {
    // Verificar si es error de rate limit
    if (
      result.error.message.includes("límite") ||
      result.error.message.includes("excedido")
    ) {
      throw new Error(
        "Has excedido el límite de ventas. Intenta de nuevo en una hora.",
      );
    }
    if (__DEV__)
      console.error("Error RPC create_sale_with_items:", result.error);
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
 * Obtiene nombres de empleados en query separado (el FK sold_by apunta a auth.users, no a company_users).
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

  const rows = data ?? [];

  // Obtener nombres de empleados por separado
  const soldByIds = [
    ...new Set(
      rows
        .map((r: Record<string, unknown>) => r.sold_by as string)
        .filter(Boolean),
    ),
  ];

  const employeeMap: Record<string, { name: string; role: string }> = {};
  if (soldByIds.length > 0) {
    const { data: employees } = await supabase
      .from("company_users")
      .select("user_id, name, role")
      .eq("company_id", companyId)
      .in("user_id", soldByIds);

    if (employees) {
      for (const emp of employees) {
        employeeMap[emp.user_id] = { name: emp.name, role: emp.role };
      }
    }
  }

  return rows.map((row: Record<string, unknown>) => {
    const rawItems = (row.sale_items as Record<string, unknown>[]) ?? [];
    const soldBy = (row.sold_by as string) ?? null;

    return {
      id: String(row.id),
      company_id: String(row.company_id),
      customer_name: String(row.customer_name),
      customer_id: (row.customer_id as string) ?? null,
      sold_by: soldBy,
      employee_name: soldBy ? (employeeMap[soldBy]?.name ?? null) : null,
      employee_role: soldBy ? (employeeMap[soldBy]?.role ?? null) : null,
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

// ─── Tipos para Reportes ────────────────────────────────────────────────────

export interface SalesReportSummary {
  totalSales: number;
  completedSales: number;
  cancelledSales: number;
  totalRevenue: number;
  totalRefunds: number;
  averageSale: number;
}

export interface SalesReport {
  summary: SalesReportSummary;
  salesByDay: {
    date: string;
    count: number;
    revenue: number;
  }[];
  salesBySeller: {
    sellerId: string | null;
    sellerName: string | null;
    sellerRole: string | null;
    count: number;
    revenue: number;
  }[];
  salesByCustomer: {
    customerId: string | null;
    customerName: string | null;
    count: number;
    revenue: number;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
}

export interface TransactionsReportSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

export interface TransactionsReport {
  summary: TransactionsReportSummary;
  byCategory: {
    categoryId: string | null;
    categoryName: string | null;
    categoryType: string | null;
    total: number;
    count: number;
  }[];
  byDay: {
    date: string;
    income: number;
    expense: number;
  }[];
}

// ─── Funciones de Reportes ─────────────────────────────────────────────────

/**
 * Genera reporte de ventas por rango de fechas.
 */
export async function getSalesReport(
  companyId: string,
  startDate: string,
  endDate: string,
): Promise<SalesReport> {
  const { data, error } = await supabase.rpc("get_sales_report", {
    p_company_id: companyId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw new Error(error.message);

  return {
    summary: data?.summary ?? {
      totalSales: 0,
      completedSales: 0,
      cancelledSales: 0,
      totalRevenue: 0,
      totalRefunds: 0,
      averageSale: 0,
    },
    salesByDay: data?.salesByDay ?? [],
    salesBySeller: data?.salesBySeller ?? [],
    salesByCustomer: data?.salesByCustomer ?? [],
    topProducts: data?.topProducts ?? [],
  };
}

/**
 * Genera reporte de transacciones por rango de fechas.
 */
export async function getTransactionsReport(
  companyId: string,
  startDate: string,
  endDate: string,
): Promise<TransactionsReport> {
  const { data, error } = await supabase.rpc("get_transactions_report", {
    p_company_id: companyId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw new Error(error.message);

  return {
    summary: data?.summary ?? {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
    },
    byCategory: data?.byCategory ?? [],
    byDay: data?.byDay ?? [],
  };
}
