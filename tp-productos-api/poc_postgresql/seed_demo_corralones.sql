-- 1) Reparto de productos (si falta alguno de los dos corralones, no cambia nada)
WITH c AS (
    SELECT
        (SELECT id FROM usuarios WHERE email = 'corralon.pino@promadera.com'  AND rol = 'proveedor') AS c1,
        (SELECT id FROM usuarios WHERE email = 'corralon.cedro@promadera.com' AND rol = 'proveedor') AS c2
)
UPDATE productos p
SET proveedor_id = CASE WHEN p.id % 2 = 1 THEN c.c1 ELSE c.c2 END
FROM c
WHERE p.activo
  AND c.c1 IS NOT NULL
  AND c.c2 IS NOT NULL;

-- 2) Stock bajo y agotado para mostrar las alertas y las órdenes de compra en la demo
--    (borra este bloque si no queres tocar el stock)
--    (se evitan los ids 22 a 26 y 43-44 para no limitar las pruebas del slider de cortes)
UPDATE productos SET stock = 2 WHERE id IN (6, 13, 31, 40) AND activo;
UPDATE productos SET stock = 0 WHERE id IN (18)            AND activo;

-- Verificación: tienen que aparecer 2 corralones con ~30 productos cada uno y 0 productos sin corralón
SELECT COALESCE(u.nombre, '(sin corralón)') AS corralon,
       COUNT(*)                             AS productos,
       COUNT(*) FILTER (WHERE p.stock <= 5) AS con_stock_bajo
FROM productos p
LEFT JOIN usuarios u ON u.id = p.proveedor_id
WHERE p.activo
GROUP BY u.nombre
ORDER BY corralon;
