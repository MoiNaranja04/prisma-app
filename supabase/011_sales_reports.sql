-- ============================================================================
-- PRISMA CAPTUS - RPC PARA REPORTES POR RANGO DE FECHAS
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. RPC para reporte de ventas por período
CREATE OR REPLACE FUNCTION get_sales_report(
  p_company_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  v_start := p_start_date::timestamptz;
  v_end := p_end_date::timestamptz + '1 day'::interval;

  v_result := jsonb_build_object(
    'summary', (
      SELECT jsonb_build_object(
        'totalSales', COUNT(*)::int,
        'completedSales', COUNT(*) FILTER (WHERE status = 'completed')::int,
        'cancelledSales', COUNT(*) FILTER (WHERE status = 'cancelled')::int,
        'totalRevenue', COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0)::numeric,
        'totalRefunds', COALESCE(SUM(total) FILTER (WHERE status = 'cancelled'), 0)::numeric,
        'averageSale', COALESCE(AVG(total) FILTER (WHERE status = 'completed'), 0)::numeric
      )
      FROM sales
      WHERE company_id = p_company_id
        AND created_at >= v_start
        AND created_at < v_end
    ),
    'salesByDay', (
      SELECT jsonb_agg(jsonb_build_object(
        'date', date_trunc('day', created_at)::date,
        'count', COUNT(*)::int,
        'revenue', COALESCE(SUM(total), 0)::numeric
      ) ORDER BY date_trunc('day', created_at))
      FROM sales
      WHERE company_id = p_company_id
        AND status = 'completed'
        AND created_at >= v_start
        AND created_at < v_end
      GROUP BY date_trunc('day', created_at)
    ),
    'salesBySeller', (
      SELECT jsonb_agg(jsonb_build_object(
        'sellerId', sold_by,
        'sellerName', cu.name,
        'sellerRole', cu.role,
        'count', COUNT(*)::int,
        'revenue', COALESCE(SUM(s.total), 0)::numeric
      ))
      FROM sales s
      LEFT JOIN company_users cu ON cu.user_id = s.sold_by AND cu.company_id = s.company_id
      WHERE s.company_id = p_company_id
        AND s.status = 'completed'
        AND s.created_at >= v_start
        AND s.created_at < v_end
      GROUP BY s.sold_by, cu.name, cu.role
    ),
    'salesByCustomer', (
      SELECT COALESCE(jsonb_agg(sub.row ORDER BY sub.revenue DESC), '[]'::jsonb)
      FROM (
        SELECT customer_id, customer_name,
          COUNT(*)::int as count,
          COALESCE(SUM(total), 0)::numeric as revenue
        FROM sales
        WHERE company_id = p_company_id
          AND status = 'completed'
          AND created_at >= v_start
          AND created_at < v_end
          AND customer_name IS NOT NULL
        GROUP BY customer_id, customer_name
        ORDER BY revenue DESC
        LIMIT 10
      ) sub
    ),
    'topProducts', (
      SELECT COALESCE(jsonb_agg(sub.row ORDER BY sub.quantity DESC), '[]'::jsonb)
      FROM (
        SELECT p.id as productId, p.name as productName,
          SUM(si.quantity)::int as quantity,
          COALESCE(SUM(si.subtotal), 0)::numeric as revenue
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        WHERE s.company_id = p_company_id
          AND s.status = 'completed'
          AND s.created_at >= v_start
          AND s.created_at < v_end
        GROUP BY p.id, p.name
        ORDER BY quantity DESC
        LIMIT 10
      ) sub
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sales_report(uuid, date, date) TO authenticated;

-- 2. RPC para reporte de transacciones financieras
CREATE OR REPLACE FUNCTION get_transactions_report(
  p_company_id uuid,
  p_start_date date,
  p_end_date date
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
    'summary', (
      SELECT jsonb_build_object(
        'totalIncome', COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::numeric,
        'totalExpenses', COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::numeric,
        'netBalance', COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)
      )
      FROM transactions
      WHERE company_id = p_company_id
        AND transaction_date >= p_start_date
        AND transaction_date <= p_end_date
    ),
    'byCategory', (
      SELECT jsonb_agg(jsonb_build_object(
        'categoryId', t.category_id,
        'categoryName', c.name,
        'categoryType', c.type,
        'total', COALESCE(SUM(t.amount), 0)::numeric,
        'count', COUNT(*)::int
      ))
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.company_id = p_company_id
        AND t.transaction_date >= p_start_date
        AND t.transaction_date <= p_end_date
      GROUP BY t.category_id, c.name, c.type
      ORDER BY c.type, SUM(t.amount) DESC
    ),
    'byDay', (
      SELECT jsonb_agg(jsonb_build_object(
        'date', transaction_date,
        'income', COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::numeric,
        'expense', COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::numeric
      ) ORDER BY transaction_date)
      FROM transactions
      WHERE company_id = p_company_id
        AND transaction_date >= p_start_date
        AND transaction_date <= p_end_date
      GROUP BY transaction_date
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_transactions_report(uuid, date, date) TO authenticated;
