from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class RecetaIn(BaseModel):
    cliente_nombre: str = Field(min_length=1)
    cliente_tel: str = ""
    producto_id: int
    medico_nombre: str | None = None
    medico_matricula: str | None = None
    fecha_emision: date


class RecetaValidarIn(BaseModel):
    estado: Literal["validada", "rechazada"]
    observaciones: str | None = None


class RecetaOut(BaseModel):
    id: int
    cliente_ref_id: int
    cliente_nombre: str
    cliente_tel: str | None = None
    producto_id: int
    producto_nombre: str
    medico_nombre: str | None = None
    medico_matricula: str | None = None
    fecha_emision: date
    estado: str
    observaciones: str | None = None
    validada_por_id: int | None = None
    validada_en: datetime | None = None
    creado_por_id: int
    pedido_item_id: int | None = None
    creado_en: datetime

    model_config = {"from_attributes": True}
