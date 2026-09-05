from datetime import date

from pydantic import BaseModel, Field


class ConsultaIn(BaseModel):
    cliente_nombre: str = Field(min_length=1)
    cliente_tel: str = ""
    obra_social: str
    plan_afiliado: str = "Plan General"
    producto_id: int
    metodo_pago: str
    fecha: date


class ConsultaOut(BaseModel):
    id_consulta: int
    producto_nombre: str
    obra_social: str
    metodo_pago: str
    precio_final: int
