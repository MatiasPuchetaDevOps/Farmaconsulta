from pydantic import BaseModel


class AlternativaOut(BaseModel):
    producto_nombre: str
    stock_disponible: int


class StockOut(BaseModel):
    producto_nombre: str
    stock_actual: int
    categoria: str
    umbral: int
    alerta: bool
    alternativas: list[AlternativaOut]
