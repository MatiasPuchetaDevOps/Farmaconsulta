from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_completo: Mapped[str | None] = mapped_column(String(150))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    es_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = (
        CheckConstraint("precio_lista >= 0", name="ck_producto_precio_lista"),
        CheckConstraint("stock_disponible >= 0", name="ck_producto_stock"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    producto_nombre: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    precio_lista: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_disponible: Mapped[int] = mapped_column(Integer, nullable=False)
    droga_generica: Mapped[str | None] = mapped_column(String(200))
    requiere_receta: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    codigo_barras: Mapped[str | None] = mapped_column(String(64))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class Lote(Base):
    __tablename__ = "lotes"
    __table_args__ = (
        CheckConstraint("cantidad >= 0", name="ck_lote_cantidad"),
        Index("ix_lotes_producto_id", "producto_id"),
        Index("ix_lotes_vencimiento", "vencimiento"),
        Index("ix_lotes_producto_numero_lote", "producto_id", "numero_lote", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    numero_lote: Mapped[str] = mapped_column(String(60), nullable=False)
    vencimiento: Mapped[date] = mapped_column(Date, nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class PlanDescuento(Base):
    __tablename__ = "planes_descuento"
    __table_args__ = (
        CheckConstraint("descuento_os >= 0 AND descuento_os <= 1", name="ck_plan_descuento_rango"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    obra_social: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    descuento_os: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class BancoPromocion(Base):
    __tablename__ = "banco_promociones"
    __table_args__ = (
        CheckConstraint("descuento_banco >= 0 AND descuento_banco <= 1", name="ck_banco_promocion_rango"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    banco: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    descuento_banco: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class Consulta(Base):
    __tablename__ = "consultas"
    __table_args__ = (
        CheckConstraint("precio_lista >= 0", name="ck_consulta_precio_lista"),
        CheckConstraint("precio_final >= 0", name="ck_consulta_precio_final"),
        CheckConstraint("stock_disponible >= 0", name="ck_consulta_stock"),
        CheckConstraint("origen IN ('mostrador', 'publico')", name="ck_consulta_origen"),
        Index("ix_consultas_producto_fecha", "producto_nombre", "fecha"),
        Index("ix_consultas_origen", "origen"),
    )

    id_consulta: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    cliente_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    cliente_ref_id: Mapped[int | None] = mapped_column(ForeignKey("clientes.id"))
    cliente_nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    cliente_tel: Mapped[str | None] = mapped_column(String(30))
    obra_social: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    plan_afiliado: Mapped[str | None] = mapped_column(String(100))
    producto_id: Mapped[int | None] = mapped_column(ForeignKey("productos.id"))
    producto_nombre: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    droga_generica: Mapped[str | None] = mapped_column(String(200))
    precio_lista: Mapped[int] = mapped_column(Integer, nullable=False)
    descuento_os: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    metodo_pago: Mapped[str] = mapped_column(String(60), nullable=False)
    descuento_banco: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    banco_promocion: Mapped[str | None] = mapped_column(String(100))
    stock_disponible: Mapped[int] = mapped_column(Integer, nullable=False)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    requiere_receta: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    precio_final: Mapped[int] = mapped_column(Integer, nullable=False)
    origen: Mapped[str] = mapped_column(String(20), nullable=False, server_default="mostrador")
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class Pedido(Base):
    __tablename__ = "pedidos"
    __table_args__ = (
        CheckConstraint("estado IN ('confirmado', 'cancelado')", name="ck_pedido_estado"),
        CheckConstraint("total >= 0", name="ck_pedido_total"),
        CheckConstraint("cae_estado IN ('pendiente', 'aprobado', 'rechazado')", name="ck_pedido_cae_estado"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_ref_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    cliente_nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    cliente_tel: Mapped[str | None] = mapped_column(String(30))
    obra_social: Mapped[str] = mapped_column(String(150), nullable=False)
    plan_afiliado: Mapped[str | None] = mapped_column(String(100))
    metodo_pago: Mapped[str] = mapped_column(String(60), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="confirmado")
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    caja_sesion_id: Mapped[int | None] = mapped_column(ForeignKey("caja_sesiones.id"))
    comprobante_numero: Mapped[str | None] = mapped_column(String(20), unique=True)
    cae: Mapped[str | None] = mapped_column(String(20))
    cae_vencimiento: Mapped[date | None] = mapped_column(Date)
    cae_estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    cae_motivo_rechazo: Mapped[str | None] = mapped_column(String(200))
    cae_intentos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    validacion_os_resultado: Mapped[str | None] = mapped_column(String(20))
    validacion_os_motivo: Mapped[str | None] = mapped_column(String(200))
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())
    cancelado_en: Mapped[datetime | None] = mapped_column(default=None)


class PedidoItem(Base):
    __tablename__ = "pedido_items"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_pedido_item_cantidad"),
        CheckConstraint("precio_lista >= 0", name="ck_pedido_item_precio_lista"),
        CheckConstraint("precio_final_unitario >= 0", name="ck_pedido_item_precio_final"),
        CheckConstraint("subtotal >= 0", name="ck_pedido_item_subtotal"),
        Index("ix_pedido_items_pedido_id", "pedido_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    producto_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_lista: Mapped[int] = mapped_column(Integer, nullable=False)
    descuento_os: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    descuento_banco: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    precio_final_unitario: Mapped[int] = mapped_column(Integer, nullable=False)
    subtotal: Mapped[int] = mapped_column(Integer, nullable=False)
    receta_id: Mapped[int | None] = mapped_column(ForeignKey("recetas.id"))


class CajaSesion(Base):
    __tablename__ = "caja_sesiones"
    __table_args__ = (
        CheckConstraint("estado IN ('abierta', 'cerrada')", name="ck_caja_sesion_estado"),
        CheckConstraint("monto_inicial >= 0", name="ck_caja_sesion_monto_inicial"),
        Index(
            "ix_caja_sesiones_una_abierta",
            "estado",
            unique=True,
            postgresql_where=text("estado = 'abierta'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    estado: Mapped[str] = mapped_column(String(10), nullable=False, default="abierta")
    monto_inicial: Mapped[int] = mapped_column(Integer, nullable=False)
    monto_declarado: Mapped[int | None] = mapped_column(Integer)
    monto_calculado: Mapped[int | None] = mapped_column(Integer)
    diferencia: Mapped[int | None] = mapped_column(Integer)
    abierta_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    cerrada_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    observaciones_apertura: Mapped[str | None] = mapped_column(String(300))
    observaciones_cierre: Mapped[str | None] = mapped_column(String(300))
    abierta_en: Mapped[datetime] = mapped_column(server_default=func.now())
    cerrada_en: Mapped[datetime | None] = mapped_column(default=None)


class CajaMovimiento(Base):
    __tablename__ = "caja_movimientos"
    __table_args__ = (
        CheckConstraint("tipo IN ('ingreso', 'egreso')", name="ck_caja_movimiento_tipo"),
        CheckConstraint("origen IN ('manual', 'venta', 'venta_cancelada')", name="ck_caja_movimiento_origen"),
        CheckConstraint("monto > 0", name="ck_caja_movimiento_monto"),
        Index("ix_caja_movimientos_caja_sesion_id", "caja_sesion_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    caja_sesion_id: Mapped[int] = mapped_column(ForeignKey("caja_sesiones.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    origen: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    monto: Mapped[int] = mapped_column(Integer, nullable=False)
    concepto: Mapped[str] = mapped_column(String(200), nullable=False)
    pedido_id: Mapped[int | None] = mapped_column(ForeignKey("pedidos.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class Receta(Base):
    __tablename__ = "recetas"
    __table_args__ = (
        CheckConstraint("estado IN ('pendiente', 'validada', 'rechazada')", name="ck_receta_estado"),
        Index("ix_recetas_estado", "estado"),
        Index("ix_recetas_cliente_ref_id", "cliente_ref_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_ref_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    cliente_nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    cliente_tel: Mapped[str | None] = mapped_column(String(30))
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    producto_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    medico_nombre: Mapped[str | None] = mapped_column(String(150))
    medico_matricula: Mapped[str | None] = mapped_column(String(60))
    fecha_emision: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    observaciones: Mapped[str | None] = mapped_column(String(300))
    validada_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    validada_en: Mapped[datetime | None] = mapped_column(default=None)
    creado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    pedido_item_id: Mapped[int | None] = mapped_column(ForeignKey("pedido_items.id"), unique=True)
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class ObraSocialRegla(Base):
    __tablename__ = "obras_sociales_reglas"
    __table_args__ = (
        CheckConstraint("resultado IN ('aprobado', 'rechazado', 'vencido')", name="ck_obra_social_regla_resultado"),
        Index("ix_obras_sociales_reglas_obra_social", "obra_social"),
        Index("ix_obras_sociales_reglas_obra_social_plan", "obra_social", "plan_afiliado", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    obra_social: Mapped[str] = mapped_column(String(150), nullable=False)
    plan_afiliado: Mapped[str | None] = mapped_column(String(100))
    resultado: Mapped[str] = mapped_column(String(20), nullable=False)
    motivo: Mapped[str | None] = mapped_column(String(200))
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class AjustePrecioPreview(Base):
    __tablename__ = "ajuste_precios_preview"

    id: Mapped[int] = mapped_column(primary_key=True)
    creado_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    filtro_categoria: Mapped[str | None] = mapped_column(String(100))
    variacion_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    propuesta: Mapped[list] = mapped_column(JSON, nullable=False)
    aplicada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())


class AjustePrecioHistorial(Base):
    __tablename__ = "ajuste_precios_historial"

    id: Mapped[int] = mapped_column(primary_key=True)
    ejecutada_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    cantidad_productos: Mapped[int] = mapped_column(Integer, nullable=False)
    variacion_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    aplicada_en: Mapped[datetime] = mapped_column(server_default=func.now())
