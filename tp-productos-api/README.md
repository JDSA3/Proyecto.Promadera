# Proyecto ProMadera — API de Productos

API REST desarrollada con FastAPI para la gestión de productos y categorías, como parte del Trabajo Práctico de la materia Prácticas Profesionalizantes II.

## Integrantes del grupo

| Nombre | Usuario de GitHub |
|---|---|
| Ariel Antonio Reynaga | [arielreynaga2662-lab](https://github.com/arielreynaga2662-lab) |
| Sheila Sabrina Lamas Wayar | [SheiiWayar](https://github.com/SheiiWayar) |
| Daniela Luz Belen Camacho | [daniicamacho27](https://github.com/daniicamacho27) |
| Joaquin Jairo Arzadum | [JoakoARZ](https://github.com/JoakoARZ) |

## Estructura del proyecto

```
tp-productos-api/
├── app/
│   ├── main.py                    # crea app, include_router
│   ├── core/
│   │   └── db.py                  # listas: categorias, productos
│   ├── models/
│   │   ├── categoria.py           # @dataclass Categoria
│   │   └── producto.py            # @dataclass Producto
│   └── api/
│       └── v1/
│           └── productos/
│               ├── router.py      # endpoints /productos (APIRouter)
│               ├── schemas.py     # Pydantic Base/Create/Update/Response
│               └── repository.py  # acceso a datos + validaciones
├── docs/
│   └── capturas/                  # capturas de Swagger UI
├── requirements.txt
├── README.md
├── .gitignore                     # venv/, __pycache__/, *.pyc
└── venv/
```

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
fastapi dev app/main.py
```

La API queda en `http://127.0.0.1:8000` y la documentación interactiva en `http://127.0.0.1:8000/docs`.

## Arquitectura

### Arquitectura actual

La API está organizada en capas. Cada capa tiene una sola responsabilidad y solo habla con la que tiene debajo:

```
Cliente (Swagger UI / navegador)
        │  HTTP
        ▼
FastAPI  ─ router.py + schemas.py
        │
        ▼
Repository  ─ repository.py
        │
        ▼
Lista en memoria  ─ core/db.py
```

| Capa | Archivo | Qué hace |
|---|---|---|
| FastAPI | `router.py`, `schemas.py` | Recibe las peticiones HTTP, valida los datos con Pydantic y devuelve los códigos de estado (200, 201, 204, 400, 404, 422). No tiene lógica de filtrado. |
| Repository | `repository.py` | Es el único lugar que accede a los datos: lista y filtra productos por nombre y categoría, busca por id, crea, actualiza y elimina. |
| Datos | `core/db.py` | Listas de Python en memoria con las categorías y los productos. Los cambios se pierden al reiniciar el servidor. |

El router nunca accede directo a `db.productos`: siempre pasa por el repository. Así, si cambia la forma de guardar los datos, solo hay que tocar una capa.

### Arquitectura futura (PostgreSQL)

```
Cliente → FastAPI (router.py) → Repository (repository.py) → PostgreSQL
```

Está planificada pero todavía **no está implementada**. El único cambio será