-- Agrega los proveedores de insumos y las órdenes de compra de cada corralón, sin tocar los datos.
-- Supabase > SQL Editor > pegar todo > Run. Se puede correr más de una vez.

CREATE TABLE IF NOT EXISTS proveedores_insumo (
    id          SERIAL PRIMARY KEY,
    corralon_id INTEGER      NOT NULL REFERENCES usuarios (id),
    nombre      VARCHAR(100) NOT NULL,
    telefono    VARCHAR(50),
    email       VARCHAR(255),
    activo      BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ordenes_compra (
    id                  SERIAL PRIMARY KEY,
    corralon_id         INTEGER     NOT NULL REFERENCES usuarios (id),
    proveedor_insumo_id INTEGER     NOT NULL REFERENCES proveedores_insumo (id),
    estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
    recibida_en         TIMESTAMPTZ,
    CONSTRAINT ck_ordenes_compra_estado CHECK (estado IN ('pendiente', 'recibida'))
);

CREATE TABLE IF NOT EXISTS orden_compra_items (
    id              SERIAL PRIMARY KEY,
    orden_compra_id INTEGER NOT NULL REFERENCES ordenes_compra (id) ON DELETE CASCADE,
    producto_id     INTEGER NOT NULL REFERENCES productos (id),
    cantidad        INTEGER NOT NULL,
    CONSTRAINT ck_orden_compra_items_cantidad_positiva CHECK (cantidad > 0)
);

-- Verificación: tienen que aparecer las 3 tablas
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('proveedores_insumo', 'ordenes_compra', 'orden_compra_items')
ORDER BY table_name;
