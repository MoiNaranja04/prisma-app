-- ============================================================================
-- PRISMA CAPTUS - AGREGAR created_by A PRODUCTOS
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Agregar columna created_by
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 2. Crear RPC para crear producto con created_by
CREATE OR REPLACE FUNCTION create_product(
  p_company_id uuid,
  p_name text,
  p_price numeric,
  p_description text DEFAULT NULL,
  p_stock numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_user_role text;
BEGIN
  -- Validar que el usuario pertenece a la empresa
  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = auth.uid() AND company_id = p_company_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'No tienes acceso a esta empresa';
  END IF;

  -- Solo admin puede crear productos
  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden crear productos';
  END IF;

  INSERT INTO products (company_id, name, price, description, stock, created_by)
  VALUES (p_company_id, p_name, p_price, p_description, p_stock, auth.uid())
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_product(uuid, text, numeric, text, numeric) TO authenticated;

-- 3. Actualizar RLS para permitir insert via RPC
DROP POLICY IF EXISTS "products_insert" ON products;

CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (
    company_id IN (SELECT user_company_ids())
    AND created_by = auth.uid()
  );
