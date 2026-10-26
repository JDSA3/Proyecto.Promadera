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
| `migracion_pedidos.sql` | Agrega las tablas `pedidos` y `pedido_items` a una base que ya existe, sin borrar datos. |
| `migracion_pedido_corralon.sql` | Agrega `pedido_corralon` (una sub-orden por corralón) y reparte los pedidos que ya existen. |

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

## Pedidos

```
pedidos                              pedido_items
-------------------------            ------------------------------
id         SERIAL PK   <───────────  pedido_id       INTEGER FK
cliente_id INTEGER FK (usuarios)     id              SERIAL PK
estado     VARCHAR(20)               producto_id     INTEGER FK (productos)
           ('pendiente', 'pagado',   cantidad        INTEGER        (> 0)
            'cancelado')             precio_unitario NUMERIC(12,2)  (precio al momento de comprar)
total      NUMERIC(12,2)
creado_en  TIMESTAMPTZ  (default now())
```

Para agregarlas a la base de Supabase que ya existe: Supabase > **SQL Editor** > pegar `migracion_pedidos.sql` > **Run**.
Hay que hacerlo **antes** de levantar la API con el código nuevo.

Endpoints (`app/api/v1/pedidos/`):

- `POST /api/v1/pedidos` con `{"cliente_id": 1, "items": [{"producto_id": 3, "cantidad": 2}]}`: crea el pedido en
  `pendiente`, toma los precios de la base y descuenta el stock. 400 si el cliente o un producto no existe,
  409 si falta stock (en ese caso no se guarda nada).
- `GET /api/v1/pedidos?cliente_id=1`: pedidos de un cliente.
- `GET /api/v1/pedidos?proveedor_id=2`: pedidos con productos de ese proveedor (solo sus items, y el total de esos items).
- `GET /api/v1/pedidos/{id}`: un pedido (404 si no existe).

### Sub-órdenes por corralón

Un pedido puede tener productos de varios corralones. `pedidos` sigue siendo la orden del carpintero (y lleva el
pago), y `pedido_corralon` guarda la parte de cada corralón, con su propio estado:

```
pedido_corralon
------------------------------------------------------------
id                SERIAL PK
pedido_id         INTEGER FK (pedidos)
proveedor_id      INTEGER FK (usuarios)   un solo registro por pedido y corralón
estado            VARCHAR(20)  pendiente, confirmado, enviado, entregado, devuelto, cancelado
total             NUMERIC(12,2)
motivo_devolucion VARCHAR(300)
```

Cada fila de `pedido_items` apunta a su sub-orden con `pedido_corralon_id`. Para agregarlo a Supabase:
**SQL Editor** > pegar `migracion_pedido_corralon.sql` > **Run** (también reparte los pedidos que ya existen).

`POST /api/v1/pedidos` crea una sub-orden por corralón, y todas las respuestas de pedidos traen
`corralones: [{proveedor_id, proveedor_nombre, estado, total, motivo_devolucion, items}]`.
Con `?proveedor_id=` solo aparece la sub-orden de ese corralón.

### Estados de cada corralón y cancelación

No necesitan cambios en la base. Como todavía no hay login, el usuario que hace el cambio va en `usuario_id`.

- `PATCH /api/v1/pedidos/{id}/corralones/{proveedor_id}` con `{"usuario_id": 2, "estado": "confirmado"}`:
  el corralón avanza su parte `pendiente -> confirmado -> enviado -> entregado`. Para confirmar, el pedido tiene que
  estar `pagado`. Desde `entregado` puede pasar a `devuelto` con `"motivo"` obligatorio (no repone stock).
  403 si `usuario_id` no es ese corralón, 409 si el cambio no corresponde al estado actual.
- `POST /api/v1/pedidos/{id}/cancelar` con `{"usuario_id": 1}`: el cliente cancela su pedido mientras está
  `pendiente`. Devuelve el stock y pasa el pedido y todas sus partes a `cancelado`.

## Pagos

Endpoints (`app/api/v1/pagos/`), los dos reciben `{"pedido_id": 1}` y solo aceptan pedidos en `pendiente`
(404 si no existe, 409 si ya está pagado o cancelado):

- `POST /api/v1/pagos/preferencia`: crea el pago en Mercado Pago (Checkout Pro) con los items del pedido y devuelve
  el link `init_point`. Necesita `MP_ACCESS_TOKEN` en el `.env` (credenciales **de prueba**; nunca en el frontend).
  503 si falta el token, 502 si Mercado Pago devuelve un error. `MP_BACK_URL` es opcional y no puede ser `localhost`.
- `POST /api/v1/pagos/simular`: plan B sin Mercado Pago, pasa el pedido a `pagado`.
