-- Migracion: telefono en usuarios (para el boton de WhatsApp) y forma de
-- entrega del pedido (retiro o envio).
--
-- Para que sirve: en una base que YA existe, crear_tablas.py y schema.sql no
-- modifican tablas existentes. Este script agrega las columnas nuevas sin
-- borrar ningun dato:
--   - usuarios.telefono : solo numeros, de 8 a 15 digitos, formato internacional
--                         sin "+" ni espacios (ej. 5493875551234). Puede ser NULL.
--   - pedidos.entrega   : 'retiro' o 'envio'. Los pedidos que ya existen quedan
--                         en 'retiro'.
--
-- Como usarlo: Supabase > SQL Editor > pegar todo > Run.
-- Se puede correr mas de una vez sin problema.
--
-- IMPORTANTE: correrlo ANTES de subir el codigo nuevo al servidor. Las columnas
-- nuevas no molestan al codigo viejo, pero el codigo nuevo las necesita.

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS telefono VARCHAR(20);

ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS entrega VARCHAR(10) NOT NULL DEFAULT 'retiro';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_usuarios_telefono') THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT ck_usuarios_telefono
            CHECK (telefono IS NULL OR telefono ~ '^[0-9]{8,15}$');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_pedidos_entrega') THEN
        ALTER TABLE pedidos
            ADD CONSTRAINT ck_pedidos_entrega
            CHECK (entrega IN ('retiro', 'envio'));
    END IF;
END $$;

-- Telefonos de prueba para los 2 corralones de la demo.
-- CAMBIAR por un numero real (por ejemplo el de un integrante del grupo) antes
-- de la exposicion, asi el boton de WhatsApp abre un chat de verdad.
-- Formato: 54 + 9 + codigo de area sin 0 + numero, todo junto.
UPDATE usuarios SET telefono = '5493870000001'
WHERE rol = 'proveedor' AND nombre ILIKE '%El Pino%' AND telefono IS NULL;

UPDATE usuarios SET telefono = '5493870000002'
WHERE rol = 'proveedor' AND nombre ILIKE '%Don Cedro%' AND telefono IS NULL;

-- Verificacion 1: tienen que aparecer telefono (usuarios) y entrega (pedidos)
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE (table_name = 'usuarios' AND column_name = 'telefono')
   OR (table_name = 'pedidos'  AND column_name = 'entrega')
ORDER BY table_name;

-- Verificacion 2: los corralones tienen que mostrar su telefono
SELECT id, nombre, rol, telefono FROM usuarios WHERE rol = 'proveedor' ORDER BY id;
