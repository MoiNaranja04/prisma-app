-- ============================================================================
-- PRISMA CAPTUS - RPC PARA ESTADÍSTICAS DE PRODUCTOS
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. RPC para obtener estadísticas completas de productos
CREATE OR REPLACE FUNCTION get_product_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := jsonb_build_object(
    'lowStock', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'stock', stock,
        'price', price
      ) ORDER BY stock ASC)
      FROM products 
      WHERE company_id = p_company_id 
        AND deleted_at IS NULL 
        AND stock <= 5
    ),
    'topSelling', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'totalSold', p.total_sold,
        'totalRevenue', p.total_revenue
      ))
      FROM (
        SELECT p.id, p.name,
          COALESCE(SUM(si.quantity), 0) as total_sold,
          COALESCE(SUM(si.subtotal), 0) as total_revenue
        FROM products p
        LEFT JOIN sale_items si ON si.product_id = p.id
        LEFT JOIN sales s ON s.id = si.sale_id 
          AND s.status = 'completed'
          AND s.created_at >= NOW() - INTERVAL '30 days'
        WHERE p.company_id = p_company_id 
          AND p.deleted_at IS NULL
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 10
      ) p
    ),
    'outOfStock', (
      SELECT COUNT(*)::int
      FROM products 
      WHERE company_id = p_company_id 
        AND deleted_at IS NULL 
        AND stock = 0
    ),
    'totalProducts', (
      SELECT COUNT(*)::int
      FROM products 
      WHERE company_id = p_company_id 
        AND deleted_at IS NULL
    ),
    'totalValue', (
      SELECT COALESCE(SUM(stock * price), 0)::numeric
      FROM products 
      WHERE company_id = p_company_id 
        AND deleted_at IS NULL
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_product_stats(uuid) TO authenticated;

-- 2. RPC para obtener historial de ventas de un producto específico
CREATE OR REPLACE FUNCTION get_product_sales_history(
  p_company_id uuid,
  p_product_id uuid,
  p_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := jsonb_build_object(
    'product', (
      SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'price', price,
        'stock', stock
      )
      FROM products
      WHERE id = p_product_id AND company_id = p_company_id
    ),
    'salesHistory', (
      SELECT jsonb_agg(jsonb_build_object(
        'date', DATE(s.created_at),
        'quantity', si.quantity,
        'subtotal', si.subtotal,
        'saleId', s.id,
        'customerName', s.customer_name
      ) ORDER BY s.created_at DESC)
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.product_id = p_product_id
        AND s.company_id = p_company_id
        AND s.status = 'completed'
        AND s.created_at >= NOW() - (p_days || ' days')::interval
    ),
    'totalSold', (
      SELECT COALESCE(SUM(si.quantity), 0)::int
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.product_id = p_product_id
        AND s.company_id = p_company_id
        AND s.status = 'completed'
        AND s.created_at >= NOW() - (p_days || ' days')::interval
    ),
    'totalRevenue', (
      SELECT COALESCE(SUM(si.subtotal), 0)::numeric
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.product_id = p_product_id
        AND s.company_id = p_company_id
        AND s.status = 'completed'
        AND s.created_at >= NOW() - (p_days || ' days')::interval
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_product_sales_history(uuid, uuid, int) TO authenticated;
