## Main: montar todo

Se instanció `FastAPI` con `title` y `description`, se agregó un `GET /` con mensaje de bienvenida, y se montó el router de productos con `app.include_router`. El servidor se levantó con `fastapi dev app/main.py` (alternativamente `uvicorn app.main:app --reload`).

**Captura de Swagger UI** mostrando los endpoints agrupados bajo la tag "Productos":

![Swagger UI - Productos](docs/capturas/07-swagger-ui.png)

## Pruebas en Swagger UI

### a) Crear producto válido → 201

![Crear producto válido](docs/capturas/08a-crear-valido-201.png)

### b) Crear producto con categoría inexistente → 400

![Categoría inexistente](docs/capturas/08b-categoria-inexistente-400.png)

### c) Crear producto con precio negativo → 422

![Precio inválido](docs/capturas/08c-precio-invalido-422.png)

### d) Listar productos filtrando por nombre y categoría

![Listar con filtro](docs/capturas/08d-listar-filtro.png)

### e) Actualizar solo el precio con PUT (los demás campos no cambian)

![Actualizar precio](docs/capturas/08e-actualizar-precio.png)

### f) Eliminar producto (204) y repetir el mismo DELETE (404)

![Eliminar - 204](docs/capturas/08f-eliminar-204.png)
![Eliminar repetido - 404](docs/capturas/08f-eliminar-404.png)