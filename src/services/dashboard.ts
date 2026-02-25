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
