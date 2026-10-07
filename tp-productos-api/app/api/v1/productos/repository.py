from sqlalchemy import select

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import CategoriaDB, ProductoDB


def _to_dict(producto: ProductoDB):
    categoria = producto.categoria

    return {
        "id": producto.id,
        "nombre": producto.nombre,
        "precio": float(producto.precio),
        "stock": producto.stock,
        "activo": producto.activo,
        "categoria": {
            "id": categoria.id,
            "nombre": categoria.nombre,
        } if categoria else None,
    }


def list_productos(query: str | None = None, categoria_id: int | None = None):
    consulta = (
        select(ProductoDB)
        .where(ProductoDB.activo.is_(True))
        .order_by(ProductoDB.id)
    )

    if query is not None:
        consulta = consulta.where(ProductoDB.nombre.ilike(f"%{query}%"))

    if categoria_id is not None:
        consulta = consulta.where(ProductoDB.categoria_id == categoria_id)

    with SessionLocal() as session:
        return [_to_dict(p) for p in session.scalars(consulta)]


def get_by_id(producto_id: int):
    with SessionLocal() as session:
        producto = session.get(ProductoDB, producto_id)

        if producto is None or not producto.activo:
            return None

        return _to_dict(producto)


def ensure_categoria(categoria_id: int):
    with SessionLocal() as session:
        categoria = session.get(CategoriaDB, categoria_id)

    if categoria is None:
        return False, f"La categoria {categoria_id} no existe"

    return True, None


def create(data):
    datos = data.model_dump(exclude_unset=True)

    with SessionLocal() as session:
        nuevo_producto = ProductoDB(
            nombre=datos["nombre"],
            precio=datos["precio"],
            stock=datos["stock"],
            categoria_id=datos["categoria_id"],
            activo=True,
        )
        session.add(nuevo_producto)
        session.commit()
        session.refresh(nuevo_producto)

        return _to_dict(nuevo_producto)


def update(producto_id: int, data):
    with SessionLocal() as session:
        producto = session.get(ProductoDB, producto_id)

        if producto is None or not producto.activo:
            return None

        cambios = data.model_dump(exclude_unset=True)
        cambios = {k: v for k, v in cambios.items() if v is not None}

        for campo, valor in cambios.items():
            setattr(producto, campo, valor)

        session.commit()
        session.refresh(producto)

        return _to_dict(producto)


def delete(producto_id: int):
    with SessionLocal() as session:
        producto = session.get(ProductoDB, producto_id)

        if producto is None or not producto.activo:
            return None

        producto.activo = False
        session.commit()
        return True


def list_categorias():
    with SessionLocal() as session:
        categorias = session.scalars(select(CategoriaDB).order_by(CategoriaDB.id))
        return [
            {"id": categoria.id, "nombre": categoria.nombre}
            for categoria in categorias
        ]
