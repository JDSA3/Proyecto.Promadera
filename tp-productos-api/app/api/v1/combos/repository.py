from sqlalchemy import select
from sqlalchemy.orm import selectinload

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import ComboDB, ComboItemDB, ProductoDB, UsuarioDB


class DatosInvalidos(Exception):
    pass


class NoEncontrado(Exception):
    pass


class SinPermiso(Exception):
    pass


def _item_to_dict(item: ComboItemDB):
    producto = item.producto
    precio = float(producto.precio)

    return {
        "producto_id": producto.id,
        "nombre": producto.nombre,
        "precio": precio,
        "cantidad": item.cantidad,
        "subtotal": round(precio * item.cantidad, 2),
        "stock": producto.stock,
        "disponible": producto.activo and producto.stock >= item.cantidad,
        "proveedor_id": producto.proveedor_id,
        "proveedor_nombre": producto.proveedor.nombre if producto.proveedor else None,
    }


def _to_dict(combo: ComboDB):
    items = [_item_to_dict(item) for item in combo.items]

    return {
        "id": combo.id,
        "titulo": combo.titulo,
        "descripcion": combo.descripcion,
        "imagen": combo.imagen,
        "oficial": combo.autor_id is None,
        "autor_id": combo.autor_id,
        "autor_nombre": combo.autor.nombre if combo.autor else "ProMadera",
        "creado_en": combo.creado_en,
        "total": round(sum(item["subtotal"] for item in items), 2),
        "disponible": all(item["disponible"] for item in items),
        "items": items,
    }


def _consulta():
    return (
        select(ComboDB)
        .options(
            selectinload(ComboDB.autor),
            selectinload(ComboDB.items).selectinload(ComboItemDB.producto).selectinload(ProductoDB.proveedor),
        )
        .where(ComboDB.activo.is_(True))
    )


def list_combos(autor_id: int | None = None, oficial: bool | None = None):
    consulta = _consulta().order_by(ComboDB.autor_id.is_(None).desc(), ComboDB.id.desc())

    if autor_id is not None:
        consulta = consulta.where(ComboDB.autor_id == autor_id)

    if oficial is True:
        consulta = consulta.where(ComboDB.autor_id.is_(None))
    elif oficial is False:
        consulta = consulta.where(ComboDB.autor_id.is_not(None))

    with SessionLocal() as session:
        return [_to_dict(c) for c in session.scalars(consulta)]


def get_by_id(combo_id: int):
    with SessionLocal() as session:
        combo = session.scalar(_consulta().where(ComboDB.id == combo_id))

        if combo is None:
            return None

        return _to_dict(combo)


def create(data):
    cantidades: dict[int, int] = {}
    for item in data.items:
        cantidades[item.producto_id] = cantidades.get(item.producto_id, 0) + item.cantidad

    with SessionLocal() as session, session.begin():
        autor = session.get(UsuarioDB, data.autor_id)

        if autor is None or not autor.activo or autor.rol != "cliente":
            raise DatosInvalidos(f"El usuario {data.autor_id} no es un carpintero")

        productos = session.scalars(select(ProductoDB).where(ProductoDB.id.in_(cantidades)))
        por_id = {producto.id: producto for producto in productos}

        combo = ComboDB(
            autor=autor,
            titulo=data.titulo.strip(),
            descripcion=data.descripcion.strip(),
            imagen=data.imagen,
        )
        for producto_id, cantidad in cantidades.items():
            producto = por_id.get(producto_id)

            if producto is None or not producto.activo:
                raise DatosInvalidos(f"El producto {producto_id} no existe")

            combo.items.append(ComboItemDB(producto=producto, cantidad=cantidad))

        session.add(combo)
        session.flush()
        session.refresh(combo)

        return _to_dict(combo)


def delete(combo_id: int, usuario_id: int):
    with SessionLocal() as session, session.begin():
        combo = session.scalar(_consulta().where(ComboDB.id == combo_id))

        if combo is None:
            raise NoEncontrado(f"Combo {combo_id} no encontrado")

        if combo.autor_id is None or combo.autor_id != usuario_id:
            raise SinPermiso("Solo el autor puede borrar su combo (los combos de ProMadera no se borran)")

        combo.activo = False
