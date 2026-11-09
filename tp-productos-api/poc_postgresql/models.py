from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
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
        CheckConstraint("rol IN ('cliente', 'proveedor', 'admin')", name="ck_usuarios_rol"),
        CheckConstraint("telefono IS NULL OR telefono ~ '^[0-9]{8,15}$'", name="ck_usuarios_telefono"),
        CheckConstraint("estado IN ('pendiente', 'aprobado', 'rechazado')", name="ck_usuarios_estado"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="aprobado", server_default="aprobado"
    )

    # Perfil comercial del corralón (solo lectura). Se usa para leer el teléfono de WhatsApp.
    perfil_corralon: Mapped["CorralonPerfilDB | None"] = relationship(
        "CorralonPerfilDB", uselist=False, viewonly=True
    )


class PedidoDB(Base):
    __tablename__ = "pedidos"
    __table_args__ = (
        CheckConstraint("estado IN ('pendiente', 'pagado', 'cancelado')", name="ck_pedidos_estado"),
        CheckConstraint("total >= 0", name="ck_pedidos_total_positivo"),
        CheckConstraint("entrega IN ('retiro', 'envio')", name="ck_pedidos_entrega"),
        CheckConstraint(
            "metodo_pago IN ('efectivo', 'transferencia', 'tarjeta_credito', 'otros')",
            name="ck_pedidos_metodo_pago",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente", server_default="pendiente")
    entrega: Mapped[str] = mapped_column(String(10), nullable=False, default="retiro", server_default="retiro")
    metodo_pago: Mapped[str] = mapped_column(
        String(20), nullable=False, default="otros", server_default="otros"
    )
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


class ComboDB(Base):
    """Combo de productos de la comunidad (autor_id vacío = combo de ProMadera)."""

    __tablename__ = "combos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    autor_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    titulo: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(500), nullable=False, default="", server_default="")
    imagen: Mapped[str | None] = mapped_column(String, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=true())
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    autor: Mapped[UsuarioDB | None] = relationship()
    items: Mapped[list["ComboItemDB"]] = relationship(
        back_populates="combo", cascade="all, delete-orphan", order_by="ComboItemDB.id"
    )


class ComboItemDB(Base):
    __tablename__ = "combo_items"
    __table_args__ = (
        UniqueConstraint("combo_id", "producto_id", name="uq_combo_item"),
        CheckConstraint("cantidad > 0", name="ck_combo_items_cantidad_positiva"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    combo_id: Mapped[int] = mapped_column(ForeignKey("combos.id", ondelete="CASCADE"), nullable=False)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)

    combo: Mapped[ComboDB] = relationship(back_populates="items")
    producto: Mapped[ProductoDB] = relationship()


class SolicitudCorralonDB(Base):
    """Pedido de un corralón para ser habilitado, con su comprobante de monotributo/ARCA."""

    __tablename__ = "solicitudes_corralon"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente', 'aprobada', 'rechazada')",
            name="ck_solicitudes_corralon_estado",
        ),
        CheckConstraint(
            "tipo_comprobante IN ('monotributo', 'otro_arca')",
            name="ck_solicitudes_corralon_tipo",
        ),
        CheckConstraint("cuit ~ '^[0-9]{11}$'", name="ck_solicitudes_corralon_cuit"),
        CheckConstraint("telefono ~ '^[0-9]{8,15}$'", name="ck_solicitudes_corralon_telefono"),
        Index(
            "uq_solicitud_pendiente_por_usuario",
            "usuario_id",
            unique=True,
            postgresql_where=text("estado = 'pendiente'"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    nombre_comercial: Mapped[str] = mapped_column(String(100), nullable=False)
    cuit: Mapped[str] = mapped_column(String(11), nullable=False)
    telefono: Mapped[str] = mapped_column(String(20), nullable=False)
    direccion: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo_comprobante: Mapped[str] = mapped_column(String(20), nullable=False)
    archivo_nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    archivo_tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    archivo: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente", server_default="pendiente")
    motivo_rechazo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    resuelto_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resuelto_por: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)


class CorralonPerfilDB(Base):
    """Datos comerciales del corralón y su logo (para el comprobante)."""

    __tablename__ = "corralon_perfil"

    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    nombre_comercial: Mapped[str] = mapped_column(String(100), nullable=False)
    cuit: Mapped[str | None] = mapped_column(String(11), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(200), nullable=True)
    logo: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    logo_tipo: Mapped[str | None] = mapped_column(String(100), nullable=True)
