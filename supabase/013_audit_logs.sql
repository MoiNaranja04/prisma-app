-- ============================================================================
-- PRISMA CAPTUS - TABLA DE AUDITORÍA
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Crear tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  created_at timestamptz DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policy de lectura (solo miembros de la empresa)
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (company_id IN (SELECT user_company_ids()));

-- 4. Policy de insert (solo vía función)
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (false);

-- 5. Función para registrar auditoría
CREATE OR REPLACE FUNCTION audit_log(
  p_company_id uuid,
  p_action text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    company_id,
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    p_company_id,
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values
  );
END;
$$;

GRANT EXECUTE ON FUNCTION audit_log(uuid, text, text, uuid, jsonb, jsonb) TO authenticated;

-- 6. Trigger automático para products
CREATE OR REPLACE FUNCTION audit_products_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM audit_log(
      NEW.company_id,
      'INSERT',
      'products',
      NEW.id,
      NULL,
      jsonb_build_object(
        'name', NEW.name,
        'price', NEW.price,
        'stock', NEW.stock,
        'description', NEW.description
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM audit_log(
      NEW.company_id,
      'UPDATE',
      'products',
      NEW.id,
      jsonb_build_object(
        'name', OLD.name,
        'price', OLD.price,
        'stock', OLD.stock,
        'description', OLD.description
      ),
      jsonb_build_object(
        'name', NEW.name,
        'price', NEW.price,
        'stock', NEW.stock,
        'description', NEW.description
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM audit_log(
      OLD.company_id,
      'DELETE',
      'products',
      OLD.id,
      jsonb_build_object(
        'name', OLD.name,
        'price', OLD.price,
        'stock', OLD.stock
      ),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION audit_products_trigger();

-- 7. Trigger para sales
CREATE OR REPLACE FUNCTION audit_sales_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM audit_log(
      NEW.company_id,
      'INSERT',
      'sales',
      NEW.id,
      NULL,
      jsonb_build_object(
        'customer_name', NEW.customer_name,
        'total', NEW.total,
        'status', NEW.status
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM audit_log(
      NEW.company_id,
      'UPDATE',
      'sales',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_sales ON sales;
CREATE TRIGGER audit_sales
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION audit_sales_trigger();

-- 8. Trigger para company_users
CREATE OR REPLACE FUNCTION audit_company_users_trigger()
RETURNS trigger AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
  ELSE
    v_company_id := OLD.company_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM audit_log(
      v_company_id,
      'INSERT',
      'company_users',
      NEW.user_id,
      NULL,
      jsonb_build_object('role', NEW.role, 'name', NEW.name)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM audit_log(
      v_company_id,
      'DELETE',
      'company_users',
      OLD.user_id,
      jsonb_build_object('role', OLD.role, 'name', OLD.name),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_company_users ON company_users;
CREATE TRIGGER audit_company_users
AFTER INSERT OR DELETE ON company_users
FOR EACH ROW EXECUTE FUNCTION audit_company_users_trigger();

-- 9. RPC para ver logs de auditoría
CREATE OR REPLACE FUNCTION get_audit_logs(
  p_company_id uuid,
  p_table_name text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('logs', (
    SELECT COALESCE(jsonb_agg(sub.row ORDER BY sub.created_at DESC), '[]'::jsonb)
    FROM (
      SELECT al.id, al.action, al.table_name, al.record_id,
        al.old_values, al.new_values, al.user_id, cu.name as user_name, al.created_at
      FROM audit_logs al
      LEFT JOIN company_users cu ON cu.user_id = al.user_id AND cu.company_id = al.company_id
      WHERE al.company_id = p_company_id
        AND (p_table_name IS NULL OR al.table_name = p_table_name)
      ORDER BY al.created_at DESC
      LIMIT p_limit
    ) sub
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION get_audit_logs(uuid, text, int) TO authenticated;
