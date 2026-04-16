-- ============================================================================
-- PRISMA CAPTUS - CATEGORÍAS DE PRODUCTOS
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Crear tabla product_categories
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Índice en product_categories.company_id
CREATE INDEX IF NOT EXISTS idx_product_categories_company_id ON product_categories(company_id);

-- 3. RLS en product_categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- SELECT: miembros de la empresa pueden leer
CREATE POLICY "product_categories_select" ON product_categories
  FOR SELECT USING (
    company_id IN (SELECT user_company_ids())
  );

-- INSERT: solo admin
CREATE POLICY "product_categories_insert" ON product_categories
  FOR INSERT WITH CHECK (
    company_id IN (SELECT user_company_ids())
    AND EXISTS (
      SELECT 1 FROM company_users
      WHERE user_id = auth.uid() AND company_id = product_categories.company_id AND role = 'admin'
    )
  );

-- UPDATE: solo admin
CREATE POLICY "product_categories_update" ON product_categories
  FOR UPDATE USING (
    company_id IN (SELECT user_company_ids())
    AND EXISTS (
      SELECT 1 FROM company_users
      WHERE user_id = auth.uid() AND company_id = product_categories.company_id AND role = 'admin'
    )
  );

-- DELETE: solo admin
CREATE POLICY "product_categories_delete" ON product_categories
  FOR DELETE USING (
    company_id IN (SELECT user_company_ids())
    AND EXISTS (
      SELECT 1 FROM company_users
      WHERE user_id = auth.uid() AND company_id = product_categories.company_id AND role = 'admin'
    )
  );

-- 4. Agregar category_id a products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL;

-- 5. Índice en products.category_id
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- 6. Actualizar RPC create_product para aceptar category_id
DROP FUNCTION IF EXISTS create_product(uuid, text, numeric, text, numeric);

CREATE OR REPLACE FUNCTION create_product(
  p_company_id uuid,
  p_name text,
  p_price numeric,
  p_description text DEFAULT NULL,
  p_stock numeric DEFAULT 0,
  p_category_id uuid DEFAULT NULL
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
  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = auth.uid() AND company_id = p_company_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'No tienes acceso a esta empresa';
  END IF;

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden crear productos';
  END IF;

  INSERT INTO products (company_id, name, price, description, stock, created_by, category_id)
  VALUES (p_company_id, p_name, p_price, p_description, p_stock, auth.uid(), p_category_id)
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_product(uuid, text, numeric, text, numeric, uuid) TO authenticated;
