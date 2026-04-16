-- ============================================================================
-- Actualizar categorías por defecto para TODAS las empresas existentes
-- INGRESOS: Venta, Pagos, Capital, Terceros
-- GASTOS:   Devolución, Deudas, Artículos, Terceros
-- ============================================================================

-- 1. Renombrar "Gastos generales" → "Devolución" en todas las empresas
UPDATE categories SET name = 'Devolución' WHERE name = 'Gastos generales' AND type = 'expense';

-- 2. Insertar categorías nuevas para TODAS las empresas que no las tengan

-- INGRESOS
INSERT INTO categories (company_id, name, type)
SELECT c.id, cat.name, cat.type
FROM companies c
CROSS JOIN (VALUES
  ('Pagos',   'income'),
  ('Capital', 'income'),
  ('Terceros','income')
) AS cat(name, type)
WHERE NOT EXISTS (
  SELECT 1 FROM categories
  WHERE categories.company_id = c.id AND categories.name = cat.name AND categories.type = cat.type::text
);

-- GASTOS
INSERT INTO categories (company_id, name, type)
SELECT c.id, cat.name, cat.type
FROM companies c
CROSS JOIN (VALUES
  ('Devolución', 'expense'),
  ('Deudas',     'expense'),
  ('Artículos',  'expense'),
  ('Terceros',   'expense')
) AS cat(name, type)
WHERE NOT EXISTS (
  SELECT 1 FROM categories
  WHERE categories.company_id = c.id AND categories.name = cat.name AND categories.type = cat.type::text
);

-- 3. Eliminar categorías viejas que ya no aplican (excepto las que tengan transacciones)
DELETE FROM categories
WHERE name IN ('Gastos generales')
  AND id NOT IN (SELECT DISTINCT category_id FROM transactions WHERE category_id IS NOT NULL);
