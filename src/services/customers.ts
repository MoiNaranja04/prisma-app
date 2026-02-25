import { supabase } from "./supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  document: string | null;
  created_at: string;
}

export interface CreateCustomerParams {
  companyId: string;
  name: string;
  phone?: string;
  document?: string;
}

export interface UpdateCustomerParams {
  name?: string;
  phone?: string | null;
  document?: string | null;
}

// ─── Servicios ────────────────────────────────────────────────────────────────

export async function getCustomersByCompany(
  companyId: string,
): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []) as Customer[];
}

export async function createCustomer(
  params: CreateCustomerParams,
): Promise<Customer> {
  const payload = {
    company_id: params.companyId,
    name: params.name,
    phone: params.phone ?? null,
    document: params.document ?? null,
  };

  const { data, error } = await supabase
    .from("customers")
    .insert([payload]) // ← ARRAY
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un cliente con ese documento.");
    }
    throw new Error(error.message);
  }

  return data as Customer;
}

export async function updateCustomer(
  customerId: string,
  params: UpdateCustomerParams,
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update(params)
    .eq("id", customerId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505" || error.message.includes("unique")) {
      throw new Error("Ya existe un cliente con ese documento.");
    }
    throw new Error(error.message);
  }

  return data as Customer;
}

export async function seedExampleCustomers(
  companyId: string,
): Promise<Customer[]> {
  const examples = [
    {
      company_id: companyId,
      name: "Juan Pérez",
      phone: "0412-1234567",
      document: "V-27456981",
    },
    {
      company_id: companyId,
      name: "Inversiones ABC",
      phone: "0212-9876543",
      document: "J-412345678",
    },
    {
      company_id: companyId,
      name: "María García",
      phone: "0414-5551234",
      document: "E-19874563",
    },
  ];

  const { data, error } = await supabase
    .from("customers")
    .insert(examples)
    .select();

  if (error) throw new Error(error.message);

  return (data ?? []) as Customer[];
}

export interface CustomerStats {
  customer_id: string;
  name: string;
  total_spent: number;
  total_sales: number;
  last_purchase: string | null;
}

export async function getCustomerStats(
  companyId: string,
): Promise<CustomerStats[]> {
  const { data, error } = await supabase.rpc("get_customer_stats", {
    p_company_id: companyId,
  });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    customer_id: String(row.customer_id),
    name: String(row.name),
    total_spent: Number(row.total_spent ?? 0),
    total_sales: Number(row.total_sales ?? 0),
    last_purchase: row.last_purchase ? String(row.last_purchase) : null,
  }));
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) throw new Error(error.message);
}
