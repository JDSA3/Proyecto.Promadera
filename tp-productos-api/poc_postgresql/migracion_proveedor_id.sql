-- Migracion: agrega proveedor_id (opcional) a la tabla productos.
--
-- Para que sirve: en una base que YA existe, crear_tablas.py y schema.sql no
-- modifican tablas existentes. Este script agrega la columna nueva sin
-- borrar ningun dato. Los productos que ya estaban quedan con proveedor_id NULL.
--
-- Como usarlo: Supabase > SQL Editor > pegar todo > Run.
-- Se puede correr mas de una vez sin problema (IF NOT EXISTS).
--
-- Requisito: la tabla usuarios tiene que existir. Para comprobarlo, correr:
--     SELECT to_regclass('public.usuarios');
-- Si devuelve "usuarios" esta todo bien. Si devuelve NULL, primero correr
-- "python -m poc_postgresql.crear_tablas" (la crea sin tocar los datos).

ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS proveedor_id INTEGER REFERENCES usuarios (id);

-- Verificacion: tiene que aparecer proveedor_id con is_nullable = YES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'productos'
ORDER BY ordinal_position;
