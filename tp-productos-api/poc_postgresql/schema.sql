-- Esquema de ProMadera para PostgreSQL (Supabase).
-- Alternativa a crear_tablas.py: pegar todo en Supabase > SQL Editor > Run.

CREATE TABLE IF NOT EXISTS categorias (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS productos (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(100)   NOT NULL,
    precio       NUMERIC(12, 2) NOT NULL,
    stock        INTEGER        NOT NULL DEFAULT 0,
    activo       BOOLEAN        NOT NULL DEFAULT TRUE,
    categoria_id INTEGER        NOT NULL REFERENCES categorias (id),
    CONSTRAINT ck_productos_precio_positivo CHECK (precio >= 0),
    CONSTRAINT ck_productos_stock_positivo  CHECK (stock >= 0)
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
