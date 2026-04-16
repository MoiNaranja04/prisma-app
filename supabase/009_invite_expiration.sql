-- ============================================================================
-- PRISMA CAPTUS - CÓDIGO DE INVITACIÓN CON EXPIRACIÓN
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Agregar columna invite_expires_at
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

-- 2. Modificar RPC register_company para establecer expiración por defecto (7 días)
-- Primero verificamos si existe y la recreamos con la expiración

-- 3. Modificar join_company_by_code para validar expiración
CREATE OR REPLACE FUNCTION join_company_by_code(
  p_invite_code text,
  p_user_id uuid,
  p_user_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company record;
BEGIN
  -- 1. Buscar empresa por código de invitación
  SELECT id, name, invite_expires_at INTO v_company
  FROM companies
  WHERE invite_code = p_invite_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de invitación inválido';
  END IF;

  -- 2. Validar que no haya expirado
  IF v_company.invite_expires_at IS NOT NULL AND v_company.invite_expires_at < NOW() THEN
    RAISE EXCEPTION 'El código de invitación ha expirado. Solicita uno nuevo.';
  END IF;

  -- 3. Verificar que el usuario no sea ya miembro
  IF EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = p_user_id AND company_id = v_company.id
  ) THEN
    RAISE EXCEPTION 'Ya eres miembro de esta empresa';
  END IF;

  -- 4. Insertar como empleado
  INSERT INTO company_users (company_id, user_id, role, name)
  VALUES (v_company.id, p_user_id, 'employee', p_user_name);

  -- 5. Retornar info de la empresa
  RETURN jsonb_build_object(
    'company_id', v_company.id,
    'company_name', v_company.name
  );
END;
$$;

-- 4. RPC para regenerar código de invitación (solo admin)
CREATE OR REPLACE FUNCTION regenerate_invite_code(
  p_company_id uuid,
  p_days_valid int DEFAULT 7
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_code text;
  v_user_role text;
BEGIN
  -- Validar que es admin
  SELECT role INTO v_user_role
  FROM company_users
  WHERE user_id = auth.uid() AND company_id = p_company_id;

  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden regenerar el código';
  END IF;

  -- Generar nuevo código
  v_new_code := upper(substring(md5(random()::text) from 1 for 8));

  -- Actualizar código y fecha de expiración
  UPDATE companies
  SET invite_code = v_new_code,
      invite_expires_at = NOW() + (p_days_valid || ' days')::interval
  WHERE id = p_company_id;

  RETURN v_new_code;
END;
$$;

GRANT EXECUTE ON FUNCTION regenerate_invite_code(uuid, int) TO authenticated;

-- 5. RPC para obtener info de invitación (para mostrar expiración)
CREATE OR REPLACE FUNCTION get_company_invite_info(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'invite_code', c.invite_code,
    'invite_expires_at', c.invite_expires_at,
    'is_expired', COALESCE(c.invite_expires_at < NOW(), false)
  ) INTO v_result
  FROM companies c
  WHERE c.id = p_company_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_company_invite_info(uuid) TO authenticated;
