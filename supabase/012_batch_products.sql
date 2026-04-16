-- ============================================================================
-- PRISMA CAPTUS - BATCH INSERT PARA PRODUCTOS
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- RPC para crear múltiples productos a la vez
CREATE OR REPLACE FUNCTION bulk_create_products(
  p_company_id uuid,
  p_products jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product jsonb;
  v_product_id uuid;
  v_created_count int := 0;
  v_errors text := '';
  v_product_name text;
BEGIN
  -- Validar que es admin
  IF NOT EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = auth.uid() AND company_id = p_company_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden crear productos';
  END IF;

  -- Verificar que es un array
  IF jsonb_typeof(p_products) != 'array' THEN
    RAISE EXCEPTION 'El parámetro debe ser un array de productos';
  END IF;

  -- Procesar cada producto
  FOR v_product IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    BEGIN
      v_product_name := v_product->>'name';
      
      IF v_product_name IS NULL OR trim(v_product_name) = '' THEN
        v_errors := v_errors || 'Producto sin nombre. ';
        CONTINUE;
      END IF;

      INSERT INTO products (
        company_id,
        name,
        description,
        price,
        stock,
        created_by
      ) VALUES (
        p_company_id,
        trim(v_product_name),
        NULLIF(trim(v_product->>'description'), ''),
        COALESCE((v_product->>'price')::numeric, 0),
        COALESCE((v_product->>'stock')::numeric, 0),
        auth.uid()
      )
      RETURNING id INTO v_product_id;

      v_created_count := v_created_count + 1;

    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors || 'Error con "' || v_product_name || '": ' || SQLERRM || '. ';
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created_count,
    'errors', v_errors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_create_products(uuid, jsonb) TO authenticated;
