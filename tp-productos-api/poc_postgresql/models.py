from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
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
    proveedor: Mapped["UsuarioDB | None"] = relationship()


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


class PedidoDB(Base):
    __tablename__ = "pedidos"
    __table_args__ = (
        CheckConstraint("estado IN ('pendiente', 'pagado', 'cancelado')", name="ck_pedidos_estado"),
        CheckConstraint("total >= 0", name="ck_pedidos_total_positivo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente", server_default="pendiente")
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    cliente: Mapped[UsuarioDB] = relationship()
    items: Mapped[list["PedidoItemDB"]] = relationship(back_populates="pedido", cascade="all, delete-orphan")
    corralones: Mapped[list["PedidoCorralonDB"]] = relationship(
        back_populates="pedido", cascade="all, delete-orphan", order_by="PedidoCorralonDB.id"
    )


class PedidoItemDB(Base):
    __tablename__ = "pedido_items"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_pedido_items_cantidad_positiva"),
        CheckConstraint("precio_unitario >= 0", name="ck_pedido_items_precio_positivo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    largo_cm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    pedido_corralon_id: Mapped[int | None] = mapped_column(
        ForeignKey("pedido_corralon.id", ondelete="CASCADE"), nullable=True
    )

    pedido: Mapped[PedidoDB] = relationship(back_populates="items")
    producto: Mapped[ProductoDB] = relationship()
    corralon: Mapped["PedidoCorralonDB | None"] = relationship(back_populates="items")

    
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


class PedidoCorralonDB(Base):
    """Parte de un pedido que le toca a un corralón (una fila por corralón del pedido)."""

    __tablename__ = "pedido_corralon"
    __table_args__ = (
        UniqueConstraint(
            "pedido_id", "proveedor_id", name="uq_pedido_corralon", postgresql_nulls_not_distinct=True
        ),
        CheckConstraint(
            "estado IN ('pendiente', 'confirmado', 'enviado', 'entregado', 'devuelto', 'cancelado')",
            name="ck_pedido_corralon_estado",
        ),
        CheckConstraint("total >= 0", name="ck_pedido_corralon_total_positivo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    proveedor_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente", server_default="pendiente")
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    motivo_devolucion: Mapped[str | None] = mapped_column(String(300), nullable=True)

    pedido: Mapped[PedidoDB] = relationship(back_populates="corralones")
    proveedor: Mapped[UsuarioDB | None] = relationship()
    items: Mapped[list[PedidoItemDB]] = relationship(back_populates="corralon")


class ProveedorInsumoDB(Base):
    """Proveedor al que un corralón le compra mercadería."""

    __tablename__ = "proveedores_insumo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    corralon_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())


class OrdenCompraDB(Base):
    __tablename__ = "ordenes_compra"
    __table_args__ = (
        CheckConstraint("estado IN ('pendiente', 'recibida')", name="ck_ordenes_compra_estado"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    corralon_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    proveedor_insumo_id: Mapped[int] = mapped_column(ForeignKey("proveedores_insumo.id"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente", server_default="pendiente")
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    recibida_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    proveedor: Mapped[ProveedorInsumoDB] = relationship()
    items: Mapped[list["OrdenCompraItemDB"]] = relationship(
        back_populates="orden", cascade="all, delete-orphan", order_by="OrdenCompraItemDB.id"
    )


class OrdenCompraItemDB(Base):
    __tablename__ = "orden_compra_items"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_orden_compra_items_cantidad_positiva"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    orden_compra_id: Mapped[int] = mapped_column(
        ForeignKey("ordenes_compra.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)

    orden: Mapped[OrdenCompraDB] = relationship(back_populates="items")
    producto: Mapped[ProductoDB] = relationship()
