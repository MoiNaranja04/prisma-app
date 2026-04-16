-- ============================================================================
-- INCREMENTAL: Agregar sold_by a sales + actualizar RPC + RLS por vendedor
-- Ejecutar DESPUÉS de rls_policies.sql
-- ============================================================================

-- 1. Agregar columna sold_by
DO $$
BEGIN
  ALTER TABLE sales ADD COLUMN sold_by uuid REFERENCES auth.users(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 2. Eliminar overload viejo de 3 params (si existe) para evitar ambigüedad
DROP FUNCTION IF EXISTS create_sale_with_items(uuid, text, jsonb);

-- 3. Crear/reemplazar la versión con 4 params (incluye p_customer_id)
CREATE OR REPLACE FUNCTION create_sale_with_items(
  p_company_id uuid,
  p_customer_name text,
  p_items jsonb,
  p_customer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_product record;
  v_qty int;
  v_line_total numeric;
  v_user_role text;
BEGIN
  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = auth.uid() AND company_id = p_company_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'No tienes acceso a esta empresa';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La venta debe tener al menos un producto';
  END IF;

  INSERT INTO sales (company_id, customer_name, customer_id, sold_by, status, total)
  VALUES (p_company_id, p_customer_name, p_customer_id, auth.uid(), 'completed', 0)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::int;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad debe ser mayor a 0';
    END IF;

    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado: %', v_item->>'product_id';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuficiente para "%". Disponible: %, solicitado: %',
        v_product.name, v_product.stock, v_qty;
    END IF;

    v_line_total := v_product.price * v_qty;
    v_total := v_total + v_line_total;

    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    VALUES (v_sale_id, v_product.id, v_qty, v_product.price, v_line_total);

    UPDATE products
    SET stock = stock - v_qty
    WHERE id = v_product.id;
  END LOOP;

  UPDATE sales SET total = v_total WHERE id = v_sale_id;

  INSERT INTO transactions (company_id, amount, type, description, transaction_date)
  VALUES (
    p_company_id,
    v_total,
    'income',
    'Venta #' || v_sale_id::text,
    CURRENT_DATE
  );

  RETURN jsonb_build_object('id', v_sale_id, 'total', v_total);
END;
$$;

-- 4. RLS: Employee solo ve sus ventas, admin ve todas
DROP POLICY IF EXISTS "sales_select" ON sales;

CREATE POLICY "sales_select" ON sales
  FOR SELECT USING (
    company_id IN (SELECT user_company_ids())
    AND (
      get_user_role(company_id) = 'admin'
      OR sold_by = auth.uid()
      OR sold_by IS NULL  -- ventas antiguas sin sold_by
    )
  );
