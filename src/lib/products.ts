import { supabase } from "./supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  created_at: string;
  deleted_at: string | null;
  created_by: string | null;
  category_id: string | null;
}

export interface ProductStats {
  lowStock: Product[];
  topSelling: {
    id: string;
    name: string;
    totalSold: number;
    totalRevenue: number;
  }[];
  outOfStock: number;
  totalProducts: number;
  totalValue: number;
}

export interface ProductSalesHistory {
  product: Product;
  salesHistory: {
    date: string;
    quantity: number;
    subtotal: number;
    saleId: string;
    customerName: string;
  }[];
  totalSold: number;
  totalRevenue: number;
}

export interface CreateProductParams {
  companyId: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  categoryId?: string;
}

export interface UpdateProductParams {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category_id?: string | null;
}

// ─── Servicios ────────────────────────────────────────────────────────────────

/**
 * Crea un producto en la BD usando RPC.
 * Registra el usuario que lo creó (created_by).
 */
export async function createProduct(
  params: CreateProductParams,
): Promise<Product> {
  const { companyId, name, description, price, stock, categoryId } = params;

  const { data, error } = await supabase.rpc("create_product", {
    p_company_id: companyId,
    p_name: name,
    p_price: price,
    p_description: description ?? null,
    p_stock: stock ?? 0,
    p_category_id: categoryId ?? null,
  });

  if (error) throw new Error(error.message);

  // Obtener el producto creado
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("*")
    .eq("id", data)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  return product as Product;
}

/**
 * Devuelve todos los productos de una empresa,
 * ordenados por fecha de creación descendente.
 */
export async function getProductsByCompany(
  companyId: string,
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as Product[];
}

/**
 * Actualiza el stock de un producto.
 */
export async function updateProductStock(
  productId: string,
  newStock: number,
): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ stock: newStock })
    .eq("id", productId);

  if (error) throw new Error(error.message);
}

/**
 * Actualiza un producto por ID.
 * RLS garantiza que solo se actualice si pertenece a la empresa del usuario.
 */
export async function updateProduct(
  productId: string,
  params: UpdateProductParams,
): Promise<Product> {
  const payload: Record<string, unknown> = {};

  if (params.name !== undefined) payload.name = params.name;
  if (params.description !== undefined)
    payload.description = params.description;
  if (params.price !== undefined) payload.price = params.price;
  if (params.stock !== undefined) payload.stock = params.stock;
  if (params.category_id !== undefined)
    payload.category_id = params.category_id;

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", productId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as Product;
}

/**
 * Elimina (soft delete) un producto por ID.
 * No lo borra físicamente, solo marca deleted_at.
 * Solo administradores pueden eliminar productos.
 */
export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.rpc("soft_delete_product", {
    p_product_id: productId,
  });

  if (error) throw new Error(error.message);
}

/**
 * Restaura un producto eliminado.
 */
export async function restoreProduct(productId: string): Promise<void> {
  const { error } = await supabase.rpc("restore_product", {
    p_product_id: productId,
  });

  if (error) throw new Error(error.message);
}

/**
 * Obtiene estadísticas de productos: stock bajo, más vendidos, valor total.
 */
export async function getProductStats(
  companyId: string,
): Promise<ProductStats> {
  const { data, error } = await supabase.rpc("get_product_stats", {
    p_company_id: companyId,
  });

  if (error) throw new Error(error.message);

  return {
    lowStock: (data?.lowStock ?? []) as Product[],
    topSelling: (data?.topSelling ?? []) as ProductStats["topSelling"],
    outOfStock: data?.outOfStock ?? 0,
    totalProducts: data?.totalProducts ?? 0,
    totalValue: Number(data?.totalValue ?? 0),
  };
}

/**
 * Obtiene el historial de ventas de un producto específico.
 */
export async function getProductSalesHistory(
  companyId: string,
  productId: string,
  days: number = 30,
): Promise<ProductSalesHistory> {
  const { data, error } = await supabase.rpc("get_product_sales_history", {
    p_company_id: companyId,
    p_product_id: productId,
    p_days: days,
  });

  if (error) throw new Error(error.message);

  return {
    product: data?.product as Product,
    salesHistory: (data?.salesHistory ??
      []) as ProductSalesHistory["salesHistory"],
    totalSold: data?.totalSold ?? 0,
    totalRevenue: Number(data?.totalRevenue ?? 0),
  };
}

export interface BulkCreateResult {
  created: number;
  errors: string;
}

export interface BulkProductInput {
  name: string;
  description?: string;
  price: number;
  stock?: number;
}

/**
 * Crea múltiples productos a la vez (batch insert).
 */
export async function bulkCreateProducts(
  companyId: string,
  products: BulkProductInput[],
): Promise<BulkCreateResult> {
  const { data, error } = await supabase.rpc("bulk_create_products", {
    p_company_id: companyId,
    p_products: products,
  });

  if (error) throw new Error(error.message);

  return {
    created: data?.created ?? 0,
    errors: data?.errors ?? "",
  };
}

// ─── Tipos para Auditoría ───────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  action: string;
  tableName: string;
  recordId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  userId: string | null;
  userName: string | null;
  createdAt: string;
}

export interface AuditLogsResult {
  logs: AuditLogEntry[];
}

/**
 * Obtiene los logs de auditoría de una empresa.
 */
export async function getAuditLogs(
  companyId: string,
  tableName?: string,
  limit: number = 50,
): Promise<AuditLogsResult> {
  const { data, error } = await supabase.rpc("get_audit_logs", {
    p_company_id: companyId,
    p_table_name: tableName ?? null,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);

  return {
    logs: (data?.logs ?? []) as AuditLogEntry[],
  };
}
