from sqlalchemy import func, select, text

from app.core import db
from poc_postgresql.database import SessionLocal, engine
from poc_postgresql.models import Base, CategoriaDB, ProductoDB


def cargar_datos_iniciales(session):
    if session.scalar(select(func.count()).select_from(CategoriaDB)):
        print("Las tablas ya tienen datos, no se cargan de nuevo.")
        return

    session.add_all(CategoriaDB(id=c.id, nombre=c.nombre) for c in db.categorias)
    session.flush()
    session.add_all(
        ProductoDB(
            id=p.id,
            nombre=p.nombre.strip(),
            precio=p.precio,
            stock=p.stock,
            activo=p.activo,
            categoria_id=p.categoria_id,
        )
        for p in db.productos
    )
    session.flush()

    for tabla in ("categorias", "productos"):
        session.execute(text(
            f"SELECT setval(pg_get_serial_sequence('{tabla}', 'id'), "
            f"(SELECT MAX(id) FROM {tabla}))"
        ))

    print(f"Cargadas {len(db.categorias)} categorias y {len(db.productos)} productos.")


def main():
    Base.metadata.create_all(engine)
    print("Tablas creadas: categorias, productos")

    with SessionLocal() as session, session.begin():
        cargar_datos_iniciales(session)

    with SessionLocal() as session:
        for producto in session.scalars(select(ProductoDB).order_by(ProductoDB.id)):
            print(f"  {producto.id}. {producto.nombre} - {producto.categoria.nombre} - ${producto.precio}")


if __name__ == "__main__":
    main()
