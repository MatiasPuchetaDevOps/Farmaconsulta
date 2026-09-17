from datetime import date, datetime

from pydantic import BaseModel, Field


class LoteIn(BaseModel):
    producto_id: int
    numero_lote: str = Field(min_length=1)
    vencimiento: date
    cantidad: int = Field(ge=0)
    activo: bool = True


class LoteOut(BaseModel):
    id: int
    producto_id: int
    producto_nombre: str
    numero_lote: str
    vencimiento: date
    cantidad: int
    activo: bool
    dias_para_vencer: int
    creado_en: datetime

    model_config = {"from_attributes": True}


class LotesAlertaOut(BaseModel):
    vencidos: list[LoteOut]
    por_vencer: list[LoteOut]
