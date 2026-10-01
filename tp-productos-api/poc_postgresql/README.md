# POC: PostgreSQL en Supabase

Prueba aislada para pasar los datos de ProMadera (hoy en listas en memoria, `app/core/db.py`) a PostgreSQL en Supabase.
No modifica la API actual: el router y el repository siguen usando las listas.

## Archivos

| Archivo | Qué hace |
|---|---|
| `database.py` | Lee `DATABASE_URL` del `.env` y crea la conexión (engine de SQLAlchemy). |
| `models.py` | Tablas `categorias` y `productos` como modelos de SQLAlchemy. |
| `probar_conexion.py` | Verifica que la conexión a Supabase funcione. |
| `crear_tablas.py` | Crea las tablas y carga las categorías y productos de `app/core/db.py`. |
| `schema.sql` | Lo mismo que `crear_tablas.py`, pero en SQL para pegar en el SQL Editor de Supabase. |

## Tablas

```
categorias                     productos
-----------                    ----------------------------
id      SERIAL PK   <──┐       id           SERIAL PK
nombre  VARCHAR(100)   │       nombre       VARCHAR(100)
        UNIQUE         │       precio       NUMERIC(12,2)  (>= 0)
                       │       stock        INTEGER        (>= 0)
                       │       activo       BOOLEAN        (default true)
                       └────── categoria_id INTEGER FK
```

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
