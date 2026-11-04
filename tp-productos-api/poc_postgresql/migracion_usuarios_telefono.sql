-- Migracion: agrega telefono (opcional) a la tabla usuarios.
-- Como usarlo: Supabase > SQL Editor > pegar todo > Run.
-- Se puede correr mas de una vez sin problema (IF NOT EXISTS).

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);

-- Verificacion: tiene que aparecer telefono con is_nullable = YES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name = 'telefono';
