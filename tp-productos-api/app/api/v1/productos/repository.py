from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import (
    CategoriaDB,
    ProductoCompatibleDB,
    ProductoDB,
    UsuarioDB,
)


def _to_dict(producto: ProductoDB):
    categoria = producto.categoria

    return {
        "id": producto.id,
        "nombre": producto.nombre,
        "precio": float(producto.precio),
        "stock": producto.stock,
        "activo": producto.activo,
        "proveedor_id": producto.proveedor_id,
        "proveedor_nombre": producto.proveedor.nombre if producto.proveedor else None,
        "largo_cm": float(producto.largo_cm) if producto.largo_cm is not None else None,
        "ancho_cm": float(producto.ancho_cm) if producto.ancho_cm is not None else None,
        "espesor_mm": float(producto.espesor_mm) if producto.espesor_mm is not None else None,
        "categoria": {
            "id": categoria.id,
            "nombre": categoria.nombre,
        } if categoria else None,
    }


def list_productos(
    query: str | None = None,
    categoria_id: int | None = None,
    proveedor_id: int | None = None,
    limit: int | None = None,
    offset: int = 0,
):
    """Devuelve (productos, total). total cuenta todos los que cumplen los filtros, sin paginar."""
    consulta = select(ProductoDB).where(ProductoDB.activo.is_(True))

    if query is not None:
        consulta = consulta.where(ProductoDB.nombre.ilike(f"%{query}%"))

    if categoria_id is not None:
        consulta = consulta.where(ProductoDB.categoria_id == categoria_id)

    if proveedor_id is not None:
        consulta = consulta.where(ProductoDB.proveedor_id == proveedor_id)

    total_consulta = select(func.count()).select_from(consulta.subquery())

    consulta = (
        consulta
        .options(selectinload(ProductoDB.categoria), selectinload(ProductoDB.proveedor))
        .order_by(ProductoDB.id)
        .offset(offset)
    )
    if limit is not None:
        consulta = consulta.limit(limit)

    with SessionLocal() as session:
        total = session.scalar(total_consulta)
        return [_to_dict(p) for p in session.scalars(consulta)], total
    
def get_by_id(producto_id: int):
    with SessionLocal() as session:
        producto = session.get(ProductoDB, producto_id)

        if producto is None or not producto.activo:
            return None

        return _to_dict(producto)


def list_recomendados(producto_id: int, limite: int = 6):
    """Productos que combinan con el indicado (la pareja se busca en los dos sentidos).

    Primero van los que tienen stock; dentro de cada grupo, por id.
    """
    consulta = select(ProductoCompatibleDB).where(
        or_(
            ProductoCompatibleDB.producto_id == producto_id,
            ProductoCompatibleDB.compatible_id == producto_id,
        )
    )

    with SessionLocal() as session:
        recomendados = []
        for fila in session.scalars(consulta):
            otro_id = (
                fila.compatible_id
                if fila.producto_id == producto_id
                else fila.producto_id
            )
            otro = session.get(ProductoDB, otro_id)
            if otro is None or not otro.activo:
                continue
            datos = _to_dict(otro)
            datos["motivo"] = fila.motivo
            recomendados.append(datos)

    recomendados.sort(key=lambda p: (p["stock"] <= 0, p["id"]))
    return recomendados[:limite]


def ensure_categoria(categoria_id: int):
    with SessionLocal() as session:
        categoria = session.get(CategoriaDB, categoria_id)

    if categoria is None:
        return False, f"La categoria {categoria_id} no existe"

    return True, None


def ensure_proveedor(proveedor_id: int):
    with SessionLocal() as session:
        usuario = session.get(UsuarioDB, proveedor_id)

        if usuario is None or not usuario.activo:
            return False, f"El proveedor {proveedor_id} no existe"

        if usuario.rol != "proveedor":
            return False, f"El usuario {proveedor_id} no es un proveedor"

    return True, None


def create(data):
    datos = data.model_dump(exclude_unset=True)

    with SessionLocal() as session:
        nuevo_producto = ProductoDB(
            nombre=datos["nombre"],
            precio=datos["precio"],
            stock=datos["stock"],
            categoria_id=datos["categoria_id"],
            proveedor_id=datos.get("proveedor_id"),
            activo=True,
            largo_cm=datos.get("largo_cm"),
            ancho_cm=datos.get("ancho_cm"),
            espesor_mm=datos.get("espesor_mm"),
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
