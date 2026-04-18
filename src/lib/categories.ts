import { supabase } from "./supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProductCategory {
  id: string;
  company_id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateCategoryParams {
  companyId: string;
  name: string;
  color?: string;
}

export interface UpdateCategoryParams {
  name?: string;
  color?: string;
}

// ─── Servicios ────────────────────────────────────────────────────────────────

export async function getCategoriesByCompany(
  companyId: string,
): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductCategory[];
}

export async function createCategory(
  params: CreateCategoryParams,
): Promise<ProductCategory> {
  const { data, error } = await supabase
    .from("product_categories")
    .insert({
      company_id: params.companyId,
      name: params.name,
      color: params.color ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProductCategory;
}

export async function updateCategory(
  categoryId: string,
  params: UpdateCategoryParams,
): Promise<ProductCategory> {
  const payload: Record<string, unknown> = {};
  if (params.name !== undefined) payload.name = params.name;
  if (params.color !== undefined) payload.color = params.color;

  const { data, error } = await supabase
    .from("product_categories")
    .update(payload)
    .eq("id", categoryId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProductCategory;
}

export async function toggleCategory(
  categoryId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("product_categories")
    .update({ is_active: isActive })
    .eq("id", categoryId);

  if (error) throw new Error(error.message);
}
