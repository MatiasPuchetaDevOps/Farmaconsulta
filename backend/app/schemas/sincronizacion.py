from datetime import datetime

from pydantic import BaseModel, Field


class PropuestaPrecio(BaseModel):
    producto_id: int
    producto_nombre: str
    precio_anterior: int
    variacion_pct: float
    precio_nuevo: int


class SincronizacionPreviewIn(BaseModel):
    pct_min: float = -5.0
    pct_max: float = 10.0
    categoria: str | None = None


class SincronizacionPreviewOut(BaseModel):
    id: int
    filtro_categoria: str | None = None
    variacion_pct_min: float
    variacion_pct_max: float
    propuesta: list[PropuestaPrecio]
    aplicada: bool
    creado_en: datetime

    model_config = {"from_attributes": True}


class ItemAplicado(BaseModel):
    producto_id: int
    producto_nombre: str
    precio_anterior: int
    precio_nuevo: int
    omitido: bool
    motivo_omision: str | None = None


class SincronizacionResultado(BaseModel):
    preview_id: int
    items: list[ItemAplicado]


class SincronizacionHistorialOut(BaseModel):
    id: int
    ejecutada_por_id: int
    cantidad_productos: int
    variacion_pct_min: float
    variacion_pct_max: float
    aplicada_en: datetime

    model_config = {"from_attributes": True}
