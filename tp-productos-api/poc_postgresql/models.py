from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    String,
    true,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class CategoriaDB(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    productos: Mapped[list["ProductoDB"]] = relationship(back_populates="categoria")


class ProductoDB(Base):
    __tablename__ = "productos"
    __table_args__ = (
        CheckConstraint("precio >= 0", name="ck_productos_precio_positivo"),
        CheckConstraint("stock >= 0", name="ck_productos_stock_positivo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    precio: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias.id"), nullable=False)
    proveedor_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    largo_cm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    ancho_cm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    espesor_mm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    
    categoria: Mapped[CategoriaDB] = relationship(back_populates="productos")


class UsuarioDB(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint("rol IN ('cliente', 'proveedor')", name="ck_usuarios_rol"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())


class ProductoCompatibleDB(Base):
    """Pareja de productos que combinan entre si (relacion simetrica: una fila por pareja)."""

    __tablename__ = "producto_compatible"
    __table_args__ = (
        CheckConstraint("producto_id <> compatible_id", name="ck_compatible_distintos"),
    )

    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True
    )
    compatible_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True
    )
    motivo: Mapped[str] = mapped_column(String(150), nullable=False, default="", server_default="")
