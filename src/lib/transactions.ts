import { supabase } from "./supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  company_id: string;
  category_id: string | null;
  category_name?: string | null;
  amount: number;
  type: TransactionType;
  description: string | null;
  transaction_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface CreateTransactionParams {
  companyId: string;
  categoryId: string | null;
  amount: number;
  type: TransactionType;
  description: string;
  transactionDate: string; // YYYY-MM-DD
}

export interface DateRange {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface Category {
  id: string;
  company_id: string;
  name: string;
  type: TransactionType;
}

export interface CreateCategoryParams {
  companyId: string;
  name: string;
  type: TransactionType;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Devuelve el día siguiente en formato YYYY-MM-DD */
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Servicios ────────────────────────────────────────────────────────────────

/**
 * Devuelve las categorías de una empresa.
 */
export async function getCategoriesByCompany(
  companyId: string,
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []) as Category[];
}

/**
 * Crea una categoría de transacción para una empresa.
 */
export async function createCategory(
  params: CreateCategoryParams,
): Promise<Category> {
  const { companyId, name, type } = params;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      company_id: companyId,
      name,
      type,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

/**
 * Inserta una transacción en la BD.
 * RLS garantiza que company_id pertenezca al usuario autenticado.
 */
export async function createTransaction(
  params: CreateTransactionParams,
): Promise<Transaction> {
  const { companyId, categoryId, amount, type, description, transactionDate } =
    params;

  const payload: Record<string, unknown> = {
    company_id: companyId,
    amount,
    type,
    transaction_date: transactionDate,
  };

  // Solo incluir campos opcionales si tienen valor — evita error de schema cache
  if (categoryId !== null) {
    payload.category_id = categoryId;
  }
  if (description) {
    payload.description = description;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as Transaction;
}

/**
 * Devuelve todas las transacciones de una empresa,
 * ordenadas por fecha descendente.
 * RLS garantiza que solo se devuelvan las del usuario autenticado.
 */
export async function getTransactionsByCompany(
  companyId: string,
  range?: DateRange,
): Promise<Transaction[]> {
  let query = supabase
    .from("transactions")
    .select("*, categories(name)")
    .eq("company_id", companyId);

  if (range?.startDate) query = query.gte("transaction_date", range.startDate);
  if (range?.endDate)
    query = query.lt("transaction_date", nextDay(range.endDate));

  const { data, error } = await query
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    ...row,
    category_name:
      row.categories && !Array.isArray(row.categories)
        ? row.categories.name
        : null,
  })) as Transaction[];
}

/**
 * Resumen financiero calculado en la BD con SUM + CASE.
 * Requiere la función SQL `get_financial_summary` creada en Supabase.
 * RLS se aplica porque usa SECURITY INVOKER.
 */
export async function getFinancialSummary(
  companyId: string,
  range?: DateRange,
): Promise<FinancialSummary> {
  let query = supabase
    .from("transactions")
    .select("amount, type")
    .eq("company_id", companyId);

  if (range?.startDate) query = query.gte("transaction_date", range.startDate);
  if (range?.endDate)
    query = query.lt("transaction_date", nextDay(range.endDate));

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of data ?? []) {
    if (tx.type === "income") totalIncome += Number(tx.amount);
    else totalExpense += Number(tx.amount);
  }

  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}
