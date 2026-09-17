from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ObraSocialReglaIn(BaseModel):
    obra_social: str = Field(min_length=1)
    plan_afiliado: str | None = None
    resultado: Literal["aprobado", "rechazado", "vencido"]
    motivo: str | None = None
    activo: bool = True


class ObraSocialReglaOut(BaseModel):
    id: int
    obra_social: str
    plan_afiliado: str | None = None
    resultado: str
    motivo: str | None = None
    activo: bool
    creado_en: datetime
    actualizado_en: datetime

    model_config = {"from_attributes": True}


class ValidarObraSocialIn(BaseModel):
    obra_social: str = Field(min_length=1)
    plan_afiliado: str | None = None


class ValidacionOSOut(BaseModel):
    resultado: str
    motivo: str | None = None
