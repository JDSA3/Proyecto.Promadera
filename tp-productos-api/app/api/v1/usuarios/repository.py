from sqlalchemy import select

from poc_postgresql.database import SessionLocal
from poc_postgresql.models import UsuarioDB

from .seguridad import hashear_password, verificar_password


def _to_dict(usuario: UsuarioDB) -> dict:
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol,
    }


def _buscar_por_email(session, email: str):
    return session.scalar(select(UsuarioDB).where(UsuarioDB.email == email.lower()))


def registrar(data):
    with SessionLocal() as session:
        if _buscar_por_email(session, data.email) is not None:
            return None

        usuario = UsuarioDB(
            nombre=data.nombre.strip(),
            email=data.email.lower(),
            password_hash=hashear_password(data.password),
            rol=data.rol,
        )
        session.add(usuario)
        session.commit()
        session.refresh(usuario)

        return _to_dict(usuario)


def autenticar(email: str, password: str):
    with SessionLocal() as session:
        usuario = _buscar_por_email(session, email)

        if usuario is None or not usuario.activo:
            return None

        if not verificar_password(password, usuario.password_hash):
            return None

        return _to_dict(usuario)
