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
| `migracion_compras.sql` | Agrega `proveedores_insumo`, `ordenes_compra` y `orden_compra_items` (las compras de cada corralón). |
| `migracion_corte_medida.sql` | Agrega `pedido_items.largo_cm` (el largo del corte cuando se pide a medida). |

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
  estar `pagado`. 403 si `usuario_id` no es ese corralón, 409 si el cambio no corresponde al estado actual.
- **Devolución ("Reportar problema")**: es el mismo `PATCH`, con `{"usuario_id": <carpintero>, "estado": "devuelto",
  "motivo": "Llegó rota"}`. Lo hace el carpintero dueño del pedido (el corralón también puede), solo si esa parte está
  `entregado`. El motivo es obligatorio (400 si falta) y no repone stock. Este es el camino que usa el frontend.
- `POST /api/v1/pedidos/{id}/cancelar` con `{"usuario_id": 1}`: el cliente cancela su pedido mientras está
  `pendiente`. Devuelve el stock y pasa el pedido y todas sus partes a `cancelado`.

## Compras del corralón

Cada corralón tiene su lista de proveedores de insumos y les hace órdenes de compra para reponer stock.
Para agregarlo a Supabase: **SQL Editor** > pegar `migracion_compras.sql` > **Run**.

- `GET /api/v1/proveedores-insumo?corralon_id=2` y `POST /api/v1/proveedores-insumo`
  con `{"corralon_id": 2, "nombre": "Maderera Sur", "telefono": "11 5555-5555"}`.
- `POST /api/v1/ordenes-compra` con `{"corralon_id": 2, "proveedor_insumo_id": 1, "items": [{"producto_id": 1, "cantidad": 10}]}`:
  queda `pendiente` y el stock todavía no cambia. Los productos tienen que ser de ese corralón.
- `GET /api/v1/ordenes-compra?corralon_id=2&estado=pendiente`.
- `PATCH /api/v1/ordenes-compra/{id}/recibir` con `{"usuario_id": 2}`: pasa a `recibida` y suma las cantidades
  al stock. 403 si no es de ese corralón, 409 si ya estaba recibida.
- `PUT /api/v1/proveedores-insumo/{id}` con `{"usuario_id": 2, "nombre": "...", "telefono": "..."}` edita, y
  `DELETE /api/v1/proveedores-insumo/{id}?usuario_id=2` lo da de baja (baja lógica; las órdenes viejas quedan).

## Corte a medida

- La devolución se hace con el `PATCH` de arriba. (`POST /api/v1/pedidos/{id}/corralones/{proveedor_id}/devolucion`
  quedó por compatibilidad y hace lo mismo, pero no hace falta usarlo.)
- Corte a medida: en `POST /api/v1/pedidos` cada item acepta `largo_cm` (opcional). Precio unitario =
  `precio * largo_cm / largo_cm del producto`, y el stock baja `ceil(cantidad / floor(largo_pieza / corte))` piezas.
  Ej.: listón de 300 cm, 5 cortes de 70 cm -> salen 4 por pieza -> se descuentan 2 piezas. Sin `largo_cm`, como siempre.
  Para Supabase: **SQL Editor** > pegar `migracion_corte_medida.sql` > **Run**.


## Pagos

Endpoints (`app/api/v1/pagos/`), los dos reciben `{"pedido_id": 1}` y solo aceptan pedidos en `pendiente`
(404 si no existe, 409 si ya está pagado o cancelado):

- `POST /api/v1/pagos/preferencia`: crea el pago en Mercado Pago (Checkout Pro) con los items del pedido y devuelve
  el link `init_point`. Necesita `MP_ACCESS_TOKEN` en el `.env` (credenciales **de prueba**; nunca en el frontend).
  503 si falta el token, 502 si Mercado Pago devuelve un error. `MP_BACK_URL` es opcional y no puede ser `localhost`.
- `POST /api/v1/pagos/simular`: plan B sin Mercado Pago, pasa el pedido a `pagado`.
- `POST /api/v1/pagos/webhook`: la llama Mercado Pago cuando cambia un pago. El backend vuelve a consultar ese pago en
  Mercado Pago con el token y, si está `approved` y el monto alcanza, pasa el pedido (`external_reference`) a `pagado`.
  Necesita la URL pública del backend en `MP_WEBHOOK_URL` (por ejemplo
  `https://promadera-api.onrender.com/api/v1/pagos/webhook`). Con localhost no funciona.

## Panel del corralón

- `GET /api/v1/corralones/{id}/resumen`: para la pantalla de inicio del corralón. Devuelve `ventas_mes` (suma de su
  parte en pedidos pagados de este mes, sin cancelados ni devueltos), `pedidos_mes`, `pedidos_pendientes` (pagados que
  todavía están `pendiente`, `confirmado` o `enviado`), `pedidos_por_estado`, `mas_vendidos` (top 5 del mes) y
  `stock_bajo` (productos activos con stock <= 10). Se puede cambiar con `?stock_minimo=5&mas_vendidos=10`.
  404 si el id no es un corralón. No necesita cambios en la base.

## Deploy (URL pública)

Backend en **Render** (Web Service gratis):

- Root Directory: `tp-productos-api`
- Build Command: `pip install -r requirements.txt -r requirements-postgresql.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment: `PYTHON_VERSION=3.13` (con la 3.10 no se instala `requirements.txt`), `DATABASE_URL`, `MP_ACCESS_TOKEN`, `MP_BACK_URL` (URL del frontend) y `MP_WEBHOOK_URL`
  (URL del backend + `/api/v1/pagos/webhook`). Los mismos valores del `.env`, que nunca se sube.

Frontend en **Render** (Static Site gratis): Root Directory `frontend`, Build Command `npm install && npm run build`,
Publish Directory `dist`, y la variable `VITE_API_URL` con la URL del backend + `/api/v1`. Sin esa variable, el
frontend sigue usando `http://127.0.0.1:8000/api/v1`.

Como el repo es público, los dos se crean con **Public Git Repository** y la URL del repo. Así no hace falta instalar
nada en la cuenta de GitHub del dueño. Para que tome un push nuevo hay que tocar **Manual Deploy**.

En el plan gratis, Render apaga el backend después de 15 minutos sin uso y la primera llamada tarda unos 50 segundos.
