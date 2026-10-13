# POC: PostgreSQL en Supabase

Prueba aislada para pasar los datos de ProMadera (hoy en listas en memoria, `app/core/db.py`) a PostgreSQL en Supabase.
No modifica la API actual: el router y el repository siguen usando las listas.

## Archivos

| Archivo | Qué hace |
|---|---|
| `database.py` | Lee `DATABASE_URL` del `.env` y crea la conexión (engine de SQLAlchemy). |
| `models.py` | Tablas `categorias`, `productos` y `usuarios` como modelos de SQLAlchemy. |
| `probar_conexion.py` | Verifica que la conexión a Supabase funcione. |
| `crear_tablas.py` | Crea las tablas y carga las categorías y productos de `app/core/db.py`. |
| `schema.sql` | Lo mismo que `crear_tablas.py`, pero en SQL para pegar en el SQL Editor de Supabase. |
| `migracion_proveedor_id.sql` | Agrega la columna `proveedor_id` a la tabla `productos` en una base que ya existe, sin borrar datos. |

## Tablas

```
categorias                     productos
-----------                    ----------------------------
id      SERIAL PK   <──┐       id           SERIAL PK
nombre  VARCHAR(100)   │       nombre       VARCHAR(100)
        UNIQUE         │       precio       NUMERIC(12,2)  (>= 0)
                       │       stock        INTEGER        (>= 0)
                       │       activo       BOOLEAN        (default true)
                       ├────── categoria_id INTEGER FK
                       └────── proveedor_id INTEGER FK  (opcional, puede ser NULL)
                                              │
usuarios                                      │
--------------------------                    │
id            SERIAL PK   <───────────────────┘
nombre        VARCHAR(100)
email         VARCHAR(255)  UNIQUE
password_hash VARCHAR(255)
rol           VARCHAR(20)   ('cliente' o 'proveedor')
activo        BOOLEAN       (default true)
```

`proveedor_id` es opcional: los productos originales no tienen proveedor y eso está bien.

## Cómo usarlo

Desde la carpeta `tp-productos-api/`, con el venv activado:

```bash
pip install -r requirements-postgresql.txt
```

Copiar `.env.example` como `.env` y reemplazar `[YOUR-PASSWORD]` por la contraseña del proyecto de Supabase
(la cadena completa sale del botón **Connect** > **Connection string** > **URI**). El `.env` no se sube a GitHub.

```bash
python -m poc_postgresql.probar_conexion   # debe imprimir "Conexion OK"
python -m poc_postgresql.crear_tablas      # crea las tablas y carga los datos
```

Después, en Supabase > **Table Editor** se ven las tablas `categorias` y `productos` con los datos.

Si se prefiere no usar Python: Supabase > **SQL Editor** > pegar `schema.sql` > **Run**.

## Si la base ya existe y falta `proveedor_id`

`crear_tablas.py` y `schema.sql` no modifican tablas que ya existen. Para agregar la columna `proveedor_id`
sin perder datos: Supabase > **SQL Editor** > pegar `migracion_proveedor_id.sql` > **Run**.
Hay que hacerlo **antes** de levantar la API con el código nuevo; si no, `GET /productos` falla con
`column productos.proveedor_id does not exist`.
