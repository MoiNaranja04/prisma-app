-- ============================================================================
-- PRISMA CAPTUS - RATE LIMITING EN RPCs
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Tabla para tracking de rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  rpc_name text NOT NULL,
  request_count int DEFAULT 1,
  window_start timestamptz DEFAULT NOW(),
  window_minutes int NOT NULL DEFAULT 60,
  created_at timestamptz DEFAULT NOW()
);

-- 2. Función de rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_rpc_name text,
  p_max_requests int DEFAULT 10,
  p_window_minutes int DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count int;
  v_window_start timestamptz;
BEGIN
  -- Buscar registro existente
  SELECT request_count, window_start INTO v_current_count, v_window_start
  FROM rate_limits
  WHERE user_id = p_user_id
    AND rpc_name = p_rpc_name
    AND window_start > NOW() - (p_window_minutes || ' minutes')::interval
  ORDER BY window_start DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Primera solicitud en la ventana
    INSERT INTO rate_limits (user_id, rpc_name, request_count, window_start, window_minutes)
    VALUES (p_user_id, p_rpc_name, 1, NOW(), p_window_minutes);
    RETURN true;
  END IF;

  IF v_current_count >= p_max_requests THEN
    RETURN false; -- Rate limit excedido
  END IF;

  -- Incrementar contador
  UPDATE rate_limits
  SET request_count = request_count + 1
  WHERE user_id = p_user_id AND rpc_name = p_rpc_name;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit(uuid, text, int, int) TO authenticated;

-- 3. Modificar create_sale_with_items para incluir rate limiting
-- Primero obtenemos el código actual de la función

-- 4. Función wrapper para crear venta con rate limit
CREATE OR REPLACE FUNCTION create_sale_with_items_ratelimited(
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
  v_allowed boolean;
  v_result jsonb;
BEGIN
  -- Verificar rate limit: máximo 20 ventas por hora
  v_allowed := check_rate_limit(auth.uid(), 'create_sale_with_items', 20, 60);
  
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Has excedido el límite de ventas. Intenta de nuevo en una hora.';
  END IF;

  -- Ejecutar la venta (usando la función existente o duplicando la lógica aquí)
  -- Aquí duplicamos la lógica para mantenerlo simple
  -- NOTA: En producción, podrías llamar a otra función internamente
  
  v_result := create_sale_with_items(p_company_id, p_customer_name, p_items, p_customer_id);
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_sale_with_items_ratelimited(uuid, text, jsonb, uuid) TO authenticated;

-- 5. Función para limpiar registros antiguos de rate limits (ejecutar manualmente o en cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - interval '24 hours';
END;
$$;

-- 6. Habilitar cleanup automático (opcional - requiere pg_cron o ejecutar manualmente)
-- Esta función puede ejecutarse diariamente para mantener la tabla limpia
GRANT EXECUTE ON FUNCTION cleanup_rate_limits() TO authenticated;
