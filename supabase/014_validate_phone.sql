-- ============================================================================
-- PRISMA CAPTUS - VALIDACIÓN DE FORMATO DE TELÉFONO Y DOCUMENTO
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Función para validar teléfono venezolano
CREATE OR REPLACE FUNCTION validate_phone(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN true; -- Teléfono es opcional
  END IF;
  
  -- Acepta formatos: 0412-1234567, 0412 123 4567, 04121234567, +584121234567
  RETURN p_phone ~* '^((\+?58)?[ -]?)?(0?4[12][ -]?[0-9]{3}[ -]?[0-9]{4})$';
END;
$$;

-- 2. Función para validar documento de identidad venezolano
CREATE OR REPLACE FUNCTION validate_document(p_document text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_document IS NULL OR trim(p_document) = '' THEN
    RETURN true; -- Documento es opcional
  END IF;
  
  -- Formatos: V-12345678, E-12345678, J-12345678, G-12345678
  RETURN p_document ~* '^[VJEGP]-[0-9]{5,9}$';
END;
$$;

-- 3. Actualizar trigger de customers para validar antes de insert/update
CREATE OR REPLACE FUNCTION validate_customer_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NOT validate_phone(NEW.phone) THEN
    RAISE EXCEPTION 'Formato de teléfono inválido. Ejemplos válidos: 0412-1234567, +584121234567';
  END IF;
  
  IF NEW.document IS NOT NULL AND NOT validate_document(NEW.document) THEN
    RAISE EXCEPTION 'Formato de documento inválido. Use: V-12345678, E-12345678, J-12345678';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_customer ON customers;
CREATE TRIGGER validate_customer
BEFORE INSERT OR UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION validate_customer_trigger();

-- 4. Función para formatear teléfono (normalizar)
CREATE OR REPLACE FUNCTION format_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Eliminar todos los caracteres no numéricos excepto +
  RETURN regexp_replace(p_phone, '[^0-9+]', '', 'g');
END;
$$;

-- 5. Función para formatear documento (normalizar)
CREATE OR REPLACE FUNCTION format_document(p_document text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_document IS NULL OR trim(p_document) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Convertir a mayúsculas y eliminar espacios
  RETURN upper(trim(p_document));
END;
$$;

GRANT EXECUTE ON FUNCTION validate_phone(text) TO public;
GRANT EXECUTE ON FUNCTION validate_document(text) TO public;
GRANT EXECUTE ON FUNCTION format_phone(text) TO public;
GRANT EXECUTE ON FUNCTION format_document(text) TO public;
