-- Agrega las tablas de pedidos a una base que ya existe, sin tocar los datos.
-- Supabase > SQL Editor > pegar todo > Run. Se puede correr más de una vez.

CREATE TABLE IF NOT EXISTS pedidos (
    id         SERIAL PRIMARY KEY,
    cliente_id INTEGER        NOT NULL REFERENCES usuarios (id),
    estado     VARCHAR(20)    NOT NULL DEFAULT 'pendiente',
    total      NUMERIC(12, 2) NOT NULL,
    creado_en  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_pedidos_estado CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),
    CONSTRAINT ck_pedidos_total_positivo CHECK (total >= 0)
);

CREATE TABLE IF NOT EXISTS pedido_items (
    id              SERIAL PRIMARY KEY,
    pedido_id       INTEGER        NOT NULL REFERENCES pedidos (id) ON DELETE CASCADE,
    producto_id     INTEGER        NOT NULL REFERENCES productos (id),
    cantidad        INTEGER        NOT NULL,
    precio_unitario NUMERIC(12, 2) NOT NULL,
    CONSTRAINT ck_pedido_items_cantidad_positiva CHECK (cantidad > 0),
    CONSTRAINT ck_pedido_items_precio_positivo CHECK (precio_unitario >= 0)
);
