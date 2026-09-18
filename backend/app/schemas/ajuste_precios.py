from datetime import datetime

from pydantic import BaseModel, Field


class PropuestaPrecio(BaseModel):
    producto_id: int
    producto_nombre: str
    precio_anterior: int
    variacion_pct: float
    precio_nuevo: int


class AjustePrecioIn(BaseModel):
    pct: float = Field(description="Porcentaje de ajuste a aplicar (negativo = baja de precio).")
    categoria: str | None = None


class AjustePrecioPreviewOut(BaseModel):
    id: int
    filtro_categoria: str | None = None
    variacion_pct: float
    propuesta: list[PropuestaPrecio]
    aplicada: bool
    creado_en: datetime

    model_config = {"from_attributes": True}


class ItemAjustado(BaseModel):
    producto_id: int
    producto_nombre: str
    precio_anterior: int
    precio_nuevo: int
    omitido: bool
    motivo_omision: str | None = None


class AjustePrecioResultado(BaseModel):
    preview_id: int
    items: list[ItemAjustado]


class AjustePrecioHistorialOut(BaseModel):
    id: int
    ejecutada_por_id: int
    cantidad_productos: int
    variacion_pct: float
    aplicada_en: datetime

    model_config = {"from_attributes": True}
