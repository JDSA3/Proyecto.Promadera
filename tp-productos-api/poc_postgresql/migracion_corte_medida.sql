-- Guarda el largo del corte (en cm) de cada item del pedido. Vacío = pieza entera, como hasta ahora.
-- Supabase > SQL Editor > pegar todo > Run. Se puede correr más de una vez.

ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS largo_cm NUMERIC(8, 2);

-- Verificación: tiene que aparecer la columna largo_cm
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'pedido_items' AND column_name = 'largo_cm';
