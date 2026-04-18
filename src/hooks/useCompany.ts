import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Company } from "../types/company";

type Role = "admin" | "employee";

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [role, setRole] = useState<Role>("admin");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) return;

        const { data: relation, error: relationError } = await supabase
          .from("company_users")
          .select("company_id, role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (relationError) throw relationError;
        if (!relation) throw new Error("Usuario no pertenece a ninguna empresa");

        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", relation.company_id)
          .single();

        if (companyError) throw companyError;

        if (!cancelled) {
          setCompany(companyData);
          setRole(relation.role);
          setUserId(user.id);
        }
      } catch (e: any) {
        if (__DEV__) console.error("Error cargando empresa:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { company, role, userId, loading };
}
