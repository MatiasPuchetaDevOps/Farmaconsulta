from datetime import datetime

from pydantic import BaseModel, Field


class BancoPromocionIn(BaseModel):
    banco: str
    descuento_pct: float = Field(ge=0, le=100)


class BancoPromocionOut(BaseModel):
    id: int
    banco: str
    descuento_banco: float
    actualizado_en: datetime

    model_config = {"from_attributes": True}
