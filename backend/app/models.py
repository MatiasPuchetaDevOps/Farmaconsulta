from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, Index, Integer, Numeric, String
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


class Consulta(Base):
    __tablename__ = "consultas"
    __table_args__ = (
        CheckConstraint("precio_lista >= 0", name="ck_consulta_precio_lista"),
        CheckConstraint("precio_final >= 0", name="ck_consulta_precio_final"),
        CheckConstraint("stock_disponible >= 0", name="ck_consulta_stock"),
        Index("ix_consultas_producto_fecha", "producto_nombre", "fecha"),
    )

    id_consulta: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    cliente_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cliente_nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    cliente_tel: Mapped[str | None] = mapped_column(String(30))
    obra_social: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    plan_afiliado: Mapped[str | None] = mapped_column(String(100))
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
    creado_en: Mapped[datetime] = mapped_column(server_default=func.now())
