-- ============================================================================
-- PRISMA CAPTUS — Políticas RLS + Funciones RPC seguras
-- Pegar completo en Supabase SQL Editor y ejecutar.
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ HELPER: función para obtener role del usuario en una empresa               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION get_user_role(p_company_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM company_users
  WHERE user_id = auth.uid() AND company_id = p_company_id
  LIMIT 1;
$$;

-- Helper: ¿el usuario pertenece a esta empresa?
CREATE OR REPLACE FUNCTION user_belongs_to_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = auth.uid() AND company_id = p_company_id
  );
$$;

-- Helper: todas las company_id del usuario actual
CREATE OR REPLACE FUNCTION user_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM company_users WHERE user_id = auth.uid();
$$;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 1. COMPANIES                                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

-- SELECT: solo empresas donde el usuario es miembro
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (id IN (SELECT user_company_ids()));

-- UPDATE: solo admin de la empresa
CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (get_user_role(id) = 'admin');

-- INSERT: via RPC register_company (SECURITY DEFINER), no directo
CREATE POLICY "companies_insert" ON companies
  FOR INSERT WITH CHECK (false);

-- DELETE: nadie elimina empresas desde el cliente
CREATE POLICY "companies_delete" ON companies
  FOR DELETE USING (false);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 2. COMPANY_USERS                                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_users_select" ON company_users;
DROP POLICY IF EXISTS "company_users_insert" ON company_users;
DROP POLICY IF EXISTS "company_users_update" ON company_users;
DROP POLICY IF EXISTS "company_users_delete" ON company_users;

-- SELECT: ver miembros de tu empresa
CREATE POLICY "company_users_select" ON company_users
  FOR SELECT USING (company_id IN (SELECT user_company_ids()));

-- INSERT: via RPC (register_company / join_company_by_code)
CREATE POLICY "company_users_insert" ON company_users
  FOR INSERT WITH CHECK (false);

-- UPDATE: solo admin puede cambiar roles
CREATE POLICY "company_users_update" ON company_users
  FOR UPDATE USING (
    get_user_role(company_id) = 'admin'
    AND user_id != auth.uid()  -- no puede cambiar su propio rol
  );

-- DELETE: solo admin puede remover miembros (no a sí mismo)
CREATE POLICY "company_users_delete" ON company_users
  FOR DELETE USING (
    get_user_role(company_id) = 'admin'
    AND user_id != auth.uid()
  );


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 3. CATEGORIES                                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;

-- SELECT: todos los miembros ven categorías de su empresa
CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (company_id IN (SELECT user_company_ids()));

-- INSERT: solo admin
CREATE POLICY "categories_insert" ON categories
  FOR INSERT WITH CHECK (get_user_role(company_id) = 'admin');

-- UPDATE: solo admin
CREATE POLICY "categories_update" ON categories
  FOR UPDATE USING (get_user_role(company_id) = 'admin');

-- DELETE: solo admin
CREATE POLICY "categories_delete" ON categories
  FOR DELETE USING (get_user_role(company_id) = 'admin');


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 4. PRODUCTS                                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

-- SELECT: todos los miembros ven productos
CREATE POLICY "products_select" ON products
  FOR SELECT USING (company_id IN (SELECT user_company_ids()));

-- INSERT: solo admin
CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (get_user_role(company_id) = 'admin');

-- UPDATE: solo admin (editar precio, stock, nombre)
CREATE POLICY "products_update" ON products
  FOR UPDATE USING (get_user_role(company_id) = 'admin');

-- DELETE: solo admin
CREATE POLICY "products_delete" ON products
  FOR DELETE USING (get_user_role(company_id) = 'admin');


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 5. TRANSACTIONS                                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;

-- SELECT: todos los miembros ven transacciones
CREATE POLICY "transactions_select" ON transactions
  FOR SELECT USING (company_id IN (SELECT user_company_ids()));

-- INSERT: admin puede crear manualmente, employee NO
-- (las ventas crean transacciones via RPC SECURITY DEFINER)
CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT WITH CHECK (get_user_role(company_id) = 'admin');

-- UPDATE: solo admin
CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE USING (get_user_role(company_id) = 'admin');

-- DELETE: nadie elimina transacciones (integridad financiera)
CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE USING (false);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 6. SALES                                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_select" ON sales;
DROP POLICY IF EXISTS "sales_insert" ON sales;
DROP POLICY IF EXISTS "sales_update" ON sales;
DROP POLICY IF EXISTS "sales_delete" ON sales;

-- SELECT: todos los miembros ven ventas
CREATE POLICY "sales_select" ON sales
  FOR SELECT USING (company_id IN (SELECT user_company_ids()));

-- INSERT: via RPC create_sale_with_items (ambos roles)
-- El RPC es SECURITY DEFINER, así que el INSERT directo se bloquea
CREATE POLICY "sales_insert" ON sales
  FOR INSERT WITH CHECK (false);

-- UPDATE: solo admin (para vincular customer_id post-venta)
CREATE POLICY "sales_update" ON sales
  FOR UPDATE USING (get_user_role(company_id) = 'admin');

-- DELETE: nadie
CREATE POLICY "sales_delete" ON sales
  FOR DELETE USING (false);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 7. SALE_ITEMS                                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_items_select" ON sale_items;
DROP POLICY IF EXISTS "sale_items_insert" ON sale_items;
DROP POLICY IF EXISTS "sale_items_update" ON sale_items;
DROP POLICY IF EXISTS "sale_items_delete" ON sale_items;

-- SELECT: si el usuario pertenece a la empresa de la venta
CREATE POLICY "sale_items_select" ON sale_items
  FOR SELECT USING (
    sale_id IN (
      SELECT id FROM sales WHERE company_id IN (SELECT user_company_ids())
    )
  );

-- INSERT/UPDATE/DELETE: solo via RPC
CREATE POLICY "sale_items_insert" ON sale_items
  FOR INSERT WITH CHECK (false);

CREATE POLICY "sale_items_update" ON sale_items
  FOR UPDATE USING (false);

CREATE POLICY "sale_items_delete" ON sale_items
  FOR DELETE USING (false);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 8. CUSTOMERS                                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

-- SELECT: todos los miembros ven clientes
CREATE POLICY "customers_select" ON customers
  FOR SELECT USING (company_id IN (SELECT user_company_ids()));

-- INSERT: admin y employee pueden crear clientes
CREATE POLICY "customers_insert" ON customers
  FOR INSERT WITH CHECK (user_belongs_to_company(company_id));

-- UPDATE: admin y employee pueden editar clientes
CREATE POLICY "customers_update" ON customers
  FOR UPDATE USING (user_belongs_to_company(company_id));

-- DELETE: solo admin puede eliminar clientes
CREATE POLICY "customers_delete" ON customers
  FOR DELETE USING (get_user_role(company_id) = 'admin');


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 9a. Columna sold_by en sales (quién hizo la venta)                          ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

DO $$
BEGIN
  ALTER TABLE sales ADD COLUMN sold_by uuid REFERENCES auth.users(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 9b. CONSTRAINT: stock nunca negativo                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Si la constraint ya existe, ignorar el error
DO $$
BEGIN
  ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 10. RPC: create_sale_with_items (atómica, protege stock, ambos roles)       ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION create_sale_with_items(
  p_company_id uuid,
  p_customer_name text,
  p_items jsonb,  -- [{"product_id": "uuid", "quantity": int}, ...]
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
  -- Validar que el usuario pertenece a la empresa
  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = auth.uid() AND company_id = p_company_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'No tienes acceso a esta empresa';
  END IF;

  -- Validar que hay items
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La venta debe tener al menos un producto';
  END IF;

  -- Crear la venta con customer_id y sold_by incluidos
  INSERT INTO sales (company_id, customer_name, customer_id, sold_by, status, total)
  VALUES (p_company_id, p_customer_name, p_customer_id, auth.uid(), 'completed', 0)
  RETURNING id INTO v_sale_id;

  -- Procesar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::int;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad debe ser mayor a 0';
    END IF;

    -- Bloqueo pesimista: FOR UPDATE previene race conditions
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

    -- Insertar item de venta
    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    VALUES (v_sale_id, v_product.id, v_qty, v_product.price, v_line_total);

    -- Descontar stock (constraint CHECK >= 0 como red de seguridad)
    UPDATE products
    SET stock = stock - v_qty
    WHERE id = v_product.id;
  END LOOP;

  -- Actualizar total de la venta
  UPDATE sales SET total = v_total WHERE id = v_sale_id;

  -- Crear transacción de ingreso
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


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 11. RPC: cancel_sale (atómica, valida estado, solo admin)                   ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION cancel_sale(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale record;
  v_item record;
  v_user_role text;
BEGIN
  -- Obtener venta con bloqueo
  SELECT * INTO v_sale
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  -- Validar que el usuario es admin de esa empresa
  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = auth.uid() AND company_id = v_sale.company_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'No tienes acceso a esta empresa';
  END IF;

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden cancelar ventas';
  END IF;

  -- Validar que no esté ya cancelada
  IF v_sale.status = 'cancelled' THEN
    RAISE EXCEPTION 'Esta venta ya fue cancelada';
  END IF;

  -- Devolver stock de cada item
  FOR v_item IN
    SELECT si.product_id, si.quantity
    FROM sale_items si
    WHERE si.sale_id = p_sale_id
  LOOP
    UPDATE products
    SET stock = stock + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- Marcar venta como cancelada
  UPDATE sales
  SET status = 'cancelled'
  WHERE id = p_sale_id;

  -- Crear transacción de gasto (reembolso)
  INSERT INTO transactions (company_id, amount, type, description, transaction_date)
  VALUES (
    v_sale.company_id,
    v_sale.total,
    'expense',
    'Cancelación venta #' || p_sale_id::text,
    CURRENT_DATE
  );
END;
$$;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 12. RPC: register_company (sin cambios, SECURITY DEFINER)                   ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Esta función ya existe. Solo verificar que tenga SECURITY DEFINER
-- y que cree: empresa + company_users(admin) + categorías predeterminadas.
-- No se modifica aquí para no romper lo existente.


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 13. RPC: join_company_by_code (sin cambios, SECURITY DEFINER)               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Igual, ya existe. Verificar que valide código y cree company_users(employee).


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 14. RPC: get_monthly_dashboard (lectura, validar acceso)                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION get_monthly_dashboard(
  p_company_id uuid,
  p_year int,
  p_month int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_sales int;
  v_total_units int;
  v_best_product text;
  v_start_date date;
  v_end_date date;
BEGIN
  -- Validar acceso
  IF NOT EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = auth.uid() AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a esta empresa';
  END IF;

  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month')::date;

  -- Total ventas completadas en el mes
  SELECT COUNT(*) INTO v_total_sales
  FROM sales
  WHERE company_id = p_company_id
    AND status = 'completed'
    AND created_at >= v_start_date
    AND created_at < v_end_date;

  -- Total unidades vendidas
  SELECT COALESCE(SUM(si.quantity), 0) INTO v_total_units
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE s.company_id = p_company_id
    AND s.status = 'completed'
    AND s.created_at >= v_start_date
    AND s.created_at < v_end_date;

  -- Producto más vendido
  SELECT p.name INTO v_best_product
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  JOIN products p ON p.id = si.product_id
  WHERE s.company_id = p_company_id
    AND s.status = 'completed'
    AND s.created_at >= v_start_date
    AND s.created_at < v_end_date
  GROUP BY p.name
  ORDER BY SUM(si.quantity) DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'totalSales', v_total_sales,
    'totalUnitsSold', v_total_units,
    'bestSellingProduct', COALESCE(v_best_product, 'Sin ventas')
  );
END;
$$;


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ 15. Permisos de ejecución de funciones                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- Solo usuarios autenticados pueden ejecutar RPCs
REVOKE ALL ON FUNCTION create_sale_with_items(uuid, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION create_sale_with_items(uuid, text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION cancel_sale(uuid) FROM public;
GRANT EXECUTE ON FUNCTION cancel_sale(uuid) TO authenticated;

REVOKE ALL ON FUNCTION get_monthly_dashboard(uuid, int, int) FROM public;
GRANT EXECUTE ON FUNCTION get_monthly_dashboard(uuid, int, int) TO authenticated;

REVOKE ALL ON FUNCTION get_user_role(uuid) FROM public;
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;

REVOKE ALL ON FUNCTION user_belongs_to_company(uuid) FROM public;
GRANT EXECUTE ON FUNCTION user_belongs_to_company(uuid) TO authenticated;

REVOKE ALL ON FUNCTION user_company_ids() FROM public;
GRANT EXECUTE ON FUNCTION user_company_ids() TO authenticated;
