from pydantic import BaseModel


class ProductoOut(BaseModel):
    producto_nombre: str
    categoria: str
    precio_lista: int
    stock_disponible: int
