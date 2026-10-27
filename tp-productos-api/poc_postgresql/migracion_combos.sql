-- Comunidad de diseño: combos de productos (tarea J3).
-- Crea las tablas combos y combo_items y carga 6 combos preseleccionados de ProMadera.
-- Los combos de ProMadera tienen autor_id NULL; los que arman los carpinteros, el id del autor.
--
-- Cómo usarlo: Supabase > SQL Editor > pegar todo > Run.
-- Se puede correr más de una vez (no duplica los combos de ProMadera).

CREATE TABLE IF NOT EXISTS combos (
    id          SERIAL PRIMARY KEY,
    autor_id    INTEGER      REFERENCES usuarios (id),
    titulo      VARCHAR(100) NOT NULL,
    descripcion VARCHAR(500) NOT NULL DEFAULT '',
    imagen      TEXT,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS combo_items (
    id          SERIAL PRIMARY KEY,
    combo_id    INTEGER NOT NULL REFERENCES combos (id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos (id),
    cantidad    INTEGER NOT NULL,
    CONSTRAINT uq_combo_item UNIQUE (combo_id, producto_id),
    CONSTRAINT ck_combo_items_cantidad_positiva CHECK (cantidad > 0)
);

-- Combos preseleccionados de ProMadera
INSERT INTO combos (autor_id, titulo, descripcion)
SELECT NULL, v.titulo, v.descripcion
FROM (VALUES
    ('Mueble bajo mesada de cocina', 'Módulo de cocina en melamina blanca con dos puertas de cierre suave y un cajón.'),
    ('Escritorio de estudio',        'Escritorio en melamina roble con un cajón, tapacanto y patas regulables.'),
    ('Placard de dos puertas',       'Placard en melamina gris grafito con estantes, bisagras de cierre suave y tiradores.'),
    ('Mesa ratona de pino',          'Mesa baja de pino cepillado con patas de tirante, lista para lijar y barnizar.'),
    ('Biblioteca de terciado',       'Biblioteca simple de terciado de pino con estantes regulables y refuerzos.'),
    ('Cajonera de MDF',              'Cajonera de tres cajones en MDF con correderas telescópicas y cerradura.')
) AS v(titulo, descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM combos c WHERE c.autor_id IS NULL AND c.titulo = v.titulo
);

-- Productos de cada combo (ids del seed_productos.sql)
INSERT INTO combo_items (combo_id, producto_id, cantidad)
SELECT c.id, v.producto_id, v.cantidad
FROM (VALUES
    ('Mueble bajo mesada de cocina',  8, 2),  -- Placa melamina blanca 18mm
    ('Mueble bajo mesada de cocina', 21, 1),  -- Fondo hardboard
    ('Mueble bajo mesada de cocina', 30, 4),  -- Bisagra cierre suave
    ('Mueble bajo mesada de cocina', 33, 2),  -- Corredera cierre suave 45cm
    ('Mueble bajo mesada de cocina', 35, 3),  -- Tirador 160mm
    ('Mueble bajo mesada de cocina', 43, 2),  -- Tapacanto blanco
    ('Mueble bajo mesada de cocina', 42, 1),  -- Pie regulable
    ('Mueble bajo mesada de cocina', 48, 1),  -- Tornillos para aglomerado

    ('Escritorio de estudio',         9, 2),  -- Placa melamina roble 18mm
    ('Escritorio de estudio',        44, 1),  -- Tapacanto roble
    ('Escritorio de estudio',        32, 1),  -- Corredera 50cm
    ('Escritorio de estudio',        34, 1),  -- Tirador 128mm
    ('Escritorio de estudio',        42, 1),  -- Pie regulable
    ('Escritorio de estudio',        48, 1),  -- Tornillos para aglomerado

    ('Placard de dos puertas',       11, 3),  -- Placa melamina gris grafito
    ('Placard de dos puertas',       21, 1),  -- Fondo hardboard
    ('Placard de dos puertas',       30, 6),  -- Bisagra cierre suave
    ('Placard de dos puertas',       35, 2),  -- Tirador 160mm
    ('Placard de dos puertas',       37, 2),  -- Soporte de estante
    ('Placard de dos puertas',       43, 2),  -- Tapacanto blanco

    ('Mesa ratona de pino',          25, 4),  -- Tabla de pino cepillada
    ('Mesa ratona de pino',          23, 1),  -- Tirante de pino (patas)
    ('Mesa ratona de pino',          52, 1),  -- Tarugos
    ('Mesa ratona de pino',          45, 1),  -- Cola vinílica
    ('Mesa ratona de pino',          50, 3),  -- Lija al agua
    ('Mesa ratona de pino',          51, 1),  -- Sellador
    ('Mesa ratona de pino',          49, 1),  -- Barniz

    ('Biblioteca de terciado',       19, 2),  -- Terciado pino 15mm
    ('Biblioteca de terciado',       37, 3),  -- Soporte de estante
    ('Biblioteca de terciado',       41, 2),  -- Escuadra de refuerzo
    ('Biblioteca de terciado',       47, 1),  -- Tornillos autoperforantes
    ('Biblioteca de terciado',       51, 1),  -- Sellador
    ('Biblioteca de terciado',       50, 2),  -- Lija al agua

    ('Cajonera de MDF',              13, 2),  -- Placa MDF crudo 18mm
    ('Cajonera de MDF',              21, 1),  -- Fondo hardboard
    ('Cajonera de MDF',              32, 3),  -- Corredera 50cm
    ('Cajonera de MDF',              36, 3),  -- Perilla de madera
    ('Cajonera de MDF',              40, 1),  -- Cerradura para cajón
    ('Cajonera de MDF',              48, 1)   -- Tornillos para aglomerado
) AS v(titulo, producto_id, cantidad)
JOIN combos c    ON c.titulo = v.titulo AND c.autor_id IS NULL
JOIN productos p ON p.id = v.producto_id
ON CONFLICT ON CONSTRAINT uq_combo_item DO NOTHING;

-- Verificación: 6 combos de ProMadera con entre 6 y 8 productos cada uno
SELECT c.id, c.titulo, COUNT(i.id) AS productos
FROM combos c
LEFT JOIN combo_items i ON i.combo_id = c.id
WHERE c.autor_id IS NULL
GROUP BY c.id, c.titulo
ORDER BY c.id;
