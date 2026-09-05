from datetime import datetime

from pydantic import BaseModel, Field


class PlanIn(BaseModel):
    obra_social: str
    descuento_pct: float = Field(ge=0, le=100)


class PlanOut(BaseModel):
    id: int
    obra_social: str
    descuento_os: float
    actualizado_en: datetime

    model_config = {"from_attributes": True}
