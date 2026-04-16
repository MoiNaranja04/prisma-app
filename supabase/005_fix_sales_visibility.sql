-- ============================================================================
-- Fix: Permitir a TODOS los miembros ver TODAS las ventas de su empresa
-- El RLS anterior (002_sold_by.sql) restringía empleados a solo sus ventas.
-- Ahora empleados pueden ver ventas del jefe y de otros empleados.
-- ============================================================================

DROP POLICY IF EXISTS "sales_select" ON sales;

CREATE POLICY "sales_select" ON sales
  FOR SELECT USING (company_id IN (SELECT user_company_ids()));
