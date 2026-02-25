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
}

export interface CreateProductParams {
  companyId: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
}

export interface UpdateProductParams {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
}

// ─── Servicios ────────────────────────────────────────────────────────────────

/**
 * Inserta un producto en la BD.
 * RLS garantiza que company_id pertenezca al usuario autenticado.
 */
export async function createProduct(
  params: CreateProductParams,
): Promise<Product> {
  const { companyId, name, description, price, stock } = params;

  const payload: Record<string, unknown> = {
    company_id: companyId,
    name,
    price,
  };

  if (description !== undefined) {
    payload.description = description;
  }
  if (stock !== undefined) {
    payload.stock = stock;
  }

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as Product;
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
  if (params.description !== undefined) payload.description = params.description;
  if (params.price !== undefined) payload.price = params.price;
  if (params.stock !== undefined) payload.stock = params.stock;

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
 * Elimina un producto por ID.
 * RLS garantiza que solo se elimine si pertenece a la empresa del usuario.
 */
export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) throw new Error(error.message);
}
