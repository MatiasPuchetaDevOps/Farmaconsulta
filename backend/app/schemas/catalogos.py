from pydantic import BaseModel, Field


class ProductoOut(BaseModel):
    id: int
    producto_nombre: str
    categoria: str
    precio_lista: int
    stock_disponible: int
    droga_generica: str | None = None
    requiere_receta: bool = False
    activo: bool = True

    model_config = {"from_attributes": True}


class ProductoIn(BaseModel):
    producto_nombre: str = Field(min_length=1)
    categoria: str = Field(min_length=1)
    precio_lista: int = Field(ge=0)
    stock_disponible: int = Field(ge=0)
    droga_generica: str | None = None
    requiere_receta: bool = False
    activo: bool = True
