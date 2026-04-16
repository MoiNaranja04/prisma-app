-- ============================================================================
-- PRISMA CAPTUS - ÍNDICES DE RENDIMIENTO
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Índice en ventas: búsquedas por empresa, estado y fecha (más común)
CREATE INDEX IF NOT EXISTS idx_sales_company_status_date 
ON sales(company_id, status, created_at DESC);

-- 2. Índice en transacciones: búsquedas por empresa y fecha
CREATE INDEX IF NOT EXISTS idx_transactions_company_date 
ON transactions(company_id, transaction_date DESC);

-- 3. Índice en sale_items: para buscar items por venta rápidamente
CREATE INDEX IF NOT EXISTS idx_sale_items_sale 
ON sale_items(sale_id);

-- 4. Índice en sale_items: para reportes de productos vendidos
CREATE INDEX IF NOT EXISTS idx_sale_items_product 
ON sale_items(product_id);

-- 5. Índice en products: búsqueda por empresa y stock bajo
CREATE INDEX IF NOT EXISTS idx_products_company_stock 
ON products(company_id, stock);

-- 6. Índice en customers: búsqueda por documento único por empresa
CREATE INDEX IF NOT EXISTS idx_customers_company_document 
ON customers(company_id, document);

-- 7. Índice en company_users: búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_company_users_user 
ON company_users(user_id);

-- 8. Índice en categories: búsqueda por empresa y tipo
CREATE INDEX IF NOT EXISTS idx_categories_company_type 
ON categories(company_id, type);

-- Verificar que se crearon
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
