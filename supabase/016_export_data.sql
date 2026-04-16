-- ============================================================================
-- PRISMA CAPTUS - EXPORTAR DATOS DE LA EMPRESA
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Función para exportar todos los datos de una empresa
CREATE OR REPLACE FUNCTION export_company_data(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_user_role text;
BEGIN
  -- Verificar que es admin
  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = auth.uid() AND company_id = p_company_id;

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden exportar los datos';
  END IF;

  v_result := jsonb_build_object(
    'company', (
      SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'business_type', business_type,
        'currency', currency,
        'created_at', created_at
      )
      FROM companies WHERE id = p_company_id
    ),
    'users', (
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', user_id,
        'name', name,
        'role', role,
        'created_at', NOW() -- No hay created_at en company_users, usamos actual
      ))
      FROM company_users WHERE company_id = p_company_id
    ),
    'products', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'description', description,
        'price', price,
        'stock', stock,
        'created_at', created_at,
        'deleted_at', deleted_at
      ))
      FROM products WHERE company_id = p_company_id
    ),
    'customers', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'phone', phone,
        'document', document,
        'created_at', created_at
      ))
      FROM customers WHERE company_id = p_company_id
    ),
    'sales', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'customer_name', customer_name,
        'customer_id', customer_id,
        'sold_by', sold_by,
        'status', status,
        'total', total,
        'created_at', created_at
      ))
      FROM sales WHERE company_id = p_company_id
    ),
    'sale_items', (
      SELECT jsonb_agg(jsonb_build_object(
        'sale_id', sale_id,
        'product_id', product_id,
        'quantity', quantity,
        'unit_price', unit_price,
        'subtotal', subtotal
      ))
      FROM sale_items
      WHERE sale_id IN (SELECT id FROM sales WHERE company_id = p_company_id)
    ),
    'transactions', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'category_id', category_id,
        'amount', amount,
        'type', type,
        'description', description,
        'transaction_date', transaction_date,
        'created_at', created_at
      ))
      FROM transactions WHERE company_id = p_company_id
    ),
    'categories', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'type', type
      ))
      FROM categories WHERE company_id = p_company_id
    ),
    'audit_logs', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'action', action,
        'table_name', table_name,
        'record_id', record_id,
        'old_values', old_values,
        'new_values', new_values,
        'created_at', created_at
      ))
      FROM audit_logs WHERE company_id = p_company_id
    ),
    'exported_at', NOW(),
    'exported_by', auth.uid()
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION export_company_data(uuid) TO authenticated;

-- Función simple para obtener conteos (para dashboard de administrador)
CREATE OR REPLACE FUNCTION get_company_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := jsonb_build_object(
    'totalUsers', (SELECT COUNT(*) FROM company_users WHERE company_id = p_company_id),
    'totalProducts', (SELECT COUNT(*) FROM products WHERE company_id = p_company_id AND deleted_at IS NULL),
    'totalCustomers', (SELECT COUNT(*) FROM customers WHERE company_id = p_company_id),
    'totalSales', (SELECT COUNT(*) FROM sales WHERE company_id = p_company_id),
    'totalTransactions', (SELECT COUNT(*) FROM transactions WHERE company_id = p_company_id)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_company_stats(uuid) TO authenticated;
