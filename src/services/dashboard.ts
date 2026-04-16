import { supabase } from "./supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MonthlyDashboard {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalSales: number;
  totalUnitsSold: number;
  bestSellingProduct: string;
}

export interface CompanyInviteInfo {
  invite_code: string | null;
  invite_expires_at: string | null;
  is_expired: boolean;
}

// ─── Servicios ────────────────────────────────────────────────────────────────

/**
 * Llama al RPC `get_monthly_dashboard` y devuelve el resumen mensual.
 */
export async function getMonthlyDashboard(
  companyId: string,
  year: number,
  month: number,
): Promise<MonthlyDashboard> {
  const { data, error } = await supabase.rpc("get_monthly_dashboard", {
    p_company_id: companyId,
    p_year: year,
    p_month: month,
  });

  if (error) throw new Error(error.message);

  return {
    totalIncome: Number(data?.total_income) || 0,
    totalExpense: Number(data?.total_expense) || 0,
    balance: Number(data?.balance) || 0,
    totalSales: Number(data?.total_sales) || 0,
    totalUnitsSold: Number(data?.total_units_sold) || 0,
    bestSellingProduct: String(data?.best_selling_product ?? "Sin ventas"),
  };
}

/**
 * Obtiene información del código de invitación de la empresa.
 */
export async function getCompanyInviteInfo(
  companyId: string,
): Promise<CompanyInviteInfo> {
  const { data, error } = await supabase.rpc("get_company_invite_info", {
    p_company_id: companyId,
  });

  if (error) throw new Error(error.message);

  return {
    invite_code: data?.invite_code ?? null,
    invite_expires_at: data?.invite_expires_at ?? null,
    is_expired: data?.is_expired ?? true,
  };
}

/**
 * Regenera el código de invitación de la empresa.
 * @param companyId ID de la empresa
 * @param daysValid Días de validez (por defecto 7)
 * @returns Nuevo código de invitación
 */
export async function regenerateInviteCode(
  companyId: string,
  daysValid: number = 7,
): Promise<string> {
  const { data, error } = await supabase.rpc("regenerate_invite_code", {
    p_company_id: companyId,
    p_days_valid: daysValid,
  });

  if (error) throw new Error(error.message);

  return data as string;
}

// ─── Tipos para Exportación ─────────────────────────────────────────────────

export interface CompanyStats {
  totalUsers: number;
  totalProducts: number;
  totalCustomers: number;
  totalSales: number;
  totalTransactions: number;
}

export interface CompanyExportData {
  company: Record<string, unknown>;
  users: Record<string, unknown>[];
  products: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  sales: Record<string, unknown>[];
  sale_items: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  audit_logs: Record<string, unknown>[];
  exported_at: string;
  exported_by: string;
}

/**
 * Obtiene estadísticas generales de la empresa.
 */
export async function getCompanyStats(
  companyId: string,
): Promise<CompanyStats> {
  const { data, error } = await supabase.rpc("get_company_stats", {
    p_company_id: companyId,
  });

  if (error) throw new Error(error.message);

  return {
    totalUsers: data?.totalUsers ?? 0,
    totalProducts: data?.totalProducts ?? 0,
    totalCustomers: data?.totalCustomers ?? 0,
    totalSales: data?.totalSales ?? 0,
    totalTransactions: data?.totalTransactions ?? 0,
  };
}

/**
 * Exporta todos los datos de la empresa (solo admin).
 * Puede generar un archivo grande, usar con precaución.
 */
export async function exportCompanyData(
  companyId: string,
): Promise<CompanyExportData> {
  const { data, error } = await supabase.rpc("export_company_data", {
    p_company_id: companyId,
  });

  if (error) throw new Error(error.message);

  return data as CompanyExportData;
}
