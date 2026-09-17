from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CajaAbrirIn(BaseModel):
    monto_inicial: int = Field(ge=0)
    observaciones: str | None = None


class CajaMovimientoIn(BaseModel):
    tipo: Literal["ingreso", "egreso"]
    monto: int = Field(gt=0)
    concepto: str = Field(min_length=1)


class CajaMovimientoOut(BaseModel):
    id: int
    tipo: str
    origen: str
    monto: int
    concepto: str
    pedido_id: int | None = None
    usuario_id: int
    usuario_username: str
    creado_en: datetime

    model_config = {"from_attributes": True}


class CajaCerrarIn(BaseModel):
    monto_declarado: int = Field(ge=0)
    observaciones: str | None = None


class CajaSesionOut(BaseModel):
    id: int
    estado: str
    monto_inicial: int
    monto_declarado: int | None = None
    monto_calculado: int | None = None
    diferencia: int | None = None
    abierta_por: str
    cerrada_por: str | None = None
    observaciones_apertura: str | None = None
    observaciones_cierre: str | None = None
    abierta_en: datetime
    cerrada_en: datetime | None = None
    total_ingresos: int
    total_egresos: int
    saldo_actual: int
    movimientos: list[CajaMovimientoOut]

    model_config = {"from_attributes": True}
