-- Agrega las medidas de los productos (en centímetros y milímetros),
-- todas opcionales para no romper los productos que ya existen.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS largo_cm NUMERIC(8,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS ancho_cm NUMERIC(8,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS espesor_mm NUMERIC(8,2);