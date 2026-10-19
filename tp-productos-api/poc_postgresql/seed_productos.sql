-- Datos de ejemplo para ProMadera: deja el catálogo en 60 productos.
-- Precios y stock son inventados para la demo.
-- Correr en Supabase > SQL Editor DESPUÉS de migracion_medidas.sql.
-- Es seguro correrlo más de una vez (ON CONFLICT DO NOTHING).

-- Medidas de los 7 productos que ya existían
UPDATE productos SET largo_cm = 260, ancho_cm = 183, espesor_mm = 18 WHERE id = 1 AND largo_cm IS NULL;
UPDATE productos SET largo_cm = 260, ancho_cm = 183, espesor_mm = 15 WHERE id = 2 AND largo_cm IS NULL;
UPDATE productos SET largo_cm = 45 WHERE id = 4 AND largo_cm IS NULL;
UPDATE productos SET largo_cm = 250 WHERE id = 5 AND largo_cm IS NULL;

-- 53 productos nuevos (ids 8 a 60)
INSERT INTO productos (id, nombre, precio, stock, categoria_id, largo_cm, ancho_cm, espesor_mm) VALUES
-- Maderas y Tableros (categoria 1): ids 8-27
(8,  'Placa melamina blanca 18mm 1.83x2.60m',            89500, 20, 1, 260, 183, 18),
(9,  'Placa melamina roble 18mm 1.83x2.60m',            102000, 12, 1, 260, 183, 18),
(10, 'Placa melamina wengue 18mm 1.83x2.60m',           104500, 10, 1, 260, 183, 18),
(11, 'Placa melamina gris grafito 18mm 1.83x2.60m',      99800,  8, 1, 260, 183, 18),
(12, 'Placa melamina blanca 15mm 1.83x2.60m',            78000, 14, 1, 260, 183, 15),
(13, 'Placa MDF crudo 18mm 1.83x2.60m',                  71000, 18, 1, 260, 183, 18),
(14, 'Placa MDF crudo 12mm 1.83x2.60m',                  54000, 16, 1, 260, 183, 12),
(15, 'Placa MDF crudo 9mm 1.83x2.60m',                   43000, 22, 1, 260, 183,  9),
(16, 'Placa MDF crudo 5.5mm 1.83x2.60m',                 31500, 25, 1, 260, 183,  5.5),
(17, 'Placa de aglomerado crudo 18mm 1.83x2.60m',        52000, 15, 1, 260, 183, 18),
(18, 'Placa de terciado fenólico 18mm 1.22x2.44m',       88000,  9, 1, 244, 122, 18),
(19, 'Placa de terciado pino 15mm 1.22x2.44m',           59500, 11, 1, 244, 122, 15),
(20, 'Placa de terciado pino 9mm 1.22x2.44m',            38000, 13, 1, 244, 122,  9),
(21, 'Fondo de mueble hardboard blanco 3mm 1.83x2.60m',  17500, 30, 1, 260, 183,  3),
(22, 'Tablón de pino 2" x 8" x 3.05m',                   26500, 24, 1, 305,  20, 50),
(23, 'Tirante de pino 3" x 3" x 3.05m',                  21000, 28, 1, 305,   7.5, 75),
(24, 'Listón de pino cepillado 1" x 2" x 3.05m',          6800, 60, 1, 305,   5, 25),
(25, 'Tabla de pino cepillada 1" x 6" x 3.05m',          12500, 35, 1, 305,  15, 25),
(26, 'Tabla de eucalipto 1" x 8" x 3m',                  14800, 20, 1, 300,  20, 25),
(27, 'Placa de OSB 15mm 1.22x2.44m',                     46000, 12, 1, 244, 122, 15),

-- Herrajes (categoria 2): ids 28-42
(28, 'Bisagra codo 35mm',                                 1180, 250, 2, NULL, NULL, NULL),
(29, 'Bisagra recta 35mm',                                1210, 180, 2, NULL, NULL, NULL),
(30, 'Bisagra cierre suave 35mm',                         2650, 150, 2, NULL, NULL, NULL),
(31, 'Corredera telescópica 35cm',                        6900,  45, 2, 35, NULL, NULL),
(32, 'Corredera telescópica 50cm',                        8400,  40, 2, 50, NULL, NULL),
(33, 'Corredera telescópica cierre suave 45cm',          13200,  25, 2, 45, NULL, NULL),
(34, 'Tirador barra aluminio 128mm',                      2300,  90, 2, 12.8, NULL, NULL),
(35, 'Tirador barra aluminio 160mm',                      2600,  85, 2, 16, NULL, NULL),
(36, 'Perilla de madera 30mm',                             950, 120, 2, NULL, NULL, NULL),
(37, 'Soporte de estante metálico (par)',                  780, 200, 2, NULL, NULL, NULL),
(38, 'Pistón a gas 80N para tapa',                        3900,  50, 2, NULL, NULL, NULL),
(39, 'Rueda giratoria con freno 50mm',                    2100,  60, 2, NULL, NULL, NULL),
(40, 'Cerradura para cajón',                              3400,  35, 2, NULL, NULL, NULL),
(41, 'Escuadra de refuerzo 40x40mm (x10)',                1950,  70, 2, 4, 4, NULL),
(42, 'Pie regulable plástico para mueble (x4)',           1700,  80, 2, NULL, NULL, NULL),

-- Insumos (categoria 3): ids 43-52
(43, 'Tapacanto PVC blanco 22mm rollo 20m',               5200,  40, 3, 2000, 2.2, NULL),
(44, 'Tapacanto PVC roble 22mm rollo 20m',                5600,  35, 3, 2000, 2.2, NULL),
(45, 'Cola vinílica 1kg',                                 3100,  50, 3, NULL, NULL, NULL),
(46, 'Cola de contacto 1L',                               6900,  30, 3, NULL, NULL, NULL),
(47, 'Tornillo autoperforante 4x40mm (caja x100)',        2800,  90, 3, 4, NULL, NULL),
(48, 'Tornillo para aglomerado 4.5x50mm (caja x100)',     3200,  85, 3, 5, NULL, NULL),
(49, 'Barniz marino brillante 1L',                       10800,  26, 3, NULL, NULL, NULL),
(50, 'Lija al agua grano 220 (pliego)',                    450, 300, 3, 28, 23, NULL),
(51, 'Sellador para madera 1L',                           7600,  28, 3, NULL, NULL, NULL),
(52, 'Tarugo de madera 8mm (bolsa x100)',                 1500, 100, 3, 3, NULL, NULL),

-- Herramientas (categoria 4): ids 53-60
(53, 'Taladro percutor 650W',                            68500,  10, 4, NULL, NULL, NULL),
(54, 'Atornillador inalámbrico 12V',                     74000,   8, 4, NULL, NULL, NULL),
(55, 'Lijadora orbital 240W',                            52000,   9, 4, NULL, NULL, NULL),
(56, 'Caladora 500W',                                    59000,   7, 4, NULL, NULL, NULL),
(57, 'Cinta métrica 5m',                                  3400,  60, 4, 500, NULL, NULL),
(58, 'Escuadra carpintero 30cm',                          5200,  25, 4, 30, NULL, NULL),
(59, 'Serrucho de costilla 300mm',                       12500,  18, 4, 30, NULL, NULL),
(60, 'Prensa tipo C 150mm',                               9800,  20, 4, 15, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('productos', 'id'), (SELECT MAX(id) FROM productos));

-- Control: tiene que devolver 60
SELECT COUNT(*) AS total FROM productos WHERE activo;
