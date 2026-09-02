from pydantic import BaseModel


class CalcularRequest(BaseModel):
    producto_nombre: str
    obra_social: str
    metodo_pago: str


class DesgloseResponse(BaseModel):
    producto_nombre: str
    precio_lista: int
    obra_social: str
    descuento_os: float
    metodo_pago: str
    descuento_banco: float
    precio_tras_os: int
    precio_final: int
    ahorro_total: int
    descuento_total_pct: float


class CompararRequest(BaseModel):
    producto_nombre: str
    obra_social: str


class MedioPagoOut(BaseModel):
    metodo_pago: str
    descuento_banco: float
    precio_final: int
    ahorro: int
