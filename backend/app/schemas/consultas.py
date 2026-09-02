from datetime import date

from pydantic import BaseModel, Field


class ConsultaIn(BaseModel):
    cliente_nombre: str = Field(min_length=1)
    cliente_tel: str = ""
    obra_social: str
    plan_afiliado: str = "Plan General"
    producto_nombre: str = Field(min_length=1)
    categoria: str
    precio_lista: int = Field(gt=0)
    stock_disponible: int = Field(ge=0)
    metodo_pago: str
    requiere_receta: bool = False
    fecha: date


class ConsultaOut(BaseModel):
    id_consulta: int
    producto_nombre: str
    obra_social: str
    metodo_pago: str
    precio_final: int
