-- Migración: una sub-orden por corralón dentro de cada pedido (tarea A2).
--
-- pedidos sigue siendo la orden del carpintero (lleva el pago).
-- pedido_corralon es la parte que le toca a cada corralón, con su propio estado.
-- Los items de los pedidos que ya existen se reparten en sub-órdenes, sin borrar nada.
--
-- Cómo usarlo: Supabase > SQL Editor > pegar todo > Run.
-- Se puede correr más de una vez.

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

-- Pedidos viejos: crea las sub-órdenes que faltan...
INSERT INTO pedido_corralon (pedido_id, proveedor_id, estado, total)
SELECT i.pedido_id,
       pr.proveedor_id,
       CASE WHEN p.estado = 'cancelado' THEN 'cancelado' ELSE 'pendiente' END,
       SUM(i.cantidad * i.precio_unitario)
FROM pedido_items i
JOIN productos pr ON pr.id = i.producto_id
JOIN pedidos p ON p.id = i.pedido_id
WHERE i.pedido_corralon_id IS NULL
GROUP BY i.pedido_id, pr.proveedor_id, p.estado
ON CONFLICT ON CONSTRAINT uq_pedido_corralon DO NOTHING;

-- ...y engancha cada item con la sub-orden de su corralón.
UPDATE pedido_items i
SET pedido_corralon_id = pc.id
FROM productos pr, pedido_corralon pc
WHERE i.pedido_corralon_id IS NULL
  AND pr.id = i.producto_id
  AND pc.pedido_id = i.pedido_id
  AND pc.proveedor_id IS NOT DISTINCT FROM pr.proveedor_id;

-- Verificación: una fila por pedido y corralón, con su total
SELECT pedido_id, proveedor_id, estado, total FROM pedido_corralon ORDER BY pedido_id, proveedor_id;
