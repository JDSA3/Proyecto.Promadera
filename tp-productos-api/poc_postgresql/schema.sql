-- Esquema de ProMadera para PostgreSQL (Supabase).
-- Alternativa a crear_tablas.py: pegar todo en Supabase > SQL Editor > Run.

CREATE TABLE IF NOT EXISTS categorias (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol           VARCHAR(20)  NOT NULL,
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_usuarios_rol CHECK (rol IN ('cliente', 'proveedor'))
);

CREATE TABLE IF NOT EXISTS productos (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(100)   NOT NULL,
    precio       NUMERIC(12, 2) NOT NULL,
    stock        INTEGER        NOT NULL DEFAULT 0,
    activo       BOOLEAN        NOT NULL DEFAULT TRUE,
    categoria_id INTEGER        NOT NULL REFERENCES categorias (id),
    proveedor_id INTEGER        REFERENCES usuarios (id),  -- opcional: puede ser NULL
    largo_cm     NUMERIC(8, 2),
    ancho_cm     NUMERIC(8, 2),
    espesor_mm   NUMERIC(8, 2),
    CONSTRAINT ck_productos_precio_positivo CHECK (precio >= 0),
    CONSTRAINT ck_productos_stock_positivo  CHECK (stock >= 0)
);

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

-- Piezas que combinan entre si. Una fila por pareja (la API la busca en los dos sentidos).
CREATE TABLE IF NOT EXISTS producto_compatible (
    producto_id   INTEGER      NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
    compatible_id INTEGER      NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
    motivo        VARCHAR(150) NOT NULL DEFAULT '',
    PRIMARY KEY (producto_id, compatible_id),
    CONSTRAINT ck_compatible_distintos CHECK (producto_id <> compatible_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_producto_compatible_pareja
    ON producto_compatible (LEAST(producto_id, compatible_id), GREATEST(producto_id, compatible_id));

CREATE TABLE IF NOT EXISTS pedido_corralon (
    id                SERIAL PRIMARY KEY,
    pedido_id         INTEGER        NOT NULL REFERENCES pedidos (id) ON DELETE CASCADE,
    proveedor_id      INTEGER        REFERENCES usuarios (id),
    estado            VARCHAR(20)    NOT NULL DEFAULT 'pendiente',
    total             NUMERIC(12, 2) NOT NULL,
    motivo_devolucion VARCHAR(300),
    CONSTRAINT uq_pedido_corralon UNIQUE NULLS NOT DISTINCT (pedido_id, proveedor_id),
    CONSTRAINT ck_pedido_corralon_estado
        CHECK (estado IN ('pendiente', 'confirmado', 'enviado', 'entregado', 'devuelto', 'cancelado')),
    CONSTRAINT ck_pedido_corralon_total_positivo CHECK (total >= 0)
);

ALTER TABLE pedido_items
    ADD COLUMN IF NOT EXISTS pedido_corralon_id INTEGER REFERENCES pedido_corralon (id) ON DELETE CASCADE;

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

INSERT INTO categorias (id, nombre) VALUES
    (1, 'Maderas y Tableros'),
    (2, 'Herrajes'),
    (3, 'Insumos'),
    (4, 'Herramientas')
ON CONFLICT (id) DO NOTHING;

INSERT INTO productos (id, nombre, precio, stock, categoria_id) VALUES
    (1, 'Placa melamina MDF 18mm 1.83x2.60m', 95700, 15, 1),
    (2, 'Placa melamina MDF 15mm 260x183cm', 90000, 10, 1),
    (3, 'Bisagra bayoneta 35mm', 1292, 200, 2),
    (4, 'Corredera telescópica 45cm', 7750, 40, 2),
    (5, 'Tapacanto metalico 2,5m', 10421, 30, 3),
    (6, 'Disco para Sierra Circular 7 1/4 24 Dientes TCT Kwb', 14432, 25, 3),
    (7, 'Sierra Circular 184 Mm 1400 W 5300 Rpm Black & Decker', 138120, 8, 4)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('categorias', 'id'), (SELECT MAX(id) FROM categorias));
SELECT setval(pg_get_serial_sequence('productos', 'id'), (SELECT MAX(id) FROM productos));