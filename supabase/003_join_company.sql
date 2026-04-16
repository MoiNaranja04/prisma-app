-- ============================================================================
-- RPC: join_company_by_code
-- Permite a un usuario unirse a una empresa usando el código de invitación.
-- Ejecutar DESPUÉS de rls_policies.sql
-- ============================================================================

DROP FUNCTION IF EXISTS join_company_by_code(text, uuid, text);

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
  SELECT id, name INTO v_company
  FROM companies
  WHERE invite_code = p_invite_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de invitación inválido';
  END IF;

  -- 2. Verificar que el usuario no sea ya miembro
  IF EXISTS (
    SELECT 1 FROM company_users
    WHERE user_id = p_user_id AND company_id = v_company.id
  ) THEN
    RAISE EXCEPTION 'Ya eres miembro de esta empresa';
  END IF;

  -- 3. Insertar como empleado
  INSERT INTO company_users (company_id, user_id, role, name)
  VALUES (v_company.id, p_user_id, 'employee', p_user_name);

  -- 4. Retornar info de la empresa
  RETURN jsonb_build_object(
    'company_id', v_company.id,
    'company_name', v_company.name
  );
END;
$$;
