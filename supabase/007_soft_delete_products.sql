-- ============================================================================
-- PRISMA CAPTUS - SOFT DELETE EN PRODUCTOS
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Agregar columna deleted_at (null = no eliminado, fecha = eliminado)
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Modificar RLS para excluir productos eliminados
DROP POLICY IF EXISTS "products_select" ON products;

CREATE POLICY "products_select" ON products
  FOR SELECT USING (
    company_id IN (SELECT user_company_ids())
    AND deleted_at IS NULL
  );

-- 3. Crear función RPC para eliminar (soft delete)
CREATE OR REPLACE FUNCTION soft_delete_product(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_user_role text;
BEGIN
  -- Obtener company_id del producto
  SELECT company_id INTO v_company_id
  FROM products WHERE id = p_product_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  -- Validar rol admin
  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = auth.uid() AND company_id = v_company_id;

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar productos';
  END IF;

  -- Soft delete: marcar fecha
  UPDATE products
  SET deleted_at = NOW()
  WHERE id = p_product_id;
END;
$$;

-- 4. Permisos
REVOKE ALL ON FUNCTION soft_delete_product(uuid) FROM public;
GRANT EXECUTE ON FUNCTION soft_delete_product(uuid) TO authenticated;

-- 5. (Opcional) Función para restaurar producto eliminado
CREATE OR REPLACE FUNCTION restore_product(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_user_role text;
BEGIN
  SELECT company_id INTO v_company_id
  FROM products WHERE id = p_product_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = auth.uid() AND company_id = v_company_id;

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden restaurar productos';
  END IF;

  UPDATE products
  SET deleted_at = NULL
  WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION restore_product(uuid) TO authenticated;
