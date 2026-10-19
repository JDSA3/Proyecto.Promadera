-- Migración: crea la tabla producto_compatible (piezas que combinan entre sí).
--
-- La relación es simétrica: se guarda UNA fila por pareja y la API la busca
-- en los dos sentidos. No modifica ninguna tabla existente.
--
-- Cómo usarlo: Supabase > SQL Editor > pegar todo > Run.
-- Se puede correr más de una vez (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS producto_compatible (
    producto_id   INTEGER      NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
    compatible_id INTEGER      NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
    motivo        VARCHAR(150) NOT NULL DEFAULT '',
    PRIMARY KEY (producto_id, compatible_id),
    CONSTRAINT ck_compatible_distintos CHECK (producto_id <> compatible_id)
);

-- Evita guardar la misma pareja dos veces en sentido inverso (A,B) y (B,A).
CREATE UNIQUE INDEX IF NOT EXISTS ux_producto_compatible_pareja
    ON producto_compatible (LEAST(producto_id, compatible_id), GREATEST(producto_id, compatible_id));

-- Para buscar rápido desde el otro lado de la pareja.
CREATE INDEX IF NOT EXISTS ix_producto_compatible_compatible
    ON producto_compatible (compatible_id);

-- Verificación: tiene que aparecer la tabla con sus 3 columnas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'producto_compatible'
ORDER BY ordinal_position;
